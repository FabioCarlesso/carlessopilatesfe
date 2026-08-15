import { AulaResponseDTO } from '../../core/models/plano';
import {
  SessaoResponseDTO,
  SessaoStatus,
  SessaoTipo,
  SESSAO_STATUS_LABEL,
  SESSAO_TIPO_LABEL
} from '../../core/models/sessao';

/**
 * Montagem da grade do calendário e mapeamento de sessões e aulas para os
 * eventos exibidos (issues #119, #125 e #126). Tudo aqui é função pura, sem DOM
 * e sem injeção: a tela só decide o período visível e delega o resto, e o spec
 * asserta a grade sem precisar renderizar o componente.
 *
 * O que muda entre as telas é apenas quem identifica o evento: no calendário de
 * um paciente (`mapearEventos`) o cabeçalho já o nomeia, e o chip mostra o tipo;
 * na agenda do estúdio e na de um profissional (`mapearEventosComPaciente`) os
 * eventos misturam pacientes, e é o nome deles que identifica cada linha.
 *
 * Nenhuma data é construída a partir de string ISO com `new Date(iso)`: o
 * construtor interpreta `2026-05-20` como **UTC** e devolveria 19/05 em
 * qualquer fuso a oeste de Greenwich — que é o do estúdio. As datas circulam
 * como `yyyy-MM-dd` e só viram `Date` pelo construtor numérico
 * (`new Date(ano, mes - 1, dia)`), que é local por definição, para as
 * operações que exigem calendário de verdade (dia da semana, fim de mês).
 */

/**
 * A visão diária existe para a agenda do estúdio (issue #125), onde um único
 * dia já reúne os atendimentos de todos os pacientes; o calendário do paciente
 * continua oferecendo só mensal e semanal.
 */
export type CalendarioVisao = 'mensal' | 'semanal' | 'diaria';

/** De onde o evento veio: os dois recursos já consumidos pelo prontuário. */
export type CalendarioOrigem = 'SESSAO' | 'AULA';

/**
 * Situação do evento. Coincide com o status da sessão de propósito: a aula não
 * tem status próprio na API (só o booleano `realizada`) e é traduzida para o
 * mesmo vocabulário, de modo que a legenda da tela tenha uma escala só.
 */
export type CalendarioStatus = SessaoStatus;

export const CALENDARIO_STATUS_LABEL = SESSAO_STATUS_LABEL;

export const CALENDARIO_ORIGEM_LABEL: Record<CalendarioOrigem, string> = {
  SESSAO: 'Sessão',
  AULA: 'Aula'
};

/** Cabeçalho das colunas. A semana começa no domingo, como no calendário brasileiro. */
export const DIAS_SEMANA_ABREVIADO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const DIAS_SEMANA_EXTENSO = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado'
];

/**
 * Nomes em minúscula porque entram no meio das frases dos rótulos acessíveis
 * ("20 de maio de 2026"); o título do período capitaliza na hora de exibir.
 * Constante local em vez do `DatePipe` com `LOCALE_ID`: o pipe exigiria
 * registrar o locale em cada spec para o mês sair em português, e a grade é
 * justamente o que os testes precisam montar sem TestBed.
 */
export const MESES_LABEL = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro'
];

