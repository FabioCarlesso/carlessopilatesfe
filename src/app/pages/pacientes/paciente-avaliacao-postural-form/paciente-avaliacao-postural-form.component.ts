import { Component, DestroyRef, ElementRef, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { Observable, catchError, forkJoin, of } from 'rxjs';
import {
  AvaliacaoPosturalResponseDTO,
  VISTA_POSTURAL_OPTIONS,
  VistaPostural
} from '../../../core/models/avaliacao-postural';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { AvaliacaoFisioterapeuticaService } from '../../../core/services/avaliacao-fisioterapeutica.service';
import { AvaliacaoPosturalService } from '../../../core/services/avaliacao-postural.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { ReavaliacaoService } from '../../../core/services/reavaliacao.service';
import {
  CHAVE_SEM_VINCULO,
  OpcaoVinculoPostural,
  TipoVinculoPostural,
  chaveDaAnalise,
  chaveDoVinculo,
  montarOpcoesVinculo,
  rotuloDoVinculo,
  vinculoDaChave
} from '../../../shared/utils/vinculo-postural';
import { extrairMensagemErro } from '../../../shared/utils/api-error';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { focarPrimeiroInvalido } from '../../../shared/utils/form-focus';
import { ImageCompressorService } from '../../../shared/services/image-compressor.service';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';

@Component({
  selector: 'app-paciente-avaliacao-postural-form',
  imports: [ReactiveFormsModule, RouterLink, BreadcrumbComponent, CarregandoComponent],
  templateUrl: './paciente-avaliacao-postural-form.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './paciente-avaliacao-postural-form.component.scss'
})
export class PacienteAvaliacaoPosturalFormComponent implements OnInit, OnDestroy {
  readonly vistaOptions = VISTA_POSTURAL_OPTIONS;
  readonly chaveSemVinculo = CHAVE_SEM_VINCULO;

  form!: FormGroup;
  pacienteId: number | null = null;
  paciente: PacienteResponseDTO | null = null;
  /** Avaliações e reavaliações do paciente que podem receber a análise; a solta é a opção padrão. */
  opcoesVinculo: OpcaoVinculoPostural[] = [];
  opcoesVinculoIncompletas = false;
  vistasIndisponiveis = new Set<VistaPostural>();
  private analisesDoPaciente: AvaliacaoPosturalResponseDTO[] = [];

  loading = false;
  parametroInvalido = false;
  comprimindo = false;
  enviando = false;
  erro: string | null = null;

  arquivoComprimido: File | null = null;
  previewUrl: string | null = null;
  tamanhoComprimidoKb: number | null = null;
  analiseCriadaId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private pacienteService: PacienteService,
    private avaliacaoFisioterapeuticaService: AvaliacaoFisioterapeuticaService,
    private posturalService: AvaliacaoPosturalService,
    private reavaliacaoService: ReavaliacaoService,
    private imageCompressorService: ImageCompressorService,
    private route: ActivatedRoute,
    private router: Router,
    private destroyRef: DestroyRef,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      vinculo: [CHAVE_SEM_VINCULO],
      vista: [null, Validators.required]
    });
    this.form.get('vinculo')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.atualizarVistasIndisponiveis());

    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    if (this.pacienteId === null) {
      this.parametroInvalido = true;
      this.erro = 'Identificador inválido.';
      return;
    }

    this.carregar();
  }

  ngOnDestroy(): void {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
  }

  carregar(): void {
    if (this.pacienteId === null) return;

    this.loading = true;
    this.erro = null;

    // Sem avaliação nem reavaliação a análise sai solta; uma falha nessas listas só
    // empobrece o seletor de vínculo, sem impedir a análise.
    forkJoin({
      paciente: this.pacienteService.buscar(this.pacienteId),
      analises: this.posturalService.listarPorPaciente(this.pacienteId),
      avaliacoes: this.opcional(this.avaliacaoFisioterapeuticaService.listarPorPaciente(this.pacienteId)),
      reavaliacoes: this.opcional(this.reavaliacaoService.listarPorPaciente(this.pacienteId))
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ paciente, analises, avaliacoes, reavaliacoes }) => {
        this.paciente = paciente;
        this.analisesDoPaciente = analises;
        this.opcoesVinculo = montarOpcoesVinculo(avaliacoes ?? [], reavaliacoes ?? []);
        this.opcoesVinculoIncompletas = avaliacoes === null || reavaliacoes === null;
        this.preSelecionarVinculo();
        this.atualizarVistasIndisponiveis();
        this.loading = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar dados do paciente.';
        this.loading = false;
      }
    });
  }

  private opcional<T>(fonte: Observable<T[]>): Observable<T[] | null> {
    return fonte.pipe(catchError(() => of(null)));
  }

  /**
   * `?avaliacaoFisioterapeuticaId=` ou `?reavaliacaoId=` pré-selecionam o vínculo — é
   * assim que o fluxo da avaliação abre a análise postural já ligada a ela. Um id que não
   * é do paciente é ignorado; se as listas falharam, o vínculo entra com o rótulo genérico
   * e a API, que confere o paciente, decide.
   */
  private preSelecionarVinculo(): void {
    const query = this.route.snapshot.queryParamMap;
    const candidatos: [TipoVinculoPostural, string][] = [
      ['avaliacao', 'avaliacaoFisioterapeuticaId'],
      ['reavaliacao', 'reavaliacaoId']
    ];
    for (const [tipo, parametro] of candidatos) {
      const id = parseRouteNumberParam(query, parametro);
      if (id === null) continue;

      const chave = chaveDoVinculo(tipo, id);
      if (!this.opcoesVinculo.some(o => o.chave === chave)) {
        if (!this.opcoesVinculoIncompletas) continue;
        const vinculo = vinculoDaChave(chave);
        this.opcoesVinculo = [
          { chave, tipo, id, data: '', label: rotuloDoVinculo(vinculo, []) },
          ...this.opcoesVinculo
        ];
      }
      this.form.patchValue({ vinculo: chave }, { emitEvent: false });
      return;
    }
  }

  /** A API aceita uma análise ativa por vista em cada avaliação/reavaliação; a solta não tem esse limite. */
  private atualizarVistasIndisponiveis(): void {
    const chave = this.form.getRawValue().vinculo as string;
    this.vistasIndisponiveis = chave === CHAVE_SEM_VINCULO
      ? new Set()
      : new Set(this.analisesDoPaciente.filter(a => chaveDaAnalise(a) === chave).map(a => a.vista));

    const vista = this.form.value.vista as VistaPostural | null;
    if (vista !== null && this.vistasIndisponiveis.has(vista)) {
      this.form.patchValue({ vista: null });
    }
  }

  vistaIndisponivel(vista: VistaPostural): boolean {
    return this.vistasIndisponiveis.has(vista);
  }

  selecionarVista(vista: VistaPostural): void {
    if (this.vistaIndisponivel(vista) || this.analiseCriadaId !== null) return;
    this.form.patchValue({ vista });
  }

  campo(nome: string) {
    return this.form.get(nome);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent): Promise<void> | undefined {
    event.preventDefault();
    const arquivo = event.dataTransfer?.files?.[0];
    return arquivo ? this.processarArquivo(arquivo) : undefined;
  }

  onArquivoSelecionado(event: Event): Promise<void> | undefined {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    const promessa = arquivo ? this.processarArquivo(arquivo) : undefined;
    input.value = '';
    return promessa;
  }

  processarArquivo(arquivo: File): Promise<void> {
    if (!arquivo.type.startsWith('image/')) {
      this.erro = 'Selecione um arquivo de imagem.';
      return Promise.resolve();
    }

    this.comprimindo = true;
    this.erro = null;

    return this.imageCompressorService.comprimir(arquivo)
      .then(comprimido => {
        this.definirArquivo(comprimido);
        this.comprimindo = false;
      })
      .catch(() => {
        this.erro = 'Não foi possível processar a foto selecionada.';
        this.comprimindo = false;
      });
  }

  private definirArquivo(arquivo: File): void {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
    this.arquivoComprimido = arquivo;
    this.previewUrl = URL.createObjectURL(arquivo);
    this.tamanhoComprimidoKb = Math.round(arquivo.size / 1024);
  }

  removerFoto(): void {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
    this.arquivoComprimido = null;
    this.previewUrl = null;
    this.tamanhoComprimidoKb = null;
  }

  continuar(): void {
    if (this.parametroInvalido || this.pacienteId === null) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      focarPrimeiroInvalido(this.form, this.host);
      return;
    }

    if (!this.arquivoComprimido) {
      this.erro = 'Selecione ou tire uma foto antes de continuar.';
      return;
    }

    this.enviando = true;
    this.erro = null;

    if (this.analiseCriadaId === null) {
      const vista = this.form.value.vista as VistaPostural;
      const vinculo = vinculoDaChave(this.form.getRawValue().vinculo as string);
      this.posturalService.criar({ pacienteId: this.pacienteId, ...vinculo, vista })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: analise => {
            this.analiseCriadaId = analise.id;
            this.form.get('vinculo')!.disable({ emitEvent: false });
            this.enviarFoto();
          },
          error: err => {
            this.erro = extrairMensagemErro(err, 'Erro ao criar a análise postural.');
            this.enviando = false;
          }
        });
    } else {
      this.enviarFoto();
    }
  }

  private enviarFoto(): void {
    this.posturalService.enviarFoto(this.analiseCriadaId!, this.arquivoComprimido!)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.enviando = false;
          this.router.navigate(['/pacientes', this.pacienteId, 'avaliacao-fisioterapeutica', 'postural']);
        },
        error: err => {
          this.erro = extrairMensagemErro(err, 'Análise criada, mas houve um erro ao enviar a foto. Tente novamente.');
          this.enviando = false;
        }
      });
  }
}
