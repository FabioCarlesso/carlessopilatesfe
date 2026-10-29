import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';
import {
  FinanceiroRelatorioComponent,
  MENSAGEM_SEM_PERMISSAO_FINANCEIRO
} from './financeiro-relatorio.component';
import { RelatorioService } from '../../../core/services/relatorio.service';
import { RelatorioFinanceiroDTO } from '../../../core/models/relatorio';
import { periodoDoMesAtual } from '../../../shared/utils/indicadores';
import { normalizarEspacos, provideLocalePtBr } from '../../../../testing/locale';

const relatorioComMovimento: RelatorioFinanceiroDTO = {
  periodo: { inicio: '2026-04-01', fim: '2026-04-30' },
  receita: { quantidadePagamentos: 3, total: 1234.56 },
  repasses: {
    totalAulas: 7,
    total: 410.5,
    profissionais: [
      {
        profissionalId: 1,
        nome: 'Paula Mendes',
        percentualPagamentoAula: 45,
        totalAulas: 4,
        quantidadePagamentos: 2,
        totalPagamentosBruto: 500,
        totalProfissional: 225
      },
      {
        profissionalId: 2,
        nome: 'Bruno Lima',
        percentualPagamentoAula: 50,
        totalAulas: 3,
        quantidadePagamentos: 1,
        totalPagamentosBruto: 371,
        totalProfissional: 185.5
      }
    ]
  },
  inadimplencia: { quantidadePagamentos: 1, total: 250 },
  resultadoLiquido: 824.06,
  geradoEm: '2026-05-02T10:00:00'
};

const relatorioZerado: RelatorioFinanceiroDTO = {
  periodo: { inicio: '2026-04-01', fim: '2026-04-30' },
  receita: { quantidadePagamentos: 0, total: 0 },
  repasses: { totalAulas: 0, total: 0, profissionais: [] },
  inadimplencia: { quantidadePagamentos: 0, total: 0 },
  resultadoLiquido: 0,
  geradoEm: '2026-05-02T10:00:00'
};

function arquivo(nome: string): HttpResponse<Blob> {
  return new HttpResponse({
    body: new Blob(['conteudo']),
    headers: new HttpHeaders({ 'Content-Disposition': `attachment; filename="${nome}"` })
  });
}

