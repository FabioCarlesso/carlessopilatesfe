import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { LandmarkDTO, MetricasPosturaisDTO } from '../../../core/models/avaliacao-postural';
import { LIMIAR_ASSIMETRIA_GRAUS, MedidaPostural, montarMedidas } from '../../utils/metricas-posturais';

/**
 * Painel "Medidas" da Tela 3 do simetrógrafo: os desníveis calculados a partir
 * dos pontos marcados, com as assimetrias destacadas.
 *
 * É puramente apresentacional — recebe as métricas já calculadas (prévia local
 * durante a marcação, valores da API depois de salvar) e os pontos, de onde sai
 * a direção do desnível.
 */
@Component({
  selector: 'app-painel-medidas-posturais',
  imports: [],
  templateUrl: './painel-medidas-posturais.component.html',
  styleUrl: './painel-medidas-posturais.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PainelMedidasPosturaisComponent {
  @Input() metricas: MetricasPosturaisDTO | null = null;
  @Input() landmarks: readonly LandmarkDTO[] = [];
  /** Sinaliza que os números são prévia local, ainda não confirmada pela API. */
  @Input() previa = false;

  readonly limiar = LIMIAR_ASSIMETRIA_GRAUS;

  get medidas(): MedidaPostural[] {
    return montarMedidas(this.metricas, this.landmarks);
  }
}
