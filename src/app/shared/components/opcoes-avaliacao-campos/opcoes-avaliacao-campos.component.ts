import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, Input, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  CampoOpcoesAvaliacao,
  CatalogoOpcoesAvaliacao,
  DefinicaoCampoOpcoes
} from '../../../core/models/opcoes-avaliacao';
import { OpcoesAvaliacaoService } from '../../../core/services/opcoes-avaliacao.service';
import { campoDoCatalogo } from '../../utils/opcoes-avaliacao';
import { CarregandoComponent } from '../carregando/carregando.component';
import { SeletorOpcoesComponent } from '../seletor-opcoes/seletor-opcoes.component';

interface GrupoOpcoes {
  def: DefinicaoCampoOpcoes;
  campo: CampoOpcoesAvaliacao;
}

/**
 * Bloco de opções pré-definidas de um formulário (issue #306): para cada campo, o
 * seletor montado a partir do catálogo e o seu "Outros / observações". Os
 * controles são da página (`controlesOpcoes`), que valida e envia; o bloco só
 * busca o catálogo e desenha. Sem catálogo, os valores do registro continuam no
 * formulário e voltam intactos no envio.
 */
@Component({
  selector: 'app-opcoes-avaliacao-campos',
  imports: [ReactiveFormsModule, CarregandoComponent, SeletorOpcoesComponent],
  templateUrl: './opcoes-avaliacao-campos.component.html',
  styleUrl: './opcoes-avaliacao-campos.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class OpcoesAvaliacaoCamposComponent implements OnInit {
  @Input({ required: true }) form!: FormGroup;
  @Input({ required: true }) campos: readonly DefinicaoCampoOpcoes[] = [];

  grupos: GrupoOpcoes[] = [];
  carregando = false;
  erro = false;

  constructor(
    private opcoesService: OpcoesAvaliacaoService,
    private destroyRef: DestroyRef,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando = true;
    this.erro = false;
    this.opcoesService.catalogo().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: catalogo => {
        this.grupos = this.montarGrupos(catalogo);
        this.carregando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.erro = true;
        this.carregando = false;
        this.cdr.markForCheck();
      }
    });
  }

  /** Campo que o catálogo não traz (API anterior) fica de fora. */
  private montarGrupos(catalogo: CatalogoOpcoesAvaliacao): GrupoOpcoes[] {
    return this.campos
      .map(def => ({ def, campo: campoDoCatalogo(catalogo, def.campo) }))
      .filter((grupo): grupo is GrupoOpcoes => grupo.campo !== null);
  }
}
