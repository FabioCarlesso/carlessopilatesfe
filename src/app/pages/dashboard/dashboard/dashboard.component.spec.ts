import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NEVER, of, throwError } from 'rxjs';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID } from '@angular/core';
import { DashboardComponent } from './dashboard.component';
import { DashboardService } from '../../../core/services/dashboard.service';
import { DashboardResumoDTO } from '../../../core/models/dashboard';
import { AuthService } from '../../../core/services/auth.service';

registerLocaleData(localePt);

const mockResumo: DashboardResumoDTO = {
  pacientes: {
    totalAtivos: 10,
    totalInativos: 2
  },
  profissionais: {
    totalAtivos: 3,
    totalInativos: 1
  },
  pagamentos: {
    totalPendentes: 5,
    totalPagos: 8,
    totalVencidos: 2,
    receitaMesAtual: 1600
  },
  aulas: {
    totalRealizadasMesAtual: 40,
    totalAgendadasMesAtual: 20
  },
  geradoEm: '2026-04-29T10:00:00'
};

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let serviceSpy: jasmine.SpyObj<DashboardService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('DashboardService', ['resumo']);
    serviceSpy.resumo.and.returnValue(of(mockResumo));
    authServiceSpy = jasmine.createSpyObj('AuthService', ['isAdmin']);
    authServiceSpy.isAdmin.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [DashboardComponent, RouterTestingModule],
      providers: [
        { provide: DashboardService, useValue: serviceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: LOCALE_ID, useValue: 'pt-BR' }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load dashboard summary on init', () => {
    expect(serviceSpy.resumo).toHaveBeenCalled();
    expect(component.resumo).toEqual(mockResumo);
    expect(component.loading).toBeFalse();
  });

  it('should set loading to true before response', () => {
    serviceSpy.resumo.and.returnValue(NEVER);
    component.carregar();
    expect(component.loading).toBeTrue();
  });

  it('should calculate totals and realized class percentage', () => {
    expect(component.totalPacientes).toBe(12);
    expect(component.totalProfissionais).toBe(4);
    expect(component.totalPagamentos).toBe(15);
    expect(component.totalAulasMesAtual).toBe(60);
    expect(component.percentualAulasRealizadas).toBe(67);
  });

  it('should return zero percentage when month has no classes', () => {
    serviceSpy.resumo.and.returnValue(of({
      ...mockResumo,
      aulas: {
        totalRealizadasMesAtual: 0,
        totalAgendadasMesAtual: 0
      }
    }));

    component.carregar();

    expect(component.totalAulasMesAtual).toBe(0);
    expect(component.percentualAulasRealizadas).toBe(0);
  });

  it('should render main indicators', () => {
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Pacientes ativos');
    expect(el.textContent).toContain('Receita do mês');
    expect(el.textContent).toContain('Status dos pagamentos');
    expect(el.textContent).toContain('Aulas do mês atual');
  });

  it('should render reports action when user is admin', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('a[href="/relatorios"]')?.textContent).toContain('Relatórios');
  });

  it('should hide reports action when user is not admin', () => {
    authServiceSpy.isAdmin.and.returnValue(false);
    const userFixture = TestBed.createComponent(DashboardComponent);
    userFixture.detectChanges();

    const el = userFixture.nativeElement as HTMLElement;
    expect(el.querySelector('a[href="/relatorios"]')).toBeNull();
  });

  it('should set erro when summary load fails', () => {
    serviceSpy.resumo.and.returnValue(throwError(() => new Error('fail')));

    component.carregar();

    expect(component.erro).toBe('Erro ao carregar indicadores do sistema.');
    expect(component.loading).toBeFalse();
    expect(component.resumo).toBeNull();
  });
});
