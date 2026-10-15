import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AvaliacaoFisioterapeuticaRequestDTO,
  AvaliacaoFisioterapeuticaResponseDTO,
  AvaliacaoFisioterapeuticaUpdateDTO
} from '../models/avaliacao-fisioterapeutica';
import { Page } from '../models/common';
import { buscarTodasAsPaginas, paramsPaginaHistorico } from '../models/paginacao';

@Injectable({
  providedIn: 'root'
})
export class AvaliacaoFisioterapeuticaService {
  private readonly apiUrl = '/api/avaliacoes-fisioterapeuticas';

  constructor(private http: HttpClient) {}

  listarPorPaciente(pacienteId: number): Observable<AvaliacaoFisioterapeuticaResponseDTO[]> {
    return buscarTodasAsPaginas(pagina =>
      this.http.get<Page<AvaliacaoFisioterapeuticaResponseDTO>>(`${this.apiUrl}/paciente/${pacienteId}`, {
        params: paramsPaginaHistorico(pagina)
      })
    );
  }

  criar(dto: AvaliacaoFisioterapeuticaRequestDTO): Observable<AvaliacaoFisioterapeuticaResponseDTO> {
    return this.http.post<AvaliacaoFisioterapeuticaResponseDTO>(this.apiUrl, dto);
  }

  atualizar(id: number, dto: AvaliacaoFisioterapeuticaUpdateDTO): Observable<AvaliacaoFisioterapeuticaResponseDTO> {
    return this.http.put<AvaliacaoFisioterapeuticaResponseDTO>(`${this.apiUrl}/${id}`, dto);
  }
}
