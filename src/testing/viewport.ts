/**
 * Renderiza um elemento já criado dentro de um iframe de largura fixa, para que
 * os media queries sejam avaliados contra essa largura e não contra a janela do
 * Karma (que é sempre larga, deixando as regras mobile sem teste efetivo).
 *
 * As folhas de estilo do documento são serializadas para dentro do iframe: as
 * globais chegam ao Karma por `<link>` (`styles.css`) e as de componente por
 * `<style>` injetado pelo Angular, então copiar nós não bastaria — o `<link>`
 * carregaria de forma assíncrona e o teste leria estilos ainda não aplicados.
 * Lendo `cssRules` (mesma origem) tudo entra de uma vez e a cascata se mantém,
 * inclusive os atributos `[_ngcontent-*]` do encapsulamento.
 *
 * O elemento é *movido* para o iframe; `destruir()` o devolve ao documento
 * original antes de remover o iframe, para que a fixture continue utilizável e
 * o `ComponentFixture.destroy()` do Angular não encontre um nó órfão.
 */
export interface ViewportRenderizado {
  /** Janela do iframe: use `janela.getComputedStyle(...)` nas asserções. */
  janela: Window;
  destruir(): void;
}

export function renderizarEmViewport(elemento: HTMLElement, largura: number): ViewportRenderizado {
  const paiOriginal = elemento.parentNode;
  const irmaoOriginal = elemento.nextSibling;

  const iframe = document.createElement('iframe');
  iframe.style.width = `${largura}px`;
  iframe.style.height = '900px';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const documentoIframe = iframe.contentDocument as Document;
  const estilo = documentoIframe.createElement('style');
  estilo.textContent = Array.from(document.styleSheets)
    .map(folha => Array.from(folha.cssRules).map(regra => regra.cssText).join('\n'))
    .join('\n');
  documentoIframe.head.appendChild(estilo);
  documentoIframe.body.appendChild(documentoIframe.adoptNode(elemento));

  return {
    janela: iframe.contentWindow as Window,
    destruir: () => {
      document.adoptNode(elemento);
      if (paiOriginal) {
        paiOriginal.insertBefore(elemento, irmaoOriginal);
      }
      iframe.remove();
    }
  };
}
