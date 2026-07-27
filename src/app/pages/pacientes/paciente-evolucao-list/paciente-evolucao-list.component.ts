import { DatePipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { EvolucaoSessaoResponseDTO } from '../../../core/models/evolucao-sessao';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { SessaoResponseDTO, SESSAO_TIPO_LABEL } from '../../../core/models/sessao';
import { EvolucaoSessaoService } from '../../../core/services/evolucao-sessao.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { SessaoService } from '../../../core/services/sessao.service';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';

/** Tendência da dor entre o início e o fim da sessão. */
export type TendenciaDor = 'melhora' | 'piora' | 'estavel';

/**
 * Uma entrada da linha do tempo: a sessão já cruzada com a evolução registrada
 * nela. Os dados da sessão são achatados aqui porque uma evolução pode existir
 * sem a sessão correspondente na listagem (sessão excluída), e o template não
 * precisa saber disso.
 */
export interface EvolucaoTimelineItem {
  chave: string;
  sessaoId: number;
  dataHora: string;
  tipo: string | null;
  nomeProfissional: string | null;
  evolucao: EvolucaoSessaoResponseDTO | null;
  tendenciaDor: TendenciaDor | null;
  /** Há observações do fisioterapeuta ou campos atrás do expandir/recolher. */
  temCorpo: boolean;
  /** Há campos atrás do expandir/recolher. */
  temDetalhes: boolean;
  expandido: boolean;
}

@Component({
  selector: 'app-paciente-evolucao-list',
  imports: [NgIf, NgFor, DatePipe, RouterLink, BreadcrumbComponent],
  templateUrl: './paciente-evolucao-list.component.html',
  styleUrl: './paciente-evolucao-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PacienteEvolucaoListComponent implements OnInit {
  pacienteId: number | null = null;
  paciente: PacienteResponseDTO | null = null;
  /**
   * Coleção única já ordenada e derivada, ponto de consumo previsto para o
   * gráfico de dor (#206) e para os filtros de período/tipo (#207).
   */
  itens: EvolucaoTimelineItem[] = [];
  loading = false;
  erro: string | null = null;

  readonly tipoLabel = SESSAO_TIPO_LABEL;

  constructor(
    private evolucaoSessaoService: EvolucaoSessaoService,
    private sessaoService: SessaoService,
    private pacienteService: PacienteService,
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
          this.carregarEvolucoes();
          this.cdr.markForCheck();
        },
        error: () => {
          this.erro = 'Erro ao carregar dados do paciente.';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private carregarEvolucoes(): void {
    if (this.pacienteId === null) return;

    forkJoin({
      sessoes: this.sessaoService.listarPorPaciente(this.pacienteId),
      evolucoes: this.evolucaoSessaoService.listarPorPaciente(this.pacienteId)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ sessoes, evolucoes }) => {
          this.itens = this.montarTimeline(sessoes, evolucoes);
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.erro = 'Erro ao carregar evoluções.';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Cruza sessões e evoluções por `sessaoId` e ordena da mais recente para a
   * mais antiga. Entram na linha do tempo as sessões com evolução, as sessões
   * `REALIZADA` ainda sem evolução (para a fisioterapeuta ver o que falta
   * registrar) e — defensivamente — evoluções cuja sessão não veio na listagem,
   * que de outra forma sumiriam do prontuário.
   */
  private montarTimeline(
    sessoes: SessaoResponseDTO[],
    evolucoes: EvolucaoSessaoResponseDTO[]
  ): EvolucaoTimelineItem[] {
    const evolucaoPorSessao = new Map<number, EvolucaoSessaoResponseDTO>();
    evolucoes.forEach(evolucao => evolucaoPorSessao.set(evolucao.sessaoId, evolucao));

    const itens: EvolucaoTimelineItem[] = [];

    sessoes.forEach(sessao => {
      const evolucao = evolucaoPorSessao.get(sessao.id) ?? null;
      if (evolucao === null && sessao.status !== 'REALIZADA') return;

      evolucaoPorSessao.delete(sessao.id);
      itens.push(this.montarItem({
        sessaoId: sessao.id,
        dataHora: sessao.dataHora,
        tipo: this.tipoLabel[sessao.tipo] ?? sessao.tipo,
        nomeProfissional: sessao.nomeProfissional,
        evolucao
      }));
    });

    evolucaoPorSessao.forEach(evolucao => {
      itens.push(this.montarItem({
        sessaoId: evolucao.sessaoId,
        dataHora: evolucao.dataHoraRegistro,
        tipo: null,
        nomeProfissional: null,
        evolucao
      }));
    });

    return itens.sort((a, b) => {
      const comparacao = b.dataHora.localeCompare(a.dataHora);
      return comparacao !== 0 ? comparacao : b.sessaoId - a.sessaoId;
    });
  }

  private montarItem(dados: {
    sessaoId: number;
    dataHora: string;
    tipo: string | null;
    nomeProfissional: string | null;
    evolucao: EvolucaoSessaoResponseDTO | null;
  }): EvolucaoTimelineItem {
    const evolucao = dados.evolucao;
    const temDetalhes = evolucao !== null && [
      evolucao.exerciciosRealizados,
      evolucao.equipamentosUtilizados,
      evolucao.cargasMolas,
      evolucao.respostaPaciente,
      evolucao.intercorrencias,
      evolucao.orientacoes
    ].some(campo => !!campo);

    return {
      chave: `${dados.sessaoId}`,
      sessaoId: dados.sessaoId,
      dataHora: dados.dataHora,
      tipo: dados.tipo,
      nomeProfissional: dados.nomeProfissional,
      evolucao,
      tendenciaDor: this.calcularTendenciaDor(evolucao),
      temCorpo: temDetalhes || !!evolucao?.observacoesFisioterapeuta,
      temDetalhes,
      expandido: false
    };
  }

  private calcularTendenciaDor(evolucao: EvolucaoSessaoResponseDTO | null): TendenciaDor | null {
    if (evolucao === null || evolucao.dorAntes === null || evolucao.dorDepois === null) return null;
    if (evolucao.dorDepois < evolucao.dorAntes) return 'melhora';
    if (evolucao.dorDepois > evolucao.dorAntes) return 'piora';
    return 'estavel';
  }

  alternar(item: EvolucaoTimelineItem): void {
    item.expandido = !item.expandido;
    this.cdr.markForCheck();
  }

  expandirTudo(): void {
    this.itens.forEach(item => { item.expandido = item.temDetalhes; });
    this.cdr.markForCheck();
  }

  recolherTudo(): void {
    this.itens.forEach(item => { item.expandido = false; });
    this.cdr.markForCheck();
  }

  get temItensExpansiveis(): boolean {
    return this.itens.some(item => item.temDetalhes);
  }

  trackByItem(_indice: number, item: EvolucaoTimelineItem): string {
    return item.chave;
  }
}
