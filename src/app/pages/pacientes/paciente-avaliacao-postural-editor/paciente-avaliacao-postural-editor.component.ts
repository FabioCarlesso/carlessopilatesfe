import { NgIf } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  AvaliacaoPosturalResponseDTO,
  STATUS_AVALIACAO_POSTURAL_LABEL,
  VISTA_POSTURAL_LABEL
} from '../../../core/models/avaliacao-postural';
import { AvaliacaoPosturalService } from '../../../core/services/avaliacao-postural.service';
import { SimetrografoEditorComponent } from '../../../shared/components/simetrografo-editor/simetrografo-editor.component';
import { extrairMensagemErro } from '../../../shared/utils/api-error';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { EstadoMarcacao, montarPayloadRascunho } from '../../../shared/utils/simetrografo';

/**
 * Tela 2 do simetrógrafo virtual: carrega a análise e a foto autenticada e
 * hospeda o editor de marcação, salvando o rascunho na API.
 */
@Component({
  selector: 'app-paciente-avaliacao-postural-editor',
  imports: [NgIf, RouterLink, SimetrografoEditorComponent],
  templateUrl: './paciente-avaliacao-postural-editor.component.html',
  styleUrl: './paciente-avaliacao-postural-editor.component.scss'
})
export class PacienteAvaliacaoPosturalEditorComponent implements OnInit, OnDestroy {
  @ViewChild(SimetrografoEditorComponent) editor?: SimetrografoEditorComponent;

  pacienteId: number | null = null;
  analiseId: number | null = null;
  analise: AvaliacaoPosturalResponseDTO | null = null;
  fotoUrl: string | null = null;

  loading = false;
  salvando = false;
  parametroInvalido = false;
  erro: string | null = null;
  sucesso: string | null = null;
  alteracoesPendentes = false;

  readonly vistaLabel = VISTA_POSTURAL_LABEL;
  readonly statusLabel = STATUS_AVALIACAO_POSTURAL_LABEL;

  private estado: EstadoMarcacao = { landmarks: [], linhaPrumoX: null };
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private posturalService: AvaliacaoPosturalService,
    private route: ActivatedRoute,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    this.analiseId = parseRouteNumberParam(this.route.snapshot.paramMap, 'id');

    if (this.pacienteId === null || this.analiseId === null) {
      this.parametroInvalido = true;
      this.erro = 'Identificador inválido.';
      return;
    }

    this.carregar();
  }

  ngOnDestroy(): void {
    if (this.fotoUrl) {
      URL.revokeObjectURL(this.fotoUrl);
    }
    if (this.successTimer !== null) {
      clearTimeout(this.successTimer);
    }
  }

  get somenteLeitura(): boolean {
    return this.analise?.status === 'CONCLUIDA';
  }

  carregar(): void {
    if (this.analiseId === null) return;

    this.loading = true;
    this.erro = null;

    this.posturalService.buscarPorId(this.analiseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: analise => {
          this.analise = analise;
          this.estado = { landmarks: [...analise.landmarks], linhaPrumoX: analise.linhaPrumoX };
          this.alteracoesPendentes = false;

          if (!analise.temFoto) {
            this.erro = 'Esta análise ainda não tem foto enviada.';
            this.loading = false;
            return;
          }
          this.carregarFoto(analise.id);
        },
        error: err => {
          this.erro = extrairMensagemErro(err, 'Erro ao carregar a análise postural.');
          this.loading = false;
        }
      });
  }

  /** A foto vem como Blob autenticado — nunca por URL direta sem token. */
  private carregarFoto(id: number): void {
    this.posturalService.baixarFoto(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: blob => {
          if (this.fotoUrl) {
            URL.revokeObjectURL(this.fotoUrl);
          }
          this.fotoUrl = URL.createObjectURL(blob);
          this.loading = false;
        },
        error: err => {
          this.erro = extrairMensagemErro(err, 'Erro ao carregar a foto da análise.');
          this.loading = false;
        }
      });
  }

  onMarcacaoAlterada(estado: EstadoMarcacao): void {
    this.estado = estado;
    this.alteracoesPendentes = true;
    this.sucesso = null;
  }

  salvarRascunho(): void {
    if (this.analiseId === null || this.salvando || this.somenteLeitura) return;

    this.salvando = true;
    this.erro = null;

    const payload = montarPayloadRascunho(this.estado, this.editor?.proporcaoImagem ?? null);

    this.posturalService.atualizar(this.analiseId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: analise => {
          this.analise = analise;
          this.alteracoesPendentes = false;
          this.salvando = false;
          this.notificarSucesso('Rascunho salvo com sucesso.');
        },
        error: err => {
          this.erro = extrairMensagemErro(err, 'Erro ao salvar o rascunho da marcação.');
          this.salvando = false;
        }
      });
  }

  private notificarSucesso(mensagem: string): void {
    if (this.successTimer !== null) {
      clearTimeout(this.successTimer);
    }
    this.sucesso = mensagem;
    this.successTimer = setTimeout(() => { this.sucesso = null; }, 4000);
  }
}
