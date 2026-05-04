import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SessaoRequestDTO, SessaoResponseDTO, SessaoUpdateDTO } from '../models/sessao';

@Injectable({
  providedIn: 'root'
})
export class SessaoService {
  private readonly apiUrl = '/api/sessoes';

  constructor(private http: HttpClient) {}

  listarPorPaciente(pacienteId: number): Observable<SessaoResponseDTO[]> {
    return this.http.get<SessaoResponseDTO[]>(`${this.apiUrl}/paciente/${pacienteId}`);
  }

  buscar(id: number): Observable<SessaoResponseDTO> {
    return this.http.get<SessaoResponseDTO>(`${this.apiUrl}/${id}`);
  }

  criar(dto: SessaoRequestDTO): Observable<SessaoResponseDTO> {
    return this.http.post<SessaoResponseDTO>(this.apiUrl, dto);
  }

  atualizar(id: number, dto: SessaoUpdateDTO): Observable<SessaoResponseDTO> {
    return this.http.put<SessaoResponseDTO>(`${this.apiUrl}/${id}`, dto);
  }

  realizar(id: number): Observable<SessaoResponseDTO> {
    return this.http.patch<SessaoResponseDTO>(`${this.apiUrl}/${id}/realizar`, {});
  }

  cancelar(id: number): Observable<SessaoResponseDTO> {
    return this.http.patch<SessaoResponseDTO>(`${this.apiUrl}/${id}/cancelar`, {});
  }
}
