import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PagamentoRequestDTO, PagamentoResponseDTO } from '../models/plano';

@Injectable({ providedIn: 'root' })
export class PagamentoService {
  private readonly apiUrl = '/api';

  constructor(private http: HttpClient) {}

  listar(pacienteId: number): Observable<PagamentoResponseDTO[]> {
    return this.http.get<PagamentoResponseDTO[]>(`${this.apiUrl}/pacientes/${pacienteId}/pagamentos`);
  }

  criar(dto: PagamentoRequestDTO): Observable<PagamentoResponseDTO> {
    return this.http.post<PagamentoResponseDTO>(`${this.apiUrl}/pagamentos`, dto);
  }

  pagar(pagamentoId: number, dataPagamento: string): Observable<PagamentoResponseDTO> {
    return this.http.patch<PagamentoResponseDTO>(
      `${this.apiUrl}/pagamentos/${pagamentoId}/pagar`,
      { dataPagamento }
    );
  }
}
