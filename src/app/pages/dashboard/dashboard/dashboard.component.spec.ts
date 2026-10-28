import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NEVER, of, throwError } from 'rxjs';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID } from '@angular/core';
import { DashboardComponent } from './dashboard.component';
import { DashboardService } from '../../../core/services/dashboard.service';
import { DashboardResumoDTO } from '../../../core/models/dashboard';
import { PAPEIS } from '../../../core/models/auth';
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
    authServiceSpy = jasmine.createSpyObj('AuthService', ['isAdmin', 'hasAnyRole']);
    authServiceSpy.isAdmin.and.returnValue(true);
    authServiceSpy.hasAnyRole.and.returnValue(true);

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

  it('should hide the revenue card when the API omits it for the user role', () => {
    serviceSpy.resumo.and.returnValue(of({
      ...mockResumo,
      pagamentos: { ...mockResumo.pagamentos, receitaMesAtual: null }
    }));

    component.carregar();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Receita do mês');
    expect(el.textContent).toContain('Pacientes ativos');
    expect(el.querySelector('.dashboard-grid')!.classList).toContain('dashboard-grid--sem-receita');
  });

  it('should build the chart parts from the loaded summary', () => {
    expect(component.segmentosPagamentos.map(s => [s.chave, s.valor])).toEqual([
      ['pagos', 8], ['pendentes', 5], ['vencidos', 2]
    ]);
    expect(component.segmentosAulas.map(s => [s.chave, s.valor])).toEqual([
      ['realizadas', 40], ['agendadas', 20]
    ]);
    expect(component.segmentosPacientes.map(s => [s.chave, s.valor])).toEqual([
      ['ativos', 10], ['inativos', 2]
    ]);
  });

  // Issue #120: os gráficos desenham o resumo já carregado e não buscam nada.
  it('should render the three charts from a single summary request', () => {
    const el = fixture.nativeElement as HTMLElement;
    const graficos = Array.from(el.querySelectorAll('app-grafico-proporcao figure'))
      .map(figura => figura.getAttribute('aria-label'));

    expect(serviceSpy.resumo).toHaveBeenCalledTimes(1);
    expect(graficos).toEqual([
      'Distribuição dos pagamentos por status',
      'Aulas realizadas e agendadas no mês atual',
      'Pacientes ativos e inativos'
    ]);
    expect(el.querySelectorAll('.grafico-proporcao__fatia').length).toBe(3);
  });

  it('should keep the numbers in text next to the charts', () => {
    const textos = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.grafico-proporcao__item'))
      .map(item => (item.textContent ?? '').replace(/\s+/g, ' ').trim());

    expect(textos).toEqual([
      'Pagos 8 54%', 'Pendentes 5 33%', 'Vencidos 2 13%',
      'Realizadas 40 67%', 'Agendadas 20 33%',
      'Ativos 10 83%', 'Inativos 2 17%'
    ]);
  });

  it('should explain empty charts when the month has no classes', () => {
    serviceSpy.resumo.and.returnValue(of({
      ...mockResumo,
      aulas: { totalRealizadasMesAtual: 0, totalAgendadasMesAtual: 0 }
    }));

    component.carregar();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Nenhuma aula no mês atual.');
    expect(el.textContent).not.toContain('Nenhum pagamento registrado.');
  });

  it('should keep the payments chart, which counts records, when revenue is omitted', () => {
    serviceSpy.resumo.and.returnValue(of({
      ...mockResumo,
      pagamentos: { ...mockResumo.pagamentos, receitaMesAtual: null }
    }));

    component.carregar();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('figure[aria-label="Distribuição dos pagamentos por status"]')).not.toBeNull();
    expect(el.textContent).toContain('Pagos 8');
  });

  it('should not render charts while the summary is loading', () => {
    serviceSpy.resumo.and.returnValue(NEVER);
    const carregando = TestBed.createComponent(DashboardComponent);
    carregando.detectChanges();

    const el = carregando.nativeElement as HTMLElement;
    expect(el.querySelector('.loading')?.textContent).toContain('Carregando indicadores...');
    expect(el.querySelector('app-grafico-proporcao')).toBeNull();
  });

  it('should not render charts when the summary fails', () => {
    serviceSpy.resumo.and.returnValue(throwError(() => new Error('fail')));
    const comErro = TestBed.createComponent(DashboardComponent);
    comErro.detectChanges();

    const el = comErro.nativeElement as HTMLElement;
    expect(el.querySelector('app-grafico-proporcao')).toBeNull();
    expect(el.querySelector('.alert-danger')?.textContent).toContain('Erro ao carregar indicadores do sistema.');
  });

  it('should render reports action when user reaches the fiscal area', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(authServiceSpy.hasAnyRole).toHaveBeenCalledWith(PAPEIS.fiscal);
    expect(el.querySelector('a[href="/relatorios"]')?.textContent).toContain('Relatórios');
  });

  it('should hide reports action when user has no fiscal role', () => {
    authServiceSpy.isAdmin.and.returnValue(false);
    authServiceSpy.hasAnyRole.and.returnValue(false);
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
