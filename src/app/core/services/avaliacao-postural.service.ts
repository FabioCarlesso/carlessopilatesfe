import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AvaliacaoPosturalFotoResponseDTO,
  AvaliacaoPosturalRequestDTO,
  AvaliacaoPosturalResponseDTO,
  AvaliacaoPosturalUpdateDTO
} from '../models/avaliacao-postural';

@Injectable({
  providedIn: 'root'
})
export class AvaliacaoPosturalService {
  private readonly apiUrl = '/api/avaliacoes-posturais';

  constructor(private http: HttpClient) {}

  criar(dto: AvaliacaoPosturalRequestDTO): Observable<AvaliacaoPosturalResponseDTO> {
    return this.http.post<AvaliacaoPosturalResponseDTO>(this.apiUrl, dto);
  }

  listarPorAvaliacaoFisioterapeutica(avaliacaoFisioterapeuticaId: number): Observable<AvaliacaoPosturalResponseDTO[]> {
    return this.http.get<AvaliacaoPosturalResponseDTO[]>(
      `${this.apiUrl}/avaliacao-fisioterapeutica/${avaliacaoFisioterapeuticaId}`
    );
  }

  buscarPorId(id: number): Observable<AvaliacaoPosturalResponseDTO> {
    return this.http.get<AvaliacaoPosturalResponseDTO>(`${this.apiUrl}/${id}`);
  }

  /** Salva a marcação em rascunho; a API recalcula as métricas e as devolve na resposta. */
  atualizar(id: number, dto: AvaliacaoPosturalUpdateDTO): Observable<AvaliacaoPosturalResponseDTO> {
    return this.http.put<AvaliacaoPosturalResponseDTO>(`${this.apiUrl}/${id}`, dto);
  }

  enviarFoto(id: number, foto: File): Observable<AvaliacaoPosturalFotoResponseDTO> {
    const formData = new FormData();
    formData.append('foto', foto);
    return this.http.put<AvaliacaoPosturalFotoResponseDTO>(`${this.apiUrl}/${id}/foto`, formData);
  }

  baixarFoto(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/foto`, { responseType: 'blob' });
  }

  cancelar(id: number): Observable<AvaliacaoPosturalResponseDTO> {
    return this.http.patch<AvaliacaoPosturalResponseDTO>(`${this.apiUrl}/${id}/cancelar`, {});
  }
}
