import { ListaEsperaResponseDTO } from '../../core/models/lista-espera';
import { DiaSemana, DIAS_SEMANA_LABEL } from '../../core/models/plano';
import { diaIso, paraData, somarDias } from './calendario';
import { horaDeMinutos, minutosDoDia, normalizarHora } from './hora';

/**
 * Leitura da lista de espera (issue #137), compartilhada pela tela da fila,
 * pela agenda do estúdio e pela listagem de sessões do paciente.
 *
 * A fila é descrita por **dia da semana + faixa de horário**, e não por data:
 * quem espera pela quarta das 08:00 continua esperando na semana seguinte. As
 * duas conversões que essa diferença exige — de uma data para o dia da semana
 * (aviso de cancelamento) e de um dia da semana para a próxima data (conversão
 * em sessão) — vivem aqui, sem DOM e sem injeção, com cobertura própria.
 */

/**
 * `DayOfWeek` da API na ordem de `Date.getDay()`, em que 0 é domingo. O enum do
 * Java começa na segunda; indexar por ele devolveria o dia errado.
 */
const DIA_SEMANA_POR_INDICE: DiaSemana[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY'
];

/** Faixa consultável em `GET /lista-espera`. */
export interface FaixaDeEspera {
  diaSemana: DiaSemana;
  /** `HH:mm`. */
  horaInicio: string;
  horaFim: string;
}

/** Dia da semana de um `yyyy-MM-dd`, sem passar por construtor de `Date` com ISO. */
export function diaSemanaDoDia(dia: string): DiaSemana {
  return DIA_SEMANA_POR_INDICE[paraData(dia).getDay()];
}

/** Posição do dia da semana em `Date.getDay()` (0 = domingo). */
export function indiceDoDiaSemana(diaSemana: DiaSemana): number {
  return DIA_SEMANA_POR_INDICE.indexOf(diaSemana);
}

/**
 * Faixa que um agendamento ocupa, no formato que a consulta da fila aceita — a
 * API cruza faixas por **interseção**, então perguntar por ela encontra também
 * quem se inscreveu para um pedaço do horário.
 *
 * Duração ausente ou zero vira um minuto: a faixa precisa ter fim posterior ao
 * início (a API recusa o contrário com `400`), e o instante inicial já basta
 * para achar quem espera por aquele horário. O fim satura em 23:59 pelo mesmo
 * motivo — uma sessão noturna que avançasse para o dia seguinte não tem como
 * ser descrita numa faixa de um dia só.
 *
 * Devolve `null` quando `dataHora` não traz um horário reconhecível, e aí não
 * há o que consultar.
 */
export function faixaDoAgendamento(
  dataHora: string | null | undefined,
  duracaoMinutos?: number | null
): FaixaDeEspera | null {
  if (!dataHora) return null;
  const [dia, hora] = dataHora.split('T');
  const inicio = minutosDoDia(hora);
  if (inicio === null || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) return null;

  const duracao = Number(duracaoMinutos);
  const fim = inicio + (Number.isFinite(duracao) && duracao > 0 ? duracao : 1);
  const horaInicio = horaDeMinutos(inicio);
  const horaFim = horaDeMinutos(fim);
  // Sessão que começa 23:59 satura as duas pontas no mesmo minuto, e faixa de
  // duração zero é `400` na API. Não há fila a consultar num minuto que acaba
  // junto com o dia.
  if (horaFim <= horaInicio) return null;

  return { diaSemana: diaSemanaDoDia(dia), horaInicio, horaFim };
}

/**
 * Próxima data (`yyyy-MM-dd`) em que o dia da semana acontece, a partir de
 * `hoje` inclusive — mas pulando para a semana seguinte quando o horário do dia
 * corrente já passou, para que a conversão em sessão não pré-preencha um
 * agendamento no passado.
 */
export function proximaDataDoDiaSemana(diaSemana: DiaSemana, horaInicio: string, agora: Date): string {
  const hoje = diaIso(agora);
  const distancia = (indiceDoDiaSemana(diaSemana) - agora.getDay() + 7) % 7;
  if (distancia > 0) return somarDias(hoje, distancia);

  const inicio = minutosDoDia(horaInicio);
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  return inicio !== null && inicio <= minutosAgora ? somarDias(hoje, 7) : hoje;
}

/**
 * `yyyy-MM-ddTHH:mm` da próxima ocorrência da faixa — o valor que o
 * `input[type=datetime-local]` do formulário de sessão consome.
 */
export function proximoAgendamento(entrada: ListaEsperaResponseDTO, agora: Date): string {
  const horaInicio = normalizarHora(entrada.horaInicio) ?? '00:00';
  return `${proximaDataDoDiaSemana(entrada.diaSemana, horaInicio, agora)}T${horaInicio}`;
}

/**
 * Duração da faixa em minutos, para pré-preencher a duração da sessão. `null`
 * quando as horas não são reconhecíveis ou a faixa não tem duração positiva —
 * mandar `0` reprovaria no `min` do formulário sem explicar por quê.
 */
export function duracaoDaFaixa(entrada: ListaEsperaResponseDTO): number | null {
  const inicio = minutosDoDia(entrada.horaInicio);
  const fim = minutosDoDia(entrada.horaFim);
  if (inicio === null || fim === null || fim <= inicio) return null;
  return fim - inicio;
}

/** "Das 08:00 às 09:00". */
export function formatarFaixa(entrada: ListaEsperaResponseDTO): string {
  return `Das ${normalizarHora(entrada.horaInicio)} às ${normalizarHora(entrada.horaFim)}`;
}

/** "Quarta, das 08:00 às 09:00". */
export function formatarDiaEFaixa(entrada: ListaEsperaResponseDTO): string {
  return `${DIAS_SEMANA_LABEL[entrada.diaSemana]}, ${formatarFaixa(entrada).toLowerCase()}`;
}

/**
 * Frase completa da entrada: "Ana Souza — quarta, das 08:00 às 09:00". É o que
 * o aviso de cancelamento usa, para que a agenda e a listagem de sessões não
 * descrevam a mesma espera de formas diferentes.
 */
export function descreverEspera(entrada: ListaEsperaResponseDTO): string {
  return `${entrada.pacienteNome} — ${formatarDiaEFaixa(entrada)}`;
}

/**
 * Aviso de que o horário cancelado tem fila, ou `null` quando não tem. O texto
 * nomeia os interessados: é o nome que a recepção precisa para ligar, e uma
 * contagem sozinha obrigaria a abrir outra tela para descobri-lo.
 */
export function avisoDeInteressados(entradas: ListaEsperaResponseDTO[]): string | null {
  if (entradas.length === 0) return null;
  const quantidade = entradas.length === 1
    ? '1 pessoa na lista de espera'
    : `${entradas.length} pessoas na lista de espera`;
  return `${quantidade} para este horário: ${entradas.map(descreverEspera).join('; ')}.`;
}
