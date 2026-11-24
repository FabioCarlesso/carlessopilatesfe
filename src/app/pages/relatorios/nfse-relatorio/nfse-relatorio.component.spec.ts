import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { NfseRelatorioComponent } from './nfse-relatorio.component';
import { RelatorioService } from '../../../core/services/relatorio.service';
import { RelatorioNfseResponseDTO } from '../../../core/models/relatorio';
import { renderizarEmViewport } from '../../../../testing/viewport';
import { normalizarEspacos, provideLocalePtBr } from '../../../../testing/locale';

const mockRelatorio: RelatorioNfseResponseDTO[] = [
  {
    pacienteId: 1,
    nome: 'Ana Silva',
    cpfCnpj: '123.456.789-00',
    valorPago: 250,
    competencia: '04/2026',
    descricaoServico: 'Aulas de Pilates - Competência 04/2026',
    notaAnteriorEmitida: false,
    dataPagamento: '2026-04-10',
    observacoes: 'Plano mensal',
    cpfNaNota: true,
    pendencia: null
  }
];

const registroComPendencia: RelatorioNfseResponseDTO = {
  pacienteId: 7,
  nome: 'Bia Lima',
  cpfCnpj: null,
  valorPago: 300,
  competencia: '04/2026',
  descricaoServico: 'Aulas de Pilates - Competência 04/2026',
  notaAnteriorEmitida: false,
  dataPagamento: '2026-04-12',
  observacoes: '',
  cpfNaNota: true,
  pendencia: 'Deseja CPF na nota, mas o CPF não está cadastrado'
};

const mockExportResponse = new HttpResponse({
  body: new Blob(['xlsx'], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }),
  headers: new HttpHeaders({
    'Content-Disposition': 'attachment; filename="relatorio-nfse-04-2026.xlsx"'
  })
});

