import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { ReavaliacaoResponseDTO } from '../../../core/models/reavaliacao';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { ReavaliacaoService } from '../../../core/services/reavaliacao.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { LocalDatePipe } from '../../../shared/pipes/local-date.pipe';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { OpcoesAvaliacaoResumoComponent } from '../../../shared/components/opcoes-avaliacao-resumo/opcoes-avaliacao-resumo.component';
import { AnamneseService } from '../../../core/services/anamnese.service';
import { AvaliacaoFisioterapeuticaService } from '../../../core/services/avaliacao-fisioterapeutica.service';
import { CAMPOS_OPCOES_REAVALIACAO } from '../../../core/models/opcoes-avaliacao';
import { ComparacaoAnterior, montarLinhaDoTempo } from '../../../shared/utils/fluxo-avaliacao';
import { catchError, forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-paciente-reavaliacao-list',
  imports: [LocalDatePipe, RouterLink, BreadcrumbComponent, CarregandoComponent, EmptyStateComponent, OpcoesAvaliacaoResumoComponent],
  templateUrl: './paciente-reavaliacao-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './paciente-reavaliacao-list.component.scss'
})
export class PacienteReavaliacaoListComponent implements OnInit, OnDestroy {
  pacienteId: number | null = null;
  paciente: PacienteResponseDTO | null = null;
  reavaliacoes: ReavaliacaoResponseDTO[] = [];
  readonly camposOpcoes = CAMPOS_OPCOES_REAVALIACAO;
  /** Registro anterior de cada reavaliação (por `id`), para o comparativo das opções (issue #306). */
  anteriores = new Map<number, ComparacaoAnterior>();
  loading = false;
  erro: string | null = null;
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private reavaliacaoService: ReavaliacaoService,
    private pacienteService: PacienteService,
    private avaliacaoService: AvaliacaoFisioterapeuticaService,
    private anamneseService: AnamneseService,
    private route: ActivatedRoute,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    if (this.pacienteId === null) {
      this.erro = 'Identificador inválido.';
      return;
    }
    this.carregar();
  }

  ngOnDestroy(): void {
    if (this.successTimer !== null) {
      clearTimeout(this.successTimer);
    }
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
          this.carregarReavaliacoes();
        },
        error: () => {
          this.erro = 'Erro ao carregar dados do paciente.';
          this.loading = false;
        }
      });
  }

  private carregarReavaliacoes(): void {
    const id = this.pacienteId;
    if (id === null) return;

    // Avaliações e anamnese só alimentam o comparativo: sem elas a lista sai igual, sem ele.
    forkJoin({
      reavaliacoes: this.reavaliacaoService.listarPorPaciente(id),
      avaliacoes: this.avaliacaoService.listarPorPaciente(id).pipe(catchError(() => of([]))),
      anamnese: this.anamneseService.buscarPorPaciente(id).pipe(
        catchError((_erro: HttpErrorResponse) => of(null))
      )
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ reavaliacoes, avaliacoes, anamnese }) => {
          this.reavaliacoes = reavaliacoes;
          this.anteriores = new Map(
            montarLinhaDoTempo(avaliacoes, reavaliacoes, anamnese)
              .filter(item => item.tipo === 'reavaliacao' && item.anterior !== null)
              .map(item => [item.id, item.anterior as ComparacaoAnterior])
          );
          this.loading = false;
        },
        error: () => {
          this.erro = 'Erro ao carregar reavaliações.';
          this.loading = false;
        }
      });
  }
}
