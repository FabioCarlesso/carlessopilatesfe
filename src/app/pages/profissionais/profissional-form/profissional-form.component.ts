import { AfterViewInit, Component, ElementRef, OnInit, ChangeDetectionStrategy } from '@angular/core';

import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { TIPO_CONTRATO_LABEL, TipoContrato } from '../../../core/models/profissional';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { focarPrimeiroCampo, focarPrimeiroInvalido } from '../../../shared/utils/form-focus';
import { extrairMensagemErro } from '../../../shared/utils/api-error';
import { cpfValidator } from '../../../core/validators/cpf.validator';
import { MascaraDirective } from '../../../shared/directives/mascara.directive';
import { somenteDigitos } from '../../../shared/utils/mascara';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';

/** `Validators.required` aceita "   "; a API recusa o registro em branco com `400`. */
function naoEmBranco(control: AbstractControl): ValidationErrors | null {
  const valor = control.value;
  return typeof valor === 'string' && valor.length > 0 && valor.trim().length === 0 ? { emBranco: true } : null;
}

@Component({
  selector: 'app-profissional-form',
  imports: [ReactiveFormsModule, RouterLink, MascaraDirective, CarregandoComponent],
  templateUrl: './profissional-form.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './profissional-form.component.scss'
})
export class ProfissionalFormComponent implements OnInit, AfterViewInit {
  form!: FormGroup;
  isEdit = false;
  profissionalId: number | null = null;
  loading = false;
  salvando = false;
  erro: string | null = null;
  parametroInvalido = false;
  /** Versão carregada no GET: vai no PUT para a API recusar a edição se outra pessoa salvou antes. */
  private version: number | null = null;

  readonly tiposContrato: TipoContrato[] = ['CLT', 'PJ', 'AUTONOMO'];
  readonly tipoContratoLabel = TIPO_CONTRATO_LABEL;

  constructor(
    private fb: FormBuilder,
    private service: ProfissionalService,
    private route: ActivatedRoute,
    private router: Router,
    private host: ElementRef<HTMLElement>
  ) {}

  ngAfterViewInit(): void {
    if (!this.isEdit) focarPrimeiroCampo(this.host);
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      cpf: ['', [Validators.required, cpfValidator]],
      telefone: [''],
      // Obrigatório desde a issue #308 (carlessopilatesapi#250): todo profissional
      // do estúdio é fisioterapeuta, e o prontuário identifica cada evolução pelo
      // número no CREFITO. Sem máscara: o formato varia entre os regionais.
      numeroRegistro: ['', [Validators.required, naoEmBranco, Validators.maxLength(30)]],
      tipoContrato: ['', Validators.required],
      percentualPagamentoAula: [null, [Validators.required, Validators.min(0.01), Validators.max(100)]],
      dataInicio: ['', Validators.required]
    });

    const rawId = this.route.snapshot.paramMap.get('id');
    if (rawId === null) return;

    this.profissionalId = parseRouteNumberParam(this.route.snapshot.paramMap, 'id');
    if (this.profissionalId === null) {
      this.parametroInvalido = true;
      this.erro = 'Identificador inválido.';
      return;
    }

    this.isEdit = true;
    this.loading = true;
    this.service.buscar(this.profissionalId).subscribe({
      next: profissional => {
        this.form.patchValue(profissional);
        this.version = profissional.version;
        this.form.get('cpf')?.disable();
        // Cadastro antigo sem CREFITO (issue #308): a pendência aparece já na abertura.
        if (!profissional.numeroRegistro?.trim()) this.form.get('numeroRegistro')?.markAsTouched();
        this.loading = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar profissional.';
        this.loading = false;
      }
    });
  }

  salvar(): void {
    if (this.parametroInvalido) {
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
    const valor = this.form.getRawValue();

    const request$ = this.isEdit && this.profissionalId !== null
      ? this.service.atualizar(this.profissionalId, {
          nome: valor.nome,
          email: valor.email,
          telefone: valor.telefone,
          // O formulário já não deixa o registro em branco (issue #308).
          numeroRegistro: (valor.numeroRegistro ?? '').trim(),
          tipoContrato: valor.tipoContrato,
          percentualPagamentoAula: valor.percentualPagamentoAula,
          dataInicio: valor.dataInicio,
          version: this.version
        })
      : this.service.cadastrar({
          ...valor,
          numeroRegistro: (valor.numeroRegistro ?? '').trim(),
          // Só dígitos, o formato único de envio (ver `shared/utils/mascara.ts`).
          cpf: somenteDigitos(valor.cpf),
          telefone: somenteDigitos(valor.telefone)
        });

    request$.subscribe({
      next: () => this.router.navigate(['/profissionais']),
      error: (err: unknown) => {
        // Explica o `409` de concorrência e traz o `detail` do `400` (ex.: CREFITO ausente).
        this.erro = extrairMensagemErro(err, 'Erro ao salvar profissional.');
        this.salvando = false;
      }
    });
  }

  campo(nome: string): AbstractControl | null {
    return this.form.get(nome);
  }
}
