/**
 * Largura mínima do layout desktop da navbar, em pixels.
 *
 * Abaixo dela a barra colapsa num painel acionado pelo botão do menu. O valor é
 * compartilhado porque três lugares precisam concordar sobre o mesmo limite e
 * divergiriam ao primeiro ajuste se cada um trouxesse a própria cópia:
 *
 * - `AppComponent`, que fecha o menu ao voltar para o layout desktop;
 * - `MenuContaComponent`, que troca entre dropdown (desktop) e lista plana
 *   (compacto) — inclusive na semântica ARIA, que não dá para alternar por CSS;
 * - o media query `max-width: 1024px` em `styles.scss`, que é o mesmo limite
 *   escrito na forma que o CSS entende (`DESKTOP_MIN_WIDTH - 1`).
 */
export const DESKTOP_MIN_WIDTH = 1025;

/** Media query do layout compacto (tablet + mobile), espelhando `styles.scss`. */
export const MEDIA_QUERY_COMPACTO = `(max-width: ${DESKTOP_MIN_WIDTH - 1}px)`;
