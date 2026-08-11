import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { AulaResponseDTO } from '../../../core/models/plano';
import { ProfissionalPage, ProfissionalResponseDTO } from '../../../core/models/profissional';
import { SessaoResponseDTO } from '../../../core/models/sessao';
import { AulaService } from '../../../core/services/aula.service';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { SessaoService } from '../../../core/services/sessao.service';
import { isOnPush } from '../../../../testing/onpush';
import { AgendaComponent } from './agenda.component';

/** Quarta-feira, 20/05/2026 — o dia âncora de todos os cenários. */
const HOJE = new Date(2026, 4, 20, 9, 0);

function sessao(dados: Partial<SessaoResponseDTO> & { id: number; dataHora: string }): SessaoResponseDTO {
  return {
    pacienteId: 10,
    nomePaciente: 'Ana Silva',
    tipo: 'PILATES',
    duracao: 50,
    profissionalId: 3,
    nomeProfissional: 'Carla Fisio',
    status: 'AGENDADA',
    observacoes: null,
    dataCriacao: '2026-05-01T09:00:00',
    dataAtualizacao: null,
    ...dados
  };
}

function aula(dados: Partial<AulaResponseDTO> & { id: number; data: string }): AulaResponseDTO {
  return {
    pacienteId: 20,
    pacienteNome: 'Bruno Costa',
    pagamentoId: 1,
    realizada: false,
    profissionalId: null,
    profissionalNome: null,
    ...dados
  };
}

const profissionais: ProfissionalResponseDTO[] = [
  {
    id: 3,
    nome: 'Carla Fisio',
    email: 'carla@email.com',
    cpf: '111.111.111-11',
    telefone: null,
    numeroRegistro: null,
    tipoContrato: 'PJ',
    percentualPagamentoAula: 50,
    dataInicio: '2024-01-01',
    ativo: true
  },
  {
    id: 5,
    nome: 'Diego Pilates',
    email: 'diego@email.com',
    cpf: '222.222.222-22',
    telefone: null,
    numeroRegistro: null,
    tipoContrato: 'CLT',
    percentualPagamentoAula: 40,
    dataInicio: '2024-01-01',
    ativo: true
  }
];

const paginaProfissionais: ProfissionalPage = {
  content: profissionais,
  page: { totalElements: 2, totalPages: 1, size: 100, number: 0 }
};

/** Sessão de Ana na quarta, aula de Bruno na quinta, sessão cancelada na sexta. */
const sessaoDoDia = sessao({ id: 7, dataHora: '2026-05-20T14:00' });
const sessaoCancelada = sessao({
  id: 8,
  dataHora: '2026-05-22T09:00',
  status: 'CANCELADA',
  tipo: 'FISIOTERAPIA',
  pacienteId: 30,
  nomePaciente: 'Célia Dias',
  profissionalId: 5,
  nomeProfissional: 'Diego Pilates'
});
const aulaPendente = aula({ id: 3, data: '2026-05-21' });

