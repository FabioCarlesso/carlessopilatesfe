import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthenticatedUser, LoginRequestDTO, LoginResponseDTO, UserRole } from '../models/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = '/api/auth/login';
  private readonly tokenKey = 'accessToken';
  private readonly currentUserKey = 'currentUser';

  constructor(private http: HttpClient, private router: Router) {}

  login(dto: LoginRequestDTO): Observable<LoginResponseDTO> {
    return this.http.post<LoginResponseDTO>(this.apiUrl, dto).pipe(
      tap(res => {
        localStorage.setItem(this.tokenKey, res.accessToken);
        localStorage.setItem(this.currentUserKey, JSON.stringify(res.user));
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.currentUserKey);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): AuthenticatedUser | null {
    const raw = localStorage.getItem(this.currentUserKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as unknown;
      return this.isAuthenticatedUser(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  getCurrentUserRole(): UserRole | null {
    return this.getCurrentUser()?.role ?? null;
  }

  isAdmin(): boolean {
    return this.hasRole('ADMIN');
  }

  hasRole(role: UserRole): boolean {
    return this.getCurrentUserRole() === role;
  }

  private isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    const user = value as Partial<AuthenticatedUser>;
    const validRole = user.role === 'USER' || user.role === 'ADMIN';

    return (
      typeof user.id === 'number' &&
      Number.isSafeInteger(user.id) &&
      typeof user.name === 'string' &&
      user.name.trim().length > 0 &&
      typeof user.email === 'string' &&
      user.email.trim().length > 0 &&
      validRole &&
      (user.active === undefined || typeof user.active === 'boolean')
    );
  }
}