export interface CalendarioEvento {
  /** Estável entre remontagens da grade, para o `track` do template. */
  chave: string;
  origem: CalendarioOrigem;
  id: number;
  /** `yyyy-MM-dd`. */
  dia: string;
  /** `HH:mm`, ou `null` na aula — a API de aulas só guarda a data. */
  horario: string | null;
  /**
   * Duração em minutos da sessão; `null` na aula, que não tem duração na API.
   * A agenda a usa para descobrir a faixa que um cancelamento libera e
   * consultar a lista de espera (issue #137) — sem ela, o aviso encontraria
   * apenas quem espera pelo instante inicial, e não pelo horário inteiro.
   */
  duracao: number | null;
  titulo: string;
  /**
   * "Sessão: Pilates" — origem e tipo juntos, para a linha da agenda e para a
   * descrição. A aula não tem tipo (o `titulo` já é a própria palavra "Aula") e
   * fica só com "Aula", em vez de "Aula: Aula".
   */
  rotulo: string;
  status: CalendarioStatus;
  statusLabel: string;
  /**
   * Tipo da sessão, `null` na aula — que não tem tipo na API. É o que a agenda
   * do estúdio filtra; o `titulo` não serve, porque lá ele é o nome do paciente.
   */
  tipo: SessaoTipo | null;
  profissional: string | null;
  /** Necessário para "realizar" a aula, que exige o profissional no `PATCH`. */
  profissionalId: number | null;
  pacienteId: number;
  /**
   * Nome do paciente, ou `null` no calendário de um paciente só — ali o
   * cabeçalho da tela já o nomeia, e repeti-lo em cada chip seria ruído.
   */
  paciente: string | null;
  /**
   * Frase completa do evento. É o `aria-label` do chip (que na célula mostra
   * apenas horário e tipo) e também o `title` do mouse.
   */
  descricao: string;
  /** Destino do clique, já no formato do `routerLink`. */
  link: (string | number)[];
}

export interface CalendarioDia {
  /** `yyyy-MM-dd`; também o `track` da célula. */
  dia: string;
  numero: number;
  /**
   * Falso nas células de preenchimento das pontas da grade mensal — os dias do
   * mês vizinho que completam a primeira e a última semana.
   */
  doPeriodo: boolean;
  hoje: boolean;
  /** "20 de maio de 2026", para o rótulo acessível da célula. */
  rotulo: string;
  eventos: CalendarioEvento[];
}

export interface CalendarioSemana {
  chave: string;
  dias: CalendarioDia[];
}

export interface CalendarioGrade {
  visao: CalendarioVisao;
  /** Dia âncora do período exibido; a navegação sempre parte dele. */
  referencia: string;
  /** "Maio de 2026" ou "18 a 24 de maio de 2026". */
  titulo: string;
  semanas: CalendarioSemana[];
  /** As mesmas células das semanas, achatadas — o layout de lista do mobile itera por dia. */
  dias: CalendarioDia[];
  totalEventos: number;
}

function doisDigitos(valor: number): string {
  return `${valor}`.padStart(2, '0');
}

/** `yyyy-MM-dd` de um `Date`, lendo os componentes locais (nunca `toISOString`). */
export function diaIso(data: Date): string {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
}

/** `Date` na meia-noite local do dia informado. */
export function paraData(dia: string): Date {
  const [ano, mes, numero] = dia.slice(0, 10).split('-').map(Number);
  return new Date(ano, mes - 1, numero);
}

export function hojeIso(agora: Date = new Date()): string {
  return diaIso(agora);
}

export function somarDias(dia: string, quantidade: number): string {
  const data = paraData(dia);
  data.setDate(data.getDate() + quantidade);
  return diaIso(data);
}

export function diasNoMes(ano: number, mes: number): number {
  // Dia 0 do mês seguinte é o último dia deste mês.
  return new Date(ano, mes, 0).getDate();
}

/**
 * Soma meses preservando o dia sempre que ele existir no mês de destino. Sem o
 * limite explícito, 31/01 + 1 mês estouraria para 03/03 pelo transbordo do
 * `setMonth`, e a navegação pularia fevereiro inteiro.
 */
export function somarMeses(dia: string, quantidade: number): string {
  const data = paraData(dia);
  const alvo = data.getMonth() + quantidade;
  const ano = data.getFullYear() + Math.floor(alvo / 12);
  const mes = ((alvo % 12) + 12) % 12;
  const numero = Math.min(data.getDate(), diasNoMes(ano, mes + 1));
  return `${ano}-${doisDigitos(mes + 1)}-${doisDigitos(numero)}`;
}

/** Domingo da semana que contém o dia informado. */
export function inicioDaSemana(dia: string): string {
  return somarDias(dia, -paraData(dia).getDay());
}