describe('AgendaComponent', () => {
  let component: AgendaComponent;
  let fixture: ComponentFixture<AgendaComponent>;
  let sessaoServiceSpy: jasmine.SpyObj<SessaoService>;
  let aulaServiceSpy: jasmine.SpyObj<AulaService>;
  let profissionalServiceSpy: jasmine.SpyObj<ProfissionalService>;

  async function setup(opcoes: {
    sessoes?: SessaoResponseDTO[];
    aulas?: AulaResponseDTO[];
    erroSessoes?: HttpErrorResponse;
    erroProfissionais?: HttpErrorResponse;
  } = {}) {
    sessaoServiceSpy = jasmine.createSpyObj('SessaoService', ['listarPorPeriodo', 'realizar', 'cancelar']);
    aulaServiceSpy = jasmine.createSpyObj('AulaService', ['listarPorPeriodo', 'realizar']);
    profissionalServiceSpy = jasmine.createSpyObj('ProfissionalService', ['listar']);

    sessaoServiceSpy.listarPorPeriodo.and.returnValue(
      opcoes.erroSessoes ? throwError(() => opcoes.erroSessoes) : of(opcoes.sessoes ?? [sessaoDoDia, sessaoCancelada]));
    aulaServiceSpy.listarPorPeriodo.and.returnValue(of(opcoes.aulas ?? [aulaPendente]));
    sessaoServiceSpy.realizar.and.returnValue(of(sessao({ id: 7, dataHora: '2026-05-20T14:00', status: 'REALIZADA' })));
    sessaoServiceSpy.cancelar.and.returnValue(of(sessao({ id: 7, dataHora: '2026-05-20T14:00', status: 'CANCELADA' })));
    aulaServiceSpy.realizar.and.returnValue(of(aula({ id: 3, data: '2026-05-21', realizada: true })));
    profissionalServiceSpy.listar.and.returnValue(
      opcoes.erroProfissionais ? throwError(() => opcoes.erroProfissionais) : of(paginaProfissionais));

    await TestBed.configureTestingModule({
      imports: [AgendaComponent, RouterTestingModule],
      providers: [
        { provide: SessaoService, useValue: sessaoServiceSpy },
        { provide: AulaService, useValue: aulaServiceSpy },
        { provide: ProfissionalService, useValue: profissionalServiceSpy }
      ]
    }).compileComponents();

    // O componente resolve `hoje` na construção. O relógio é fixado apenas em
    // volta da criação — os spies devolvem `of(...)`, então a carga inteira
    // acontece de forma síncrona dentro deste trecho — e desinstalado logo em
    // seguida, para não substituir os timers do resto da suíte.
    jasmine.clock().install();
    jasmine.clock().mockDate(HOJE);
    try {
      fixture = TestBed.createComponent(AgendaComponent);
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

  /**
   * As ações são disparadas pelos botões, e não pelos métodos do componente:
   * com `OnPush`, quem marca a view suja é o próprio evento de clique — chamar
   * o método direto mudaria o estado sem que a tela fosse reavaliada, e o teste
   * passaria a medir algo que o usuário não vê.
   */
  function clicar(seletor: string): void {
    ((fixture.nativeElement as HTMLElement).querySelector(seletor) as HTMLElement).click();
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should use OnPush change detection', () => {
    expect(isOnPush(AgendaComponent)).toBeTrue();
  });

  // 20/05/2026 é quarta: a semana da tela vai de domingo (17) a sábado (23), e
  // é exatamente esse o período pedido à API.
  it('should open on the current week and request that period', async () => {
    await setup();

    expect(component.visao).toBe('semanal');
    expect(component.referencia).toBe('2026-05-20');
    expect(sessaoServiceSpy.listarPorPeriodo).toHaveBeenCalledWith('2026-05-17', '2026-05-23');
    expect(aulaServiceSpy.listarPorPeriodo).toHaveBeenCalledWith('2026-05-17', '2026-05-23');
    expect(texto('.calendario-titulo')).toBe('17 a 23 de maio de 2026');
    expect(component.loading).toBeFalse();
    expect(component.erro).toBeNull();
  });

  it('should render the weekday header and one cell per day of the week', async () => {
    await setup();

    expect(todos('.calendario-coluna').map(coluna => coluna.textContent?.trim()))
      .toEqual(['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']);
    expect(todos('.calendario-celula').length).toBe(7);
  });

  // O que a recepção procura na grade é o nome do paciente, não o tipo — que
  // se repete a tarde inteira.
  it('should title each event with the patient name', async () => {
    await setup();

    expect(todos('.calendario-grade .evento-titulo').map(chip => chip.textContent?.trim()))
      .toEqual(['Ana Silva', 'Bruno Costa', 'Célia Dias']);
  });

  it('should distinguish the events by origin and status', async () => {
    await setup();

    const eventos = todos('.calendario-grade .evento');
    expect(eventos.length).toBe(3);
    expect(eventos[0].classList).toContain('evento-sessao');
    expect(eventos[0].classList).toContain('evento-agendada');
    expect(eventos[1].classList).toContain('evento-aula');
    expect(eventos[1].classList).toContain('evento-agendada');
    expect(eventos[2].classList).toContain('evento-sessao');
    expect(eventos[2].classList).toContain('evento-cancelada');
  });

  // `table`, e não `grid`: a ARIA APG define `grid` como widget interativo com
  // navegação por setas, que esta tela não implementa.
  it('should expose the grid as static tabular data', async () => {
    await setup();

    expect(todos('.calendario-grade')[0].getAttribute('role')).toBe('table');
    expect(todos('.calendario-celula')[0].getAttribute('role')).toBe('cell');
  });

  it('should announce the period and the event count in a live region', async () => {
    await setup();

    const resumo = (fixture.nativeElement as HTMLElement).querySelector('.calendario-resumo') as HTMLElement;
    expect(resumo.getAttribute('role')).toBe('status');
    expect(resumo.textContent?.trim()).toBe('17 a 23 de maio de 2026: 3 eventos no período.');
  });

  describe('navegação e visões', () => {
    it('should fetch the next week when navigating forward', async () => {
      await setup();
      sessaoServiceSpy.listarPorPeriodo.calls.reset();

      component.navegar(1);
      fixture.detectChanges();

      expect(component.referencia).toBe('2026-05-27');
      expect(sessaoServiceSpy.listarPorPeriodo).toHaveBeenCalledWith('2026-05-24', '2026-05-30');
      expect(texto('.calendario-titulo')).toBe('24 a 30 de maio de 2026');
    });

    // Trocar de visão preserva o dia âncora e busca de novo: o período mudou de
    // tamanho, e a coleção é do período.
    it('should switch to the daily view keeping the anchor day', async () => {
      await setup();
      sessaoServiceSpy.listarPorPeriodo.calls.reset();

      component.alterarVisao('diaria');
      fixture.detectChanges();

      expect(sessaoServiceSpy.listarPorPeriodo).toHaveBeenCalledWith('2026-05-20', '2026-05-20');
      expect(texto('.calendario-titulo')).toBe('Quarta-feira, 20 de maio de 2026');
      // Sem grade de 7 colunas: um dia é uma coluna só, e vale a lista.
      expect(todos('.calendario-grade').length).toBe(0);
      expect(todos('.calendario-lista .agenda-evento').length).toBe(1);
    });

    it('should move by day in the daily view', async () => {
      await setup();
      component.alterarVisao('diaria');
      sessaoServiceSpy.listarPorPeriodo.calls.reset();

      component.navegar(1);
      fixture.detectChanges();

      expect(sessaoServiceSpy.listarPorPeriodo).toHaveBeenCalledWith('2026-05-21', '2026-05-21');
    });

    it('should disable "Hoje" while the current period is on screen', async () => {
      await setup();

      const hoje = todos('.calendario-navegacao .btn-secondary')[0] as HTMLButtonElement;
      expect(hoje.disabled).toBeTrue();

      component.navegar(1);
      fixture.detectChanges();
      expect((todos('.calendario-navegacao .btn-secondary')[0] as HTMLButtonElement).disabled).toBeFalse();
    });
  });

  describe('filtros', () => {
    it('should filter by professional without touching the API', async () => {
      await setup();
      sessaoServiceSpy.listarPorPeriodo.calls.reset();

      component.filtro.profissionalId = 5;
      component.aplicarFiltros();
      fixture.detectChanges();

      expect(sessaoServiceSpy.listarPorPeriodo).not.toHaveBeenCalled();
      expect(todos('.calendario-grade .evento-titulo').map(chip => chip.textContent?.trim()))
        .toEqual(['Célia Dias']);
    });

    // "Aula" é a origem, e não um tipo de sessão: nenhum par de parâmetros do
    // servidor expressa esse recorte, e é por isso que ele mora no cliente.
    it('should filter classes apart from the session types', async () => {
      await setup();

      component.filtro.tipo = 'AULA';
      component.aplicarFiltros();
      fixture.detectChanges();
      expect(todos('.calendario-grade .evento-titulo').map(chip => chip.textContent?.trim()))
        .toEqual(['Bruno Costa']);

      component.filtro.tipo = 'FISIOTERAPIA';
      component.aplicarFiltros();
      fixture.detectChanges();
      expect(todos('.calendario-grade .evento-titulo').map(chip => chip.textContent?.trim()))
        .toEqual(['Célia Dias']);
    });

    it('should filter by status', async () => {
      await setup();

      component.filtro.status = 'CANCELADA';
      component.aplicarFiltros();
      fixture.detectChanges();

      expect(todos('.calendario-grade .evento').length).toBe(1);
      expect(component.filtrosAtivos).toBe(1);
    });

    it('should say the empty period is a consequence of the filters', async () => {
      await setup();

      component.filtro.status = 'REALIZADA';
      component.aplicarFiltros();
      fixture.detectChanges();

      expect(texto('.empty-state')).toBe('Nenhuma sessão ou aula neste período com os filtros aplicados.');
      expect(texto('.calendario-resumo'))
        .toBe('17 a 23 de maio de 2026: nenhuma sessão ou aula no período (com filtros).');
    });

    it('should restore every event when the filters are cleared', async () => {
      await setup();
      component.filtro.status = 'CANCELADA';
      component.aplicarFiltros();

      component.limparFiltros();
      fixture.detectChanges();

      expect(component.filtrosAtivos).toBe(0);
      expect(todos('.calendario-grade .evento').length).toBe(3);
    });
  });

  describe('estados de carga', () => {
    it('should show the empty state for a period without events', async () => {
      await setup({ sessoes: [], aulas: [] });

      expect(texto('.empty-state')).toBe('Nenhuma sessão ou aula neste período.');
      expect(texto('.calendario-resumo'))
        .toBe('17 a 23 de maio de 2026: nenhuma sessão ou aula no período.');
    });

    it('should show a single error banner when the period fails to load', async () => {
      await setup({ erroSessoes: new HttpErrorResponse({ status: 500 }) });

      expect(texto('.alert-danger')).toBe('Não foi possível carregar a agenda.');
      expect(todos('.calendario-grade').length).toBe(0);
      // A barra de período continua na tela: navegar para outro período é a
      // saída natural de uma carga que falhou.
      expect(todos('.calendario-barra').length).toBe(1);
    });

    // O filtro por profissional é acessório: sem ele ainda dá para ler a agenda,
    // então a falha não acende a faixa de erro da tela.
    it('should keep the agenda readable when the professional list fails', async () => {
      await setup({ erroProfissionais: new HttpErrorResponse({ status: 500 }) });

      expect(component.profissionais).toEqual([]);
      expect(component.erro).toBeNull();
      expect(todos('.calendario-grade .evento').length).toBe(3);
    });
  });

  describe('detalhe e ações rápidas', () => {
    function abrirPrimeiroEvento(): void {
      clicar('.calendario-grade .evento');
    }

    it('should open the detail panel with the event data', async () => {
      await setup();

      abrirPrimeiroEvento();

      expect(component.eventoSelecionado?.chave).toBe('sessao-7');
      expect(texto('.detalhe-titulo')).toBe('Ana Silva');
      expect(todos('.detalhe-painel .detail-item span:not(.label)').map(item => item.textContent?.trim()))
        .toEqual(['Sessão: Pilates', '20 de maio de 2026 às 14:00', 'Agendada', 'Carla Fisio']);
    });

    it('should close the detail panel', async () => {
      await setup();
      abrirPrimeiroEvento();

      clicar('.detalhe-fechar');

      expect(component.eventoSelecionado).toBeNull();
      expect(todos('.detalhe-painel').length).toBe(0);
    });

    it('should confirm before marking a session as done and reload the period', async () => {
      await setup();
      abrirPrimeiroEvento();
      sessaoServiceSpy.listarPorPeriodo.calls.reset();

      clicar('.detalhe-acoes .btn-primary');
      expect(todos('app-confirmar-dialog').length).toBe(1);

      clicar('.dialog-actions .btn');

      expect(sessaoServiceSpy.realizar).toHaveBeenCalledWith(7);
      expect(sessaoServiceSpy.listarPorPeriodo).toHaveBeenCalledWith('2026-05-17', '2026-05-23');
      expect(component.acaoPendente).toBeNull();
      expect(texto('.alert-success')).toBe('Evento marcado como realizado.');
    });

    it('should cancel a session through the danger confirmation', async () => {
      await setup();
      abrirPrimeiroEvento();

      clicar('.detalhe-acoes .btn-danger');
      expect(component.tituloConfirmacao).toBe('Cancelar sessão');
      expect(component.mensagemConfirmacao)
        .toBe('Cancelar Sessão: Pilates de Ana Silva em 20 de maio de 2026? '
          + 'O cancelamento não pode ser desfeito pela agenda.');

      clicar('.dialog-actions .btn');

      expect(sessaoServiceSpy.cancelar).toHaveBeenCalledWith(7);
      expect(texto('.alert-success')).toBe('Sessão cancelada.');
    });

    // A aula não tem cancelamento na API: só o booleano `realizada`.
    it('should not offer cancellation for a class', async () => {
      await setup();
      clicar('.calendario-grade .evento-aula');

      expect(component.podeRealizar).toBeTrue();
      expect(component.podeCancelar).toBeFalse();
    });

    // O `PATCH /aulas/{id}/realizar` exige o profissional, e a aula pode chegar
    // sem nenhum atribuído.
    it('should require a professional before completing a class', async () => {
      await setup();
      clicar('.calendario-grade .evento-aula');

      clicar('.detalhe-acoes .btn-primary');

      expect(aulaServiceSpy.realizar).not.toHaveBeenCalled();
      expect(component.acaoPendente).toBeNull();
      expect(component.profissionalInvalido).toBeTrue();
      expect(texto('.detalhe-painel .alert-danger'))
        .toBe('Selecione um profissional para marcar a aula como realizada.');
    });

    it('should complete a class with the chosen professional', async () => {
      await setup();
      clicar('.calendario-grade .evento-aula');

      component.profissionalDaAcao = 5;
      clicar('.detalhe-acoes .btn-primary');
      clicar('.dialog-actions .btn');

      expect(aulaServiceSpy.realizar).toHaveBeenCalledWith(3, 5);
    });

    // Uma ação que falha não pode apagar da tela a agenda que continua válida.
    it('should keep the grid on screen when an action fails', async () => {
      await setup();
      sessaoServiceSpy.realizar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      abrirPrimeiroEvento();

      clicar('.detalhe-acoes .btn-primary');
      clicar('.dialog-actions .btn');

      expect(component.erroAcao).toBe('Erro ao marcar o evento como realizado.');
      expect(component.erro).toBeNull();
      expect(todos('.calendario-grade .evento').length).toBe(3);
    });
  });
});
