import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AvaliacaoPosturalFotoResponseDTO,
  AvaliacaoPosturalRequestDTO,
  AvaliacaoPosturalResponseDTO,
  AvaliacaoPosturalUpdateDTO,
  AvaliacaoPosturalVinculoDTO
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

  /** Todas as análises ativas do paciente — soltas, de avaliações e de reavaliações —, da mais recente à mais antiga. */
  listarPorPaciente(pacienteId: number): Observable<AvaliacaoPosturalResponseDTO[]> {
    return this.http.get<AvaliacaoPosturalResponseDTO[]>(`${this.apiUrl}/paciente/${pacienteId}`);
  }

  /** Vincula, troca ou remove (os dois nulos) o vínculo da análise; a API devolve a análise atualizada. */
  atualizarVinculo(id: number, dto: AvaliacaoPosturalVinculoDTO): Observable<AvaliacaoPosturalResponseDTO> {
    return this.http.patch<AvaliacaoPosturalResponseDTO>(`${this.apiUrl}/${id}/vinculo`, dto);
  }

  buscarPorId(id: number): Observable<AvaliacaoPosturalResponseDTO> {
    return this.http.get<AvaliacaoPosturalResponseDTO>(`${this.apiUrl}/${id}`);
  }

  /** Salva a marcação em rascunho; a API recalcula as métricas e as devolve na resposta. */
  atualizar(id: number, dto: AvaliacaoPosturalUpdateDTO): Observable<AvaliacaoPosturalResponseDTO> {
    return this.http.put<AvaliacaoPosturalResponseDTO>(`${this.apiUrl}/${id}`, dto);
  }

  /**
   * Fecha a análise. A API exige todos os pontos obrigatórios da vista marcados
   * e a foto enviada — caso contrário responde `422`; depois disso a análise
   * fica imutável.
   */
  concluir(id: number): Observable<AvaliacaoPosturalResponseDTO> {
    return this.http.patch<AvaliacaoPosturalResponseDTO>(`${this.apiUrl}/${id}/concluir`, {});
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
