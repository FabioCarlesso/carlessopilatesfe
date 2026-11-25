import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import {
  MENSAGEM_SEM_PERMISSAO_OCUPACAO,
  OcupacaoRelatorioComponent
} from './ocupacao-relatorio.component';
import { RelatorioService } from '../../../core/services/relatorio.service';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { ProfissionalPage } from '../../../core/models/profissional';
import { OcupacaoCelula, RelatorioOcupacaoDTO } from '../../../core/models/relatorio-ocupacao';
import { hojeIso } from '../../../shared/utils/calendario';
import { normalizarEspacos, provideLocalePtBr } from '../../../../testing/locale';

function celula(parcial: Partial<OcupacaoCelula>): OcupacaoCelula {
  return {
    data: '2026-11-23',
    diaSemana: 'MONDAY',
    horario: '08:00:00',
    profissional: { id: 5, nome: 'Paula' },
    ocupacao: 2,
    capacidade: 3,
    vagas: 1,
    lotado: false,
    dentroDaDisponibilidade: true,
    listaEspera: 0,
    alunos: [{ id: 7, nome: 'Bruna' }, { id: 8, nome: 'Carlos' }],
    ...parcial
  };
}

const relatorio: RelatorioOcupacaoDTO = {
  semana: { inicio: '2026-11-23', fim: '2026-11-29' },
  capacidadePorHorario: 3,
  filtros: { profissionalId: null, profissionalNome: null },
  totais: { aulas: 7, ocupacao: 6, semProfissional: 1, capacidade: 6, vagas: 1 },
  celulas: [
    celula({}),
    celula({
      profissional: null, ocupacao: 1, capacidade: null, vagas: null, dentroDaDisponibilidade: null,
      alunos: [{ id: 9, nome: 'Davi' }]
    }),
    celula({
      data: '2026-11-25', diaSemana: 'WEDNESDAY', horario: '18:00:00', ocupacao: 3, vagas: 0, lotado: true,
      listaEspera: 2, alunos: [{ id: 1, nome: 'A' }, { id: 2, nome: 'B' }, { id: 3, nome: 'C' }]
    }),
    celula({
      data: '2026-11-27', diaSemana: 'FRIDAY', horario: '07:00:00', ocupacao: 1, vagas: 0,
      dentroDaDisponibilidade: false, alunos: [{ id: 4, nome: 'D' }]
    })
  ],
  geradoEm: '2026-11-25T10:00:00'
};

const profissionais = {
  content: [{ id: 5, nome: 'Paula' }],
  totalElements: 1,
  totalPages: 1,
  number: 0,
  size: 100
} as unknown as ProfissionalPage;

