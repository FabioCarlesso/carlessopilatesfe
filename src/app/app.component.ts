import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { StylePreferencesService } from './core/services/style-preferences.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  readonly authService = inject(AuthService);
  private readonly stylePreferences = inject(StylePreferencesService);

  get isDarkTheme(): boolean {
    return this.stylePreferences.current.theme === 'dark';
  }

  sair(): void {
    this.authService.logout();
  }

  toggleTheme(): void {
    this.stylePreferences.toggleTheme();
  }
}
