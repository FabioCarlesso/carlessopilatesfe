import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { AuthService } from './core/services/auth.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('AppComponent', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  function setup(authenticated: boolean) {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'logout']);
    authServiceSpy.isAuthenticated.and.returnValue(authenticated);

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

  it('should render relatorios navigation link when authenticated', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('a[href="/relatorios"]')?.textContent).toContain('Relatórios');
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
