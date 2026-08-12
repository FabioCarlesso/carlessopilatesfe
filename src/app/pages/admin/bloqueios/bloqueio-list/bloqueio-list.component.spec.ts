import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { BloqueioAgendaResponseDTO } from '../../../../core/models/bloqueio-agenda';
import { BloqueioAgendaService } from '../../../../core/services/bloqueio-agenda.service';
import { BloqueioListComponent } from './bloqueio-list.component';

/** Quarta-feira, 20/05/2026: fixa o ano corrente que abre a tela. */
const HOJE = new Date(2026, 4, 20, 9, 0);

const natal: BloqueioAgendaResponseDTO = {
  id: 1,
  dataInicio: '2026-12-25',
  dataFim: '2026-12-25',
  horaInicio: null,
  horaFim: null,
  diaInteiro: true,
  motivo: 'Natal',
  dataCriacao: '2026-01-02T09:00:00',
  dataAtualizacao: null
};

const manutencao: BloqueioAgendaResponseDTO = {
  id: 2,
  dataInicio: '2026-06-01',
  dataFim: '2026-06-03',
  horaInicio: '08:00:00',
  horaFim: '12:00:00',
  diaInteiro: false,
  motivo: 'Manutenção dos equipamentos',
  dataCriacao: '2026-01-02T09:00:00',
  dataAtualizacao: null
};

