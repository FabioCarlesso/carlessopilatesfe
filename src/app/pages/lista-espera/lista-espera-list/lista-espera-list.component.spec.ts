import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { ListaEsperaResponseDTO } from '../../../core/models/lista-espera';
import { ListaEsperaService } from '../../../core/services/lista-espera.service';
import { ListaEsperaListComponent } from './lista-espera-list.component';

/** Quarta-feira, 20/05/2026 às 09:00: fixa a próxima ocorrência de cada faixa. */
const HOJE = new Date(2026, 4, 20, 9, 0);

const ana: ListaEsperaResponseDTO = {
  id: 1,
  pacienteId: 10,
  pacienteNome: 'Ana Souza',
  diaSemana: 'WEDNESDAY',
  horaInicio: '08:00:00',
  horaFim: '09:00:00',
  dataEntrada: '2026-05-11T10:00:00',
  observacao: 'Prefere aparelho'
};

const bruno: ListaEsperaResponseDTO = {
  id: 2,
  pacienteId: 20,
  pacienteNome: 'Bruno Lima',
  diaSemana: 'FRIDAY',
  horaInicio: '19:00:00',
  horaFim: '20:00:00',
  dataEntrada: '2026-05-12T08:30:00',
  observacao: null
};

describe('ListaEsperaListComponent', () => {
  let component: ListaEsperaListComponent;
  let fixture: ComponentFixture<ListaEsperaListComponent>;
  let serviceSpy: jasmine.SpyObj<ListaEsperaService>;

  async function setup(opcoes: { fila?: ListaEsperaResponseDTO[]; erro?: HttpErrorResponse } = {}) {
    serviceSpy = jasmine.createSpyObj('ListaEsperaService', ['listar', 'excluir']);
    serviceSpy.listar.and.returnValue(
      opcoes.erro ? throwError(() => opcoes.erro) : of(opcoes.fila ?? [ana, bruno]));
    serviceSpy.excluir.and.returnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [ListaEsperaListComponent, RouterTestingModule],
      providers: [{ provide: ListaEsperaService, useValue: serviceSpy }]
    }).compileComponents();

    // A conversão em sessão resolve a próxima ocorrência do dia da semana a
    // partir do relógio.
    jasmine.clock().install();
    jasmine.clock().mockDate(HOJE);
    try {
      fixture = TestBed.createComponent(ListaEsperaListComponent);
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

  function celulas(linha: number): string[] {
    return Array.from(todos('.table tbody tr')[linha].querySelectorAll('td'))
      .map(td => td.textContent?.trim() ?? '');
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should open with the whole queue, unfiltered', async () => {
    await setup();

    expect(serviceSpy.listar).toHaveBeenCalledWith({ diaSemana: null, horaInicio: null, horaFim: null });
    expect(component.filtrada).toBeFalse();
  });

  // A ordem é a da API (`dataEntrada` crescente) e a tela não reordena: a
  // posição exibida é a da chegada.
  it('should number the rows in the order the API returned', async () => {
    await setup();

    expect(todos('.table tbody tr').length).toBe(2);
    expect(celulas(0).slice(0, 5))
      .toEqual(['1º', 'Ana Souza', 'Quarta', 'Das 08:00 às 09:00', '11/05/2026 10:00']);
    expect(celulas(1).slice(0, 3)).toEqual(['2º', 'Bruno Lima', 'Sexta']);
  });

  it('should show a dash for an entry without observation', async () => {
    await setup();

    expect(celulas(1)[5]).toBe('—');
  });

  // A inscrição vale para o dia da semana: a conversão pré-preenche a próxima
  // ocorrência dele, pulando a de hoje quando o horário já passou.
  it('should prefill the session form with the next occurrence and the slot length', async () => {
    await setup();

    expect(component.linhas[0].conversao).toEqual({ dataHora: '2026-05-27T08:00', duracao: 60 });
    expect(component.linhas[1].conversao).toEqual({ dataHora: '2026-05-22T19:00', duracao: 60 });
    expect(todos('.acoes a').length).toBe(2);
  });

  it('should send the filters to the API', async () => {
    await setup();
    serviceSpy.listar.calls.reset();

    component.filtro = { diaSemana: 'WEDNESDAY', horaInicio: '08:00', horaFim: '09:00' };
    component.carregar();

    expect(serviceSpy.listar)
      .toHaveBeenCalledWith({ diaSemana: 'WEDNESDAY', horaInicio: '08:00', horaFim: '09:00' });
    expect(component.filtrada).toBeTrue();
  });

  // A API responde 400 para meia faixa e para faixa invertida; recusar aqui
  // devolve a mensagem na hora e poupa a ida ao servidor.
  it('should reject a half-filled time range without calling the API', async () => {
    await setup();
    serviceSpy.listar.calls.reset();

    component.filtro = { diaSemana: 'todos', horaInicio: '08:00', horaFim: '' };
    component.carregar();
    fixture.detectChanges();

    expect(serviceSpy.listar).not.toHaveBeenCalled();
    expect(texto('.alert-danger')).toBe('Informe as duas pontas do horário, ou deixe as duas em branco.');
    expect(component.linhas).toEqual([]);
  });

  it('should reject an inverted time range without calling the API', async () => {
    await setup();
    serviceSpy.listar.calls.reset();

    component.filtro = { diaSemana: 'todos', horaInicio: '10:00', horaFim: '09:00' };
    component.carregar();
    fixture.detectChanges();

    expect(serviceSpy.listar).not.toHaveBeenCalled();
    expect(texto('.alert-danger')).toBe('A hora final deve ser posterior à inicial.');
  });

  it('should refetch the whole queue when the filters are cleared', async () => {
    await setup();
    component.filtro = { diaSemana: 'FRIDAY', horaInicio: '', horaFim: '' };
    component.carregar();
    serviceSpy.listar.calls.reset();

    component.limparFiltro();

    expect(component.filtro).toEqual({ diaSemana: 'todos', horaInicio: '', horaFim: '' });
    expect(serviceSpy.listar).toHaveBeenCalledWith({ diaSemana: null, horaInicio: null, horaFim: null });
    expect(component.filtrada).toBeFalse();
  });

  it('should tell an empty queue apart from an empty filtered result', async () => {
    await setup({ fila: [] });
    expect(texto('.empty-state')).toBe('Nenhum paciente na lista de espera.');

    component.filtro = { diaSemana: 'MONDAY', horaInicio: '', horaFim: '' };
    component.carregar();
    fixture.detectChanges();

    expect(texto('.empty-state')).toBe('Nenhum interessado nesse dia e faixa de horário.');
  });

  it('should show the API message when loading fails', async () => {
    await setup({ erro: new HttpErrorResponse({ status: 400, error: { erro: 'Aplique filtros' } }) });

    expect(texto('.alert-danger')).toBe('Aplique filtros');
    expect(component.loading).toBeFalse();
  });

  describe('remoção', () => {
    function clicar(seletor: string): void {
      ((fixture.nativeElement as HTMLElement).querySelector(seletor) as HTMLElement).click();
      fixture.detectChanges();
    }

    it('should ask for confirmation before removing', async () => {
      await setup();

      clicar('.table tbody tr .btn-danger');

      expect(texto('.dialog-title')).toBe('Remover da lista de espera');
      expect(texto('.dialog p')).toContain('Ana Souza — Quarta, das 08:00 às 09:00');
      expect(serviceSpy.excluir).not.toHaveBeenCalled();
    });

    // A remoção muda as posições de quem ficou; recortar a lista no cliente
    // deixaria a coluna de ordem errada.
    it('should remove and reload after confirming', async () => {
      await setup();
      clicar('.table tbody tr .btn-danger');
      serviceSpy.listar.calls.reset();

      clicar('.dialog-actions .btn-danger');

      expect(serviceSpy.excluir).toHaveBeenCalledWith(1);
      expect(serviceSpy.listar).toHaveBeenCalledTimes(1);
      expect(texto('.alert-success')).toBe('Entrada removida da lista de espera.');
      expect(component.confirmacao).toBeNull();
    });

    it('should keep the entry when the confirmation is cancelled', async () => {
      await setup();
      clicar('.table tbody tr .btn-danger');

      clicar('.dialog-actions .btn-outline');

      expect(serviceSpy.excluir).not.toHaveBeenCalled();
      expect(component.confirmacao).toBeNull();
    });

    it('should show the API message when removing fails', async () => {
      await setup();
      serviceSpy.excluir.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
      clicar('.table tbody tr .btn-danger');

      clicar('.dialog-actions .btn-danger');

      expect(texto('.alert-danger')).toBe('Erro ao remover a entrada.');
      expect(component.confirmacao).toBeNull();
      expect(component.acaoEmAndamento).toBeFalse();
    });
  });
});
