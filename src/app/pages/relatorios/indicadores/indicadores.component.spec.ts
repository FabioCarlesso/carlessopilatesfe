import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';
import { IndicadoresComponent } from './indicadores.component';
import { DashboardService } from '../../../core/services/dashboard.service';
import { AulasPorProfissionalDTO, DashboardIndicadoresDTO } from '../../../core/models/dashboard';
import { periodoDoMesAtual } from '../../../shared/utils/indicadores';

const mockIndicadores: DashboardIndicadoresDTO = {
  meses: 3,
  receita: [
    { mes: '2026-01', receita: 1500 },
    { mes: '2026-02', receita: 0 },
    { mes: '2026-03', receita: 2000 }
  ],
  aulas: [
    { mes: '2026-01', realizadas: 30, agendadas: 10 },
    { mes: '2026-02', realizadas: 0, agendadas: 0 },
    { mes: '2026-03', realizadas: 18, agendadas: 2 }
  ],
  pacientes: [
    { mes: '2026-01', novos: 3, inativados: 1 },
    { mes: '2026-02', novos: 0, inativados: 2 },
    { mes: '2026-03', novos: 1, inativados: 0 }
  ],
  geradoEm: '2026-03-20T10:00:00'
};

const mockRanking: AulasPorProfissionalDTO[] = [
  { profissionalId: 2, nome: 'Paula Mendes', totalRealizadas: 30 },
  { profissionalId: 1, nome: 'Ana Lima', totalRealizadas: 15 }
];