describe('BloqueioListComponent', () => {
  let component: BloqueioListComponent;
  let fixture: ComponentFixture<BloqueioListComponent>;
  let serviceSpy: jasmine.SpyObj<BloqueioAgendaService>;

  async function setup(opcoes: { bloqueios?: BloqueioAgendaResponseDTO[]; erro?: HttpErrorResponse } = {}) {
    serviceSpy = jasmine.createSpyObj('BloqueioAgendaService', ['listarPorPeriodo', 'excluir']);
    serviceSpy.listarPorPeriodo.and.returnValue(
      opcoes.erro ? throwError(() => opcoes.erro) : of(opcoes.bloqueios ?? [manutencao, natal]));
    serviceSpy.excluir.and.returnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [BloqueioListComponent, RouterTestingModule],
      providers: [{ provide: BloqueioAgendaService, useValue: serviceSpy }]
    }).compileComponents();

    // O período padrão sai do ano corrente, resolvido na construção.
    jasmine.clock().install();
    jasmine.clock().mockDate(HOJE);
    try {
      fixture = TestBed.createComponent(BloqueioListComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    } finally {
      jasmine.clock().uninstall();
    }
  }

  function texto(seletor: string): string {
    return (fixture.nativeElement as HTMLElement).querySelector(seletor)?.textContent?.trim() ?? '';
  }

  function todos(seletor: string): HTMLElement[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll(seletor));
  }

  afterEach(() => TestBed.resetTestingModule());

  // Feriado se cadastra e se confere para o ano inteiro de uma vez; é por isso
  // que a API aceita 366 dias aqui em vez dos 92 da agenda.
  it('should open on the current year', async () => {
    await setup();

    expect(component.periodo).toEqual({ inicio: '2026-01-01', fim: '2026-12-31' });
    expect(serviceSpy.listarPorPeriodo).toHaveBeenCalledWith('2026-01-01', '2026-12-31');
  });

  it('should render period, time range and reason of each block', async () => {
    await setup();

    const linhas = todos('.table tbody tr');
    expect(linhas.length).toBe(2);
    const celulas = Array.from(linhas[0].querySelectorAll('td')).map(td => td.textContent?.trim());
    expect(celulas.slice(0, 3)).toEqual(['01/06/2026 a 03/06/2026', 'Das 08:00 às 12:00', 'Manutenção dos equipamentos']);
    expect(Array.from(linhas[1].querySelectorAll('td')).map(td => td.textContent?.trim()).slice(0, 3))
      .toEqual(['25/12/2026', 'Dia inteiro', 'Natal']);
  });

  it('should show the empty state when the period has no blocks', async () => {
    await setup({ bloqueios: [] });

    expect(texto('.empty-state')).toBe('Nenhum bloqueio cadastrado no período.');
    expect(todos('.table tbody tr').length).toBe(0);
  });

  it('should refetch when a new period is applied', async () => {
    await setup();
    serviceSpy.listarPorPeriodo.calls.reset();

    component.periodo = { inicio: '2027-01-01', fim: '2027-06-30' };
    component.carregar();

    expect(serviceSpy.listarPorPeriodo).toHaveBeenCalledWith('2027-01-01', '2027-06-30');
  });

  // A API recusaria com 400; recusar aqui devolve a mensagem na hora e poupa a
  // ida ao servidor.
  it('should reject an inverted period without calling the API', async () => {
    await setup();
    serviceSpy.listarPorPeriodo.calls.reset();

    component.periodo = { inicio: '2026-12-31', fim: '2026-01-01' };
    component.carregar();
    fixture.detectChanges();

    expect(serviceSpy.listarPorPeriodo).not.toHaveBeenCalled();
    expect(texto('.alert-danger')).toBe('O período inicial não pode ser posterior ao final.');
    expect(component.bloqueios).toEqual([]);
  });

  it('should reject a period longer than the API limit without calling it', async () => {
    await setup();
    serviceSpy.listarPorPeriodo.calls.reset();

    component.periodo = { inicio: '2026-01-01', fim: '2027-01-02' };
    component.carregar();
    fixture.detectChanges();

    expect(serviceSpy.listarPorPeriodo).not.toHaveBeenCalled();
    expect(texto('.alert-danger')).toBe('A consulta por período é limitada a 366 dias.');
  });

  // 2028 é bissexto: 366 dias inclusivos é exatamente o teto, e não pode ser
  // recusado.
  it('should accept a leap year, which is exactly the limit', async () => {
    await setup();
    serviceSpy.listarPorPeriodo.calls.reset();

    component.periodo = { inicio: '2028-01-01', fim: '2028-12-31' };
    component.carregar();

    expect(serviceSpy.listarPorPeriodo).toHaveBeenCalledWith('2028-01-01', '2028-12-31');
    expect(component.erro).toBeNull();
  });

  it('should show the API message when loading fails', async () => {
    await setup({
      erro: new HttpErrorResponse({ status: 400, error: { erro: 'Consulta por período limitada a 366 dias' } })
    });

    expect(texto('.alert-danger')).toBe('Consulta por período limitada a 366 dias');
    expect(component.loading).toBeFalse();
  });

  describe('exclusão', () => {
    function clicar(seletor: string): void {
      ((fixture.nativeElement as HTMLElement).querySelector(seletor) as HTMLElement).click();
      fixture.detectChanges();
    }

    it('should ask for confirmation before deleting', async () => {
      await setup();

      clicar('.table tbody tr .btn-danger');

      expect(texto('.dialog-title')).toBe('Excluir bloqueio');
      expect(texto('.dialog p')).toContain('Manutenção dos equipamentos');
      expect(serviceSpy.excluir).not.toHaveBeenCalled();
    });

    it('should delete and reload after confirming', async () => {
      await setup();
      clicar('.table tbody tr .btn-danger');
      serviceSpy.listarPorPeriodo.calls.reset();

      clicar('.dialog-actions .btn-danger');

      expect(serviceSpy.excluir).toHaveBeenCalledWith(2);
      expect(serviceSpy.listarPorPeriodo).toHaveBeenCalledTimes(1);
      expect(texto('.alert-success')).toBe('Bloqueio excluído com sucesso.');
      expect(component.confirmacao).toBeNull();
    });

    it('should keep the block when the confirmation is cancelled', async () => {
      await setup();
      clicar('.table tbody tr .btn-danger');

      clicar('.dialog-actions .btn-outline');

      expect(serviceSpy.excluir).not.toHaveBeenCalled();
      expect(component.confirmacao).toBeNull();
    });

    it('should show the API message when deleting fails', async () => {
      await setup();
      serviceSpy.excluir.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
      clicar('.table tbody tr .btn-danger');

      clicar('.dialog-actions .btn-danger');

      expect(texto('.alert-danger')).toBe('Erro ao excluir bloqueio.');
      expect(component.confirmacao).toBeNull();
      expect(component.acaoEmAndamento).toBeFalse();
    });
  });
});
