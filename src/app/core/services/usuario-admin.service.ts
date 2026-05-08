import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthenticatedUser } from '../models/auth';
import {
  RoleOption,
  UsuarioAdminCreateRequestDTO,
  UsuarioAdminPage,
  UsuarioAdminResponseDTO,
  UsuarioAdminUpdateRequestDTO
} from '../models/usuario-admin';

@Injectable({
  providedIn: 'root'
})
export class UsuarioAdminService {
  private readonly apiUrl = '/api/users';

  constructor(private http: HttpClient) {}

  listar(page = 0, size = 10, sort = 'name'): Observable<UsuarioAdminPage> {
    const params = new HttpParams().set('page', page).set('size', size).set('sort', sort);
    return this.http.get<UsuarioAdminPage>(this.apiUrl, { params });
  }

  buscar(id: number): Observable<UsuarioAdminResponseDTO> {
    return this.http.get<UsuarioAdminResponseDTO>(`${this.apiUrl}/${id}`);
  }

  buscarPerfil(): Observable<AuthenticatedUser> {
    return this.http.get<AuthenticatedUser>(`${this.apiUrl}/me`);
  }

  cadastrar(dto: UsuarioAdminCreateRequestDTO): Observable<UsuarioAdminResponseDTO> {
    return this.http.post<UsuarioAdminResponseDTO>(this.apiUrl, dto);
  }

  atualizar(id: number, dto: UsuarioAdminUpdateRequestDTO): Observable<UsuarioAdminResponseDTO> {
    return this.http.put<UsuarioAdminResponseDTO>(`${this.apiUrl}/${id}`, dto);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  ativar(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/ativar`, {});
  }

  inativar(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/inativar`, {});
  }

  listarRoles(): Observable<RoleOption[]> {
    return this.http.get<RoleOption[]>(`${this.apiUrl}/roles`);
  }
}
