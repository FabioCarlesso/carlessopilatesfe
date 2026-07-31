import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-relatorio-list',
  imports: [RouterLink],
  templateUrl: './relatorio-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './relatorio-list.component.scss'
})
export class RelatorioListComponent {}
