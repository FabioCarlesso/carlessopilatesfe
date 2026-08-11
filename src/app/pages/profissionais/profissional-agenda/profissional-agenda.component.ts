import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AulaResponseDTO } from '../../../core/models/plano';
import { ProfissionalResponseDTO } from '../../../core/models/profissional';
import { SessaoResponseDTO } from '../../../core/models/sessao';
import { AulaService } from '../../../core/services/aula.service';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { SessaoService } from '../../../core/services/sessao.service';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { extrairMensagemErro } from '../../../shared/utils/api-error';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import {
  CalendarioDia,
  CalendarioEvento,
  CalendarioGrade,
  CalendarioOrigem,
  CalendarioStatus,
  DIAS_SEMANA_ABREVIADO,
  DIAS_SEMANA_EXTENSO,
  hojeIso,
  intervaloDoPeriodo,
  mapearEventosComPaciente,
  montarGrade,
  navegarPeriodo
} from '../../../shared/utils/calendario';

/** Contadores do período, sobre os eventos que o próprio período trouxe. */
export interface ProfissionalAgendaResumo {
  aulasRealizadas: number;
  aulasAgendadas: number;
  sessoesRealizadas: number;
  sessoesAgendadas: number;
}

/** Comissão do período: o mesmo cálculo do relatório de pagamento. */
export interface ProfissionalAgendaComissao {
  total: number;
  aulas: number;
}

/**
 * Agenda semanal de **um profissional** (issue #126). Até aqui só existia a
 * agenda do estúdio (issue #125), que responde o que acontece na semana mas não
 * quanto disso é de cada um: distribuir carga entre profissionais exigia filtrar
 * a agenda inteira, um profissional de cada vez.
 *
 * O recorte por profissional é **do servidor**: `/sessoes` e `/aulas` já aceitam
 * `profissionalId` junto do período, e por isso a tela não precisa dos endpoints
 * `/{recurso}/profissional/{id}` que a issue previa — nem de baixar o estúdio
 * inteiro para descartar quase tudo no cliente.
 *
 * Somente leitura: as ações de realizar e cancelar continuam na agenda do
 * estúdio e nas telas do prontuário, e cada evento aqui é um link para elas.
 */
