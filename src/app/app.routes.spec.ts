import { routes } from './app.routes';

describe('app routes', () => {
  const paths = routes.map(r => r.path);

  it('should contain all expected routes', () => {
    const expected = [
      '',
      'login',
      '403',
      'pacientes',
      'pacientes/novo',
      'pacientes/:id/editar',
      'pacientes/:pacienteId/anamnese',
      'pacientes/:pacienteId/avaliacao-fisioterapeutica',
      'pacientes/:pacienteId/sessoes/nova',
      'pacientes/:pacienteId/sessoes/:id/editar',
      'pacientes/:pacienteId/sessoes/:sessaoId/evolucao',
      'pacientes/:pacienteId/sessoes',
      'pacientes/:pacienteId/plano-tratamento/novo',
      'pacientes/:pacienteId/plano-tratamento/:id/editar',
      'pacientes/:pacienteId/plano-tratamento',
      'pacientes/:pacienteId/reavaliacoes/nova',
      'pacientes/:pacienteId/reavaliacoes/:id/editar',
      'pacientes/:pacienteId/reavaliacoes',
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
    const sessoesNovaIndex = paths.indexOf('pacientes/:pacienteId/sessoes/nova');
    const sessoesEditarIndex = paths.indexOf('pacientes/:pacienteId/sessoes/:id/editar');
    const sessoesEvolucaoIndex = paths.indexOf('pacientes/:pacienteId/sessoes/:sessaoId/evolucao');
    const sessoesListIndex = paths.indexOf('pacientes/:pacienteId/sessoes');
    const planoTratamentoNovoIndex = paths.indexOf('pacientes/:pacienteId/plano-tratamento/novo');
    const planoTratamentoEditarIndex = paths.indexOf('pacientes/:pacienteId/plano-tratamento/:id/editar');
    const planoTratamentoListIndex = paths.indexOf('pacientes/:pacienteId/plano-tratamento');
    const reavaliacaoNovaIndex = paths.indexOf('pacientes/:pacienteId/reavaliacoes/nova');
    const reavaliacaoEditarIndex = paths.indexOf('pacientes/:pacienteId/reavaliacoes/:id/editar');
    const reavaliacaoListIndex = paths.indexOf('pacientes/:pacienteId/reavaliacoes');
    const editarIndex = paths.indexOf('pacientes/:id/editar');
    const novoIndex = paths.indexOf('pacientes/novo');
    const listIndex = paths.indexOf('pacientes');

    expect(listIndex).toBeLessThan(novoIndex);
    expect(novoIndex).toBeLessThan(editarIndex);
    expect(editarIndex).toBeLessThan(anamneseIndex);
    expect(anamneseIndex).toBeLessThan(avaliacaoIndex);
    expect(avaliacaoIndex).toBeLessThan(sessoesNovaIndex);
    expect(sessoesNovaIndex).toBeLessThan(sessoesEditarIndex);
    expect(sessoesEditarIndex).toBeLessThan(sessoesEvolucaoIndex);
    expect(sessoesEvolucaoIndex).toBeLessThan(sessoesListIndex);
    expect(sessoesListIndex).toBeLessThan(planoTratamentoNovoIndex);
    expect(planoTratamentoNovoIndex).toBeLessThan(planoTratamentoEditarIndex);
    expect(planoTratamentoEditarIndex).toBeLessThan(planoTratamentoListIndex);
    expect(planoTratamentoListIndex).toBeLessThan(reavaliacaoNovaIndex);
    expect(reavaliacaoNovaIndex).toBeLessThan(reavaliacaoEditarIndex);
    expect(reavaliacaoEditarIndex).toBeLessThan(reavaliacaoListIndex);
    expect(reavaliacaoListIndex).toBeLessThan(idIndex);
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

  it('should protect every admin route with a canActivate guard', () => {
    const adminRoutes = routes.filter(r => r.path?.startsWith('admin'));
    expect(adminRoutes.length).toBe(4);
    for (const route of adminRoutes) {
      expect(route.canActivate?.length).toBeGreaterThan(0);
    }
  });
});
