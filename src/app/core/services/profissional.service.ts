import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ProfissionalPage,
  ProfissionalPagamentoRelatorioDTO,
  ProfissionalRequestDTO,
  ProfissionalResponseDTO,
  ProfissionalUpdateDTO,
  TipoContrato
} from '../models/profissional';

export interface ProfissionalFiltro {
  nome?: string;
  email?: string;
  tipoContrato?: TipoContrato;
  percentualPagamentoAula?: number;
  ativo?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ProfissionalService {
  private readonly apiUrl = '/api/profissionais';

  constructor(private http: HttpClient) {}

  listar(page = 0, size = 10, filtro: ProfissionalFiltro = {}, sort = 'nome'): Observable<ProfissionalPage> {
    let params = new HttpParams().set('page', page).set('size', size).set('sort', sort);

    Object.entries(filtro).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<ProfissionalPage>(this.apiUrl, { params });
  }

  buscar(id: number): Observable<ProfissionalResponseDTO> {
    return this.http.get<ProfissionalResponseDTO>(`${this.apiUrl}/${id}`);
  }

  cadastrar(dto: ProfissionalRequestDTO): Observable<ProfissionalResponseDTO> {
    return this.http.post<ProfissionalResponseDTO>(this.apiUrl, dto);
  }

  atualizar(id: number, dto: ProfissionalUpdateDTO): Observable<ProfissionalResponseDTO> {
    return this.http.put<ProfissionalResponseDTO>(`${this.apiUrl}/${id}`, dto);
  }

  ativar(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/ativar`, {});
  }

  inativar(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/inativar`, {});
  }

  relatorioPagamento(id: number, inicio: string, fim: string): Observable<ProfissionalPagamentoRelatorioDTO> {
    const params = new HttpParams().set('inicio', inicio).set('fim', fim);
    return this.http.get<ProfissionalPagamentoRelatorioDTO>(`${this.apiUrl}/${id}/relatorio-pagamento`, { params });
  }

  exportarRelatorioPagamentoProfissionalPdf(id: number, inicio: string, fim: string): Observable<HttpResponse<Blob>> {
    return this.exportarRelatorioPagamentoProfissional(id, inicio, fim, 'pdf');
  }

  exportarRelatorioPagamentoProfissionalExcel(id: number, inicio: string, fim: string): Observable<HttpResponse<Blob>> {
    return this.exportarRelatorioPagamentoProfissional(id, inicio, fim, 'xlsx');
  }

  private exportarRelatorioPagamentoProfissional(
    id: number,
    inicio: string,
    fim: string,
    formato: 'pdf' | 'xlsx'
  ): Observable<HttpResponse<Blob>> {
    const params = new HttpParams().set('inicio', inicio).set('fim', fim);
    return this.http.get(`${this.apiUrl}/${id}/relatorio-pagamento/${formato}`, {
      params,
      observe: 'response',
      responseType: 'blob'
    });
  }
}
