import { ChangeDetectionStrategy, Component } from '@angular/core';

export interface PassoLanding {
  titulo: string;
  descricao: string;
}

@Component({
  selector: 'app-landing-como-funciona',
  imports: [],
  templateUrl: './landing-como-funciona.component.html',
  styleUrl: './landing-como-funciona.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingComoFuncionaComponent {
  // O fluxo descrito aqui é o do produto de verdade: o pagamento é que dispara
  // a geração das aulas no backend, e não um agendamento manual. Ao mudar esse
  // comportamento, o passo 3 precisa mudar junto.
  readonly passos: PassoLanding[] = [
    {
      titulo: 'Cadastre o paciente',
      descricao:
        'Dados pessoais, anamnese clínica e avaliação fisioterapêutica, incluindo a análise postural do simetrógrafo virtual.'
    },
    {
      titulo: 'Monte o plano e registre o pagamento',
      descricao:
        'Planos mensais, trimestrais ou anuais, com frequência semanal e os dias da semana escolhidos junto com o paciente.'
    },
    {
      titulo: 'As aulas aparecem na agenda',
      descricao:
        'Geradas automaticamente a partir do pagamento e distribuídas nos dias do plano, prontas para a semana do estúdio.'
    },
    {
      titulo: 'Cada atendimento vira histórico',
      descricao:
        'Presença confirmada, evolução clínica registrada e tudo consolidado em linha do tempo, reavaliações e relatórios.'
    }
  ];
}
