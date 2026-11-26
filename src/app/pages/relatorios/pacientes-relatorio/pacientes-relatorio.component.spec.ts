import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';
import {
  MENSAGEM_SEM_PERMISSAO_PACIENTES,
  PacientesRelatorioComponent
} from './pacientes-relatorio.component';
import { RelatorioService } from '../../../core/services/relatorio.service';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { ProfissionalPage } from '../../../core/models/profissional';
import { RelatorioPacientesDTO } from '../../../core/models/relatorio-pacientes';
import { normalizarEspacos, provideLocalePtBr } from '../../../../testing/locale';

const relatorio: RelatorioPacientesDTO = {
  filtros: {
    situacao: 'TODOS',
    semPlanoAtivo: false,
    cadastroIncompleto: false,
    mesNascimento: null,
    profissionalId: null,
    profissionalNome: null
  },
  totais: { total: 2, ativos: 1, inativos: 1, comPendencia: 1 },
  pacientes: [
    {
      id: 7,
      nome: 'Ana Silva',
      cpf: '123.456.789-00',
      telefone: '(45) 99999-0000',
      email: 'ana@exemplo.com',
      dataNascimento: '1990-12-03',
      idade: 35,
      ativo: true,
      dataCadastro: '2026-01-10',
      dataInativacao: null,
      planoAtivo: {
        id: 10,
        tipo: 'MENSAL',
        frequenciaSemanal: 'DUAS_VEZES',
        diasSemana: ['MONDAY', 'WEDNESDAY'],
        horario: '08:00:00',
        valor: 300
      },
      profissional: { id: 5, nome: 'Paula Mendes' },
      pendencias: []
    },
    {
      id: 8,
      nome: 'Bruno Lima',
      cpf: null,
      telefone: null,
      email: null,
      dataNascimento: null,
      idade: null,
      ativo: false,
      dataCadastro: '2025-03-01',
      dataInativacao: '2026-06-30',
      planoAtivo: null,
      profissional: null,
      pendencias: ['SEM_CPF', 'SEM_EMAIL', 'SEM_TELEFONE', 'SEM_DATA_NASCIMENTO']
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

describe('PacientesRelatorioComponent', () => {
  let fixture: ComponentFixture<PacientesRelatorioComponent>;
  let component: PacientesRelatorioComponent;
  let serviceSpy: jasmine.SpyObj<RelatorioService>;
  let profissionalSpy: jasmine.SpyObj<ProfissionalService>;

  const el = () => fixture.nativeElement as HTMLElement;
  const texto = (seletor: string) => normalizarEspacos(el().querySelector(seletor)?.textContent).trim();

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj<RelatorioService>('RelatorioService', [
      'relatorioPacientes',
      'exportarRelatorioPacientes'
    ]);
    serviceSpy.relatorioPacientes.and.returnValue(of(relatorio));
    serviceSpy.exportarRelatorioPacientes.and.returnValue(of(arquivo('relatorio-pacientes-ativos-2026-11-25.pdf')));
    profissionalSpy = jasmine.createSpyObj<ProfissionalService>('ProfissionalService', ['listar']);
    profissionalSpy.listar.and.returnValue(of(profissionais));

    await TestBed.configureTestingModule({
      imports: [PacientesRelatorioComponent, RouterTestingModule],
      providers: [
        provideLocalePtBr(),
        { provide: RelatorioService, useValue: serviceSpy },
        { provide: ProfissionalService, useValue: profissionalSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PacientesRelatorioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should query active patients on open, without the optional filters', () => {
    expect(serviceSpy.relatorioPacientes).toHaveBeenCalledOnceWith({
      situacao: 'ATIVOS',
      semPlanoAtivo: false,
      cadastroIncompleto: false,
      mesNascimento: null,
      profissionalId: null
    });
  });

  it('should list the professionals in the filter', () => {
    const opcoes = Array.from(el().querySelectorAll('#profissionalId option')).map(o => o.textContent?.trim());
    expect(opcoes).toEqual(['Todos os profissionais', 'Paula Mendes']);
  });

  it('should keep working when the professionals fail to load', () => {
    profissionalSpy.listar.and.returnValue(throwError(() => new Error('falha')));
    component.carregarProfissionais();
    fixture.detectChanges();

    expect(component.erroProfissionais).toContain('profissionais');
    expect(el().querySelector('table')).toBeTruthy();
  });

  it('should send every filter of the form to the API', () => {
    component.form.setValue({
      situacao: 'TODOS',
      semPlanoAtivo: true,
      cadastroIncompleto: true,
      mesNascimento: 12,
      profissionalId: 5
    });
    component.consultar();

    expect(serviceSpy.relatorioPacientes).toHaveBeenCalledWith({
      situacao: 'TODOS',
      semPlanoAtivo: true,
      cadastroIncompleto: true,
      mesNascimento: 12,
      profissionalId: 5
    });
  });

  it('should render the totals returned by the API', () => {
    expect(texto('[data-card="total"] strong')).toBe('2');
    expect(texto('[data-card="ativos"] strong')).toBe('1');
    expect(texto('[data-card="inativos"] strong')).toBe('1');
    expect(texto('[data-card="pendencia"] strong')).toBe('1');
  });

  it('should link each row to the patient detail', () => {
    const links = Array.from(el().querySelectorAll<HTMLAnchorElement>('tbody a')).map(a => a.getAttribute('href'));
    expect(links).toEqual(['/pacientes/7', '/pacientes/8']);
  });

  it('should show the pendencies as Portuguese badges', () => {
    const linhas = el().querySelectorAll('tbody tr');
    const badges = Array.from(linhas[1].querySelectorAll('.coluna-pendencias .badge')).map(b => b.textContent?.trim());

    expect(badges).toEqual(['Sem CPF', 'Sem e-mail', 'Sem telefone', 'Sem data de nascimento']);
    expect(linhas[0].querySelectorAll('.coluna-pendencias .badge').length).toBe(0);
  });

  it('should keep the wide table scrollable with the name column frozen (issue #298)', () => {
    const regiao = el().querySelector('.table-responsive');
    const tabela = regiao?.querySelector('table');

    expect(regiao?.getAttribute('tabindex')).toBe('0');
    expect(tabela?.classList).toContain('table-sticky-first-col');
    expect(tabela?.classList).toContain('tabela-pacientes');
    expect(el().querySelector('.table-scroll-hint')).not.toBeNull();
    expect(el().querySelectorAll('thead th').length).toBe(9);
    expect(el().querySelectorAll('tbody tr')[0].querySelector('td')?.classList).toContain('coluna-nome');
  });

  it('should group the pendency badges in a wrapping container only when there are pendencies', () => {
    const linhas = el().querySelectorAll('tbody tr');

    expect(linhas[1].querySelectorAll('.coluna-pendencias .pendencias .badge').length).toBe(4);
    expect(linhas[0].querySelector('.coluna-pendencias .pendencias')).toBeNull();
    expect(linhas[0].querySelector('.coluna-pendencias')?.textContent?.trim()).toBe('-');
  });

  it('should describe the active plan in Portuguese', () => {
    const linha = normalizarEspacos(el().querySelectorAll('tbody tr')[0].textContent);

    expect(linha).toContain('2x por semana · Seg, Qua · 08:00');
    expect(linha).toContain('R$');
    expect(linha).toContain('Paula Mendes');
    expect(linha).toContain('35 anos');
  });

  // carlessopilatesapi#245: o filtro casa pelo padrão ou pelas próximas aulas,
  // então a coluna mostra os dois quando diferem.
  it('should show the default physiotherapist, and the next classes one when it differs', () => {
    const [ana, bruno] = relatorio.pacientes;
    serviceSpy.relatorioPacientes.and.returnValue(of({
      ...relatorio,
      pacientes: [
        { ...ana, profissionalPadrao: { id: 6, nome: 'Bruno Costa' } },
        { ...bruno, profissional: { id: 5, nome: 'Paula Mendes' }, profissionalPadrao: null },
        { ...ana, id: 9, profissionalPadrao: { id: 5, nome: 'Paula Mendes' } }
      ]
    }));
    component.consultar();
    fixture.detectChanges();

    const colunas = Array.from(el().querySelectorAll('tbody .coluna-profissional'))
      .map(td => Array.from(td.querySelectorAll('span')).map(span => normalizarEspacos(span.textContent).trim()));
    expect(colunas).toEqual([
      ['Bruno Costa', 'Próximas aulas: Paula Mendes'],
      ['Paula Mendes', 'Próximas aulas, sem padrão'],
      ['Paula Mendes']
    ]);
  });

  it('should show an empty state when no patient matches', () => {
    serviceSpy.relatorioPacientes.and.returnValue(of({
      ...relatorio,
      totais: { total: 0, ativos: 0, inativos: 0, comPendencia: 0 },
      pacientes: []
    }));
    component.consultar();
    fixture.detectChanges();

    expect(texto('.empty-state')).toBe('Nenhum paciente encontrado com os filtros informados.');
    expect(el().querySelector('table')).toBeNull();
  });

  it('should show a permission message on 403', () => {
    serviceSpy.relatorioPacientes.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    component.consultar();
    fixture.detectChanges();

    expect(texto('.alert-danger')).toBe(MENSAGEM_SEM_PERMISSAO_PACIENTES);
    expect(component.loading).toBeFalse();
  });

  it('should show the API message when the query fails', () => {
    serviceSpy.relatorioPacientes.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'mesNascimento deve estar entre 1 e 12' } }))
    );
    component.consultar();
    fixture.detectChanges();

    expect(texto('.alert-danger')).toContain('mesNascimento deve estar entre 1 e 12');
  });

  it('should fall back to a friendly message on network failure', () => {
    serviceSpy.relatorioPacientes.and.returnValue(throwError(() => new Error('falha')));
    component.consultar();

    expect(component.erro).toBe('Erro ao carregar o relatório de pacientes.');
  });

  for (const [formato, rotulo] of [['pdf', 'PDF'], ['xlsx', 'Excel']] as const) {
    it(`should export the ${rotulo} with the consulted filters, disabling the buttons, and use the API file name`, () => {
      const resposta$ = new Subject<HttpResponse<Blob>>();
      serviceSpy.exportarRelatorioPacientes.and.returnValue(resposta$);
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:relatorio');
      spyOn(window.URL, 'revokeObjectURL');
      const cliques: string[] = [];
      spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
        cliques.push(this.download);
      });
      component.form.patchValue({ situacao: 'INATIVOS', cadastroIncompleto: true });
      component.consultar();

      component.exportar(formato);
      fixture.detectChanges();

      expect(serviceSpy.exportarRelatorioPacientes).toHaveBeenCalledWith(formato, {
        situacao: 'INATIVOS',
        semPlanoAtivo: false,
        cadastroIncompleto: true,
        mesNascimento: null,
        profissionalId: null
      });
      const botoes = Array.from(el().querySelectorAll<HTMLButtonElement>('button[type="button"]'));
      expect(botoes.length).toBe(2);
      expect(botoes.every(b => b.disabled)).toBeTrue();
      expect(normalizarEspacos(el().textContent)).toContain(`Gerando ${rotulo}...`);

      resposta$.next(arquivo(`relatorio-pacientes-inativos-2026-11-25.${formato}`));
      resposta$.complete();
      fixture.detectChanges();

      expect(cliques).toEqual([`relatorio-pacientes-inativos-2026-11-25.${formato}`]);
      expect(component.exportando).toBeNull();
      expect(botoes.every(b => !b.disabled)).toBeTrue();
    });
  }

  it('should export the filters of the table, not a filter changed without querying', () => {
    component.form.patchValue({ situacao: 'ATIVOS', cadastroIncompleto: true });
    component.consultar();
    component.form.patchValue({ situacao: 'INATIVOS', mesNascimento: 12 });

    component.exportar('xlsx');

    expect(serviceSpy.exportarRelatorioPacientes).toHaveBeenCalledOnceWith('xlsx', {
      situacao: 'ATIVOS',
      semPlanoAtivo: false,
      cadastroIncompleto: true,
      mesNascimento: null,
      profissionalId: null
    });
  });

  it('should not export without a successful query', () => {
    serviceSpy.relatorioPacientes.and.returnValue(throwError(() => new Error('falha')));
    component.consultar();
    fixture.detectChanges();

    component.exportar('pdf');

    expect(serviceSpy.exportarRelatorioPacientes).not.toHaveBeenCalled();
    const botoes = Array.from(el().querySelectorAll<HTMLButtonElement>('button[type="button"]'));
    expect(botoes.length).toBe(2);
    expect(botoes.every(b => b.disabled)).toBeTrue();
  });

  it('should show the API detail of an export error that arrives as Blob', async () => {
    const corpo = new Blob([JSON.stringify({ detail: 'O relatório passa de 5000 pacientes.' })], { type: 'application/json' });
    serviceSpy.exportarRelatorioPacientes.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: corpo }))
    );

    component.exportar('pdf');
    // `Blob.text()` resolve fora da fila de microtarefas: espera até a mensagem chegar.
    for (let i = 0; i < 50 && component.erro === null; i++) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    expect(component.erro).toBe('O relatório passa de 5000 pacientes.');
    expect(component.exportando).toBeNull();
  });

  it('should show a friendly message when the export fails, including 403', async () => {
    serviceSpy.exportarRelatorioPacientes.and.returnValue(throwError(() => new Error('falha')));
    component.exportar('xlsx');
    await Promise.resolve();
    expect(component.erro).toBe('Erro ao exportar o relatório em Excel.');
    expect(component.exportando).toBeNull();

    serviceSpy.exportarRelatorioPacientes.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    component.exportar('pdf');
    expect(component.erro).toBe(MENSAGEM_SEM_PERMISSAO_PACIENTES);
  });
});
