import { Component, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { PagamentoResponseDTO, StatusPagamento } from '../../../core/models/plano';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';

@Component({
  selector: 'app-pagamento-list',
  imports: [NgIf, NgFor, NgClass, CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './pagamento-list.component.html',
  styleUrl: './pagamento-list.component.scss'
})
export class PagamentoListComponent implements OnInit {
  pacienteId: number | null = null;
  pagamentos: PagamentoResponseDTO[] = [];
  loading = false;
  erro: string | null = null;
  pagarId: number | null = null;
  pagarForm!: FormGroup;

  readonly statusLabel: Record<StatusPagamento, string> = {
    PENDENTE: 'Pendente',
    PAGO: 'Pago',
    VENCIDO: 'Vencido'
  };

  constructor(
    private service: PagamentoService,
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    this.pagarForm = this.fb.group({ dataPagamento: ['', Validators.required] });
    if (this.pacienteId === null) {
      this.erro = 'Identificador inválido.';
      return;
    }
    this.carregar();
  }

  carregar(): void {
    if (this.pacienteId === null) {
      this.erro = 'Identificador inválido.';
      return;
    }
    this.loading = true;
    this.erro = null;
    this.service.listar(this.pacienteId).subscribe({
      next: pagamentos => {
        this.pagamentos = pagamentos;
        this.loading = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar pagamentos.';
        this.loading = false;
      }
    });
  }

  abrirPagar(id: number): void {
    this.pagarId = id;
    this.pagarForm.reset();
  }

  cancelarPagar(): void {
    this.pagarId = null;
  }

  confirmarPagar(): void {
    if (this.pagarForm.invalid || this.pagarId === null) return;
    const { dataPagamento } = this.pagarForm.value;
    this.service.pagar(this.pagarId, dataPagamento).subscribe({
      next: () => {
        this.pagarId = null;
        this.carregar();
      },
      error: () => {
        this.erro = 'Erro ao confirmar pagamento.';
        this.pagarId = null;
      }
    });
  }
}
