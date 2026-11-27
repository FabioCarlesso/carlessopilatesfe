import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
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
import { ehConflitoConcorrencia, MENSAGEM_CONFLITO_CONCORRENCIA } from '../../../shared/utils/api-error';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';
import { EvolucaoCamposComponent } from '../../../shared/components/evolucao-campos/evolucao-campos.component';
import {
  camposDoFormularioEvolucao,
  criarFormularioEvolucao,
  preencherFormularioEvolucao
} from '../../../shared/utils/evolucao-form';

@Component({
  selector: 'app-paciente-evolucao-sessao',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, BreadcrumbComponent, CarregandoComponent, EvolucaoCamposComponent],
  templateUrl: './paciente-evolucao-sessao.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
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
    this.form = criarFormularioEvolucao(this.fb);

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

    const campos = camposDoFormularioEvolucao(this.form);

    const evolucaoAtual = this.evolucao;
    const criando = evolucaoAtual === null;
    const createDto: EvolucaoSessaoRequestDTO = { ...campos, sessaoId: this.sessaoId };
    const obs = criando
      ? this.evolucaoSessaoService.criar(createDto)
      : this.evolucaoSessaoService.atualizar(evolucaoAtual.id, { ...campos, version: evolucaoAtual.version } satisfies EvolucaoSessaoUpdateDTO);

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
      error: (err: unknown) => {
        this.erro = ehConflitoConcorrencia(err) ? MENSAGEM_CONFLITO_CONCORRENCIA : 'Erro ao salvar evolução.';
        this.salvando = false;
      }
    });
  }

  private preencherFormulario(evolucao: EvolucaoSessaoResponseDTO): void {
    preencherFormularioEvolucao(this.form, evolucao);
  }
}
