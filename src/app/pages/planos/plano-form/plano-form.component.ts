import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PlanoService } from '../../../core/services/plano.service';
import { DiaSemana, FREQUENCIA_DIAS, FrequenciaSemanal } from '../../../core/models/plano';

function diasSemanaValidator(control: AbstractControl): ValidationErrors | null {
  const group = control.parent;
  if (!group) return null;
  const frequencia: FrequenciaSemanal = group.get('frequenciaSemanal')?.value;
  const dias: DiaSemana[] = group.get('diasSemana')?.value ?? [];
  if (!frequencia || !dias.length) return null;
  const esperado = FREQUENCIA_DIAS[frequencia];
  return dias.length === esperado ? null : { diasInvalidos: { esperado, atual: dias.length } };
}

@Component({
  selector: 'app-plano-form',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './plano-form.component.html',
  styleUrl: './plano-form.component.scss'
})
export class PlanoFormComponent implements OnInit {
  form!: FormGroup;
  pacienteId!: number;
  salvando = false;
  erro: string | null = null;

  readonly tipos = ['MENSAL', 'TRIMESTRAL', 'ANUAL'] as const;
  readonly frequencias = ['UMA_VEZ', 'DUAS_VEZES', 'TRES_VEZES'] as const;
  readonly diasDisponiveis: DiaSemana[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  readonly diasLabel: Record<DiaSemana, string> = {
    MONDAY: 'Segunda', TUESDAY: 'Terça', WEDNESDAY: 'Quarta',
    THURSDAY: 'Quinta', FRIDAY: 'Sexta', SATURDAY: 'Sábado', SUNDAY: 'Domingo'
  };
  readonly tipoLabel: Record<string, string> = { MENSAL: 'Mensal', TRIMESTRAL: 'Trimestral', ANUAL: 'Anual' };
  readonly frequenciaLabel: Record<string, string> = { UMA_VEZ: '1x por semana', DUAS_VEZES: '2x por semana', TRES_VEZES: '3x por semana' };

  constructor(private fb: FormBuilder, private service: PlanoService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.pacienteId = +this.route.snapshot.paramMap.get('pacienteId')!;
    this.form = this.fb.group({
      tipo: ['', Validators.required],
      valor: [null, [Validators.required, Validators.min(0.01)]],
      frequenciaSemanal: ['', Validators.required],
      dataInicio: ['', Validators.required],
      diasSemana: [[], [Validators.required, diasSemanaValidator]]
    });
    this.form.get('frequenciaSemanal')?.valueChanges.subscribe(() => {
      this.form.get('diasSemana')?.updateValueAndValidity();
    });
  }

  toggleDia(dia: DiaSemana): void {
    const atual: DiaSemana[] = this.form.get('diasSemana')!.value;
    const novo = atual.includes(dia) ? atual.filter(d => d !== dia) : [...atual, dia];
    this.form.get('diasSemana')!.setValue(novo);
  }

  diaSelecionado(dia: DiaSemana): boolean {
    return (this.form.get('diasSemana')!.value as DiaSemana[]).includes(dia);
  }

  diasEsperados(): number {
    const f: FrequenciaSemanal = this.form.get('frequenciaSemanal')?.value;
    return f ? FREQUENCIA_DIAS[f] : 0;
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
    this.service.criar({ ...this.form.value, pacienteId: this.pacienteId }).subscribe({
      next: () => this.router.navigate(['/planos/paciente', this.pacienteId]),
      error: () => {
        this.erro = 'Erro ao salvar plano.';
        this.salvando = false;
      }
    });
  }
}
