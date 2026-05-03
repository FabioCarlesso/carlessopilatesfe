import { NgIf } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of, throwError } from 'rxjs';
import { AvaliacaoFisioterapeuticaResponseDTO } from '../../../core/models/avaliacao-fisioterapeutica';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { AvaliacaoFisioterapeuticaService } from '../../../core/services/avaliacao-fisioterapeutica.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';

@Component({
  selector: 'app-paciente-avaliacao-fisioterapeutica',
  imports: [NgIf, ReactiveFormsModule, RouterLink],
  templateUrl: './paciente-avaliacao-fisioterapeutica.component.html',
  styleUrl: './paciente-avaliacao-fisioterapeutica.component.scss'
})
export class PacienteAvaliacaoFisioterapeuticaComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  pacienteId: number | null = null;
  paciente: PacienteResponseDTO | null = null;
  avaliacao: AvaliacaoFisioterapeuticaResponseDTO | null = null;
  loading = false;
  salvando = false;
  erro: string | null = null;
  sucesso: string | null = null;
  parametroInvalido = false;
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private fb: FormBuilder,
    private pacienteService: PacienteService,
    private avaliacaoService: AvaliacaoFisioterapeuticaService,
    private route: ActivatedRoute,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      queixaPrincipal: ['', [Validators.required, Validators.pattern(/\S/)]],
      historicoClinico: [''],
      examePostural: [''],
      exameFisico: [''],
      testesEspeciais: [''],
      escalaDor: [null, [Validators.min(0), Validators.max(10)]],
      localizacaoDor: [''],
      hipoteseDiagnostica: [''],
      objetivosTratamento: ['', [Validators.required, Validators.pattern(/\S/)]],
      condutaTerapeutica: [''],
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
      avaliacao: this.avaliacaoService.buscarPorPaciente(this.pacienteId).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404) {
            return of(null);
          }
          return throwError(() => error);
        })
      )
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ paciente, avaliacao }) => {
        this.paciente = paciente;
        this.avaliacao = avaliacao;
        if (avaliacao) {
          const { id, pacienteId, nomePaciente, dataCriacao, dataAtualizacao, ...formFields } = avaliacao;
          this.form.patchValue(formFields);
        }
        this.loading = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar avaliação fisioterapêutica do paciente.';
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
    const opt = (v: string | null | undefined): string | null => (v?.trim() ? v : null);
    const dto = {
      queixaPrincipal: valor.queixaPrincipal,
      historicoClinico: opt(valor.historicoClinico),
      examePostural: opt(valor.examePostural),
      exameFisico: opt(valor.exameFisico),
      testesEspeciais: opt(valor.testesEspeciais),
      escalaDor: valor.escalaDor !== '' && valor.escalaDor !== null ? Number(valor.escalaDor) : null,
      localizacaoDor: opt(valor.localizacaoDor),
      hipoteseDiagnostica: opt(valor.hipoteseDiagnostica),
      objetivosTratamento: valor.objetivosTratamento,
      condutaTerapeutica: opt(valor.condutaTerapeutica),
      observacoes: opt(valor.observacoes)
    };

    const avaliacaoAtual = this.avaliacao;
    const criando = avaliacaoAtual === null;
    const obs = criando
      ? this.avaliacaoService.criar({ pacienteId: this.pacienteId, ...dto })
      : this.avaliacaoService.atualizar(avaliacaoAtual.id, dto);

    obs.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        this.avaliacao = response;
        const { id, pacienteId, nomePaciente, dataCriacao, dataAtualizacao, ...formFields } = response;
        this.form.patchValue(formFields);
        if (this.successTimer !== null) {
          clearTimeout(this.successTimer);
        }
        this.sucesso = criando
          ? 'Avaliação fisioterapêutica cadastrada com sucesso.'
          : 'Avaliação fisioterapêutica atualizada com sucesso.';
        this.successTimer = setTimeout(() => { this.sucesso = null; }, 4000);
        this.salvando = false;
      },
      error: () => {
        this.erro = 'Erro ao salvar avaliação fisioterapêutica.';
        this.salvando = false;
      }
    });
  }

  campo(nome: string) {
    return this.form.get(nome);
  }
}
