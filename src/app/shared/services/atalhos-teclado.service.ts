import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import {
  ATALHOS,
  AtalhoTeclado,
  TEMPO_SEQUENCIA_MS,
  atalhosPermitidos,
  ehTeclaModificadora,
  resolverSequencia,
  tokenDaTecla
} from '../utils/atalhos-teclado';

/**
 * Ponto único dos atalhos de teclado da aplicação. Escuta o `keydown` do
 * documento e:
 *
 * - não intercepta digitação: com o foco em input, textarea, select ou
 *   elemento editável só vale o que é marcado `funcionaEmCampo` (`Ctrl+K`);
 * - ignora combinações com modificadores não previstos (`tokenDaTecla`);
 * - fica inativo sem sessão e com qualquer diálogo modal aberto, para não
 *   navegar por trás de uma confirmação;
 * - só oferece o atalho cuja rota o perfil abre (`atalhosPermitidos`).
 *
 * Instanciado pelo `AppComponent`; o foco da busca é pedido pelo serviço e
 * executado pelo `BuscaGlobalComponent`, dono do campo.
 */
@Injectable({ providedIn: 'root' })
export class AtalhosTecladoService {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  private readonly focoBuscaSubject = new Subject<void>();
  /** Emite quando um atalho pede o foco no campo de busca global. */
  readonly focoBusca$: Observable<void> = this.focoBuscaSubject.asObservable();

  private readonly ajudaAbertaSignal = signal(false);
  readonly ajudaAberta = this.ajudaAbertaSignal.asReadonly();

  private sequencia: string[] = [];
  private temporizador: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const ouvinte = (evento: KeyboardEvent) => this.aoTeclar(evento);
    this.document.addEventListener('keydown', ouvinte);
    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('keydown', ouvinte);
      this.limparSequencia();
    });
  }

  /** Atalhos liberados para o perfil atual, na ordem do catálogo. */
  atalhosDisponiveis(): AtalhoTeclado[] {
    return atalhosPermitidos(ATALHOS, papeis => this.authService.hasAnyRole(papeis));
  }

  abrirAjuda(): void {
    this.ajudaAbertaSignal.set(true);
  }

  fecharAjuda(): void {
    this.ajudaAbertaSignal.set(false);
  }

  private aoTeclar(evento: KeyboardEvent): void {
    // Tecla já tratada por um componente (o Esc da busca, por exemplo), repetição
    // de tecla segurada e composição de IME nunca disparam atalho.
    if (evento.defaultPrevented || evento.repeat || evento.isComposing) return;
    if (ehTeclaModificadora(evento)) return;

    if (!this.authService.isAuthenticated() || this.ajudaAberta() || this.haDialogoAberto()) {
      this.limparSequencia();
      return;
    }

    const token = tokenDaTecla(evento);
    if (!token) {
      this.limparSequencia();
      return;
    }

    const emCampo = this.focoEmCampoDeTexto(evento);
    const disponiveis = this.atalhosDisponiveis().filter(atalho => !emCampo || atalho.funcionaEmCampo);

    let resultado = resolverSequencia([...this.sequencia, token], disponiveis);
    if (resultado.tipo === 'nenhum' && this.sequencia.length > 0) {
      // A tecla que quebrou a sequência pode iniciar outra: `g g p` vai para pacientes.
      this.limparSequencia();
      resultado = resolverSequencia([token], disponiveis);
    }

    if (resultado.tipo === 'nenhum') {
      this.limparSequencia();
      return;
    }

    evento.preventDefault();

    if (resultado.tipo === 'parcial') {
      this.sequencia = [...this.sequencia, token];
      this.reiniciarTemporizador();
      return;
    }

    this.limparSequencia();
    this.executar(resultado.atalho);
  }

  private executar(atalho: AtalhoTeclado): void {
    switch (atalho.acao.tipo) {
      case 'navegar':
        void this.router.navigateByUrl(atalho.acao.rota);
        return;
      case 'buscar':
        this.focoBuscaSubject.next();
        return;
      case 'ajuda':
        this.abrirAjuda();
        return;
    }
  }

  private reiniciarTemporizador(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.limparSequencia(), TEMPO_SEQUENCIA_MS);
  }

  private limparSequencia(): void {
    this.sequencia = [];
    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
  }

  private haDialogoAberto(): boolean {
    return this.document.querySelector('[aria-modal="true"]') !== null;
  }

  // Confere o alvo do evento e o elemento focado: um keydown sintético disparado
  // no documento tem o próprio documento como alvo, mas o foco pode estar num campo.
  private focoEmCampoDeTexto(evento: KeyboardEvent): boolean {
    return this.ehCampoDeTexto(evento.target) || this.ehCampoDeTexto(this.document.activeElement);
  }

  private ehCampoDeTexto(elemento: EventTarget | null): boolean {
    if (!(elemento instanceof HTMLElement)) return false;
    return (
      elemento instanceof HTMLInputElement ||
      elemento instanceof HTMLTextAreaElement ||
      elemento instanceof HTMLSelectElement ||
      elemento.isContentEditable
    );
  }
}
