import { routes } from './app.routes';

describe('app routes', () => {
  const paths = routes.map(r => r.path);

  it('should contain all expected routes', () => {
    const expected = [
      '',
      'login',
      'pacientes',
      'pacientes/novo',
      'pacientes/:id/editar',
      'pacientes/:pacienteId/anamnese',
      'pacientes/:pacienteId/avaliacao-fisioterapeutica',
      'pacientes/:pacienteId/plano-tratamento/novo',
      'pacientes/:pacienteId/plano-tratamento/:id/editar',
      'pacientes/:pacienteId/plano-tratamento',
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
    const planoTratamentoNovoIndex = paths.indexOf('pacientes/:pacienteId/plano-tratamento/novo');
    const planoTratamentoEditarIndex = paths.indexOf('pacientes/:pacienteId/plano-tratamento/:id/editar');
    const planoTratamentoListIndex = paths.indexOf('pacientes/:pacienteId/plano-tratamento');
    const editarIndex = paths.indexOf('pacientes/:id/editar');
    const novoIndex = paths.indexOf('pacientes/novo');
    const listIndex = paths.indexOf('pacientes');

    expect(listIndex).toBeLessThan(novoIndex);
    expect(novoIndex).toBeLessThan(editarIndex);
    expect(editarIndex).toBeLessThan(anamneseIndex);
    expect(anamneseIndex).toBeLessThan(avaliacaoIndex);
    expect(avaliacaoIndex).toBeLessThan(planoTratamentoNovoIndex);
    expect(planoTratamentoNovoIndex).toBeLessThan(planoTratamentoEditarIndex);
    expect(planoTratamentoEditarIndex).toBeLessThan(planoTratamentoListIndex);
    expect(planoTratamentoListIndex).toBeLessThan(idIndex);
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
});
