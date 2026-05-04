import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { PlanoTratamentoResponseDTO } from '../../../core/models/plano-tratamento';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { PlanoTratamentoService } from '../../../core/services/plano-tratamento.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { PacientePlanoTratamentoListComponent } from './paciente-plano-tratamento-list.component';

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

const mockPlanoAtivo: PlanoTratamentoResponseDTO = {
  id: 1,
  pacienteId: 10,
  nomePaciente: 'Ana Silva',
  dataInicio: '2026-05-01',
  dataPrevisaoTermino: null,
  objetivosTerapeuticos: 'Redução de dor lombar',
  frequenciaSemanal: 2,
  condutasPropostas: 'Pilates solo',
  exerciciosIndicados: 'Flexão de quadril',
  exerciciosContraindicados: null,
  equipamentosPrevistos: null,
  observacoesClinicas: null,
  status: 'ATIVO',
  dataCriacao: '2026-05-01T10:00:00',
  dataAtualizacao: null
};

const mockPlanoEncerrado: PlanoTratamentoResponseDTO = {
  ...mockPlanoAtivo,
  id: 2,
  status: 'ENCERRADO',
  dataPrevisaoTermino: '2026-04-30'
};

describe('PacientePlanoTratamentoListComponent', () => {
  let component: PacientePlanoTratamentoListComponent;
  let fixture: ComponentFixture<PacientePlanoTratamentoListComponent>;
  let pacienteServiceSpy: jasmine.SpyObj<PacienteService>;
  let planoTratamentoServiceSpy: jasmine.SpyObj<PlanoTratamentoService>;

  async function setup(
    planos: PlanoTratamentoResponseDTO[] = [mockPlanoAtivo],
    pacienteId = '10'
  ) {
    pacienteServiceSpy = jasmine.createSpyObj('PacienteService', ['buscar']);
    planoTratamentoServiceSpy = jasmine.createSpyObj('PlanoTratamentoService', [
      'listarPorPaciente',
      'encerrar',
      'suspender'
    ]);

    pacienteServiceSpy.buscar.and.returnValue(of(mockPaciente));
    planoTratamentoServiceSpy.listarPorPaciente.and.returnValue(of(planos));

    await TestBed.configureTestingModule({
      imports: [PacientePlanoTratamentoListComponent, RouterTestingModule],
      providers: [
        { provide: PacienteService, useValue: pacienteServiceSpy },
        { provide: PlanoTratamentoService, useValue: planoTratamentoServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ pacienteId }) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PacientePlanoTratamentoListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should create and load patient and plans', async () => {
    await setup([mockPlanoAtivo]);

    expect(component).toBeTruthy();
    expect(pacienteServiceSpy.buscar).toHaveBeenCalledWith(10);
    expect(planoTratamentoServiceSpy.listarPorPaciente).toHaveBeenCalledWith(10);
    expect(component.paciente).toEqual(mockPaciente);
    expect(component.planos).toEqual([mockPlanoAtivo]);
    expect(component.loading).toBeFalse();
    expect(component.erro).toBeNull();
  });

  it('should show empty state when no plans exist', async () => {
    await setup([]);

    expect(component.planos.length).toBe(0);
    expect(component.erro).toBeNull();
  });

  it('should display multiple plans including inactive ones', async () => {
    await setup([mockPlanoAtivo, mockPlanoEncerrado]);

    expect(component.planos.length).toBe(2);
    expect(component.planos[0].status).toBe('ATIVO');
    expect(component.planos[1].status).toBe('ENCERRADO');
  });

  it('should set erro when patient loading fails', async () => {
    await setup([]);
    pacienteServiceSpy.buscar.and.returnValue(throwError(() => new Error('fail')));

    component.carregar();

    expect(component.erro).toBe('Erro ao carregar dados do paciente.');
    expect(component.loading).toBeFalse();
  });

  it('should set erro when plans loading fails', async () => {
    await setup([]);
    planoTratamentoServiceSpy.listarPorPaciente.and.returnValue(throwError(() => new Error('fail')));

    component['carregarPlanos']();

    expect(component.erro).toBe('Erro ao carregar planos de tratamento.');
    expect(component.loading).toBeFalse();
  });

  it('should set parametroInvalido and erro when pacienteId is invalid', async () => {
    await setup([], 'abc');

    expect(component.erro).toBe('Identificador inválido.');
    expect(pacienteServiceSpy.buscar).not.toHaveBeenCalled();
  });

  describe('confirmarAcao and executarAcao', () => {
    beforeEach(async () => setup([mockPlanoAtivo]));

    it('should set confirmarAcaoId and acaoPendente when confirmarAcao is called', () => {
      component.confirmarAcao(1, 'encerrar');

      expect(component.confirmarAcaoId).toBe(1);
      expect(component.acaoPendente).toBe('encerrar');
    });

    it('should clear state when cancelarAcao is called', () => {
      component.confirmarAcao(1, 'encerrar');
      component.cancelarAcao();

      expect(component.confirmarAcaoId).toBeNull();
      expect(component.acaoPendente).toBeNull();
    });

    it('should call encerrar and reload plans on success', fakeAsync(() => {
      const encerrado = { ...mockPlanoAtivo, status: 'ENCERRADO' as const };
      planoTratamentoServiceSpy.encerrar.and.returnValue(of(encerrado));
      planoTratamentoServiceSpy.listarPorPaciente.and.returnValue(of([encerrado]));

      component.confirmarAcao(1, 'encerrar');
      component.executarAcao();

      expect(planoTratamentoServiceSpy.encerrar).toHaveBeenCalledWith(1);
      expect(component.sucesso).toBe('Plano de tratamento encerrado com sucesso.');
      tick(4000);
      expect(component.sucesso).toBeNull();
    }));

    it('should call suspender and reload plans on success', fakeAsync(() => {
      const suspenso = { ...mockPlanoAtivo, status: 'SUSPENSO' as const };
      planoTratamentoServiceSpy.suspender.and.returnValue(of(suspenso));
      planoTratamentoServiceSpy.listarPorPaciente.and.returnValue(of([suspenso]));

      component.confirmarAcao(1, 'suspender');
      component.executarAcao();

      expect(planoTratamentoServiceSpy.suspender).toHaveBeenCalledWith(1);
      expect(component.sucesso).toBe('Plano de tratamento suspenso com sucesso.');
      tick(4000);
    }));

    it('should set erro when encerrar fails', () => {
      planoTratamentoServiceSpy.encerrar.and.returnValue(throwError(() => new Error('fail')));

      component.confirmarAcao(1, 'encerrar');
      component.executarAcao();

      expect(component.erro).toBe('Erro ao encerrar plano de tratamento.');
    });

    it('should set erro when suspender fails', () => {
      planoTratamentoServiceSpy.suspender.and.returnValue(throwError(() => new Error('fail')));

      component.confirmarAcao(1, 'suspender');
      component.executarAcao();

      expect(component.erro).toBe('Erro ao suspender plano de tratamento.');
    });

    it('should not call service when executarAcao is called with no pending action', () => {
      component.executarAcao();

      expect(planoTratamentoServiceSpy.encerrar).not.toHaveBeenCalled();
      expect(planoTratamentoServiceSpy.suspender).not.toHaveBeenCalled();
    });
  });

  it('acaoLabel should return correct label for encerrar', async () => {
    await setup([mockPlanoAtivo]);
    component.acaoPendente = 'encerrar';
    expect(component.acaoLabel()).toBe('encerrar');
  });

  it('acaoLabel should return correct label for suspender', async () => {
    await setup([mockPlanoAtivo]);
    component.acaoPendente = 'suspender';
    expect(component.acaoLabel()).toBe('suspender');
  });
});
