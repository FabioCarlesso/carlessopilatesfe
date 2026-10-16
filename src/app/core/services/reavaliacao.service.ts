import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ReavaliacaoRequestDTO,
  ReavaliacaoResponseDTO,
  ReavaliacaoUpdateDTO
} from '../models/reavaliacao';
import { Page } from '../models/common';
import { buscarTodasAsPaginas, paramsPaginaHistorico } from '../models/paginacao';

@Injectable({
  providedIn: 'root'
})
export class ReavaliacaoService {
  private readonly apiUrl = '/api/reavaliacoes';

  constructor(private http: HttpClient) {}

  listarPorPaciente(pacienteId: number): Observable<ReavaliacaoResponseDTO[]> {
    return buscarTodasAsPaginas(pagina =>
      this.http.get<Page<ReavaliacaoResponseDTO>>(`${this.apiUrl}/paciente/${pacienteId}`, {
        params: paramsPaginaHistorico(pagina)
      })
    );
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
