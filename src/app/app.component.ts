import { Component, HostListener, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { NotificacaoService } from './core/services/notificacao.service';
import { StylePreferencesService } from './core/services/style-preferences.service';
import { BuscaGlobalComponent } from './shared/components/busca-global/busca-global.component';

// Acima deste breakpoint a navbar deixa de colapsar (ver media query em styles.scss).
const DESKTOP_MIN_WIDTH = 769;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, BuscaGlobalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  readonly authService = inject(AuthService);
  readonly notificacoes = inject(NotificacaoService);
  private readonly stylePreferences = inject(StylePreferencesService);
  private readonly router = inject(Router);

  menuAberto = false;

  constructor() {
    // A mensagem global vale para a tela em que foi disparada; ao navegar, some.
    this.router.events
      .pipe(
        filter(evento => evento instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => this.notificacoes.limpar());
  }

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
