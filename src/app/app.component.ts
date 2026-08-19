import { Component, HostListener, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ActivatedRouteSnapshot,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';
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
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.component.scss'
})
export class AppComponent {
  readonly authService = inject(AuthService);
  readonly notificacoes = inject(NotificacaoService);
  private readonly router = inject(Router);

  menuAberto = false;

  // Telas que montam o próprio layout de ponta a ponta (a landing de produto)
  // pedem `data: { layoutFluido: true }` na rota e o `<main>` deixa de aplicar
  // o `.container`, que limita a 1120px e ainda soma o gutter vertical. Sem
  // isso, uma faixa de fundo pararia no meio do viewport (issue #244).
  layoutFluido = false;

  constructor() {
    this.router.events
      .pipe(
        filter(evento => evento instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.layoutFluido = this.rotaPedeLayoutFluido();
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

  // A flag vale para a rota efetivamente ativada, então a busca desce até a
  // folha da árvore: rotas filhas (como as de `/admin`) não herdam o `data` do
  // pai automaticamente na leitura por snapshot.
  private rotaPedeLayoutFluido(): boolean {
    let rota: ActivatedRouteSnapshot | undefined = this.router.routerState.snapshot.root;
    while (rota?.firstChild) {
      rota = rota.firstChild;
    }
    return rota?.data?.['layoutFluido'] === true;
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
