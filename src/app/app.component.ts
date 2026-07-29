import { Component, HostListener, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { NotificacaoService } from './core/services/notificacao.service';
import { BuscaGlobalComponent } from './shared/components/busca-global/busca-global.component';
import { MenuContaComponent } from './shared/components/menu-conta/menu-conta.component';
import { DESKTOP_MIN_WIDTH } from './shared/utils/breakpoints';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BuscaGlobalComponent, MenuContaComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  readonly authService = inject(AuthService);
  readonly notificacoes = inject(NotificacaoService);
  private readonly router = inject(Router);

  menuAberto = false;

  constructor() {
    this.router.events
      .pipe(
        filter(evento => evento instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        // A mensagem global vale para a tela em que foi disparada; ao navegar, some.
        this.notificacoes.limpar();
        // O painel colapsado não sobrevive a uma troca de tela. Além dos links,
        // que já fecham no clique, isso cobre as navegações disparadas de dentro
        // do painel sem passar por eles — o logout do menu de conta é uma: sem
        // fechar aqui, `menuAberto` seguiria true e a navbar reapareceria
        // expandida no próximo login.
        this.fecharMenu();
      });
  }

  toggleMenu(): void {
    this.menuAberto = !this.menuAberto;
  }

  fecharMenu(): void {
    this.menuAberto = false;
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
