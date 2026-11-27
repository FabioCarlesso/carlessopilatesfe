import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  Input,
  OnChanges,
  OnInit
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CatalogoOpcoesAvaliacao, DefinicaoCampoOpcoes } from '../../../core/models/opcoes-avaliacao';
import { OpcoesAvaliacaoService } from '../../../core/services/opcoes-avaliacao.service';
import {
  ComparativoOpcoes,
  ItemResumoOpcoes,
  MudancaOpcoes,
  compararOpcoes,
  descreverMudanca,
  resumirOpcoes
} from '../../utils/opcoes-avaliacao';

/**
 * Leitura das opções pré-definidas de um registro (issue #306), com os rótulos do
 * catálogo, e — quando recebe o `anterior` — o que mudou em relação a ele. Sem
 * catálogo os valores aparecem como gravados, para nada sumir da tela.
 */
@Component({
  selector: 'app-opcoes-avaliacao-resumo',
  templateUrl: './opcoes-avaliacao-resumo.component.html',
  styleUrl: './opcoes-avaliacao-resumo.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class OpcoesAvaliacaoResumoComponent implements OnInit, OnChanges {
  @Input({ required: true }) registro: object | null = null;
  @Input({ required: true }) campos: readonly DefinicaoCampoOpcoes[] = [];
  /** Registro anterior para o comparativo; `null` não compara. */
  @Input() anterior: object | null = null;
  /** Como o anterior é citado: "à avaliação inicial de 01/05/2026". */
  @Input() referencia: string | null = null;

  itens: ItemResumoOpcoes[] = [];
  comparativo: ComparativoOpcoes = { comparados: 0, mudancas: [] };
  readonly descrever: (m: MudancaOpcoes) => string = descreverMudanca;
  private catalogo: CatalogoOpcoesAvaliacao | null = null;

  constructor(
    private opcoesService: OpcoesAvaliacaoService,
    private destroyRef: DestroyRef,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.opcoesService.catalogo().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: catalogo => {
        this.catalogo = catalogo;
        this.atualizar();
      },
      // Sem catálogo o resumo já foi montado com os valores crus.
      error: () => undefined
    });
  }

  ngOnChanges(): void {
    this.atualizar();
  }

  private atualizar(): void {
    this.itens = resumirOpcoes(this.catalogo, this.campos, this.registro);
    this.comparativo = this.anterior
      ? compararOpcoes(this.catalogo, this.campos, this.anterior, this.registro)
      : { comparados: 0, mudancas: [] };
    this.cdr.markForCheck();
  }
}
