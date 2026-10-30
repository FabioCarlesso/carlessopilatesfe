import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { AtalhoTeclado, GrupoAtalho } from '../../utils/atalhos-teclado';
import { ConfirmarDialogComponent } from '../confirmar-dialog/confirmar-dialog.component';

interface GrupoExibido {
  nome: GrupoAtalho;
  atalhos: AtalhoTeclado[];
}

/**
 * Lista dos atalhos de teclado do perfil atual, aberta pelo `?`. Reaproveita o
 * `ConfirmarDialogComponent` em modo informativo, que já entrega o diálogo
 * acessível: `role="dialog"` + `aria-modal`, foco preso no diálogo, Esc fecha e
 * o foco volta ao elemento que o tinha antes de abrir.
 */
@Component({
  selector: 'app-atalhos-ajuda',
  imports: [ConfirmarDialogComponent],
  templateUrl: './atalhos-ajuda.component.html',
  styleUrl: './atalhos-ajuda.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AtalhosAjudaComponent {
  @Input({ required: true }) set atalhos(atalhos: readonly AtalhoTeclado[]) {
    const nomes = [...new Set(atalhos.map(atalho => atalho.grupo))];
    this.grupos = nomes.map(nome => ({ nome, atalhos: atalhos.filter(atalho => atalho.grupo === nome) }));
  }

  @Output() fechar = new EventEmitter<void>();

  grupos: GrupoExibido[] = [];

  /** Partes de um token para exibição: `Ctrl+K` vira duas teclas. */
  partes(tecla: string): string[] {
    return tecla.length > 1 ? tecla.split('+') : [tecla];
  }
}
