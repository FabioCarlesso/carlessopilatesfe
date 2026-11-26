import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import {
  AulasSemEvolucaoRelatorioComponent,
  MENSAGEM_SEM_PERMISSAO_AULAS_SEM_EVOLUCAO
} from './aulas-sem-evolucao-relatorio.component';
import { RelatorioService } from '../../../core/services/relatorio.service';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { ProfissionalPage } from '../../../core/models/profissional';
import { RelatorioAulasSemEvolucaoDTO } from '../../../core/models/relatorio-aulas-sem-evolucao';
import { periodoDoMesAtual } from '../../../shared/utils/indicadores';
import { normalizarEspacos, provideLocalePtBr } from '../../../../testing/locale';

const relatorio: RelatorioAulasSemEvolucaoDTO = {
  periodo: { inicio: '2026-10-01', fim: '2026-11-30' },
  filtros: { profissionalId: null, profissionalNome: null },
  resumo: {
    totalAulas: 3,
    porProfissional: [
      { profissionalId: 5, profissionalNome: 'Camila', quantidade: 2 },
      { profissionalId: null, profissionalNome: 'Sem profissional', quantidade: 1 }
    ]
  },
  aulas: [
    {
      aulaId: 11,
      data: '2026-10-05',
      horario: '08:00:00',
      pacienteId: 7,
      pacienteNome: 'Ana Souza',
      profissionalId: 5,
      profissionalNome: 'Camila'
    },
    {
      aulaId: 12,
      data: '2026-10-06',
      horario: null,
      pacienteId: 8,
      pacienteNome: 'Bruno Lima',
      profissionalId: null,
      profissionalNome: null
    },
    {
      aulaId: 13,
      data: '2026-10-07',
      horario: '18:30:00',
      pacienteId: 7,
      pacienteNome: 'Ana Souza',
      profissionalId: 5,
      profissionalNome: 'Camila'
    }
  ],
  geradoEm: '2026-11-25T10:00:00'
};

const profissionais = {
  content: [{ id: 5, nome: 'Camila' }],
  totalElements: 1,
  totalPages: 1,
  number: 0,
  size: 100
} as unknown as ProfissionalPage;

function arquivo(nome: string): HttpResponse<Blob> {
  return new HttpResponse({
    body: new Blob(['conteudo']),
    headers: new HttpHeaders({ 'Content-Disposition': `attachment; filename="${nome}"` })
  });
}

