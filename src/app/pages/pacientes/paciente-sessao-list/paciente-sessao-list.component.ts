import { DatePipe, NgFor, NgIf } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SessaoResponseDTO, SESSAO_STATUS_LABEL, SESSAO_TIPO_LABEL } from '../../../core/models/sessao';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { SessaoService } from '../../../core/services/sessao.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';

@Component({
  selector: 'app-paciente-sessao-list',
  imports: [NgIf, NgFor, DatePipe, RouterLink],
  templateUrl: './paciente-sessao-list.component.html',
  styleUrl: './paciente-sessao-list.component.scss'
})
export class PacienteSessaoListComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('confirmarButton') confirmarButton?: ElementRef<HTMLButtonElement>;

  pacienteId: number | null = null;
  paciente: PacienteResponseDTO | null = null;
  sessoes: SessaoResponseDTO[] = [];
  loading = false;
  erro: string | null = null;
  sucesso: string | null = null;
  confirmarAcaoId: number | null = null;
  acaoPendente: 'realizar' | 'cancelar' | null = null;
  acaoEmAndamentoId: number | null = null;
  private successTimer: ReturnType<typeof setTimeout> | null = null;
  private dialogFocusPending = false;
  private previousFocusedElement: HTMLElement | null = null;

  readonly statusLabel = SESSAO_STATUS_LABEL;
  readonly tipoLabel = SESSAO_TIPO_LABEL;

  constructor(
    private sessaoService: SessaoService,
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

  ngAfterViewChecked(): void {
    if (this.dialogFocusPending && this.confirmarButton) {
      this.confirmarButton.nativeElement.focus();
      this.dialogFocusPending = false;
    }
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
          this.carregarSessoes();
        },
        error: () => {
          this.erro = 'Erro ao carregar dados do paciente.';
          this.loading = false;
        }
      });
  }

  private carregarSessoes(): void {
    if (this.pacienteId === null) return;

    this.sessaoService.listarPorPaciente(this.pacienteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: sessoes => {
          this.sessoes = sessoes;
          this.loading = false;
        },
        error: () => {
          this.erro = 'Erro ao carregar sessões.';
          this.loading = false;
        }
      });
  }

  confirmarAcao(id: number, acao: 'realizar' | 'cancelar'): void {
    if (this.acaoEmAndamentoId !== null) return;

    this.previousFocusedElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    this.confirmarAcaoId = id;
    this.acaoPendente = acao;
    this.dialogFocusPending = true;
  }

  cancelarAcao(): void {
    this.confirmarAcaoId = null;
    this.acaoPendente = null;
    this.dialogFocusPending = false;
    this.previousFocusedElement?.focus();
    this.previousFocusedElement = null;
  }

  executarAcao(): void {
    if (this.confirmarAcaoId === null || this.acaoPendente === null || this.acaoEmAndamentoId !== null) return;

    const id = this.confirmarAcaoId;
    const acao = this.acaoPendente;
    this.cancelarAcao();
    this.acaoEmAndamentoId = id;

    const obs = acao === 'realizar'
      ? this.sessaoService.realizar(id)
      : this.sessaoService.cancelar(id);

    obs.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.sucesso = acao === 'realizar'
          ? 'Sessão marcada como realizada.'
          : 'Sessão cancelada com sucesso.';
        this.carregarSessoes();
        if (this.successTimer !== null) {
          clearTimeout(this.successTimer);
        }
        this.successTimer = setTimeout(() => { this.sucesso = null; }, 4000);
        this.acaoEmAndamentoId = null;
      },
      error: () => {
        this.erro = `Erro ao ${acao} sessão.`;
        this.acaoEmAndamentoId = null;
      }
    });
  }

  acaoLabel(): string {
    return this.acaoPendente === 'realizar' ? 'marcar como realizada' : 'cancelar';
  }
}
