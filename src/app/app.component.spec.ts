import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { AuthService } from './core/services/auth.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('AppComponent', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  function setup(authenticated: boolean, admin = false) {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'isAdmin', 'logout']);
    authServiceSpy.isAuthenticated.and.returnValue(authenticated);
    authServiceSpy.isAdmin.and.returnValue(admin);

    TestBed.configureTestingModule({
      imports: [AppComponent, RouterTestingModule, HttpClientTestingModule],
      providers: [{ provide: AuthService, useValue: authServiceSpy }]
    }).compileComponents();
  }

  it('should create the app', async () => {
    await setup(false);
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should contain a router-outlet', async () => {
    await setup(false);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('router-outlet')).toBeTruthy();
  });

  it('should hide navbar when not authenticated', async () => {
    await setup(false);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.navbar')).toBeNull();
  });

  it('should show navbar when authenticated', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.navbar')).toBeTruthy();
  });

  it('should display "Carlesso Pilates" in the navbar brand when authenticated', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.navbar-brand')?.textContent).toContain('Carlesso Pilates');
  });

  it('should render admin navigation links when authenticated user is admin', async () => {
    await setup(true, true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('a[href="/profissionais"]')?.textContent).toContain('Profissionais');
    expect(el.querySelector('a[href="/relatorios"]')?.textContent).toContain('Relatórios');
    expect(el.querySelector('a[href="/admin"]')?.textContent).toContain('Administração');
  });

  it('should hide admin navigation links when authenticated user is not admin', async () => {
    await setup(true, false);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('a[href="/profissionais"]')).toBeNull();
    expect(el.querySelector('a[href="/relatorios"]')).toBeNull();
    expect(el.querySelector('a[href="/admin"]')).toBeNull();
  });

  it('should render dashboard navigation link when authenticated', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('a[href="/"]')?.textContent).toContain('Carlesso Pilates');
    expect(el.querySelector('.navbar-menu a[href="/"]')?.textContent).toContain('Início');
  });

  it('should show logout button when authenticated', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.btn-sair')).toBeTruthy();
  });

  it('should call logout on sair button click', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.btn-sair') as HTMLButtonElement;
    btn.click();
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });
});
