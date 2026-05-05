import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'pacientes',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/pacientes/paciente-list/paciente-list.component').then(m => m.PacienteListComponent)
  },
  {
    path: 'pacientes/novo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/pacientes/paciente-form/paciente-form.component').then(m => m.PacienteFormComponent)
  },
  {
    path: 'pacientes/:id/editar',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/pacientes/paciente-form/paciente-form.component').then(m => m.PacienteFormComponent)
  },
  {
    path: 'pacientes/:pacienteId/anamnese',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/pacientes/paciente-anamnese/paciente-anamnese.component').then(m => m.PacienteAnamneseComponent)
  },
  {
    path: 'pacientes/:pacienteId/avaliacao-fisioterapeutica',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/pacientes/paciente-avaliacao-fisioterapeutica/paciente-avaliacao-fisioterapeutica.component')
        .then(m => m.PacienteAvaliacaoFisioterapeuticaComponent)
  },
  {
    path: 'pacientes/:pacienteId/sessoes/nova',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/pacientes/paciente-sessao-form/paciente-sessao-form.component')
        .then(m => m.PacienteSessaoFormComponent)
  },
  {
    path: 'pacientes/:pacienteId/sessoes/:id/editar',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/pacientes/paciente-sessao-form/paciente-sessao-form.component')
        .then(m => m.PacienteSessaoFormComponent)
  },
  {
    path: 'pacientes/:pacienteId/sessoes/:sessaoId/evolucao',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/pacientes/paciente-evolucao-sessao/paciente-evolucao-sessao.component')
        .then(m => m.PacienteEvolucaoSessaoComponent)
  },
  {
    path: 'pacientes/:pacienteId/sessoes',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/pacientes/paciente-sessao-list/paciente-sessao-list.component')
        .then(m => m.PacienteSessaoListComponent)
  },
  {
    path: 'pacientes/:pacienteId/plano-tratamento/novo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/pacientes/paciente-plano-tratamento-form/paciente-plano-tratamento-form.component')
        .then(m => m.PacientePlanoTratamentoFormComponent)
  },
  {
    path: 'pacientes/:pacienteId/plano-tratamento/:id/editar',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/pacientes/paciente-plano-tratamento-form/paciente-plano-tratamento-form.component')
        .then(m => m.PacientePlanoTratamentoFormComponent)
  },
  {
    path: 'pacientes/:pacienteId/plano-tratamento',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/pacientes/paciente-plano-tratamento-list/paciente-plano-tratamento-list.component')
        .then(m => m.PacientePlanoTratamentoListComponent)
  },
  {
    path: 'pacientes/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/pacientes/paciente-detail/paciente-detail.component').then(m => m.PacienteDetailComponent)
  },
  {
    path: 'planos/novo/:pacienteId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/planos/plano-form/plano-form.component').then(m => m.PlanoFormComponent)
  },
  {
    path: 'planos/paciente/:pacienteId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/planos/plano-list/plano-list.component').then(m => m.PlanoListComponent)
  },
  {
    path: 'pagamentos/novo/:pacienteId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/pagamentos/pagamento-form/pagamento-form.component').then(m => m.PagamentoFormComponent)
  },
  {
    path: 'pagamentos/paciente/:pacienteId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/pagamentos/pagamento-list/pagamento-list.component').then(m => m.PagamentoListComponent)
  },
  {
    path: 'aulas/paciente/:pacienteId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/aulas/aula-list/aula-list.component').then(m => m.AulaListComponent)
  },
  {
    path: 'aulas/pagamento/:pagamentoId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/aulas/aula-list/aula-list.component').then(m => m.AulaListComponent)
  },
  {
    path: 'relatorios',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/relatorios/relatorio-list/relatorio-list.component').then(m => m.RelatorioListComponent)
  },
  {
    path: 'relatorios/pagamento-profissional',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/relatorios/profissional-pagamento-relatorio/profissional-pagamento-relatorio.component')
        .then(m => m.ProfissionalPagamentoRelatorioComponent)
  },
  {
    path: 'relatorios/nfse',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/relatorios/nfse-relatorio/nfse-relatorio.component')
        .then(m => m.NfseRelatorioComponent)
  },
  {
    path: 'profissionais',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/profissionais/profissional-list/profissional-list.component').then(m => m.ProfissionalListComponent)
  },
  {
    path: 'profissionais/novo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/profissionais/profissional-form/profissional-form.component').then(m => m.ProfissionalFormComponent)
  },
  {
    path: 'profissionais/:id/editar',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/profissionais/profissional-form/profissional-form.component').then(m => m.ProfissionalFormComponent)
  },
  {
    path: 'profissionais/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/profissionais/profissional-detail/profissional-detail.component').then(m => m.ProfissionalDetailComponent)
  }
];
