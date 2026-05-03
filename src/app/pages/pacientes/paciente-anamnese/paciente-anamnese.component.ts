import { NgIf } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of, throwError } from 'rxjs';
import { AnamneseResponseDTO } from '../../../core/models/anamnese';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { AnamneseService } from '../../../core/services/anamnese.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';

@Component({
  selector: 'app-paciente-anamnese',
  imports: [NgIf, ReactiveFormsModule, RouterLink],
  templateUrl: './paciente-anamnese.component.html',
  styleUrl: './paciente-anamnese.component.scss'
})
export class PacienteAnamneseComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  pacienteId: number | null = null;
  paciente: PacienteResponseDTO | null = null;
  anamnese: AnamneseResponseDTO | null = null;
  loading = false;
  salvando = false;
  erro: string | null = null;
  sucesso: string | null = null;
  parametroInvalido = false;
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private fb: FormBuilder,
    private pacienteService: PacienteService,
    private anamneseService: AnamneseService,
    private route: ActivatedRoute,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      queixaPrincipal: ['', [Validators.required, Validators.pattern(/\S/)]],
      historicoDoencas: [''],
      historicoCirurgias: [''],
      historicoLesoes: [''],
      medicamentosUso: [''],
      alergias: [''],
      nivelAtividadeFisica: [''],
      restricoesMedicas: [''],
      objetivos: ['', [Validators.required, Validators.pattern(/\S/)]],
      observacoes: ['']
    });

    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    if (this.pacienteId === null) {
      this.parametroInvalido = true;
      this.erro = 'Identificador inválido.';
      return;
    }

    this.carregar();
  }

  ngOnDestroy(): void {
    if (this.successTimer !== null) {
      clearTimeout(this.successTimer);
    }
  }

  carregar(): void {
    if (this.pacienteId === null) return;

    this.loading = true;
    this.erro = null;

    forkJoin({
      paciente: this.pacienteService.buscar(this.pacienteId),
      anamnese: this.anamneseService.buscarPorPaciente(this.pacienteId).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404) {
            return of(null);
          }
          return throwError(() => error);
        })
      )
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ paciente, anamnese }) => {
        this.paciente = paciente;
        this.anamnese = anamnese;
        if (anamnese) {
          const { id, pacienteId, nomePaciente, dataCriacao, dataAtualizacao, ...formFields } = anamnese;
          this.form.patchValue(formFields);
        }
        this.loading = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar anamnese do paciente.';
        this.loading = false;
      }
    });
  }

  salvar(): void {
    if (this.parametroInvalido || this.pacienteId === null) {
      this.erro = 'Identificador inválido.';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando = true;
    this.erro = null;
    this.sucesso = null;

    const valor = this.form.value;
    const opt = (v: string): string | null => (v?.trim() ? v : null);
    const dto = {
      queixaPrincipal: valor.queixaPrincipal,
      historicoDoencas: opt(valor.historicoDoencas),
      historicoCirurgias: opt(valor.historicoCirurgias),
      historicoLesoes: opt(valor.historicoLesoes),
      medicamentosUso: opt(valor.medicamentosUso),
      alergias: opt(valor.alergias),
      nivelAtividadeFisica: opt(valor.nivelAtividadeFisica),
      restricoesMedicas: opt(valor.restricoesMedicas),
      objetivos: valor.objetivos,
      observacoes: opt(valor.observacoes)
    };

    const anamneseAtual = this.anamnese;
    const criando = anamneseAtual === null;
    const obs = criando
      ? this.anamneseService.criar({ pacienteId: this.pacienteId, ...dto })
      : this.anamneseService.atualizar(anamneseAtual.id, dto);

    obs.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        this.anamnese = response;
        const { id, pacienteId, nomePaciente, dataCriacao, dataAtualizacao, ...formFields } = response;
        this.form.patchValue(formFields);
        if (this.successTimer !== null) {
          clearTimeout(this.successTimer);
        }
        this.sucesso = criando ? 'Anamnese cadastrada com sucesso.' : 'Anamnese atualizada com sucesso.';
        this.successTimer = setTimeout(() => { this.sucesso = null; }, 4000);
        this.salvando = false;
      },
      error: () => {
        this.erro = 'Erro ao salvar anamnese.';
        this.salvando = false;
      }
    });
  }

  campo(nome: string) {
    return this.form.get(nome);
  }
}
