import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
}
