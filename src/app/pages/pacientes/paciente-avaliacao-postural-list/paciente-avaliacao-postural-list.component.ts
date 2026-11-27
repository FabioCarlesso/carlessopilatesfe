import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { FormsModule } from '@angular/forms';
import { Observable, catchError, forkJoin, of } from 'rxjs';
import {
  AvaliacaoPosturalResponseDTO,
  STATUS_AVALIACAO_POSTURAL_LABEL,
  VISTA_POSTURAL_LABEL
} from '../../../core/models/avaliacao-postural';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { AvaliacaoFisioterapeuticaService } from '../../../core/services/avaliacao-fisioterapeutica.service';
import { AvaliacaoPosturalService } from '../../../core/services/avaliacao-postural.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { ReavaliacaoService } from '../../../core/services/reavaliacao.service';
import {
  CHAVE_SEM_VINCULO,
  OpcaoVinculoPostural,
  ROTULO_SEM_VINCULO,
  chaveDaAnalise,
  montarOpcoesVinculo,
  rotuloDoVinculo,
  vinculoDaChave
} from '../../../shared/utils/vinculo-postural';
import { extrairMensagemErro } from '../../../shared/utils/api-error';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { ConfirmarDialogComponent } from '../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-paciente-avaliacao-postural-list',
  imports: [RouterLink, DatePipe, FormsModule, ConfirmarDialogComponent, BreadcrumbComponent, CarregandoComponent, EmptyStateComponent],
  templateUrl: './paciente-avaliacao-postural-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './paciente-avaliacao-postural-list.component.scss'
})
export class PacienteAvaliacaoPosturalListComponent implements OnInit, OnDestroy {
  pacienteId: number | null = null;
  paciente: PacienteResponseDTO | null = null;
  analises: AvaliacaoPosturalResponseDTO[] = [];
  loading = false;
  erro: string | null = null;
  sucesso: string | null = null;
  parametroInvalido = false;
  fotoAbertaId: number | null = null;
  carregandoFotoId: number | null = null;
  confirmarCancelarId: number | null = null;
  acaoEmAndamentoId: number | null = null;
  /** Avaliações e reavaliações do paciente: rotulam o vínculo na lista e alimentam o seletor do diálogo. */
  opcoesVinculo: OpcaoVinculoPostural[] = [];
  opcoesVinculoIncompletas = false;
  analiseEmVinculo: AvaliacaoPosturalResponseDTO | null = null;
  vinculoSelecionado = CHAVE_SEM_VINCULO;
  vinculoErro: string | null = null;
  salvandoVinculo = false;
  private readonly fotoUrls = new Map<number, string>();
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  readonly vistaLabel = VISTA_POSTURAL_LABEL;
  readonly statusLabel = STATUS_AVALIACAO_POSTURAL_LABEL;
  readonly chaveSemVinculo = CHAVE_SEM_VINCULO;
  readonly rotuloSemVinculo = ROTULO_SEM_VINCULO;

  constructor(
    private pacienteService: PacienteService,
    private avaliacaoFisioterapeuticaService: AvaliacaoFisioterapeuticaService,
    private posturalService: AvaliacaoPosturalService,
    private reavaliacaoService: ReavaliacaoService,
    private route: ActivatedRoute,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    if (this.pacienteId === null) {
      this.parametroInvalido = true;
      this.erro = 'Identificador inválido.';
      return;
    }
    this.carregar();
  }

  ngOnDestroy(): void {
    this.fotoUrls.forEach(url => URL.revokeObjectURL(url));
    if (this.successTimer !== null) {
      clearTimeout(this.successTimer);
    }
  }

