import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TRATA_403_LOCALMENTE } from '../interceptors/forbidden.interceptor';
import {
  RelatorioFinanceiroDTO,
  RelatorioFinanceiroFormatoExportacao,
  RelatorioNfseFiltros,
  RelatorioNfseFormatoExportacao,
  RelatorioNfseResponseDTO
} from '../models/relatorio';

@Injectable({
  providedIn: 'root'
})
export class RelatorioService {
  private readonly nfseUrl = '/api/api/relatorios/nfse';
  private readonly financeiroUrl = '/api/api/relatorios/financeiro';

  constructor(private http: HttpClient) {}

  relatorioNfse(
    competencia: string,
    filtros: RelatorioNfseFiltros = {}
  ): Observable<RelatorioNfseResponseDTO[]> {
    return this.http.get<RelatorioNfseResponseDTO[]>(this.nfseUrl, {
      params: this.nfseParams(competencia, filtros)
    });
  }

  exportarRelatorioNfse(
    competencia: string,
    formato: RelatorioNfseFormatoExportacao,
    filtros: RelatorioNfseFiltros = {}
  ): Observable<HttpResponse<Blob>> {
    return this.http.get(this.nfseUrl, {
      params: this.nfseParams(competencia, filtros).set('formato', formato),
      observe: 'response',
      responseType: 'blob'
    });
  }

  /**
   * Relatório financeiro consolidado (carlessopilatesapi#108). O `403` é tratado
   * pela tela, que mostra a mensagem no lugar de redirecionar para `/403`.
   */
  relatorioFinanceiro(inicio: string, fim: string): Observable<RelatorioFinanceiroDTO> {
    return this.http.get<RelatorioFinanceiroDTO>(this.financeiroUrl, {
      params: new HttpParams().set('inicio', inicio).set('fim', fim),
      context: new HttpContext().set(TRATA_403_LOCALMENTE, true)
    });
  }

  /** Diferente do relatório de NFSE, a API exporta por rota (`/pdf`, `/xlsx`), não por `?formato=`. */
  exportarRelatorioFinanceiro(
    inicio: string,
    fim: string,
    formato: RelatorioFinanceiroFormatoExportacao
  ): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.financeiroUrl}/${formato}`, {
      params: new HttpParams().set('inicio', inicio).set('fim', fim),
      context: new HttpContext().set(TRATA_403_LOCALMENTE, true),
      observe: 'response',
      responseType: 'blob'
    });
  }

  private nfseParams(competencia: string, filtros: RelatorioNfseFiltros): HttpParams {
    let params = new HttpParams().set('competencia', competencia);

    if (filtros.notaAnteriorEmitida !== null && filtros.notaAnteriorEmitida !== undefined) {
      params = params.set('notaAnteriorEmitida', String(filtros.notaAnteriorEmitida));
    }
    if (filtros.cpfNaNota !== null && filtros.cpfNaNota !== undefined) {
      params = params.set('cpfNaNota', String(filtros.cpfNaNota));
    }

    return params;
  }
}