describe('IndicadoresComponent', () => {
  let component: IndicadoresComponent;
  let fixture: ComponentFixture<IndicadoresComponent>;
  let serviceSpy: jasmine.SpyObj<DashboardService>;

  function el(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('DashboardService', ['indicadores', 'aulasPorProfissional']);
    serviceSpy.indicadores.and.returnValue(of(mockIndicadores));
    serviceSpy.aulasPorProfissional.and.returnValue(of(mockRanking));

    await TestBed.configureTestingModule({
      imports: [IndicadoresComponent, RouterTestingModule],
      providers: [{ provide: DashboardService, useValue: serviceSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(IndicadoresComponent);
    component = fixture.componentInstance;
  });

  it('carrega 12 meses e o ranking do mês atual ao abrir', () => {
    fixture.detectChanges();

    const periodo = periodoDoMesAtual();
    expect(serviceSpy.indicadores).toHaveBeenCalledOnceWith(12);
    expect(serviceSpy.aulasPorProfissional).toHaveBeenCalledOnceWith(periodo.inicio, periodo.fim);
  });

  it('mostra o resumo do período somando as séries', () => {
    fixture.detectChanges();

    const resumo = el().querySelector('.summary-grid')?.textContent ?? '';
    expect(resumo).toContain('3.500,00');
    expect(resumo).toContain('48');
    // 48 realizadas de 60 aulas.
    expect(resumo).toContain('80%');
    // 4 novos − 3 inativados.
    expect(resumo).toContain('+1');
  });

  it('desenha um gráfico acessível por série, com os valores em tabela', () => {
    fixture.detectChanges();

    const graficos = el().querySelectorAll('figure.grafico');
    expect(graficos.length).toBe(3);
    graficos.forEach(figura => {
      const svg = figura.querySelector('svg');
      expect(svg?.getAttribute('role')).toBe('img');
      expect(svg?.getAttribute('aria-label')).toContain('tabela');
      expect(figura.querySelectorAll('tbody tr').length).toBe(3);
    });
    expect(graficos[0].querySelectorAll('rect.grafico-barra').length).toBe(3);
    expect(graficos[1].querySelectorAll('rect.grafico-barra').length).toBe(6);
  });

  it('lista os meses por extenso e a ocupação na tabela de aulas', () => {
    fixture.detectChanges();

    const linhas = el().querySelectorAll('figure.grafico')[1].querySelectorAll('tbody tr');
    expect(linhas[0].textContent).toContain('janeiro de 2026');
    expect(linhas[0].textContent).toContain('75%');
    // Mês sem aula não é 0% de ocupação.
    expect(linhas[1].textContent).toContain('—');
  });

  it('avisa que a série de pacientes só começa quando as datas passaram a ser registradas', () => {
    fixture.detectChanges();

    const pacientes = el().querySelectorAll('figure.grafico')[2];
    expect(pacientes.querySelector('.alert-warning')?.textContent).toContain('Meses anteriores aparecem zerados');
  });

  it('recarrega com a janela escolhida', () => {
    fixture.detectChanges();
    serviceSpy.indicadores.calls.reset();

    component.alterarMeses(24);

    expect(serviceSpy.indicadores).toHaveBeenCalledOnceWith(24);
    expect(component.meses).toBe(24);
  });

  it('mostra o carregamento enquanto as séries não chegam', () => {
    const pendente = new Subject<DashboardIndicadoresDTO>();
    serviceSpy.indicadores.and.returnValue(pendente);
    fixture.detectChanges();

    expect(el().textContent).toContain('Carregando indicadores...');
    expect(el().querySelector('figure.grafico')).toBeNull();

    pendente.next(mockIndicadores);
    fixture.detectChanges();
    expect(el().textContent).not.toContain('Carregando indicadores...');
  });

  it('mostra o erro da API e permite tentar de novo', () => {
    serviceSpy.indicadores.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    fixture.detectChanges();

    const alerta = el().querySelector('.alert-danger');
    expect(alerta?.textContent).toContain('Erro ao carregar os indicadores.');
    expect(el().querySelector('figure.grafico')).toBeNull();

    serviceSpy.indicadores.and.returnValue(of(mockIndicadores));
    (alerta?.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el().querySelectorAll('figure.grafico').length).toBe(3);
  });

  it('exibe o ranking em ordem, com o período consultado', () => {
    fixture.detectChanges();

    const linhas = el().querySelectorAll('.ranking-tabela tbody tr');
    expect(linhas.length).toBe(2);
    expect(linhas[0].textContent).toContain('Paula Mendes');
    expect(linhas[0].textContent).toContain('30');
    expect(component.ranking[1].proporcao).toBe(0.5);
    expect(el().querySelector('.ranking-periodo')).toBeTruthy();
  });

  it('mostra estado vazio quando nenhum profissional teve aula', () => {
    serviceSpy.aulasPorProfissional.and.returnValue(of([]));
    fixture.detectChanges();

    expect(el().querySelector('.ranking')?.textContent).toContain('Nenhuma aula realizada');
  });

  it('valida o período do ranking antes de consultar a API', () => {
    fixture.detectChanges();
    serviceSpy.aulasPorProfissional.calls.reset();

    component.inicio = '2026-03-10';
    component.fim = '2026-03-01';
    component.consultarRanking();
    fixture.detectChanges();

    expect(serviceSpy.aulasPorProfissional).not.toHaveBeenCalled();
    expect(el().querySelector('.ranking .alert-danger')?.textContent).toContain('menor ou igual');
  });

  it('consulta o ranking no período informado', () => {
    fixture.detectChanges();
    serviceSpy.aulasPorProfissional.calls.reset();

    component.inicio = '2026-01-01';
    component.fim = '2026-06-30';
    component.consultarRanking();

    expect(serviceSpy.aulasPorProfissional).toHaveBeenCalledOnceWith('2026-01-01', '2026-06-30');
    expect(component.periodoRanking).toEqual({ inicio: '2026-01-01', fim: '2026-06-30' });
  });

  it('mostra a mensagem da API quando o ranking falha', () => {
    serviceSpy.aulasPorProfissional.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: { detail: 'Consulta por período limitada a 366 dias' }
    })));
    fixture.detectChanges();

    expect(el().querySelector('.ranking .alert-danger')?.textContent).toContain('limitada a 366 dias');
  });
});