  carregar(): void {
    if (this.pacienteId === null) return;

    this.loading = true;
    this.erro = null;

    // Avaliações e reavaliações só rotulam o vínculo: se falharem, a lista de análises
    // continua de pé e o vínculo aparece sem a data.
    forkJoin({
      paciente: this.pacienteService.buscar(this.pacienteId),
      analises: this.posturalService.listarPorPaciente(this.pacienteId),
      avaliacoes: this.opcional(this.avaliacaoFisioterapeuticaService.listarPorPaciente(this.pacienteId)),
      reavaliacoes: this.opcional(this.reavaliacaoService.listarPorPaciente(this.pacienteId))
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ paciente, analises, avaliacoes, reavaliacoes }) => {
        this.paciente = paciente;
        this.analises = analises;
        this.opcoesVinculo = montarOpcoesVinculo(avaliacoes ?? [], reavaliacoes ?? []);
        this.opcoesVinculoIncompletas = avaliacoes === null || reavaliacoes === null;
        this.loading = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar as análises posturais do paciente.';
        this.loading = false;
      }
    });
  }

  private opcional<T>(fonte: Observable<T[]>): Observable<T[] | null> {
    return fonte.pipe(catchError(() => of(null)));
  }

  rotuloVinculo(analise: AvaliacaoPosturalResponseDTO): string {
    return rotuloDoVinculo(analise, this.opcoesVinculo);
  }

  ehSolta(analise: AvaliacaoPosturalResponseDTO): boolean {
    return chaveDaAnalise(analise) === CHAVE_SEM_VINCULO;
  }

  abrirVinculo(analise: AvaliacaoPosturalResponseDTO): void {
    if (this.acaoEmAndamentoId !== null) return;
    this.analiseEmVinculo = analise;
    this.vinculoSelecionado = chaveDaAnalise(analise);
    this.vinculoErro = null;
  }

  fecharVinculo(): void {
    if (this.salvandoVinculo) return;
    this.analiseEmVinculo = null;
    this.vinculoErro = null;
  }

  vinculoInalterado(): boolean {
    return this.analiseEmVinculo === null || this.vinculoSelecionado === chaveDaAnalise(this.analiseEmVinculo);
  }

  /**
   * A API aceita no máximo uma análise ativa por vista em cada avaliação ou reavaliação
   * (a solta fica de fora da regra); a opção que já tem outra análise da mesma vista
   * aparece desabilitada, e o `409` da API continua tratado se a lista estiver defasada.
   */
  vistaOcupadaNoVinculo(chave: string): boolean {
    const analise = this.analiseEmVinculo;
    if (analise === null || chave === CHAVE_SEM_VINCULO) return false;
    return this.analises.some(a => a.id !== analise.id && a.vista === analise.vista && chaveDaAnalise(a) === chave);
  }

  salvarVinculo(): void {
    const analise = this.analiseEmVinculo;
    if (analise === null || this.salvandoVinculo || this.vinculoInalterado()) return;

    const removendo = this.vinculoSelecionado === CHAVE_SEM_VINCULO;
    this.salvandoVinculo = true;
    this.vinculoErro = null;

    this.posturalService.atualizarVinculo(analise.id, vinculoDaChave(this.vinculoSelecionado))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: atualizada => {
          this.analises = this.analises.map(a => (a.id === atualizada.id ? atualizada : a));
          this.salvandoVinculo = false;
          this.analiseEmVinculo = null;
          this.mostrarSucesso(removendo ? 'Vínculo removido: a análise ficou solta.' : 'Vínculo da análise atualizado.');
        },
        error: err => {
          this.vinculoErro = extrairMensagemErro(err, 'Erro ao atualizar o vínculo da análise.');
          this.salvandoVinculo = false;
        }
      });
  }

  private mostrarSucesso(mensagem: string): void {
    if (this.successTimer !== null) {
      clearTimeout(this.successTimer);
    }
    this.sucesso = mensagem;
    this.successTimer = setTimeout(() => { this.sucesso = null; }, 4000);
  }

  alternarFoto(analise: AvaliacaoPosturalResponseDTO): void {
    if (this.fotoAbertaId === analise.id) {
      this.fotoAbertaId = null;
      return;
    }

    this.fotoAbertaId = analise.id;
    if (this.fotoUrls.has(analise.id) || !analise.temFoto) return;

    this.carregandoFotoId = analise.id;
    this.posturalService.baixarFoto(analise.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: blob => {
          this.fotoUrls.set(analise.id, URL.createObjectURL(blob));
          this.carregandoFotoId = null;
        },
        error: err => {
          this.erro = extrairMensagemErro(err, 'Erro ao carregar a foto da análise.');
          this.carregandoFotoId = null;
          this.fotoAbertaId = null;
        }
      });
  }

  fotoUrl(id: number): string | null {
    return this.fotoUrls.get(id) ?? null;
  }

  /** Libera o object URL de uma análise que saiu da lista, sem esperar o `ngOnDestroy`. */
  private descartarFoto(id: number): void {
    const url = this.fotoUrls.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      this.fotoUrls.delete(id);
    }
    if (this.fotoAbertaId === id) {
      this.fotoAbertaId = null;
    }
  }

  confirmarCancelar(id: number): void {
    if (this.acaoEmAndamentoId !== null || this.salvandoVinculo) return;
    this.confirmarCancelarId = id;
  }

  fecharConfirmacaoCancelar(): void {
    this.confirmarCancelarId = null;
  }

  vistaEmConfirmacao(): string {
    const analise = this.analises.find(a => a.id === this.confirmarCancelarId);
    return analise ? this.vistaLabel[analise.vista] : '';
  }

  executarCancelamento(): void {
    if (this.confirmarCancelarId === null || this.acaoEmAndamentoId !== null) return;

    const id = this.confirmarCancelarId;
    this.fecharConfirmacaoCancelar();
    this.acaoEmAndamentoId = id;
    this.erro = null;

    this.posturalService.cancelar(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.analises = this.analises.filter(a => a.id !== id);
          this.descartarFoto(id);
          this.acaoEmAndamentoId = null;
          this.mostrarSucesso('Análise cancelada com sucesso.');
        },
        error: err => {
          this.erro = extrairMensagemErro(err, 'Erro ao cancelar a análise.');
          this.acaoEmAndamentoId = null;
        }
      });
  }
}
