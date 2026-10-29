import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type VarianteCarregando = 'spinner' | 'skeleton';

// Estado de carregamento compartilhado (issue #147). Substitui a linha de texto
// `.loading` que cada tela renderizava sozinha: agora há um indicador visual
// (spinner em CSS puro ou linhas de skeleton) e o anúncio para leitor de tela
// via `role="status"` + `aria-live="polite"`. A classe `.loading` continua no
// elemento raiz para preservar o espaçamento global e os seletores dos specs.
//
// - `spinner` (padrão): roda o indicador ao lado da mensagem visível.
// - `skeleton`: desenha `linhas` barras com a altura de uma linha de tabela,
//   reservando o espaço da listagem para reduzir o salto de layout; a mensagem
//   fica só para o leitor de tela.
@Component({
  selector: 'app-carregando',
  imports: [],
  templateUrl: './carregando.component.html',
  styleUrl: './carregando.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CarregandoComponent {
  @Input() mensagem = 'Carregando...';
  @Input() variante: VarianteCarregando = 'spinner';
  @Input() linhas = 5;

  get indicesLinhas(): number[] {
    const total = Math.max(1, Math.floor(this.linhas) || 1);
    return Array.from({ length: total }, (_, i) => i);
  }
}
