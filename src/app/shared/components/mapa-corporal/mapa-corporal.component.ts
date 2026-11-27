import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from '@angular/core';
import {
  DESENHO_VERSAO_ATUAL,
  MAX_OBSERVACAO_PONTO_DOR,
  MAX_PONTOS_DOR,
  PontoDor,
  VISTA_CORPORAL_LABEL,
  VISTAS_CORPORAIS,
  VistaCorporal
} from '../../../core/models/ponto-dor';
import {
  PASSO_TECLADO,
  PASSO_TECLADO_LARGO,
  coordenadaNormalizada,
  diametroPercentual,
  faixaIntensidade,
  limitarCoordenada,
  regiaoAproximada,
  urlDesenho
} from '../../utils/mapa-corporal';

/** Um desenho exibido: uma vista numa versão do desenho. */
export interface FiguraMapa {
  vista: VistaCorporal;
  versao: number;
}

let proximaInstancia = 0;

/**
 * Mapa corporal de dor (issue #307): as vistas do corpo com os pontos marcados,
 * para edição (formulários de avaliação e reavaliação) e leitura (comparativo).
 *
 * As coordenadas são normalizadas (0 a 1) em relação ao desenho e os pontos são
 * posicionados em porcentagem sobre ele, então voltam no mesmo lugar em qualquer
 * tamanho de tela. Cada vista abre com o desenho da `desenhoVersao` dos pontos
 * dela — um registro antigo continua sobre o desenho em que foi marcado —, e a
 * vista sem pontos usa a versão atual (`DESENHO_VERSAO_ATUAL`). Um ponto novo
 * herda a versão do desenho em que foi clicado, para a posição valer sobre ele.
 *
 * Teclado: com o desenho em foco, Enter (ou Espaço) adiciona um ponto no centro;
 * com o ponto em foco, as setas o movem (Shift para passos maiores), Enter abre a
 * edição e Delete (ou Backspace) o remove. A lista textual repete os pontos com
 * vista, região aproximada, intensidade e observação, e ações de editar e remover.
 */
