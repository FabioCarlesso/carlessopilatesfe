import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { ProfissionalPagamentoRelatorioComponent } from './profissional-pagamento-relatorio.component';
import { ProfissionalService } from '../../../core/services/profissional.service';
import {
  ProfissionalPage,
  ProfissionalPagamentoRelatorioDTO,
  ProfissionalResponseDTO
} from '../../../core/models/profissional';

const mockProfissional: ProfissionalResponseDTO = {
  id: 1,
  nome: 'Paula Mendes',
  email: 'paula@carlessopilates.com',
  cpf: '123.456.111-00',
  telefone: '(11) 98888-1111',
  tipoContrato: 'PJ',
  percentualPagamentoAula: 45,
  dataInicio: '2024-01-15',
  ativo: true
};

const mockPage: ProfissionalPage = {
  content: [mockProfissional],
  page: { totalElements: 1, totalPages: 1, size: 10, number: 0 }
};

const mockRelatorio: ProfissionalPagamentoRelatorioDTO = {
  profissional: {
    id: 1,
    nome: 'Paula Mendes',
    cpf: '123.456.111-00',
    tipoContrato: 'PJ',
    percentualPagamentoAula: 45
  },
  periodo: { inicio: '2026-04-01', fim: '2026-04-30' },
  resumo: {
    totalAulas: 1,
    quantidadePagamentos: 1,
    totalPagamentosBruto: 200,
    totalProfissional: 11.25
  },
  pagamentos: [
    {
      pagamentoId: 5,
      valorPagamento: 200,
      quantidadeAulasPagamento: 8,
      quantidadeAulasNoPeriodo: 1,
      valorBaseAula: 25,
      totalProfissional: 11.25
    }
  ],
  aulas: [
    {
      aulaId: 10,
      data: '2026-04-03',
      pacienteId: 2,
      pacienteNome: 'Ana Silva',
      pagamentoId: 5,
      valorPagamento: 200,
      quantidadeAulasPagamento: 8,
      valorBaseAula: 25,
      percentualPagamentoAula: 45,
      valorProfissional: 11.25
    }
  ],
  geradoEm: '2026-04-27T10:00:00'
};

const mockPdfResponse = new HttpResponse({
  body: new Blob(['pdf'], { type: 'application/pdf' }),
  headers: new HttpHeaders({
    'Content-Disposition': 'attachment; filename="relatorio.pdf"'
  })
});

const mockExcelResponse = new HttpResponse({
  body: new Blob(['xlsx'], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }),
  headers: new HttpHeaders({
    'Content-Disposition': 'attachment; filename="relatorio.xlsx"'
  })
});

