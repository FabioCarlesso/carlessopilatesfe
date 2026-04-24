import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { TIPO_CONTRATO_LABEL, TipoContrato } from '../../../core/models/profissional';

@Component({
  selector: 'app-profissional-form',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './profissional-form.component.html',
  styleUrl: './profissional-form.component.scss'
})
export class ProfissionalFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  profissionalId: number | null = null;
  loading = false;
  salvando = false;
  erro: string | null = null;

  readonly tiposContrato: TipoContrato[] = ['CLT', 'PJ', 'AUTONOMO'];
  readonly tipoContratoLabel = TIPO_CONTRATO_LABEL;

  constructor(
    private fb: FormBuilder,
    private service: ProfissionalService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      cpf: ['', Validators.required],
      telefone: [''],
      tipoContrato: ['', Validators.required],
      percentualPagamentoAula: [null, [Validators.required, Validators.min(0.01), Validators.max(100)]],
      dataInicio: ['', Validators.required]
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.isEdit = true;
    this.profissionalId = +id;
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
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

  campo(nome: string) {
    return this.form.get(nome);
  }
}
