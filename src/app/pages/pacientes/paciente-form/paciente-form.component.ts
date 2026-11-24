import { AfterViewInit, Component, ElementRef, OnInit, ChangeDetectionStrategy } from '@angular/core';

import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PacienteService } from '../../../core/services/paciente.service';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { focarPrimeiroCampo, focarPrimeiroInvalido } from '../../../shared/utils/form-focus';
import {
  ehConflitoConcorrencia,
  extrairMensagemErro,
  MENSAGEM_CONFLITO_CONCORRENCIA
} from '../../../shared/utils/api-error';
import { cpfValidator } from '../../../core/validators/cpf.validator';
import { cpfCnpjValidator } from '../../../core/validators/cpf-cnpj.validator';
import { PacienteNotaFiscalDTO } from '../../../core/models/paciente';
import { MascaraDirective } from '../../../shared/directives/mascara.directive';
import { somenteDigitos } from '../../../shared/utils/mascara';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';

@Component({
  selector: 'app-paciente-form',
  imports: [ReactiveFormsModule, RouterLink, MascaraDirective, CarregandoComponent],
  templateUrl: './paciente-form.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './paciente-form.component.scss'
})
export class PacienteFormComponent implements OnInit, AfterViewInit {
  form!: FormGroup;
  isEdit = false;
  pacienteId: number | null = null;
  loading = false;
  salvando = false;
  erro: string | null = null;
  parametroInvalido = false;
  /** Versão carregada no GET: vai no PUT para a API recusar a edição se outra pessoa salvou antes. */
  private version: number | null = null;
  /** Se o paciente em edição já tinha CPF gravado (o campo fica travado). */
  private cpfGravado = false;

  constructor(
    private fb: FormBuilder,
    private service: PacienteService,
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
      // E-mail e CPF são opcionais na API: a importação do seufisio trouxe
      // pacientes sem eles, e o formulário não pode impedir de editá-los (#286).
      email: ['', [Validators.email]],
      cpf: ['', [cpfValidator]],
      telefone: [''],
      dataNascimento: [''],
      endereco: this.fb.group({
        logradouro: [''],
        numero: [''],
        bairro: [''],
        cidade: [''],
        uf: [''],
        cep: ['']
      }),
      notaFiscal: this.fb.group({
        cpfNaNota: [false],
        notaCpfCnpj: [{ value: '', disabled: true }, [cpfCnpjValidator]],
        notaNome: [{ value: '', disabled: true }, [Validators.maxLength(255)]]
      }, { validators: nomeExigeDocumentoDoTomador })
    });
    this.form.get('notaFiscal.cpfNaNota')?.valueChanges.subscribe(marcado => this.alternarTomador(!!marcado));

    const rawId = this.route.snapshot.paramMap.get('id');
    if (rawId === null) return;

    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'id');
    if (this.pacienteId === null) {
      this.parametroInvalido = true;
      this.erro = 'Identificador inválido.';
      return;
    }

    this.isEdit = true;
    this.loading = true;
    this.service.buscar(this.pacienteId).subscribe({
      next: p => {
        this.form.patchValue(p);
        this.form.get('notaFiscal')?.patchValue({
          cpfNaNota: p.cpfNaNota ?? false,
          notaCpfCnpj: p.notaCpfCnpj ?? '',
          notaNome: p.notaNome ?? ''
        });
        this.version = p.version;
        this.cpfGravado = !!p.cpf;
        // Só trava o CPF de quem já tem um; sem CPF, o campo fica aberto para completar o cadastro.
        if (this.cpfGravado) this.form.get('cpf')?.disable();
        this.loading = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar paciente.';
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

    // Só dígitos, o formato único de envio (ver `shared/utils/mascara.ts`). A
    // máscara já entrega assim; normalizar aqui garante o contrato mesmo que o
    // valor chegue ao controle por outro caminho. Vazios não vão: na edição,
    // ausente mantém o valor gravado, e a API não aceita CPF ou e-mail em branco.
    const email = texto(valor.email) || undefined;
    const cpf = somenteDigitos(valor.cpf) || undefined;
    const notaFiscal = this.notaFiscal(valor.notaFiscal);

    const obs = this.isEdit && this.pacienteId !== null
      ? this.service.atualizar(this.pacienteId, {
          nome: valor.nome,
          email,
          cpf: this.cpfGravado ? undefined : cpf,
          telefone: valor.telefone,
          dataNascimento: valor.dataNascimento,
          endereco: valor.endereco,
          ...notaFiscal,
          version: this.version
        })
      : this.service.cadastrar({
          nome: valor.nome,
          email,
          cpf,
          telefone: somenteDigitos(valor.telefone),
          dataNascimento: valor.dataNascimento,
          endereco: { ...valor.endereco, cep: somenteDigitos(valor.endereco.cep) },
          ...notaFiscal
        });

    obs.subscribe({
      next: () => this.router.navigate(['/pacientes']),
      error: (err: unknown) => {
        this.erro = this.mensagemErro(err);
        this.salvando = false;
      }
    });
  }

  /**
   * Na edição, o tomador alternativo vai como `''` quando vazio ou quando o
   * paciente deixa de querer CPF na nota: é o que a API usa para apagá-lo. No
   * cadastro, campo vazio simplesmente não vai.
   */
  private notaFiscal(valor: { cpfNaNota: boolean; notaCpfCnpj?: string; notaNome?: string }): PacienteNotaFiscalDTO {
    const cpfNaNota = !!valor.cpfNaNota;
    const documento = cpfNaNota ? somenteDigitos(valor.notaCpfCnpj) : '';
    const nome = cpfNaNota && documento ? texto(valor.notaNome) : '';
    if (!this.isEdit) {
      return { cpfNaNota, notaCpfCnpj: documento || undefined, notaNome: nome || undefined };
    }
    return { cpfNaNota, notaCpfCnpj: documento, notaNome: nome };
  }

  private alternarTomador(marcado: boolean): void {
    for (const nome of ['notaCpfCnpj', 'notaNome']) {
      const controle = this.form.get(`notaFiscal.${nome}`);
      if (marcado) controle?.enable({ emitEvent: false });
      else controle?.disable({ emitEvent: false });
    }
  }

  /**
   * `400` (CPF/CNPJ do tomador inválido) e `409` (CPF ou e-mail de outro paciente)
   * trazem a mensagem da API, que diz o que corrigir.
   */
  private mensagemErro(err: unknown): string {
    if (ehConflitoConcorrencia(err)) return MENSAGEM_CONFLITO_CONCORRENCIA;
    if (err instanceof HttpErrorResponse && (err.status === 400 || err.status === 409)) {
      return extrairMensagemErro(err, 'Erro ao salvar paciente.');
    }
    return 'Erro ao salvar paciente.';
  }

  campo(nome: string): AbstractControl | null {
    return this.form.get(nome);
  }
}

function texto(valor: string | null | undefined): string {
  return (valor ?? '').trim();
}

/** O nome do tomador só faz sentido com o CPF/CNPJ dele, como a API exige. Erro: `{ nomeSemDocumento: true }`. */
function nomeExigeDocumentoDoTomador(grupo: AbstractControl): ValidationErrors | null {
  const nome = texto(grupo.get('notaNome')?.value);
  const documento = somenteDigitos(grupo.get('notaCpfCnpj')?.value);
  return grupo.get('cpfNaNota')?.value && nome && !documento ? { nomeSemDocumento: true } : null;
}
