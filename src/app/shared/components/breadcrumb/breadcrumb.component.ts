import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

// Um nível da trilha de navegação. O último item da lista representa a página
// atual e é renderizado sem link, com `aria-current="page"`; os demais níveis são
// navegáveis quando trazem `link`.
export interface BreadcrumbItem {
  label: string;
  link?: string | unknown[];
}

// Trilha de navegação (breadcrumb) compartilhada pelas rotas aninhadas do
// prontuário (issue #145). Recebe os níveis já montados pela tela — a partir da
// rota e do nome do paciente já carregado por `GET /api/pacientes/{id}` — e
// concentra a marcação acessível (`nav aria-label="breadcrumb"`, `aria-current`)
// e os separadores num único ponto, evitando que cada tela duplique esse markup.
@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BreadcrumbComponent {
  @Input() items: BreadcrumbItem[] = [];
}
