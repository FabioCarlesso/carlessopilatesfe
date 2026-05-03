import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AvaliacaoFisioterapeuticaRequestDTO,
  AvaliacaoFisioterapeuticaResponseDTO,
  AvaliacaoFisioterapeuticaUpdateDTO
} from '../models/avaliacao-fisioterapeutica';

@Injectable({
  providedIn: 'root'
})
export class AvaliacaoFisioterapeuticaService {
  private readonly apiUrl = '/api/avaliacoes-fisioterapeuticas';

  constructor(private http: HttpClient) {}

  buscarPorPaciente(pacienteId: number): Observable<AvaliacaoFisioterapeuticaResponseDTO> {
    return this.http.get<AvaliacaoFisioterapeuticaResponseDTO>(`${this.apiUrl}/paciente/${pacienteId}`);
  }

  criar(dto: AvaliacaoFisioterapeuticaRequestDTO): Observable<AvaliacaoFisioterapeuticaResponseDTO> {
    return this.http.post<AvaliacaoFisioterapeuticaResponseDTO>(this.apiUrl, dto);
  }

  atualizar(id: number, dto: AvaliacaoFisioterapeuticaUpdateDTO): Observable<AvaliacaoFisioterapeuticaResponseDTO> {
    return this.http.put<AvaliacaoFisioterapeuticaResponseDTO>(`${this.apiUrl}/${id}`, dto);
  }
}
