import { TestBed } from '@angular/core/testing';
import { UrlTree } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { visitanteGuard } from './visitante.guard';
import { AuthService } from '../services/auth.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('visitanteGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      providers: [AuthService]
    });
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  it('should allow activation when there is no session', () => {
    const result = TestBed.runInInjectionContext(() => visitanteGuard({} as any, {} as any));
    expect(result).toBeTrue();
  });

  it('should redirect to /inicio when already authenticated', () => {
    localStorage.setItem('accessToken', 'token');
    const result = TestBed.runInInjectionContext(() => visitanteGuard({} as any, {} as any));
    expect(result instanceof UrlTree).toBeTrue();
    expect((result as UrlTree).toString()).toBe('/inicio');
  });
});
