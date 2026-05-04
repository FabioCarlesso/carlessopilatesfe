import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PlanoTratamentoResponseDTO, PLANO_TRATAMENTO_STATUS_LABEL } from '../../../core/models/plano-tratamento';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { PlanoTratamentoService } from '../../../core/services/plano-tratamento.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';

@Component({
  selector: 'app-paciente-plano-tratamento-list',
  imports: [NgIf, NgFor, DatePipe, RouterLink],
  templateUrl: './paciente-plano-tratamento-list.component.html',
  styleUrl: './paciente-plano-tratamento-list.component.scss'
})
export class PacientePlanoTratamentoListComponent implements OnInit {
  pacienteId: number | null = null;
  paciente: PacienteResponseDTO | null = null;
  planos: PlanoTratamentoResponseDTO[] = [];
  loading = false;
  erro: string | null = null;
  sucesso: string | null = null;
  confirmarAcaoId: number | null = null;
  acaoPendente: 'encerrar' | 'suspender' | null = null;

  readonly statusLabel = PLANO_TRATAMENTO_STATUS_LABEL;

  constructor(
    private planoTratamentoService: PlanoTratamentoService,
    private pacienteService: PacienteService,
    private route: ActivatedRoute
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

    this.pacienteService.buscar(this.pacienteId).subscribe({
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

    this.planoTratamentoService.listarPorPaciente(this.pacienteId).subscribe({
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
    this.confirmarAcaoId = id;
    this.acaoPendente = acao;
  }

  cancelarAcao(): void {
    this.confirmarAcaoId = null;
    this.acaoPendente = null;
  }

  executarAcao(): void {
    if (this.confirmarAcaoId === null || this.acaoPendente === null) return;

    const id = this.confirmarAcaoId;
    const acao = this.acaoPendente;
    this.cancelarAcao();

    const obs = acao === 'encerrar'
      ? this.planoTratamentoService.encerrar(id)
      : this.planoTratamentoService.suspender(id);

    obs.subscribe({
      next: () => {
        this.sucesso = acao === 'encerrar'
          ? 'Plano de tratamento encerrado com sucesso.'
          : 'Plano de tratamento suspenso com sucesso.';
        this.carregarPlanos();
        setTimeout(() => { this.sucesso = null; }, 4000);
      },
      error: () => {
        this.erro = `Erro ao ${acao} plano de tratamento.`;
      }
    });
  }

  acaoLabel(): string {
    return this.acaoPendente === 'encerrar' ? 'encerrar' : 'suspender';
  }
}
