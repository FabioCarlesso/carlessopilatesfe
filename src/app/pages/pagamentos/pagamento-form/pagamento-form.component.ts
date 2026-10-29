import { AfterViewInit, Component, ElementRef, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { PlanoService } from '../../../core/services/plano.service';
import { PlanoResponseDTO, TIPO_LABEL } from '../../../core/models/plano';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { focarPrimeiroCampo, focarPrimeiroInvalido } from '../../../shared/utils/form-focus';
import { extrairMensagemErro } from '../../../shared/utils/api-error';
import {
  calcularPeriodoFim,
  ehDataIsoValida,
  lerPreenchimentoRenovacao
} from '../../../shared/utils/renovacao-plano';

@Component({
  selector: 'app-pagamento-form',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink, BreadcrumbComponent],
  templateUrl: './pagamento-form.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './pagamento-form.component.scss'
})
export class PagamentoFormComponent implements OnInit, AfterViewInit {
  form!: FormGroup;
  pacienteId: number | null = null;
  planos: PlanoResponseDTO[] = [];
  salvando = false;
  carregando = false;
  erro: string | null = null;
  /** O formulário veio da ação "Renovar" do detalhe do paciente (issue #133). */
  renovacao = false;
  /** O `POST` falhou com `409`: já existe cobrança do plano para esse início de período. */
  conflitoPeriodo = false;

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
        this.aplicarPreenchimentoRenovacao();
        this.carregando = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar planos.';
        this.carregando = false;
      }
    });
  }

  /**
   * Pré-preenche plano, valor, início do período e vencimento a partir da
   * query string montada por "Renovar". Parâmetro inválido ou ausente fica de
   * fora, e o campo segue vazio como sem query params; um `planoId` fora dos
   * planos ativos também. Todos os campos continuam editáveis.
   */
  private aplicarPreenchimentoRenovacao(): void {
    const preenchimento = lerPreenchimentoRenovacao(this.route.snapshot.queryParamMap, this.planos);
    if (Object.keys(preenchimento).length === 0) return;
    this.form.patchValue(preenchimento);
    this.renovacao = preenchimento.planoId !== undefined;
  }

  /**
   * Período que a renovação vai cobrar, recalculado a partir do que está no
   * formulário (a equipe pode trocar o início). O fim segue a conta da API.
   */
  get periodoRenovacao(): { inicio: string; fim: string } | null {
    if (!this.renovacao) return null;
    const { planoId, periodoInicio } = this.form.value;
    const plano = this.planos.find(p => p.id === Number(planoId));
    if (!plano || !ehDataIsoValida(periodoInicio)) return null;
    return { inicio: periodoInicio, fim: calcularPeriodoFim(periodoInicio, plano.tipo) };
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
    this.conflitoPeriodo = false;
    this.pagamentoService.criar({
      ...this.form.value,
      pacienteId: this.pacienteId,
      planoId: +this.form.value.planoId
    }).subscribe({
      next: () => this.router.navigate(['/pagamentos/paciente', this.pacienteId]),
      // A API explica o motivo: no `409`, já existe pagamento do plano com esse
      // início de período (em geral gerado pelo job enquanto a tela estava
      // aberta); no `400`, o valor ficou abaixo do valor do plano.
      error: (err: unknown) => {
        this.erro = extrairMensagemErro(err, 'Erro ao registrar pagamento.');
        this.conflitoPeriodo = err instanceof HttpErrorResponse && err.status === 409;
        this.salvando = false;
      }
    });
  }
}
