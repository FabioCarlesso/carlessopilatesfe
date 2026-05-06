import { TestBed } from '@angular/core/testing';
import { UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { roleGuard } from './role.guard';
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
      id: 1, name: 'Admin', email: 'admin@carlessopilates.com', role: 'ADMIN'
    }));

    const result = TestBed.runInInjectionContext(() => roleGuard(['ADMIN'])({} as any, {} as any));
    expect(result).toBeTrue();
  });

  it('should allow activation for USER when USER is required', () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('currentUser', JSON.stringify({
      id: 2, name: 'Usuário', email: 'user@carlessopilates.com', role: 'USER'
    }));

    const result = TestBed.runInInjectionContext(() => roleGuard(['USER'])({} as any, {} as any));
    expect(result).toBeTrue();
  });

  it('should allow activation when multiple roles are accepted and user matches one', () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('currentUser', JSON.stringify({
      id: 2, name: 'Usuário', email: 'user@carlessopilates.com', role: 'USER'
    }));

    const result = TestBed.runInInjectionContext(() => roleGuard(['ADMIN', 'USER'])({} as any, {} as any));
    expect(result).toBeTrue();
  });

  it('should redirect to /403 when authenticated user lacks required role', () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('currentUser', JSON.stringify({
      id: 2, name: 'Usuário', email: 'user@carlessopilates.com', role: 'USER'
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

  it('should redirect to /403 when token exists but user data is missing', () => {
    localStorage.setItem('accessToken', 'token');

    const result = TestBed.runInInjectionContext(() => roleGuard(['ADMIN'])({} as any, {} as any));
    expect(result instanceof UrlTree).toBeTrue();
    expect((result as UrlTree).toString()).toBe('/403');
  });
});
