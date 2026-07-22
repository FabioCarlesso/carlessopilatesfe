import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Ordenacao } from '../../../core/models/ordenacao';

// Cabeçalho de coluna clicável para as listagens paginadas (issue #151). Aplicado
// como atributo em um `<th>` (`th[app-sortable]`), projeta o rótulo original da
// coluna via `<ng-content>` e adiciona um botão acessível que alterna a ordenação.
// É puramente de apresentação: recebe o estado atual (`ordenacao`) e emite o campo
// clicado em `ordenar`; o cálculo do próximo estado, o reset de página e o
// recarregamento ficam a cargo do componente pai, que detém o estado da listagem.
@Component({
  selector: 'th[app-sortable]',
  templateUrl: './sortable-header.component.html',
  styleUrl: './sortable-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'scope': 'col',
    '[attr.aria-sort]': 'ariaSort'
  }
})
export class SortableHeaderComponent {
  // Nome do campo enviado no parâmetro `sort` (ex.: 'email', 'tipoContrato').
  @Input() campo!: string;
  // Ordenação ativa da listagem; a coluna se destaca quando `ordenacao.campo === campo`.
  @Input() ordenacao!: Ordenacao;

  @Output() ordenar = new EventEmitter<string>();

  get ativo(): boolean {
    return this.ordenacao?.campo === this.campo;
  }

  get ariaSort(): 'ascending' | 'descending' | 'none' {
    if (!this.ativo) return 'none';
    return this.ordenacao.direcao === 'asc' ? 'ascending' : 'descending';
  }

  // '▲'/'▼' quando a coluna está ativa; '⇅' neutro sinaliza que a coluna é ordenável.
  get seta(): string {
    if (!this.ativo) return '⇅';
    return this.ordenacao.direcao === 'asc' ? '▲' : '▼';
  }

  aoClicar(): void {
    this.ordenar.emit(this.campo);
  }
}
