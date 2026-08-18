import { ChangeDetectionStrategy, Component } from '@angular/core';

export interface PrintLanding {
  arquivo: string;
  /** Descrição do conteúdo da imagem para quem não a enxerga (WCAG 1.1.1). */
  alt: string;
  legenda: string;
  largura: number;
  altura: number;
  /** Ocupa a linha inteira da galeria, em vez de meia. */
  destaque?: boolean;
}

@Component({
  selector: 'app-landing-prints',
  imports: [],
  templateUrl: './landing-prints.component.html',
  styleUrl: './landing-prints.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingPrintsComponent {
  // Capturas de um ambiente com dados fictícios — a página é pública e o
  // sistema guarda prontuário de saúde. Nenhum print pode sair de base real
  // (issue #244). `largura`/`altura` são as dimensões do arquivo em
  // `public/landing/` e existem para reservar o espaço antes do download,
  // evitando o deslocamento de layout na rolagem.
  readonly prints: PrintLanding[] = [
    {
      arquivo: 'dashboard',
      alt: 'Dashboard do sistema com os totais de pacientes, profissionais, pagamentos e aulas do mês.',
      legenda: 'Dashboard: os números do estúdio no mês corrente.',
      largura: 1440,
      altura: 700,
      destaque: true
    },
    {
      arquivo: 'agenda',
      alt: 'Agenda semanal do estúdio, com as aulas e sessões distribuídas por dia e horário.',
      legenda: 'Agenda: a semana inteira do estúdio em uma tela.',
      largura: 1440,
      altura: 620,
      destaque: true
    },
    {
      arquivo: 'pacientes',
      alt: 'Listagem de pacientes com filtros por nome, e-mail, CPF e situação, e paginação.',
      legenda: 'Pacientes: busca, filtros e acesso ao prontuário.',
      largura: 1440,
      altura: 960
    },
    {
      arquivo: 'prontuario',
      alt: 'Prontuário de um paciente, com os atalhos para anamnese, avaliações, sessões e evoluções.',
      legenda: 'Prontuário: todo o histórico clínico do paciente.',
      largura: 1440,
      altura: 935
    }
  ];

  caminho(print: PrintLanding): string {
    return `landing/${print.arquivo}.webp`;
  }
}
