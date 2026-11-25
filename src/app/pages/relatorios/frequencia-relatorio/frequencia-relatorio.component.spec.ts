import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import {
  FrequenciaRelatorioComponent,
  MENSAGEM_SEM_PERMISSAO_FREQUENCIA
} from './frequencia-relatorio.component';
import { RelatorioService } from '../../../core/services/relatorio.service';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { ProfissionalPage } from '../../../core/models/profissional';
import { RelatorioFrequenciaDTO } from '../../../core/models/relatorio-frequencia';
import { periodoDoMesAtual } from '../../../shared/utils/indicadores';
import { normalizarEspacos, provideLocalePtBr } from '../../../../testing/locale';

const relatorio: RelatorioFrequenciaDTO = {
  periodo: { inicio: '2026-11-01', fim: '2026-11-30' },
  consideradoAte: '2026-11-24',
  filtros: { profissionalId: null, profissionalNome: null, pacienteId: null, taxaMaxima: null },
  totais: { pacientes: 2, aulasPrevistas: 12, aulasRealizadas: 10, faltas: 2, taxaPresenca: 83.3 },
  pacientes: [
    {
      pacienteId: 7,
      pacienteNome: 'Ana Silva',
      ativo: true,
      aulasPrevistas: 8,
      aulasRealizadas: 6,
      faltas: 2,
      taxaPresenca: 75,
      ultimaAulaRealizada: '2026-11-20'
    },
    {
      pacienteId: 8,
      pacienteNome: 'Bruno Lima',
      ativo: false,
      aulasPrevistas: 4,
      aulasRealizadas: 4,
      faltas: 0,
      taxaPresenca: 100,
      ultimaAulaRealizada: null
    }
  ],
  geradoEm: '2026-11-25T10:00:00'
};

