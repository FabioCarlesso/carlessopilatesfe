import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TRATA_403_LOCALMENTE } from '../interceptors/forbidden.interceptor';
import {
  EvolucaoSessaoRequestDTO,
  EvolucaoSessaoResponseDTO,
  EvolucaoSessaoUpdateDTO
} from '../models/evolucao-sessao';

@Injectable({
  providedIn: 'root'
})
export class EvolucaoSessaoService {
  private readonly apiUrl = '/api/evolucoes-sessao';

  constructor(private http: HttpClient) {}

  listarPorPaciente(pacienteId: number): Observable<EvolucaoSessaoResponseDTO[]> {
    return this.http.get<EvolucaoSessaoResponseDTO[]>(`${this.apiUrl}/paciente/${pacienteId}`);
  }

  buscarPorSessao(sessaoId: number): Observable<EvolucaoSessaoResponseDTO> {
    return this.http.get<EvolucaoSessaoResponseDTO>(`${this.apiUrl}/sessao/${sessaoId}`);
  }

  criar(dto: EvolucaoSessaoRequestDTO): Observable<EvolucaoSessaoResponseDTO> {
    return this.http.post<EvolucaoSessaoResponseDTO>(this.apiUrl, dto);
  }

  atualizar(id: number, dto: EvolucaoSessaoUpdateDTO): Observable<EvolucaoSessaoResponseDTO> {
    return this.http.put<EvolucaoSessaoResponseDTO>(`${this.apiUrl}/${id}`, dto);
  }

  /** PDF de uma evolução (carlessopilatesapi#250); o `403` fica com a tela, como no prontuário. */
  exportarPdf(id: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.apiUrl}/${id}/pdf`, {
      context: new HttpContext().set(TRATA_403_LOCALMENTE, true),
      observe: 'response',
      responseType: 'blob'
    });
  }
}
