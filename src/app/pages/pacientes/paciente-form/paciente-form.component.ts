import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PacienteService } from '../../../core/services/paciente.service';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';

@Component({
  selector: 'app-paciente-form',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './paciente-form.component.html',
  styleUrl: './paciente-form.component.scss'
})
export class PacienteFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  pacienteId: number | null = null;
  loading = false;
  salvando = false;
  erro: string | null = null;
  parametroInvalido = false;

  constructor(
    private fb: FormBuilder,
    private service: PacienteService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

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
          endereco: valor.endereco
        })
      : this.service.cadastrar(valor);

    obs.subscribe({
      next: () => this.router.navigate(['/pacientes']),
      error: () => {
        this.erro = 'Erro ao salvar paciente.';
        this.salvando = false;
      }
    });
  }

  campo(nome: string) {
    return this.form.get(nome);
  }
}
