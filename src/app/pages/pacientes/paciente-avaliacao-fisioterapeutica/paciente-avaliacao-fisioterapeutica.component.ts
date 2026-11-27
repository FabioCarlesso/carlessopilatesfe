import { Component, DestroyRef, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { concatMap, forkJoin, map } from 'rxjs';
import { AvaliacaoFisioterapeuticaResponseDTO } from '../../../core/models/avaliacao-fisioterapeutica';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { AvaliacaoFisioterapeuticaService } from '../../../core/services/avaliacao-fisioterapeutica.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { focarPrimeiroCampo, focarPrimeiroInvalido } from '../../../shared/utils/form-focus';
import { ehConflitoConcorrencia, MENSAGEM_CONFLITO_CONCORRENCIA } from '../../../shared/utils/api-error';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';
import { MapaCorporalComponent } from '../../../shared/components/mapa-corporal/mapa-corporal.component';
import { PontoDorService } from '../../../core/services/ponto-dor.service';
import { MapaDorRegistro } from '../../../shared/utils/mapa-dor-registro';
import { OpcoesAvaliacaoCamposComponent } from '../../../shared/components/opcoes-avaliacao-campos/opcoes-avaliacao-campos.component';
import { CAMPOS_OPCOES_EXAME_FISICO } from '../../../core/models/opcoes-avaliacao';
import { controlesOpcoes, dtoOpcoes, valoresFormularioOpcoes } from '../../../shared/utils/opcoes-avaliacao';

@Component({
  selector: 'app-paciente-avaliacao-fisioterapeutica',
  imports: [ReactiveFormsModule, RouterLink, BreadcrumbComponent, CarregandoComponent, OpcoesAvaliacaoCamposComponent, MapaCorporalComponent],
  templateUrl: './paciente-avaliacao-fisioterapeutica.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './paciente-avaliacao-fisioterapeutica.component.scss'
})
export class PacienteAvaliacaoFisioterapeuticaComponent implements OnInit, OnDestroy {
  /**
   * Modo embutido (issue #305): o formulário vira a etapa 2 do fluxo de avaliação.
   * Some o cabeçalho da página e os links de saída; o paciente continua vindo do
   * `:pacienteId` da rota, que o fluxo também tem.
   */
  @Input() embutido = false;
  /** Emite o registro gravado, no cadastro e na edição; o fluxo usa para avançar. */
  @Output() salvo = new EventEmitter<AvaliacaoFisioterapeuticaResponseDTO>();
  /** Achados estruturados do exame físico (issue #306). */
  readonly camposOpcoes = CAMPOS_OPCOES_EXAME_FISICO;
  form!: FormGroup;
  pacienteId: number | null = null;
  paciente: PacienteResponseDTO | null = null;
  avaliacao: AvaliacaoFisioterapeuticaResponseDTO | null = null;
  loading = false;
  salvando = false;
  erro: string | null = null;
  sucesso: string | null = null;
  parametroInvalido = false;
  /** Seção "Mapa de dor" (issue #307): gravada com `PUT .../pontos-dor` depois do registro. */
  mapaDor!: MapaDorRegistro;
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private fb: FormBuilder,
    private pacienteService: PacienteService,
    private avaliacaoService: AvaliacaoFisioterapeuticaService,
    private route: ActivatedRoute,
    private destroyRef: DestroyRef,
    private host: ElementRef<HTMLElement>,
    private pontoDorService: PontoDorService
  ) {}

  ngOnInit(): void {
    this.mapaDor = new MapaDorRegistro(this.pontoDorService, 'AVALIACAO', this.destroyRef);
    this.form = this.fb.group({
      dataAvaliacao: ['', Validators.required],
      queixaFuncional: ['', [Validators.required, Validators.pattern(/\S/)]],
      avaliacaoPostural: [''],
      mobilidadeArticular: [''],
      forcaMuscular: [''],
      flexibilidade: [''],
      equilibrio: [''],
      coordenacaoMotora: [''],
      padraoRespiratorio: [''],
      escalaDor: [null, [Validators.required, Validators.min(0), Validators.max(10)]],
      testesFuncionaisRealizados: [''],
      diagnosticoFisioterapeutico: ['', [Validators.required, Validators.pattern(/\S/)]],
      observacoesGerais: [''],
      ...controlesOpcoes(CAMPOS_OPCOES_EXAME_FISICO)
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
      avaliacoes: this.avaliacaoService.listarPorPaciente(this.pacienteId)
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ paciente, avaliacoes }) => {
        this.paciente = paciente;
        this.avaliacao = avaliacoes[0] ?? null;
        if (this.avaliacao) {
          const { id, pacienteId, nomePaciente, dataCriacao, dataAtualizacao, ...formFields } = this.avaliacao;
          this.form.patchValue({ ...formFields, ...valoresFormularioOpcoes(CAMPOS_OPCOES_EXAME_FISICO, this.avaliacao) });
          this.mapaDor.carregar(this.avaliacao.id);
        } else {
          // O formulário só existe no DOM após o *ngIf="!loading"; adia o foco.
          setTimeout(() => focarPrimeiroCampo(this.host));
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
      focarPrimeiroInvalido(this.form, this.host);
      return;
    }

    this.salvando = true;
    this.erro = null;
    this.sucesso = null;

    const valor = this.form.value;
    const avaliacaoAtual = this.avaliacao;
    const criando = avaliacaoAtual === null;
    const opt = (v: string | null | undefined): string | null => (v?.trim() ? v.trim() : null);
    const dto = {
      dataAvaliacao: valor.dataAvaliacao,
      queixaFuncional: valor.queixaFuncional,
      avaliacaoPostural: opt(valor.avaliacaoPostural),
      mobilidadeArticular: opt(valor.mobilidadeArticular),
      forcaMuscular: opt(valor.forcaMuscular),
      flexibilidade: opt(valor.flexibilidade),
      equilibrio: opt(valor.equilibrio),
      coordenacaoMotora: opt(valor.coordenacaoMotora),
      padraoRespiratorio: opt(valor.padraoRespiratorio),
      escalaDor: Number(valor.escalaDor),
      testesFuncionaisRealizados: opt(valor.testesFuncionaisRealizados),
      diagnosticoFisioterapeutico: valor.diagnosticoFisioterapeutico,
      observacoesGerais: opt(valor.observacoesGerais),
      ...dtoOpcoes(CAMPOS_OPCOES_EXAME_FISICO, valor, criando)
    };

    const obs = criando
      ? this.avaliacaoService.criar({ pacienteId: this.pacienteId, ...dto })
      : this.avaliacaoService.atualizar(avaliacaoAtual.id, { ...dto, version: avaliacaoAtual.version });

    // Os pontos do mapa de dor só são gravados com o id do registro: no cadastro, depois do `POST`.
    obs.pipe(
      concatMap(response => this.mapaDor.gravar(response.id).pipe(map(erroMapa => ({ response, erroMapa })))),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: ({ response, erroMapa }) => {
        this.avaliacao = response;
        const { id, pacienteId, nomePaciente, dataCriacao, dataAtualizacao, ...formFields } = response;
        this.form.patchValue({ ...formFields, ...valoresFormularioOpcoes(CAMPOS_OPCOES_EXAME_FISICO, response) });
        if (erroMapa) {
          // O registro foi salvo e a tela já o edita; sem avisar o fluxo, para o mapa poder ser reenviado.
          this.erro = `Avaliação fisioterapêutica salva, mas o mapa de dor não foi gravado: ${erroMapa}`;
          this.salvando = false;
          return;
        }
        if (this.successTimer !== null) {
          clearTimeout(this.successTimer);
        }
        this.sucesso = criando
          ? 'Avaliação fisioterapêutica cadastrada com sucesso.'
          : 'Avaliação fisioterapêutica atualizada com sucesso.';
        this.successTimer = setTimeout(() => { this.sucesso = null; }, 4000);
        this.salvando = false;
        this.salvo.emit(response);
      },
      error: (err: unknown) => {
        this.erro = ehConflitoConcorrencia(err) ? MENSAGEM_CONFLITO_CONCORRENCIA : 'Erro ao salvar avaliação fisioterapêutica.';
        this.salvando = false;
      }
    });
  }

  campo(nome: string) {
    return this.form.get(nome);
  }
}
