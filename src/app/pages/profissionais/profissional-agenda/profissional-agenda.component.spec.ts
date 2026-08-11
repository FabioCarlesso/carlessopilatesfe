import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';
import { AulaResponseDTO } from '../../../core/models/plano';
import {
  ProfissionalPagamentoRelatorioDTO,
  ProfissionalResponseDTO
} from '../../../core/models/profissional';
import { SessaoResponseDTO } from '../../../core/models/sessao';
import { AulaService } from '../../../core/services/aula.service';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { SessaoService } from '../../../core/services/sessao.service';
import { isOnPush } from '../../../../testing/onpush';
import { ProfissionalAgendaComponent } from './profissional-agenda.component';

/** Quarta-feira, 20/05/2026 — o dia âncora de todos os cenários. */
const HOJE = new Date(2026, 4, 20, 9, 0);
/** Domingo da semana de `HOJE`: o início do período que a tela abre pedindo. */
const SEMANA_DE_HOJE = '2026-05-17';

const profissional: ProfissionalResponseDTO = {
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
};

function sessao(dados: Partial<SessaoResponseDTO> & { id: number; dataHora: string }): SessaoResponseDTO {
  return {
    pacienteId: 10,
    nomePaciente: 'Ana Silva',
    tipo: 'PILATES',
    duracao: 50,
    profissionalId: profissional.id,
    nomeProfissional: profissional.nome,
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
    profissionalId: profissional.id,
    profissionalNome: profissional.nome,
    ...dados
  };
}

function relatorio(totalProfissional: number, totalAulas: number): ProfissionalPagamentoRelatorioDTO {
  return {
    profissional: {
      id: profissional.id,
      nome: profissional.nome,
      cpf: profissional.cpf,
      numeroRegistro: profissional.numeroRegistro,
      tipoContrato: profissional.tipoContrato,
      percentualPagamentoAula: profissional.percentualPagamentoAula
    },
    periodo: { inicio: '2026-05-17', fim: '2026-05-23' },
    resumo: {
      totalAulas,
      quantidadePagamentos: 1,
      totalPagamentosBruto: 360,
      totalProfissional
    },
    pagamentos: [],
    aulas: [],
    geradoEm: '2026-05-20T09:00:00'
  };
}

/** Sessão de Ana na quarta, sessão cancelada de Célia na sexta, aula de Bruno na quinta. */
const sessaoDoDia = sessao({ id: 7, dataHora: '2026-05-20T14:00' });
const sessaoRealizada = sessao({ id: 9, dataHora: '2026-05-18T08:00', status: 'REALIZADA' });
const sessaoCancelada = sessao({
  id: 8,
  dataHora: '2026-05-22T09:00',
  status: 'CANCELADA',
  tipo: 'FISIOTERAPIA',
  pacienteId: 30,
  nomePaciente: 'Célia Dias'
});
const aulaPendente = aula({ id: 3, data: '2026-05-21' });
const aulaRealizada = aula({ id: 4, data: '2026-05-19', realizada: true });

