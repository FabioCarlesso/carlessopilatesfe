import { AfterViewInit, Component, ElementRef, OnInit } from '@angular/core';
import { CurrencyPipe, NgFor, NgIf } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { PlanoService } from '../../../core/services/plano.service';
import { PlanoResponseDTO, TIPO_LABEL } from '../../../core/models/plano';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { focarPrimeiroCampo, focarPrimeiroInvalido } from '../../../shared/utils/form-focus';

@Component({
  selector: 'app-pagamento-form',
  imports: [NgIf, NgFor, CurrencyPipe, ReactiveFormsModule, RouterLink, BreadcrumbComponent],
  templateUrl: './pagamento-form.component.html',
  styleUrl: './pagamento-form.component.scss'
})
export class PagamentoFormComponent implements OnInit, AfterViewInit {
  form!: FormGroup;
  pacienteId: number | null = null;
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
    private router: Router,
    private host: ElementRef<HTMLElement>
  ) {}

  ngAfterViewInit(): void {
    focarPrimeiroCampo(this.host);
  }

  ngOnInit(): void {
    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    this.form = this.fb.group({
      planoId: [null, Validators.required],
      valor: [null, [Validators.required, Validators.min(0.01)]],
      dataVencimento: ['', Validators.required],
      periodoInicio: ['', Validators.required]
    });
    if (this.pacienteId === null) {
      this.erro = 'Identificador inválido.';
      return;
    }
    this.carregarPlanos();
  }

  carregarPlanos(): void {
    if (this.pacienteId === null) {
      this.erro = 'Identificador inválido.';
      return;
    }
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

  campo(nome: string): AbstractControl | null {
    return this.form.get(nome);
  }

  salvar(): void {
    if (this.pacienteId === null) {
      this.erro = 'Identificador inválido.';
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      focarPrimeiroInvalido(this.form, this.host);
      return;
    }
    this.salvando = true;
    this.erro = null;
    this.pagamentoService.criar({
      ...this.form.value,
      pacienteId: this.pacienteId,
      planoId: +this.form.value.planoId
    }).subscribe({
      next: () => this.router.navigate(['/pagamentos/paciente', this.pacienteId]),
      error: () => {
        this.erro = 'Erro ao registrar pagamento.';
        this.salvando = false;
      }
    });
  }
}
