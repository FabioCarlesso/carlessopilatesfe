import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor } from '@angular/common';

// Bloco compartilhado de resumo de paginação (issue #144). Concentra o "Exibindo X-Y de Z"
// e o seletor de itens por página que a listagem de pacientes já exibia inline, para que
// profissionais e usuários apresentem os mesmos metadados (`page.*`) sem duplicar markup.
// O componente é puramente de apresentação: calcula o intervalo a partir de currentPage,
// pageSize e totalElements e emite o novo tamanho; o reset para a página 0 e o recarregamento
// ficam a cargo do componente pai, que detém o estado da listagem.
@Component({
  selector: 'app-pagination-summary',
  imports: [NgFor],
  templateUrl: './pagination-summary.component.html',
  styleUrl: './pagination-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaginationSummaryComponent {
  @Input() currentPage = 0;
  @Input() pageSize = 10;
  @Input() totalElements = 0;
  // Rótulo do tipo de registro exibido após o total (ex.: "pacientes", "profissionais").
  @Input() itemLabel = 'registros';
  @Input() pageSizeOptions: readonly number[] = [5, 10, 20, 50];

  @Output() pageSizeChange = new EventEmitter<number>();

  pageStart(): number {
    if (this.totalElements === 0) return 0;
    return this.currentPage * this.pageSize + 1;
  }

  pageEnd(): number {
    if (this.totalElements === 0) return 0;
    return Math.min((this.currentPage + 1) * this.pageSize, this.totalElements);
  }

  aoAlterarTamanho(valor: string): void {
    this.pageSizeChange.emit(Number(valor));
  }
}