describe('ProfissionalAgendaComponent', () => {
  let component: ProfissionalAgendaComponent;
  let fixture: ComponentFixture<ProfissionalAgendaComponent>;
  let profissionalServiceSpy: jasmine.SpyObj<ProfissionalService>;
  let sessaoServiceSpy: jasmine.SpyObj<SessaoService>;
  let aulaServiceSpy: jasmine.SpyObj<AulaService>;

  async function setup(opcoes: {
    id?: string;
    sessoes?: SessaoResponseDTO[];
    aulas?: AulaResponseDTO[];
    erroProfissional?: HttpErrorResponse;
    erroSessoes?: HttpErrorResponse;
    erroComissao?: HttpErrorResponse;
  } = {}) {
    profissionalServiceSpy = jasmine.createSpyObj('ProfissionalService', ['buscar', 'relatorioPagamento']);
    sessaoServiceSpy = jasmine.createSpyObj('SessaoService', ['listarPorPeriodo']);
    aulaServiceSpy = jasmine.createSpyObj('AulaService', ['listarPorPeriodo']);

    profissionalServiceSpy.buscar.and.returnValue(
      opcoes.erroProfissional ? throwError(() => opcoes.erroProfissional) : of(profissional));
    profissionalServiceSpy.relatorioPagamento.and.returnValue(
      opcoes.erroComissao ? throwError(() => opcoes.erroComissao) : of(relatorio(180, 2)));
    // Os spies respondem **por período**: fora da semana de 17/05 as listagens
    // vêm vazias. Devolver sempre a mesma carga faria os testes de navegação
    // passarem mesmo que o componente aplicasse a resposta da semana anterior.
    const sessoes = opcoes.sessoes ?? [sessaoDoDia, sessaoRealizada, sessaoCancelada];
    const aulas = opcoes.aulas ?? [aulaPendente, aulaRealizada];
    sessaoServiceSpy.listarPorPeriodo.and.callFake((inicio: string) =>
      opcoes.erroSessoes
        ? throwError(() => opcoes.erroSessoes)
        : of(inicio === SEMANA_DE_HOJE ? sessoes : []));
    aulaServiceSpy.listarPorPeriodo.and.callFake((inicio: string) =>
      of(inicio === SEMANA_DE_HOJE ? aulas : []));

    await TestBed.configureTestingModule({
      imports: [ProfissionalAgendaComponent, RouterTestingModule],
      providers: [
        { provide: ProfissionalService, useValue: profissionalServiceSpy },
        { provide: SessaoService, useValue: sessaoServiceSpy },
        { provide: AulaService, useValue: aulaServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: opcoes.id ?? '3' }) } } }
      ]
    }).compileComponents();

    // O componente resolve `hoje` na construção. O relógio é fixado apenas em
    // volta da criação — os spies devolvem `of(...)`, então a carga inteira
    // acontece de forma síncrona dentro deste trecho — e desinstalado logo em
    // seguida, para não substituir os timers do resto da suíte.
    jasmine.clock().install();
    jasmine.clock().mockDate(HOJE);
    try {
      fixture = TestBed.createComponent(ProfissionalAgendaComponent);
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

  /** Card de contador pelo rótulo, sem depender da ordem do grid. */
  function card(rotulo: string): HTMLElement | undefined {
    return todos('.summary-item').find(item => item.querySelector('.label')?.textContent?.trim() === rotulo);
  }

  function valorDoCard(rotulo: string): string {
    return card(rotulo)?.querySelector('strong')?.textContent?.trim() ?? '';
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
    expect(isOnPush(ProfissionalAgendaComponent)).toBeTrue();
  });

  // 20/05/2026 é quarta: a semana da tela vai de domingo (17) a sábado (23), e é
  // exatamente esse o período pedido à API — já recortado pelo profissional, que
  // é o que dispensa os endpoints por profissional previstos na issue.
  it('should open on the current week and request that period for the profissional', async () => {
    await setup();

    expect(profissionalServiceSpy.buscar).toHaveBeenCalledWith(3);
    expect(sessaoServiceSpy.listarPorPeriodo).toHaveBeenCalledWith('2026-05-17', '2026-05-23', 3);
    expect(aulaServiceSpy.listarPorPeriodo).toHaveBeenCalledWith('2026-05-17', '2026-05-23', 3);
    expect(profissionalServiceSpy.relatorioPagamento).toHaveBeenCalledWith(3, '2026-05-17', '2026-05-23');
    expect(texto('.calendario-titulo')).toBe('17 a 23 de maio de 2026');
    expect(texto('.page-subtitle')).toBe('Carla Fisio');
    expect(component.loading).toBeFalse();
    expect(component.erro).toBeNull();
  });

  it('should render the weekday header and one cell per day of the week', async () => {
    await setup();

    expect(todos('.calendario-coluna').map(coluna => coluna.textContent?.trim()))
      .toEqual(['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']);
    expect(todos('.calendario-celula').length).toBe(7);
  });

  // Todos os eventos são do mesmo profissional: quem identifica a linha é o
  // paciente, como na agenda do estúdio.
  it('should title each event with the patient name', async () => {
    await setup();

    expect(todos('.calendario-grade .evento-titulo').map(chip => chip.textContent?.trim()))
      .toEqual(['Ana Silva', 'Bruno Costa', 'Ana Silva', 'Bruno Costa', 'Célia Dias']);
  });

  it('should distinguish the events by origin and status', async () => {
    await setup();

    const eventos = todos('.calendario-grade .evento');
    expect(eventos[0].classList).toContain('evento-sessao');
    expect(eventos[0].classList).toContain('evento-realizada');
    expect(eventos[1].classList).toContain('evento-aula');
    expect(eventos[1].classList).toContain('evento-realizada');
    expect(eventos[4].classList).toContain('evento-sessao');
    expect(eventos[4].classList).toContain('evento-cancelada');
  });

  it('should link each event to the screen that edits it', async () => {
    await setup();

    const links = todos('.calendario-grade .evento').map(evento => evento.getAttribute('href'));
    expect(links).toContain('/pacientes/10/sessoes/9/editar');
    expect(links).toContain('/aulas/paciente/20');
  });

  // Aulas e sessões contam separado porque só a aula gera comissão.
  it('should count aulas and sessões of the period by status', async () => {
    await setup();

    expect(valorDoCard('Aulas realizadas')).toBe('1');
    expect(valorDoCard('Aulas agendadas')).toBe('1');
    expect(valorDoCard('Sessões realizadas')).toBe('1');
    expect(valorDoCard('Sessões agendadas')).toBe('1');
    expect(component.resumo)
      .toEqual({ aulasRealizadas: 1, aulasAgendadas: 1, sessoesRealizadas: 1, sessoesAgendadas: 1 });
  });

  // O valor sai do relatório de pagamento, não de uma conta local: o percentual
  // incide sobre o valor da aula, que vem do pagamento e não do DTO da aula.
  // A asserção evita o formato da moeda, que depende do `LOCALE_ID` do ambiente.
  it('should show the commission of the period with the basis used', async () => {
    await setup();

    expect(component.comissao).toEqual({ total: 180, aulas: 2 });
    expect(valorDoCard('Comissão do período')).toContain('180');
    expect(card('Comissão do período')?.querySelector('.summary-nota')?.textContent?.trim())
      .toBe('50% sobre 2 aulas realizadas');
  });

  // A comissão é um extra do cabeçalho: perdê-la não pode apagar a semana.
  it('should keep the agenda readable when the commission fails', async () => {
    await setup({ erroComissao: new HttpErrorResponse({ status: 500 }) });

    expect(component.comissaoIndisponivel).toBeTrue();
    expect(valorDoCard('Comissão do período')).toBe('—');
    expect(card('Comissão do período')?.querySelector('.summary-nota')?.textContent?.trim())
      .toBe('Valor indisponível no momento.');
    expect(component.erro).toBeNull();
    expect(todos('.calendario-grade').length).toBe(1);
    expect(todos('.alert-danger').length).toBe(0);
  });

  it('should load the next week when navigating forward', async () => {
    await setup();

    clicar('[aria-label="Próxima semana"]');

    expect(component.referencia).toBe('2026-05-27');
    expect(sessaoServiceSpy.listarPorPeriodo).toHaveBeenCalledWith('2026-05-24', '2026-05-30', 3);
    expect(aulaServiceSpy.listarPorPeriodo).toHaveBeenCalledWith('2026-05-24', '2026-05-30', 3);
    expect(profissionalServiceSpy.relatorioPagamento).toHaveBeenCalledWith(3, '2026-05-24', '2026-05-30');
    expect(texto('.calendario-titulo')).toBe('24 a 30 de maio de 2026');
    // A semana seguinte veio vazia: o que está na tela é a resposta dela, e não
    // a carga da semana anterior sobrevivendo à navegação.
    expect(todos('.calendario-grade .evento').length).toBe(0);
    expect(valorDoCard('Sessões agendadas')).toBe('0');
  });

  // O relatório de pagamento é a única requisição da tela que não trava a
  // navegação enquanto responde: a semana abandonada não pode voltar como
  // dinheiro sobre a semana que está na tela.
  it('should ignore the commission of a period the user already left', async () => {
    await setup();
    const semanaSeguinte = new Subject<ProfissionalPagamentoRelatorioDTO>();
    const semanaRetrasada = new Subject<ProfissionalPagamentoRelatorioDTO>();
    profissionalServiceSpy.relatorioPagamento.and.returnValues(
      semanaSeguinte.asObservable(),
      semanaRetrasada.asObservable()
    );

    clicar('[aria-label="Próxima semana"]');
    clicar('[aria-label="Próxima semana"]');

    // Resposta atrasada da semana que ficou para trás.
    semanaSeguinte.next(relatorio(999, 9));
    fixture.detectChanges();
    expect(component.comissao).toBeNull();
    expect(valorDoCard('Comissão do período')).toBe('—');

    semanaRetrasada.next(relatorio(180, 2));
    fixture.detectChanges();
    expect(component.comissao).toEqual({ total: 180, aulas: 2 });
  });

  it('should disable "Hoje" on the current week and re-enable it after navigating away', async () => {
    await setup();
    const hoje = () => (fixture.nativeElement as HTMLElement)
      .querySelector('.calendario-navegacao .btn-secondary') as HTMLButtonElement;

    expect(hoje().disabled).toBeTrue();

    clicar('[aria-label="Semana anterior"]');
    expect(hoje().disabled).toBeFalse();

    hoje().click();
    fixture.detectChanges();
    expect(component.referencia).toBe('2026-05-20');
    expect(hoje().disabled).toBeTrue();
  });

  it('should show an empty state when the week has no events', async () => {
    await setup({ sessoes: [], aulas: [] });

    expect(texto('.empty-state')).toContain('Nenhuma sessão ou aula neste período.');
    expect(texto('.empty-state')).toContain('Aulas aparecem aqui depois que o profissional é atribuído');
    expect(texto('.calendario-resumo')).toBe('17 a 23 de maio de 2026: nenhuma sessão ou aula no período.');
  });

  it('should announce the period and the number of events', async () => {
    await setup();

    expect(texto('.calendario-resumo')).toBe('17 a 23 de maio de 2026: 5 eventos no período.');
    expect((fixture.nativeElement as HTMLElement).querySelector('.calendario-resumo')?.getAttribute('role'))
      .toBe('status');
  });

  // `table`, e não `grid`: a ARIA APG define `grid` como widget interativo com
  // navegação por setas, que esta tela não implementa.
  it('should expose the grid as static tabular data', async () => {
    await setup();

    expect(todos('.calendario-grade')[0].getAttribute('role')).toBe('table');
    expect(todos('.calendario-grade')[0].getAttribute('aria-label')).toBe('Agenda de 17 a 23 de maio de 2026');
  });

  it('should hide the grid and show the error when the period fails to load', async () => {
    await setup({ erroSessoes: new HttpErrorResponse({ status: 500 }) });

    expect(component.erro).toBe('Não foi possível carregar a agenda do profissional.');
    expect(todos('.calendario-grade').length).toBe(0);
    expect(texto('.alert-danger')).toBe('Não foi possível carregar a agenda do profissional.');
    // Os contadores e a comissão saem junto com a grade: a comissão vem de outra
    // requisição, que pode ter respondido, e mostrar dinheiro ao lado de quatro
    // zeros seria uma contradição sobre a mesma semana.
    expect(todos('.summary-item').length).toBe(0);
  });

  it('should not request the period when the profissional is not found', async () => {
    await setup({ erroProfissional: new HttpErrorResponse({ status: 404 }) });

    expect(component.erro).toBe('Profissional não encontrado.');
    expect(sessaoServiceSpy.listarPorPeriodo).not.toHaveBeenCalled();
    expect(aulaServiceSpy.listarPorPeriodo).not.toHaveBeenCalled();
    expect(profissionalServiceSpy.relatorioPagamento).not.toHaveBeenCalled();
    expect(component.loading).toBeFalse();
  });

  it('should reject a non-numeric id before calling the API', async () => {
    await setup({ id: 'abc' });

    expect(component.erro).toBe('Identificador inválido.');
    expect(profissionalServiceSpy.buscar).not.toHaveBeenCalled();
    expect(sessaoServiceSpy.listarPorPeriodo).not.toHaveBeenCalled();
  });
});
