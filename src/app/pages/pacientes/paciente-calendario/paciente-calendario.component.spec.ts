import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { AulaResponseDTO } from '../../../core/models/plano';
import { SessaoResponseDTO } from '../../../core/models/sessao';
import { AulaService } from '../../../core/services/aula.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { SessaoService } from '../../../core/services/sessao.service';
import { isOnPush } from '../../../../testing/onpush';
import { PacienteCalendarioComponent } from './paciente-calendario.component';

/** Quarta-feira, 20/05/2026 — o dia âncora de todos os cenários. */
const HOJE = new Date(2026, 4, 20, 9, 0);

const mockPaciente: PacienteResponseDTO = {
  id: 10,
  nome: 'Ana Silva',
  email: 'ana@email.com',
  cpf: '123.456.789-00',
  telefone: '(11) 99999-9999',
  dataNascimento: '1990-05-15',
  endereco: null,
  ativo: true
};

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
    pacienteId: 10,
    pacienteNome: 'Ana Silva',
    pagamentoId: 1,
    realizada: false,
    profissionalId: null,
    profissionalNome: null,
    ...dados
  };
}

const sessaoDoDia = sessao({ id: 7, dataHora: '2026-05-20T14:00' });
const sessaoCancelada = sessao({ id: 8, dataHora: '2026-05-22T09:00', status: 'CANCELADA', tipo: 'FISIOTERAPIA' });
const aulaRealizada = aula({ id: 3, data: '2026-05-21', realizada: true, profissionalNome: 'Carla Fisio' });

