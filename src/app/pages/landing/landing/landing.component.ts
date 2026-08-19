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

  // Conferidos no código, não estimados: 16 linhas na tabela de módulos de
  // `docs/funcionalidades.md`, 56 entradas de rota em `app.routes.ts` e os dois
  // papéis de `UserRole`. O rótulo do meio diz **rotas**, e não "telas", porque
  // é isso que o número mede: há rotas que compartilham o mesmo componente (os
  // pares novo/editar) e rotas que não são tela de produto (`/403`, login).
  // Ao mexer nesses três lugares, reveja os números — a página é pública.
  readonly numeros: NumeroLanding[] = [
    { valor: '16', rotulo: 'módulos em produção' },
    { valor: '56', rotulo: 'rotas mapeadas' },
    { valor: '2', rotulo: 'perfis de acesso' }
  ];

}
