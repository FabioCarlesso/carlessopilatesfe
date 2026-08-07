import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of, throwError } from 'rxjs';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { AulaResponseDTO } from '../../../core/models/plano';
import { SessaoResponseDTO } from '../../../core/models/sessao';
import { AulaService } from '../../../core/services/aula.service';
import { PacienteService } from '../../../core/services/paciente.service';
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
  CalendarioVisao,
  DIAS_SEMANA_ABREVIADO,
  DIAS_SEMANA_EXTENSO,
  hojeIso,
  mapearEventos,
  montarGrade,
  navegarPeriodo
} from '../../../shared/utils/calendario';

/**
 * Calendário mensal/semanal das sessões e aulas do paciente (issue #119). É a
 * terceira leitura do mesmo prontuário — depois da listagem de sessões e da
 * linha do tempo de evoluções — e a única que mostra a **distribuição** no
 * período: buracos, dias sobrecarregados e a frequência efetiva contra a
 * contratada no plano.
 *
 * Somente leitura: nenhum `POST`/`PUT`/`PATCH` sai daqui. Cada evento é um link
 * para a tela que já sabe editá-lo.
 */
@Component({
  selector: 'app-paciente-calendario',
  imports: [RouterLink, BreadcrumbComponent],
  templateUrl: './paciente-calendario.component.html',
  styleUrl: './paciente-calendario.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PacienteCalendarioComponent implements OnInit {
  pacienteId: number | null = null;
  paciente: PacienteResponseDTO | null = null;
  visao: CalendarioVisao = 'mensal';
  /**
   * Data do relógio, resolvida uma vez na inicialização. Não é lida no template
   * (que reavaliaria a cada ciclo de detecção de mudanças) nem dentro das
   * funções de grade, que a recebem por parâmetro para o spec poder fixá-la.
   */
  readonly hoje = hojeIso();
  /** Dia âncora do período exibido; começa em hoje e é o que a navegação move. */
  referencia = this.hoje;
  /** Fonte carregada uma única vez: trocar de período ou de visão não pede requisição. */
  eventos: CalendarioEvento[] = [];
  grade: CalendarioGrade = montarGrade('mensal', this.referencia, [], this.hoje);
  loading = false;
  erro: string | null = null;

  readonly diasSemana = DIAS_SEMANA_ABREVIADO.map((abreviado, indice) => ({
    abreviado,
    extenso: DIAS_SEMANA_EXTENSO[indice]
  }));

  /**
   * A forma do chip diz a origem e a cor diz a situação — os dois eixos que a
   * issue pede distinguir. Ficam em mapas, e não concatenados no template, para
   * que `evento-SESSAO` não vire nome de classe.
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
    private pacienteService: PacienteService,
    private sessaoService: SessaoService,
    private aulaService: AulaService,
    private route: ActivatedRoute,
    private destroyRef: DestroyRef,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    if (this.pacienteId === null) {
      this.erro = 'Identificador inválido.';
      return;
    }
    this.carregar();
  }

  carregar(): void {
    if (this.pacienteId === null) return;

    this.loading = true;
    this.erro = null;

    this.pacienteService.buscar(this.pacienteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: paciente => {
          this.paciente = paciente;
          this.carregarEventos();
          this.cdr.markForCheck();
        },
        error: err => {
          this.erro = extrairMensagemErro(err, 'Erro ao carregar dados do paciente.');
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private carregarEventos(): void {
    const pacienteId = this.pacienteId;
    if (pacienteId === null) return;

    forkJoin({
      // `GET /sessoes/paciente/{id}` responde 404 para paciente inativo (issue #203),
      // e `GET /aulas/paciente/{id}` responde o mesmo para paciente sem plano gerado.
      // O paciente já foi carregado antes deste `forkJoin`, então 404 aqui só pode
      // significar "sem registros"; paciente inexistente falha antes, com "Erro ao
      // carregar dados do paciente.". Sem esses `catchError` o `forkJoin` colapsaria
      // o 404 na faixa de erro e o calendário contradiria a listagem de sessões
      // diante da mesma resposta da API.
      sessoes: this.sessaoService.listarPorPaciente(pacienteId).pipe(
        catchError((error: HttpErrorResponse) =>
          error.status === 404 ? of<SessaoResponseDTO[]>([]) : throwError(() => error))
      ),
      aulas: this.aulaService.listarPorPaciente(pacienteId).pipe(
        catchError((error: HttpErrorResponse) =>
          error.status === 404 ? of<AulaResponseDTO[]>([]) : throwError(() => error))
      )
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ sessoes, aulas }) => {
          this.eventos = mapearEventos(sessoes, aulas, pacienteId);
          this.atualizarGrade();
          this.loading = false;
          this.cdr.markForCheck();
        },
        // O `forkJoin` colapsa as duas falhas num ramo só, então a mensagem não
        // pode culpar nenhuma das duas listagens em particular.
        error: err => {
          this.erro = extrairMensagemErro(err, 'Não foi possível carregar o calendário.');
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Único ponto que remonta a grade: visão, navegação e carga passam todas por
   * aqui, então não há como o cabeçalho anunciar um período e as células
   * mostrarem outro. Com `OnPush` o `markForCheck` é obrigatório — os cliques
   * já marcam a view suja, mas a remontagem disparada pela carga não marcaria.
   */
  private atualizarGrade(): void {
    this.grade = montarGrade(this.visao, this.referencia, this.eventos, this.hoje);
    this.cdr.markForCheck();
  }

  /**
   * Troca a visão preservando o dia âncora: sair do mês de maio na semana do
   * dia 20 abre exatamente a semana do dia 20, e não a primeira do mês.
   */
  alterarVisao(visao: CalendarioVisao): void {
    if (this.visao === visao) return;
    this.visao = visao;
    this.atualizarGrade();
  }

  navegar(direcao: -1 | 1): void {
    this.referencia = navegarPeriodo(this.visao, this.referencia, direcao);
    this.atualizarGrade();
  }

  irParaHoje(): void {
    this.referencia = this.hoje;
    this.atualizarGrade();
  }

  /**
   * Recorte da agenda do mobile: só os dias do período que têm evento. Sai da
   * mesma `grade.dias` da grade de 7 colunas, então as duas leituras não podem
   * divergir.
   */
  get diasComEventos(): CalendarioDia[] {
    return this.grade.dias.filter(dia => dia.doPeriodo && dia.eventos.length > 0);
  }

  /**
   * Os dois mapas são totais sobre as uniões declaradas, mas o tipo não vale
   * como garantia do que chega no JSON: o `mapearEventos` já trata uma situação
   * fora da união (`?? sessao.status`) e cairia aqui como `undefined`, virando a
   * classe literal `"undefined"` no DOM. A classe ausente é omitida — sem os
   * tokens de situação o chip degrada para um contorno neutro em `currentColor`,
   * e a situação real continua escrita no `aria-label` e na linha da agenda.
   */
  classesDoEvento(evento: CalendarioEvento, base: string): string {
    return [base, this.classeOrigem[evento.origem], this.classeStatus[evento.status]]
      .filter(Boolean)
      .join(' ');
  }

  get noPeriodoAtual(): boolean {
    return this.grade.dias.some(dia => dia.hoje && dia.doPeriodo);
  }

  get rotuloAnterior(): string {
    return this.visao === 'mensal' ? 'Mês anterior' : 'Semana anterior';
  }

  get rotuloProximo(): string {
    return this.visao === 'mensal' ? 'Próximo mês' : 'Próxima semana';
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

  trackByDia(_indice: number, dia: CalendarioDia): string {
    return dia.dia;
  }

  trackByEvento(_indice: number, evento: CalendarioEvento): string {
    return evento.chave;
  }
}
