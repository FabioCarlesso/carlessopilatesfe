import { DatePipe, NgIf } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of, throwError } from 'rxjs';
import { EvolucaoSessaoResponseDTO } from '../../../core/models/evolucao-sessao';
import { SessaoResponseDTO, SESSAO_TIPO_LABEL } from '../../../core/models/sessao';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { EvolucaoSessaoService } from '../../../core/services/evolucao-sessao.service';
import { SessaoService } from '../../../core/services/sessao.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';

@Component({
  selector: 'app-paciente-evolucao-sessao',
  imports: [NgIf, DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './paciente-evolucao-sessao.component.html',
  styleUrl: './paciente-evolucao-sessao.component.scss'
})
export class PacienteEvolucaoSessaoComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  pacienteId: number | null = null;
  sessaoId: number | null = null;
  paciente: PacienteResponseDTO | null = null;
  sessao: SessaoResponseDTO | null = null;
  evolucao: EvolucaoSessaoResponseDTO | null = null;
  loading = false;
  salvando = false;
  erro: string | null = null;
  sucesso: string | null = null;
  parametroInvalido = false;
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  readonly tipoLabel = SESSAO_TIPO_LABEL;

  constructor(
    private fb: FormBuilder,
    private pacienteService: PacienteService,
    private sessaoService: SessaoService,
    private evolucaoSessaoService: EvolucaoSessaoService,
    private route: ActivatedRoute,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      subjetivo: ['', [Validators.required, Validators.pattern(/\S/)]],
      objetivo: ['', [Validators.required, Validators.pattern(/\S/)]],
      avaliacao: ['', [Validators.required, Validators.pattern(/\S/)]],
      plano: ['', [Validators.required, Validators.pattern(/\S/)]],
      exerciciosRealizados: [''],
      escalaDor: [null, [Validators.min(0), Validators.max(10)]],
      observacoes: ['']
    });

    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    this.sessaoId = parseRouteNumberParam(this.route.snapshot.paramMap, 'sessaoId');

    if (this.pacienteId === null || this.sessaoId === null) {
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
    if (this.pacienteId === null || this.sessaoId === null) return;

    this.loading = true;
    this.erro = null;

    forkJoin({
      paciente: this.pacienteService.buscar(this.pacienteId),
      sessao: this.sessaoService.buscar(this.sessaoId),
      evolucao: this.evolucaoSessaoService.buscarPorSessao(this.sessaoId).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404) {
            return of(null);
          }
          return throwError(() => error);
        })
      )
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ paciente, sessao, evolucao }) => {
        if (sessao.pacienteId !== this.pacienteId) {
          this.parametroInvalido = true;
          this.erro = 'Sessão não pertence ao paciente informado.';
          this.loading = false;
          return;
        }
        this.paciente = paciente;
        this.sessao = sessao;
        this.evolucao = evolucao;
        if (evolucao) {
          const { id, sessaoId, pacienteId, nomePaciente, dataCriacao, dataAtualizacao, ...formFields } = evolucao;
          this.form.patchValue({
            ...formFields,
            exerciciosRealizados: formFields.exerciciosRealizados ?? '',
            observacoes: formFields.observacoes ?? ''
          });
        }
        this.loading = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar dados da evolução.';
        this.loading = false;
      }
    });
  }

  salvar(): void {
    if (this.parametroInvalido || this.pacienteId === null || this.sessaoId === null) {
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
    const opt = (v: string | null | undefined): string | null => (v?.trim() ? v.trim() : null);
    const escalaDor = valor.escalaDor !== null && valor.escalaDor !== '' ? Number(valor.escalaDor) : null;

    const dto = {
      subjetivo: valor.subjetivo,
      objetivo: valor.objetivo,
      avaliacao: valor.avaliacao,
      plano: valor.plano,
      exerciciosRealizados: opt(valor.exerciciosRealizados),
      escalaDor,
      observacoes: opt(valor.observacoes)
    };

    const evolucaoAtual = this.evolucao;
    const criando = evolucaoAtual === null;
    const obs = criando
      ? this.evolucaoSessaoService.criar({ sessaoId: this.sessaoId, ...dto })
      : this.evolucaoSessaoService.atualizar(evolucaoAtual.id, dto);

    obs.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        this.evolucao = response;
        const { id, sessaoId, pacienteId, nomePaciente, dataCriacao, dataAtualizacao, ...formFields } = response;
        this.form.patchValue({
          ...formFields,
          exerciciosRealizados: formFields.exerciciosRealizados ?? '',
          observacoes: formFields.observacoes ?? ''
        });
        if (this.successTimer !== null) {
          clearTimeout(this.successTimer);
        }
        this.sucesso = criando ? 'Evolução cadastrada com sucesso.' : 'Evolução atualizada com sucesso.';
        this.successTimer = setTimeout(() => { this.sucesso = null; }, 4000);
        this.salvando = false;
      },
      error: () => {
        this.erro = 'Erro ao salvar evolução.';
        this.salvando = false;
      }
    });
  }

  campo(nome: string) {
    return this.form.get(nome);
  }
}
