import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of, throwError } from 'rxjs';
import { AnamneseResponseDTO } from '../../../core/models/anamnese';
import { AvaliacaoFisioterapeuticaResponseDTO } from '../../../core/models/avaliacao-fisioterapeutica';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { PlanoTratamentoResponseDTO } from '../../../core/models/plano-tratamento';
import { ReavaliacaoResponseDTO } from '../../../core/models/reavaliacao';
import { AnamneseService } from '../../../core/services/anamnese.service';
import { AvaliacaoFisioterapeuticaService } from '../../../core/services/avaliacao-fisioterapeutica.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { PlanoTratamentoService } from '../../../core/services/plano-tratamento.service';
import { ReavaliacaoService } from '../../../core/services/reavaliacao.service';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';
import { ComparativoMapaDorComponent } from '../../../shared/components/comparativo-mapa-dor/comparativo-mapa-dor.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';
import { OpcoesAvaliacaoResumoComponent } from '../../../shared/components/opcoes-avaliacao-resumo/opcoes-avaliacao-resumo.component';
import {
  DefinicaoEtapa,
  ETAPAS_FLUXO,
  EtapaAvaliacao,
  FluxoAvaliacao,
  ItemLinhaDoTempo,
  RegistrosAvaliacao,
  SITUACAO_ETAPA_CLASSE,
  SITUACAO_ETAPA_LABEL,
  SituacaoEtapa,
  avaliacaoDeReferencia,
  etapaAnterior,
  etapaPendente,
  lerEtapa,
  lerFluxo,
  montarLinhaDoTempo,
  planoMaisRecente,
  proximaEtapa,
  situacaoEtapa
} from '../../../shared/utils/fluxo-avaliacao';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { PacienteAnamneseComponent } from '../paciente-anamnese/paciente-anamnese.component';
import {
  PacienteAvaliacaoFisioterapeuticaComponent
} from '../paciente-avaliacao-fisioterapeutica/paciente-avaliacao-fisioterapeutica.component';
import {
  PacientePlanoTratamentoFormComponent
} from '../paciente-plano-tratamento-form/paciente-plano-tratamento-form.component';
import { PacienteReavaliacaoFormComponent } from '../paciente-reavaliacao-form/paciente-reavaliacao-form.component';

/**
 * Fluxo único de avaliação do paciente (issue #305). As etapas são os formulários
 * avulsos em modo embutido — nenhum campo é repetido aqui —, e a etapa aberta,
 * o fluxo e a reavaliação em andamento ficam na URL, para o voltar do navegador
 * e a retomada funcionarem.
 */
@Component({
  selector: 'app-paciente-avaliacao',
  imports: [
    RouterLink,
    LocalDatePipe,
    BreadcrumbComponent,
    CarregandoComponent,
    ComparativoMapaDorComponent,
    EmptyStateComponent,
    PacienteAnamneseComponent,
    PacienteAvaliacaoFisioterapeuticaComponent,
    PacientePlanoTratamentoFormComponent,
    PacienteReavaliacaoFormComponent,
    OpcoesAvaliacaoResumoComponent
  ],
  templateUrl: './paciente-avaliacao.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './paciente-avaliacao.component.scss'
})
export class PacienteAvaliacaoComponent implements OnInit, OnDestroy {
  pacienteId: number | null = null;
  paciente: PacienteResponseDTO | null = null;
  anamnese: AnamneseResponseDTO | null = null;
  avaliacoes: AvaliacaoFisioterapeuticaResponseDTO[] = [];
  planos: PlanoTratamentoResponseDTO[] = [];
  reavaliacoes: ReavaliacaoResponseDTO[] = [];
  linhaDoTempo: ItemLinhaDoTempo[] = [];
  loading = false;
  carregado = false;
  erro: string | null = null;
  sucesso: string | null = null;

  fluxo: FluxoAvaliacao = 'inicial';
  /** Etapa do `?etapa=`; `null` abre a pendente. */
  etapaUrl: EtapaAvaliacao | null = null;
  /** Reavaliação em andamento no fluxo de reavaliação (`?reavaliacao=`); `null` é uma nova. */
  reavaliacaoId: number | null = null;

  /**
   * Vínculo com que a etapa postural abre a nova análise (`?avaliacaoFisioterapeuticaId=`/`?reavaliacaoId=`, issue
   * #304): a reavaliação aberta no fluxo de reavaliação, senão a avaliação mais recente. `null` = análise solta.
   */
  get vinculoPostural(): { avaliacaoFisioterapeuticaId: number } | { reavaliacaoId: number } | null {
    if (this.fluxo === 'reavaliacao') {
      return this.reavaliacaoId !== null ? { reavaliacaoId: this.reavaliacaoId } : null;
    }
    // A mesma que o formulário de avaliação edita: a de data mais recente (desempate pelo id).
    const avaliacao = [...this.avaliacoes].sort(
      (a, b) => b.dataAvaliacao.localeCompare(a.dataAvaliacao) || b.id - a.id
    )[0];
    return avaliacao ? { avaliacaoFisioterapeuticaId: avaliacao.id } : null;
  }