describe('OcupacaoRelatorioComponent', () => {
  let fixture: ComponentFixture<OcupacaoRelatorioComponent>;
  let component: OcupacaoRelatorioComponent;
  let serviceSpy: jasmine.SpyObj<RelatorioService>;

  const el = () => fixture.nativeElement as HTMLElement;
  const texto = (seletor: string) => normalizarEspacos(el().querySelector(seletor)?.textContent).trim();
  const itens = () => Array.from(el().querySelectorAll<HTMLButtonElement>('button.item'));

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj<RelatorioService>('RelatorioService', ['relatorioOcupacao']);
    serviceSpy.relatorioOcupacao.and.returnValue(of(relatorio));
    const profissionalSpy = jasmine.createSpyObj<ProfissionalService>('ProfissionalService', ['listar']);
    profissionalSpy.listar.and.returnValue(of(profissionais));

    await TestBed.configureTestingModule({
      imports: [OcupacaoRelatorioComponent, RouterTestingModule],
      providers: [
        provideLocalePtBr(),
        { provide: RelatorioService, useValue: serviceSpy },
        { provide: ProfissionalService, useValue: profissionalSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OcupacaoRelatorioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should query the current local week on open, without professional', () => {
    expect(serviceSpy.relatorioOcupacao).toHaveBeenCalledOnceWith({ semana: hojeIso(), profissionalId: null });
  });

  it('should send the chosen week and professional', () => {
    component.form.setValue({ semana: '2026-12-02', profissionalId: 5 });
    component.consultar();

    expect(serviceSpy.relatorioOcupacao).toHaveBeenCalledWith({ semana: '2026-12-02', profissionalId: 5 });
  });

  it('should navigate one week back and forward from the Monday returned by the API', () => {
    component.navegar(1);
    expect(serviceSpy.relatorioOcupacao).toHaveBeenCalledWith({ semana: '2026-11-30', profissionalId: null });

    serviceSpy.relatorioOcupacao.calls.reset();
    component.navegar(-1);
    expect(serviceSpy.relatorioOcupacao).toHaveBeenCalledWith({ semana: '2026-11-16', profissionalId: null });
  });

  it('should render the week totals from the API', () => {
    expect(texto('[data-card="aulas"] strong')).toBe('7');
    expect(texto('[data-card="ocupacao"] strong')).toBe('6');
    expect(texto('[data-card="vagas"] strong')).toBe('1');
    expect(texto('[data-card="vagas"] .detalhe')).toContain('de 6');
    expect(texto('[data-card="sem-profissional"] strong')).toBe('1');
  });

  it('should build the hour x day grid with Monday to Sunday columns', () => {
    const cabecalho = Array.from(el().querySelectorAll('table.grade thead th')).map(th => th.textContent?.trim());
    expect(cabecalho).toEqual(['Horário', 'Seg 23/11', 'Ter 24/11', 'Qua 25/11', 'Qui 26/11', 'Sex 27/11', 'Sáb 28/11', 'Dom 29/11']);

    const horarios = Array.from(el().querySelectorAll('table.grade tbody th')).map(th => th.textContent?.trim());
    expect(horarios).toEqual(['07:00', '08:00', '18:00']);
  });

  it('should put both professionals of the same slot in the same cell, with occupation/capacity', () => {
    const linhaOito = el().querySelectorAll('table.grade tbody tr')[1];
    const segunda = linhaOito.querySelectorAll('td')[0];
    const botoes = Array.from(segunda.querySelectorAll('button.item')).map(b => [
      b.querySelector('.item__prof')?.textContent?.trim(),
      b.querySelector('.item__ocupacao')?.textContent?.trim()
    ]);

    expect(botoes).toEqual([['Paula', '2/3'], ['Sem profissional', '1']]);
  });

  it('should color each item by band and highlight full slots with waiting list', () => {
    const faixas = itens().map(b => b.getAttribute('data-faixa'));
    expect(faixas).toEqual(['fora', 'parcial', 'sem-vaga', 'lotado']);

    const lotado = itens()[3];
    expect(lotado.classList).toContain('item--espera');
    expect(normalizarEspacos(lotado.textContent)).toContain('espera 2');
    expect(itens()[1].classList).not.toContain('item--espera');
  });

  it('should describe the item for screen readers', () => {
    expect(itens()[3].getAttribute('aria-label'))
      .toBe('Paula, 18:00, 3 aluno(s), 0 vaga(s) de 3, Lotado, 2 na lista de espera');
  });

  it('should show the students of the clicked slot, linking to the patient, and close it', () => {
    itens()[1].click();
    fixture.detectChanges();

    const painel = el().querySelector('.detalhe-horario');
    expect(painel).toBeTruthy();
    expect(itens()[1].getAttribute('aria-pressed')).toBe('true');
    const links = Array.from(painel!.querySelectorAll<HTMLAnchorElement>('a')).map(a => [a.textContent?.trim(), a.getAttribute('href')]);
    expect(links).toEqual([['Bruna', '/pacientes/7'], ['Carlos', '/pacientes/8']]);
    expect(normalizarEspacos(painel!.textContent)).toContain('2 de 3 alunos, 1 vaga(s)');

    (painel!.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el().querySelector('.detalhe-horario')).toBeNull();
  });

  it('should show an empty state when the week has no class', () => {
    serviceSpy.relatorioOcupacao.and.returnValue(of({
      ...relatorio,
      totais: { aulas: 0, ocupacao: 0, semProfissional: 0, capacidade: 0, vagas: 0 },
      celulas: []
    }));
    component.consultar();
    fixture.detectChanges();

    expect(texto('.empty-state')).toBe('Nenhuma aula na semana com os filtros informados.');
    expect(el().querySelector('table.grade')).toBeNull();
  });

  it('should show a permission message on 403 and the API message on other errors', () => {
    serviceSpy.relatorioOcupacao.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    component.consultar();
    fixture.detectChanges();
    expect(texto('.alert-danger')).toBe(MENSAGEM_SEM_PERMISSAO_OCUPACAO);
    expect(el().querySelector('table.grade')).toBeNull();

    serviceSpy.relatorioOcupacao.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'semana inválida' } }))
    );
    component.consultar();
    fixture.detectChanges();
    expect(texto('.alert-danger')).toContain('semana inválida');
  });
});