const profissionais = {
  content: [{ id: 5, nome: 'Paula Mendes' }],
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

describe('FrequenciaRelatorioComponent', () => {
  let fixture: ComponentFixture<FrequenciaRelatorioComponent>;
  let component: FrequenciaRelatorioComponent;
  let serviceSpy: jasmine.SpyObj<RelatorioService>;
  let profissionalSpy: jasmine.SpyObj<ProfissionalService>;

  const el = () => fixture.nativeElement as HTMLElement;
  const texto = (seletor: string) => normalizarEspacos(el().querySelector(seletor)?.textContent).trim();
  const botaoExportar = () =>
    Array.from(el().querySelectorAll<HTMLButtonElement>('button[type="button"]'))
      .find(b => b.textContent?.includes('Excel'))!;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj<RelatorioService>('RelatorioService', [
      'relatorioFrequencia',
      'exportarRelatorioFrequencia'
    ]);
    serviceSpy.relatorioFrequencia.and.returnValue(of(relatorio));
    serviceSpy.exportarRelatorioFrequencia.and.returnValue(of(arquivo('relatorio-frequencia-2026-11-01-2026-11-30.xlsx')));
    profissionalSpy = jasmine.createSpyObj<ProfissionalService>('ProfissionalService', ['listar']);
    profissionalSpy.listar.and.returnValue(of(profissionais));

    await TestBed.configureTestingModule({
      imports: [FrequenciaRelatorioComponent],
      providers: [
        provideRouter([]),
        provideLocalePtBr(),
        { provide: RelatorioService, useValue: serviceSpy },
        { provide: ProfissionalService, useValue: profissionalSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FrequenciaRelatorioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should query the current month on open, without the optional filters', () => {
    const { inicio, fim } = periodoDoMesAtual();
    expect(serviceSpy.relatorioFrequencia).toHaveBeenCalledOnceWith(inicio, fim, {
      profissionalId: null,
      taxaMaxima: null
    });
  });

  it('should list the professionals in the filter and keep working if they fail to load', () => {
    const opcoes = Array.from(el().querySelectorAll('#profissionalId option')).map(o => o.textContent?.trim());
    expect(opcoes).toEqual(['Todos os profissionais', 'Paula Mendes']);

    profissionalSpy.listar.and.returnValue(throwError(() => new Error('falha')));
    component.carregarProfissionais();
    fixture.detectChanges();
    expect(component.erroProfissionais).toContain('profissionais');
    expect(el().querySelector('table')).toBeTruthy();
  });

  it('should send the professional and the attendance limit to the API', () => {
    component.form.patchValue({ inicio: '2026-10-01', fim: '2026-10-31', profissionalId: 5, taxaMaxima: 75 });
    component.consultar();

    expect(serviceSpy.relatorioFrequencia).toHaveBeenCalledWith('2026-10-01', '2026-10-31', {
      profissionalId: 5,
      taxaMaxima: 75
    });
  });

  it('should block an inverted period or a limit outside 0–100 without calling the API', () => {
    serviceSpy.relatorioFrequencia.calls.reset();

    component.form.patchValue({ inicio: '2026-11-30', fim: '2026-11-01' });
    component.consultar();
    fixture.detectChanges();
    expect(component.erroPeriodo).toBe('A data inicial deve ser menor ou igual à data final.');

    component.form.patchValue({ inicio: '2026-11-01', fim: '2026-11-30', taxaMaxima: 120 });
    component.consultar();
    fixture.detectChanges();
    expect(component.erroTaxa).toBe('Informe uma presença entre 0 e 100%.');

    expect(serviceSpy.relatorioFrequencia).not.toHaveBeenCalled();
    expect(el().querySelector('table')).toBeNull();
    expect(botaoExportar().disabled).toBeTrue();
  });

  it('should render the totals, the cutoff date and the rows in the API order', () => {
    expect(texto('[data-card="pacientes"] strong')).toBe('2');
    expect(texto('[data-card="faltas"] strong')).toBe('2');
    expect(texto('[data-card="presenca"] strong')).toBe('83,3%');
    expect(texto('.considerado-ate')).toBe('Considerado até 24/11');

    const linhas = Array.from(el().querySelectorAll('tbody tr')).map(tr => normalizarEspacos(tr.textContent).trim());
    expect(linhas[0]).toContain('Ana Silva');
    expect(linhas[0]).toContain('75%');
    expect(linhas[0]).toContain('20/11/2026');
    expect(linhas[1]).toContain('Bruno Lima');
    expect(linhas[1]).toContain('Inativo');
    expect(linhas[1]).toContain('100%');
  });

  it('should link each row to the patient', () => {
    const links = Array.from(el().querySelectorAll<HTMLAnchorElement>('tbody a')).map(a => a.getAttribute('href'));
    expect(links).toEqual(['/pacientes/7', '/pacientes/8']);
  });

  it('should highlight only the rows below the consulted limit', () => {
    expect(el().querySelectorAll('tbody tr.abaixo-limite').length).toBe(0);

    component.form.patchValue({ taxaMaxima: 80 });
    component.consultar();
    fixture.detectChanges();

    const linhas = el().querySelectorAll('tbody tr');
    expect(linhas[0].classList).toContain('abaixo-limite');
    expect(linhas[1].classList).not.toContain('abaixo-limite');
  });

  it('should show a dash for the attendance total when no class was considered', () => {
    serviceSpy.relatorioFrequencia.and.returnValue(of({
      ...relatorio,
      totais: { pacientes: 0, aulasPrevistas: 0, aulasRealizadas: 0, faltas: 0, taxaPresenca: null },
      pacientes: []
    }));
    component.consultar();
    fixture.detectChanges();

    expect(texto('[data-card="presenca"] strong')).toBe('-');
    expect(texto('.empty-state')).toBe('Nenhuma aula passada no período com os filtros informados.');
    expect(el().querySelector('table')).toBeNull();
  });

  it('should show a permission message on 403 and the API detail on other errors', () => {
    serviceSpy.relatorioFrequencia.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    component.consultar();
    fixture.detectChanges();
    expect(texto('.alert-danger')).toBe(MENSAGEM_SEM_PERMISSAO_FREQUENCIA);

    serviceSpy.relatorioFrequencia.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'taxaMaxima deve estar entre 0 e 100' } }))
    );
    component.consultar();
    fixture.detectChanges();
    expect(texto('.alert-danger')).toContain('taxaMaxima deve estar entre 0 e 100');
    expect(component.loading).toBeFalse();
  });

  it('should export the consulted filters, not a filter changed without querying, disabling the button', () => {
    const resposta$ = new Subject<HttpResponse<Blob>>();
    serviceSpy.exportarRelatorioFrequencia.and.returnValue(resposta$);
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:relatorio');
    spyOn(window.URL, 'revokeObjectURL');
    const cliques: string[] = [];
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      cliques.push(this.download);
    });

    component.form.patchValue({ inicio: '2026-11-01', fim: '2026-11-30', taxaMaxima: 75 });
    component.consultar();
    component.form.patchValue({ inicio: '2026-10-01', taxaMaxima: 50 });

    component.exportar();
    fixture.detectChanges();

    expect(serviceSpy.exportarRelatorioFrequencia).toHaveBeenCalledOnceWith('2026-11-01', '2026-11-30', {
      profissionalId: null,
      taxaMaxima: 75
    });
    expect(botaoExportar().disabled).toBeTrue();
    expect(normalizarEspacos(el().textContent)).toContain('Gerando Excel...');

    resposta$.next(arquivo('relatorio-frequencia-2026-11-01-2026-11-30.xlsx'));
    resposta$.complete();
    fixture.detectChanges();

    expect(cliques).toEqual(['relatorio-frequencia-2026-11-01-2026-11-30.xlsx']);
    expect(component.exportando).toBeFalse();
    expect(botaoExportar().disabled).toBeFalse();
  });

  it('should not export without a successful query', () => {
    serviceSpy.relatorioFrequencia.and.returnValue(throwError(() => new Error('falha')));
    component.consultar();
    fixture.detectChanges();

    component.exportar();

    expect(serviceSpy.exportarRelatorioFrequencia).not.toHaveBeenCalled();
    expect(botaoExportar().disabled).toBeTrue();
  });

  it('should show the API detail of an export error that arrives as Blob', async () => {
    const corpo = new Blob([JSON.stringify({ detail: 'Relatório limitado a 5000 linhas.' })], { type: 'application/json' });
    serviceSpy.exportarRelatorioFrequencia.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: corpo }))
    );

    component.exportar();
    // `Blob.text()` resolve fora da fila de microtarefas: espera até a mensagem chegar.
    for (let i = 0; i < 50 && component.erro === null; i++) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    expect(component.erro).toBe('Relatório limitado a 5000 linhas.');
    expect(component.exportando).toBeFalse();
  });

  it('should show the permission message when the export returns 403', () => {
    serviceSpy.exportarRelatorioFrequencia.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    component.exportar();
    expect(component.erro).toBe(MENSAGEM_SEM_PERMISSAO_FREQUENCIA);
    expect(component.exportando).toBeFalse();
  });
});