describe('NfseRelatorioComponent', () => {
  let component: NfseRelatorioComponent;
  let fixture: ComponentFixture<NfseRelatorioComponent>;
  let serviceSpy: jasmine.SpyObj<RelatorioService>;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('RelatorioService', [
      'relatorioNfse',
      'exportarRelatorioNfse'
    ]);
    serviceSpy.relatorioNfse.and.returnValue(of(mockRelatorio));
    serviceSpy.exportarRelatorioNfse.and.returnValue(of(mockExportResponse));

    await TestBed.configureTestingModule({
      imports: [NfseRelatorioComponent, RouterTestingModule],
      providers: [provideLocalePtBr(), { provide: RelatorioService, useValue: serviceSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(NfseRelatorioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose numeric inputmode on the competencia field', () => {
    const competencia = fixture.nativeElement.querySelector('#competencia') as HTMLInputElement;
    expect(competencia.getAttribute('inputmode')).toBe('numeric');
  });

  it('should mask competencia as MM/AAAA from digits typed on a numeric keyboard', () => {
    component.form.get('competencia')?.setValue('042026');

    component.formatarCompetencia();

    expect(component.form.get('competencia')?.value).toBe('04/2026');
    expect(component.form.get('competencia')?.valid).toBeTrue();
  });

  it('should not request report when form is invalid', () => {
    component.form.setValue({ competencia: '13/2026', notaAnteriorEmitida: null, cpfNaNota: null });

    component.consultar();

    expect(serviceSpy.relatorioNfse).not.toHaveBeenCalled();
  });

  it('should request report and store response', () => {
    component.form.setValue({ competencia: '04/2026', notaAnteriorEmitida: false, cpfNaNota: null });

    component.consultar();

    expect(serviceSpy.relatorioNfse).toHaveBeenCalledWith('04/2026', { notaAnteriorEmitida: false, cpfNaNota: null });
    expect(component.registros).toEqual(mockRelatorio);
    expect(component.consultado).toBeTrue();
  });

  it('should set erro when report request fails', () => {
    serviceSpy.relatorioNfse.and.returnValue(throwError(() => new Error('fail')));
    component.form.setValue({ competencia: '04/2026', notaAnteriorEmitida: null, cpfNaNota: null });

    component.consultar();

    expect(component.erro).toBe('Erro ao carregar relatório de emissão de NFSEs.');
    expect(component.loadingRelatorio).toBeFalse();
  });

  it('should calculate total paid value', () => {
    component.registros = mockRelatorio;

    expect(component.totalValorPago()).toBe(250);
  });

  it('should render the total and each paid value in Brazilian currency format', () => {
    component.form.setValue({ competencia: '04/2026', notaAnteriorEmitida: null, cpfNaNota: null });
    component.consultar();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const totais = Array.from(el.querySelectorAll('.summary-item strong')).map(s => normalizarEspacos(s.textContent).trim());
    expect(totais).toContain('R$ 250,00');
    const celulas = Array.from(el.querySelectorAll('table tbody td')).map(td => normalizarEspacos(td.textContent).trim());
    expect(celulas[4]).toBe('R$ 250,00');
    expect(celulas[8]).toBe('10/04/2026');
  });

  it('should export XLSX and reset loading state', () => {
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:relatorio-xlsx');
    spyOn(window.URL, 'revokeObjectURL');
    component.form.setValue({ competencia: '04/2026', notaAnteriorEmitida: true, cpfNaNota: null });

    component.exportarExcel();

    expect(serviceSpy.exportarRelatorioNfse).toHaveBeenCalledWith('04/2026', 'XLSX', { notaAnteriorEmitida: true, cpfNaNota: null });
    expect(component.exportandoExcel).toBeFalse();
    expect(component.erro).toBeNull();
  });

  it('should export CSV and reset loading state', () => {
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:relatorio-csv');
    spyOn(window.URL, 'revokeObjectURL');
    component.form.setValue({ competencia: '04/2026', notaAnteriorEmitida: null, cpfNaNota: null });

    component.exportarCsv();

    expect(serviceSpy.exportarRelatorioNfse).toHaveBeenCalledWith('04/2026', 'CSV', { notaAnteriorEmitida: null, cpfNaNota: null });
    expect(component.exportandoCsv).toBeFalse();
    expect(component.erro).toBeNull();
  });

  it('should set friendly error when export fails', () => {
    serviceSpy.exportarRelatorioNfse.and.returnValue(throwError(() => new Error('fail')));
    component.form.setValue({ competencia: '04/2026', notaAnteriorEmitida: null, cpfNaNota: null });

    component.exportarExcel();

    expect(component.erro).toBe('Erro ao exportar relatório em Excel.');
    expect(component.exportandoExcel).toBeFalse();
  });

  it('should render report rows after successful query', () => {
    component.form.setValue({ competencia: '04/2026', notaAnteriorEmitida: null, cpfNaNota: null });
    component.consultar();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Ana Silva');
    expect(el.textContent).toContain('123.456.789-00');
    expect(el.textContent).toContain('Não');
  });

  it('should send the cpfNaNota filter to the report and to the export', () => {
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:relatorio-csv');
    spyOn(window.URL, 'revokeObjectURL');
    component.form.setValue({ competencia: '04/2026', notaAnteriorEmitida: null, cpfNaNota: true });

    component.consultar();
    component.exportarCsv();

    expect(serviceSpy.relatorioNfse).toHaveBeenCalledWith('04/2026', { notaAnteriorEmitida: null, cpfNaNota: true });
    expect(serviceSpy.exportarRelatorioNfse)
      .toHaveBeenCalledWith('04/2026', 'CSV', { notaAnteriorEmitida: null, cpfNaNota: true });
  });

  describe('pendências de CPF na nota (#287)', () => {
    beforeEach(() => {
      serviceSpy.relatorioNfse.and.returnValue(of([...mockRelatorio, registroComPendencia]));
      component.form.setValue({ competencia: '04/2026', notaAnteriorEmitida: null, cpfNaNota: null });
      component.consultar();
      fixture.detectChanges();
    });

    it('should count the records with pendencia and warn about them', () => {
      const el = fixture.nativeElement as HTMLElement;

      expect(component.totalPendencias()).toBe(1);
      expect(el.querySelector('.summary-item--pendente strong')?.textContent?.trim()).toBe('1');
      expect(el.querySelector('.alert-warning')?.textContent).toContain('1 registro precisa');
    });

    it('should highlight the row, show the pendencia and link to the patient edit page', () => {
      const el = fixture.nativeElement as HTMLElement;
      const linhas = el.querySelectorAll('table tbody tr');

      expect(linhas[0].classList).not.toContain('linha-pendente');
      expect(linhas[1].classList).toContain('linha-pendente');
      expect(linhas[1].textContent).toContain('Deseja CPF na nota, mas o CPF não está cadastrado');
      const link = linhas[1].querySelector('a') as HTMLAnchorElement;
      expect(link.getAttribute('href')).toBe('/pacientes/7/editar');
    });

    it('should show a dash when the record goes without CPF/CNPJ', () => {
      const celulas = (fixture.nativeElement as HTMLElement).querySelectorAll('table tbody tr')[1].querySelectorAll('td');

      expect(celulas[1].textContent?.trim()).toBe('—');
      expect(celulas[2].textContent?.trim()).toBe('Sim');
    });
  });

  it('should mask CPF and CNPJ, which the API sends as digits only', () => {
    expect(component.documento('12345678909')).toBe('123.456.789-09');
    expect(component.documento('11222333000181')).toBe('11.222.333/0001-81');
    expect(component.documento(null)).toBe('—');
  });

  it('should not warn when there is no pendencia', () => {
    component.form.setValue({ competencia: '04/2026', notaAnteriorEmitida: null, cpfNaNota: null });
    component.consultar();
    fixture.detectChanges();

    expect(component.totalPendencias()).toBe(0);
    expect((fixture.nativeElement as HTMLElement).querySelector('.alert-warning')).toBeNull();
  });

  // A tabela tem 10 colunas e `min-width: 1180px`: em 375px o usuário vê ~2 delas
  // e nada indicava que havia mais à direita, nem sobrava referência da linha
  // ao rolar (issue #164).
  describe('scroll horizontal da tabela no mobile (issue #164)', () => {
    /** Renderiza o resultado e anexa a fixture ao documento (computed styles). */
    function renderizarResultado(): HTMLElement {
      component.form.setValue({ competencia: '04/2026', notaAnteriorEmitida: null, cpfNaNota: null });
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

    it('should freeze the first column with an opaque background', () => {
      const el = renderizarResultado();
      const primeiroTh = el.querySelector('.table-sticky-first-col th:first-child') as HTMLElement;
      const primeiraTd = el.querySelector('.table-sticky-first-col td:first-child') as HTMLElement;
      const segundaTd = el.querySelector('.table-sticky-first-col td:nth-child(2)') as HTMLElement;

      expect(getComputedStyle(primeiroTh).position).toBe('sticky');
      expect(getComputedStyle(primeiroTh).left).toBe('0px');
      expect(getComputedStyle(primeiraTd).position).toBe('sticky');
      expect(getComputedStyle(primeiraTd).left).toBe('0px');
      // Sem fundo opaco as colunas seguintes passariam por baixo e o texto se
      // sobreporia ao da coluna congelada.
      expect(getComputedStyle(primeiraTd).backgroundColor).toBe('rgb(255, 255, 255)');
      expect(getComputedStyle(segundaTd).position).toBe('static');
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

    it('should paint the scroll shadows on the scroll container, not behind the table', () => {
      const el = renderizarResultado();
      const wrap = el.querySelector('.table-responsive') as HTMLElement;
      const tabela = el.querySelector('table.table') as HTMLElement;
      const estiloWrap = getComputedStyle(wrap);

      // Duas tampas que rolam com o conteúdo (`local`) sobre duas sombras
      // presas ao contêiner (`scroll`): sem transbordo as tampas escondem as
      // sombras e nada aparece.
      expect(estiloWrap.backgroundAttachment).toBe('local, local, scroll, scroll');
      expect(estiloWrap.overflowX).toBe('auto');
      // Com fundo próprio a tabela cobriria as camadas do contêiner.
      expect(getComputedStyle(tabela).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    });

    it('should expose the scroll container as a keyboard reachable region', () => {
      const el = renderizarResultado();
      const wrap = el.querySelector('.table-responsive') as HTMLElement;

      // Sem `tabindex` o teclado não alcança o scroll horizontal (WCAG 2.1.1).
      expect(wrap.getAttribute('tabindex')).toBe('0');
      expect(wrap.getAttribute('role')).toBe('region');
      expect(wrap.getAttribute('aria-label')).toBe('Pagamentos para emissão de NFSE');
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

    it('should apply the mobile layout at 375px and keep the desktop one at 1200px', () => {
      const el = renderizarResultado();

      // Em iframe de largura fixa: a janela do Karma é sempre larga e deixaria
      // as regras mobile — o motivo desta issue — sem teste efetivo.
      [375, 1200].forEach(largura => {
        const viewport = renderizarEmViewport(el, largura);
        const mobile = largura === 375;

        try {
          const estilo = (alvo: Element) => viewport.janela.getComputedStyle(alvo);
          const acoes = el.querySelector('.form-actions') as HTMLElement;
          const grid = el.querySelector('.summary-grid') as HTMLElement;

          el.querySelectorAll('.table-scroll-hint').forEach(hint => {
            expect(hint.textContent).toContain('Arraste a tabela para o lado');
            expect(estilo(hint).display)
              .withContext(`hint em ${largura}px`).toBe(mobile ? 'block' : 'none');
          });

          expect(estilo(acoes).flexDirection)
            .withContext(`ações em ${largura}px`).toBe(mobile ? 'column' : 'row');
          // `stretch` é o alinhamento padrão: empilhados, os botões ocupam a
          // largura toda do card.
          expect(estilo(acoes).alignItems).toBe('normal');

          const colunas = estilo(grid).gridTemplateColumns.split(' ').length;
          if (mobile) {
            expect(colunas).withContext('cards de resumo em 375px').toBe(1);
          } else {
            expect(colunas).withContext('cards de resumo em 1200px').toBeGreaterThan(1);
          }
        } finally {
          viewport.destruir();
        }
      });
    });
  });
});
