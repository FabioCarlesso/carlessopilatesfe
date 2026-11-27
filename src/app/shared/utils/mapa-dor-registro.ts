import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, catchError, map, of } from 'rxjs';
import { OrigemPontosDor, PontoDor, PontoDorDTO } from '../../core/models/ponto-dor';
import { PontoDorService } from '../../core/services/ponto-dor.service';
import { mensagemErroPontosDor } from './mapa-corporal';

/**
 * Estado da seção "Mapa de dor" de um formulário de avaliação ou reavaliação
 * (issue #307). Os pontos têm rota própria na API e só podem ser gravados com o
 * id do registro, então o formulário salva o registro primeiro e depois chama
 * {@link gravar}.
 *
 * O `PUT` substitui o conjunto inteiro: se a carga dos pontos falhou, a seção
 * fica bloqueada e nada é enviado, para não apagar os pontos que a tela não viu.
 * Sem alteração no mapa, também não há `PUT`.
 */
export class MapaDorRegistro {
  pontos: PontoDor[] = [];
  alterado = false;
  carregando = false;
  /** Falha na carga: a seção mostra o motivo e não grava. */
  erroCarga: string | null = null;

  constructor(
    private readonly service: PontoDorService,
    private readonly origem: OrigemPontosDor,
    private readonly destroyRef: DestroyRef
  ) {}

  get bloqueado(): boolean {
    return this.carregando || this.erroCarga !== null;
  }

  carregar(registroId: number): void {
    this.carregando = true;
    this.erroCarga = null;
    this.service.listar(this.origem, registroId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: pontos => {
          this.pontos = semId(pontos);
          this.alterado = false;
          this.carregando = false;
        },
        error: (err: unknown) => {
          this.erroCarga = mensagemErroPontosDor(err, 'Erro ao carregar o mapa de dor.');
          this.carregando = false;
        }
      });
  }

  alterar(pontos: PontoDor[]): void {
    if (this.bloqueado) return;
    this.pontos = pontos;
    this.alterado = true;
  }

  /**
   * Grava os pontos no registro, se o mapa foi alterado. Emite `null` quando deu
   * certo (ou não havia o que gravar) e a mensagem de erro quando a API recusou —
   * nunca falha, para o formulário decidir o que fazer com o registro já salvo.
   */
  gravar(registroId: number): Observable<string | null> {
    if (!this.alterado || this.bloqueado) return of(null);
    return this.service.salvar(this.origem, registroId, this.pontos).pipe(
      map(gravados => {
        this.pontos = semId(gravados);
        this.alterado = false;
        return null;
      }),
      catchError((err: unknown) => of(mensagemErroPontosDor(err, 'Erro ao salvar o mapa de dor.')))
    );
  }
}

function semId(pontos: readonly PontoDorDTO[]): PontoDor[] {
  return pontos.map(({ id: _id, ...ponto }) => ponto);
}
