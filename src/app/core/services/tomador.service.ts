import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  TomadorFiltro,
  TomadorPacienteDTO,
  TomadorPage,
  TomadorRequestDTO,
  TomadorResponseDTO,
  TomadorUpdateDTO
} from '../models/tomador';

@Injectable({
  providedIn: 'root'
})
export class TomadorService {
  private readonly apiUrl = '/api/tomadores';

  constructor(private http: HttpClient) {}

  listar(page = 0, size = 10, filtro: TomadorFiltro = {}, sort = 'nome'): Observable<TomadorPage> {
    let params = new HttpParams().set('page', page).set('size', size).set('sort', sort);
    Object.entries(filtro).forEach(([chave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== '') {
        params = params.set(chave, String(valor));
      }
    });
    return this.http.get<TomadorPage>(this.apiUrl, { params });
  }

  buscar(id: number): Observable<TomadorResponseDTO> {
    return this.http.get<TomadorResponseDTO>(`${this.apiUrl}/${id}`);
  }

  pacientes(id: number): Observable<TomadorPacienteDTO[]> {
    return this.http.get<TomadorPacienteDTO[]>(`${this.apiUrl}/${id}/pacientes`);
  }

  cadastrar(dto: TomadorRequestDTO): Observable<TomadorResponseDTO> {
    return this.http.post<TomadorResponseDTO>(this.apiUrl, dto);
  }

  atualizar(id: number, dto: TomadorUpdateDTO): Observable<TomadorResponseDTO> {
    return this.http.put<TomadorResponseDTO>(`${this.apiUrl}/${id}`, dto);
  }

  ativar(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/ativar`, {});
  }

  inativar(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/inativar`, {});
  }
}
