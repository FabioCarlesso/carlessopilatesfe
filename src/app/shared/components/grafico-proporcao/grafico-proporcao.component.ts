import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { calcularProporcao, Proporcao, SegmentoProporcao } from '../../utils/grafico-proporcao';

export type TipoGraficoProporcao = 'rosca' | 'barra';

// Gráfico de proporção do dashboard (issue #120): partes de um todo como rosca
// (SVG) ou barra empilhada (CSS), sem biblioteca de gráficos. O desenho é
// decorativo (`aria-hidden`): os números ficam na legenda, em texto, ao lado da
// cor de cada parte — cor sozinha não é informação (WCAG 1.4.1). A geometria e
// os percentuais saem de `calcularProporcao`, em `shared/utils/`.
@Component({
  selector: 'app-grafico-proporcao',
  imports: [],
  templateUrl: './grafico-proporcao.component.html',
  styleUrl: './grafico-proporcao.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GraficoProporcaoComponent implements OnChanges {
  @Input() tipo: TipoGraficoProporcao = 'barra';
  /** Nome acessível do gráfico, anunciado pelo leitor de tela antes da legenda. */
  @Input({ required: true }) titulo = '';
  @Input() segmentos: readonly SegmentoProporcao[] = [];
  /** Unidade do total no centro da rosca (ex.: "pagamentos"). */
  @Input() rotuloTotal = 'registros';
  /** Frase exibida quando todas as partes são zero, no lugar de um desenho vazio sem explicação. */
  @Input() textoVazio = 'Nenhum registro.';

  proporcao: Proporcao = { total: 0, segmentos: [] };

  ngOnChanges(): void {
    this.proporcao = calcularProporcao(this.segmentos);
  }

  /** Comprimento da fatia e do vão até o fim do círculo, com `pathLength="100"`. */
  tracoFatia(fracao: number): string {
    const comprimento = fracao * 100;
    return `${comprimento} ${100 - comprimento}`;
  }

  /** Recuo negativo empurra a fatia para depois das anteriores, no sentido horário. */
  deslocamentoFatia(inicio: number): number {
    return -inicio * 100;
  }
}
