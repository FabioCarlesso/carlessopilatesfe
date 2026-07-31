import { AfterViewInit, Component, ElementRef, OnInit, OnDestroy } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { Subscription } from 'rxjs';
import { PlanoService } from '../../../core/services/plano.service';
import {
  DiaSemana,
  DIAS_SEMANA_LABEL,
  FREQUENCIA_DIAS,
  FREQUENCIA_LABEL,
  FrequenciaSemanal,
  TIPO_LABEL,
  TipoPagamento
} from '../../../core/models/plano';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { focarPrimeiroCampo, focarPrimeiroInvalido } from '../../../shared/utils/form-focus';

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
  imports: [ReactiveFormsModule, RouterLink, BreadcrumbComponent],
  templateUrl: './plano-form.component.html',
  styleUrl: './plano-form.component.scss'
})
export class PlanoFormComponent implements OnInit, OnDestroy, AfterViewInit {
  form!: FormGroup;
  pacienteId: number | null = null;
  salvando = false;
  erro: string | null = null;
  private subscriptions = new Subscription();

  readonly tipos: TipoPagamento[] = ['MENSAL', 'TRIMESTRAL', 'ANUAL'];
  readonly frequencias: FrequenciaSemanal[] = ['UMA_VEZ', 'DUAS_VEZES', 'TRES_VEZES'];
  readonly diasDisponiveis: DiaSemana[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  readonly diasLabel = DIAS_SEMANA_LABEL;
  readonly tipoLabel = TIPO_LABEL;
  readonly frequenciaLabel = FREQUENCIA_LABEL;

  constructor(private fb: FormBuilder, private service: PlanoService, private route: ActivatedRoute, private router: Router, private host: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    focarPrimeiroCampo(this.host);
  }

  ngOnInit(): void {
    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    this.form = this.fb.group({
      tipo: ['', Validators.required],
      valor: [null, [Validators.required, Validators.min(0.01)]],
      frequenciaSemanal: ['', Validators.required],
      dataInicio: ['', Validators.required],
      diasSemana: [[], [Validators.required, diasSemanaValidator]]
    });
    this.subscriptions.add(
      this.form.get('frequenciaSemanal')?.valueChanges.subscribe(() => {
        this.form.get('diasSemana')?.updateValueAndValidity();
      })
    );
    if (this.pacienteId === null) {
      this.erro = 'Identificador inválido.';
    }
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

  campo(nome: string): AbstractControl | null {
    return this.form.get(nome);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
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
    this.service.criar({ ...this.form.value, pacienteId: this.pacienteId }).subscribe({
      next: () => this.router.navigate(['/planos/paciente', this.pacienteId]),
      error: () => {
        this.erro = 'Erro ao salvar plano.';
        this.salvando = false;
      }
    });
  }
}
