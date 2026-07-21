import { NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { forkJoin, of } from 'rxjs';
import {
  PlanoTratamentoRequestDTO,
  PlanoTratamentoResponseDTO,
  PLANO_TRATAMENTO_STATUS_LABEL,
  PlanoTratamentoStatus,
  PlanoTratamentoUpdateDTO
} from '../../../core/models/plano-tratamento';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { PlanoTratamentoService } from '../../../core/services/plano-tratamento.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';

@Component({
  selector: 'app-paciente-plano-tratamento-form',
  imports: [NgIf, NgFor, ReactiveFormsModule, RouterLink, BreadcrumbComponent],
  templateUrl: './paciente-plano-tratamento-form.component.html',
  styleUrl: './paciente-plano-tratamento-form.component.scss'
})
export class PacientePlanoTratamentoFormComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  pacienteId: number | null = null;
  planoId: number | null = null;
  paciente: PacienteResponseDTO | null = null;
  plano: PlanoTratamentoResponseDTO | null = null;
  loading = false;
  salvando = false;
  erro: string | null = null;
  sucesso: string | null = null;
  parametroInvalido = false;
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  readonly statuses: PlanoTratamentoStatus[] = ['ATIVO', 'ENCERRADO', 'SUSPENSO'];
  readonly statusLabel = PLANO_TRATAMENTO_STATUS_LABEL;

  constructor(
    private fb: FormBuilder,
    private pacienteService: PacienteService,
    private planoTratamentoService: PlanoTratamentoService,
    private route: ActivatedRoute,
    private router: Router,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      dataInicio: ['', Validators.required],
      dataPrevisaoTermino: [''],
      objetivosTerapeuticos: ['', [Validators.required, Validators.pattern(/\S/)]],
      frequenciaSemanal: [null, [Validators.required, Validators.min(1), Validators.max(7)]],
      condutasPropostas: ['', [Validators.required, Validators.pattern(/\S/)]],
      exerciciosIndicados: ['', [Validators.required, Validators.pattern(/\S/)]],
      exerciciosContraindicados: [''],
      equipamentosPrevistos: [''],
      observacoesClinicas: [''],
      status: ['ATIVO', Validators.required]
    });

    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    this.planoId = parseRouteNumberParam(this.route.snapshot.paramMap, 'id');

    if (this.pacienteId === null || (this.route.snapshot.paramMap.has('id') && this.planoId === null)) {
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

  get modoEdicao(): boolean {
    return this.planoId !== null;
  }

  carregar(): void {
    if (this.pacienteId === null) return;

    this.loading = true;
    this.erro = null;

    const paciente$ = this.pacienteService.buscar(this.pacienteId);
    const plano$ = this.planoId !== null
      ? this.planoTratamentoService.buscar(this.planoId)
      : of(null);

    forkJoin({ paciente: paciente$, plano: plano$ })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ paciente, plano }) => {
          this.paciente = paciente;
          if (plano) {
            if (plano.pacienteId !== this.pacienteId) {
              this.parametroInvalido = true;
              this.erro = 'Plano de tratamento não pertence ao paciente informado.';
              this.loading = false;
              return;
            }
            this.plano = plano;
            const { id, pacienteId, nomePaciente, dataCriacao, dataAtualizacao, ...formFields } = plano;
            this.form.patchValue({
              ...formFields,
              dataPrevisaoTermino: formFields.dataPrevisaoTermino ?? ''
            });
          } else {
            this.plano = null;
          }
          this.loading = false;
        },
        error: () => {
          this.erro = 'Erro ao carregar dados do plano de tratamento.';
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
    const opt = (v: string | null | undefined): string | null => (v?.trim() ? v.trim() : null);
    const baseDto = {
      dataInicio: valor.dataInicio,
      dataPrevisaoTermino: opt(valor.dataPrevisaoTermino),
      objetivosTerapeuticos: valor.objetivosTerapeuticos,
      frequenciaSemanal: Number(valor.frequenciaSemanal),
      condutasPropostas: valor.condutasPropostas,
      exerciciosIndicados: valor.exerciciosIndicados,
      exerciciosContraindicados: opt(valor.exerciciosContraindicados),
      equipamentosPrevistos: opt(valor.equipamentosPrevistos),
      observacoesClinicas: opt(valor.observacoesClinicas)
    };
    const updateDto: PlanoTratamentoUpdateDTO = {
      ...baseDto,
      status: valor.status as PlanoTratamentoStatus
    };
    const createDto: PlanoTratamentoRequestDTO = {
      pacienteId: this.pacienteId,
      ...baseDto
    };

    const planoAtual = this.plano;
    const criando = planoAtual === null;
    const obs = criando
      ? this.planoTratamentoService.criar(createDto)
      : this.planoTratamentoService.atualizar(planoAtual.id, updateDto);

    obs.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        if (criando) {
          this.router.navigate(['/pacientes', this.pacienteId, 'plano-tratamento']);
        } else {
          this.plano = response;
          const { id, pacienteId, nomePaciente, dataCriacao, dataAtualizacao, ...formFields } = response;
          this.form.patchValue({
            ...formFields,
            dataPrevisaoTermino: formFields.dataPrevisaoTermino ?? ''
          });
          if (this.successTimer !== null) {
            clearTimeout(this.successTimer);
          }
          this.sucesso = 'Plano de tratamento atualizado com sucesso.';
          this.successTimer = setTimeout(() => { this.sucesso = null; }, 4000);
          this.salvando = false;
        }
      },
      error: () => {
        this.erro = 'Erro ao salvar plano de tratamento.';
        this.salvando = false;
      }
    });
  }

  campo(nome: string) {
    return this.form.get(nome);
  }
}
