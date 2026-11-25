import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TomadorService } from '../../../core/services/tomador.service';
import { cpfCnpjValidator } from '../../../core/validators/cpf-cnpj.validator';
import { MascaraDirective } from '../../../shared/directives/mascara.directive';
import { exibirValorGravado, somenteDigitos } from '../../../shared/utils/mascara';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { focarPrimeiroCampo, focarPrimeiroInvalido } from '../../../shared/utils/form-focus';
import {
  ehConflitoConcorrencia,
  extrairMensagemErro,
  MENSAGEM_CONFLITO_CONCORRENCIA
} from '../../../shared/utils/api-error';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';

@Component({
  selector: 'app-tomador-form',
  imports: [ReactiveFormsModule, RouterLink, MascaraDirective, CarregandoComponent],
  templateUrl: './tomador-form.component.html',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class TomadorFormComponent implements OnInit, AfterViewInit {
  form!: FormGroup;
  isEdit = false;
  tomadorId: number | null = null;
  loading = false;
  salvando = false;
  erro: string | null = null;
  parametroInvalido = false;
  private version: number | null = null;

  constructor(
    private fb: FormBuilder,
    private service: TomadorService,
    private route: ActivatedRoute,
    private router: Router,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nome: ['', [Validators.required, Validators.maxLength(255)]],
      cpfCnpj: ['', [Validators.required, cpfCnpjValidator]],
      email: ['', [Validators.email]],
      telefone: [''],
      observacoes: ['', [Validators.maxLength(500)]]
    });

    if (this.route.snapshot.paramMap.get('id') === null) return;
    this.tomadorId = parseRouteNumberParam(this.route.snapshot.paramMap, 'id');
    if (this.tomadorId === null) {
      this.parametroInvalido = true;
      this.erro = 'Identificador inválido.';
      return;
    }

    this.isEdit = true;
    this.loading = true;
    this.service.buscar(this.tomadorId).subscribe({
      next: t => {
        this.form.patchValue({
          nome: t.nome,
          cpfCnpj: exibirValorGravado('cpfCnpj', t.cpfCnpj),
          email: t.email ?? '',
          telefone: t.telefone ?? '',
          observacoes: t.observacoes ?? ''
        });
        this.version = t.version;
        this.loading = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar tomador.';
        this.loading = false;
      }
    });
  }

  ngAfterViewInit(): void {
    if (!this.isEdit) focarPrimeiroCampo(this.host);
  }

  salvar(): void {
    if (this.parametroInvalido) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      focarPrimeiroInvalido(this.form, this.host);
      return;
    }
    this.salvando = true;
    this.erro = null;
    const v = this.form.getRawValue();
    const dados = {
      nome: v.nome.trim(),
      cpfCnpj: somenteDigitos(v.cpfCnpj),
      // Na edição, vazio apaga o campo opcional; no cadastro, vazio é o mesmo que ausente.
      email: v.email.trim(),
      telefone: somenteDigitos(v.telefone),
      observacoes: v.observacoes.trim()
    };

    const obs = this.isEdit && this.tomadorId !== null
      ? this.service.atualizar(this.tomadorId, { ...dados, version: this.version })
      : this.service.cadastrar({
          nome: dados.nome,
          cpfCnpj: dados.cpfCnpj,
          email: dados.email || undefined,
          telefone: dados.telefone || undefined,
          observacoes: dados.observacoes || undefined
        });

    obs.subscribe({
      next: t => this.router.navigate(['/tomadores', t.id]),
      error: (err: unknown) => {
        this.erro = this.mensagemErro(err);
        this.salvando = false;
      }
    });
  }

  campo(nome: string): AbstractControl | null {
    return this.form.get(nome);
  }

  /** `400` e `409` (CPF/CNPJ de outro tomador) trazem a mensagem da API. */
  private mensagemErro(err: unknown): string {
    if (ehConflitoConcorrencia(err)) return MENSAGEM_CONFLITO_CONCORRENCIA;
    if (err instanceof HttpErrorResponse && (err.status === 400 || err.status === 409)) {
      return extrairMensagemErro(err, 'Erro ao salvar tomador.');
    }
    return 'Erro ao salvar tomador.';
  }
}
