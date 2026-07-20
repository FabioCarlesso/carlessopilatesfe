import { NgIf } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, switchMap, tap } from 'rxjs';
import {
  AvaliacaoPosturalResponseDTO,
  LandmarkDTO,
  MetricasPosturaisDTO,
  STATUS_AVALIACAO_POSTURAL_LABEL,
  VISTA_POSTURAL_LABEL,
  landmarksDaVista
} from '../../../core/models/avaliacao-postural';
import { AvaliacaoPosturalService } from '../../../core/services/avaliacao-postural.service';
import { PainelMedidasPosturaisComponent } from '../../../shared/components/painel-medidas-posturais/painel-medidas-posturais.component';
import { SimetrografoEditorComponent } from '../../../shared/components/simetrografo-editor/simetrografo-editor.component';
import { extrairMensagemErro } from '../../../shared/utils/api-error';
import { calcularMetricas } from '../../../shared/utils/metricas-posturais';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { EstadoMarcacao, PRUMO_PADRAO, montarPayloadRascunho } from '../../../shared/utils/simetrografo';

/**
 * Telas 2 e 3 do simetrógrafo virtual: carrega a análise e a foto autenticada,
 * hospeda o editor de marcação e, ao lado dele, o painel de medidas calculadas,
 * as observações clínicas e as ações de salvar rascunho e concluir a análise.
 */
@Component({
  selector: 'app-paciente-avaliacao-postural-editor',
  imports: [NgIf, RouterLink, SimetrografoEditorComponent, PainelMedidasPosturaisComponent],
  templateUrl: './paciente-avaliacao-postural-editor.component.html',
  styleUrl: './paciente-avaliacao-postural-editor.component.scss'
})
export class PacienteAvaliacaoPosturalEditorComponent implements OnInit, OnDestroy {
  pacienteId: number | null = null;
  analiseId: number | null = null;
  analise: AvaliacaoPosturalResponseDTO | null = null;
  fotoUrl: string | null = null;

  /**
   * Marcação com que o editor é inicializado. Fixada na carga e nunca
   * reatribuída a partir da resposta do salvamento: realimentar o editor
   * descartaria, sem aviso, os pontos marcados enquanto o `PUT` estava em voo.
   */
  landmarksIniciais: LandmarkDTO[] = [];
  prumoInicial: number | null = null;

  /** Texto do campo de observações clínicas, salvo junto com a marcação. */
  observacoes = '';

  loading = false;
  salvando = false;
  concluindo = false;
  parametroInvalido = false;
  erro: string | null = null;
  sucesso: string | null = null;
  alteracoesPendentes = false;

  readonly vistaLabel = VISTA_POSTURAL_LABEL;
  readonly statusLabel = STATUS_AVALIACAO_POSTURAL_LABEL;

  private estado: EstadoMarcacao = { landmarks: [], linhaPrumoX: null };
  private proporcaoImagem: number | null = null;
  /** Conta as edições recebidas do editor, para detectar alterações feitas durante o `PUT`. */
  private revisao = 0;
  private revisaoEnviada = 0;
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

  /** Pontos atualmente marcados no editor — base das medidas e das linhas. */
  get landmarksAtuais(): readonly LandmarkDTO[] {
    return this.estado.landmarks;
  }

  /**
   * Medidas exibidas no painel. Enquanto houver alterações não salvas, mostra a
   * prévia local para dar retorno imediato à marcação; salvo, prevalecem as
   * métricas devolvidas pela API, que são a fonte da verdade.
   */
  get metricasExibidas(): MetricasPosturaisDTO | null {
    if (this.alteracoesPendentes) {
      return this.metricasLocais();
    }
    return this.analise?.metricas ?? this.metricasLocais();
  }

  get exibindoPrevia(): boolean {
    return this.alteracoesPendentes || !this.analise?.metricas;
  }

  /** A API só conclui com todos os pontos obrigatórios da vista marcados. */
  get pontosCompletos(): boolean {
    if (!this.analise) return false;

    const marcados = new Set(this.estado.landmarks.map(l => l.codigo));
    return landmarksDaVista(this.analise.vista).every(def => marcados.has(def.codigo));
  }

