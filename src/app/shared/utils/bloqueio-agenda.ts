import { BloqueioAgendaResponseDTO } from '../../core/models/bloqueio-agenda';

/**
 * Leitura dos bloqueios de agenda (issue #135), compartilhada pela tela
 * administrativa, pela agenda do estúdio e pelo formulário de sessão.
 *
 * Tudo aqui trabalha sobre as strings do contrato (`yyyy-MM-dd` e `HH:mm`) e
 * nunca sobre `Date`: o dia circula como string justamente para não passar por
 * um construtor de `Date` a partir de ISO, que o interpretaria como UTC e
 * mostraria o dia anterior no fuso do estúdio — mesma decisão de
 * `shared/utils/calendario.ts`.
 */

/**
 * `HH:mm` a partir do que a API mandar.
 *
 * A API devolve `LocalTime` **sempre** com segundos — mandar `"08:00"` no
 * `POST` traz `"08:00:00"` de volta (verificado contra o backend) —, enquanto o
 * `<input type="time">` do formulário produz e consome `HH:mm`. Sem normalizar,
 * as duas formas do mesmo horário divergiriam em qualquer comparação de string
 * e o campo de edição receberia um valor que não é o dele.
 */
export function normalizarHora(hora: string | null | undefined): string | null {
  if (!hora) return null;
  const match = /^(\d{2}):(\d{2})/.exec(hora);
  return match ? `${match[1]}:${match[2]}` : null;
}

/** Minutos desde a meia-noite, ou `null` quando a hora não é reconhecida. */
function emMinutos(hora: string | null | undefined): number | null {
  const normalizada = normalizarHora(hora);
  if (normalizada === null) return null;
  const [h, m] = normalizada.split(':').map(Number);
  return h * 60 + m;
}

/**
 * O bloqueio vale para o dia inteiro quando não tem faixa de horário. O flag
 * `diaInteiro` vem calculado da API, mas as horas são a fonte de verdade: um
 * bloqueio com faixa e `diaInteiro` verdadeiro (ou o contrário) esconderia o
 * horário da tela sem que ninguém percebesse.
 */
export function ehDiaInteiro(bloqueio: BloqueioAgendaResponseDTO): boolean {
  return normalizarHora(bloqueio.horaInicio) === null || normalizarHora(bloqueio.horaFim) === null;
}

/**
 * Comparação lexicográfica de `yyyy-MM-dd`, que para esse formato é a mesma
 * coisa que a cronológica. `dataFim` é inclusiva.
 */
export function cobreDia(bloqueio: BloqueioAgendaResponseDTO, dia: string): boolean {
  return bloqueio.dataInicio <= dia && dia <= bloqueio.dataFim;
}

/** Bloqueios que cobrem o dia, na ordem em que a API os devolveu. */
export function bloqueiosDoDia(
  bloqueios: BloqueioAgendaResponseDTO[],
  dia: string
): BloqueioAgendaResponseDTO[] {
  return bloqueios.filter(bloqueio => cobreDia(bloqueio, dia));
}

/**
 * Índice `dia -> bloqueios` para os dias informados. A agenda monta o índice uma
 * vez por carga em vez de filtrar a lista inteira em cada célula da grade, que
 * com `OnPush` seria refeito a cada ciclo de detecção de mudanças.
 *
 * Dias sem bloqueio ficam **fora** do mapa: quem consulta usa `?? []`, e a
 * ausência da chave é o próprio "não há bloqueio".
 */
export function agruparBloqueiosPorDia(
  bloqueios: BloqueioAgendaResponseDTO[],
  dias: string[]
): Map<string, BloqueioAgendaResponseDTO[]> {
  const porDia = new Map<string, BloqueioAgendaResponseDTO[]>();
  for (const dia of dias) {
    const doDia = bloqueiosDoDia(bloqueios, dia);
    if (doDia.length > 0) porDia.set(dia, doDia);
  }
  return porDia;
}

/**
 * Bloqueios que alcançam um agendamento que começa em `dataHora`
 * (`yyyy-MM-ddTHH:mm`) e dura `duracaoMinutos`.
 *
 * Bloqueio de dia inteiro alcança qualquer horário daquele dia. Com faixa, o
 * critério é **sobreposição de intervalos**: uma sessão das 07:00 às 09:00
 * invade um bloqueio das 08:00 às 12:00 mesmo começando antes dele. Duração
 * ausente ou zero vira um minuto, de modo que o instante inicial dentro da
 * faixa continue avisando.
 *
 * A comparação é feita **no dia de início**: uma sessão que atravessasse a
 * meia-noite não é conferida contra o bloqueio do dia seguinte — a duração
 * máxima aceita pelo formulário é de 8 horas e o estúdio não atende de
 * madrugada, então o caso não existe na prática.
 */
export function bloqueiosDoHorario(
  bloqueios: BloqueioAgendaResponseDTO[],
  dataHora: string | null | undefined,
  duracaoMinutos?: number | null
): BloqueioAgendaResponseDTO[] {
  if (!dataHora) return [];
  const [dia, hora] = dataHora.split('T');
  const inicio = emMinutos(hora);
  if (inicio === null) return [];

  const duracao = Number(duracaoMinutos);
  const fim = inicio + (Number.isFinite(duracao) && duracao > 0 ? duracao : 1);

  return bloqueiosDoDia(bloqueios, dia).filter(bloqueio => {
    // `ehDiaInteiro` já devolveu `true` para qualquer bloqueio cuja hora não
    // normalize, então daqui para baixo as duas são números — sem fallback, que
    // seria ramo morto anunciando um meio-aberto que não existe.
    if (ehDiaInteiro(bloqueio)) return true;
    const faixaInicio = emMinutos(bloqueio.horaInicio) as number;
    const faixaFim = emMinutos(bloqueio.horaFim) as number;
    return inicio < faixaFim && fim > faixaInicio;
  });
}

/** "Dia inteiro" ou "Das 08:00 às 12:00". */
export function formatarFaixaHoraria(bloqueio: BloqueioAgendaResponseDTO): string {
  if (ehDiaInteiro(bloqueio)) return 'Dia inteiro';
  return `Das ${normalizarHora(bloqueio.horaInicio)} às ${normalizarHora(bloqueio.horaFim)}`;
}

/** `dd/MM/yyyy` a partir de `yyyy-MM-dd`, sem passar por `Date`. */
function formatarDiaCurto(dia: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : dia;
}

/** "25/12/2026" para um dia só; "24/12/2026 a 26/12/2026" para um período. */
export function formatarPeriodo(bloqueio: BloqueioAgendaResponseDTO): string {
  const inicio = formatarDiaCurto(bloqueio.dataInicio);
  if (bloqueio.dataInicio === bloqueio.dataFim) return inicio;
  return `${inicio} a ${formatarDiaCurto(bloqueio.dataFim)}`;
}

/**
 * Frase completa do bloqueio: "Natal — 25/12/2026, dia inteiro". É o que a
 * agenda usa no `title` do marcador e o formulário de sessão no aviso, para que
 * as duas telas não descrevam o mesmo bloqueio de formas diferentes.
 */
export function descreverBloqueio(bloqueio: BloqueioAgendaResponseDTO): string {
  return `${bloqueio.motivo} — ${formatarPeriodo(bloqueio)}, ${formatarFaixaHoraria(bloqueio).toLowerCase()}`;
}