describe('ProfissionalPagamentoRelatorioComponent', () => {
  let component: ProfissionalPagamentoRelatorioComponent;
  let fixture: ComponentFixture<ProfissionalPagamentoRelatorioComponent>;
  let serviceSpy: jasmine.SpyObj<ProfissionalService>;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('ProfissionalService', [
      'listar',
      'relatorioPagamento',
      'exportarRelatorioPagamentoProfissionalPdf',
      'exportarRelatorioPagamentoProfissionalExcel'
    ]);
    serviceSpy.listar.and.returnValue(of(mockPage));
    serviceSpy.relatorioPagamento.and.returnValue(of(mockRelatorio));
    serviceSpy.exportarRelatorioPagamentoProfissionalPdf.and.returnValue(of(mockPdfResponse));
    serviceSpy.exportarRelatorioPagamentoProfissionalExcel.and.returnValue(of(mockExcelResponse));

    await TestBed.configureTestingModule({
      imports: [ProfissionalPagamentoRelatorioComponent, RouterTestingModule],
      providers: [{ provide: ProfissionalService, useValue: serviceSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfissionalPagamentoRelatorioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load profissionais on init', () => {
    expect(serviceSpy.listar).toHaveBeenCalledWith(0, 100);
    expect(component.profissionais).toEqual([mockProfissional]);
  });

  it('should set erro when loading profissionais fails', () => {
    serviceSpy.listar.and.returnValue(throwError(() => new Error('fail')));

    component.carregarProfissionais();

    expect(component.erro).toBe('Erro ao carregar profissionais.');
  });

  it('should not request report when form is invalid', () => {
    component.form.reset();

    component.consultar();

    expect(serviceSpy.relatorioPagamento).not.toHaveBeenCalled();
  });

  it('should validate period order before requesting report', () => {
    component.form.setValue({ profissionalId: 1, inicio: '2026-04-30', fim: '2026-04-01' });

    component.consultar();

    expect(component.erro).toBe('A data inicial deve ser menor ou igual à data final.');
    expect(serviceSpy.relatorioPagamento).not.toHaveBeenCalled();
  });

  it('should request report and store response', () => {
    component.form.setValue({ profissionalId: 1, inicio: '2026-04-01', fim: '2026-04-30' });

    component.consultar();

    expect(serviceSpy.relatorioPagamento).toHaveBeenCalledWith(1, '2026-04-01', '2026-04-30');
    expect(component.relatorio).toEqual(mockRelatorio);
  });

  it('should set erro when report request fails', () => {
    serviceSpy.relatorioPagamento.and.returnValue(throwError(() => new Error('fail')));
    component.form.setValue({ profissionalId: 1, inicio: '2026-04-01', fim: '2026-04-30' });

    component.consultar();

    expect(component.erro).toBe('Erro ao carregar relatório de pagamento.');
    expect(component.loadingRelatorio).toBeFalse();
  });

  it('should not export when form is invalid', () => {
    component.form.reset();

    component.exportarPdf();
    component.exportarExcel();

    expect(serviceSpy.exportarRelatorioPagamentoProfissionalPdf).not.toHaveBeenCalled();
    expect(serviceSpy.exportarRelatorioPagamentoProfissionalExcel).not.toHaveBeenCalled();
  });

  it('should validate period order before exporting', () => {
    component.form.setValue({ profissionalId: 1, inicio: '2026-04-30', fim: '2026-04-01' });

    component.exportarPdf();

    expect(component.erro).toBe('A data inicial deve ser menor ou igual à data final.');
    expect(serviceSpy.exportarRelatorioPagamentoProfissionalPdf).not.toHaveBeenCalled();
  });

  it('should export PDF and reset loading state', () => {
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:relatorio-pdf');
    spyOn(window.URL, 'revokeObjectURL');
    component.form.setValue({ profissionalId: 1, inicio: '2026-04-01', fim: '2026-04-30' });

    component.exportarPdf();

    expect(serviceSpy.exportarRelatorioPagamentoProfissionalPdf)
      .toHaveBeenCalledWith(1, '2026-04-01', '2026-04-30');
    expect(component.exportandoPdf).toBeFalse();
    expect(component.erro).toBeNull();
  });

  it('should export Excel and reset loading state', () => {
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:relatorio-xlsx');
    spyOn(window.URL, 'revokeObjectURL');
    component.form.setValue({ profissionalId: 1, inicio: '2026-04-01', fim: '2026-04-30' });

    component.exportarExcel();

    expect(serviceSpy.exportarRelatorioPagamentoProfissionalExcel)
      .toHaveBeenCalledWith(1, '2026-04-01', '2026-04-30');
    expect(component.exportandoExcel).toBeFalse();
    expect(component.erro).toBeNull();
  });

  it('should set friendly error when PDF export fails', () => {
    serviceSpy.exportarRelatorioPagamentoProfissionalPdf.and.returnValue(throwError(() => new Error('fail')));
    component.form.setValue({ profissionalId: 1, inicio: '2026-04-01', fim: '2026-04-30' });

    component.exportarPdf();

    expect(component.erro).toBe('Erro ao exportar relatório em PDF.');
    expect(component.exportandoPdf).toBeFalse();
  });

  // São 6 colunas na tabela de pagamentos e 8 na de aulas: em 375px o usuário
  // vê ~2 delas e nada indicava que "Valor Profissional" estava fora da tela,
  // nem sobrava referência da linha ao rolar (issue #164).
  describe('scroll horizontal das tabelas no mobile (issue #164)', () => {
    /** Renderiza o resultado e anexa a fixture ao documento (computed styles). */
    function renderizarResultado(): HTMLElement {
      component.form.setValue({ profissionalId: 1, inicio: '2026-04-01', fim: '2026-04-30' });
      component.consultar();
      fixture.detectChanges();
      document.body.appendChild(fixture.nativeElement);
      return fixture.nativeElement as HTMLElement;
    }

    afterEach(() => {
      if (fixture.nativeElement.parentNode === document.body) {
        document.body.removeChild(fixture.nativeElement);
      }
    });

    it('should freeze the first column of both result tables with an opaque background', () => {
      const el = renderizarResultado();
      const tabelas = el.querySelectorAll('.table-sticky-first-col');

      expect(tabelas.length).toBe(2);

      tabelas.forEach(tabela => {
        const primeiroTh = tabela.querySelector('th:first-child') as HTMLElement;
        const primeiraTd = tabela.querySelector('td:first-child') as HTMLElement;
        const segundaTd = tabela.querySelector('td:nth-child(2)') as HTMLElement;

        expect(getComputedStyle(primeiroTh).position).toBe('sticky');
        expect(getComputedStyle(primeiroTh).left).toBe('0px');
        expect(getComputedStyle(primeiraTd).position).toBe('sticky');
        expect(getComputedStyle(primeiraTd).left).toBe('0px');
        // Sem fundo opaco as colunas seguintes passariam por baixo e o texto se
        // sobreporia ao da coluna congelada.
        expect(getComputedStyle(primeiraTd).backgroundColor).toBe('rgb(255, 255, 255)');
        expect(getComputedStyle(segundaTd).position).toBe('static');
      });
    });

    it('should keep the frozen column opaque in dark theme', () => {
      const el = renderizarResultado();
      const primeiraTd = el.querySelector('.table-sticky-first-col td:first-child') as HTMLElement;
      const temaAnterior = document.documentElement.getAttribute('data-theme');

      try {
        document.documentElement.setAttribute('data-theme', 'dark');
        // `--bg-elev` do tema escuro: #182230.
        expect(getComputedStyle(primeiraTd).backgroundColor).toBe('rgb(24, 34, 48)');
      } finally {
        if (temaAnterior === null) {
          document.documentElement.removeAttribute('data-theme');
        } else {
          document.documentElement.setAttribute('data-theme', temaAnterior);
        }
      }
    });

    it('should paint the scroll shadows on the scroll containers, not behind the tables', () => {
      const el = renderizarResultado();
      const wraps = el.querySelectorAll('.table-responsive');

      expect(wraps.length).toBe(2);

      wraps.forEach(wrap => {
        const estiloWrap = getComputedStyle(wrap);
        const tabela = wrap.querySelector('table.table') as HTMLElement;

        // Duas tampas que rolam com o conteúdo (`local`) sobre duas sombras
        // presas ao contêiner (`scroll`): sem transbordo as tampas escondem as
        // sombras e nada aparece.
        expect(estiloWrap.backgroundAttachment).toBe('local, local, scroll, scroll');
        expect(estiloWrap.overflowX).toBe('auto');
        // Com fundo próprio a tabela cobriria as camadas do contêiner.
        expect(getComputedStyle(tabela).backgroundColor).toBe('rgba(0, 0, 0, 0)');
      });
    });

    it('should show one drag hint per table, only on mobile widths', () => {
      const el = renderizarResultado();
      const hints = el.querySelectorAll('.table-scroll-hint');

      expect(hints.length).toBe(2);

      const mobile = window.matchMedia('(max-width: 768px)').matches;
      hints.forEach(hint => {
        expect(hint.textContent).toContain('Arraste a tabela para o lado');
        expect(getComputedStyle(hint).display).toBe(mobile ? 'block' : 'none');
      });
    });

    it('should expose both scroll containers as keyboard reachable regions', () => {
      const el = renderizarResultado();
      const wraps = Array.from(el.querySelectorAll('.table-responsive')) as HTMLElement[];

      // Sem `tabindex` o teclado não alcança o scroll horizontal (WCAG 2.1.1).
      expect(wraps.map(w => w.getAttribute('tabindex'))).toEqual(['0', '0']);
      expect(wraps.map(w => w.getAttribute('role'))).toEqual(['region', 'region']);
      expect(wraps.map(w => w.getAttribute('aria-label')))
        .toEqual(['Pagamentos do período', 'Aulas do período']);
    });

    it('should separate the frozen column with a pseudo-element, not a cell border', () => {
      const el = renderizarResultado();
      const primeiraTd = el.querySelector('.table-sticky-first-col td:first-child') as HTMLElement;
      const separador = getComputedStyle(primeiraTd, '::after');

      // Nem `border-right` nem `box-shadow` na célula: com
      // `border-collapse: collapse` a borda é da tabela (o WebKit não a repinta
      // na posição sticky) e o Chromium não pinta box-shadow de célula
      // colapsada — o separador sumia. O pseudo é um box comum e renderiza.
      expect(separador.position).toBe('absolute');
      expect(separador.width).toBe('1px');
      expect(separador.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(getComputedStyle(primeiraTd).borderRightWidth).toBe('0px');
    });

    it('should keep the summary cards on a single column at 375px', () => {
      const el = renderizarResultado();
      // Largura útil em um viewport de 375px: o `.container` tira 16px de cada
      // lado.
      el.style.width = '343px';
      const grid = el.querySelector('.summary-grid') as HTMLElement;

      expect(getComputedStyle(grid).gridTemplateColumns.split(' ').length).toBe(1);
    });

    it('should stack the action buttons at the mobile breakpoint', () => {
      const el = renderizarResultado();
      const acoes = el.querySelector('.form-actions') as HTMLElement;

      // Mesmo breakpoint do bloco mobile global, desde a issue #164.
      const mobile = window.matchMedia('(max-width: 768px)').matches;
      expect(getComputedStyle(acoes).flexDirection).toBe(mobile ? 'column' : 'row');
      // `stretch` é o alinhamento padrão: empilhados, os botões ocupam a
      // largura toda do card.
      expect(getComputedStyle(acoes).alignItems).toBe('normal');
    });
  });
});