describe('AulasSemEvolucaoRelatorioComponent', () => {
  let fixture: ComponentFixture<AulasSemEvolucaoRelatorioComponent>;
  let component: AulasSemEvolucaoRelatorioComponent;
  let serviceSpy: jasmine.SpyObj<RelatorioService>;
  let profissionalSpy: jasmine.SpyObj<ProfissionalService>;

  const el = () => fixture.nativeElement as HTMLElement;
  const texto = (seletor: string) => normalizarEspacos(el().querySelector(seletor)?.textContent).trim();
  const consultar = (valores: { inicio: string; fim: string; profissionalId?: number | null }) => {
    component.form.setValue({ profissionalId: null, ...valores });
    component.consultar();
    fixture.detectChanges();
  };
  const botaoExportar = () =>
    el().querySelector<HTMLButtonElement>('.form-actions button[type="button"]')!;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj<RelatorioService>('RelatorioService', [
      'relatorioAulasSemEvolucao',
      'exportarRelatorioAulasSemEvolucao'
    ]);
    serviceSpy.relatorioAulasSemEvolucao.and.returnValue(of(relatorio));
    serviceSpy.exportarRelatorioAulasSemEvolucao.and.returnValue(of(arquivo('relatorio.xlsx')));
    profissionalSpy = jasmine.createSpyObj<ProfissionalService>('ProfissionalService', ['listar']);
    profissionalSpy.listar.and.returnValue(of(profissionais));

    await TestBed.configureTestingModule({
      imports: [AulasSemEvolucaoRelatorioComponent],
      providers: [
        provideRouter([]),
        provideLocalePtBr(),
        { provide: RelatorioService, useValue: serviceSpy },
        { provide: ProfissionalService, useValue: profissionalSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AulasSemEvolucaoRelatorioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should suggest the current month and query it without filters on open', () => {
    const { inicio, fim } = periodoDoMesAtual();

    expect(component.form.value).toEqual({ inicio, fim, profissionalId: null });
    expect(serviceSpy.relatorioAulasSemEvolucao).toHaveBeenCalledOnceWith(inicio, fim, { profissionalId: null });
  });

  it('should list the professionals in the filter and keep working when they fail to load', () => {
    const opcoes = Array.from(el().querySelectorAll('#profissionalId option')).map(o => o.textContent?.trim());
    expect(opcoes).toEqual(['Todos os profissionais', 'Camila']);

    profissionalSpy.listar.and.returnValue(throwError(() => new Error('falha')));
    component.carregarProfissionais();
    fixture.detectChanges();
    expect(component.erroProfissionais).toContain('profissionais');
    expect(el().querySelector('table')).toBeTruthy();
  });

  it('should render the summary per professional, whose sum matches the table', () => {
    expect(texto('[data-card="total"] strong')).toBe('3');
    const grupos = Array.from(el().querySelectorAll('[data-card="profissional"]')).map(c => [
      normalizarEspacos(c.querySelector('.label')?.textContent).trim(),
      normalizarEspacos(c.querySelector('strong')?.textContent).trim()
    ]);
    expect(grupos).toEqual([['Camila', '2'], ['Sem profissional', '1']]);
    expect(el().querySelector('[data-card="profissional"]:last-child')?.classList)
      .toContain('summary-item--sem-profissional');

    const soma = relatorio.resumo.porProfissional.reduce((total, g) => total + g.quantidade, 0);
    expect(el().querySelectorAll('tbody tr').length).toBe(soma);
    expect(texto('.linha-total')).toBe('Total (3)');
  });

  it('should show each class with date, time, patient and professional, with placeholders for missing data', () => {
    const linhas = Array.from(el().querySelectorAll('tbody tr')).map(tr =>
      Array.from(tr.querySelectorAll('td')).slice(0, 4).map(td => normalizarEspacos(td.textContent).trim())
    );

    expect(linhas).toEqual([
      ['05/10/2026', '08:00', 'Ana Souza', 'Camila'],
      ['06/10/2026', '—', 'Bruno Lima', 'Sem profissional'],
      ['07/10/2026', '18:30', 'Ana Souza', 'Camila']
    ]);
  });

  it('should link "Registrar evolução" to the sessions of the patient of the row', () => {
    const acoes = Array.from(el().querySelectorAll<HTMLAnchorElement>('tbody a.btn'));

    expect(acoes.map(a => normalizarEspacos(a.textContent).trim())).toEqual([
      'Registrar evolução',
      'Registrar evolução',
      'Registrar evolução'
    ]);
    expect(acoes.map(a => a.getAttribute('href'))).toEqual([
      '/pacientes/7/sessoes',
      '/pacientes/8/sessoes',
      '/pacientes/7/sessoes'
    ]);
  });

  it('should send the professional filter', () => {
    consultar({ inicio: '2026-10-01', fim: '2026-11-30', profissionalId: 5 });

    expect(serviceSpy.relatorioAulasSemEvolucao).toHaveBeenCalledWith('2026-10-01', '2026-11-30', {
      profissionalId: 5
    });
  });

  it('should show an empty state, not an error, for a period without classes', () => {
    serviceSpy.relatorioAulasSemEvolucao.and.returnValue(
      of({ ...relatorio, resumo: { totalAulas: 0, porProfissional: [] }, aulas: [] })
    );
    consultar({ inicio: '2026-10-01', fim: '2026-11-30' });

    expect(texto('.empty-state')).toBe('Nenhuma aula realizada sem evolução no período com os filtros informados.');
    expect(el().querySelector('table')).toBeNull();
    expect(el().querySelector('.alert-danger')).toBeNull();
  });

  it('should block an inverted period and a period longer than the API limit', () => {
    serviceSpy.relatorioAulasSemEvolucao.calls.reset();

    consultar({ inicio: '2026-11-30', fim: '2026-11-01' });
    expect(texto('.periodo-erro')).toBe('A data inicial deve ser menor ou igual à data final.');
    expect(el().querySelector('#inicio')?.classList).toContain('is-invalid');

    consultar({ inicio: '2025-01-01', fim: '2026-11-30' });
    expect(component.erroPeriodo).toContain('366');

    expect(serviceSpy.relatorioAulasSemEvolucao).not.toHaveBeenCalled();
    expect(component.relatorio).toBeNull();
  });

  it('should show a permission message on 403 and the API detail on other errors', () => {
    serviceSpy.relatorioAulasSemEvolucao.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    consultar({ inicio: '2026-10-01', fim: '2026-11-30' });
    expect(texto('.alert-danger')).toBe(MENSAGEM_SEM_PERMISSAO_AULAS_SEM_EVOLUCAO);
    expect(component.loading).toBeFalse();

    serviceSpy.relatorioAulasSemEvolucao.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'Consulta por período limitada a 366 dias' } }))
    );
    consultar({ inicio: '2026-10-01', fim: '2026-11-30' });
    expect(texto('.alert-danger')).toBe('Consulta por período limitada a 366 dias');
  });

  it('should fall back to a friendly message on network failure', () => {
    serviceSpy.relatorioAulasSemEvolucao.and.returnValue(throwError(() => new Error('falha')));
    consultar({ inicio: '2026-10-01', fim: '2026-11-30' });

    expect(component.erro).toBe('Erro ao carregar o relatório de aulas sem evolução.');
  });

  describe('exportação', () => {
    /** `Blob.text()` resolve fora do controle do teste: espera a leitura do corpo terminar. */
    async function aguardarExportacao(): Promise<void> {
      for (let i = 0; i < 50 && component.exportando; i++) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      fixture.detectChanges();
    }

    it('should disable the button while generating the Excel and download with the API file name', () => {
      const resposta$ = new Subject<HttpResponse<Blob>>();
      serviceSpy.exportarRelatorioAulasSemEvolucao.and.returnValue(resposta$);
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:relatorio');
      spyOn(window.URL, 'revokeObjectURL');
      const cliques: string[] = [];
      spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
        cliques.push(this.download);
      });
      consultar({ inicio: '2026-10-01', fim: '2026-11-30', profissionalId: 5 });

      component.exportar();
      fixture.detectChanges();

      expect(serviceSpy.exportarRelatorioAulasSemEvolucao).toHaveBeenCalledWith('2026-10-01', '2026-11-30', {
        profissionalId: 5
      });
      expect(botaoExportar().disabled).toBeTrue();
      expect(normalizarEspacos(botaoExportar().textContent).trim()).toBe('Gerando Excel...');

      resposta$.next(arquivo('relatorio-aulas-sem-evolucao-2026-10-01-2026-11-30.xlsx'));
      resposta$.complete();
      fixture.detectChanges();

      expect(cliques).toEqual(['relatorio-aulas-sem-evolucao-2026-10-01-2026-11-30.xlsx']);
      expect(component.exportando).toBeFalse();
      expect(botaoExportar().disabled).toBeFalse();
    });

    it('should export the last successful query, not unsubmitted form edits', () => {
      // Sem os stubs, o clique de download é real e grava o Blob falso em ~/Downloads.
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:relatorio');
      spyOn(window.URL, 'revokeObjectURL');
      spyOn(HTMLAnchorElement.prototype, 'click');
      consultar({ inicio: '2026-10-01', fim: '2026-11-30', profissionalId: 5 });
      component.form.patchValue({ profissionalId: null, inicio: '2026-09-01' });

      component.exportar();

      expect(serviceSpy.exportarRelatorioAulasSemEvolucao).toHaveBeenCalledOnceWith('2026-10-01', '2026-11-30', {
        profissionalId: 5
      });
    });

    it('should not export while there is no successful query on screen', () => {
      consultar({ inicio: '2026-11-30', fim: '2026-11-01' });
      component.exportar();
      expect(botaoExportar().disabled).toBeTrue();

      serviceSpy.relatorioAulasSemEvolucao.and.returnValue(throwError(() => new Error('falha')));
      consultar({ inicio: '2026-10-01', fim: '2026-11-30' });
      component.exportar();
      expect(botaoExportar().disabled).toBeTrue();

      expect(serviceSpy.exportarRelatorioAulasSemEvolucao).not.toHaveBeenCalled();
    });

    it('should show the API detail read from the Blob body when the export fails', async () => {
      const corpo = new Blob([JSON.stringify({ detail: 'Resultado acima de 5000 linhas' })], {
        type: 'application/problem+json'
      });
      serviceSpy.exportarRelatorioAulasSemEvolucao.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 400, error: corpo }))
      );

      component.exportar();
      await aguardarExportacao();

      expect(component.erro).toBe('Resultado acima de 5000 linhas');
      expect(component.exportando).toBeFalse();
    });

    it('should show friendly messages for a 403 and for an unreadable failure', async () => {
      serviceSpy.exportarRelatorioAulasSemEvolucao.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 403 }))
      );
      component.exportar();
      expect(component.erro).toBe(MENSAGEM_SEM_PERMISSAO_AULAS_SEM_EVOLUCAO);
      expect(component.exportando).toBeFalse();

      serviceSpy.exportarRelatorioAulasSemEvolucao.and.returnValue(throwError(() => new Error('falha')));
      component.exportar();
      await aguardarExportacao();
      expect(component.erro).toBe('Erro ao exportar o relatório em Excel.');
      expect(component.exportando).toBeFalse();
    });
  });
});
