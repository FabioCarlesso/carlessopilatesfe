import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  RelatorioNfseFormatoExportacao,
  RelatorioNfseResponseDTO
} from '../models/relatorio';

@Injectable({
  providedIn: 'root'
})
export class RelatorioService {
  private readonly nfseUrl = '/api/api/relatorios/nfse';

  constructor(private http: HttpClient) {}

  relatorioNfse(
    competencia: string,
    notaAnteriorEmitida?: boolean | null
  ): Observable<RelatorioNfseResponseDTO[]> {
    return this.http.get<RelatorioNfseResponseDTO[]>(this.nfseUrl, {
      params: this.nfseParams(competencia, notaAnteriorEmitida)
    });
  }

  exportarRelatorioNfse(
    competencia: string,
    formato: RelatorioNfseFormatoExportacao,
    notaAnteriorEmitida?: boolean | null
  ): Observable<HttpResponse<Blob>> {
    return this.http.get(this.nfseUrl, {
      params: this.nfseParams(competencia, notaAnteriorEmitida).set('formato', formato),
      observe: 'response',
      responseType: 'blob'
    });
  }

  private nfseParams(competencia: string, notaAnteriorEmitida?: boolean | null): HttpParams {
    let params = new HttpParams().set('competencia', competencia);

    if (notaAnteriorEmitida !== null && notaAnteriorEmitida !== undefined) {
      params = params.set('notaAnteriorEmitida', String(notaAnteriorEmitida));
    }

    return params;
  }
}
