import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { PlanoTratamentoResponseDTO, PLANO_TRATAMENTO_STATUS_LABEL } from '../../../core/models/plano-tratamento';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { PlanoTratamentoService } from '../../../core/services/plano-tratamento.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { ConfirmarDialogComponent } from '../../../shared/components/confirmar-dialog/confirmar-dialog.component';

@Component({
  selector: 'app-paciente-plano-tratamento-list',
  imports: [DatePipe, RouterLink, ConfirmarDialogComponent, BreadcrumbComponent],
  templateUrl: './paciente-plano-tratamento-list.component.html',
  styleUrl: './paciente-plano-tratamento-list.component.scss'
})
export class PacientePlanoTratamentoListComponent implements OnInit, OnDestroy {
  pacienteId: number | null = null;
  paciente: PacienteResponseDTO | null = null;
  planos: PlanoTratamentoResponseDTO[] = [];
  loading = false;
  erro: string | null = null;
  sucesso: string | null = null;
  confirmarAcaoId: number | null = null;
  acaoPendente: 'encerrar' | 'suspender' | null = null;
  acaoEmAndamentoId: number | null = null;
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  readonly statusLabel = PLANO_TRATAMENTO_STATUS_LABEL;

  constructor(
    private planoTratamentoService: PlanoTratamentoService,
    private pacienteService: PacienteService,
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
          this.carregarPlanos();
        },
        error: () => {
          this.erro = 'Erro ao carregar dados do paciente.';
          this.loading = false;
        }
      });
  }

  private carregarPlanos(): void {
    if (this.pacienteId === null) return;

    this.planoTratamentoService.listarPorPaciente(this.pacienteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: planos => {
          this.planos = planos;
          this.loading = false;
        },
        error: () => {
          this.erro = 'Erro ao carregar planos de tratamento.';
          this.loading = false;
        }
      });
  }

  confirmarAcao(id: number, acao: 'encerrar' | 'suspender'): void {
    if (this.acaoEmAndamentoId !== null) return;

    this.confirmarAcaoId = id;
    this.acaoPendente = acao;
  }

  cancelarAcao(): void {
    this.confirmarAcaoId = null;
    this.acaoPendente = null;
  }

  executarAcao(): void {
    if (this.confirmarAcaoId === null || this.acaoPendente === null || this.acaoEmAndamentoId !== null) return;

    const id = this.confirmarAcaoId;
    const acao = this.acaoPendente;
    this.cancelarAcao();
    this.acaoEmAndamentoId = id;

    const obs = acao === 'encerrar'
      ? this.planoTratamentoService.encerrar(id)
      : this.planoTratamentoService.suspender(id);

    obs.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.sucesso = acao === 'encerrar'
          ? 'Plano de tratamento encerrado com sucesso.'
          : 'Plano de tratamento suspenso com sucesso.';
        this.carregarPlanos();
        if (this.successTimer !== null) {
          clearTimeout(this.successTimer);
        }
        this.successTimer = setTimeout(() => { this.sucesso = null; }, 4000);
        this.acaoEmAndamentoId = null;
      },
      error: () => {
        this.erro = `Erro ao ${acao} plano de tratamento.`;
        this.acaoEmAndamentoId = null;
      }
    });
  }

  acaoLabel(): string {
    return this.acaoPendente === 'encerrar' ? 'encerrar' : 'suspender';
  }
}
