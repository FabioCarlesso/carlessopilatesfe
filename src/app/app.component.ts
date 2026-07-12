import { Component, HostListener, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { StylePreferencesService } from './core/services/style-preferences.service';

// Acima deste breakpoint a navbar deixa de colapsar (ver media query em styles.scss).
const DESKTOP_MIN_WIDTH = 769;

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

  menuAberto = false;

  get isDarkTheme(): boolean {
    return this.stylePreferences.current.theme === 'dark';
  }

  toggleMenu(): void {
    this.menuAberto = !this.menuAberto;
  }

  fecharMenu(): void {
    this.menuAberto = false;
  }

  sair(): void {
    this.fecharMenu();
    this.authService.logout();
  }

  toggleTheme(): void {
    this.stylePreferences.toggleTheme();
  }

  // Fecha o menu ao passar para o layout desktop, evitando reabri-lo já
  // expandido caso o usuário volte para a largura mobile.
  @HostListener('window:resize')
  onResize(): void {
    if (this.menuAberto && window.innerWidth >= DESKTOP_MIN_WIDTH) {
      this.menuAberto = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.fecharMenu();
  }

  // Fecha o menu ao tocar/clicar fora da navbar.
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.menuAberto) {
      return;
    }
    if (!(event.target as HTMLElement)?.closest('.navbar')) {
      this.menuAberto = false;
    }
  }
}
