import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/pacientes', pathMatch: 'full' },
  {
    path: 'pacientes',
    loadComponent: () =>
      import('./pages/pacientes/paciente-list/paciente-list.component').then(m => m.PacienteListComponent)
  },
  {
    path: 'pacientes/novo',
    loadComponent: () =>
      import('./pages/pacientes/paciente-form/paciente-form.component').then(m => m.PacienteFormComponent)
  },
  {
    path: 'pacientes/:id/editar',
    loadComponent: () =>
      import('./pages/pacientes/paciente-form/paciente-form.component').then(m => m.PacienteFormComponent)
  },
  {
    path: 'planos/novo/:pacienteId',
    loadComponent: () =>
      import('./pages/planos/plano-form/plano-form.component').then(m => m.PlanoFormComponent)
  },
  {
    path: 'planos/paciente/:pacienteId',
    loadComponent: () =>
      import('./pages/planos/plano-list/plano-list.component').then(m => m.PlanoListComponent)
  },
  {
    path: 'pagamentos/novo/:pacienteId',
    loadComponent: () =>
      import('./pages/pagamentos/pagamento-form/pagamento-form.component').then(m => m.PagamentoFormComponent)
  },
  {
    path: 'pagamentos/paciente/:pacienteId',
    loadComponent: () =>
      import('./pages/pagamentos/pagamento-list/pagamento-list.component').then(m => m.PagamentoListComponent)
  },
  {
    path: 'aulas/paciente/:pacienteId',
    loadComponent: () =>
      import('./pages/aulas/aula-list/aula-list.component').then(m => m.AulaListComponent)
  },
  {
    path: 'aulas/pagamento/:pagamentoId',
    loadComponent: () =>
      import('./pages/aulas/aula-list/aula-list.component').then(m => m.AulaListComponent)
  },
  {
    path: 'relatorios',
    loadComponent: () =>
      import('./pages/relatorios/relatorio-list/relatorio-list.component').then(m => m.RelatorioListComponent)
  },
  {
    path: 'relatorios/pagamento-profissional',
    loadComponent: () =>
      import('./pages/relatorios/profissional-pagamento-relatorio/profissional-pagamento-relatorio.component')
        .then(m => m.ProfissionalPagamentoRelatorioComponent)
  },
  {
    path: 'profissionais',
    loadComponent: () =>
      import('./pages/profissionais/profissional-list/profissional-list.component').then(m => m.ProfissionalListComponent)
  },
  {
    path: 'profissionais/novo',
    loadComponent: () =>
      import('./pages/profissionais/profissional-form/profissional-form.component').then(m => m.ProfissionalFormComponent)
  },
  {
    path: 'profissionais/:id/editar',
    loadComponent: () =>
      import('./pages/profissionais/profissional-form/profissional-form.component').then(m => m.ProfissionalFormComponent)
  },
  {
    path: 'profissionais/:id',
    loadComponent: () =>
      import('./pages/profissionais/profissional-detail/profissional-detail.component').then(m => m.ProfissionalDetailComponent)
  },
  {
    path: 'pacientes/:id',
    loadComponent: () =>
      import('./pages/pacientes/paciente-detail/paciente-detail.component').then(m => m.PacienteDetailComponent)
  }
];
