import { ListaEsperaResponseDTO } from '../../core/models/lista-espera';
import { DiaSemana } from '../../core/models/plano';
import {
  avisoDeInteressados,
  descreverEspera,
  diaSemanaDoDia,
  duracaoDaFaixa,
  faixaDoAgendamento,
  formatarDiaEFaixa,
  formatarFaixa,
  indiceDoDiaSemana,
  proximaDataDoDiaSemana,
  proximoAgendamento
} from './lista-espera';

function entrada(dados: Partial<ListaEsperaResponseDTO> = {}): ListaEsperaResponseDTO {
  return {
    id: 1,
    pacienteId: 10,
    pacienteNome: 'Ana Souza',
    diaSemana: 'WEDNESDAY' as DiaSemana,
    horaInicio: '08:00:00',
    horaFim: '09:00:00',
    dataEntrada: '2026-05-11T10:00:00',
    observacao: null,
    ...dados
  };
}

describe('lista-espera utils', () => {
  describe('diaSemanaDoDia', () => {
    // 20/05/2026 é uma quarta-feira. O enum do Java começa na segunda, e
    // `Date.getDay()` no domingo: o índice não pode ser usado direto.
    it('should translate a yyyy-MM-dd into the API DayOfWeek', () => {
      expect(diaSemanaDoDia('2026-05-20')).toBe('WEDNESDAY');
      expect(diaSemanaDoDia('2026-05-17')).toBe('SUNDAY');
      expect(diaSemanaDoDia('2026-05-23')).toBe('SATURDAY');
    });

    it('should keep the studio day, not the UTC one', () => {
      expect(indiceDoDiaSemana(diaSemanaDoDia('2026-05-20'))).toBe(3);
    });
  });

  describe('faixaDoAgendamento', () => {
    it('should describe the slot a session occupies', () => {
      expect(faixaDoAgendamento('2026-05-20T08:00', 60))
        .toEqual({ diaSemana: 'WEDNESDAY', horaInicio: '08:00', horaFim: '09:00' });
    });

    // A faixa precisa de fim posterior ao início (a API recusa o contrário com
    // 400) e o instante inicial já encontra quem espera por aquele horário.
    it('should use a single minute when the duration is absent or zero', () => {
      expect(faixaDoAgendamento('2026-05-20T08:00', null))
        .toEqual({ diaSemana: 'WEDNESDAY', horaInicio: '08:00', horaFim: '08:01' });
      expect(faixaDoAgendamento('2026-05-20T08:00', 0)?.horaFim).toBe('08:01');
    });

    it('should saturate a session that would run past midnight', () => {
      expect(faixaDoAgendamento('2026-05-20T23:20', 60)?.horaFim).toBe('23:59');
    });

    it('should return null when the slot would have no duration left in the day', () => {
      expect(faixaDoAgendamento('2026-05-20T23:59', 60)).toBeNull();
    });

    it('should return null without a recognizable date and time', () => {
      expect(faixaDoAgendamento(null)).toBeNull();
      expect(faixaDoAgendamento('')).toBeNull();
      expect(faixaDoAgendamento('2026-05-20')).toBeNull();
      expect(faixaDoAgendamento('20/05/2026T08:00')).toBeNull();
    });
  });

  describe('proximaDataDoDiaSemana', () => {
    /** Quarta-feira, 20/05/2026, às 09:00. */
    const quartaDeManha = new Date(2026, 4, 20, 9, 0);

    it('should find the next occurrence later in the week', () => {
      expect(proximaDataDoDiaSemana('FRIDAY', '08:00', quartaDeManha)).toBe('2026-05-22');
    });

    it('should wrap to the following week when the weekday already passed', () => {
      expect(proximaDataDoDiaSemana('MONDAY', '08:00', quartaDeManha)).toBe('2026-05-25');
    });

    it('should keep today when the slot is still ahead', () => {
      expect(proximaDataDoDiaSemana('WEDNESDAY', '14:00', quartaDeManha)).toBe('2026-05-20');
    });

    // Pré-preencher a sessão com um horário que já passou faria a recepção
    // agendar no passado sem perceber.
    it('should skip a week when the slot already started today', () => {
      expect(proximaDataDoDiaSemana('WEDNESDAY', '08:00', quartaDeManha)).toBe('2026-05-27');
    });
  });

  describe('proximoAgendamento', () => {
    it('should build the datetime-local value of the next occurrence', () => {
      expect(proximoAgendamento(entrada(), new Date(2026, 4, 20, 9, 0))).toBe('2026-05-27T08:00');
    });

    it('should drop the seconds the API sends', () => {
      expect(proximoAgendamento(entrada({ horaInicio: '14:30:00' }), new Date(2026, 4, 20, 9, 0)))
        .toBe('2026-05-20T14:30');
    });
  });

  describe('duracaoDaFaixa', () => {
    it('should measure the slot in minutes', () => {
      expect(duracaoDaFaixa(entrada())).toBe(60);
      expect(duracaoDaFaixa(entrada({ horaInicio: '08:00:00', horaFim: '08:50:00' }))).toBe(50);
    });

    // Zero reprovaria no `min` do formulário de sessão sem explicar por quê.
    it('should return null for a range without positive duration', () => {
      expect(duracaoDaFaixa(entrada({ horaFim: '08:00:00' }))).toBeNull();
      expect(duracaoDaFaixa(entrada({ horaFim: 'manhã' }))).toBeNull();
    });
  });

  describe('formatação', () => {
    it('should format the time range', () => {
      expect(formatarFaixa(entrada())).toBe('Das 08:00 às 09:00');
    });

    it('should format weekday and range together', () => {
      expect(formatarDiaEFaixa(entrada())).toBe('Quarta, das 08:00 às 09:00');
    });

    it('should describe an entry with the patient name', () => {
      expect(descreverEspera(entrada())).toBe('Ana Souza — Quarta, das 08:00 às 09:00');
    });
  });

  describe('avisoDeInteressados', () => {
    it('should return null when nobody is waiting', () => {
      expect(avisoDeInteressados([])).toBeNull();
    });

    it('should name the single interested patient', () => {
      expect(avisoDeInteressados([entrada()]))
        .toBe('1 pessoa na lista de espera para este horário: Ana Souza — Quarta, das 08:00 às 09:00.');
    });

    // É o nome que a recepção precisa para ligar; uma contagem sozinha
    // obrigaria a abrir outra tela para descobri-lo.
    it('should name every interested patient, in the order the API returned', () => {
      const aviso = avisoDeInteressados([entrada(), entrada({ id: 2, pacienteNome: 'Bruno Lima' })]);

      expect(aviso).toBe(
        '2 pessoas na lista de espera para este horário: '
        + 'Ana Souza — Quarta, das 08:00 às 09:00; Bruno Lima — Quarta, das 08:00 às 09:00.'
      );
    });
  });
});
