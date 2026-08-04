import { AfterViewInit, Component, ElementRef, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { TIPO_CONTRATO_LABEL, TipoContrato } from '../../../core/models/profissional';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { focarPrimeiroCampo, focarPrimeiroInvalido } from '../../../shared/utils/form-focus';

@Component({
  selector: 'app-profissional-form',
  imports: [ReactiveFormsModule, RouterLink],
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
      cpf: ['', Validators.required],
      telefone: [''],
      // Opcional e sem máscara: o formato do registro varia por conselho
      // (CREFITO, CREF etc.) e nem todo profissional do estúdio tem um.
      numeroRegistro: ['', Validators.maxLength(30)],
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
        this.form.get('cpf')?.disable();
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
          // Vai como veio do formulário — em branco é `''`, e **não** `null`.
          // O `PUT` distingue os dois: `null` (ou campo omitido) significa "não
          // altere" e preserva o valor no servidor, enquanto string vazia ou
          // só com espaços limpa o registro. Sanitizar `''` para `null` aqui
          // pareceria higiene de payload e tiraria do usuário a única forma
          // de apagar um número digitado errado.
          numeroRegistro: valor.numeroRegistro,
          tipoContrato: valor.tipoContrato,
          percentualPagamentoAula: valor.percentualPagamentoAula,
          dataInicio: valor.dataInicio
        })
      : this.service.cadastrar(valor);

    request$.subscribe({
      next: () => this.router.navigate(['/profissionais']),
      error: () => {
        this.erro = 'Erro ao salvar profissional.';
        this.salvando = false;
      }
    });
  }

  campo(nome: string): AbstractControl | null {
    return this.form.get(nome);
  }
}
