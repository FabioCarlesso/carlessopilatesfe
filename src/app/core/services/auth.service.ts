import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { LoginRequestDTO, LoginResponseDTO, UsuarioLogado } from '../models/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = '/api/auth/login';
  private readonly tokenKey = 'accessToken';
  private readonly usuarioKey = 'usuarioLogado';

  constructor(private http: HttpClient, private router: Router) {}

  login(dto: LoginRequestDTO): Observable<LoginResponseDTO> {
    return this.http.post<LoginResponseDTO>(this.apiUrl, dto).pipe(
      tap(res => {
        localStorage.setItem(this.tokenKey, res.accessToken);
        const usuario: UsuarioLogado = { nome: res.nome, email: res.email, perfil: res.perfil };
        localStorage.setItem(this.usuarioKey, JSON.stringify(usuario));
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.usuarioKey);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getUsuario(): UsuarioLogado | null {
    const raw = localStorage.getItem(this.usuarioKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UsuarioLogado;
    } catch {
      return null;
    }
  }
}