  get podeConcluir(): boolean {
    return (
      !this.somenteLeitura &&
      !this.salvando &&
      !this.concluindo &&
      this.fotoUrl !== null &&
      this.pontosCompletos
    );
  }

  private metricasLocais(): MetricasPosturaisDTO | null {
    if (!this.analise) return null;

    return calcularMetricas(
      this.analise.vista,
      this.estado.landmarks,
      this.estado.linhaPrumoX,
      this.proporcaoImagem ?? this.analise.proporcaoImagem,
      this.analise.calibracaoCmPorUnidade
    );
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
          this.landmarksIniciais = [...analise.landmarks];
          this.prumoInicial = analise.linhaPrumoX;
          this.observacoes = analise.observacoes ?? '';
          // O prumo exibido cai no padrão quando a análise não tem um salvo; o
          // estado precisa refletir isso, senão salvar sem tocar na linha
          // gravaria `null` enquanto a tela mostra a linha centralizada.
          this.estado = {
            landmarks: [...analise.landmarks],
            linhaPrumoX: analise.linhaPrumoX ?? PRUMO_PADRAO
          };
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
    this.revisao++;
    this.alteracoesPendentes = true;
    this.sucesso = null;
  }

  onImagemMedida(proporcao: number): void {
    this.proporcaoImagem = proporcao;
  }

  onObservacoesAlteradas(event: Event): void {
    this.observacoes = (event.target as HTMLTextAreaElement).value;
    this.revisao++;
    this.alteracoesPendentes = true;
    this.sucesso = null;
  }

  salvarRascunho(): void {
    if (this.analiseId === null || this.salvando || this.concluindo || this.somenteLeitura) return;

    this.salvando = true;
    this.erro = null;

    this.persistir().subscribe({
      next: analise => {
        this.aplicarResposta(analise);
        this.salvando = false;
        this.notificarSucesso('Rascunho salvo com sucesso.');
      },
      error: err => {
        this.erro = extrairMensagemErro(err, 'Erro ao salvar o rascunho da marcação.');
        this.salvando = false;
      }
    });
  }

  /**
   * Conclui a análise: grava o estado atual e só então fecha, para que o
   * prontuário registre exatamente a marcação que está na tela. A API valida os
   * pontos obrigatórios e responde `422` quando falta algum ou não há foto.
   */
  concluir(): void {
    if (this.analiseId === null || !this.podeConcluir) return;

    const id = this.analiseId;
    this.concluindo = true;
    this.erro = null;

    this.persistir()
      .pipe(
        tap(analise => this.aplicarResposta(analise)),
        switchMap(() => this.posturalService.concluir(id)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: analise => {
          this.analise = analise;
          this.observacoes = analise.observacoes ?? '';
          this.alteracoesPendentes = false;
          this.concluindo = false;
          this.notificarSucesso('Análise concluída e gravada no prontuário.');
        },
        error: err => {
          this.erro = extrairMensagemErro(err, 'Erro ao concluir a análise postural.');
          this.concluindo = false;
        }
      });
  }

  /** `PUT` da marcação atual, com a revisão registrada para detectar edições em voo. */
  private persistir(): Observable<AvaliacaoPosturalResponseDTO> {
    const payload = montarPayloadRascunho(this.estado, this.proporcaoImagem, this.observacoes);
    this.revisaoEnviada = this.revisao;

    return this.posturalService.atualizar(this.analiseId!, payload)
      .pipe(takeUntilDestroyed(this.destroyRef));
  }

  private aplicarResposta(analise: AvaliacaoPosturalResponseDTO): void {
    this.analise = analise;
    // Marcações feitas enquanto o PUT estava em voo continuam pendentes.
    this.alteracoesPendentes = this.revisao !== this.revisaoEnviada;
  }

  private notificarSucesso(mensagem: string): void {
    if (this.successTimer !== null) {
      clearTimeout(this.successTimer);
    }
    this.sucesso = mensagem;
    this.successTimer = setTimeout(() => { this.sucesso = null; }, 4000);
  }
}
