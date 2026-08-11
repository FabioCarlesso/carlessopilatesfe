import { AulaResponseDTO } from '../../core/models/plano';
import { SessaoResponseDTO } from '../../core/models/sessao';
import {
  formatarDiaExtenso,
  formatarIntervalo,
  hojeIso,
  inicioDaSemana,
  intervaloDoPeriodo,
  mapearEventos,
  mapearEventosComPaciente,
  montarGrade,
  navegarPeriodo,
  ordenarEventos,
  somarDias,
  somarMeses
} from './calendario';

function sessao(dados: Partial<SessaoResponseDTO> & { id: number; dataHora: string }): SessaoResponseDTO {
  return {
    pacienteId: 10,
    nomePaciente: 'Ana Silva',
    tipo: 'PILATES',
    duracao: 50,
    profissionalId: 3,
    nomeProfissional: 'Carla Fisio',
    status: 'AGENDADA',
    observacoes: null,
    dataCriacao: '2026-05-01T09:00:00',
    dataAtualizacao: null,
    ...dados
  };
}

function aula(dados: Partial<AulaResponseDTO> & { id: number; data: string }): AulaResponseDTO {
  return {
    pacienteId: 10,
    pacienteNome: 'Ana Silva',
    pagamentoId: 1,
    realizada: false,
    profissionalId: null,
    profissionalNome: null,
    ...dados
  };
}

