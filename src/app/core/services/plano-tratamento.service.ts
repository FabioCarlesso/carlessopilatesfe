import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  PlanoTratamentoRequestDTO,
  PlanoTratamentoResponseDTO,
  PlanoTratamentoUpdateDTO
} from '../models/plano-tratamento';
import { Page } from '../models/common';
import { buscarTodasAsPaginas, paramsPaginaHistorico } from '../models/paginacao';

@Injectable({
  providedIn: 'root'
})
export class PlanoTratamentoService {
  private readonly apiUrl = '/api/planos-tratamento';

  constructor(private http: HttpClient) {}

  listarPorPaciente(pacienteId: number): Observable<PlanoTratamentoResponseDTO[]> {
    return buscarTodasAsPaginas(pagina =>
      this.http.get<Page<PlanoTratamentoResponseDTO>>(`${this.apiUrl}/paciente/${pacienteId}`, {
        params: paramsPaginaHistorico(pagina)
      })
    );
  }

  buscar(id: number): Observable<PlanoTratamentoResponseDTO> {
    return this.http.get<PlanoTratamentoResponseDTO>(`${this.apiUrl}/${id}`);
  }

  criar(dto: PlanoTratamentoRequestDTO): Observable<PlanoTratamentoResponseDTO> {
    return this.http.post<PlanoTratamentoResponseDTO>(this.apiUrl, dto);
  }

  atualizar(id: number, dto: PlanoTratamentoUpdateDTO): Observable<PlanoTratamentoResponseDTO> {
    return this.http.put<PlanoTratamentoResponseDTO>(`${this.apiUrl}/${id}`, dto);
  }

  /** `DELETE` inativa o plano sem apagar o histórico; a listagem por paciente só devolve os ativos. */
  inativar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
