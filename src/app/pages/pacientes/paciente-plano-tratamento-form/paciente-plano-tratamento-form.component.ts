import { Component, DestroyRef, ElementRef, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { forkJoin, of } from 'rxjs';
import {
  PlanoTratamentoRequestDTO,
  PlanoTratamentoResponseDTO
} from '../../../core/models/plano-tratamento';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { PlanoTratamentoService } from '../../../core/services/plano-tratamento.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { focarPrimeiroCampo, focarPrimeiroInvalido } from '../../../shared/utils/form-focus';
import { ehConflitoConcorrencia, MENSAGEM_CONFLITO_CONCORRENCIA } from '../../../shared/utils/api-error';

@Component({
  selector: 'app-paciente-plano-tratamento-form',
  imports: [ReactiveFormsModule, RouterLink, BreadcrumbComponent],
  templateUrl: './paciente-plano-tratamento-form.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
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

  constructor(
    private fb: FormBuilder,
    private pacienteService: PacienteService,
    private planoTratamentoService: PlanoTratamentoService,
    private route: ActivatedRoute,
    private router: Router,
    private destroyRef: DestroyRef,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      dataInicio: ['', Validators.required],
      dataFimPrevista: [''],
      objetivosTratamento: ['', [Validators.required, Validators.pattern(/\S/)]],
      intervencoesPlanejadas: [''],
      numeroSessoesPrevistas: [null, [Validators.min(1), Validators.pattern(/^\d+$/)]],
      frequenciaSessoes: [''],
      responsavelTratamento: [''],
      observacoes: ['']
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
            this.preencherFormulario(plano);
          } else {
            this.plano = null;
            // O formulário só existe no DOM após o *ngIf="!loading"; adia o foco.
            setTimeout(() => focarPrimeiroCampo(this.host));
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
      focarPrimeiroInvalido(this.form, this.host);
      return;
    }

    this.salvando = true;
    this.erro = null;
    this.sucesso = null;

    const valor = this.form.value;
    const opt = (v: string | null | undefined): string | null => (v?.trim() ? v.trim() : null);
    const sessoes = valor.numeroSessoesPrevistas;
    const baseDto: Omit<PlanoTratamentoRequestDTO, 'pacienteId'> = {
      dataInicio: valor.dataInicio,
      dataFimPrevista: opt(valor.dataFimPrevista),
      objetivosTratamento: valor.objetivosTratamento,
      intervencoesPlanejadas: opt(valor.intervencoesPlanejadas),
      numeroSessoesPrevistas: sessoes === null || sessoes === '' ? null : Number(sessoes),
      frequenciaSessoes: opt(valor.frequenciaSessoes),
      responsavelTratamento: opt(valor.responsavelTratamento),
      observacoes: opt(valor.observacoes)
    };
    const createDto: PlanoTratamentoRequestDTO = {
      pacienteId: this.pacienteId,
      ...baseDto
    };

    const planoAtual = this.plano;
    const criando = planoAtual === null;
    const obs = criando
      ? this.planoTratamentoService.criar(createDto)
      : this.planoTratamentoService.atualizar(planoAtual.id, { ...baseDto, version: planoAtual.version });

    obs.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        if (criando) {
          this.router.navigate(['/pacientes', this.pacienteId, 'plano-tratamento']);
        } else {
          this.plano = response;
          this.preencherFormulario(response);
          if (this.successTimer !== null) {
            clearTimeout(this.successTimer);
          }
          this.sucesso = 'Plano de tratamento atualizado com sucesso.';
          this.successTimer = setTimeout(() => { this.sucesso = null; }, 4000);
          this.salvando = false;
        }
      },
      error: (err: unknown) => {
        this.erro = ehConflitoConcorrencia(err) ? MENSAGEM_CONFLITO_CONCORRENCIA : 'Erro ao salvar plano de tratamento.';
        this.salvando = false;
      }
    });
  }

  private preencherFormulario(plano: PlanoTratamentoResponseDTO): void {
    this.form.patchValue({
      dataInicio: plano.dataInicio,
      dataFimPrevista: plano.dataFimPrevista ?? '',
      objetivosTratamento: plano.objetivosTratamento,
      intervencoesPlanejadas: plano.intervencoesPlanejadas ?? '',
      numeroSessoesPrevistas: plano.numeroSessoesPrevistas,
      frequenciaSessoes: plano.frequenciaSessoes ?? '',
      responsavelTratamento: plano.responsavelTratamento ?? '',
      observacoes: plano.observacoes ?? ''
    });
  }

  campo(nome: string) {
    return this.form.get(nome);
  }
}
