import { TestBed } from '@angular/core/testing';
import { UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('authGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      providers: [AuthService]
    });
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  it('should allow activation when authenticated', () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('currentUser', JSON.stringify({
      id: 1, name: 'Recepção', email: 'recepcao@carlessopilates.com', roles: ['RECEPCAO']
    }));
    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
    expect(result).toBeTrue();
  });

  it('should redirect to /login when not authenticated', () => {
    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
    expect(result instanceof UrlTree).toBeTrue();
    expect((result as UrlTree).toString()).toBe('/login');
  });

  it('should discard a session stored before the roles list and redirect to /login', () => {
    localStorage.setItem('accessToken', 'token');
    localStorage.setItem('refreshToken', 'refresh');
    localStorage.setItem('currentUser', JSON.stringify({
      id: 1, name: 'Admin', email: 'admin@carlessopilates.com', role: 'ADMIN'
    }));

    const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));

    expect((result as UrlTree).toString()).toBe('/login');
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('currentUser')).toBeNull();
  });
});
