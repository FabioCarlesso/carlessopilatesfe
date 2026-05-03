import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { AvaliacaoFisioterapeuticaResponseDTO } from '../../../core/models/avaliacao-fisioterapeutica';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { AvaliacaoFisioterapeuticaService } from '../../../core/services/avaliacao-fisioterapeutica.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { PacienteAvaliacaoFisioterapeuticaComponent } from './paciente-avaliacao-fisioterapeutica.component';

const mockPaciente: PacienteResponseDTO = {
  id: 1,
  nome: 'Ana Silva',
  email: 'ana@email.com',
  cpf: '123.456.789-00',
  telefone: '(11) 99999-9999',
  dataNascimento: '1990-05-15',
  endereco: null,
  ativo: true
};

const mockAvaliacao: AvaliacaoFisioterapeuticaResponseDTO = {
  id: 5,
  pacienteId: 1,
  nomePaciente: 'Ana Silva',
  dataAvaliacao: '2026-05-03',
  queixaFuncional: 'Dor no joelho direito',
  avaliacaoPostural: 'Anteriorização de cabeça',
  mobilidadeArticular: 'Redução de amplitude',
  forcaMuscular: 'Grau 4',
  flexibilidade: null,
  equilibrio: null,
  coordenacaoMotora: null,
  padraoRespiratorio: null,
  escalaDor: 7,
  testesFuncionaisRealizados: null,
  diagnosticoFisioterapeutico: 'Gonartrose',
  observacoesGerais: null,
  dataCriacao: '2026-05-03T10:00:00',
  dataAtualizacao: null
};

