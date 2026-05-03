import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AnamneseRequestDTO,
  AnamneseResponseDTO,
  AnamneseUpdateDTO
} from '../models/anamnese';

@Injectable({
  providedIn: 'root'
})
export class AnamneseService {
  private readonly apiUrl = '/api/anamneses';

  constructor(private http: HttpClient) {}

  buscarPorPaciente(pacienteId: number): Observable<AnamneseResponseDTO> {
    return this.http.get<AnamneseResponseDTO>(`${this.apiUrl}/paciente/${pacienteId}`);
  }

  criar(dto: AnamneseRequestDTO): Observable<AnamneseResponseDTO> {
    return this.http.post<AnamneseResponseDTO>(this.apiUrl, dto);
  }

  atualizar(id: number, dto: AnamneseUpdateDTO): Observable<AnamneseResponseDTO> {
    return this.http.put<AnamneseResponseDTO>(`${this.apiUrl}/${id}`, dto);
  }
}
