import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StylePreferencesService } from '../../../core/services/style-preferences.service';

// Barra da landing. A navbar do sistema só existe autenticado (`@if` no
// AppComponent), então a página pública traz a própria — sem navegação, só
// marca, tema e entrada.
@Component({
  selector: 'app-landing-topo',
  imports: [RouterLink],
  templateUrl: './landing-topo.component.html',
  styleUrl: './landing-topo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingTopoComponent {
  private readonly stylePreferences = inject(StylePreferencesService);

  // Mesma justificativa da tela de login: tema é preferência visual guardada em
  // localStorage, sem dado sensível nem backend — pode ser trocado deslogado.
  get isDarkTheme(): boolean {
    return this.stylePreferences.current.theme === 'dark';
  }

  toggleTheme(): void {
    this.stylePreferences.toggleTheme();
  }
}