describe('PacienteAvaliacaoFisioterapeuticaComponent', () => {
  let component: PacienteAvaliacaoFisioterapeuticaComponent;
  let fixture: ComponentFixture<PacienteAvaliacaoFisioterapeuticaComponent>;
  let pacienteServiceSpy: jasmine.SpyObj<PacienteService>;
  let avaliacaoServiceSpy: jasmine.SpyObj<AvaliacaoFisioterapeuticaService>;

  async function setup(
    avaliacoes: AvaliacaoFisioterapeuticaResponseDTO[] = [mockAvaliacao],
    pacienteId = '1'
  ) {
    pacienteServiceSpy = jasmine.createSpyObj('PacienteService', ['buscar']);
    avaliacaoServiceSpy = jasmine.createSpyObj('AvaliacaoFisioterapeuticaService', [
      'listarPorPaciente',
      'criar',
      'atualizar'
    ]);

    pacienteServiceSpy.buscar.and.returnValue(of(mockPaciente));
    avaliacaoServiceSpy.listarPorPaciente.and.returnValue(of(avaliacoes));

    await TestBed.configureTestingModule({
      imports: [PacienteAvaliacaoFisioterapeuticaComponent, RouterTestingModule],
      providers: [
        { provide: PacienteService, useValue: pacienteServiceSpy },
        { provide: AvaliacaoFisioterapeuticaService, useValue: avaliacaoServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ pacienteId }) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PacienteAvaliacaoFisioterapeuticaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('with existing avaliacao', () => {
    beforeEach(async () => setup([mockAvaliacao]));

    it('should create and load patient and latest avaliacao', () => {
      expect(component).toBeTruthy();
      expect(pacienteServiceSpy.buscar).toHaveBeenCalledWith(1);
      expect(avaliacaoServiceSpy.listarPorPaciente).toHaveBeenCalledWith(1);
      expect(component.paciente).toEqual(mockPaciente);
      expect(component.avaliacao).toEqual(mockAvaliacao);
      expect(component.form.get('queixaFuncional')?.value).toBe('Dor no joelho direito');
      expect(component.form.get('dataAvaliacao')?.value).toBe('2026-05-03');
      expect(component.loading).toBeFalse();
    });

    it('should update an existing avaliacao and show success message', () => {
      const updated = { ...mockAvaliacao, diagnosticoFisioterapeutico: 'Gonalgia' };
      avaliacaoServiceSpy.atualizar.and.returnValue(of(updated));
      component.form.patchValue({ diagnosticoFisioterapeutico: 'Gonalgia' });

      component.salvar();

      expect(avaliacaoServiceSpy.atualizar).toHaveBeenCalledWith(
        5,
        jasmine.objectContaining({
          dataAvaliacao: '2026-05-03',
          queixaFuncional: 'Dor no joelho direito',
          escalaDor: 7,
          diagnosticoFisioterapeutico: 'Gonalgia'
        })
      );
      expect(component.avaliacao).toEqual(updated);
      expect(component.sucesso).toBe('Avaliação fisioterapêutica atualizada com sucesso.');
      expect(component.salvando).toBeFalse();
    });

    it('should set erro when update fails', () => {
      avaliacaoServiceSpy.atualizar.and.returnValue(throwError(() => new Error('fail')));

      component.salvar();

      expect(component.erro).toBe('Erro ao salvar avaliação fisioterapêutica.');
      expect(component.salvando).toBeFalse();
    });
  });

  describe('without existing avaliacao', () => {
    beforeEach(async () => setup([]));

    it('should keep form empty when API returns an empty avaliacao list', () => {
      expect(component.paciente).toEqual(mockPaciente);
      expect(component.avaliacao).toBeNull();
      expect(component.form.get('queixaFuncional')?.value).toBe('');
      expect(component.loading).toBeFalse();
      expect(component.erro).toBeNull();
    });

    it('should create a new avaliacao and include pacienteId in payload', () => {
      avaliacaoServiceSpy.criar.and.returnValue(of(mockAvaliacao));
      component.form.patchValue({
        dataAvaliacao: '2026-05-03',
        queixaFuncional: 'Dor no joelho direito',
        escalaDor: 7,
        diagnosticoFisioterapeutico: 'Gonartrose'
      });

      component.salvar();

      expect(avaliacaoServiceSpy.criar).toHaveBeenCalledWith(
        jasmine.objectContaining({
          pacienteId: 1,
          dataAvaliacao: '2026-05-03',
          queixaFuncional: 'Dor no joelho direito',
          escalaDor: 7,
          diagnosticoFisioterapeutico: 'Gonartrose'
        })
      );
      expect(component.avaliacao).toEqual(mockAvaliacao);
      expect(component.sucesso).toBe('Avaliação fisioterapêutica cadastrada com sucesso.');
      expect(component.salvando).toBeFalse();
    });

    it('should not save when required fields are missing', () => {
      component.salvar();

      expect(avaliacaoServiceSpy.criar).not.toHaveBeenCalled();
      expect(component.form.get('dataAvaliacao')?.touched).toBeTrue();
      expect(component.form.get('queixaFuncional')?.touched).toBeTrue();
      expect(component.form.get('escalaDor')?.touched).toBeTrue();
      expect(component.form.get('diagnosticoFisioterapeutico')?.touched).toBeTrue();
    });

    it('should keep required text fields invalid when they contain only whitespace', () => {
      component.form.patchValue({
        dataAvaliacao: '2026-05-03',
        queixaFuncional: '   ',
        escalaDor: 5,
        diagnosticoFisioterapeutico: '   '
      });

      component.salvar();

      expect(avaliacaoServiceSpy.criar).not.toHaveBeenCalled();
      expect(component.form.get('queixaFuncional')?.hasError('pattern')).toBeTrue();
      expect(component.form.get('diagnosticoFisioterapeutico')?.hasError('pattern')).toBeTrue();
    });

    it('should keep escalaDor invalid when value is out of range', () => {
      component.form.patchValue({
        dataAvaliacao: '2026-05-03',
        queixaFuncional: 'Dor no joelho direito',
        escalaDor: 11,
        diagnosticoFisioterapeutico: 'Gonartrose'
      });

      component.salvar();

      expect(avaliacaoServiceSpy.criar).not.toHaveBeenCalled();
      expect(component.form.get('escalaDor')?.hasError('max')).toBeTrue();
    });
  });

  it('should not call services when pacienteId route param is invalid', async () => {
    await setup([], 'abc');

    expect(component.erro).toBe('Identificador inválido.');
    expect(component.parametroInvalido).toBeTrue();
    expect(pacienteServiceSpy.buscar).not.toHaveBeenCalled();
    expect(avaliacaoServiceSpy.listarPorPaciente).not.toHaveBeenCalled();
  });

  it('should set erro when patient loading fails', async () => {
    await setup([mockAvaliacao]);
    pacienteServiceSpy.buscar.and.returnValue(throwError(() => new Error('fail')));

    component.carregar();

    expect(component.erro).toBe('Erro ao carregar avaliação fisioterapêutica do paciente.');
    expect(component.loading).toBeFalse();
  });

  it('should set erro when listarPorPaciente fails', async () => {
    await setup([mockAvaliacao]);
    avaliacaoServiceSpy.listarPorPaciente.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500 }))
    );

    component.carregar();

    expect(component.erro).toBe('Erro ao carregar avaliação fisioterapêutica do paciente.');
    expect(component.loading).toBeFalse();
  });
});