describe('calendario', () => {
  describe('aritmética de datas', () => {
    it('should read the ISO day from local components', () => {
      expect(hojeIso(new Date(2026, 4, 20, 23, 30))).toBe('2026-05-20');
    });

    it('should add days across month boundaries', () => {
      expect(somarDias('2026-05-31', 1)).toBe('2026-06-01');
      expect(somarDias('2026-03-01', -1)).toBe('2026-02-28');
    });

    // Sem o limite explícito o `setMonth` transbordaria 31/01 para 03/03 e a
    // navegação pularia fevereiro inteiro.
    it('should clamp the day when the target month is shorter', () => {
      expect(somarMeses('2026-01-31', 1)).toBe('2026-02-28');
    });

    it('should add months across the year boundary in both directions', () => {
      expect(somarMeses('2026-12-15', 1)).toBe('2027-01-15');
      expect(somarMeses('2026-01-15', -1)).toBe('2025-12-15');
    });

    it('should resolve the sunday of the week', () => {
      // 20/05/2026 é quarta-feira.
      expect(inicioDaSemana('2026-05-20')).toBe('2026-05-17');
      // Domingo é o próprio início.
      expect(inicioDaSemana('2026-05-17')).toBe('2026-05-17');
    });

    it('should format a day in full', () => {
      expect(formatarDiaExtenso('2026-05-20')).toBe('20 de maio de 2026');
    });

    it('should shorten what both ends of the interval share', () => {
      expect(formatarIntervalo('2026-05-17', '2026-05-23')).toBe('17 a 23 de maio de 2026');
      expect(formatarIntervalo('2026-04-26', '2026-05-02')).toBe('26 de abril a 2 de maio de 2026');
      expect(formatarIntervalo('2026-12-27', '2027-01-02'))
        .toBe('27 de dezembro de 2026 a 2 de janeiro de 2027');
    });
  });

  describe('mapearEventos', () => {
    it('should map a session with its time, type, status and edit link', () => {
      const [evento] = mapearEventos([sessao({ id: 7, dataHora: '2026-05-20T14:00' })], []);

      expect(evento.chave).toBe('sessao-7');
      expect(evento.origem).toBe('SESSAO');
      expect(evento.dia).toBe('2026-05-20');
      expect(evento.horario).toBe('14:00');
      expect(evento.titulo).toBe('Pilates');
      expect(evento.rotulo).toBe('Sessão: Pilates');
      expect(evento.status).toBe('AGENDADA');
      expect(evento.statusLabel).toBe('Agendada');
      expect(evento.profissional).toBe('Carla Fisio');
      expect(evento.link).toEqual(['/pacientes', 10, 'sessoes', 7, 'editar']);
      expect(evento.descricao)
        .toBe('20 de maio de 2026, Sessão: Pilates, às 14:00, agendada, com Carla Fisio');
    });

    // A API de aulas guarda só a data, então o horário fica nulo em vez de
    // virar "00:00", e o clique cai na listagem de aulas — a aula não tem tela
    // individual.
    it('should map a class without a time and link to the class list', () => {
      const [evento] = mapearEventos([], [aula({ id: 3, data: '2026-05-21', realizada: true })]);

      expect(evento.chave).toBe('aula-3');
      expect(evento.origem).toBe('AULA');
      expect(evento.horario).toBeNull();
      expect(evento.titulo).toBe('Aula');
      // A aula nao tem tipo: origem e titulo sao a mesma palavra, e concatenar
      // os dois renderizaria "Aula: Aula".
      expect(evento.rotulo).toBe('Aula');
      expect(evento.status).toBe('REALIZADA');
      expect(evento.link).toEqual(['/aulas', 'paciente', 10]);
      expect(evento.descricao).toBe('21 de maio de 2026, Aula, sem horário definido, realizada');
    });

    it('should translate the class boolean into the session vocabulary', () => {
      const eventos = mapearEventos([], [
        aula({ id: 1, data: '2026-05-21', realizada: false }),
        aula({ id: 2, data: '2026-05-22', realizada: true })
      ]);

      expect(eventos.map(evento => evento.statusLabel)).toEqual(['Agendada', 'Realizada']);
    });

    it('should order events chronologically, leaving the timeless class last in the day', () => {
      const eventos = mapearEventos(
        [
          sessao({ id: 1, dataHora: '2026-05-20T16:00' }),
          sessao({ id: 2, dataHora: '2026-05-20T08:30' }),
          sessao({ id: 3, dataHora: '2026-05-19T10:00' })
        ],
        [aula({ id: 4, data: '2026-05-20' })]
      );

      expect(eventos.map(evento => evento.chave))
        .toEqual(['sessao-3', 'sessao-2', 'sessao-1', 'aula-4']);
    });

    it('should not mutate the received collection when ordering', () => {
      const eventos = mapearEventos([sessao({ id: 1, dataHora: '2026-05-20T16:00' })], []);
      const ordenados = ordenarEventos(eventos);

      expect(ordenados).not.toBe(eventos);
    });
  });

  // Agenda do estúdio (issue #125): as mesmas duas coleções, mas de pacientes
  // diferentes — o nome de cada um passa a identificar o evento.
  describe('mapearEventosComPaciente', () => {
    it('should title the event with the patient and keep the type in the label', () => {
      const [evento] = mapearEventosComPaciente(
        [sessao({ id: 7, dataHora: '2026-05-20T14:00', pacienteId: 42, nomePaciente: 'Bruno Costa' })],
        []
      );

      expect(evento.titulo).toBe('Bruno Costa');
      expect(evento.paciente).toBe('Bruno Costa');
      expect(evento.rotulo).toBe('Sessão: Pilates');
      expect(evento.pacienteId).toBe(42);
      expect(evento.profissionalId).toBe(3);
      expect(evento.link).toEqual(['/pacientes', 42, 'sessoes', 7, 'editar']);
      expect(evento.descricao)
        .toBe('20 de maio de 2026, Sessão: Pilates, Bruno Costa, às 14:00, agendada, com Carla Fisio');
    });

    it('should title the class with the patient and link to that patient class list', () => {
      const [evento] = mapearEventosComPaciente(
        [],
        [aula({ id: 3, data: '2026-05-21', pacienteId: 42, pacienteNome: 'Bruno Costa', profissionalId: 8 })]
      );

      expect(evento.titulo).toBe('Bruno Costa');
      expect(evento.rotulo).toBe('Aula');
      expect(evento.profissionalId).toBe(8);
      expect(evento.link).toEqual(['/aulas', 'paciente', 42]);
      expect(evento.descricao).toBe('21 de maio de 2026, Aula, Bruno Costa, sem horário definido, agendada');
    });

    // O calendário do paciente não repete o nome em cada chip: o cabeçalho da
    // tela já o nomeia, e a frase acessível segue idêntica à de antes da #125.
    it('should leave the patient out of the single-patient calendar', () => {
      const [evento] = mapearEventos([sessao({ id: 7, dataHora: '2026-05-20T14:00' })], []);

      expect(evento.paciente).toBeNull();
      expect(evento.titulo).toBe('Pilates');
      expect(evento.descricao)
        .toBe('20 de maio de 2026, Sessão: Pilates, às 14:00, agendada, com Carla Fisio');
    });

    it('should order events of different patients chronologically', () => {
      const eventos = mapearEventosComPaciente(
        [
          sessao({ id: 1, dataHora: '2026-05-20T16:00', pacienteId: 1, nomePaciente: 'Ana' }),
          sessao({ id: 2, dataHora: '2026-05-20T08:30', pacienteId: 2, nomePaciente: 'Bruno' })
        ],
        [aula({ id: 4, data: '2026-05-20', pacienteId: 3, pacienteNome: 'Carlos' })]
      );

      expect(eventos.map(evento => evento.chave)).toEqual(['sessao-2', 'sessao-1', 'aula-4']);
    });
  });

  describe('montarGrade — visão mensal', () => {
    // 01/05/2026 é sexta-feira e maio tem 31 dias: a grade abre no domingo
    // 26/04 e precisa de 6 linhas para fechar as semanas.
    it('should start on sunday and pad the edges with the neighbouring months', () => {
      const grade = montarGrade('mensal', '2026-05-20', [], '2026-05-20');

      expect(grade.semanas.length).toBe(6);
      expect(grade.dias.length).toBe(42);
      expect(grade.dias[0].dia).toBe('2026-04-26');
      expect(grade.dias[0].doPeriodo).toBeFalse();
      expect(grade.dias[5].dia).toBe('2026-05-01');
      expect(grade.dias[5].doPeriodo).toBeTrue();
      expect(grade.dias[grade.dias.length - 1].dia).toBe('2026-06-06');
      expect(grade.dias[grade.dias.length - 1].doPeriodo).toBeFalse();
    });

    // Fevereiro de 2026 começa num domingo e tem 28 dias: cabe em 4 linhas, e
    // uma quinta linha vazia só empurraria o conteúdo para fora da dobra.
    it('should use only the rows the month needs', () => {
      const grade = montarGrade('mensal', '2026-02-10', [], '2026-05-20');

      expect(grade.semanas.length).toBe(4);
      expect(grade.dias[0].dia).toBe('2026-02-01');
      expect(grade.dias[27].dia).toBe('2026-02-28');
      expect(grade.dias.every(dia => dia.doPeriodo)).toBeTrue();
    });

    it('should title the period with the month and the year', () => {
      expect(montarGrade('mensal', '2026-05-20', [], '2026-05-20').titulo).toBe('Maio de 2026');
    });

    it('should mark today only on the matching cell', () => {
      const grade = montarGrade('mensal', '2026-05-20', [], '2026-05-20');
      const hoje = grade.dias.filter(dia => dia.hoje);

      expect(hoje.length).toBe(1);
      expect(hoje[0].dia).toBe('2026-05-20');
    });

    it('should place each event on its own day', () => {
      const eventos = mapearEventos(
        [sessao({ id: 1, dataHora: '2026-05-20T14:00' })],
        [aula({ id: 2, data: '2026-05-21' })]
      );
      const grade = montarGrade('mensal', '2026-05-20', eventos, '2026-05-20');
      const porDia = new Map(grade.dias.map(dia => [dia.dia, dia.eventos.map(evento => evento.chave)]));

      expect(porDia.get('2026-05-20')).toEqual(['sessao-1']);
      expect(porDia.get('2026-05-21')).toEqual(['aula-2']);
      expect(porDia.get('2026-05-22')).toEqual([]);
    });

    // O evento do mês vizinho continua desenhado na célula de preenchimento,
    // mas não entra no total anunciado — que é do período, não da grade.
    it('should count only the events inside the month', () => {
      const eventos = mapearEventos(
        [
          sessao({ id: 1, dataHora: '2026-05-20T14:00' }),
          sessao({ id: 2, dataHora: '2026-04-27T09:00' })
        ],
        []
      );
      const grade = montarGrade('mensal', '2026-05-20', eventos, '2026-05-20');

      expect(grade.totalEventos).toBe(1);
      expect(grade.dias.find(dia => dia.dia === '2026-04-27')?.eventos.length).toBe(1);
    });
  });

  describe('montarGrade — visão semanal', () => {
    it('should build a single week from sunday to saturday', () => {
      const grade = montarGrade('semanal', '2026-05-20', [], '2026-05-20');

      expect(grade.semanas.length).toBe(1);
      expect(grade.dias.length).toBe(7);
      expect(grade.dias[0].dia).toBe('2026-05-17');
      expect(grade.dias[6].dia).toBe('2026-05-23');
      expect(grade.titulo).toBe('17 a 23 de maio de 2026');
    });

    // Na semana não existe "dia de fora": ela é o período inteiro, mesmo
    // atravessando a virada de mês.
    it('should keep every day inside the period when the week crosses months', () => {
      const grade = montarGrade('semanal', '2026-04-28', [], '2026-05-20');

      expect(grade.dias.every(dia => dia.doPeriodo)).toBeTrue();
      expect(grade.titulo).toBe('26 de abril a 2 de maio de 2026');
    });
  });

  describe('montarGrade — visão diária', () => {
    it('should build a single cell for the reference day', () => {
      const grade = montarGrade('diaria', '2026-05-20', [], '2026-05-20');

      expect(grade.dias.length).toBe(1);
      expect(grade.semanas.length).toBe(1);
      expect(grade.dias[0].dia).toBe('2026-05-20');
      expect(grade.dias[0].doPeriodo).toBeTrue();
      expect(grade.dias[0].hoje).toBeTrue();
    });

    // 20/05/2026 é quarta-feira. O dia da semana entra no título porque, sem a
    // grade de 7 colunas, é a única pista de onde o dia cai.
    it('should title the period with the weekday', () => {
      expect(montarGrade('diaria', '2026-05-20', [], '2026-05-19').titulo)
        .toBe('Quarta-feira, 20 de maio de 2026');
    });

    it('should count only the events of the day', () => {
      const eventos = mapearEventosComPaciente(
        [
          sessao({ id: 1, dataHora: '2026-05-20T14:00' }),
          sessao({ id: 2, dataHora: '2026-05-21T09:00' })
        ],
        []
      );
      const grade = montarGrade('diaria', '2026-05-20', eventos, '2026-05-20');

      expect(grade.totalEventos).toBe(1);
      expect(grade.dias[0].eventos.map(evento => evento.chave)).toEqual(['sessao-1']);
    });
  });

  // A agenda do estúdio busca por período no servidor e precisa do intervalo
  // antes de montar a grade.
  describe('intervaloDoPeriodo', () => {
    it('should return the day itself in the daily view', () => {
      expect(intervaloDoPeriodo('diaria', '2026-05-20')).toEqual({ inicio: '2026-05-20', fim: '2026-05-20' });
    });

    it('should return sunday to saturday in the weekly view', () => {
      expect(intervaloDoPeriodo('semanal', '2026-05-20')).toEqual({ inicio: '2026-05-17', fim: '2026-05-23' });
    });

    // No mensal o intervalo cobre também as células de preenchimento: sem elas
    // a primeira e a última semana da tela viriam vazias.
    it('should cover the padding cells in the monthly view', () => {
      expect(intervaloDoPeriodo('mensal', '2026-05-20')).toEqual({ inicio: '2026-04-26', fim: '2026-06-06' });
    });
  });

  describe('navegarPeriodo', () => {
    it('should move by month in the monthly view', () => {
      expect(navegarPeriodo('mensal', '2026-05-20', 1)).toBe('2026-06-20');
      expect(navegarPeriodo('mensal', '2026-05-20', -1)).toBe('2026-04-20');
    });

    it('should move by week in the weekly view', () => {
      expect(navegarPeriodo('semanal', '2026-05-20', 1)).toBe('2026-05-27');
      expect(navegarPeriodo('semanal', '2026-05-20', -1)).toBe('2026-05-13');
    });

    it('should move by day in the daily view', () => {
      expect(navegarPeriodo('diaria', '2026-05-31', 1)).toBe('2026-06-01');
      expect(navegarPeriodo('diaria', '2026-05-01', -1)).toBe('2026-04-30');
    });
  });
});