@Component({
  selector: 'app-profissional-agenda',
  imports: [CurrencyPipe, RouterLink, BreadcrumbComponent],
  templateUrl: './profissional-agenda.component.html',
  styleUrl: './profissional-agenda.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfissionalAgendaComponent implements OnInit {
  profissionalId: number | null = null;
  profissional: ProfissionalResponseDTO | null = null;

  /**
   * Data do relógio, resolvida uma vez na inicialização. Não é lida no template
   * (que a reavaliaria a cada ciclo de detecção de mudanças) nem dentro das
   * funções de grade, que a recebem por parâmetro para o spec poder fixá-la.
   */
  readonly hoje = hojeIso();
  /** Dia âncora da semana exibida; começa em hoje e é o que a navegação move. */
  referencia = this.hoje;

  eventos: CalendarioEvento[] = [];
  grade: CalendarioGrade = montarGrade('semanal', this.referencia, [], this.hoje);
  resumo: ProfissionalAgendaResumo = { aulasRealizadas: 0, aulasAgendadas: 0, sessoesRealizadas: 0, sessoesAgendadas: 0 };

  /**
   * Comissão do período, ou `null` enquanto ela não chegou. A carga é separada
   * da agenda de propósito: o valor é um extra do cabeçalho, e uma falha nele
   * não pode apagar da tela a semana, que continua válida.
   */
  comissao: ProfissionalAgendaComissao | null = null;
  comissaoIndisponivel = false;

  loading = false;
  erro: string | null = null;

  readonly diasSemana = DIAS_SEMANA_ABREVIADO.map((abreviado, indice) => ({
    abreviado,
    extenso: DIAS_SEMANA_EXTENSO[indice]
  }));

  /**
   * A forma do chip diz a origem e a cor diz a situação, como no calendário do
   * paciente e na agenda do estúdio. Ficam em mapas, e não concatenados no
   * template, para que `evento-SESSAO` não vire nome de classe.
   */
  private readonly classeOrigem: Record<CalendarioOrigem, string> = {
    SESSAO: 'evento-sessao',
    AULA: 'evento-aula'
  };

  private readonly classeStatus: Record<CalendarioStatus, string> = {
    AGENDADA: 'evento-agendada',
    REALIZADA: 'evento-realizada',
    CANCELADA: 'evento-cancelada'
  };

  /**
   * As cinco combinações que de fato aparecem: a aula não tem cancelamento na
   * API (só o booleano `realizada`), e anunciar uma "aula cancelada" que nunca
   * chega a existir só confundiria a leitura da grade.
   */
  readonly legenda = [
    { chave: 'sessao-agendada', origem: 'SESSAO' as const, status: 'AGENDADA' as const, rotulo: 'Sessão agendada' },
    { chave: 'sessao-realizada', origem: 'SESSAO' as const, status: 'REALIZADA' as const, rotulo: 'Sessão realizada' },
    { chave: 'sessao-cancelada', origem: 'SESSAO' as const, status: 'CANCELADA' as const, rotulo: 'Sessão cancelada' },
    { chave: 'aula-agendada', origem: 'AULA' as const, status: 'AGENDADA' as const, rotulo: 'Aula agendada' },
    { chave: 'aula-realizada', origem: 'AULA' as const, status: 'REALIZADA' as const, rotulo: 'Aula realizada' }
  ].map(item => ({
    ...item,
    classes: `evento-marca ${this.classeOrigem[item.origem]} ${this.classeStatus[item.status]}`
  }));

  constructor(
    private profissionalService: ProfissionalService,
    private sessaoService: SessaoService,
    private aulaService: AulaService,
    private route: ActivatedRoute,
    private destroyRef: DestroyRef,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.profissionalId = parseRouteNumberParam(this.route.snapshot.paramMap, 'id');
    if (this.profissionalId === null) {
      this.erro = 'Identificador inválido.';
      return;
    }

    this.loading = true;
    this.profissionalService.buscar(this.profissionalId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: profissional => {
          this.profissional = profissional;
          this.carregar();
          this.cdr.markForCheck();
        },
        error: () => {
          this.erro = 'Profissional não encontrado.';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Carga da semana. A coleção é **do período**, como na agenda do estúdio:
   * navegar busca de novo, em vez de recortar no cliente uma coleção que a API
   * limita a 92 dias.
   */
  carregar(): void {
    const profissionalId = this.profissionalId;
    if (profissionalId === null) return;

    const { inicio, fim } = intervaloDoPeriodo('semanal', this.referencia);

    this.loading = true;
    this.erro = null;
    this.carregarComissao(profissionalId, inicio, fim);

    forkJoin({
      sessoes: this.sessaoService.listarPorPeriodo(inicio, fim, profissionalId),
      aulas: this.aulaService.listarPorPeriodo(inicio, fim, profissionalId)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ sessoes, aulas }: { sessoes: SessaoResponseDTO[]; aulas: AulaResponseDTO[] }) => {
          this.eventos = mapearEventosComPaciente(sessoes, aulas);
          this.atualizarGrade();
          this.loading = false;
          this.cdr.markForCheck();
        },
        // O `forkJoin` colapsa as duas falhas num ramo só, então a mensagem não
        // pode culpar nenhuma das duas listagens em particular.
        error: err => {
          this.eventos = [];
          this.atualizarGrade();
          this.erro = extrairMensagemErro(err, 'Não foi possível carregar a agenda do profissional.');
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Comissão pelo `GET /profissionais/{id}/relatorio-pagamento`, e não por uma
   * conta local com `percentualPagamentoAula`: o percentual incide sobre o valor
   * da aula, que sai do pagamento (`valor / quantidade de aulas`) e não vem no
   * DTO da aula. Reaproveitar o relatório mantém uma única fonte para o dinheiro
   * — duas telas do sistema não podem dizer valores diferentes sobre a mesma
   * semana. Só entram aulas **realizadas** de pacientes ativos, que é o que o
   * estúdio de fato paga.
   */
  private carregarComissao(profissionalId: number, inicio: string, fim: string): void {
    this.comissao = null;
    this.comissaoIndisponivel = false;

    this.profissionalService.relatorioPagamento(profissionalId, inicio, fim)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: relatorio => {
          this.comissao = {
            total: relatorio.resumo.totalProfissional,
            aulas: relatorio.resumo.totalAulas
          };
          this.cdr.markForCheck();
        },
        // Sem faixa de erro: a agenda continua legível sem o valor, e o card
        // mostra "—" em vez de um número que não foi apurado.
        error: () => {
          this.comissao = null;
          this.comissaoIndisponivel = true;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Único ponto que remonta a grade e recalcula os contadores: navegação e carga
   * passam as duas por aqui, então não há como o cabeçalho anunciar um período e
   * as células ou os contadores mostrarem outro. Com `OnPush` o `markForCheck` é
   * obrigatório — os cliques já marcam a view suja, mas a remontagem disparada
   * pela carga não marcaria.
   */
  private atualizarGrade(): void {
    this.grade = montarGrade('semanal', this.referencia, this.eventos, this.hoje);
    this.resumo = {
      aulasRealizadas: this.contar('AULA', 'REALIZADA'),
      aulasAgendadas: this.contar('AULA', 'AGENDADA'),
      sessoesRealizadas: this.contar('SESSAO', 'REALIZADA'),
      sessoesAgendadas: this.contar('SESSAO', 'AGENDADA')
    };
    this.cdr.markForCheck();
  }

  private contar(origem: CalendarioOrigem, status: CalendarioStatus): number {
    return this.eventos.filter(evento => evento.origem === origem && evento.status === status).length;
  }

  navegar(direcao: -1 | 1): void {
    this.referencia = navegarPeriodo('semanal', this.referencia, direcao);
    this.carregar();
  }

  irParaHoje(): void {
    if (this.noPeriodoAtual) return;
    this.referencia = this.hoje;
    this.carregar();
  }

  get noPeriodoAtual(): boolean {
    return this.grade.dias.some(dia => dia.hoje && dia.doPeriodo);
  }

  /**
   * Dias do período que têm evento. É a leitura do mobile, onde a grade de 7
   * colunas não cabe. Sai da mesma `grade.dias` da grade, então as duas leituras
   * não podem divergir.
   */
  get diasComEventos(): CalendarioDia[] {
    return this.grade.dias.filter(dia => dia.doPeriodo && dia.eventos.length > 0);
  }

  /**
   * Texto da região viva que anuncia o período. Sem ele a navegação é silenciosa
   * para o leitor de tela: a grade inteira troca de conteúdo sem nenhum retorno.
   */
  get resumoPeriodo(): string {
    if (this.loading || this.erro) return '';
    const total = this.grade.totalEventos;
    if (total === 0) return `${this.grade.titulo}: nenhuma sessão ou aula no período.`;
    return `${this.grade.titulo}: ${total} ${total === 1 ? 'evento' : 'eventos'} no período.`;
  }

  /**
   * Os dois mapas são totais sobre as uniões declaradas, mas o tipo não vale
   * como garantia do que chega no JSON: o mapeamento já trata uma situação fora
   * da união e cairia aqui como `undefined`, virando a classe literal
   * `"undefined"` no DOM. A classe ausente é omitida — sem os tokens de situação
   * o chip degrada para um contorno neutro em `currentColor`, e a situação real
   * continua escrita no `aria-label` e na linha da agenda.
   */
  classesDoEvento(evento: CalendarioEvento, base: string): string {
    return [base, this.classeOrigem[evento.origem], this.classeStatus[evento.status]]
      .filter(Boolean)
      .join(' ');
  }

  trackByDia(_indice: number, dia: CalendarioDia): string {
    return dia.dia;
  }

  trackByEvento(_indice: number, evento: CalendarioEvento): string {
    return evento.chave;
  }
}
