import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AulaResponseDTO } from '../models/plano';

@Injectable({ providedIn: 'root' })
export class AulaService {
  private readonly apiUrl = '/api';

  constructor(private http: HttpClient) {}

  listarPorPaciente(pacienteId: number): Observable<AulaResponseDTO[]> {
    return this.http.get<AulaResponseDTO[]>(`${this.apiUrl}/aulas/paciente/${pacienteId}`);
  }

  listarPorPagamento(pagamentoId: number): Observable<AulaResponseDTO[]> {
    return this.http.get<AulaResponseDTO[]>(`${this.apiUrl}/aulas/pagamento/${pagamentoId}`);
  }

  realizar(aulaId: number): Observable<AulaResponseDTO> {
    return this.http.patch<AulaResponseDTO>(`${this.apiUrl}/aulas/${aulaId}/realizar`, {});
  }
}
