import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('LoginComponent', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['login', 'isAuthenticated']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, RouterTestingModule, HttpClientTestingModule],
      providers: [{ provide: AuthService, useValue: authServiceSpy }]
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render email and password fields', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('input[type="email"]')).toBeTruthy();
    expect(el.querySelector('input[type="password"]')).toBeTruthy();
  });

  it('should disable submit button when form is invalid', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(btn.disabled).toBeTrue();
  });

  it('should navigate to /pacientes on successful login', () => {
    authServiceSpy.login.and.returnValue(of({ accessToken: 'token' }));
    const spy = spyOn(router, 'navigate');

    const fixture = TestBed.createComponent(LoginComponent);
    const comp = fixture.componentInstance;
    comp.form.setValue({ email: 'admin@carlessopilates.com', password: 'senha1234' });
    comp.entrar();

    expect(authServiceSpy.login).toHaveBeenCalledWith({ email: 'admin@carlessopilates.com', password: 'senha1234' });
    expect(spy).toHaveBeenCalledWith(['/pacientes']);
  });

  it('should show 401 error message on invalid credentials', () => {
    authServiceSpy.login.and.returnValue(throwError(() => ({ status: 401 })));

    const fixture = TestBed.createComponent(LoginComponent);
    const comp = fixture.componentInstance;
    comp.form.setValue({ email: 'x@x.com', password: 'wrong' });
    comp.entrar();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.login-erro')?.textContent).toContain('E-mail ou senha inválidos');
  });

  it('should show 429 error message when rate limited', () => {
    authServiceSpy.login.and.returnValue(throwError(() => ({ status: 429 })));

    const fixture = TestBed.createComponent(LoginComponent);
    const comp = fixture.componentInstance;
    comp.form.setValue({ email: 'x@x.com', password: 'wrong' });
    comp.entrar();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.login-erro')?.textContent).toContain('15 minutos');
  });

  it('should show generic error on unknown error', () => {
    authServiceSpy.login.and.returnValue(throwError(() => ({ status: 500 })));

    const fixture = TestBed.createComponent(LoginComponent);
    const comp = fixture.componentInstance;
    comp.form.setValue({ email: 'x@x.com', password: 'wrong' });
    comp.entrar();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.login-erro')?.textContent).toContain('Erro ao realizar login');
  });
});
