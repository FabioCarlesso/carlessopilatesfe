import { AfterViewInit, Component, ElementRef, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PacienteService } from '../../../core/services/paciente.service';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { focarPrimeiroCampo, focarPrimeiroInvalido } from '../../../shared/utils/form-focus';
import { ehConflitoConcorrencia, MENSAGEM_CONFLITO_CONCORRENCIA } from '../../../shared/utils/api-error';

@Component({
  selector: 'app-paciente-form',
  imports: [ReactiveFormsModule, RouterLink],
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
      email: ['', [Validators.required, Validators.email]],
      cpf: ['', Validators.required],
      telefone: [''],
      dataNascimento: [''],
      endereco: this.fb.group({
        logradouro: [''],
        numero: [''],
        bairro: [''],
        cidade: [''],
        uf: [''],
        cep: ['']
      })
    });

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
        this.version = p.version;
        this.form.get('cpf')?.disable();
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

    const obs = this.isEdit && this.pacienteId !== null
      ? this.service.atualizar(this.pacienteId, {
          nome: valor.nome,
          email: valor.email,
          telefone: valor.telefone,
          dataNascimento: valor.dataNascimento,
          endereco: valor.endereco,
          version: this.version
        })
      : this.service.cadastrar(valor);

    obs.subscribe({
      next: () => this.router.navigate(['/pacientes']),
      error: (err: unknown) => {
        this.erro = ehConflitoConcorrencia(err) ? MENSAGEM_CONFLITO_CONCORRENCIA : 'Erro ao salvar paciente.';
        this.salvando = false;
      }
    });
  }

  campo(nome: string): AbstractControl | null {
    return this.form.get(nome);
  }
}
