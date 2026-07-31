import { Component, DestroyRef, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { forkJoin, of } from 'rxjs';
import {
  ReavaliacaoRequestDTO,
  ReavaliacaoResponseDTO,
  ReavaliacaoUpdateDTO
} from '../../../core/models/reavaliacao';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { ReavaliacaoService } from '../../../core/services/reavaliacao.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { focarPrimeiroCampo, focarPrimeiroInvalido } from '../../../shared/utils/form-focus';

@Component({
  selector: 'app-paciente-reavaliacao-form',
  imports: [ReactiveFormsModule, RouterLink, BreadcrumbComponent],
  templateUrl: './paciente-reavaliacao-form.component.html',
  styleUrl: './paciente-reavaliacao-form.component.scss'
})
export class PacienteReavaliacaoFormComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  pacienteId: number | null = null;
  reavaliacaoId: number | null = null;
  paciente: PacienteResponseDTO | null = null;
  reavaliacao: ReavaliacaoResponseDTO | null = null;
  loading = false;
  salvando = false;
  erro: string | null = null;
  sucesso: string | null = null;
  parametroInvalido = false;
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private fb: FormBuilder,
    private pacienteService: PacienteService,
    private reavaliacaoService: ReavaliacaoService,
    private route: ActivatedRoute,
    private router: Router,
    private destroyRef: DestroyRef,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      dataReavaliacao: ['', Validators.required],
      comparativoAvaliacaoAnterior: [''],
      evolucaoDor: [''],
      evolucaoForca: [''],
      evolucaoMobilidade: [''],
      evolucaoFuncional: [''],
      objetivosAlcancados: [''],
      pontosAtencao: [''],
      ajustesPlanoTratamento: [''],
      observacoesGerais: ['']
    });

    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    this.reavaliacaoId = parseRouteNumberParam(this.route.snapshot.paramMap, 'id');

    if (this.pacienteId === null || (this.route.snapshot.paramMap.has('id') && this.reavaliacaoId === null)) {
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
    return this.reavaliacaoId !== null;
  }

  carregar(): void {
    if (this.pacienteId === null) return;

    this.loading = true;
    this.erro = null;

    const paciente$ = this.pacienteService.buscar(this.pacienteId);
    const reavaliacao$ = this.reavaliacaoId !== null
      ? this.reavaliacaoService.buscar(this.reavaliacaoId)
      : of(null);

    forkJoin({ paciente: paciente$, reavaliacao: reavaliacao$ })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ paciente, reavaliacao }) => {
          this.paciente = paciente;
          if (reavaliacao) {
            if (reavaliacao.pacienteId !== this.pacienteId) {
              this.parametroInvalido = true;
              this.erro = 'Reavaliação não pertence ao paciente informado.';
              this.loading = false;
              return;
            }
            this.reavaliacao = reavaliacao;
            const { id, pacienteId, nomePaciente, dataCriacao, dataAtualizacao, ...formFields } = reavaliacao;
            this.form.patchValue({
              ...formFields,
              comparativoAvaliacaoAnterior: formFields.comparativoAvaliacaoAnterior ?? '',
              evolucaoDor: formFields.evolucaoDor ?? '',
              evolucaoForca: formFields.evolucaoForca ?? '',
              evolucaoMobilidade: formFields.evolucaoMobilidade ?? '',
              evolucaoFuncional: formFields.evolucaoFuncional ?? '',
              objetivosAlcancados: formFields.objetivosAlcancados ?? '',
              pontosAtencao: formFields.pontosAtencao ?? '',
              ajustesPlanoTratamento: formFields.ajustesPlanoTratamento ?? '',
              observacoesGerais: formFields.observacoesGerais ?? ''
            });
          } else {
            this.reavaliacao = null;
            // O formulário só existe no DOM após o *ngIf="!loading"; adia o foco.
            setTimeout(() => focarPrimeiroCampo(this.host));
          }
          this.loading = false;
        },
        error: () => {
          this.erro = 'Erro ao carregar dados da reavaliação.';
          this.parametroInvalido = true;
          this.loading = false;
        }
      });
  }

  salvar(): void {
    if (this.parametroInvalido || this.pacienteId === null) {
      this.erro = 'Identificador inválido.';
      return;
    }

    if (this.modoEdicao && this.reavaliacao === null) {
      this.erro = 'Erro ao carregar dados da reavaliação.';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      focarPrimeiroInvalido(this.form, this.host);
      return;
    }

    this.salvando = true;
    this.erro = null;
    this.sucesso = null;

    const valor = this.form.value;
    const opt = (v: string | null | undefined): string | null => (v?.trim() ? v.trim() : null);

    const baseDto = {
      dataReavaliacao: valor.dataReavaliacao,
      comparativoAvaliacaoAnterior: opt(valor.comparativoAvaliacaoAnterior),
      evolucaoDor: opt(valor.evolucaoDor),
      evolucaoForca: opt(valor.evolucaoForca),
      evolucaoMobilidade: opt(valor.evolucaoMobilidade),
      evolucaoFuncional: opt(valor.evolucaoFuncional),
      objetivosAlcancados: opt(valor.objetivosAlcancados),
      pontosAtencao: opt(valor.pontosAtencao),
      ajustesPlanoTratamento: opt(valor.ajustesPlanoTratamento),
      observacoesGerais: opt(valor.observacoesGerais)
    };

    const updateDto: ReavaliacaoUpdateDTO = { ...baseDto };
    const createDto: ReavaliacaoRequestDTO = { pacienteId: this.pacienteId, ...baseDto };

    const reavaliacaoAtual = this.reavaliacao;
    const criando = reavaliacaoAtual === null;
    const obs = criando
      ? this.reavaliacaoService.criar(createDto)
      : this.reavaliacaoService.atualizar(reavaliacaoAtual.id, updateDto);

    obs.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        if (criando) {
          this.router.navigate(['/pacientes', this.pacienteId, 'reavaliacoes']);
        } else {
          this.reavaliacao = response;
          const { id, pacienteId, nomePaciente, dataCriacao, dataAtualizacao, ...formFields } = response;
          this.form.patchValue({
            ...formFields,
            comparativoAvaliacaoAnterior: formFields.comparativoAvaliacaoAnterior ?? '',
            evolucaoDor: formFields.evolucaoDor ?? '',
            evolucaoForca: formFields.evolucaoForca ?? '',
            evolucaoMobilidade: formFields.evolucaoMobilidade ?? '',
            evolucaoFuncional: formFields.evolucaoFuncional ?? '',
            objetivosAlcancados: formFields.objetivosAlcancados ?? '',
            pontosAtencao: formFields.pontosAtencao ?? '',
            ajustesPlanoTratamento: formFields.ajustesPlanoTratamento ?? '',
            observacoesGerais: formFields.observacoesGerais ?? ''
          });
          if (this.successTimer !== null) {
            clearTimeout(this.successTimer);
          }
          this.sucesso = 'Reavaliação atualizada com sucesso.';
          this.successTimer = setTimeout(() => { this.sucesso = null; }, 4000);
          this.salvando = false;
        }
      },
      error: () => {
        this.erro = 'Erro ao salvar reavaliação.';
        this.salvando = false;
      }
    });
  }

  campo(nome: string) {
    return this.form.get(nome);
  }
}
