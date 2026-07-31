import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import {
  CodigoLandmark,
  DefinicaoLandmark,
  LandmarkDTO,
  VISTA_POSTURAL_LABEL,
  VistaPostural,
  landmarksDaVista
} from '../../../core/models/avaliacao-postural';
import {
  EstadoMarcacao,
  HistoricoEdicao,
  PASSO_ZOOM,
  PontoTela,
  RetanguloImagem,
  PRUMO_PADRAO,
  ZOOM_MAXIMO,
  ZOOM_MINIMO,
  definirLandmark,
  distancia,
  landmarkMaisProximo,
  limitarPan,
  limitarZoom,
  paraNormalizado,
  paraTela,
  proximoPendente
} from '../../utils/simetrografo';
import { PARES_REFERENCIA } from '../../utils/metricas-posturais';

/** Deslocamento em px a partir do qual o gesto deixa de ser toque e vira arraste/pan. */
const LIMIAR_ARRASTE_PX = 6;

/** Raio de captura do ponteiro sobre um ponto já marcado, em px de tela. */
const TOLERANCIA_TOQUE_PX = 22;

type ModoInteracao = 'nenhum' | 'possivel-toque' | 'pan' | 'arrastar-ponto' | 'arrastar-prumo' | 'pinca';

/**
 * Editor do simetrógrafo virtual: foto do paciente com grade e linha de prumo
 * sobrepostas, marcação guiada dos pontos anatômicos, zoom/pan, correção por
 * arraste e desfazer.
 *
 * As coordenadas emitidas são sempre normalizadas (0 a 1) em relação à imagem
 * natural. Zoom e pan são aplicados por transform CSS no palco, então o
 * retângulo da imagem na tela já os embute e a conversão permanece correta em
 * qualquer nível de aproximação.
 */
