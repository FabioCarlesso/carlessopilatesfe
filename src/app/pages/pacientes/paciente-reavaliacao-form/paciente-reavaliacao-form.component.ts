import { Component, DestroyRef, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { concatMap, forkJoin, map, of } from 'rxjs';
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
import { ehConflitoConcorrencia, MENSAGEM_CONFLITO_CONCORRENCIA } from '../../../shared/utils/api-error';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';
import { MapaCorporalComponent } from '../../../shared/components/mapa-corporal/mapa-corporal.component';
import { PontoDorService } from '../../../core/services/ponto-dor.service';
import { MapaDorRegistro } from '../../../shared/utils/mapa-dor-registro';
import { OpcoesAvaliacaoCamposComponent } from '../../../shared/components/opcoes-avaliacao-campos/opcoes-avaliacao-campos.component';
import { CAMPOS_OPCOES_REAVALIACAO } from '../../../core/models/opcoes-avaliacao';
import { controlesOpcoes, dtoOpcoes, valoresFormularioOpcoes } from '../../../shared/utils/opcoes-avaliacao';

/** Campos opcionais de texto: o `PUT` só os limpa recebendo `""` (ver `salvar`). */
type CampoTexto =
  | 'comparativoAvaliacaoAnterior'
  | 'evolucaoDor'
  | 'evolucaoForca'
  | 'evolucaoMobilidade'
  | 'evolucaoFuncional'
  | 'objetivosAlcancados'
  | 'pontosAtencao'
  | 'ajustesRecomendados'
  | 'observacoesGerais';

@Component({
  selector: 'app-paciente-reavaliacao-form',
  imports: [ReactiveFormsModule, RouterLink, BreadcrumbComponent, CarregandoComponent, OpcoesAvaliacaoCamposComponent, MapaCorporalComponent],
  templateUrl: './paciente-reavaliacao-form.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './paciente-reavaliacao-form.component.scss'
})
export class PacienteReavaliacaoFormComponent implements OnInit, OnDestroy {
  /**
   * Modo embutido (issue #305): o formulário vira a primeira etapa do fluxo de
   * reavaliação. Some o cabeçalho da página e os links de saída, e o cadastro não
   * navega para a listagem: o formulário passa a editar a reavaliação recém-criada.
   * O paciente continua vindo do `:pacienteId` da rota, que o fluxo também tem.
   */
  @Input() embutido = false;
  /** No modo embutido, a reavaliação a editar (no avulso ela vem do `:id` da rota); `null` cadastra uma nova. */
  @Input() reavaliacaoIdEmbutido: number | null = null;
  /** Emite a reavaliação gravada, no cadastro e na edição; o fluxo usa para avançar. */
  @Output() salvo = new EventEmitter<ReavaliacaoResponseDTO>();
  /** Achados estruturados da reavaliação (issue #306). */
  readonly camposOpcoes = CAMPOS_OPCOES_REAVALIACAO;
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
  /** Seção "Mapa de dor" (issue #307): gravada com `PUT .../pontos-dor` depois do registro. */
  mapaDor!: MapaDorRegistro;
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private fb: FormBuilder,
    private pacienteService: PacienteService,
    private reavaliacaoService: ReavaliacaoService,
    private route: ActivatedRoute,
    private router: Router,
    private destroyRef: DestroyRef,
    private host: ElementRef<HTMLElement>,
    private pontoDorService: PontoDorService
  ) {}

  ngOnInit(): void {
    this.mapaDor = new MapaDorRegistro(this.pontoDorService, 'REAVALIACAO', this.destroyRef);
    this.form = this.fb.group({
      dataReavaliacao: ['', Validators.required],
      comparativoAvaliacaoAnterior: [''],
      evolucaoDor: [''],
      evolucaoForca: [''],
      evolucaoMobilidade: [''],
      evolucaoFuncional: [''],
      objetivosAlcancados: [''],
      pontosAtencao: [''],
      ajustesRecomendados: [''],
      observacoesGerais: [''],
      ...controlesOpcoes(CAMPOS_OPCOES_REAVALIACAO)
    });

    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    this.reavaliacaoId = this.embutido
      ? this.reavaliacaoIdEmbutido
      : parseRouteNumberParam(this.route.snapshot.paramMap, 'id');
    const idRotaInvalido = !this.embutido && this.route.snapshot.paramMap.has('id') && this.reavaliacaoId === null;

    if (this.pacienteId === null || idRotaInvalido) {
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
            this.mapaDor.carregar(reavaliacao.id);
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
              ajustesRecomendados: formFields.ajustesRecomendados ?? '',
              observacoesGerais: formFields.observacoesGerais ?? '',
              ...valoresFormularioOpcoes(CAMPOS_OPCOES_REAVALIACAO, reavaliacao)
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
    // O `PUT` da API ignora `null` ("só os campos enviados são alterados"): apagar um texto já
    // salvo exige mandar `""`, senão a API devolve o valor antigo junto com o sucesso.
    const texto = (campo: CampoTexto): string | null => opt(valor[campo]) ?? (this.reavaliacao?.[campo] ? '' : null);

    const criando = this.reavaliacao === null;
    const baseDto = {
      dataReavaliacao: valor.dataReavaliacao,
      comparativoAvaliacaoAnterior: texto('comparativoAvaliacaoAnterior'),
      evolucaoDor: texto('evolucaoDor'),
      evolucaoForca: texto('evolucaoForca'),
      evolucaoMobilidade: texto('evolucaoMobilidade'),
      evolucaoFuncional: texto('evolucaoFuncional'),
      objetivosAlcancados: texto('objetivosAlcancados'),
      pontosAtencao: texto('pontosAtencao'),
      ajustesRecomendados: texto('ajustesRecomendados'),
      observacoesGerais: texto('observacoesGerais'),
      ...dtoOpcoes(CAMPOS_OPCOES_REAVALIACAO, valor, criando)
    };

    const updateDto: ReavaliacaoUpdateDTO = { ...baseDto };
    const createDto: ReavaliacaoRequestDTO = { pacienteId: this.pacienteId, ...baseDto };

    const reavaliacaoAtual = this.reavaliacao;
    const obs = reavaliacaoAtual === null
      ? this.reavaliacaoService.criar(createDto)
      : this.reavaliacaoService.atualizar(reavaliacaoAtual.id, { ...updateDto, version: reavaliacaoAtual.version });

    // Os pontos do mapa de dor só são gravados com o id do registro: no cadastro, depois do `POST`.
    obs.pipe(
      concatMap(response => this.mapaDor.gravar(response.id).pipe(map(erroMapa => ({ response, erroMapa })))),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: ({ response, erroMapa }) => {
        // Com falha no mapa, a tela fica no registro já salvo (em edição) para o mapa ser reenviado.
        if (criando && !this.embutido && !erroMapa) {
          this.router.navigate(['/pacientes', this.pacienteId, 'reavaliacoes']);
        } else {
          this.reavaliacaoId = response.id;
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
            ajustesRecomendados: formFields.ajustesRecomendados ?? '',
            observacoesGerais: formFields.observacoesGerais ?? '',
            ...valoresFormularioOpcoes(CAMPOS_OPCOES_REAVALIACAO, response)
          });
          if (this.successTimer !== null) {
            clearTimeout(this.successTimer);
          }
          this.sucesso = criando ? 'Reavaliação cadastrada com sucesso.' : 'Reavaliação atualizada com sucesso.';
          this.successTimer = setTimeout(() => { this.sucesso = null; }, 4000);
          this.salvando = false;
        }
        if (erroMapa) {
          this.sucesso = null;
          this.erro = `Reavaliação salva, mas o mapa de dor não foi gravado: ${erroMapa}`;
          return;
        }
        this.salvo.emit(response);
      },
      error: (err: unknown) => {
        this.erro = ehConflitoConcorrencia(err) ? MENSAGEM_CONFLITO_CONCORRENCIA : 'Erro ao salvar reavaliação.';
        this.salvando = false;
      }
    });
  }

  campo(nome: string) {
    return this.form.get(nome);
  }
}
