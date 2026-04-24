import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { PagamentoResponseDTO, StatusPagamento } from '../../../core/models/plano';

@Component({
  selector: 'app-pagamento-list',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './pagamento-list.component.html',
  styleUrl: './pagamento-list.component.scss'
})
export class PagamentoListComponent implements OnInit {
  pacienteId!: number;
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
    this.pacienteId = +this.route.snapshot.paramMap.get('pacienteId')!;
    this.pagarForm = this.fb.group({ dataPagamento: ['', Validators.required] });
    this.carregar();
  }

  carregar(): void {
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