  readonly situacaoLabel = SITUACAO_ETAPA_LABEL;
  readonly situacaoClasse = SITUACAO_ETAPA_CLASSE;

  private primeiraLeitura = true;
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private pacienteService: PacienteService,
    private anamneseService: AnamneseService,
    private avaliacaoService: AvaliacaoFisioterapeuticaService,
    private planoTratamentoService: PlanoTratamentoService,
    private reavaliacaoService: ReavaliacaoService,
    private route: ActivatedRoute,
    private router: Router,
    private destroyRef: DestroyRef,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    if (this.pacienteId === null) {
      this.erro = 'Identificador inválido.';
      return;
    }

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.fluxo = lerFluxo(params.get('fluxo'));
      this.etapaUrl = lerEtapa(params.get('etapa'), this.fluxo);
      this.reavaliacaoId = this.fluxo === 'reavaliacao' ? parseRouteNumberParam(params, 'reavaliacao') : null;
      // Na primeira leitura o foco fica com a página (ou com o formulário que se
      // foca sozinho); nas trocas de etapa ele vai para o título da etapa nova.
      if (!this.primeiraLeitura) this.focarEtapa();
      this.primeiraLeitura = false;
    });

    this.carregar();
  }

  ngOnDestroy(): void {
    if (this.successTimer !== null) clearTimeout(this.successTimer);
  }

  carregar(): void {
    const id = this.pacienteId;
    if (id === null) return;

    this.loading = true;
    this.erro = null;

    forkJoin({
      paciente: this.pacienteService.buscar(id),
      anamnese: this.anamneseService.buscarPorPaciente(id).pipe(
        catchError((error: HttpErrorResponse) => (error.status === 404 ? of(null) : throwError(() => error)))
      ),
      avaliacoes: this.avaliacaoService.listarPorPaciente(id),
      planos: this.planoTratamentoService.listarPorPaciente(id),
      reavaliacoes: this.reavaliacaoService.listarPorPaciente(id)
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ paciente, anamnese, avaliacoes, planos, reavaliacoes }) => {
        this.paciente = paciente;
        this.anamnese = anamnese;
        this.avaliacoes = avaliacoes;
        this.planos = planos;
        this.reavaliacoes = reavaliacoes;
        this.atualizarLinhaDoTempo();
        this.carregado = true;
        this.loading = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar a avaliação do paciente.';
        this.loading = false;
      }
    });
  }

  get etapas(): readonly DefinicaoEtapa[] {
    return ETAPAS_FLUXO[this.fluxo];
  }

  get registros(): RegistrosAvaliacao {
    return {
      anamnese: this.anamnese !== null,
      avaliacao: this.avaliacoes.length > 0,
      plano: this.planos.length > 0,
      reavaliacao: this.reavaliacaoId !== null
    };
  }

  /** Etapa obrigatória mais adiantada que ainda não tem registro. */
  get pendente(): EtapaAvaliacao | null {
    return etapaPendente(this.fluxo, this.registros);
  }

  /** Etapa exibida: a da URL ou, sem ela, a pendente; `null` com tudo registrado. */
  get etapaAtual(): EtapaAvaliacao | null {
    return this.etapaUrl ?? this.pendente;
  }

  get definicaoAtual(): DefinicaoEtapa | null {
    return this.etapas.find(def => def.chave === this.etapaAtual) ?? null;
  }

  get numeroEtapaAtual(): number {
    return this.etapas.findIndex(def => def.chave === this.etapaAtual) + 1;
  }

  get anterior(): EtapaAvaliacao | null {
    const atual = this.etapaAtual;
    return atual ? etapaAnterior(this.fluxo, atual) : null;
  }

  get planoAtual(): PlanoTratamentoResponseDTO | null {
    return planoMaisRecente(this.planos);
  }

  /** Só a avaliação mais recente é editável: é ela que a etapa 2 e a tela avulsa abrem. */
  get avaliacaoEditavelId(): number | null {
    return this.avaliacoes.reduce<AvaliacaoFisioterapeuticaResponseDTO | null>((maior, a) =>
      !maior || a.dataAvaliacao > maior.dataAvaliacao || (a.dataAvaliacao === maior.dataAvaliacao && a.id > maior.id)
        ? a
        : maior, null)?.id ?? null;
  }

  get referencia(): ItemLinhaDoTempo | null {
    return avaliacaoDeReferencia(this.linhaDoTempo, this.reavaliacaoId);
  }

  rotulo(etapa: EtapaAvaliacao): string {
    return this.etapas.find(def => def.chave === etapa)?.rotulo ?? '';
  }

  situacao(etapa: EtapaAvaliacao): SituacaoEtapa {
    return situacaoEtapa(this.fluxo, etapa, this.registros);
  }

  irPara(etapa: EtapaAvaliacao | null, extras: Params = {}): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { etapa, ...extras },
      queryParamsHandling: 'merge'
    });
  }

  voltarEtapa(): void {
    if (this.anterior) this.irPara(this.anterior);
  }

  /** Pula a etapa opcional atual; a última delas encerra o fluxo. */
  pular(): void {
    const atual = this.etapaAtual;
    if (!atual) return;
    const proxima = proximaEtapa(this.fluxo, atual);
    if (proxima) {
      this.irPara(proxima);
    } else {
      this.concluir();
    }
  }

  iniciarReavaliacao(): void {
    this.sucesso = null;
    this.irPara('reavaliacao', { fluxo: 'reavaliacao', reavaliacao: null });
  }

  sairDaReavaliacao(): void {
    this.irPara(null, { fluxo: null, reavaliacao: null });
  }

  aoSalvarAnamnese(anamnese: AnamneseResponseDTO): void {
    this.anamnese = anamnese;
    this.atualizarLinhaDoTempo();
    this.avancar('anamnese', 'Anamnese salva.');
  }

  aoSalvarAvaliacao(avaliacao: AvaliacaoFisioterapeuticaResponseDTO): void {
    this.avaliacoes = this.substituir(this.avaliacoes, avaliacao);
    this.atualizarLinhaDoTempo();
    this.avancar('avaliacao', 'Avaliação fisioterapêutica salva.');
  }

  aoSalvarPlano(plano: PlanoTratamentoResponseDTO): void {
    this.planos = this.substituir(this.planos, plano);
    this.avancar('plano', 'Plano de tratamento salvo.');
  }

  aoSalvarReavaliacao(reavaliacao: ReavaliacaoResponseDTO): void {
    this.reavaliacoes = this.substituir(this.reavaliacoes, reavaliacao);
    this.atualizarLinhaDoTempo();
    this.mostrarSucesso('Reavaliação salva.');
    // A reavaliação gravada entra na URL: voltar a esta etapa a edita, em vez de criar outra.
    this.irPara('postural', { reavaliacao: reavaliacao.id });
  }

  /** Link de cada registro da linha do tempo para a etapa que o edita, ou `null` (avaliação antiga). */
  linkDoItem(item: ItemLinhaDoTempo): Params | null {
    if (item.tipo === 'reavaliacao') {
      return { fluxo: 'reavaliacao', etapa: 'reavaliacao', reavaliacao: item.id };
    }
    return item.id === this.avaliacaoEditavelId ? { etapa: 'avaliacao' } : null;
  }

  private avancar(etapa: EtapaAvaliacao, mensagem: string): void {
    this.mostrarSucesso(mensagem);
    const proxima = proximaEtapa(this.fluxo, etapa);
    if (proxima) {
      this.irPara(proxima);
    } else {
      this.concluir();
    }
  }

  /** Fim do fluxo: a reavaliação volta à visão geral; a avaliação inicial mostra a pendente, se houver. */
  private concluir(): void {
    if (this.fluxo === 'reavaliacao') {
      this.mostrarSucesso('Reavaliação concluída.');
      this.sairDaReavaliacao();
    } else {
      this.irPara(null);
    }
  }

  private substituir<T extends { id: number }>(lista: readonly T[], registro: T): T[] {
    return [registro, ...lista.filter(item => item.id !== registro.id)];
  }

  private atualizarLinhaDoTempo(): void {
    this.linhaDoTempo = montarLinhaDoTempo(this.avaliacoes, this.reavaliacoes, this.anamnese);
  }

  private mostrarSucesso(mensagem: string): void {
    if (this.successTimer !== null) clearTimeout(this.successTimer);
    this.sucesso = mensagem;
    this.successTimer = setTimeout(() => { this.sucesso = null; }, 4000);
  }

  /** Adiado: o título da etapa nova só existe depois da próxima detecção de mudanças. */
  private focarEtapa(): void {
    setTimeout(() => {
      this.host.nativeElement.querySelector<HTMLElement>('#etapa-titulo')?.focus();
    });
  }
}
