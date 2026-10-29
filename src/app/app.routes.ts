import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { PAPEIS } from './core/models/auth';
import { visitanteGuard } from './core/guards/visitante.guard';

export const routes: Routes = [
  {
    // Landing pública de produto. `layoutFluido` desliga o `.container` do
    // `<main>` no AppComponent para as faixas sangrarem de ponta a ponta.
    path: '',
    canActivate: [visitanteGuard],
    data: { layoutFluido: true },
    loadComponent: () =>
      import('./pages/landing/landing/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'inicio',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/dashboard/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'perfil/alterar-senha',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/perfil/alterar-senha/alterar-senha.component').then(m => m.AlterarSenhaComponent)
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'esqueci-senha',
    loadComponent: () =>
      import('./pages/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'resetar-senha',
    loadComponent: () =>
      import('./pages/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: '403',
    loadComponent: () =>
      import('./pages/auth/forbidden/forbidden.component').then(m => m.ForbiddenComponent)
  },
  {
    path: 'agenda',
    canActivate: [roleGuard(PAPEIS.agenda)],
    loadComponent: () =>
      import('./pages/agenda/agenda/agenda.component').then(m => m.AgendaComponent)
  },
  {
    path: 'lista-espera',
    canActivate: [roleGuard(PAPEIS.agenda)],
    loadComponent: () =>
      import('./pages/lista-espera/lista-espera-list/lista-espera-list.component')
        .then(m => m.ListaEsperaListComponent)
  },
  {
    path: 'lista-espera/nova',
    canActivate: [roleGuard(PAPEIS.agenda)],
    loadComponent: () =>
      import('./pages/lista-espera/lista-espera-form/lista-espera-form.component')
        .then(m => m.ListaEsperaFormComponent)
  },
  {
    path: 'pacientes',
    canActivate: [roleGuard(PAPEIS.equipe)],
    loadComponent: () =>
      import('./pages/pacientes/paciente-list/paciente-list.component').then(m => m.PacienteListComponent)
  },
  {
    path: 'pacientes/novo',
    canActivate: [roleGuard(PAPEIS.equipe)],
    loadComponent: () =>
      import('./pages/pacientes/paciente-form/paciente-form.component').then(m => m.PacienteFormComponent)
  },
  {
    path: 'pacientes/:id/editar',
    canActivate: [roleGuard(PAPEIS.equipe)],
    loadComponent: () =>
      import('./pages/pacientes/paciente-form/paciente-form.component').then(m => m.PacienteFormComponent)
  },
  {
    path: 'pacientes/:pacienteId/anamnese',
    canActivate: [roleGuard(PAPEIS.clinica)],
    loadComponent: () =>
      import('./pages/pacientes/paciente-anamnese/paciente-anamnese.component').then(m => m.PacienteAnamneseComponent)
  },
  {
    path: 'pacientes/:pacienteId/avaliacao-fisioterapeutica',
    canActivate: [roleGuard(PAPEIS.clinica)],
    loadComponent: () =>
      import('./pages/pacientes/paciente-avaliacao-fisioterapeutica/paciente-avaliacao-fisioterapeutica.component')
        .then(m => m.PacienteAvaliacaoFisioterapeuticaComponent)
  },
  {
    path: 'pacientes/:pacienteId/avaliacao-fisioterapeutica/postural/nova',
    canActivate: [roleGuard(PAPEIS.clinica)],
    loadComponent: () =>
      import('./pages/pacientes/paciente-avaliacao-postural-form/paciente-avaliacao-postural-form.component')
        .then(m => m.PacienteAvaliacaoPosturalFormComponent)
  },
  {
    path: 'pacientes/:pacienteId/avaliacao-fisioterapeutica/postural/:id/marcar',
    canActivate: [roleGuard(PAPEIS.clinica)],
    loadComponent: () =>
      import('./pages/pacientes/paciente-avaliacao-postural-editor/paciente-avaliacao-postural-editor.component')
        .then(m => m.PacienteAvaliacaoPosturalEditorComponent)
  },
  {
    path: 'pacientes/:pacienteId/avaliacao-fisioterapeutica/postural',
    canActivate: [roleGuard(PAPEIS.clinica)],
    loadComponent: () =>
      import('./pages/pacientes/paciente-avaliacao-postural-list/paciente-avaliacao-postural-list.component')
        .then(m => m.PacienteAvaliacaoPosturalListComponent)
  },
  {
    path: 'pacientes/:pacienteId/sessoes/nova',
    canActivate: [roleGuard(PAPEIS.agenda)],
    loadComponent: () =>
      import('./pages/pacientes/paciente-sessao-form/paciente-sessao-form.component')
        .then(m => m.PacienteSessaoFormComponent)
  },
  {
    path: 'pacientes/:pacienteId/sessoes/:id/editar',
    canActivate: [roleGuard(PAPEIS.agenda)],
    loadComponent: () =>
      import('./pages/pacientes/paciente-sessao-form/paciente-sessao-form.component')
        .then(m => m.PacienteSessaoFormComponent)
  },
  {
    path: 'pacientes/:pacienteId/sessoes/:sessaoId/evolucao',
    canActivate: [roleGuard(PAPEIS.clinica)],
    loadComponent: () =>
      import('./pages/pacientes/paciente-evolucao-sessao/paciente-evolucao-sessao.component')
        .then(m => m.PacienteEvolucaoSessaoComponent)
  },
  {
    path: 'pacientes/:pacienteId/sessoes',
    canActivate: [roleGuard(PAPEIS.agenda)],
    loadComponent: () =>
      import('./pages/pacientes/paciente-sessao-list/paciente-sessao-list.component')
        .then(m => m.PacienteSessaoListComponent)
  },
  {
    path: 'pacientes/:pacienteId/evolucoes',
    canActivate: [roleGuard(PAPEIS.clinica)],
    loadComponent: () =>
      import('./pages/pacientes/paciente-evolucao-list/paciente-evolucao-list.component')
        .then(m => m.PacienteEvolucaoListComponent)
  },
  {
    path: 'pacientes/:pacienteId/calendario',
    canActivate: [roleGuard(PAPEIS.agenda)],
    loadComponent: () =>
      import('./pages/pacientes/paciente-calendario/paciente-calendario.component')
        .then(m => m.PacienteCalendarioComponent)
  },
  {
    path: 'pacientes/:pacienteId/plano-tratamento/novo',
    canActivate: [roleGuard(PAPEIS.clinica)],
    loadComponent: () =>
      import('./pages/pacientes/paciente-plano-tratamento-form/paciente-plano-tratamento-form.component')
        .then(m => m.PacientePlanoTratamentoFormComponent)
  },
  {
    path: 'pacientes/:pacienteId/plano-tratamento/:id/editar',
    canActivate: [roleGuard(PAPEIS.clinica)],
    loadComponent: () =>
      import('./pages/pacientes/paciente-plano-tratamento-form/paciente-plano-tratamento-form.component')
        .then(m => m.PacientePlanoTratamentoFormComponent)
  },
  {
    path: 'pacientes/:pacienteId/plano-tratamento',
    canActivate: [roleGuard(PAPEIS.clinica)],
    loadComponent: () =>
      import('./pages/pacientes/paciente-plano-tratamento-list/paciente-plano-tratamento-list.component')
        .then(m => m.PacientePlanoTratamentoListComponent)
  },
  {
    path: 'pacientes/:pacienteId/reavaliacoes/nova',
    canActivate: [roleGuard(PAPEIS.clinica)],
    loadComponent: () =>
      import('./pages/pacientes/paciente-reavaliacao-form/paciente-reavaliacao-form.component')
        .then(m => m.PacienteReavaliacaoFormComponent)
  },
  {
    path: 'pacientes/:pacienteId/reavaliacoes/:id/editar',
    canActivate: [roleGuard(PAPEIS.clinica)],
    loadComponent: () =>
      import('./pages/pacientes/paciente-reavaliacao-form/paciente-reavaliacao-form.component')
        .then(m => m.PacienteReavaliacaoFormComponent)
  },
  {
    path: 'pacientes/:pacienteId/reavaliacoes',
    canActivate: [roleGuard(PAPEIS.clinica)],
    loadComponent: () =>
      import('./pages/pacientes/paciente-reavaliacao-list/paciente-reavaliacao-list.component')
        .then(m => m.PacienteReavaliacaoListComponent)
  },
  {
    path: 'pacientes/:pacienteId/nfse-emitidas/nova',
    canActivate: [roleGuard(PAPEIS.fiscal)],
    loadComponent: () =>
      import('./pages/pacientes/paciente-nfse-emitida-form/paciente-nfse-emitida-form.component')
        .then(m => m.PacienteNfseEmitidaFormComponent)
  },
  {
    path: 'pacientes/:pacienteId/nfse-emitidas/:id/editar',
    canActivate: [roleGuard(PAPEIS.fiscal)],
    loadComponent: () =>
      import('./pages/pacientes/paciente-nfse-emitida-form/paciente-nfse-emitida-form.component')
        .then(m => m.PacienteNfseEmitidaFormComponent)
  },
  {
    path: 'pacientes/:pacienteId/nfse-emitidas',
    canActivate: [roleGuard(PAPEIS.fiscal)],
    loadComponent: () =>
      import('./pages/pacientes/paciente-nfse-emitida-list/paciente-nfse-emitida-list.component')
        .then(m => m.PacienteNfseEmitidaListComponent)
  },
  {
    // Histórico financeiro consolidado (issue #118). A rota é de quem lê planos e
    // pagamentos; aulas e NFSE aparecem só para quem também acessa essas áreas.
    path: 'pacientes/:pacienteId/financeiro',
    canActivate: [roleGuard(PAPEIS.cobranca)],
    loadComponent: () =>
      import('./pages/pacientes/paciente-financeiro/paciente-financeiro.component')
        .then(m => m.PacienteFinanceiroComponent)
  },
  {
    path: 'pacientes/:id',
    canActivate: [roleGuard(PAPEIS.equipe)],
    loadComponent: () =>
      import('./pages/pacientes/paciente-detail/paciente-detail.component').then(m => m.PacienteDetailComponent)
  },
  {
    path: 'planos/novo/:pacienteId',
    canActivate: [roleGuard(PAPEIS.cobranca)],
    loadComponent: () =>
      import('./pages/planos/plano-form/plano-form.component').then(m => m.PlanoFormComponent)
  },
  {
    path: 'planos/paciente/:pacienteId',
    canActivate: [roleGuard(PAPEIS.cobranca)],
    loadComponent: () =>
      import('./pages/planos/plano-list/plano-list.component').then(m => m.PlanoListComponent)
  },
  {
    path: 'pagamentos/novo/:pacienteId',
    canActivate: [roleGuard(PAPEIS.cobranca)],
    loadComponent: () =>
      import('./pages/pagamentos/pagamento-form/pagamento-form.component').then(m => m.PagamentoFormComponent)
  },
  {
    path: 'pagamentos/paciente/:pacienteId',
    canActivate: [roleGuard(PAPEIS.cobranca)],
    loadComponent: () =>
      import('./pages/pagamentos/pagamento-list/pagamento-list.component').then(m => m.PagamentoListComponent)
  },
  {
    path: 'aulas/paciente/:pacienteId',
    canActivate: [roleGuard(PAPEIS.agenda)],
    loadComponent: () =>
      import('./pages/aulas/aula-list/aula-list.component').then(m => m.AulaListComponent)
  },
  {
    // Lê o pagamento (cobrança) e depois as aulas dele (agenda): precisa das duas áreas.
    path: 'aulas/pagamento/:pagamentoId',
    canActivate: [roleGuard(PAPEIS.agenda, PAPEIS.cobranca)],
    loadComponent: () =>
      import('./pages/aulas/aula-list/aula-list.component').then(m => m.AulaListComponent)
  },
  {
    path: 'relatorios',
    canActivate: [roleGuard(PAPEIS.fiscal)],
    loadComponent: () =>
      import('./pages/relatorios/relatorio-list/relatorio-list.component').then(m => m.RelatorioListComponent)
  },
  {
    path: 'relatorios/pagamento-profissional',
    canActivate: [roleGuard(PAPEIS.fiscal)],
    loadComponent: () =>
      import('./pages/relatorios/profissional-pagamento-relatorio/profissional-pagamento-relatorio.component')
        .then(m => m.ProfissionalPagamentoRelatorioComponent)
  },
  {
    path: 'relatorios/nfse',
    canActivate: [roleGuard(PAPEIS.fiscal)],
    loadComponent: () =>
      import('./pages/relatorios/nfse-relatorio/nfse-relatorio.component')
        .then(m => m.NfseRelatorioComponent)
  },
  {
    // Indicadores históricos (issue #130). A API só expõe as séries e o
    // ranking para `ADMIN` (carlessopilatesapi#202); o restante do hub de
    // relatórios é do financeiro.
    path: 'relatorios/indicadores',
    canActivate: [roleGuard(PAPEIS.admin)],
    loadComponent: () =>
      import('./pages/relatorios/indicadores/indicadores.component')
        .then(m => m.IndicadoresComponent)
  },
  {
    // Gestão de inadimplência (issue #127): lista global de pagamentos e
    // contatos de cobrança. A API só a expõe para `ADMIN`.
    path: 'financeiro/inadimplencia',
    canActivate: [roleGuard(PAPEIS.admin)],
    loadComponent: () =>
      import('./pages/financeiro/inadimplencia/inadimplencia.component')
        .then(m => m.InadimplenciaComponent)
  },
  {
    path: 'admin',
    canActivate: [roleGuard(PAPEIS.admin)],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/admin/admin-home/admin-home.component').then(m => m.AdminHomeComponent)
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./pages/admin/usuarios/usuario-list/usuario-list.component').then(m => m.UsuarioListComponent)
      },
      {
        path: 'usuarios/novo',
        loadComponent: () =>
          import('./pages/admin/usuarios/usuario-form/usuario-form.component').then(m => m.UsuarioFormComponent)
      },
      {
        path: 'usuarios/:id/editar',
        loadComponent: () =>
          import('./pages/admin/usuarios/usuario-form/usuario-form.component').then(m => m.UsuarioFormComponent)
      },
      {
        path: 'bloqueios',
        loadComponent: () =>
          import('./pages/admin/bloqueios/bloqueio-list/bloqueio-list.component').then(m => m.BloqueioListComponent)
      },
      {
        path: 'bloqueios/novo',
        loadComponent: () =>
          import('./pages/admin/bloqueios/bloqueio-form/bloqueio-form.component').then(m => m.BloqueioFormComponent)
      },
      {
        path: 'bloqueios/:id/editar',
        loadComponent: () =>
          import('./pages/admin/bloqueios/bloqueio-form/bloqueio-form.component').then(m => m.BloqueioFormComponent)
      }
    ]
  },
  {
    path: 'profissionais',
    canActivate: [roleGuard(PAPEIS.admin)],
    loadComponent: () =>
      import('./pages/profissionais/profissional-list/profissional-list.component').then(m => m.ProfissionalListComponent)
  },
  {
    path: 'profissionais/novo',
    canActivate: [roleGuard(PAPEIS.admin)],
    loadComponent: () =>
      import('./pages/profissionais/profissional-form/profissional-form.component').then(m => m.ProfissionalFormComponent)
  },
  {
    path: 'profissionais/:id/editar',
    canActivate: [roleGuard(PAPEIS.admin)],
    loadComponent: () =>
      import('./pages/profissionais/profissional-form/profissional-form.component').then(m => m.ProfissionalFormComponent)
  },
  {
    path: 'profissionais/:id/agenda',
    canActivate: [roleGuard(PAPEIS.admin)],
    loadComponent: () =>
      import('./pages/profissionais/profissional-agenda/profissional-agenda.component')
        .then(m => m.ProfissionalAgendaComponent)
  },
  {
    path: 'profissionais/:id',
    canActivate: [roleGuard(PAPEIS.admin)],
    loadComponent: () =>
      import('./pages/profissionais/profissional-detail/profissional-detail.component').then(m => m.ProfissionalDetailComponent)
  }
];
