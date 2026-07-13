import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SessaoResponseDTO, SESSAO_STATUS_LABEL, SESSAO_TIPO_LABEL } from '../../../core/models/sessao';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { SessaoService } from '../../../core/services/sessao.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { extrairMensagemErro } from '../../../shared/utils/api-error';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { ConfirmarDialogComponent } from '../../../shared/components/confirmar-dialog/confirmar-dialog.component';

function dataHoraFutura(control: AbstractControl): ValidationErrors | null {
  const valor = control.value;
  if (!valor) return null;

  const dataHora = new Date(valor);
  if (Number.isNaN(dataHora.getTime())) {
    return { dataHoraFutura: true };
  }

  return dataHora.getTime() > Date.now() ? null : { dataHoraFutura: true };
}

@Component({
  selector: 'app-paciente-sessao-list',
  imports: [NgIf, NgFor, DatePipe, ReactiveFormsModule, RouterLink, ConfirmarDialogComponent],
  templateUrl: './paciente-sessao-list.component.html',
  styleUrl: './paciente-sessao-list.component.scss'
})
export class PacienteSessaoListComponent implements OnInit, OnDestroy {
  pacienteId: number | null = null;
  paciente: PacienteResponseDTO | null = null;
  sessoes: SessaoResponseDTO[] = [];
  loading = false;
  erro: string | null = null;
  sucesso: string | null = null;
  confirmarAcaoId: number | null = null;
  acaoPendente: 'realizar' | 'cancelar' | null = null;
  acaoEmAndamentoId: number | null = null;
  reagendarId: number | null = null;
  reagendarForm!: FormGroup;
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  readonly statusLabel = SESSAO_STATUS_LABEL;
  readonly tipoLabel = SESSAO_TIPO_LABEL;

  constructor(
    private sessaoService: SessaoService,
    private pacienteService: PacienteService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.reagendarForm = this.fb.group({
      dataHora: ['', [Validators.required, dataHoraFutura]]
    });

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

    const obs = acao === 'realizar'
      ? this.sessaoService.realizar(id)
      : this.sessaoService.cancelar(id);

    obs.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.exibirSucesso(acao === 'realizar'
          ? 'Sessão marcada como realizada.'
          : 'Sessão cancelada com sucesso.');
        this.carregarSessoes();
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

  abrirReagendar(sessao: SessaoResponseDTO): void {
    if (this.acaoEmAndamentoId !== null) return;

    this.reagendarId = sessao.id;
    this.erro = null;
    this.reagendarForm.reset({ dataHora: sessao.dataHora });
  }

  cancelarReagendar(): void {
    if (this.acaoEmAndamentoId !== null) return;
    this.reagendarId = null;
  }

  confirmarReagendar(): void {
    if (this.reagendarId === null || this.reagendarForm.invalid || this.acaoEmAndamentoId !== null) {
      this.reagendarForm.markAllAsTouched();
      return;
    }

    const id = this.reagendarId;
    const dataHora: string = this.reagendarForm.value.dataHora;
    this.acaoEmAndamentoId = id;
    this.erro = null;

    this.sessaoService.atualizar(id, { dataHora })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: sessao => {
          this.sessoes = this.sessoes.map(atual => (atual.id === sessao.id ? sessao : atual));
          this.acaoEmAndamentoId = null;
          this.reagendarId = null;
          this.exibirSucesso('Sessão reagendada com sucesso.');
        },
        error: err => {
          this.erro = extrairMensagemErro(err, 'Erro ao reagendar sessão.');
          this.acaoEmAndamentoId = null;
          this.reagendarId = null;
        }
      });
  }

  campoReagendar(nome: string) {
    return this.reagendarForm.get(nome);
  }

  private exibirSucesso(mensagem: string): void {
    this.sucesso = mensagem;
    if (this.successTimer !== null) {
      clearTimeout(this.successTimer);
    }
    this.successTimer = setTimeout(() => { this.sucesso = null; }, 4000);
  }
}
