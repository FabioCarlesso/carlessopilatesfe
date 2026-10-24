import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, finalize, shareReplay, tap, throwError } from 'rxjs';
import {
  AuthenticatedUser,
  ForgotPasswordRequestDTO,
  LoginRequestDTO,
  LoginResponseDTO,
  RefreshTokenRequestDTO,
  ResetPasswordRequestDTO,
  USER_ROLES,
  UserRole
} from '../models/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = '/api/auth/login';
  private readonly refreshUrl = '/api/auth/refresh';
  private readonly logoutUrl = '/api/auth/logout';
  private readonly forgotPasswordUrl = '/api/auth/forgot-password';
  private readonly resetPasswordUrl = '/api/auth/reset-password';
  private readonly tokenKey = 'accessToken';
  private readonly refreshTokenKey = 'refreshToken';
  private readonly currentUserKey = 'currentUser';

  /**
   * Refresh em andamento, compartilhado por todas as requisições que receberem
   * `401` enquanto ele não termina. A API rotaciona o refresh token a cada uso e
   * trata a reapresentação do token antigo como vazamento, então dois refreshes
   * em paralelo derrubariam a sessão.
   */
  private refreshEmAndamento$: Observable<LoginResponseDTO> | null = null;

  constructor(private http: HttpClient, private router: Router) {}

  login(dto: LoginRequestDTO): Observable<LoginResponseDTO> {
    return this.http.post<LoginResponseDTO>(this.apiUrl, dto).pipe(
      tap(res => {
        this.storeTokens(res);
        localStorage.setItem(this.currentUserKey, JSON.stringify(res.user));
      })
    );
  }

  /**
   * Troca o refresh token guardado por um novo par de tokens. Chamadas feitas
   * enquanto um refresh está em andamento recebem o resultado desse mesmo refresh.
   * Falha com erro não-HTTP quando não há refresh token guardado.
   */
  refresh(): Observable<LoginResponseDTO> {
    if (this.refreshEmAndamento$) {
      return this.refreshEmAndamento$;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('Sessão sem refresh token.'));
    }

    const dto: RefreshTokenRequestDTO = { refreshToken };
    this.refreshEmAndamento$ = this.http.post<LoginResponseDTO>(this.refreshUrl, dto).pipe(
      // Se a sessão foi encerrada (ou trocada por um novo login) enquanto o
      // refresh estava em voo, o par recebido não pode ressuscitá-la.
      tap(res => {
        if (this.getRefreshToken() === refreshToken) {
          this.storeTokens(res);
          // A API devolve o usuário atual no refresh: papéis acrescentados pelo
          // admin passam a valer na tela sem exigir novo login.
          if (res.user) {
            localStorage.setItem(this.currentUserKey, JSON.stringify(res.user));
          }
        }
      }),
      finalize(() => (this.refreshEmAndamento$ = null)),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.refreshEmAndamento$;
  }

  forgotPassword(email: string): Observable<void> {
    const dto: ForgotPasswordRequestDTO = { email };
    return this.http.post<void>(this.forgotPasswordUrl, dto);
  }

  resetPassword(dto: ResetPasswordRequestDTO): Observable<void> {
    return this.http.post<void>(this.resetPasswordUrl, dto);
  }

  /**
   * Encerra a sessão no servidor e localmente. A chamada a `/auth/logout` não
   * bloqueia a saída: a sessão local é limpa e o usuário vai para o login mesmo
   * que ela falhe.
   */
  logout(): void {
    const refreshToken = this.getRefreshToken();
    this.clearSession();
    this.router.navigate(['/login']);

    if (refreshToken) {
      const dto: RefreshTokenRequestDTO = { refreshToken };
      this.http.post<void>(this.logoutUrl, dto).subscribe({ error: () => undefined });
    }
  }

  clearSession(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.currentUserKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
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

  getCurrentUserRoles(): UserRole[] {
    return this.getCurrentUser()?.roles ?? [];
  }

  isAdmin(): boolean {
    return this.hasRole('ADMIN');
  }

  hasRole(role: UserRole): boolean {
    return this.getCurrentUserRoles().includes(role);
  }

  /** Verdadeiro se o usuário tem ao menos um dos papéis — ex.: `hasAnyRole(PAPEIS.clinica)`. */
  hasAnyRole(roles: readonly UserRole[]): boolean {
    const atuais = this.getCurrentUserRoles();
    return roles.some(role => atuais.includes(role));
  }

  private storeTokens(res: LoginResponseDTO): void {
    localStorage.setItem(this.tokenKey, res.accessToken);
    if (res.refreshToken) {
      localStorage.setItem(this.refreshTokenKey, res.refreshToken);
    } else {
      localStorage.removeItem(this.refreshTokenKey);
    }
  }

  private isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    const user = value as Partial<AuthenticatedUser>;
    // Sessão gravada antes da #128 traz `role` (string) e cai aqui: é descartada
    // e o usuário loga de novo, já recebendo `roles`.
    const validRoles =
      Array.isArray(user.roles) &&
      user.roles.length > 0 &&
      user.roles.every(role => USER_ROLES.includes(role));

    return (
      typeof user.id === 'number' &&
      Number.isSafeInteger(user.id) &&
      typeof user.name === 'string' &&
      user.name.trim().length > 0 &&
      typeof user.email === 'string' &&
      user.email.trim().length > 0 &&
      validRoles &&
      (user.ativo === undefined || typeof user.ativo === 'boolean')
    );
  }
}
