import { NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import {
  SessaoRequestDTO,
  SessaoResponseDTO,
  SESSAO_STATUS_LABEL,
  SESSAO_TIPO_LABEL,
  SessaoStatus,
  SessaoTipo,
  SessaoUpdateDTO
} from '../../../core/models/sessao';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { SessaoService } from '../../../core/services/sessao.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';

@Component({
  selector: 'app-paciente-sessao-form',
  imports: [NgIf, NgFor, ReactiveFormsModule, RouterLink],
  templateUrl: './paciente-sessao-form.component.html',
  styleUrl: './paciente-sessao-form.component.scss'
})
export class PacienteSessaoFormComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  pacienteId: number | null = null;
  sessaoId: number | null = null;
  paciente: PacienteResponseDTO | null = null;
  sessao: SessaoResponseDTO | null = null;
  loading = false;
  salvando = false;
  erro: string | null = null;
  sucesso: string | null = null;
  parametroInvalido = false;
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  readonly tipos: SessaoTipo[] = ['PILATES', 'FISIOTERAPIA'];
  readonly statuses: SessaoStatus[] = ['AGENDADA', 'REALIZADA', 'CANCELADA'];
  readonly tipoLabel = SESSAO_TIPO_LABEL;
  readonly statusLabel = SESSAO_STATUS_LABEL;

  constructor(
    private fb: FormBuilder,
    private pacienteService: PacienteService,
    private sessaoService: SessaoService,
    private route: ActivatedRoute,
    private router: Router,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      dataHora: ['', Validators.required],
      tipo: ['PILATES', Validators.required],
      duracao: [null, [Validators.required, Validators.min(1), Validators.max(480)]],
      profissionalId: [null],
      observacoes: [''],
      status: ['AGENDADA', Validators.required]
    });

    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    this.sessaoId = parseRouteNumberParam(this.route.snapshot.paramMap, 'id');

    if (this.pacienteId === null || (this.route.snapshot.paramMap.has('id') && this.sessaoId === null)) {
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
    return this.sessaoId !== null;
  }

  carregar(): void {
    if (this.pacienteId === null) return;

    this.loading = true;
    this.erro = null;

    const paciente$ = this.pacienteService.buscar(this.pacienteId);
    const sessao$ = this.sessaoId !== null
      ? this.sessaoService.buscar(this.sessaoId)
      : of(null);

    forkJoin({ paciente: paciente$, sessao: sessao$ })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ paciente, sessao }) => {
          this.paciente = paciente;
          if (sessao) {
            if (sessao.pacienteId !== this.pacienteId) {
              this.parametroInvalido = true;
              this.erro = 'Sessão não pertence ao paciente informado.';
              this.loading = false;
              return;
            }
            this.sessao = sessao;
            const { id, pacienteId, nomePaciente, nomeProfissional, dataCriacao, dataAtualizacao, ...formFields } = sessao;
            this.form.patchValue({
              ...formFields,
              profissionalId: formFields.profissionalId ?? null,
              observacoes: formFields.observacoes ?? ''
            });
          } else {
            this.sessao = null;
          }
          this.loading = false;
        },
        error: () => {
          this.erro = 'Erro ao carregar dados da sessão.';
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
    const profissionalId = valor.profissionalId ? Number(valor.profissionalId) : null;

    const baseDto = {
      dataHora: valor.dataHora,
      tipo: valor.tipo as SessaoTipo,
      duracao: Number(valor.duracao),
      profissionalId,
      observacoes: opt(valor.observacoes)
    };

    const updateDto: SessaoUpdateDTO = {
      ...baseDto,
      status: valor.status as SessaoStatus
    };

    const createDto: SessaoRequestDTO = {
      pacienteId: this.pacienteId,
      ...baseDto
    };

    const sessaoAtual = this.sessao;
    const criando = sessaoAtual === null;
    const obs = criando
      ? this.sessaoService.criar(createDto)
      : this.sessaoService.atualizar(sessaoAtual.id, updateDto);

    obs.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        if (criando) {
          this.router.navigate(['/pacientes', this.pacienteId, 'sessoes']);
        } else {
          this.sessao = response;
          const { id, pacienteId, nomePaciente, nomeProfissional, dataCriacao, dataAtualizacao, ...formFields } = response;
          this.form.patchValue({
            ...formFields,
            profissionalId: formFields.profissionalId ?? null,
            observacoes: formFields.observacoes ?? ''
          });
          if (this.successTimer !== null) {
            clearTimeout(this.successTimer);
          }
          this.sucesso = 'Sessão atualizada com sucesso.';
          this.successTimer = setTimeout(() => { this.sucesso = null; }, 4000);
          this.salvando = false;
        }
      },
      error: () => {
        this.erro = 'Erro ao salvar sessão.';
        this.salvando = false;
      }
    });
  }

  campo(nome: string) {
    return this.form.get(nome);
  }
}
