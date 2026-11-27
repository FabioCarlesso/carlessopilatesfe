import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  PontosDorRegistroDTO,
  VISTA_CORPORAL_LABEL,
  VISTAS_CORPORAIS,
  VistaCorporal
} from '../../../core/models/ponto-dor';
import { PontoDorService } from '../../../core/services/ponto-dor.service';
import { LocalDatePipe } from '../../pipes/local-date.pipe';
import { mensagemErroPontosDor } from '../../utils/mapa-corporal';
import { CarregandoComponent } from '../carregando/carregando.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { MapaCorporalComponent } from '../mapa-corporal/mapa-corporal.component';

/** Registro do comparativo com o título já resolvido ("Avaliação inicial", "Reavaliação"...). */
export interface RegistroComparativo extends PontosDorRegistroDTO {
  titulo: string;
}

/**
 * Comparativo do mapa de dor (issue #307): os pontos de cada avaliação e
 * reavaliação do paciente lado a lado, uma vista de cada vez, do registro mais
 * antigo ao mais recente (`GET /pacientes/{id}/pontos-dor`, que só traz registros
 * com pontos). Cada registro abre com o desenho da versão em que foi marcado.
 */
@Component({
  selector: 'app-comparativo-mapa-dor',
  imports: [LocalDatePipe, CarregandoComponent, EmptyStateComponent, MapaCorporalComponent],
  templateUrl: './comparativo-mapa-dor.component.html',
  styleUrl: './comparativo-mapa-dor.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class ComparativoMapaDorComponent implements OnChanges {
  @Input({ required: true }) pacienteId!: number;
  /** Qualquer mudança recarrega o comparativo — o fluxo passa a linha do tempo, que muda a cada registro salvo. */
  @Input() gatilho: unknown = null;

  readonly vistas = VISTAS_CORPORAIS;
  readonly vistaLabel = VISTA_CORPORAL_LABEL;

  registros: RegistroComparativo[] = [];
  vista: VistaCorporal = 'FRENTE';
  loading = false;
  erro: string | null = null;

  constructor(private pontoDorService: PontoDorService, private destroyRef: DestroyRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pacienteId'] || changes['gatilho']) this.carregar();
  }

  carregar(): void {
    this.loading = true;
    this.erro = null;
    this.pontoDorService.historicoDoPaciente(this.pacienteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: registros => {
          this.registros = comTitulos(registros);
          // Abre na primeira vista com pontos, para o comparativo não começar vazio.
          if (!this.registros.some(r => r.pontos.some(p => p.vista === this.vista))) {
            this.vista = this.vistas.find(v => this.registros.some(r => r.pontos.some(p => p.vista === v))) ?? this.vista;
          }
          this.loading = false;
        },
        error: (err: unknown) => {
          this.erro = mensagemErroPontosDor(err, 'Erro ao carregar o comparativo do mapa de dor.');
          this.loading = false;
        }
      });
  }

  selecionarVista(vista: VistaCorporal): void {
    this.vista = vista;
  }

  totalNaVista(vista: VistaCorporal): number {
    return this.registros.reduce((total, r) => total + r.pontos.filter(p => p.vista === vista).length, 0);
  }
}

/** A primeira avaliação fisioterapêutica é a avaliação inicial, como na linha do tempo do fluxo. */
function comTitulos(registros: readonly PontosDorRegistroDTO[]): RegistroComparativo[] {
  let primeiraAvaliacao = true;
  return registros.map(registro => {
    let titulo = 'Reavaliação';
    if (registro.origem === 'AVALIACAO') {
      titulo = primeiraAvaliacao ? 'Avaliação inicial' : 'Avaliação fisioterapêutica';
      primeiraAvaliacao = false;
    }
    return { ...registro, titulo };
  });
}
