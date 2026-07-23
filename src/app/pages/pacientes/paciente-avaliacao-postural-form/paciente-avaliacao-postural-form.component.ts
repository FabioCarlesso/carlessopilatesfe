import { NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { forkJoin } from 'rxjs';
import { VISTA_POSTURAL_OPTIONS, VistaPostural } from '../../../core/models/avaliacao-postural';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { AvaliacaoFisioterapeuticaService } from '../../../core/services/avaliacao-fisioterapeutica.service';
import { AvaliacaoPosturalService } from '../../../core/services/avaliacao-postural.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { extrairMensagemErro } from '../../../shared/utils/api-error';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { focarPrimeiroInvalido } from '../../../shared/utils/form-focus';
import { ImageCompressorService } from '../../../shared/services/image-compressor.service';

@Component({
  selector: 'app-paciente-avaliacao-postural-form',
  imports: [NgIf, NgFor, ReactiveFormsModule, RouterLink, BreadcrumbComponent],
  templateUrl: './paciente-avaliacao-postural-form.component.html',
  styleUrl: './paciente-avaliacao-postural-form.component.scss'
})
export class PacienteAvaliacaoPosturalFormComponent implements OnInit, OnDestroy {
  readonly vistaOptions = VISTA_POSTURAL_OPTIONS;

  form!: FormGroup;
  pacienteId: number | null = null;
  paciente: PacienteResponseDTO | null = null;
  avaliacaoFisioterapeuticaId: number | null = null;
  vistasIndisponiveis = new Set<VistaPostural>();

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
    private imageCompressorService: ImageCompressorService,
    private route: ActivatedRoute,
    private router: Router,
    private destroyRef: DestroyRef,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      vista: [null, Validators.required]
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
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
    }
  }

  carregar(): void {
    if (this.pacienteId === null) return;

    this.loading = true;
    this.erro = null;

    forkJoin({
      paciente: this.pacienteService.buscar(this.pacienteId),
      avaliacoes: this.avaliacaoFisioterapeuticaService.listarPorPaciente(this.pacienteId)
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ paciente, avaliacoes }) => {
        this.paciente = paciente;
        this.avaliacaoFisioterapeuticaId = avaliacoes[0]?.id ?? null;
        if (this.avaliacaoFisioterapeuticaId === null) {
          this.loading = false;
          return;
        }
        this.carregarAnalisesExistentes(this.avaliacaoFisioterapeuticaId);
      },
      error: () => {
        this.erro = 'Erro ao carregar dados do paciente.';
        this.loading = false;
      }
    });
  }

  private carregarAnalisesExistentes(avaliacaoFisioterapeuticaId: number): void {
    this.posturalService.listarPorAvaliacaoFisioterapeutica(avaliacaoFisioterapeuticaId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: analises => {
          this.vistasIndisponiveis = new Set(analises.map(a => a.vista));
          this.loading = false;
        },
        error: () => {
          this.erro = 'Erro ao carregar análises posturais existentes.';
          this.loading = false;
        }
      });
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
    if (this.parametroInvalido || this.avaliacaoFisioterapeuticaId === null) return;

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
      this.posturalService.criar({ avaliacaoFisioterapeuticaId: this.avaliacaoFisioterapeuticaId, vista })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: analise => {
            this.analiseCriadaId = analise.id;
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
