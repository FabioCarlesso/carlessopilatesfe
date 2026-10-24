import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-relatorio-list',
  imports: [RouterLink],
  templateUrl: './relatorio-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './relatorio-list.component.scss'
})
export class RelatorioListComponent {
  // O hub é do financeiro, mas os indicadores históricos a API só expõe para ADMIN.
  readonly authService = inject(AuthService);
}
