import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { catchError, forkJoin, of, throwError } from 'rxjs';
import {
  EvolucaoSessaoRequestDTO,
  EvolucaoSessaoResponseDTO,
  EvolucaoSessaoUpdateDTO
} from '../../../core/models/evolucao-sessao';
import { SessaoResponseDTO, SESSAO_TIPO_LABEL } from '../../../core/models/sessao';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { EvolucaoSessaoService } from '../../../core/services/evolucao-sessao.service';
import { SessaoService } from '../../../core/services/sessao.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { focarPrimeiroCampo, focarPrimeiroInvalido } from '../../../shared/utils/form-focus';

@Component({
  selector: 'app-paciente-evolucao-sessao',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, BreadcrumbComponent],
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
    private destroyRef: DestroyRef,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      dataHoraRegistro: [this.toDateTimeLocal(new Date()), Validators.required],
      observacoesFisioterapeuta: [''],
      exerciciosRealizados: [''],
      equipamentosUtilizados: [''],
      cargasMolas: [''],
      dorAntes: [null, [Validators.min(0), Validators.max(10)]],
      dorDepois: [null, [Validators.min(0), Validators.max(10)]],
      respostaPaciente: [''],
      intercorrencias: [''],
      orientacoes: ['']
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
      sessao: this.sessaoService.buscar(this.sessaoId)
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ paciente, sessao }) => {
        if (sessao.pacienteId !== this.pacienteId) {
          this.parametroInvalido = true;
          this.erro = 'Sessão não pertence ao paciente informado.';
          this.loading = false;
          return;
        }
        this.paciente = paciente;
        this.sessao = sessao;
        this.carregarEvolucao();
      },
      error: () => {
        this.erro = 'Erro ao carregar dados da evolução.';
        this.loading = false;
      }
    });
  }

  private carregarEvolucao(): void {
    if (this.sessaoId === null) return;

    this.evolucaoSessaoService.buscarPorSessao(this.sessaoId).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return of(null);
        }
        return throwError(() => error);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: evolucao => {
        this.evolucao = evolucao;
        if (evolucao) {
          this.preencherFormulario(evolucao);
        } else {
          // O formulário só existe no DOM após o *ngIf="!loading"; adia o foco.
          setTimeout(() => focarPrimeiroCampo(this.host));
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
      focarPrimeiroInvalido(this.form, this.host);
      return;
    }

    this.salvando = true;
    this.erro = null;
    this.sucesso = null;

    const valor = this.form.value;
    const opt = (v: string | null | undefined): string | null => (v?.trim() ? v.trim() : null);
    const dor = (v: number | string | null | undefined): number | null =>
      v !== null && v !== undefined && v !== '' ? Number(v) : null;

    const dto: EvolucaoSessaoUpdateDTO = {
      dataHoraRegistro: valor.dataHoraRegistro,
      exerciciosRealizados: opt(valor.exerciciosRealizados),
      equipamentosUtilizados: opt(valor.equipamentosUtilizados),
      cargasMolas: opt(valor.cargasMolas),
      dorAntes: dor(valor.dorAntes),
      dorDepois: dor(valor.dorDepois),
      respostaPaciente: opt(valor.respostaPaciente),
      intercorrencias: opt(valor.intercorrencias),
      orientacoes: opt(valor.orientacoes),
      observacoesFisioterapeuta: opt(valor.observacoesFisioterapeuta)
    };

    const evolucaoAtual = this.evolucao;
    const criando = evolucaoAtual === null;
    const createDto: EvolucaoSessaoRequestDTO = {
      sessaoId: this.sessaoId,
      dataHoraRegistro: valor.dataHoraRegistro,
      exerciciosRealizados: dto.exerciciosRealizados,
      equipamentosUtilizados: dto.equipamentosUtilizados,
      cargasMolas: dto.cargasMolas,
      dorAntes: dto.dorAntes,
      dorDepois: dto.dorDepois,
      respostaPaciente: dto.respostaPaciente,
      intercorrencias: dto.intercorrencias,
      orientacoes: dto.orientacoes,
      observacoesFisioterapeuta: dto.observacoesFisioterapeuta
    };
    const obs = criando
      ? this.evolucaoSessaoService.criar(createDto)
      : this.evolucaoSessaoService.atualizar(evolucaoAtual.id, dto);

    obs.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        this.evolucao = response;
        this.preencherFormulario(response);
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

  private preencherFormulario(evolucao: EvolucaoSessaoResponseDTO): void {
    const { id, sessaoId, dataCriacao, dataAtualizacao, ...formFields } = evolucao;
    this.form.patchValue({
      ...formFields,
      dataHoraRegistro: this.toDateTimeLocal(formFields.dataHoraRegistro),
      exerciciosRealizados: formFields.exerciciosRealizados ?? '',
      equipamentosUtilizados: formFields.equipamentosUtilizados ?? '',
      cargasMolas: formFields.cargasMolas ?? '',
      respostaPaciente: formFields.respostaPaciente ?? '',
      intercorrencias: formFields.intercorrencias ?? '',
      orientacoes: formFields.orientacoes ?? '',
      observacoesFisioterapeuta: formFields.observacoesFisioterapeuta ?? ''
    });
  }

  private toDateTimeLocal(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const pad = (n: number): string => n.toString().padStart(2, '0');
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
