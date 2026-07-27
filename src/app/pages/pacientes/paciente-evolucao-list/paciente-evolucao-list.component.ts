import { DatePipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { EvolucaoSessaoResponseDTO } from '../../../core/models/evolucao-sessao';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { SessaoResponseDTO, SESSAO_TIPO_LABEL } from '../../../core/models/sessao';
import { EvolucaoSessaoService } from '../../../core/services/evolucao-sessao.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { SessaoService } from '../../../core/services/sessao.service';
import { extrairMensagemErro } from '../../../shared/utils/api-error';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';

/** Tendência da dor entre o início e o fim da sessão. */
export type TendenciaDor = 'melhora' | 'piora' | 'estavel';

export const TENDENCIA_DOR_LABEL: Record<TendenciaDor, string> = {
  melhora: 'melhora',
  piora: 'piora',
  estavel: 'sem variação'
};

/**
 * Uma entrada da linha do tempo: a sessão já cruzada com a evolução registrada
 * nela. Os dados da sessão são achatados aqui porque uma evolução pode existir
 * sem a sessão correspondente na listagem (sessão excluída), e o template não
 * precisa saber disso.
 */
export interface EvolucaoTimelineItem {
  chave: string;
  sessaoId: number;
  dataHora: string;
  tipo: string | null;
  nomeProfissional: string | null;
  evolucao: EvolucaoSessaoResponseDTO | null;
  /**
   * Normalizados para `null` no componente: a guarda do template não precisa
   * distinguir `null` de um campo ausente no corpo da resposta.
   */
  dorAntes: number | null;
  dorDepois: number | null;
  tendenciaDor: TendenciaDor | null;
  /** Rótulo acessível do par de dor, já que o `→` do template é decorativo. */
  descricaoDor: string | null;
  /** Há observações do fisioterapeuta ou campos atrás do expandir/recolher. */
  temCorpo: boolean;
  /** Há campos atrás do expandir/recolher. */
  temDetalhes: boolean;
  expandido: boolean;
}

/** Um ponto plotado, já em coordenadas do `viewBox`. */
export interface GraficoDorPonto {
  x: number;
  y: number;
  valor: number;
  /** Data da sessão em `dd/MM/yyyy`, reaproveitada no `aria-label`. */
  data: string;
}

export interface GraficoDorSerie {
  chave: 'antes' | 'depois';
  rotulo: string;
  pontos: GraficoDorPonto[];
  /**
   * `points` de um `<polyline>` por trecho contínuo da série: a sessão sem dor
   * informada quebra a linha em vez de virar um ponto em `0`.
   */
  linhas: string[];
  /** Subconjunto de `pontos` desenhado como círculo. */
  marcadores: GraficoDorPonto[];
}

export interface GraficoDorMarcaX {
  x: number;
  rotulo: string;
  /** As marcas das pontas ancoram para dentro para não vazar do `viewBox`. */
  ancora: 'start' | 'middle' | 'end';
}

export interface GraficoDorMarcaY {
  y: number;
  rotulo: string;
}

export interface GraficoDorArea {
  esquerda: number;
  direita: number;
  topo: number;
  base: number;
}

export interface GraficoDor {
  viewBox: string;
  area: GraficoDorArea;
  series: GraficoDorSerie[];
  marcasX: GraficoDorMarcaX[];
  marcasY: GraficoDorMarcaY[];
  ariaLabel: string;
}

/** Geometria do gráfico, em unidades do `viewBox`. */
const GRAFICO_LARGURA = 480;
const GRAFICO_ALTURA = 220;
const GRAFICO_MARGEM = { topo: 12, direita: 14, base: 34, esquerda: 26 };
/** Escala da dor no formulário de evolução: o eixo Y é fixo, não normalizado. */
const DOR_MAXIMA = 10;
const GRAFICO_MARCAS_Y = [0, 5, DOR_MAXIMA];
/**
 * Pontos que uma série precisa para desenhar tendência — que é o que o gráfico
 * se propõe a mostrar. O critério é por série, e não o total de sessões com dor
 * informada: duas medições em séries diferentes (uma sessão só com `dorAntes`,
 * outra só com `dorDepois`) não se ligam e renderizariam eixos e legenda em
 * volta de dois pontos soltos, sem linha nenhuma.
 */
const GRAFICO_MIN_PONTOS_SERIE = 2;
/** Datas escritas no eixo X; as demais sessões entram sem rótulo. */
const GRAFICO_MAX_MARCAS_X = 5;
/**
 * Acima disso os círculos viram uma faixa sólida — e centenas de nós no DOM:
 * a linha basta, e só os pontos isolados seguem marcados para não sumirem.
 */
const GRAFICO_MAX_MARCADORES = 30;

const SERIES_DOR: {
  chave: GraficoDorSerie['chave'];
  rotulo: string;
  valor: (item: EvolucaoTimelineItem) => number | null;
}[] = [
  { chave: 'antes', rotulo: 'Dor antes', valor: item => item.dorAntes },
  { chave: 'depois', rotulo: 'Dor depois', valor: item => item.dorDepois }
];

/**
 * Formata o prefixo ISO de `dataHora` direto, sem construir `Date`: a string
 * vem sem fuso (`2026-05-20T14:00`) e o construtor a interpretaria como local
 * ou UTC conforme o formato, o que já viraria um dia a menos no rótulo.
 */
function formatarData(dataHora: string): { curta: string; completa: string } {
  const [ano, mes, dia] = dataHora.slice(0, 10).split('-');
  if (!ano || !mes || !dia) return { curta: dataHora, completa: dataHora };
  return { curta: `${dia}/${mes}`, completa: `${dia}/${mes}/${ano}` };
}

/** Índices das sessões que ganham rótulo no eixo X, sempre com a primeira e a última. */
function indicesDasMarcasX(total: number): number[] {
  if (total <= GRAFICO_MAX_MARCAS_X) return Array.from({ length: total }, (_indice, i) => i);

  const passo = (total - 1) / (GRAFICO_MAX_MARCAS_X - 1);
  const indices = new Set<number>();
  for (let marca = 0; marca < GRAFICO_MAX_MARCAS_X; marca++) {
    indices.add(Math.round(marca * passo));
  }
  return [...indices].sort((a, b) => a - b);
}

function descreverSerie(serie: GraficoDorSerie): string | null {
  const primeiro = serie.pontos[0];
  const ultimo = serie.pontos[serie.pontos.length - 1];
  if (!primeiro) return null;
  if (primeiro === ultimo) return `${serie.rotulo}: ${primeiro.valor} em ${primeiro.data}, medição única`;
  return `${serie.rotulo}: de ${primeiro.valor} em ${primeiro.data} para ${ultimo.valor} em ${ultimo.data}`;
}

/**
 * Deriva o gráfico da mesma coleção que alimenta a linha do tempo — nenhuma
 * requisição a mais —, invertendo a ordem: a lista é decrescente e o eixo X é
 * cronológico crescente. Função pura para que o spec asserte os pontos sem
 * precisar medir o SVG renderizado.
 *
 * Devolve `null` enquanto nenhuma série chega a dois pontos: uma medição
 * isolada não desenha tendência nenhuma.
 */
export function montarGraficoDor(itens: EvolucaoTimelineItem[]): GraficoDor | null {
  const sessoes = [...itens].reverse();
  // Também é a guarda da divisão em `posicaoX`: com menos de duas posições no
  // eixo X nenhuma série teria como chegar a dois pontos de qualquer forma.
  if (sessoes.length < GRAFICO_MIN_PONTOS_SERIE) return null;

  const area: GraficoDorArea = {
    esquerda: GRAFICO_MARGEM.esquerda,
    direita: GRAFICO_LARGURA - GRAFICO_MARGEM.direita,
    topo: GRAFICO_MARGEM.topo,
    base: GRAFICO_ALTURA - GRAFICO_MARGEM.base
  };

  // Duas casas bastam na escala do `viewBox` e evitam `26,64.20000000000002`
  // no atributo `points`.
  const arredondar = (valor: number): number => Math.round(valor * 100) / 100;

  const posicaoX = (indice: number): number =>
    arredondar(area.esquerda + ((area.direita - area.esquerda) * indice) / (sessoes.length - 1));
  // O `clamp` é defensivo: o backend limita a dor a 0–10, e um valor fora da
  // escala desenharia o ponto por cima dos rótulos em vez de falhar visivelmente.
  const posicaoY = (valor: number): number => {
    const escalado = Math.min(Math.max(valor, 0), DOR_MAXIMA);
    return arredondar(area.base - (escalado / DOR_MAXIMA) * (area.base - area.topo));
  };

  const denso = sessoes.length > GRAFICO_MAX_MARCADORES;

  const todasAsSeries: GraficoDorSerie[] = SERIES_DOR.map(definicao => {
    const pontos: GraficoDorPonto[] = [];
    const trechos: GraficoDorPonto[][] = [];
    let trecho: GraficoDorPonto[] = [];

    sessoes.forEach((item, indice) => {
      const valor = definicao.valor(item);
      if (valor === null) {
        if (trecho.length > 0) trechos.push(trecho);
        trecho = [];
        return;
      }

      const ponto: GraficoDorPonto = {
        x: posicaoX(indice),
        y: posicaoY(valor),
        valor,
        data: formatarData(item.dataHora).completa
      };
      pontos.push(ponto);
      trecho.push(ponto);
    });
    if (trecho.length > 0) trechos.push(trecho);

    const isolados = trechos.filter(atual => atual.length === 1).map(atual => atual[0]);

    return {
      chave: definicao.chave,
      rotulo: definicao.rotulo,
      pontos,
      linhas: trechos
        .filter(atual => atual.length > 1)
        .map(atual => atual.map(ponto => `${ponto.x},${ponto.y}`).join(' ')),
      marcadores: denso ? isolados : pontos
    };
  });

  // Série sem nenhum ponto não entra: a legenda anunciaria uma linha que não
  // existe, contradizendo o `aria-label`, que já a omite. Acontece de verdade
  // quando só a dor inicial é registrada.
  const series = todasAsSeries.filter(serie => serie.pontos.length > 0);
  if (!series.some(serie => serie.pontos.length >= GRAFICO_MIN_PONTOS_SERIE)) return null;

  const descricoes = series.map(descreverSerie).filter((texto): texto is string => texto !== null);
  const ariaLabel = [
    `Gráfico da evolução da dor ao longo de ${sessoes.length} sessões, ` +
      `de ${formatarData(sessoes[0].dataHora).completa} ` +
      `a ${formatarData(sessoes[sessoes.length - 1].dataHora).completa}`,
    ...descricoes
  ].join('. ') + '.';

  return {
    viewBox: `0 0 ${GRAFICO_LARGURA} ${GRAFICO_ALTURA}`,
    area,
    series,
    marcasX: indicesDasMarcasX(sessoes.length).map(indice => ({
      x: posicaoX(indice),
      rotulo: formatarData(sessoes[indice].dataHora).curta,
      ancora: indice === 0 ? 'start' : indice === sessoes.length - 1 ? 'end' : 'middle'
    })),
    marcasY: GRAFICO_MARCAS_Y.map(valor => ({ y: posicaoY(valor), rotulo: `${valor}` })),
    ariaLabel
  };
}

@Component({
  selector: 'app-paciente-evolucao-list',
  imports: [NgIf, NgFor, DatePipe, RouterLink, BreadcrumbComponent],
  templateUrl: './paciente-evolucao-list.component.html',
  styleUrl: './paciente-evolucao-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PacienteEvolucaoListComponent implements OnInit {
  pacienteId: number | null = null;
  paciente: PacienteResponseDTO | null = null;
  /**
   * Coleção única já ordenada e derivada, ponto de consumo previsto para o
   * gráfico de dor (#206) e para os filtros de período/tipo (#207).
   */
  itens: EvolucaoTimelineItem[] = [];
  /** Derivado de `itens`, sem requisição própria. `null` esconde o gráfico. */
  grafico: GraficoDor | null = null;
  loading = false;
  erro: string | null = null;

  readonly tipoLabel = SESSAO_TIPO_LABEL;
  readonly tendenciaLabel = TENDENCIA_DOR_LABEL;

  constructor(
    private evolucaoSessaoService: EvolucaoSessaoService,
    private sessaoService: SessaoService,
    private pacienteService: PacienteService,
    private route: ActivatedRoute,
    private destroyRef: DestroyRef,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    if (this.pacienteId === null) {
      this.erro = 'Identificador inválido.';
      return;
    }
    this.carregar();
  }

  carregar(): void {
    if (this.pacienteId === null) return;

    this.loading = true;
    this.erro = null;

    this.pacienteService.buscar(this.pacienteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: paciente => {
          this.paciente = paciente;
          this.carregarEvolucoes();
          this.cdr.markForCheck();
        },
        error: err => {
          this.erro = extrairMensagemErro(err, 'Erro ao carregar dados do paciente.');
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private carregarEvolucoes(): void {
    if (this.pacienteId === null) return;

    forkJoin({
      sessoes: this.sessaoService.listarPorPaciente(this.pacienteId),
      evolucoes: this.evolucaoSessaoService.listarPorPaciente(this.pacienteId)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ sessoes, evolucoes }) => {
          this.itens = this.montarTimeline(sessoes, evolucoes);
          this.grafico = montarGraficoDor(this.itens);
          this.loading = false;
          this.cdr.markForCheck();
        },
        // O `forkJoin` colapsa as duas falhas num ramo só, então a mensagem não
        // pode culpar as evoluções: quem falhou pode ter sido a listagem de
        // sessões.
        error: err => {
          this.erro = extrairMensagemErro(err, 'Não foi possível carregar o histórico de evoluções.');
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Cruza sessões e evoluções por `sessaoId` e ordena da mais recente para a
   * mais antiga. Entram na linha do tempo as sessões com evolução, as sessões
   * `REALIZADA` ainda sem evolução (para a fisioterapeuta ver o que falta
   * registrar) e — defensivamente — evoluções cuja sessão não veio na listagem,
   * que de outra forma sumiriam do prontuário.
   */
  private montarTimeline(
    sessoes: SessaoResponseDTO[],
    evolucoes: EvolucaoSessaoResponseDTO[]
  ): EvolucaoTimelineItem[] {
    const evolucaoPorSessao = new Map<number, EvolucaoSessaoResponseDTO>();
    evolucoes.forEach(evolucao => evolucaoPorSessao.set(evolucao.sessaoId, evolucao));

    const itens: EvolucaoTimelineItem[] = [];

    sessoes.forEach(sessao => {
      const evolucao = evolucaoPorSessao.get(sessao.id) ?? null;
      if (evolucao === null && sessao.status !== 'REALIZADA') return;

      evolucaoPorSessao.delete(sessao.id);
      itens.push(this.montarItem({
        sessaoId: sessao.id,
        dataHora: sessao.dataHora,
        tipo: this.tipoLabel[sessao.tipo] ?? sessao.tipo,
        nomeProfissional: sessao.nomeProfissional,
        evolucao
      }));
    });

    evolucaoPorSessao.forEach(evolucao => {
      itens.push(this.montarItem({
        sessaoId: evolucao.sessaoId,
        dataHora: evolucao.dataHoraRegistro,
        tipo: null,
        nomeProfissional: null,
        evolucao
      }));
    });

    return itens.sort((a, b) => {
      const comparacao = b.dataHora.localeCompare(a.dataHora);
      return comparacao !== 0 ? comparacao : b.sessaoId - a.sessaoId;
    });
  }

  private montarItem(dados: {
    sessaoId: number;
    dataHora: string;
    tipo: string | null;
    nomeProfissional: string | null;
    evolucao: EvolucaoSessaoResponseDTO | null;
  }): EvolucaoTimelineItem {
    const evolucao = dados.evolucao;
    const temDetalhes = evolucao !== null && [
      evolucao.exerciciosRealizados,
      evolucao.equipamentosUtilizados,
      evolucao.cargasMolas,
      evolucao.respostaPaciente,
      evolucao.intercorrencias,
      evolucao.orientacoes
    ].some(campo => !!campo);

    const dorAntes = evolucao?.dorAntes ?? null;
    const dorDepois = evolucao?.dorDepois ?? null;
    const tendenciaDor = this.calcularTendenciaDor(dorAntes, dorDepois);

    return {
      chave: `${dados.sessaoId}`,
      sessaoId: dados.sessaoId,
      dataHora: dados.dataHora,
      tipo: dados.tipo,
      nomeProfissional: dados.nomeProfissional,
      evolucao,
      dorAntes,
      dorDepois,
      tendenciaDor,
      descricaoDor: this.descreverDor(dorAntes, dorDepois, tendenciaDor),
      temCorpo: temDetalhes || !!evolucao?.observacoesFisioterapeuta,
      temDetalhes,
      expandido: false
    };
  }

  private calcularTendenciaDor(dorAntes: number | null, dorDepois: number | null): TendenciaDor | null {
    if (dorAntes === null || dorDepois === null) return null;
    if (dorDepois < dorAntes) return 'melhora';
    if (dorDepois > dorAntes) return 'piora';
    return 'estavel';
  }

  /**
   * O `→` do cabeçalho é `aria-hidden`, então sem este rótulo o leitor de tela
   * anunciaria apenas "Dor 7 3 melhora".
   */
  private descreverDor(
    dorAntes: number | null,
    dorDepois: number | null,
    tendencia: TendenciaDor | null
  ): string | null {
    if (dorAntes === null && dorDepois === null) return null;

    const antes = dorAntes ?? 'não informada';
    const depois = dorDepois ?? 'não informada';
    const sufixo = tendencia === null ? '' : `, ${TENDENCIA_DOR_LABEL[tendencia]}`;
    return `Dor antes ${antes}, depois ${depois}${sufixo}`;
  }

  alternar(item: EvolucaoTimelineItem): void {
    item.expandido = !item.expandido;
    this.cdr.markForCheck();
  }

  expandirTudo(): void {
    this.itens.forEach(item => { item.expandido = item.temDetalhes; });
    this.cdr.markForCheck();
  }

  recolherTudo(): void {
    this.itens.forEach(item => { item.expandido = false; });
    this.cdr.markForCheck();
  }

  get temItensExpansiveis(): boolean {
    return this.itens.some(item => item.temDetalhes);
  }

  trackByItem(_indice: number, item: EvolucaoTimelineItem): string {
    return item.chave;
  }
}
