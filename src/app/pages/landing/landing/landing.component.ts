import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LandingComoFuncionaComponent } from '../landing-como-funciona/landing-como-funciona.component';
import { LandingFuncionalidadesComponent } from '../landing-funcionalidades/landing-funcionalidades.component';
import { LandingPrintsComponent } from '../landing-prints/landing-prints.component';
import { LandingTopoComponent } from '../landing-topo/landing-topo.component';

export interface NumeroLanding {
  valor: string;
  rotulo: string;
}

@Component({
  selector: 'app-landing',
  imports: [
    RouterLink,
    LandingTopoComponent,
    LandingComoFuncionaComponent,
    LandingFuncionalidadesComponent,
    LandingPrintsComponent
  ],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingComponent {
  readonly anoAtual = new Date().getFullYear();

  // Conferidos no código, não estimados: 15 módulos em `docs/funcionalidades.md`,
  // 56 rotas em `app.routes.ts` e os dois papéis de `UserRole`. Ao mexer nesses
  // três lugares, reveja os números — a página é pública e não pode mentir.
  readonly numeros: NumeroLanding[] = [
    { valor: '15', rotulo: 'módulos em produção' },
    { valor: '56', rotulo: 'telas do sistema' },
    { valor: '2', rotulo: 'perfis de acesso' }
  ];

}
