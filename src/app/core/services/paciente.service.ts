import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Page,
  PacienteRequestDTO,
  PacienteResponseDTO,
  PacienteUpdateDTO
} from '../models/paciente';

@Injectable({
  providedIn: 'root'
})
export class PacienteService {
  private readonly apiUrl = '/api/pacientes';

  constructor(private http: HttpClient) {}

  listar(page = 0, size = 10): Observable<Page<PacienteResponseDTO>> {
    const params = new HttpParams().set('page', page).set('size', size).set('sort', 'nome');
    return this.http.get<Page<PacienteResponseDTO>>(this.apiUrl, { params });
  }

  buscar(id: number): Observable<PacienteResponseDTO> {
    return this.http.get<PacienteResponseDTO>(`${this.apiUrl}/${id}`);
  }

  cadastrar(dto: PacienteRequestDTO): Observable<PacienteResponseDTO> {
    return this.http.post<PacienteResponseDTO>(this.apiUrl, dto);
  }

  atualizar(id: number, dto: PacienteUpdateDTO): Observable<PacienteResponseDTO> {
    return this.http.put<PacienteResponseDTO>(`${this.apiUrl}/${id}`, dto);
  }

  ativar(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/ativar`, {});
  }

  inativar(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/inativar`, {});
  }
}