describe('FinanceiroRelatorioComponent', () => {
  let fixture: ComponentFixture<FinanceiroRelatorioComponent>;
  let component: FinanceiroRelatorioComponent;
  let serviceSpy: jasmine.SpyObj<RelatorioService>;

  const el = () => fixture.nativeElement as HTMLElement;
  const texto = (seletor: string) => normalizarEspacos(el().querySelector(seletor)?.textContent).trim();
  const consultarPeriodo = (inicio: string, fim: string) => {
    component.form.setValue({ inicio, fim });
    component.consultar();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj<RelatorioService>('RelatorioService', [
      'relatorioFinanceiro',
      'exportarRelatorioFinanceiro'
    ]);
    serviceSpy.relatorioFinanceiro.and.returnValue(of(relatorioComMovimento));
    serviceSpy.exportarRelatorioFinanceiro.and.returnValue(of(arquivo('relatorio-financeiro.pdf')));

    await TestBed.configureTestingModule({
      imports: [FinanceiroRelatorioComponent, RouterTestingModule],
      providers: [provideLocalePtBr(), { provide: RelatorioService, useValue: serviceSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(FinanceiroRelatorioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should suggest the current month and query it on open', () => {
    const { inicio, fim } = periodoDoMesAtual();

    expect(component.form.value).toEqual({ inicio, fim });
    expect(serviceSpy.relatorioFinanceiro).toHaveBeenCalledOnceWith(inicio, fim);
  });

  it('should render the four summary cards in Brazilian currency, as returned by the API', () => {
    consultarPeriodo('2026-04-01', '2026-04-30');

    expect(serviceSpy.relatorioFinanceiro).toHaveBeenCalledWith('2026-04-01', '2026-04-30');
    expect(texto('[data-card="receita"] strong')).toBe('R$ 1.234,56');
    expect(texto('[data-card="repasses"] strong')).toBe('R$ 410,50');
    expect(texto('[data-card="inadimplencia"] strong')).toBe('R$ 250,00');
    expect(texto('[data-card="resultado"] strong')).toBe('R$ 824,06');
    expect(el().querySelector('.resultado-negativo')).toBeNull();
    expect(el().querySelector('.sem-movimento')).toBeNull();
  });

  it('should list each professional and a total row matching the repasses card', () => {
    consultarPeriodo('2026-04-01', '2026-04-30');

    const linhas = el().querySelectorAll('table tbody tr');
    expect(linhas.length).toBe(2);
    const primeira = Array.from(linhas[0].querySelectorAll('td')).map(td => normalizarEspacos(td.textContent).trim());
    expect(primeira).toEqual(['Paula Mendes', '45%', '4', '2', 'R$ 500,00', 'R$ 225,00']);

    const total = Array.from(el().querySelectorAll('tfoot tr > *')).map(c => normalizarEspacos(c.textContent).trim());
    expect(total[0]).toBe('Total');
    expect(total[2]).toBe('7');
    expect(total[5]).toBe(texto('[data-card="repasses"] strong'));
    expect(el().querySelector('.table-scroll-hint')).toBeTruthy();
    expect(el().querySelector('.table-responsive[role="region"]')).toBeTruthy();
  });

  it('should highlight a negative net result', () => {
    serviceSpy.relatorioFinanceiro.and.returnValue(of({ ...relatorioComMovimento, resultadoLiquido: -90.4 }));
    consultarPeriodo('2026-04-01', '2026-04-30');

    const card = el().querySelector('[data-card="resultado"]');
    expect(card?.classList).toContain('resultado-negativo');
    expect(texto('[data-card="resultado"] strong')).toContain('90,40');
  });

  it('should show zeros and an informative message for a period without movement, not an error', () => {
    serviceSpy.relatorioFinanceiro.and.returnValue(of(relatorioZerado));
    consultarPeriodo('2026-04-01', '2026-04-30');

    expect(component.semMovimento).toBeTrue();
    expect(el().querySelector('.sem-movimento')).toBeTruthy();
    expect(el().querySelector('.alert-danger')).toBeNull();
    expect(texto('[data-card="receita"] strong')).toBe('R$ 0,00');
    expect(texto('[data-card="resultado"] strong')).toBe('R$ 0,00');
    expect(el().querySelector('table')).toBeNull();
  });

  it('should block an inverted period with a message in the form', () => {
    serviceSpy.relatorioFinanceiro.calls.reset();
    consultarPeriodo('2026-04-30', '2026-04-01');

    expect(serviceSpy.relatorioFinanceiro).not.toHaveBeenCalled();
    expect(texto('.periodo-erro')).toBe('A data inicial deve ser menor ou igual à data final.');
    expect(el().querySelector('#inicio')?.classList).toContain('is-invalid');
    expect(component.relatorio).toBeNull();
  });

  it('should block a period longer than the API limit', () => {
    serviceSpy.relatorioFinanceiro.calls.reset();
    consultarPeriodo('2025-01-01', '2026-04-30');

    expect(serviceSpy.relatorioFinanceiro).not.toHaveBeenCalled();
    expect(component.erroPeriodo).toContain('366');
  });

  it('should show a permission message on 403 without breaking the screen', () => {
    serviceSpy.relatorioFinanceiro.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 403 }))
    );
    consultarPeriodo('2026-04-01', '2026-04-30');

    expect(texto('.alert-danger')).toBe(MENSAGEM_SEM_PERMISSAO_FINANCEIRO);
    expect(component.loading).toBeFalse();
    expect(el().querySelector('form')).toBeTruthy();
  });

  it('should show the API message when the query fails', () => {
    serviceSpy.relatorioFinanceiro.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { erro: 'Período acima do limite' } }))
    );
    consultarPeriodo('2026-04-01', '2026-04-30');

    expect(texto('.alert-danger')).toBe('Período acima do limite');
  });

  it('should fall back to a friendly message on network failure', () => {
    serviceSpy.relatorioFinanceiro.and.returnValue(throwError(() => new Error('falha')));
    consultarPeriodo('2026-04-01', '2026-04-30');

    expect(component.erro).toBe('Erro ao carregar o relatório financeiro.');
  });

  for (const [formato, rotulo] of [['pdf', 'PDF'], ['xlsx', 'Excel']] as const) {
    it(`should disable both export buttons while generating the ${rotulo} and download with the API file name`, () => {
      const resposta$ = new Subject<HttpResponse<Blob>>();
      serviceSpy.exportarRelatorioFinanceiro.and.returnValue(resposta$);
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:relatorio');
      spyOn(window.URL, 'revokeObjectURL');
      const cliques: string[] = [];
      spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
        cliques.push(this.download);
      });
      component.form.setValue({ inicio: '2026-04-01', fim: '2026-04-30' });

      component.exportar(formato);
      fixture.detectChanges();

      expect(serviceSpy.exportarRelatorioFinanceiro).toHaveBeenCalledWith('2026-04-01', '2026-04-30', formato);
      const botoes = Array.from(el().querySelectorAll<HTMLButtonElement>('button[type="button"]'));
      expect(botoes.length).toBe(2);
      expect(botoes.every(b => b.disabled)).toBeTrue();
      expect(normalizarEspacos(el().textContent)).toContain(`Gerando ${rotulo}...`);

      resposta$.next(arquivo(`relatorio-financeiro-2026-04-01-2026-04-30.${formato}`));
      resposta$.complete();
      fixture.detectChanges();

      expect(cliques).toEqual([`relatorio-financeiro-2026-04-01-2026-04-30.${formato}`]);
      expect(component.exportando).toBeNull();
      expect(botoes.every(b => !b.disabled)).toBeTrue();
    });
  }

  it('should not export an invalid period', () => {
    component.form.setValue({ inicio: '2026-04-30', fim: '2026-04-01' });

    component.exportar('pdf');

    expect(serviceSpy.exportarRelatorioFinanceiro).not.toHaveBeenCalled();
    expect(component.erroPeriodo).toBe('A data inicial deve ser menor ou igual à data final.');
  });

  it('should show a friendly message when the export fails, including 403', () => {
    serviceSpy.exportarRelatorioFinanceiro.and.returnValue(throwError(() => new Error('falha')));
    component.exportar('xlsx');
    expect(component.erro).toBe('Erro ao exportar o relatório em Excel.');
    expect(component.exportando).toBeNull();

    serviceSpy.exportarRelatorioFinanceiro.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 403 }))
    );
    component.exportar('pdf');
    expect(component.erro).toBe(MENSAGEM_SEM_PERMISSAO_FINANCEIRO);
  });
});