/** "20 de maio de 2026". */
export function formatarDiaExtenso(dia: string): string {
  const data = paraData(dia);
  return `${data.getDate()} de ${MESES_LABEL[data.getMonth()]} de ${data.getFullYear()}`;
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * "18 a 24 de maio de 2026", encurtando o que as duas pontas têm em comum;
 * semana que atravessa mês ou ano repete o que mudou.
 */
export function formatarIntervalo(inicio: string, fim: string): string {
  const de = paraData(inicio);
  const ate = paraData(fim);
  const mesDe = MESES_LABEL[de.getMonth()];
  const mesAte = MESES_LABEL[ate.getMonth()];

  if (de.getFullYear() !== ate.getFullYear()) {
    return `${de.getDate()} de ${mesDe} de ${de.getFullYear()} a ${ate.getDate()} de ${mesAte} de ${ate.getFullYear()}`;
  }
  if (de.getMonth() !== ate.getMonth()) {
    return `${de.getDate()} de ${mesDe} a ${ate.getDate()} de ${mesAte} de ${ate.getFullYear()}`;
  }
  return `${de.getDate()} a ${ate.getDate()} de ${mesAte} de ${ate.getFullYear()}`;
}

function rotular(origemLabel: string, titulo: string): string {
  return origemLabel === titulo ? origemLabel : `${origemLabel}: ${titulo}`;
}

function descrever(evento: Omit<CalendarioEvento, 'descricao'>): string {
  const partes = [evento.rotulo];
  // Só a agenda do estúdio preenche `paciente`; no calendário de um paciente
  // só, a frase segue idêntica ao que era antes da issue #125.
  if (evento.paciente) partes.push(evento.paciente);
  partes.push(evento.horario ? `às ${evento.horario}` : 'sem horário definido');
  partes.push(evento.statusLabel.toLowerCase());
  if (evento.profissional) partes.push(`com ${evento.profissional}`);
  return `${formatarDiaExtenso(evento.dia)}, ${partes.join(', ')}`;
}

function eventoDaSessao(sessao: SessaoResponseDTO, comPaciente: boolean): CalendarioEvento {
  // O `??` cobre um tipo que o backend passe a devolver e o front ainda não
  // conheça: cai na string crua em vez de `undefined`. Fica em constante
  // porque `titulo` e `rotulo` consomem o mesmo valor.
  const tipo = SESSAO_TIPO_LABEL[sessao.tipo] ?? sessao.tipo;
  const base = {
    chave: `sessao-${sessao.id}`,
    origem: 'SESSAO' as const,
    id: sessao.id,
    dia: sessao.dataHora.slice(0, 10),
    horario: sessao.dataHora.slice(11, 16) || null,
    duracao: sessao.duracao,
    // Na agenda do estúdio quem identifica a linha é o paciente: o tipo se
    // repete a tarde inteira e o nome é o que a recepção procura na grade.
    titulo: comPaciente ? sessao.nomePaciente : tipo,
    rotulo: rotular(CALENDARIO_ORIGEM_LABEL.SESSAO, tipo),
    status: sessao.status,
    statusLabel: CALENDARIO_STATUS_LABEL[sessao.status] ?? sessao.status,
    tipo: sessao.tipo,
    profissional: sessao.nomeProfissional,
    profissionalId: sessao.profissionalId,
    pacienteId: sessao.pacienteId,
    paciente: comPaciente ? sessao.nomePaciente : null,
    link: ['/pacientes', sessao.pacienteId, 'sessoes', sessao.id, 'editar']
  };
  return { ...base, descricao: descrever(base) };
}

function eventoDaAula(aula: AulaResponseDTO, comPaciente: boolean): CalendarioEvento {
  const base = {
    chave: `aula-${aula.id}`,
    origem: 'AULA' as const,
    id: aula.id,
    dia: aula.data.slice(0, 10),
    // A API de aulas guarda apenas a data: o horário da aula é o do plano,
    // que não vem no DTO. Fica nulo em vez de virar "00:00", que mentiria.
    horario: null,
    duracao: null,
    titulo: comPaciente ? aula.pacienteNome : CALENDARIO_ORIGEM_LABEL.AULA,
    rotulo: rotular(CALENDARIO_ORIGEM_LABEL.AULA, CALENDARIO_ORIGEM_LABEL.AULA),
    status: (aula.realizada ? 'REALIZADA' : 'AGENDADA') as CalendarioStatus,
    statusLabel: aula.realizada ? CALENDARIO_STATUS_LABEL.REALIZADA : CALENDARIO_STATUS_LABEL.AGENDADA,
    tipo: null,
    profissional: aula.profissionalNome ?? null,
    profissionalId: aula.profissionalId ?? null,
    pacienteId: aula.pacienteId,
    paciente: comPaciente ? aula.pacienteNome : null,
    link: ['/aulas', 'paciente', aula.pacienteId]
  };
  return { ...base, descricao: descrever(base) };
}

/**
 * Traduz sessões e aulas para a moeda única da grade. As duas listas chegam de
 * endpoints diferentes (`/sessoes/paciente/{id}` e `/aulas/paciente/{id}`) e
 * com contratos diferentes — a sessão tem data e hora, tipo e status; a aula
 * tem só a data e o booleano `realizada` —, e é aqui que essa diferença acaba.
 *
 * O destino do clique sai do próprio DTO: a sessão abre a própria edição e a
 * aula, que não tem tela individual, cai na listagem de aulas do paciente,
 * onde a presença é confirmada.
 */
export function mapearEventos(sessoes: SessaoResponseDTO[], aulas: AulaResponseDTO[]): CalendarioEvento[] {
  return ordenarEventos([
    ...sessoes.map(sessao => eventoDaSessao(sessao, false)),
    ...aulas.map(aula => eventoDaAula(aula, false))
  ]);
}

/**
 * Mesma tradução para as agendas que misturam pacientes: a do estúdio
 * (issue #125) e a de um profissional (issue #126). As listas vêm dos endpoints
 * por período (`/sessoes` e `/aulas`), então o nome do paciente entra no título
 * do chip e na frase acessível — é ele que identifica a linha quando o
 * cabeçalho da tela não o nomeia.
 */
export function mapearEventosComPaciente(
  sessoes: SessaoResponseDTO[],
  aulas: AulaResponseDTO[]
): CalendarioEvento[] {
  return ordenarEventos([
    ...sessoes.map(sessao => eventoDaSessao(sessao, true)),
    ...aulas.map(aula => eventoDaAula(aula, true))
  ]);
}

/**
 * Cronológica dentro do dia. A aula não tem horário e vai para o fim do dia,
 * depois das sessões marcadas — não para o começo, que a faria parecer a
 * primeira atividade da manhã.
 */
export function ordenarEventos(eventos: CalendarioEvento[]): CalendarioEvento[] {
  return [...eventos].sort((a, b) => {
    if (a.dia !== b.dia) return a.dia.localeCompare(b.dia);
    if (a.horario !== b.horario) {
      if (a.horario === null) return 1;
      if (b.horario === null) return -1;
      return a.horario.localeCompare(b.horario);
    }
    if (a.origem !== b.origem) return a.origem === 'SESSAO' ? -1 : 1;
    return a.id - b.id;
  });
}

function agruparPorDia(eventos: CalendarioEvento[]): Map<string, CalendarioEvento[]> {
  const porDia = new Map<string, CalendarioEvento[]>();
  ordenarEventos(eventos).forEach(evento => {
    const doDia = porDia.get(evento.dia);
    if (doDia) doDia.push(evento);
    else porDia.set(evento.dia, [evento]);
  });
  return porDia;
}

/**
 * Primeira célula e quantidade de células do período.
 *
 * No mensal a grade sempre começa num domingo e fecha semanas inteiras, então
 * sobram dias do mês vizinho nas pontas. O número de linhas é calculado, e não
 * fixado em 6: fevereiro que começa no domingo cabe em 4 linhas, e uma quinta
 * ou sexta linha vazia só empurraria o conteúdo para fora da dobra.
 */
function limitesDoPeriodo(visao: CalendarioVisao, referencia: string): { inicio: string; celulas: number } {
  if (visao === 'diaria') {
    return { inicio: referencia, celulas: 1 };
  }
  if (visao === 'semanal') {
    return { inicio: inicioDaSemana(referencia), celulas: 7 };
  }

  const data = paraData(referencia);
  const ano = data.getFullYear();
  const mes = data.getMonth() + 1;
  const primeiro = `${ano}-${doisDigitos(mes)}-01`;
  const deslocamento = paraData(primeiro).getDay();
  return {
    inicio: somarDias(primeiro, -deslocamento),
    celulas: Math.ceil((deslocamento + diasNoMes(ano, mes)) / 7) * 7
  };
}

/**
 * Primeiro e último dia visíveis do período, ambos inclusive. A agenda do
 * estúdio (issue #125) busca por período no servidor e precisa desse intervalo
 * **antes** de montar a grade; no mensal ele cobre também os dias do mês
 * vizinho que aparecem nas pontas, senão a primeira e a última semana da tela
 * viriam vazias.
 */
export function intervaloDoPeriodo(visao: CalendarioVisao, referencia: string): { inicio: string; fim: string } {
  const { inicio, celulas } = limitesDoPeriodo(visao, referencia);
  return { inicio, fim: somarDias(inicio, celulas - 1) };
}

/** "Quarta-feira, 20 de maio de 2026" — título da visão diária. */
function formatarDiaComSemana(dia: string): string {
  return `${capitalizar(DIAS_SEMANA_EXTENSO[paraData(dia).getDay()])}, ${formatarDiaExtenso(dia)}`;
}

function tituloDoPeriodo(visao: CalendarioVisao, referencia: string, dias: CalendarioDia[]): string {
  if (visao === 'diaria') return formatarDiaComSemana(referencia);
  if (visao === 'semanal') return formatarIntervalo(dias[0].dia, dias[dias.length - 1].dia);
  const data = paraData(referencia);
  return capitalizar(`${MESES_LABEL[data.getMonth()]} de ${data.getFullYear()}`);
}

/**
 * Monta a grade do período a partir dos eventos já mapeados. Recebe `hoje` em
 * vez de consultar o relógio para que o spec possa fixar a data de referência.
 */
export function montarGrade(
  visao: CalendarioVisao,
  referencia: string,
  eventos: CalendarioEvento[],
  hoje: string
): CalendarioGrade {
  const porDia = agruparPorDia(eventos);
  const { inicio, celulas } = limitesDoPeriodo(visao, referencia);
  const mesReferencia = referencia.slice(0, 7);

  const dias: CalendarioDia[] = [];
  for (let indice = 0; indice < celulas; indice++) {
    const dia = somarDias(inicio, indice);
    dias.push({
      dia,
      numero: paraData(dia).getDate(),
      // Fora do mensal toda célula é do período: nem a semana nem o dia têm
      // "célula de fora" — só a grade do mês completa as pontas.
      doPeriodo: visao !== 'mensal' || dia.slice(0, 7) === mesReferencia,
      hoje: dia === hoje,
      rotulo: formatarDiaExtenso(dia),
      eventos: porDia.get(dia) ?? []
    });
  }

  const semanas: CalendarioSemana[] = [];
  for (let inicioSemana = 0; inicioSemana < dias.length; inicioSemana += 7) {
    const daSemana = dias.slice(inicioSemana, inicioSemana + 7);
    semanas.push({ chave: daSemana[0].dia, dias: daSemana });
  }

  return {
    visao,
    referencia,
    titulo: tituloDoPeriodo(visao, referencia, dias),
    semanas,
    dias,
    // Só o que está dentro do período: as células de preenchimento do mês
    // vizinho aparecem esmaecidas e não entram na contagem do resumo.
    totalEventos: dias.reduce((total, dia) => total + (dia.doPeriodo ? dia.eventos.length : 0), 0)
  };
}

/** Dia âncora do período anterior (`-1`) ou seguinte (`1`) da visão atual. */
export function navegarPeriodo(visao: CalendarioVisao, referencia: string, direcao: -1 | 1): string {
  if (visao === 'mensal') return somarMeses(referencia, direcao);
  return somarDias(referencia, (visao === 'diaria' ? 1 : 7) * direcao);
}
