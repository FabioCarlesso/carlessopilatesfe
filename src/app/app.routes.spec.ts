import { Routes } from '@angular/router';
import { routes } from './app.routes';

function getAllPaths(routeList: Routes, prefix = ''): string[] {
  const result: string[] = [];
  for (const route of routeList) {
    const segment = route.path ?? '';
    const full = prefix ? (segment ? `${prefix}/${segment}` : prefix) : segment;
    if (!result.includes(full)) result.push(full);
    if (route.children) {
      for (const cp of getAllPaths(route.children, full)) {
        if (!result.includes(cp)) result.push(cp);
      }
    }
  }
  return result;
}

describe('app routes', () => {
  const paths = getAllPaths(routes);

  it('should contain all expected routes', () => {
    const expected = [
      '',
      'perfil/alterar-senha',
      'login',
      'esqueci-senha',
      'resetar-senha',
      '403',
      'pacientes',
      'pacientes/novo',
      'pacientes/:id/editar',
      'pacientes/:pacienteId/anamnese',
      'pacientes/:pacienteId/avaliacao-fisioterapeutica',
      'pacientes/:pacienteId/avaliacao-fisioterapeutica/postural/nova',
      'pacientes/:pacienteId/avaliacao-fisioterapeutica/postural/:id/marcar',
      'pacientes/:pacienteId/avaliacao-fisioterapeutica/postural',
      'pacientes/:pacienteId/sessoes/nova',
      'pacientes/:pacienteId/sessoes/:id/editar',
      'pacientes/:pacienteId/sessoes/:sessaoId/evolucao',
      'pacientes/:pacienteId/sessoes',
      'pacientes/:pacienteId/evolucoes',
      'pacientes/:pacienteId/calendario',
      'pacientes/:pacienteId/plano-tratamento/novo',
      'pacientes/:pacienteId/plano-tratamento/:id/editar',
      'pacientes/:pacienteId/plano-tratamento',
      'pacientes/:pacienteId/reavaliacoes/nova',
      'pacientes/:pacienteId/reavaliacoes/:id/editar',
      'pacientes/:pacienteId/reavaliacoes',
      'pacientes/:pacienteId/nfse-emitidas/nova',
      'pacientes/:pacienteId/nfse-emitidas/:id/editar',
      'pacientes/:pacienteId/nfse-emitidas',
      'pacientes/:id',
      'planos/novo/:pacienteId',
      'planos/paciente/:pacienteId',
      'pagamentos/novo/:pacienteId',
      'pagamentos/paciente/:pacienteId',
      'aulas/paciente/:pacienteId',
      'aulas/pagamento/:pagamentoId',
      'relatorios',
      'relatorios/pagamento-profissional',
      'relatorios/nfse',
      'admin',
      'admin/usuarios',
      'admin/usuarios/novo',
      'admin/usuarios/:id/editar',
      'profissionais',
      'profissionais/novo',
      'profissionais/:id/editar',
      'profissionais/:id',
    ];
    expect(paths).toEqual(expected);
  });

  it('should place pacientes/:id after static pacientes routes', () => {
    const idIndex = paths.indexOf('pacientes/:id');
    const anamneseIndex = paths.indexOf('pacientes/:pacienteId/anamnese');
    const avaliacaoIndex = paths.indexOf('pacientes/:pacienteId/avaliacao-fisioterapeutica');
    const posturalNovaIndex = paths.indexOf('pacientes/:pacienteId/avaliacao-fisioterapeutica/postural/nova');
    const posturalMarcarIndex = paths.indexOf('pacientes/:pacienteId/avaliacao-fisioterapeutica/postural/:id/marcar');
    const posturalIndex = paths.indexOf('pacientes/:pacienteId/avaliacao-fisioterapeutica/postural');
    const sessoesNovaIndex = paths.indexOf('pacientes/:pacienteId/sessoes/nova');
    const sessoesEditarIndex = paths.indexOf('pacientes/:pacienteId/sessoes/:id/editar');
    const sessoesEvolucaoIndex = paths.indexOf('pacientes/:pacienteId/sessoes/:sessaoId/evolucao');
    const sessoesListIndex = paths.indexOf('pacientes/:pacienteId/sessoes');
    const evolucoesListIndex = paths.indexOf('pacientes/:pacienteId/evolucoes');
    const calendarioIndex = paths.indexOf('pacientes/:pacienteId/calendario');
    const planoTratamentoNovoIndex = paths.indexOf('pacientes/:pacienteId/plano-tratamento/novo');
    const planoTratamentoEditarIndex = paths.indexOf('pacientes/:pacienteId/plano-tratamento/:id/editar');
    const planoTratamentoListIndex = paths.indexOf('pacientes/:pacienteId/plano-tratamento');
    const reavaliacaoNovaIndex = paths.indexOf('pacientes/:pacienteId/reavaliacoes/nova');
    const reavaliacaoEditarIndex = paths.indexOf('pacientes/:pacienteId/reavaliacoes/:id/editar');
    const reavaliacaoListIndex = paths.indexOf('pacientes/:pacienteId/reavaliacoes');
    const nfseEmitidaNovaIndex = paths.indexOf('pacientes/:pacienteId/nfse-emitidas/nova');
    const nfseEmitidaEditarIndex = paths.indexOf('pacientes/:pacienteId/nfse-emitidas/:id/editar');
    const nfseEmitidaListIndex = paths.indexOf('pacientes/:pacienteId/nfse-emitidas');
    const editarIndex = paths.indexOf('pacientes/:id/editar');
    const novoIndex = paths.indexOf('pacientes/novo');
    const listIndex = paths.indexOf('pacientes');

    expect(listIndex).toBeLessThan(novoIndex);
    expect(novoIndex).toBeLessThan(editarIndex);
    expect(editarIndex).toBeLessThan(anamneseIndex);
    expect(anamneseIndex).toBeLessThan(avaliacaoIndex);
    expect(avaliacaoIndex).toBeLessThan(posturalNovaIndex);
    expect(posturalNovaIndex).toBeLessThan(posturalMarcarIndex);
    expect(posturalMarcarIndex).toBeLessThan(posturalIndex);
    expect(posturalIndex).toBeLessThan(sessoesNovaIndex);
    expect(sessoesNovaIndex).toBeLessThan(sessoesEditarIndex);
    expect(sessoesEditarIndex).toBeLessThan(sessoesEvolucaoIndex);
    expect(sessoesEvolucaoIndex).toBeLessThan(sessoesListIndex);
    expect(sessoesListIndex).toBeLessThan(evolucoesListIndex);
    expect(evolucoesListIndex).toBeLessThan(calendarioIndex);
    expect(calendarioIndex).toBeLessThan(planoTratamentoNovoIndex);
    expect(planoTratamentoNovoIndex).toBeLessThan(planoTratamentoEditarIndex);
    expect(planoTratamentoEditarIndex).toBeLessThan(planoTratamentoListIndex);
    expect(planoTratamentoListIndex).toBeLessThan(reavaliacaoNovaIndex);
    expect(reavaliacaoNovaIndex).toBeLessThan(reavaliacaoEditarIndex);
    expect(reavaliacaoEditarIndex).toBeLessThan(reavaliacaoListIndex);
    expect(reavaliacaoListIndex).toBeLessThan(nfseEmitidaNovaIndex);
    expect(nfseEmitidaNovaIndex).toBeLessThan(nfseEmitidaEditarIndex);
    expect(nfseEmitidaEditarIndex).toBeLessThan(nfseEmitidaListIndex);
    expect(nfseEmitidaListIndex).toBeLessThan(idIndex);
  });

  it('should place pacientes/:id before planos routes', () => {
    const idIndex = paths.indexOf('pacientes/:id');
    const planosIndex = paths.indexOf('planos/novo/:pacienteId');
    expect(idIndex).toBeLessThan(planosIndex);
  });

  it('should group profissionais routes together', () => {
    const listIndex = paths.indexOf('profissionais');
    const novoIndex = paths.indexOf('profissionais/novo');
    const editarIndex = paths.indexOf('profissionais/:id/editar');
    const idIndex = paths.indexOf('profissionais/:id');

    expect(listIndex).toBeLessThan(novoIndex);
    expect(novoIndex).toBeLessThan(editarIndex);
    expect(editarIndex).toBeLessThan(idIndex);
  });

  it('should group admin routes with home before usuarios subroutes', () => {
    const homeIndex = paths.indexOf('admin');
    const listIndex = paths.indexOf('admin/usuarios');
    const novoIndex = paths.indexOf('admin/usuarios/novo');
    const editarIndex = paths.indexOf('admin/usuarios/:id/editar');

    expect(homeIndex).toBeLessThan(listIndex);
    expect(listIndex).toBeLessThan(novoIndex);
    expect(novoIndex).toBeLessThan(editarIndex);
  });

  it('should expose the password recovery routes without an auth guard', () => {
    for (const path of ['login', 'esqueci-senha', 'resetar-senha']) {
      const route = routes.find(r => r.path === path);
      expect(route).withContext(`route ${path} should exist`).toBeTruthy();
      expect(route!.canActivate).withContext(`route ${path} should be public`).toBeUndefined();
    }
  });

  it('should protect every admin route with a canActivate guard on the parent', () => {
    const adminRoute = routes.find(r => r.path === 'admin');
    expect(adminRoute).toBeTruthy();
    expect(adminRoute!.canActivate?.length).toBeGreaterThan(0);
    expect(adminRoute!.children?.length).toBeGreaterThan(0);
  });
});
