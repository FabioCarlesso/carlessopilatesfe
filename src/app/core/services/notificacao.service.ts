import { Injectable, signal } from '@angular/core';

export type NotificacaoTipo = 'erro';

export interface Notificacao {
  tipo: NotificacaoTipo;
  mensagem: string;
}

/**
 * Canal de mensagens globais exibidas fora do contexto de uma tela específica
 * (ex.: acesso negado retornado pela API durante uma ação pontual).
 */
@Injectable({
  providedIn: 'root'
})
export class NotificacaoService {
  private readonly notificacaoAtual = signal<Notificacao | null>(null);

  readonly notificacao = this.notificacaoAtual.asReadonly();

  erro(mensagem: string): void {
    this.notificacaoAtual.set({ tipo: 'erro', mensagem });
  }

  limpar(): void {
    this.notificacaoAtual.set(null);
  }
}
