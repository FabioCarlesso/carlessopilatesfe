import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from '../../../core/services/auth.service';
import { RelatorioListComponent } from './relatorio-list.component';

describe('RelatorioListComponent', () => {
  let fixture: ComponentFixture<RelatorioListComponent>;
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['isAdmin']);
    authSpy.isAdmin.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [RelatorioListComponent, RouterTestingModule],
      providers: [{ provide: AuthService, useValue: authSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(RelatorioListComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render professional payment report link', () => {
    const el = fixture.nativeElement as HTMLElement;
    const link = el.querySelector('a[href="/relatorios/pagamento-profissional"]');

    expect(link).toBeTruthy();
    expect(link?.textContent).toContain('Pagamento de Profissional');
  });

  it('should render indicators link', () => {
    const el = fixture.nativeElement as HTMLElement;
    const link = el.querySelector('a[href="/relatorios/indicadores"]');

    expect(link).toBeTruthy();
    expect(link?.textContent).toContain('Indicadores');
  });

  it('should hide indicators from the financeiro, which only the ADMIN reaches in the API', () => {
    authSpy.isAdmin.and.returnValue(false);
    const financeiro = TestBed.createComponent(RelatorioListComponent);
    financeiro.detectChanges();
    const el = financeiro.nativeElement as HTMLElement;

    expect(el.querySelector('a[href="/relatorios/indicadores"]')).toBeNull();
    expect(el.querySelector('a[href="/relatorios/nfse"]')).toBeTruthy();
    expect(el.querySelector('a[href="/relatorios/financeiro"]')).toBeTruthy();
    expect(el.querySelector('a[href="/relatorios/pagamento-profissional"]')).toBeTruthy();
  });

  it('should render NFSE report link', () => {
    const el = fixture.nativeElement as HTMLElement;
    const link = el.querySelector('a[href="/relatorios/nfse"]');

    expect(link).toBeTruthy();
    expect(link?.textContent).toContain('Emissão de NFSEs');
  });

  it('should render the consolidated financial report link', () => {
    const el = fixture.nativeElement as HTMLElement;
    const link = el.querySelector('a[href="/relatorios/financeiro"]');

    expect(link).toBeTruthy();
    expect(link?.textContent).toContain('Financeiro do Estúdio');
  });
});
