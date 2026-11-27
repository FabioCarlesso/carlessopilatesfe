import {
  aceitaAtendimento,
  rotuloAcaoAtendimento,
  situacaoAtendimento
} from './atendimento';

describe('atendimento utils', () => {
  it('should not indicate anything on a holiday class', () => {
    expect(situacaoAtendimento({ realizada: true, feriado: true, sessaoId: null, temEvolucao: false })).toBeNull();
    expect(aceitaAtendimento({ feriado: true })).toBeFalse();
    expect(aceitaAtendimento({ feriado: false })).toBeTrue();
    expect(aceitaAtendimento({})).toBeTrue();
  });

  it('should not indicate anything with the API before #246', () => {
    expect(situacaoAtendimento({ realizada: false })).toBeNull();
    expect(rotuloAcaoAtendimento({ realizada: false })).toBe('Atender / Evoluir');
  });

  it('should tell a class without atendimento', () => {
    const aula = { realizada: false, sessaoId: null, temEvolucao: false };
    expect(situacaoAtendimento(aula)).toBe('SEM_ATENDIMENTO');
    expect(rotuloAcaoAtendimento(aula)).toBe('Atender');
  });

  it('should tell a done class without evolution, with or without a linked session', () => {
    expect(situacaoAtendimento({ realizada: true, sessaoId: null, temEvolucao: false })).toBe('SEM_EVOLUCAO');
    const comSessao = { realizada: true, sessaoId: 3, temEvolucao: false };
    expect(situacaoAtendimento(comSessao)).toBe('SEM_EVOLUCAO');
    expect(rotuloAcaoAtendimento(comSessao)).toBe('Evoluir');
  });

  it('should tell an evolved class', () => {
    const aula = { realizada: true, sessaoId: 3, temEvolucao: true };
    expect(situacaoAtendimento(aula)).toBe('EVOLUIDA');
    expect(rotuloAcaoAtendimento(aula)).toBe('Ver atendimento');
  });
});
