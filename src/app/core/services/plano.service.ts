import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PlanoRequestDTO, PlanoResponseDTO } from '../models/plano';

@Injectable({ providedIn: 'root' })
export class PlanoService {
  private readonly apiUrl = '/api';

  constructor(private http: HttpClient) {}

  listar(pacienteId: number): Observable<PlanoResponseDTO[]> {
    return this.http.get<PlanoResponseDTO[]>(`${this.apiUrl}/planos/paciente/${pacienteId}`);
  }

  buscarAtivo(pacienteId: number): Observable<PlanoResponseDTO | null> {
    return this.http.get<PlanoResponseDTO | null>(`${this.apiUrl}/planos/paciente/${pacienteId}/ativo`);
  }

  criar(dto: PlanoRequestDTO): Observable<PlanoResponseDTO> {
    return this.http.post<PlanoResponseDTO>(`${this.apiUrl}/planos`, dto);
  }

  inativar(planoId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/planos/${planoId}`);
  }
}
