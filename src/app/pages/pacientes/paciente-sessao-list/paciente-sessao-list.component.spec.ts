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
      'cancelar'
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
});
