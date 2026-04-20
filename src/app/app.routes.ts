import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/pacientes', pathMatch: 'full' },
  {
    path: 'pacientes',
    loadComponent: () =>
      import('./pages/pacientes/paciente-list/paciente-list.component').then(
        m => m.PacienteListComponent
      )
  },
  {
    path: 'pacientes/novo',
    loadComponent: () =>
      import('./pages/pacientes/paciente-form/paciente-form.component').then(
        m => m.PacienteFormComponent
      )
  },
  {
    path: 'pacientes/:id',
    loadComponent: () =>
      import('./pages/pacientes/paciente-detail/paciente-detail.component').then(
        m => m.PacienteDetailComponent
      )
  },
  {
    path: 'pacientes/:id/editar',
    loadComponent: () =>
      import('./pages/pacientes/paciente-form/paciente-form.component').then(
        m => m.PacienteFormComponent
      )
  }
];
