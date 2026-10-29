import { HttpErrorResponse } from '@angular/common/http';
import { DisponibilidadeProfissionalResponseDTO } from '../../core/models/disponibilidade-profissional';
import { DiaSemana } from '../../core/models/plano';
import { conflitoConcorrencia } from '../../../testing/conflito';
import { MENSAGEM_CONFLITO_CONCORRENCIA } from './api-error';
import {
  agruparPorDia,
  DIAS_SEMANA_ORDEM,
  descreverFaixa,
  faixaSobreposta,
  MENSAGEM_SOBREPOSICAO,
  mensagemErroDisponibilidade,
  partesDataHora
} from './disponibilidade';

function faixa(id: number, diaSemana: DiaSemana, horaInicio: string, horaFim: string): DisponibilidadeProfissionalResponseDTO {
  return {
    id,
    profissionalId: 3,
    diaSemana,
    horaInicio: `${horaInicio}:00`,
    horaFim: `${horaFim}:00`,
    version: 0,
    dataCriacao: '2026-10-28T09:00:00',
    dataAtualizacao: null
  };
}

describe('disponibilidade utils', () => {
  const manha = faixa(1, 'MONDAY', '07:00', '12:00');
  const tarde = faixa(2, 'MONDAY', '14:00', '19:00');

  describe('agruparPorDia', () => {
    it('should return the seven days from Monday to Sunday, even without ranges', () => {
      const grade = agruparPorDia([]);

      expect(grade.map(d => d.dia)).toEqual([...DIAS_SEMANA_ORDEM]);
      expect(grade.every(d => d.faixas.length === 0)).toBeTrue();
    });

    it('should group by day and sort by start time', () => {
      const sabado = faixa(3, 'SATURDAY', '08:00', '10:00');
      const grade = agruparPorDia([tarde, sabado, manha]);

      expect(grade[0].faixas).toEqual([manha, tarde]);
      expect(grade[5].faixas).toEqual([sabado]);
      expect(grade[6].faixas).toEqual([]);
    });
  });

  it('should describe a range without seconds', () => {
    expect(descreverFaixa(manha)).toBe('07:00–12:00');
  });

  describe('faixaSobreposta', () => {
    it('should detect a strict intersection on the same day', () => {
      expect(faixaSobreposta([manha, tarde], { diaSemana: 'MONDAY', horaInicio: '11:00', horaFim: '13:00' }))
        .toBe(manha);
    });

    it('should accept ranges that only touch, since the range is half-open', () => {
      expect(faixaSobreposta([manha, tarde], { diaSemana: 'MONDAY', horaInicio: '12:00', horaFim: '14:00' }))
        .toBeNull();
    });

    it('should detect a range that contains another one', () => {
      expect(faixaSobreposta([tarde], { diaSemana: 'MONDAY', horaInicio: '13:00', horaFim: '20:00' })).toBe(tarde);
    });

    it('should ignore ranges of other days', () => {
      expect(faixaSobreposta([manha], { diaSemana: 'TUESDAY', horaInicio: '08:00', horaFim: '09:00' })).toBeNull();
    });

    it('should ignore the range being edited', () => {
      expect(faixaSobreposta([manha], { diaSemana: 'MONDAY', horaInicio: '08:00', horaFim: '11:00' }, 1)).toBeNull();
    });

    it('should not judge an incomplete or inverted candidate', () => {
      expect(faixaSobreposta([manha], { diaSemana: '', horaInicio: '08:00', horaFim: '09:00' })).toBeNull();
      expect(faixaSobreposta([manha], { diaSemana: 'MONDAY', horaInicio: null, horaFim: '09:00' })).toBeNull();
      expect(faixaSobreposta([manha], { diaSemana: 'MONDAY', horaInicio: '10:00', horaFim: '09:00' })).toBeNull();
    });
  });

  describe('partesDataHora', () => {
    it('should split a datetime-local value', () => {
      expect(partesDataHora('2026-11-02T09:30')).toEqual({ data: '2026-11-02', horario: '09:30' });
    });

    it('should drop the seconds the API sends back', () => {
      expect(partesDataHora('2026-11-02T09:30:00')).toEqual({ data: '2026-11-02', horario: '09:30' });
    });

    it('should return null for an incomplete value', () => {
      expect(partesDataHora('')).toBeNull();
      expect(partesDataHora(null)).toBeNull();
      expect(partesDataHora('2026-11-02')).toBeNull();
    });
  });

  describe('mensagemErroDisponibilidade', () => {
    it('should explain the optimistic locking conflict', () => {
      expect(mensagemErroDisponibilidade(conflitoConcorrencia(), 'x')).toBe(MENSAGEM_CONFLITO_CONCORRENCIA);
    });

    it('should translate the overlap conflict instead of showing the English day name', () => {
      const err = new HttpErrorResponse({
        status: 409,
        error: { type: 'https://carlessopilates.com.br/problemas/conflict', detail: 'A faixa MONDAY 07:00–12:00 se sobrepõe' }
      });

      expect(mensagemErroDisponibilidade(err, 'x')).toBe(MENSAGEM_SOBREPOSICAO);
    });

    it('should pass on the detail of a business rule violation', () => {
      const err = new HttpErrorResponse({
        status: 422,
        error: { detail: 'Profissional inativo não pode ter disponibilidade cadastrada ou alterada: 3' }
      });

      expect(mensagemErroDisponibilidade(err, 'x')).toContain('Profissional inativo');
    });

    it('should explain a 404', () => {
      expect(mensagemErroDisponibilidade(new HttpErrorResponse({ status: 404 }), 'x')).toContain('não encontrado');
    });

    it('should fall back for unknown errors', () => {
      expect(mensagemErroDisponibilidade(new Error('x'), 'Erro ao salvar.')).toBe('Erro ao salvar.');
    });
  });
});
