import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ReavaliacaoRequestDTO,
  ReavaliacaoResponseDTO,
  ReavaliacaoUpdateDTO
} from '../models/reavaliacao';

@Injectable({
  providedIn: 'root'
})
export class ReavaliacaoService {
  private readonly apiUrl = '/api/reavaliacoes';

  constructor(private http: HttpClient) {}

  listarPorPaciente(pacienteId: number): Observable<ReavaliacaoResponseDTO[]> {
    return this.http.get<ReavaliacaoResponseDTO[]>(`${this.apiUrl}/paciente/${pacienteId}`);
  }

  buscar(id: number): Observable<ReavaliacaoResponseDTO> {
    return this.http.get<ReavaliacaoResponseDTO>(`${this.apiUrl}/${id}`);
  }

  criar(dto: ReavaliacaoRequestDTO): Observable<ReavaliacaoResponseDTO> {
    return this.http.post<ReavaliacaoResponseDTO>(this.apiUrl, dto);
  }

  atualizar(id: number, dto: ReavaliacaoUpdateDTO): Observable<ReavaliacaoResponseDTO> {
    return this.http.put<ReavaliacaoResponseDTO>(`${this.apiUrl}/${id}`, dto);
  }
}
