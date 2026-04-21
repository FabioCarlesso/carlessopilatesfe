import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { PlanoService } from '../../../core/services/plano.service';
import { PlanoResponseDTO, TIPO_LABEL } from '../../../core/models/plano';

@Component({
  selector: 'app-pagamento-form',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './pagamento-form.component.html',
  styleUrl: './pagamento-form.component.scss'
})
export class PagamentoFormComponent implements OnInit {
  form!: FormGroup;
  pacienteId!: number;
  planos: PlanoResponseDTO[] = [];
  salvando = false;
  carregando = false;
  erro: string | null = null;

  readonly tipoLabel = TIPO_LABEL;

  constructor(
    private fb: FormBuilder,
    private pagamentoService: PagamentoService,
    private planoService: PlanoService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.pacienteId = +this.route.snapshot.paramMap.get('id')!;
    this.form = this.fb.group({
      planoId: [null, Validators.required],
      valor: [null, [Validators.required, Validators.min(0.01)]],
      dataVencimento: ['', Validators.required],
      periodoInicio: ['', Validators.required],
      periodoFim: ['', Validators.required]
    });
    this.carregarPlanos();
  }

  carregarPlanos(): void {
    this.carregando = true;
    this.planoService.listar(this.pacienteId).subscribe({
      next: planos => {
        this.planos = planos.filter(p => p.ativo);
        this.carregando = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar planos.';
        this.carregando = false;
      }
    });
  }

  campo(nome: string) {
    return this.form.get(nome);
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.salvando = true;
    this.erro = null;
    this.pagamentoService.criar({ ...this.form.value, planoId: +this.form.value.planoId }).subscribe({
      next: () => this.router.navigate(['/pacientes', this.pacienteId, 'pagamentos']),
      error: () => {
        this.erro = 'Erro ao registrar pagamento.';
        this.salvando = false;
      }
    });
  }
}
