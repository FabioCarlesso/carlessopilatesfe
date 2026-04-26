import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ProfissionalPage,
  ProfissionalPagamentoRelatorioDTO,
  ProfissionalRequestDTO,
  ProfissionalResponseDTO,
  ProfissionalUpdateDTO
} from '../models/profissional';

@Injectable({
  providedIn: 'root'
})
export class ProfissionalService {
  private readonly apiUrl = '/api/profissionais';

  constructor(private http: HttpClient) {}

  listar(page = 0, size = 10): Observable<ProfissionalPage> {
    const params = new HttpParams().set('page', page).set('size', size).set('sort', 'nome');
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
}
