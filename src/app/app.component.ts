import { Component, HostListener, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthenticatedUser } from './core/models/auth';
import { ROLE_LABEL } from './core/models/usuario-admin';
import { AuthService } from './core/services/auth.service';
import { NotificacaoService } from './core/services/notificacao.service';
import { StylePreferencesService } from './core/services/style-preferences.service';
import { BuscaGlobalComponent } from './shared/components/busca-global/busca-global.component';

// Acima deste breakpoint a navbar deixa de colapsar (ver media query em styles.scss).
// Inclui a faixa de tablet (≤ 1024px), onde os links + ações não cabem na barra.
const DESKTOP_MIN_WIDTH = 1025;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BuscaGlobalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  readonly authService = inject(AuthService);
  readonly notificacoes = inject(NotificacaoService);
  private readonly stylePreferences = inject(StylePreferencesService);
  private readonly router = inject(Router);

  menuAberto = false;

  // Identificação do usuário autenticado exibida na navbar. Resolvida uma vez
  // por navegação — e não na interpolação do template — porque
  // `getCurrentUser()` faz `JSON.parse` + validação a cada chamada e o template
  // do AppComponent reavalia a cada ciclo de detecção de mudanças. Login e
  // logout sempre passam por uma navegação, então o valor acompanha a sessão.
  usuarioAtual: AuthenticatedUser | null = null;
  // Texto exibido e `title` saem do mesmo campo: montá-lo no template exigiria
  // repetir a concatenação nos dois lugares, que divergiriam ao primeiro ajuste
  // de formato.
  usuarioAtualDescricao = '';

  constructor() {
    this.resolverUsuarioAtual();

    this.router.events
      .pipe(
        filter(evento => evento instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        // A mensagem global vale para a tela em que foi disparada; ao navegar, some.
        this.notificacoes.limpar();
        this.resolverUsuarioAtual();
      });
  }

  get isDarkTheme(): boolean {
    return this.stylePreferences.current.theme === 'dark';
  }

  // Sessão sem `currentUser` no localStorage (ausente ou corrompido) devolve
  // null: a navbar segue funcional e apenas omite a identificação.
  private resolverUsuarioAtual(): void {
    this.usuarioAtual = this.authService.getCurrentUser();
    this.usuarioAtualDescricao = this.usuarioAtual
      ? `${this.usuarioAtual.name} · ${ROLE_LABEL[this.usuarioAtual.role]}`
      : '';
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
