import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';
import { SessaoResponseDTO } from '../../../core/models/sessao';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { SessaoService } from '../../../core/services/sessao.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { PacienteSessaoListComponent } from './paciente-sessao-list.component';

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

const mockSessaoAgendada: SessaoResponseDTO = {
  id: 1,
  pacienteId: 10,
  nomePaciente: 'Ana Silva',
  dataHora: '2026-05-10T10:00:00',
  tipo: 'PILATES',
  duracao: 60,
  profissionalId: null,
  nomeProfissional: null,
  status: 'AGENDADA',
  observacoes: null,
  dataCriacao: '2026-05-01T09:00:00',
  dataAtualizacao: null
};

const mockSessaoRealizada: SessaoResponseDTO = {
  ...mockSessaoAgendada,
  id: 2,
  status: 'REALIZADA',
  dataHora: '2026-05-03T10:00:00'
};

const mockSessaoCancelada: SessaoResponseDTO = {
  ...mockSessaoAgendada,
  id: 3,
  status: 'CANCELADA',
  dataHora: '2026-05-04T10:00:00'
};

/** Data/hora no formato aceito por `datetime-local`, deslocada em minutos a partir de agora. */
function dataHoraRelativa(minutos: number): string {
  const data = new Date(Date.now() + minutos * 60_000);
  const pad = (valor: number) => String(valor).padStart(2, '0');
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`
    + `T${pad(data.getHours())}:${pad(data.getMinutes())}`;
}

describe('PacienteSessaoListComponent', () => {
  let component: PacienteSessaoListComponent;
  let fixture: ComponentFixture<PacienteSessaoListComponent>;
  let pacienteServiceSpy: jasmine.SpyObj<PacienteService>;
  let sessaoServiceSpy: jasmine.SpyObj<SessaoService>;

  async function setup(
    sessoes: SessaoResponseDTO[] = [mockSessaoAgendada],
    pacienteId = '10'
  ) {
    pacienteServiceSpy = jasmine.createSpyObj('PacienteService', ['buscar']);
    sessaoServiceSpy = jasmine.createSpyObj('SessaoService', [
      'listarPorPaciente',
      'realizar',
      'cancelar',
      'atualizar'
    ]);

    pacienteServiceSpy.buscar.and.returnValue(of(mockPaciente));
    sessaoServiceSpy.listarPorPaciente.and.returnValue(of(sessoes));

    await TestBed.configureTestingModule({
      imports: [PacienteSessaoListComponent, RouterTestingModule],
      providers: [
        { provide: PacienteService, useValue: pacienteServiceSpy },
        { provide: SessaoService, useValue: sessaoServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ pacienteId }) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PacienteSessaoListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should create and load patient and sessions', async () => {
    await setup([mockSessaoAgendada]);

    expect(component).toBeTruthy();
    expect(pacienteServiceSpy.buscar).toHaveBeenCalledWith(10);
    expect(sessaoServiceSpy.listarPorPaciente).toHaveBeenCalledWith(10);
    expect(component.paciente).toEqual(mockPaciente);
    expect(component.sessoes).toEqual([mockSessaoAgendada]);
    expect(component.loading).toBeFalse();
    expect(component.erro).toBeNull();
  });

  it('should show empty state when no sessions exist', async () => {
    await setup([]);

    expect(component.sessoes.length).toBe(0);
    expect(component.erro).toBeNull();
  });

  it('should display multiple sessions with different statuses', async () => {
    await setup([mockSessaoAgendada, mockSessaoRealizada]);

    expect(component.sessoes.length).toBe(2);
    expect(component.sessoes[0].status).toBe('AGENDADA');
    expect(component.sessoes[1].status).toBe('REALIZADA');
  });

  it('should set erro when patient loading fails', async () => {
    await setup([]);
    pacienteServiceSpy.buscar.and.returnValue(throwError(() => new Error('fail')));

    component.carregar();

    expect(component.erro).toBe('Erro ao carregar dados do paciente.');
    expect(component.loading).toBeFalse();
  });

  it('should set erro when sessions loading fails', async () => {
    await setup([]);
    sessaoServiceSpy.listarPorPaciente.and.returnValue(throwError(() => new Error('fail')));

    component['carregarSessoes']();

    expect(component.erro).toBe('Erro ao carregar sessões.');
    expect(component.loading).toBeFalse();
  });

  it('should set erro when pacienteId is invalid', async () => {
    await setup([], 'abc');

    expect(component.erro).toBe('Identificador inválido.');
    expect(pacienteServiceSpy.buscar).not.toHaveBeenCalled();
  });

  describe('confirmarAcao and executarAcao', () => {
    beforeEach(async () => setup([mockSessaoAgendada]));

    it('should set confirmarAcaoId and acaoPendente when confirmarAcao is called', () => {
      component.confirmarAcao(1, 'realizar');

      expect(component.confirmarAcaoId).toBe(1);
      expect(component.acaoPendente).toBe('realizar');
    });

    it('should clear state when cancelarAcao is called', () => {
      component.confirmarAcao(1, 'realizar');
      component.cancelarAcao();

      expect(component.confirmarAcaoId).toBeNull();
      expect(component.acaoPendente).toBeNull();
    });

    it('should call realizar and reload sessions on success', fakeAsync(() => {
      const realizada = { ...mockSessaoAgendada, status: 'REALIZADA' as const };
      sessaoServiceSpy.realizar.and.returnValue(of(realizada));
      sessaoServiceSpy.listarPorPaciente.and.returnValue(of([realizada]));

      component.confirmarAcao(1, 'realizar');
      component.executarAcao();

      expect(sessaoServiceSpy.realizar).toHaveBeenCalledWith(1);
      expect(component.sucesso).toBe('Sessão marcada como realizada.');
      tick(4000);
      expect(component.sucesso).toBeNull();
    }));

    it('should block duplicate actions while request is pending', () => {
      const pending = new Subject<SessaoResponseDTO>();
      sessaoServiceSpy.realizar.and.returnValue(pending.asObservable());

      component.confirmarAcao(1, 'realizar');
      component.executarAcao();
      component.confirmarAcao(1, 'realizar');
      component.executarAcao();

      expect(sessaoServiceSpy.realizar).toHaveBeenCalledTimes(1);
      expect(component.acaoEmAndamentoId).toBe(1);

      pending.next({ ...mockSessaoAgendada, status: 'REALIZADA' });
      pending.complete();

      expect(component.acaoEmAndamentoId).toBeNull();
    });

    it('should call cancelar and reload sessions on success', fakeAsync(() => {
      const cancelada = { ...mockSessaoAgendada, status: 'CANCELADA' as const };
      sessaoServiceSpy.cancelar.and.returnValue(of(cancelada));
      sessaoServiceSpy.listarPorPaciente.and.returnValue(of([cancelada]));

      component.confirmarAcao(1, 'cancelar');
      component.executarAcao();

      expect(sessaoServiceSpy.cancelar).toHaveBeenCalledWith(1);
      expect(component.sucesso).toBe('Sessão cancelada com sucesso.');
      tick(4000);
    }));

    it('should set erro when realizar fails', () => {
      sessaoServiceSpy.realizar.and.returnValue(throwError(() => new Error('fail')));

      component.confirmarAcao(1, 'realizar');
      component.executarAcao();

      expect(component.erro).toBe('Erro ao realizar sessão.');
    });

    it('should set erro when cancelar fails', () => {
      sessaoServiceSpy.cancelar.and.returnValue(throwError(() => new Error('fail')));

      component.confirmarAcao(1, 'cancelar');
      component.executarAcao();

      expect(component.erro).toBe('Erro ao cancelar sessão.');
    });

    it('should not call service when executarAcao is called with no pending action', () => {
      component.executarAcao();

      expect(sessaoServiceSpy.realizar).not.toHaveBeenCalled();
      expect(sessaoServiceSpy.cancelar).not.toHaveBeenCalled();
    });
  });

  describe('reagendar', () => {
    function textosDosBotoes(): string[] {
      return Array.from(
        fixture.nativeElement.querySelectorAll('.sessao-acoes button') as NodeListOf<HTMLButtonElement>
      ).map(botao => botao.textContent?.trim() ?? '');
    }

    it('should offer Reagendar for sessions with status AGENDADA', async () => {
      await setup([mockSessaoAgendada]);

      expect(textosDosBotoes()).toContain('Reagendar');
    });

    it('should not offer Reagendar for sessions already realizada or cancelada', async () => {
      await setup([mockSessaoRealizada, mockSessaoCancelada]);

      expect(textosDosBotoes()).not.toContain('Reagendar');
    });

    it('should open the dialog prefilled with the current dataHora', async () => {
      await setup([mockSessaoAgendada]);

      component.abrirReagendar(mockSessaoAgendada);

      expect(component.reagendarId).toBe(1);
      expect(component.reagendarForm.value.dataHora).toBe(mockSessaoAgendada.dataHora);
    });

    it('should show the validation message right away when the session is already overdue', async () => {
      await setup([mockSessaoAgendada]);

      component.abrirReagendar(mockSessaoAgendada);
      fixture.detectChanges();

      expect(component.reagendarForm.get('dataHora')!.touched).toBeTrue();
      const mensagem: HTMLElement | null = fixture.nativeElement.querySelector('#reagendarDataHoraError');
      expect(mensagem?.textContent).toContain('Informe uma data e hora futura.');
    });

    it('should keep the prefilled field untouched when the session is still in the future', async () => {
      const futura = { ...mockSessaoAgendada, dataHora: dataHoraRelativa(60) };
      await setup([futura]);

      component.abrirReagendar(futura);
      fixture.detectChanges();

      expect(component.reagendarForm.get('dataHora')!.touched).toBeFalse();
      expect(fixture.nativeElement.querySelector('#reagendarDataHoraError')).toBeNull();
    });

    it('should bind min on the input to the current date and time', async () => {
      await setup([mockSessaoAgendada]);

      component.abrirReagendar(mockSessaoAgendada);
      fixture.detectChanges();

      const input: HTMLInputElement = fixture.nativeElement.querySelector('#reagendarDataHora');
      expect(input.min).toBe(component.reagendarMinDataHora);
      // O formato de `datetime-local` descarta os segundos, então o valor fica até 1 min atrás.
      expect(Date.now() - new Date(input.min).getTime()).toBeLessThan(60_000);
    });

    it('should require a future dataHora', async () => {
      await setup([mockSessaoAgendada]);
      component.abrirReagendar(mockSessaoAgendada);
      const campo = component.reagendarForm.get('dataHora')!;

      campo.setValue('');
      expect(campo.hasError('required')).toBeTrue();

      campo.setValue(dataHoraRelativa(-60));
      expect(campo.hasError('dataHoraFutura')).toBeTrue();

      campo.setValue(dataHoraRelativa(60));
      expect(campo.valid).toBeTrue();
    });

    it('should not call the service while the form is invalid', async () => {
      await setup([mockSessaoAgendada]);

      component.abrirReagendar(mockSessaoAgendada);
      component.reagendarForm.get('dataHora')!.setValue('');
      component.confirmarReagendar();

      expect(sessaoServiceSpy.atualizar).not.toHaveBeenCalled();
      expect(component.reagendarId).toBe(1);
      expect(component.reagendarForm.get('dataHora')!.touched).toBeTrue();
    });

    it('should update the session row in place on success', async () => {
      await setup([mockSessaoAgendada, mockSessaoRealizada]);
      const novaDataHora = dataHoraRelativa(60);
      const reagendada = { ...mockSessaoAgendada, dataHora: novaDataHora };
      sessaoServiceSpy.atualizar.and.returnValue(of(reagendada));
      sessaoServiceSpy.listarPorPaciente.calls.reset();

      component.abrirReagendar(mockSessaoAgendada);
      component.reagendarForm.get('dataHora')!.setValue(novaDataHora);
      component.confirmarReagendar();

      expect(sessaoServiceSpy.atualizar).toHaveBeenCalledWith(1, { dataHora: novaDataHora });
      expect(sessaoServiceSpy.listarPorPaciente).not.toHaveBeenCalled();
      expect(component.sessoes).toEqual([reagendada, mockSessaoRealizada]);
      expect(component.reagendarId).toBeNull();
      expect(component.acaoEmAndamentoId).toBeNull();
      expect(component.sucesso).toBe('Sessão reagendada com sucesso.');
    });

    it('should show a friendly message and keep the original session on error', async () => {
      await setup([mockSessaoAgendada]);
      const novaDataHora = dataHoraRelativa(60);
      sessaoServiceSpy.atualizar.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 400,
        error: { dataHora: 'Já existe sessão neste horário.' }
      })));

      component.abrirReagendar(mockSessaoAgendada);
      component.reagendarForm.get('dataHora')!.setValue(novaDataHora);
      component.confirmarReagendar();

      expect(component.erro).toBe('Já existe sessão neste horário.');
      expect(component.sessoes).toEqual([mockSessaoAgendada]);
      expect(component.reagendarId).toBeNull();
      expect(component.acaoEmAndamentoId).toBeNull();
    });

    it('should fall back to a default message when the API gives no detail', async () => {
      await setup([mockSessaoAgendada]);
      sessaoServiceSpy.atualizar.and.returnValue(throwError(() => new Error('fail')));

      component.abrirReagendar(mockSessaoAgendada);
      component.reagendarForm.get('dataHora')!.setValue(dataHoraRelativa(60));
      component.confirmarReagendar();

      expect(component.erro).toBe('Erro ao reagendar sessão.');
    });

    it('should ignore open and cancel while another action is pending', async () => {
      await setup([mockSessaoAgendada]);
      const pending = new Subject<SessaoResponseDTO>();
      sessaoServiceSpy.atualizar.and.returnValue(pending.asObservable());

      component.abrirReagendar(mockSessaoAgendada);
      component.reagendarForm.get('dataHora')!.setValue(dataHoraRelativa(60));
      component.confirmarReagendar();
      component.confirmarReagendar();
      component.cancelarReagendar();

      expect(sessaoServiceSpy.atualizar).toHaveBeenCalledTimes(1);
      expect(component.reagendarId).toBe(1);

      pending.next(mockSessaoAgendada);
      pending.complete();
    });
  });

  it('acaoLabel should return correct label for realizar', async () => {
    await setup([mockSessaoAgendada]);
    component.acaoPendente = 'realizar';
    expect(component.acaoLabel()).toBe('marcar como realizada');
  });

  it('acaoLabel should return correct label for cancelar', async () => {
    await setup([mockSessaoAgendada]);
    component.acaoPendente = 'cancelar';
    expect(component.acaoLabel()).toBe('cancelar');
  });

  // O card usava `--surface`, `--c-primary` e `--radius-lg`, que nunca foram
  // definidos em `_tokens.scss`: o fundo não era pintado, a borda de destaque da
  // sessão agendada caía para `currentColor` (faixa creme de 4px no tema escuro)
  // e o raio para `0` (issue #213). O guard trava os nomes que existem de fato.
  it('should paint the card with real tokens in both themes', async () => {
    await setup([mockSessaoAgendada]);
    document.body.appendChild(fixture.nativeElement);
    const temaAnterior = document.documentElement.getAttribute('data-theme');

    try {
      const card = (fixture.nativeElement as HTMLElement)
        .querySelector('.sessao-card.sessao-agendada') as HTMLElement;

      expect(getComputedStyle(card).borderRadius).toBe('8px');

      document.documentElement.setAttribute('data-theme', 'light');
      expect(getComputedStyle(card).backgroundColor).toBe('rgb(255, 255, 255)');
      expect(getComputedStyle(card).borderLeftColor).toBe('rgb(55, 79, 108)');

      document.documentElement.setAttribute('data-theme', 'dark');
      expect(getComputedStyle(card).backgroundColor).toBe('rgb(24, 34, 48)');
      expect(getComputedStyle(card).borderLeftColor).toBe('rgb(168, 188, 202)');
    } finally {
      if (temaAnterior === null) {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', temaAnterior);
      }
      document.body.removeChild(fixture.nativeElement);
    }
  });
});