@Component({
  selector: 'app-simetrografo-editor',
  imports: [],
  templateUrl: './simetrografo-editor.component.html',
  styleUrl: './simetrografo-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SimetrografoEditorComponent implements OnChanges {
  @Input({ required: true }) fotoUrl!: string;
  @Input({ required: true }) vista!: VistaPostural;
  @Input() landmarks: readonly LandmarkDTO[] = [];
  @Input() linhaPrumoX: number | null = null;
  /** Análises concluídas são imutáveis: o editor abre sem marcar, arrastar ou salvar. */
  @Input() somenteLeitura = false;

  @Output() marcacaoAlterada = new EventEmitter<EstadoMarcacao>();
  /** Razão largura/altura da foto, assim que medida — a API precisa dela para os ângulos. */
  @Output() imagemMedida = new EventEmitter<number>();

  @ViewChild('foto') fotoRef?: ElementRef<HTMLImageElement>;
  @ViewChild('viewport') viewportRef?: ElementRef<HTMLElement>;

  pontos: LandmarkDTO[] = [];
  prumoX = PRUMO_PADRAO;

  zoom = ZOOM_MINIMO;
  panX = 0;
  panY = 0;

  gradeVisivel = true;
  prumoVisivel = true;
  divisoesGrade = 10;

  larguraNatural = 0;
  alturaNatural = 0;

  readonly zoomMinimo = ZOOM_MINIMO;
  readonly zoomMaximo = ZOOM_MAXIMO;
  readonly vistaLabel = VISTA_POSTURAL_LABEL;

  private readonly historico = new HistoricoEdicao();
  private readonly ponteiros = new Map<number, PontoTela>();
  private modo: ModoInteracao = 'nenhum';
  private codigoArrastando: CodigoLandmark | null = null;
  private inicioPonteiro: PontoTela = { x: 0, y: 0 };
  private panInicial = { x: 0, y: 0 };
  private distanciaPincaInicial = 0;
  private zoomInicialPinca = ZOOM_MINIMO;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['landmarks']) {
      this.pontos = [...this.landmarks];
    }
    if (changes['linhaPrumoX']) {
      // Sem prumo salvo, começa no centro da foto — a fisioterapeuta ajusta arrastando.
      this.prumoX = this.linhaPrumoX ?? PRUMO_PADRAO;
    }
    if (changes['vista'] || changes['fotoUrl']) {
      this.historico.limpar();
    }
  }

  get sequencia(): readonly DefinicaoLandmark[] {
    return landmarksDaVista(this.vista);
  }

  get proximo(): DefinicaoLandmark | null {
    return proximoPendente(this.sequencia, this.pontos);
  }

  get instrucao(): string {
    const proximo = this.proximo;
    if (this.somenteLeitura) return 'Análise concluída: marcação em modo somente leitura.';
    return proximo ? `Toque ${proximo.alvo} na foto` : 'Todos os pontos desta vista foram marcados.';
  }

  get totalMarcados(): number {
    return this.pontos.length;
  }

  get podeDesfazer(): boolean {
    return !this.somenteLeitura && this.historico.podeDesfazer;
  }

  get transformPalco(): string {
    return `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
  }

  get viewBox(): string {
    return `0 0 ${this.larguraNatural} ${this.alturaNatural}`;
  }

  /** Razão largura/altura da imagem natural, exigida pela API para calcular os ângulos. */
  get proporcaoImagem(): number | null {
    return this.alturaNatural > 0 ? this.larguraNatural / this.alturaNatural : null;
  }

  /** Espaçamento da grade em unidades da imagem — igual nos dois eixos, para quadrados reais. */
  get espacamentoGrade(): number {
    return this.divisoesGrade > 0 ? this.larguraNatural / this.divisoesGrade : 0;
  }

  get linhasVerticais(): number[] {
    return this.linhasGrade(this.larguraNatural);
  }

  get linhasHorizontais(): number[] {
    return this.linhasGrade(this.alturaNatural);
  }

  private linhasGrade(extensao: number): number[] {
    const espacamento = this.espacamentoGrade;
    if (espacamento <= 0) return [];

    const linhas: number[] = [];
    for (let posicao = espacamento; posicao < extensao; posicao += espacamento) {
      linhas.push(posicao);
    }
    return linhas;
  }

  /** Marcadores e traços mantêm espessura aparente constante ao aproximar. */
  get raioPonto(): number {
    return (this.larguraNatural * 0.014) / this.zoom;
  }

  get espessuraLinha(): number {
    return (this.larguraNatural * 0.003) / this.zoom;
  }

  get espessuraGrade(): number {
    return (this.larguraNatural * 0.0015) / this.zoom;
  }

  /**
   * Altura da alça de arraste do prumo, junto à base da foto — onde a linha é
   * alinhada ao ponto médio entre os pés. Restringir o arraste à alça evita que
   * a linha, que cruza a foto inteira, capture toques destinados à marcação.
   */
  get prumoAlcaY(): number {
    return this.alturaNatural - this.raioPonto * 1.6;
  }

  /**
   * Segmentos que ligam cada par já marcado, em unidades da imagem. Um par só
   * entra quando os dois pontos existem; nas vistas laterais, que têm um ponto
   * por região, a lista fica naturalmente vazia.
   */
  get linhasReferencia(): { x1: number; y1: number; x2: number; y2: number }[] {
    const porCodigo = new Map(this.pontos.map(p => [p.codigo, p]));

    return PARES_REFERENCIA.flatMap(par => {
      const a = porCodigo.get(par.esquerdo);
      const b = porCodigo.get(par.direito);
      if (!a || !b) return [];

      return [{
        x1: a.x * this.larguraNatural,
        y1: a.y * this.alturaNatural,
        x2: b.x * this.larguraNatural,
        y2: b.y * this.alturaNatural
      }];
    });
  }

  estaMarcado(codigo: CodigoLandmark): boolean {
    return this.pontos.some(p => p.codigo === codigo);
  }

  ehProximo(codigo: CodigoLandmark): boolean {
    return !this.somenteLeitura && this.proximo?.codigo === codigo;
  }

  onImagemCarregada(): void {
    const img = this.fotoRef?.nativeElement;
    if (!img) return;

    this.larguraNatural = img.naturalWidth;
    this.alturaNatural = img.naturalHeight;

    const proporcao = this.proporcaoImagem;
    if (proporcao !== null) {
      this.imagemMedida.emit(proporcao);
    }
  }

  // ---------------------------------------------------------------- zoom / pan

  aproximar(): void {
    this.aplicarZoom(this.zoom + PASSO_ZOOM);
  }

  afastar(): void {
    this.aplicarZoom(this.zoom - PASSO_ZOOM);
  }

  reenquadrar(): void {
    this.zoom = ZOOM_MINIMO;
    this.panX = 0;
    this.panY = 0;
  }

  /**
   * Ajusta o zoom mantendo fixo o ponto da imagem sob a âncora (centro do
   * viewport nos botões, ponto médio dos dedos na pinça).
   */
  private aplicarZoom(novoZoom: number, ancora?: PontoTela): void {
    const limitado = limitarZoom(novoZoom);
    const viewport = this.viewportRef?.nativeElement;

    if (viewport) {
      const rect = viewport.getBoundingClientRect();
      const alvo = ancora ?? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      const local = { x: alvo.x - rect.left, y: alvo.y - rect.top };
      const noPalco = { x: (local.x - this.panX) / this.zoom, y: (local.y - this.panY) / this.zoom };

      this.zoom = limitado;
      this.aplicarPan(local.x - noPalco.x * limitado, local.y - noPalco.y * limitado);
      return;
    }

    this.zoom = limitado;
  }

  /** Aplica o deslocamento já limitado à área visível. */
  private aplicarPan(x: number, y: number): void {
    const viewport = this.viewportRef?.nativeElement;
    const img = this.fotoRef?.nativeElement;

    if (!viewport || !img) {
      this.panX = x;
      this.panY = y;
      return;
    }

    // `offset*`/`client*` são medidas de layout, imunes ao transform do palco —
    // ao contrário do `getBoundingClientRect()`, que ficaria defasado enquanto o
    // Angular ainda não aplicou o novo zoom ao DOM.
    const areaVisivel = { width: viewport.clientWidth, height: viewport.clientHeight };
    const conteudo = { width: img.offsetWidth * this.zoom, height: img.offsetHeight * this.zoom };
    const limitado = limitarPan({ x, y }, areaVisivel, conteudo);

    this.panX = limitado.x;
    this.panY = limitado.y;
  }

  alternarGrade(): void {
    this.gradeVisivel = !this.gradeVisivel;
  }

  alternarPrumo(): void {
    this.prumoVisivel = !this.prumoVisivel;
  }

  ajustarDivisoes(event: Event): void {
    this.divisoesGrade = Number((event.target as HTMLInputElement).value);
  }

  // ------------------------------------------------------------------ ponteiro

  onPointerDown(event: PointerEvent): void {
    // Mantém os eventos do gesto neste elemento mesmo se o dedo sair da foto.
    (event.target as Element | null)?.setPointerCapture?.(event.pointerId);

    const ponto: PontoTela = { x: event.clientX, y: event.clientY };
    this.ponteiros.set(event.pointerId, ponto);

    if (this.ponteiros.size === 2) {
      this.iniciarPinca();
      return;
    }
    if (this.ponteiros.size > 2) return;

    this.inicioPonteiro = ponto;
    this.panInicial = { x: this.panX, y: this.panY };

    if (this.somenteLeitura) {
      this.modo = 'pan';
      return;
    }

    const rect = this.rectImagem();
    if (!rect) {
      this.modo = 'pan';
      return;
    }

    const sobrePonto = landmarkMaisProximo(this.pontos, ponto, rect, TOLERANCIA_TOQUE_PX);
    if (sobrePonto) {
      this.historico.empilhar(this.estadoAtual());
      this.codigoArrastando = sobrePonto.codigo;
      this.modo = 'arrastar-ponto';
      return;
    }

    if (this.prumoVisivel && this.sobreAlcaPrumo(ponto, rect)) {
      this.historico.empilhar(this.estadoAtual());
      this.modo = 'arrastar-prumo';
      return;
    }

    this.modo = 'possivel-toque';
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.ponteiros.has(event.pointerId)) return;

    const ponto: PontoTela = { x: event.clientX, y: event.clientY };
    this.ponteiros.set(event.pointerId, ponto);

    if (this.modo === 'pinca') {
      this.atualizarPinca();
      return;
    }

    if (this.modo === 'possivel-toque' && distancia(ponto, this.inicioPonteiro) > LIMIAR_ARRASTE_PX) {
      this.modo = 'pan';
    }

    if (this.modo === 'pan') {
      this.aplicarPan(
        this.panInicial.x + (ponto.x - this.inicioPonteiro.x),
        this.panInicial.y + (ponto.y - this.inicioPonteiro.y)
      );
      return;
    }

    const rect = this.rectImagem();
    if (!rect) return;

    if (this.modo === 'arrastar-ponto' && this.codigoArrastando) {
      this.pontos = definirLandmark(this.pontos, this.codigoArrastando, paraNormalizado(ponto, rect));
      this.emitirAlteracao();
      return;
    }

    if (this.modo === 'arrastar-prumo') {
      this.prumoX = paraNormalizado(ponto, rect).x;
      this.emitirAlteracao();
    }
  }

  onPointerUp(event: PointerEvent): void {
    const ponto = this.ponteiros.get(event.pointerId);
    this.ponteiros.delete(event.pointerId);

    if (this.modo === 'possivel-toque' && ponto && distancia(ponto, this.inicioPonteiro) <= LIMIAR_ARRASTE_PX) {
      this.marcarProximo(ponto);
    }

    if (this.ponteiros.size === 0) {
      this.modo = 'nenhum';
      this.codigoArrastando = null;
    } else if (this.modo === 'pinca' && this.ponteiros.size === 1) {
      // Sobrou um dedo depois da pinça: continua como pan, sem saltar a imagem.
      const restante = [...this.ponteiros.values()][0];
      this.inicioPonteiro = restante;
      this.panInicial = { x: this.panX, y: this.panY };
      this.modo = 'pan';
    }
  }

  private iniciarPinca(): void {
    const [a, b] = [...this.ponteiros.values()];
    this.distanciaPincaInicial = distancia(a, b);
    this.zoomInicialPinca = this.zoom;
    this.modo = 'pinca';
  }

  private atualizarPinca(): void {
    if (this.ponteiros.size < 2 || this.distanciaPincaInicial === 0) return;

    const [a, b] = [...this.ponteiros.values()];
    const fator = distancia(a, b) / this.distanciaPincaInicial;
    const meio: PontoTela = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

    this.aplicarZoom(this.zoomInicialPinca * fator, meio);
  }

  private marcarProximo(ponto: PontoTela): void {
    if (this.somenteLeitura) return;

    const proximo = this.proximo;
    const rect = this.rectImagem();
    if (!proximo || !rect || !this.dentroDaImagem(ponto, rect)) return;

    this.historico.empilhar(this.estadoAtual());
    this.pontos = definirLandmark(this.pontos, proximo.codigo, paraNormalizado(ponto, rect));
    this.emitirAlteracao();
  }

  /** Reposiciona um ponto já marcado pelo checklist, retomando a marcação nele. */
  remarcar(codigo: CodigoLandmark): void {
    if (this.somenteLeitura || !this.estaMarcado(codigo)) return;

    this.historico.empilhar(this.estadoAtual());
    this.pontos = this.pontos.filter(p => p.codigo !== codigo);
    this.emitirAlteracao();
  }

  desfazer(): void {
    if (!this.podeDesfazer) return;

    const anterior = this.historico.desfazer();
    if (!anterior) return;

    this.pontos = anterior.landmarks;
    this.prumoX = anterior.linhaPrumoX ?? 0.5;
    this.emitirAlteracao();
  }

  private sobreAlcaPrumo(ponto: PontoTela, rect: RetanguloImagem): boolean {
    if (this.alturaNatural <= 0) return false;

    const alca = paraTela({ x: this.prumoX, y: this.prumoAlcaY / this.alturaNatural }, rect);
    return distancia(ponto, alca) <= TOLERANCIA_TOQUE_PX;
  }

  private dentroDaImagem(ponto: PontoTela, rect: RetanguloImagem): boolean {
    return (
      ponto.x >= rect.left &&
      ponto.x <= rect.left + rect.width &&
      ponto.y >= rect.top &&
      ponto.y <= rect.top + rect.height
    );
  }

  private rectImagem(): RetanguloImagem | null {
    const img = this.fotoRef?.nativeElement;
    if (!img) return null;

    const { left, top, width, height } = img.getBoundingClientRect();
    return width > 0 && height > 0 ? { left, top, width, height } : null;
  }

  private estadoAtual(): EstadoMarcacao {
    return { landmarks: [...this.pontos], linhaPrumoX: this.prumoX };
  }

  private emitirAlteracao(): void {
    this.marcacaoAlterada.emit(this.estadoAtual());
  }
}
