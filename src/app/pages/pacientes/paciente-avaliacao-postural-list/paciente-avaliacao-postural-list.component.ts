import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { forkJoin } from 'rxjs';
import {
  AvaliacaoPosturalResponseDTO,
  STATUS_AVALIACAO_POSTURAL_LABEL,
  VISTA_POSTURAL_LABEL
} from '../../../core/models/avaliacao-postural';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { AvaliacaoFisioterapeuticaService } from '../../../core/services/avaliacao-fisioterapeutica.service';
import { AvaliacaoPosturalService } from '../../../core/services/avaliacao-postural.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { extrairMensagemErro } from '../../../shared/utils/api-error';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { ConfirmarDialogComponent } from '../../../shared/components/confirmar-dialog/confirmar-dialog.component';

@Component({
  selector: 'app-paciente-avaliacao-postural-list',
  imports: [RouterLink, DatePipe, ConfirmarDialogComponent, BreadcrumbComponent],
  templateUrl: './paciente-avaliacao-postural-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './paciente-avaliacao-postural-list.component.scss'
})
export class PacienteAvaliacaoPosturalListComponent implements OnInit, OnDestroy {
  pacienteId: number | null = null;
  paciente: PacienteResponseDTO | null = null;
  avaliacaoFisioterapeuticaId: number | null = null;
  analises: AvaliacaoPosturalResponseDTO[] = [];
  loading = false;
  erro: string | null = null;
  sucesso: string | null = null;
  parametroInvalido = false;
  fotoAbertaId: number | null = null;
  carregandoFotoId: number | null = null;
  confirmarCancelarId: number | null = null;
  acaoEmAndamentoId: number | null = null;
  private readonly fotoUrls = new Map<number, string>();
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  readonly vistaLabel = VISTA_POSTURAL_LABEL;
  readonly statusLabel = STATUS_AVALIACAO_POSTURAL_LABEL;

  constructor(
    private pacienteService: PacienteService,
    private avaliacaoFisioterapeuticaService: AvaliacaoFisioterapeuticaService,
    private posturalService: AvaliacaoPosturalService,
    private route: ActivatedRoute,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    if (this.pacienteId === null) {
      this.parametroInvalido = true;
      this.erro = 'Identificador inválido.';
      return;
    }
    this.carregar();
  }

  ngOnDestroy(): void {
    this.fotoUrls.forEach(url => URL.revokeObjectURL(url));
    if (this.successTimer !== null) {
      clearTimeout(this.successTimer);
    }
  }

  carregar(): void {
    if (this.pacienteId === null) return;

    this.loading = true;
    this.erro = null;

    forkJoin({
      paciente: this.pacienteService.buscar(this.pacienteId),
      avaliacoes: this.avaliacaoFisioterapeuticaService.listarPorPaciente(this.pacienteId)
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ paciente, avaliacoes }) => {
        this.paciente = paciente;
        this.avaliacaoFisioterapeuticaId = avaliacoes[0]?.id ?? null;
        if (this.avaliacaoFisioterapeuticaId === null) {
          this.loading = false;
          return;
        }
        this.carregarAnalises(this.avaliacaoFisioterapeuticaId);
      },
      error: () => {
        this.erro = 'Erro ao carregar dados do paciente.';
        this.loading = false;
      }
    });
  }

  private carregarAnalises(avaliacaoFisioterapeuticaId: number): void {
    this.posturalService.listarPorAvaliacaoFisioterapeutica(avaliacaoFisioterapeuticaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: analises => {
          this.analises = analises;
          this.loading = false;
        },
        error: () => {
          this.erro = 'Erro ao carregar análises posturais.';
          this.loading = false;
        }
      });
  }

  alternarFoto(analise: AvaliacaoPosturalResponseDTO): void {
    if (this.fotoAbertaId === analise.id) {
      this.fotoAbertaId = null;
      return;
    }

    this.fotoAbertaId = analise.id;
    if (this.fotoUrls.has(analise.id) || !analise.temFoto) return;

    this.carregandoFotoId = analise.id;
    this.posturalService.baixarFoto(analise.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: blob => {
          this.fotoUrls.set(analise.id, URL.createObjectURL(blob));
          this.carregandoFotoId = null;
        },
        error: err => {
          this.erro = extrairMensagemErro(err, 'Erro ao carregar a foto da análise.');
          this.carregandoFotoId = null;
          this.fotoAbertaId = null;
        }
      });
  }

  fotoUrl(id: number): string | null {
    return this.fotoUrls.get(id) ?? null;
  }

  /** Libera o object URL de uma análise que saiu da lista, sem esperar o `ngOnDestroy`. */
  private descartarFoto(id: number): void {
    const url = this.fotoUrls.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      this.fotoUrls.delete(id);
    }
    if (this.fotoAbertaId === id) {
      this.fotoAbertaId = null;
    }
  }

  confirmarCancelar(id: number): void {
    if (this.acaoEmAndamentoId !== null) return;
    this.confirmarCancelarId = id;
  }

  fecharConfirmacaoCancelar(): void {
    this.confirmarCancelarId = null;
  }

  vistaEmConfirmacao(): string {
    const analise = this.analises.find(a => a.id === this.confirmarCancelarId);
    return analise ? this.vistaLabel[analise.vista] : '';
  }

  executarCancelamento(): void {
    if (this.confirmarCancelarId === null || this.acaoEmAndamentoId !== null) return;

    const id = this.confirmarCancelarId;
    this.fecharConfirmacaoCancelar();
    this.acaoEmAndamentoId = id;
    this.erro = null;

    this.posturalService.cancelar(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.analises = this.analises.filter(a => a.id !== id);
          this.descartarFoto(id);
          this.acaoEmAndamentoId = null;
          if (this.successTimer !== null) {
            clearTimeout(this.successTimer);
          }
          this.sucesso = 'Análise cancelada com sucesso.';
          this.successTimer = setTimeout(() => { this.sucesso = null; }, 4000);
        },
        error: err => {
          this.erro = extrairMensagemErro(err, 'Erro ao cancelar a análise.');
          this.acaoEmAndamentoId = null;
        }
      });
  }
}
