import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type VarianteEmptyState = 'vazio' | 'filtrado';

// Estado vazio compartilhado das listagens (issue #146). Substitui a frase solta
// `<div class="empty-state">` que cada tela escrevia sozinha e passa a distinguir
// os dois casos:
//
// - `vazio` (padrão): não há registros. A tela projeta o CTA de criação
//   (ex.: "+ Novo Paciente") quando a ação existe e o perfil pode executá-la.
// - `filtrado`: o filtro aplicado não retornou nada. A tela projeta o botão
//   "Limpar filtros", que limpa e recarrega.
//
// As ações entram por content projection, então cada página continua dona da
// rota, do `(click)` e da regra de papel do botão. O ícone é decorativo
// (`aria-hidden`); a mensagem e o texto ficam num `role="status"` para o leitor
// de tela anunciar o vazio, e as ações ficam fora dele (região viva com controle
// interativo dentro é desaconselhada). `anunciar=false` desliga o status quando
// a tela já tem uma região viva própria descrevendo o mesmo resultado.
// A classe `.empty-state` continua no elemento raiz para os seletores dos specs.
@Component({
  selector: 'app-empty-state',
  imports: [],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateComponent {
  @Input({ required: true }) mensagem = '';
  /** Explicação opcional abaixo da mensagem (ex.: como as aulas são geradas). */
  @Input() texto: string | null = null;
  @Input() variante: VarianteEmptyState = 'vazio';
  @Input() anunciar = true;
}
