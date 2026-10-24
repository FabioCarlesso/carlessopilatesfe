import { TestBed } from '@angular/core/testing';
import { UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { roleGuard } from './role.guard';
import { PAPEIS } from '../models/auth';
import { AuthService } from '../services/auth.service';

describe('roleGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      providers: [AuthService]
    });
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  it('should allow activation for ADMIN when ADMIN is required', () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('currentUser', JSON.stringify({
      id: 1, name: 'Admin', email: 'admin@carlessopilates.com', roles: ['ADMIN']
    }));

    const result = TestBed.runInInjectionContext(() => roleGuard(['ADMIN'])({} as any, {} as any));
    expect(result).toBeTrue();
  });

  it('should allow activation when multiple roles are accepted and user matches one', () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('currentUser', JSON.stringify({
      id: 2, name: 'Usuário', email: 'user@carlessopilates.com', roles: ['RECEPCAO']
    }));

    const result = TestBed.runInInjectionContext(() => roleGuard(PAPEIS.agenda)({} as any, {} as any));
    expect(result).toBeTrue();
  });

  it('should allow activation when any accumulated role belongs to the area', () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('currentUser', JSON.stringify({
      id: 3, name: 'Fisio', email: 'fisio@carlessopilates.com', roles: ['RECEPCAO', 'PROFISSIONAL']
    }));

    const result = TestBed.runInInjectionContext(() => roleGuard(PAPEIS.clinica)({} as any, {} as any));
    expect(result).toBeTrue();
  });

  it('should require one role from each group when several groups are given', () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('currentUser', JSON.stringify({
      id: 4, name: 'Fin', email: 'fin@carlessopilates.com', roles: ['FINANCEIRO']
    }));
    // FINANCEIRO tem cobrança, mas não agenda.
    const negado = TestBed.runInInjectionContext(
      () => roleGuard(PAPEIS.agenda, PAPEIS.cobranca)({} as any, {} as any));
    expect((negado as UrlTree).toString()).toBe('/403');

    localStorage.setItem('currentUser', JSON.stringify({
      id: 4, name: 'Fin', email: 'fin@carlessopilates.com', roles: ['PROFISSIONAL', 'FINANCEIRO']
    }));
    const liberado = TestBed.runInInjectionContext(
      () => roleGuard(PAPEIS.agenda, PAPEIS.cobranca)({} as any, {} as any));
    expect(liberado).toBeTrue();
  });

  it('should redirect to /403 when authenticated user lacks required role', () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('currentUser', JSON.stringify({
      id: 2, name: 'Usuário', email: 'user@carlessopilates.com', roles: ['RECEPCAO']
    }));

    const result = TestBed.runInInjectionContext(() => roleGuard(['ADMIN'])({} as any, {} as any));
    expect(result instanceof UrlTree).toBeTrue();
    expect((result as UrlTree).toString()).toBe('/403');
  });

  it('should redirect to /login when not authenticated', () => {
    const result = TestBed.runInInjectionContext(() => roleGuard(['ADMIN'])({} as any, {} as any));
    expect(result instanceof UrlTree).toBeTrue();
    expect((result as UrlTree).toString()).toBe('/login');
  });

  it('should redirect to /login and clear session when token exists but user data is missing', () => {
    localStorage.setItem('accessToken', 'token');

    const result = TestBed.runInInjectionContext(() => roleGuard(['ADMIN'])({} as any, {} as any));
    expect(result instanceof UrlTree).toBeTrue();
    expect((result as UrlTree).toString()).toBe('/login');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('currentUser')).toBeNull();
  });

  it('should redirect to /login and clear session when stored user data is invalid', () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('currentUser', 'invalid-json');

    const result = TestBed.runInInjectionContext(() => roleGuard(['ADMIN'])({} as any, {} as any));
    expect(result instanceof UrlTree).toBeTrue();
    expect((result as UrlTree).toString()).toBe('/login');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('currentUser')).toBeNull();
  });
});