describe('PacienteCalendarioComponent', () => {
  let component: PacienteCalendarioComponent;
  let fixture: ComponentFixture<PacienteCalendarioComponent>;
  let pacienteServiceSpy: jasmine.SpyObj<PacienteService>;
  let sessaoServiceSpy: jasmine.SpyObj<SessaoService>;
  let aulaServiceSpy: jasmine.SpyObj<AulaService>;

  async function setup(opcoes: {
    sessoes?: SessaoResponseDTO[];
    aulas?: AulaResponseDTO[];
    pacienteId?: string;
    erroSessoes?: HttpErrorResponse;
    erroAulas?: HttpErrorResponse;
    erroPaciente?: HttpErrorResponse;
  } = {}) {
    pacienteServiceSpy = jasmine.createSpyObj('PacienteService', ['buscar']);
    sessaoServiceSpy = jasmine.createSpyObj('SessaoService', ['listarPorPaciente']);
    aulaServiceSpy = jasmine.createSpyObj('AulaService', ['listarPorPaciente']);

    pacienteServiceSpy.buscar.and.returnValue(
      opcoes.erroPaciente ? throwError(() => opcoes.erroPaciente) : of(mockPaciente));
    sessaoServiceSpy.listarPorPaciente.and.returnValue(
      opcoes.erroSessoes ? throwError(() => opcoes.erroSessoes) : of(opcoes.sessoes ?? [sessaoDoDia, sessaoCancelada]));
    aulaServiceSpy.listarPorPaciente.and.returnValue(
      opcoes.erroAulas ? throwError(() => opcoes.erroAulas) : of(opcoes.aulas ?? [aulaRealizada]));

    await TestBed.configureTestingModule({
      imports: [PacienteCalendarioComponent, RouterTestingModule],
      providers: [
        { provide: PacienteService, useValue: pacienteServiceSpy },
        { provide: SessaoService, useValue: sessaoServiceSpy },
        { provide: AulaService, useValue: aulaServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ pacienteId: opcoes.pacienteId ?? '10' }) } }
        }
      ]
    }).compileComponents();

    // O componente resolve `hoje` na construção. O relógio é fixado apenas em
    // volta da criação — os spies devolvem `of(...)`, então a carga inteira
    // acontece de forma síncrona dentro deste trecho — e desinstalado logo em
    // seguida, para não substituir os timers do resto da suíte.
    jasmine.clock().install();
    jasmine.clock().mockDate(HOJE);
    try {
      fixture = TestBed.createComponent(PacienteCalendarioComponent);
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

  it('should use OnPush change detection', () => {
    expect(isOnPush(PacienteCalendarioComponent)).toBeTrue();
  });

  it('should load the patient, the sessions and the classes', async () => {
    await setup();

    expect(pacienteServiceSpy.buscar).toHaveBeenCalledWith(10);
    expect(sessaoServiceSpy.listarPorPaciente).toHaveBeenCalledWith(10);
    expect(aulaServiceSpy.listarPorPaciente).toHaveBeenCalledWith(10);
    expect(component.paciente).toEqual(mockPaciente);
    expect(component.loading).toBeFalse();
    expect(component.erro).toBeNull();
  });

  it('should open on the current month', async () => {
    await setup();

    expect(component.hoje).toBe('2026-05-20');
    expect(component.referencia).toBe('2026-05-20');
    expect(component.visao).toBe('mensal');
    expect(texto('.calendario-titulo')).toBe('Maio de 2026');
  });

  it('should render the weekday header and the full monthly grid', async () => {
    await setup();

    expect(todos('.calendario-coluna').map(coluna => coluna.textContent?.trim()))
      .toEqual(['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']);
    // 01/05/2026 é sexta-feira: a grade precisa de 6 linhas de 7 dias.
    expect(todos('.calendario-celula').length).toBe(42);
  });

  it('should distinguish the events by origin and status', async () => {
    await setup();

    const eventos = todos('.calendario-grade .evento');
    expect(eventos.length).toBe(3);
    expect(eventos[0].classList).toContain('evento-sessao');
    expect(eventos[0].classList).toContain('evento-agendada');
    expect(eventos[1].classList).toContain('evento-aula');
    expect(eventos[1].classList).toContain('evento-realizada');
    expect(eventos[2].classList).toContain('evento-sessao');
    expect(eventos[2].classList).toContain('evento-cancelada');
  });

  it('should link a session to its edit route and a class to the class list', async () => {
    await setup();

    const eventos = todos('.calendario-grade .evento') as HTMLAnchorElement[];
    expect(eventos[0].getAttribute('href')).toBe('/pacientes/10/sessoes/7/editar');
    expect(eventos[1].getAttribute('href')).toBe('/aulas/paciente/10');
    expect(eventos[2].getAttribute('href')).toBe('/pacientes/10/sessoes/8/editar');
  });

  // O chip mostra só hora e tipo; quem descreve o evento inteiro para o leitor
  // de tela é o `aria-label`.
  it('should describe each event in its accessible label', async () => {
    await setup();

    const [primeiro] = todos('.calendario-grade .evento');
    expect(primeiro.getAttribute('aria-label'))
      .toBe('20 de maio de 2026, Sessão: Pilates, às 14:00, agendada, com Carla Fisio');
  });

  it('should mark today on a single cell', async () => {
    await setup();

    const hoje = todos('.calendario-celula.celula-hoje');
    expect(hoje.length).toBe(1);
    expect(hoje[0].getAttribute('aria-label')).toBe('20 de maio de 2026, hoje');
  });

  it('should switch to the weekly view keeping the anchor day', async () => {
    await setup();

    component.alterarVisao('semanal');
    fixture.detectChanges();

    expect(texto('.calendario-titulo')).toBe('17 a 23 de maio de 2026');
    expect(todos('.calendario-celula').length).toBe(7);
  });

  it('should navigate by month and by week without new requests', async () => {
    await setup();

    component.navegar(1);
    fixture.detectChanges();
    expect(texto('.calendario-titulo')).toBe('Junho de 2026');

    // A troca de visão preserva o dia âncora (20/06, um sábado), então abre a
    // semana que o contém — e não a primeira do mês.
    component.alterarVisao('semanal');
    fixture.detectChanges();
    expect(texto('.calendario-titulo')).toBe('14 a 20 de junho de 2026');

    component.navegar(-1);
    fixture.detectChanges();
    expect(texto('.calendario-titulo')).toBe('7 a 13 de junho de 2026');

    // A coleção é carregada uma vez: trocar de período é recorte no cliente.
    expect(sessaoServiceSpy.listarPorPaciente).toHaveBeenCalledTimes(1);
    expect(aulaServiceSpy.listarPorPaciente).toHaveBeenCalledTimes(1);
  });

  it('should return to the current period and disable the button while already on it', async () => {
    await setup();

    expect(component.noPeriodoAtual).toBeTrue();

    component.navegar(1);
    fixture.detectChanges();
    expect(component.noPeriodoAtual).toBeFalse();

    component.irParaHoje();
    fixture.detectChanges();
    expect(component.referencia).toBe('2026-05-20');
    expect(texto('.calendario-titulo')).toBe('Maio de 2026');
  });

  it('should announce the period and the event count in a live region', async () => {
    await setup();

    const resumo = todos('.calendario-resumo')[0];
    expect(resumo.getAttribute('role')).toBe('status');
    expect(resumo.textContent?.trim()).toBe('Maio de 2026: 3 eventos no período.');

    component.navegar(1);
    fixture.detectChanges();
    expect(texto('.calendario-resumo')).toBe('Junho de 2026: nenhuma sessão ou aula no período.');
  });

  // A agenda é o que substitui a grade no mobile: lista só os dias com evento.
  it('should list only the days with events in the agenda', async () => {
    await setup();

    expect(component.diasComEventos.map(dia => dia.dia))
      .toEqual(['2026-05-20', '2026-05-21', '2026-05-22']);
    expect(todos('.agenda-dia').length).toBe(3);
    expect(todos('.agenda-dia')[0].querySelector('.agenda-data')?.textContent)
      .toContain('20 de maio de 2026');
  });

  it('should show the empty state when the period has no events', async () => {
    await setup({ sessoes: [], aulas: [] });

    expect(component.grade.totalEventos).toBe(0);
    expect(texto('.empty-state')).toBe('Nenhuma sessão ou aula neste período.');
  });

  // O paciente já foi carregado antes do `forkJoin`, então 404 nas duas
  // listagens só pode significar "sem registros" — é o que a API devolve para
  // paciente inativo (issue #203) e para paciente sem plano gerado.
  it('should treat 404 on both listings as empty collections', async () => {
    await setup({
      erroSessoes: new HttpErrorResponse({ status: 404 }),
      erroAulas: new HttpErrorResponse({ status: 404 })
    });

    expect(component.erro).toBeNull();
    expect(component.eventos).toEqual([]);
    expect(texto('.empty-state')).toBe('Nenhuma sessão ou aula neste período.');
  });

  it('should show the error banner for other statuses', async () => {
    await setup({ erroSessoes: new HttpErrorResponse({ status: 500 }) });

    expect(component.erro).toBe('Não foi possível carregar o calendário.');
    expect(component.loading).toBeFalse();
    expect(texto('.alert-danger')).toBe('Não foi possível carregar o calendário.');
  });

  it('should report a failure loading the patient without listing anything', async () => {
    await setup({ erroPaciente: new HttpErrorResponse({ status: 500 }) });

    expect(component.erro).toBe('Erro ao carregar dados do paciente.');
    expect(sessaoServiceSpy.listarPorPaciente).not.toHaveBeenCalled();
    expect(aulaServiceSpy.listarPorPaciente).not.toHaveBeenCalled();
  });

  it('should reject an invalid route parameter before calling the API', async () => {
    await setup({ pacienteId: 'abc' });

    expect(component.erro).toBe('Identificador inválido.');
    expect(pacienteServiceSpy.buscar).not.toHaveBeenCalled();
    expect(sessaoServiceSpy.listarPorPaciente).not.toHaveBeenCalled();
  });
});
