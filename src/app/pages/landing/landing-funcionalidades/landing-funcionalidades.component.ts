import { ChangeDetectionStrategy, Component } from '@angular/core';

export interface FuncionalidadeLanding {
  titulo: string;
  descricao: string;
}

@Component({
  selector: 'app-landing-funcionalidades',
  imports: [],
  templateUrl: './landing-funcionalidades.component.html',
  styleUrl: './landing-funcionalidades.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingFuncionalidadesComponent {
  // Espelha os módulos de `docs/funcionalidades.md`. Módulo novo documentado lá
  // que valha a apresentação entra aqui também.
  readonly funcionalidades: FuncionalidadeLanding[] = [
    {
      titulo: 'Agenda do estúdio',
      descricao:
        'Visões semanal e diária de todas as aulas e sessões, filtros por profissional, tipo e situação, e ações rápidas de realizar ou cancelar.'
    },
    {
      titulo: 'Prontuário completo',
      descricao:
        'Anamnese, avaliação fisioterapêutica, planos de tratamento, sessões, evoluções em linha do tempo e reavaliações periódicas.'
    },
    {
      titulo: 'Simetrógrafo virtual',
      descricao:
        'Análise postural por vista, com grade, linha de prumo, marcação guiada, zoom e medidas calculadas a partir dos pontos marcados.'
    },
    {
      titulo: 'Planos e pagamentos',
      descricao:
        'Planos mensais, trimestrais e anuais, registro de pagamento e geração automática das aulas nos dias combinados.'
    },
    {
      titulo: 'Lista de espera',
      descricao:
        'Fila de interessados por dia da semana e faixa de horário, em ordem de chegada, com conversão direta em sessão quando abre vaga.'
    },
    {
      titulo: 'Relatórios e NFSE',
      descricao:
        'Pagamento de profissional por período e emissão de NFSE por competência, com exportação em PDF, XLSX e CSV.'
    },
    {
      titulo: 'Administração e acesso',
      descricao:
        'Usuários, perfis, bloqueios de agenda para feriados e manutenções, e controle de acesso rota a rota.'
    },
    {
      titulo: 'Busca global',
      descricao:
        'Pacientes e profissionais por nome ou CPF a partir de qualquer tela, com os atalhos de teclado “/” e Ctrl/Cmd+K.'
    }
  ];
}
