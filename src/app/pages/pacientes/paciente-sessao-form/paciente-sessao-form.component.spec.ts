import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { SessaoResponseDTO } from '../../../core/models/sessao';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { SessaoService } from '../../../core/services/sessao.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { PacienteSessaoFormComponent } from './paciente-sessao-form.component';

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

const mockSessao: SessaoResponseDTO = {
  id: 1,
  pacienteId: 10,
  nomePaciente: 'Ana Silva',
  dataHora: '2026-05-10T10:00',
  tipo: 'PILATES',
  duracao: 60,
  profissionalId: null,
  nomeProfissional: null,
  status: 'AGENDADA',
  observacoes: null,
  dataCriacao: '2026-05-01T09:00:00',
  dataAtualizacao: null
};

describe('PacienteSessaoFormComponent', () => {
  let component: PacienteSessaoFormComponent;
  let fixture: ComponentFixture<PacienteSessaoFormComponent>;
  let pacienteServiceSpy: jasmine.SpyObj<PacienteService>;
  let sessaoServiceSpy: jasmine.SpyObj<SessaoService>;
  let router: Router;

  async function setup(
    params: { pacienteId: string; id?: string } = { pacienteId: '10' },
    sessao: SessaoResponseDTO = mockSessao
  ) {
    pacienteServiceSpy = jasmine.createSpyObj('PacienteService', ['buscar']);
    sessaoServiceSpy = jasmine.createSpyObj('SessaoService', [
      'listarPorPaciente',
      'buscar',
      'criar',
      'atualizar',
      'realizar',
      'cancelar'
    ]);

    pacienteServiceSpy.buscar.and.returnValue(of(mockPaciente));

    if (params.id) {
      sessaoServiceSpy.buscar.and.returnValue(of(sessao));
    }

    await TestBed.configureTestingModule({
      imports: [PacienteSessaoFormComponent, RouterTestingModule],
      providers: [
        { provide: PacienteService, useValue: pacienteServiceSpy },
        { provide: SessaoService, useValue: sessaoServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(params) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PacienteSessaoFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  describe('create mode (no id param)', () => {
    beforeEach(async () => setup({ pacienteId: '10' }));

    it('should create component in create mode', () => {
      expect(component).toBeTruthy();
      expect(component.modoEdicao).toBeFalse();
      expect(component.sessao).toBeNull();
      expect(component.paciente).toEqual(mockPaciente);
    });

    it('should have default values in form', () => {
      expect(component.form.get('tipo')?.value).toBe('PILATES');
      expect(component.form.get('status')?.value).toBe('AGENDADA');
      expect(component.form.get('dataHora')?.value).toBe('');
    });

    it('should not submit when required fields are missing', () => {
      component.salvar();

      expect(sessaoServiceSpy.criar).not.toHaveBeenCalled();
      expect(component.form.get('dataHora')?.touched).toBeTrue();
      expect(component.form.get('duracao')?.touched).toBeTrue();
    });

    it('should keep duracao invalid when out of range', () => {
      component.form.patchValue({
        dataHora: '2026-05-10T10:00',
        tipo: 'PILATES',
        duracao: 500
      });

      component.salvar();

      expect(sessaoServiceSpy.criar).not.toHaveBeenCalled();
      expect(component.form.get('duracao')?.hasError('max')).toBeTrue();
    });

    it('should create without sending status in request body', () => {
      sessaoServiceSpy.criar.and.returnValue(of(mockSessao));
      spyOn(router, 'navigate');
      component.form.patchValue({
        dataHora: '2026-05-10T10:00',
        tipo: 'PILATES',
        duracao: 60,
        status: 'CANCELADA'
      });

      component.salvar();

      expect(sessaoServiceSpy.criar).toHaveBeenCalledWith(jasmine.objectContaining({
        pacienteId: 10,
        dataHora: '2026-05-10T10:00',
        tipo: 'PILATES',
        duracao: 60
      }));
      const dto = sessaoServiceSpy.criar.calls.mostRecent().args[0] as unknown as Record<string, unknown>;
      expect(dto['status']).toBeUndefined();
    });

    it('should navigate to sessoes list after successful create', () => {
      sessaoServiceSpy.criar.and.returnValue(of(mockSessao));
      const navigateSpy = spyOn(router, 'navigate');
      component.form.patchValue({
        dataHora: '2026-05-10T10:00',
        tipo: 'PILATES',
        duracao: 60
      });

      component.salvar();

      expect(navigateSpy).toHaveBeenCalledWith(['/pacientes', 10, 'sessoes']);
    });

    it('should set erro when loading fails', async () => {
      pacienteServiceSpy.buscar.and.returnValue(throwError(() => new Error('fail')));

      component.carregar();

      expect(component.erro).toBe('Erro ao carregar dados da sessão.');
      expect(component.loading).toBeFalse();
    });
  });

  describe('edit mode (with id param)', () => {
    beforeEach(async () => setup({ pacienteId: '10', id: '1' }));

    it('should create component in edit mode and load existing session', () => {
      expect(component).toBeTruthy();
      expect(component.modoEdicao).toBeTrue();
      expect(component.sessao).toEqual(mockSessao);
      expect(sessaoServiceSpy.buscar).toHaveBeenCalledWith(1);
    });

    it('should pre-fill form with existing session data', () => {
      expect(component.form.get('dataHora')?.value).toBe('2026-05-10T10:00');
      expect(component.form.get('tipo')?.value).toBe('PILATES');
      expect(component.form.get('duracao')?.value).toBe(60);
      expect(component.form.get('status')?.value).toBe('AGENDADA');
    });

    it('should call atualizar with updated data on save', () => {
      const updated = { ...mockSessao, duracao: 45 };
      sessaoServiceSpy.atualizar.and.returnValue(of(updated));
      component.form.patchValue({ duracao: 45 });

      component.salvar();

      expect(sessaoServiceSpy.atualizar).toHaveBeenCalledWith(
        1,
        jasmine.objectContaining({
          dataHora: '2026-05-10T10:00',
          tipo: 'PILATES',
          duracao: 45,
          status: 'AGENDADA'
        })
      );
      expect(component.sucesso).toBe('Sessão atualizada com sucesso.');
      expect(component.salvando).toBeFalse();
    });

    it('should set erro when update fails', () => {
      sessaoServiceSpy.atualizar.and.returnValue(throwError(() => new Error('fail')));

      component.salvar();

      expect(component.erro).toBe('Erro ao salvar sessão.');
      expect(component.salvando).toBeFalse();
    });
  });

  it('should reject a session that belongs to another patient', async () => {
    await setup({ pacienteId: '10', id: '1' }, { ...mockSessao, pacienteId: 99 });

    expect(component.parametroInvalido).toBeTrue();
    expect(component.erro).toBe('Sessão não pertence ao paciente informado.');
    expect(component.sessao).toBeNull();
  });

  it('should set parametroInvalido and erro when pacienteId is invalid', async () => {
    await setup({ pacienteId: 'abc' });

    expect(component.erro).toBe('Identificador inválido.');
    expect(component.parametroInvalido).toBeTrue();
    expect(pacienteServiceSpy.buscar).not.toHaveBeenCalled();
  });

  it('should set parametroInvalido and erro when sessao id is invalid', async () => {
    await setup({ pacienteId: '10', id: 'abc' });

    expect(component.erro).toBe('Identificador inválido.');
    expect(component.parametroInvalido).toBeTrue();
    expect(pacienteServiceSpy.buscar).not.toHaveBeenCalled();
    expect(sessaoServiceSpy.buscar).not.toHaveBeenCalled();
  });
});
