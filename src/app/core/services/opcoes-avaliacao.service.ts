import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';
import { CatalogoOpcoesAvaliacao } from '../models/opcoes-avaliacao';

/**
 * Catálogo das opções pré-definidas da avaliação (issue #306). As listas só mudam
 * com deploy da API, então o catálogo é pedido uma vez e reaproveitado por todas
 * as telas da sessão; uma falha não fica em cache, e a próxima tela tenta de novo.
 */
@Injectable({
  providedIn: 'root'
})
export class OpcoesAvaliacaoService {
  private readonly apiUrl = '/api/avaliacoes/opcoes';
  private catalogo$: Observable<CatalogoOpcoesAvaliacao> | null = null;

  constructor(private http: HttpClient) {}

  catalogo(): Observable<CatalogoOpcoesAvaliacao> {
    if (!this.catalogo$) {
      this.catalogo$ = this.http.get<CatalogoOpcoesAvaliacao>(this.apiUrl).pipe(
        catchError(erro => {
          this.catalogo$ = null;
          return throwError(() => erro);
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.catalogo$;
  }
}