@Component({
  selector: 'app-mapa-corporal',
  imports: [],
  templateUrl: './mapa-corporal.component.html',
  styleUrl: './mapa-corporal.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class MapaCorporalComponent implements OnChanges {
  @Input() pontos: readonly PontoDor[] = [];
  @Input() somenteLeitura = false;
  /** Vistas exibidas, na ordem; o comparativo mostra uma de cada vez. */
  @Input() vistas: readonly VistaCorporal[] = VISTAS_CORPORAIS;
  /** Nome do mapa para o leitor de tela (ex.: "Mapa de dor da reavaliação de 10/03/2026"). */
  @Input() rotulo = 'Mapa de dor';
  /** Na leitura sem pontos, a lista diz isto. */
  @Input() mensagemVazia = 'Nenhum ponto de dor marcado.';

  /** Lista completa depois de cada alteração (adicionar, mover, editar, remover). */
  @Output() pontosChange = new EventEmitter<PontoDor[]>();

  readonly idBase = `mapa-corporal-${proximaInstancia++}`;
  readonly vistaLabel = VISTA_CORPORAL_LABEL;
  readonly maximo = MAX_PONTOS_DOR;
  readonly maxObservacao = MAX_OBSERVACAO_PONTO_DOR;
  readonly escala = Array.from({ length: 11 }, (_, i) => i);

  lista: PontoDor[] = [];
  /** Índice, em `lista`, do ponto aberto na edição. */
  selecionado: number | null = null;
  aviso: string | null = null;

  constructor(private host: ElementRef<HTMLElement>) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pontos']) {
      this.lista = [...this.pontos];
      if (this.selecionado !== null && this.selecionado >= this.lista.length) this.selecionado = null;
    }
  }

  get limiteAtingido(): boolean {
    return this.lista.length >= MAX_PONTOS_DOR;
  }

  /** Pontos das vistas exibidas, com o índice em `lista` (que é o que as ações usam). */
  get pontosVisiveis(): { ponto: PontoDor; indice: number }[] {
    return this.lista
      .map((ponto, indice) => ({ ponto, indice }))
      .filter(({ ponto }) => this.vistas.includes(ponto.vista));
  }

  get figuras(): FiguraMapa[] {
    return this.vistas.flatMap(vista => {
      const versoes = [...new Set(this.lista.filter(p => p.vista === vista).map(p => p.desenhoVersao))].sort((a, b) => a - b);
      return (versoes.length ? versoes : [DESENHO_VERSAO_ATUAL]).map(versao => ({ vista, versao }));
    });
  }

  /** Há mais de um desenho para a mesma vista (pontos de versões diferentes): a legenda mostra a versão. */
  versaoNaLegenda(figura: FiguraMapa): boolean {
    return this.figuras.filter(f => f.vista === figura.vista).length > 1;
  }

  pontosDaFigura(figura: FiguraMapa): { ponto: PontoDor; indice: number }[] {
    return this.pontosVisiveis.filter(({ ponto }) => ponto.vista === figura.vista && ponto.desenhoVersao === figura.versao);
  }

  urlDesenho(figura: FiguraMapa): string {
    return urlDesenho(figura.versao, figura.vista);
  }

  diametro(ponto: PontoDor): number {
    return diametroPercentual(ponto.intensidade);
  }

  faixa(ponto: PontoDor): string {
    return faixaIntensidade(ponto.intensidade);
  }

  regiao(ponto: PontoDor): string {
    return regiaoAproximada(ponto);
  }

  descricao(ponto: PontoDor, indice: number): string {
    const intensidade = ponto.intensidade === null ? 'intensidade não informada' : `intensidade ${ponto.intensidade} de 10`;
    return `Ponto ${indice + 1}: ${VISTA_CORPORAL_LABEL[ponto.vista]}, ${regiaoAproximada(ponto)}, ${intensidade}`;
  }

  // ------------------------------------------------------------------ adicionar

  aoClicarDesenho(event: MouseEvent, figura: FiguraMapa): void {
    if (this.somenteLeitura) return;
    // O retângulo é o da imagem, e não o do contêiner com borda: os pontos se posicionam dentro dela.
    const alvo = event.currentTarget as HTMLElement;
    const imagem = alvo.querySelector('img') ?? alvo;
    const coordenada = coordenadaNormalizada(event.clientX, event.clientY, imagem.getBoundingClientRect());
    if (coordenada) this.adicionar(figura, coordenada.x, coordenada.y);
  }

  aoTeclarDesenho(event: KeyboardEvent, figura: FiguraMapa): void {
    if (this.somenteLeitura || event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    const indice = this.adicionar(figura, 0.5, 0.5);
    if (indice !== null) this.focarPonto(indice);
  }

  /** Adiciona o ponto e devolve o índice dele, ou `null` no limite. */
  adicionar(figura: FiguraMapa, x: number, y: number): number | null {
    if (this.somenteLeitura) return null;
    if (this.limiteAtingido) {
      this.aviso = `Limite de ${MAX_PONTOS_DOR} pontos atingido. Remova um ponto para marcar outro.`;
      return null;
    }
    this.aviso = null;
    this.lista = [...this.lista, {
      vista: figura.vista,
      x: limitarCoordenada(x),
      y: limitarCoordenada(y),
      desenhoVersao: figura.versao,
      intensidade: null,
      observacao: null
    }];
    this.emitir();
    return this.lista.length - 1;
  }

  // ------------------------------------------------------------- editar/mover

  selecionar(indice: number): void {
    if (this.somenteLeitura) return;
    this.selecionado = this.selecionado === indice ? null : indice;
  }

  aoTeclarPonto(event: KeyboardEvent, indice: number): void {
    if (this.somenteLeitura) return;
    const passo = event.shiftKey ? PASSO_TECLADO_LARGO : PASSO_TECLADO;
    const deslocamentos: Record<string, [number, number]> = {
      ArrowLeft: [-passo, 0],
      ArrowRight: [passo, 0],
      ArrowUp: [0, -passo],
      ArrowDown: [0, passo]
    };
    const deslocamento = deslocamentos[event.key];
    if (deslocamento) {
      event.preventDefault();
      const ponto = this.lista[indice];
      this.atualizar(indice, { x: limitarCoordenada(ponto.x + deslocamento[0]), y: limitarCoordenada(ponto.y + deslocamento[1]) });
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.remover(indice);
    }
  }

  definirIntensidade(valor: string): void {
    if (this.selecionado === null) return;
    this.atualizar(this.selecionado, { intensidade: valor === '' ? null : Number(valor) });
  }

  definirObservacao(valor: string): void {
    if (this.selecionado === null) return;
    // Sem `trim` aqui: o campo devolveria o texto aparado a cada tecla e o espaço digitado sumiria.
    // O serviço apara na gravação.
    const texto = valor.slice(0, MAX_OBSERVACAO_PONTO_DOR);
    this.atualizar(this.selecionado, { observacao: texto.trim() ? texto : null });
  }

  /** Enter no campo de observação não pode enviar o formulário que hospeda o mapa. */
  aoTeclarObservacao(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.fecharEditor();
    }
  }

  fecharEditor(): void {
    const indice = this.selecionado;
    this.selecionado = null;
    if (indice !== null) this.focarPonto(indice);
  }

  remover(indice: number): void {
    if (this.somenteLeitura || indice < 0 || indice >= this.lista.length) return;
    this.lista = this.lista.filter((_, i) => i !== indice);
    if (this.selecionado === indice) {
      this.selecionado = null;
    } else if (this.selecionado !== null && this.selecionado > indice) {
      this.selecionado--;
    }
    this.aviso = null;
    this.emitir();
  }

  private atualizar(indice: number, mudanca: Partial<PontoDor>): void {
    this.lista = this.lista.map((ponto, i) => (i === indice ? { ...ponto, ...mudanca } : ponto));
    this.emitir();
  }

  private emitir(): void {
    this.pontosChange.emit([...this.lista]);
  }

  /** Adiado: o botão do ponto só existe depois da próxima detecção de mudanças. */
  private focarPonto(indice: number): void {
    setTimeout(() => {
      this.host.nativeElement.querySelector<HTMLElement>(`#${this.idBase}-ponto-${indice}`)?.focus();
    });
  }
}
