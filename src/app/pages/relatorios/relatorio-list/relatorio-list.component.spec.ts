import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { UserRole } from '../../../core/models/auth';
import { AuthService } from '../../../core/services/auth.service';
import { RelatorioListComponent } from './relatorio-list.component';

describe('RelatorioListComponent', () => {
  let fixture: ComponentFixture<RelatorioListComponent>;
  let authSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['isAdmin', 'hasAnyRole']);
    comPapeis(['ADMIN']);

    await TestBed.configureTestingModule({
      imports: [RelatorioListComponent, RouterTestingModule],
      providers: [{ provide: AuthService, useValue: authSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(RelatorioListComponent);
    fixture.detectChanges();
  });

  /** Faz o spy responder como um usuário com estes papéis. */
  function comPapeis(roles: UserRole[]): void {
    authSpy.isAdmin.and.returnValue(roles.includes('ADMIN'));
    authSpy.hasAnyRole.and.callFake((area: readonly UserRole[]) => area.some(r => roles.includes(r)));
  }

  function renderizar(): HTMLElement {
    const outro = TestBed.createComponent(RelatorioListComponent);
    outro.detectChanges();
    return outro.nativeElement as HTMLElement;
  }

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
    comPapeis(['FINANCEIRO']);
    const el = renderizar();

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

  it('should render the patients report link for ADMIN', () => {
    const el = fixture.nativeElement as HTMLElement;
    const link = el.querySelector('a[href="/relatorios/pacientes"]');

    expect(link).toBeTruthy();
    expect(link?.textContent).toContain('Pacientes');
  });

  it('should hide the patients report from the financeiro, which the API does not allow', () => {
    comPapeis(['FINANCEIRO']);
    const el = renderizar();

    expect(el.querySelector('a[href="/relatorios/pacientes"]')).toBeNull();
  });

  it('should show only the patients report to RECEPCAO', () => {
    comPapeis(['RECEPCAO']);
    const el = renderizar();

    expect(el.querySelector('a[href="/relatorios/pacientes"]')).toBeTruthy();
    expect(el.querySelector('a[href="/relatorios/financeiro"]')).toBeNull();
    expect(el.querySelector('a[href="/relatorios/nfse"]')).toBeNull();
    expect(el.querySelector('a[href="/relatorios/pagamento-profissional"]')).toBeNull();
    expect(el.querySelector('a[href="/relatorios/indicadores"]')).toBeNull();
  });

  it('should render the receipts report link for the financeiro and hide it from RECEPCAO', () => {
    comPapeis(['FINANCEIRO']);
    const link = renderizar().querySelector('a[href="/relatorios/recebimentos"]');
    expect(link).toBeTruthy();
    expect(link?.textContent).toContain('Recebimentos do Período');

    comPapeis(['RECEPCAO']);
    expect(renderizar().querySelector('a[href="/relatorios/recebimentos"]')).toBeNull();
  });
});
