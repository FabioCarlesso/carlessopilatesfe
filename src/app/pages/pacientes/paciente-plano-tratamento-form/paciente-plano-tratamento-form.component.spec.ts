import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { PlanoTratamentoResponseDTO } from '../../../core/models/plano-tratamento';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { PlanoTratamentoService } from '../../../core/services/plano-tratamento.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { PacientePlanoTratamentoFormComponent } from './paciente-plano-tratamento-form.component';

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

const mockPlano: PlanoTratamentoResponseDTO = {
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

describe('PacientePlanoTratamentoFormComponent', () => {
  let component: PacientePlanoTratamentoFormComponent;
  let fixture: ComponentFixture<PacientePlanoTratamentoFormComponent>;
  let pacienteServiceSpy: jasmine.SpyObj<PacienteService>;
  let planoTratamentoServiceSpy: jasmine.SpyObj<PlanoTratamentoService>;

  async function setup(params: { pacienteId: string; id?: string } = { pacienteId: '10' }) {
    pacienteServiceSpy = jasmine.createSpyObj('PacienteService', ['buscar']);
    planoTratamentoServiceSpy = jasmine.createSpyObj('PlanoTratamentoService', [
      'listarPorPaciente',
      'buscar',
      'criar',
      'atualizar',
      'encerrar',
      'suspender'
    ]);

    pacienteServiceSpy.buscar.and.returnValue(of(mockPaciente));

    if (params.id) {
      planoTratamentoServiceSpy.buscar.and.returnValue(of(mockPlano));
    }

    await TestBed.configureTestingModule({
      imports: [PacientePlanoTratamentoFormComponent, RouterTestingModule],
      providers: [
        { provide: PacienteService, useValue: pacienteServiceSpy },
        { provide: PlanoTratamentoService, useValue: planoTratamentoServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(params) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PacientePlanoTratamentoFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  describe('create mode (no id param)', () => {
    beforeEach(async () => setup({ pacienteId: '10' }));

    it('should create component in create mode', () => {
      expect(component).toBeTruthy();
      expect(component.modoEdicao).toBeFalse();
      expect(component.plano).toBeNull();
      expect(component.paciente).toEqual(mockPaciente);
    });

    it('should have empty form initially', () => {
      expect(component.form.get('objetivosTerapeuticos')?.value).toBe('');
      expect(component.form.get('condutasPropostas')?.value).toBe('');
      expect(component.form.get('exerciciosIndicados')?.value).toBe('');
      expect(component.form.get('status')?.value).toBe('ATIVO');
    });

    it('should not submit when required fields are missing', () => {
      component.salvar();

      expect(planoTratamentoServiceSpy.criar).not.toHaveBeenCalled();
      expect(component.form.get('dataInicio')?.touched).toBeTrue();
      expect(component.form.get('objetivosTerapeuticos')?.touched).toBeTrue();
      expect(component.form.get('condutasPropostas')?.touched).toBeTrue();
      expect(component.form.get('exerciciosIndicados')?.touched).toBeTrue();
      expect(component.form.get('frequenciaSemanal')?.touched).toBeTrue();
    });

    it('should keep required text fields invalid when they contain only whitespace', () => {
      component.form.patchValue({
        dataInicio: '2026-05-01',
        objetivosTerapeuticos: '   ',
        frequenciaSemanal: 2,
        condutasPropostas: '   ',
        exerciciosIndicados: '   '
      });

      component.salvar();

      expect(planoTratamentoServiceSpy.criar).not.toHaveBeenCalled();
      expect(component.form.get('objetivosTerapeuticos')?.hasError('pattern')).toBeTrue();
      expect(component.form.get('condutasPropostas')?.hasError('pattern')).toBeTrue();
      expect(component.form.get('exerciciosIndicados')?.hasError('pattern')).toBeTrue();
    });

    it('should keep frequenciaSemanal invalid when out of range', () => {
      component.form.patchValue({
        dataInicio: '2026-05-01',
        objetivosTerapeuticos: 'Objetivo',
        frequenciaSemanal: 8,
        condutasPropostas: 'Conduta',
        exerciciosIndicados: 'Exercício'
      });

      component.salvar();

      expect(planoTratamentoServiceSpy.criar).not.toHaveBeenCalled();
      expect(component.form.get('frequenciaSemanal')?.hasError('max')).toBeTrue();
    });

    it('should set erro when loading fails', async () => {
      pacienteServiceSpy.buscar.and.returnValue(throwError(() => new Error('fail')));

      component.carregar();

      expect(component.erro).toBe('Erro ao carregar dados do plano de tratamento.');
      expect(component.loading).toBeFalse();
    });
  });

  describe('edit mode (with id param)', () => {
    beforeEach(async () => setup({ pacienteId: '10', id: '1' }));

    it('should create component in edit mode and load existing plan', () => {
      expect(component).toBeTruthy();
      expect(component.modoEdicao).toBeTrue();
      expect(component.plano).toEqual(mockPlano);
      expect(planoTratamentoServiceSpy.buscar).toHaveBeenCalledWith(1);
    });

    it('should pre-fill form with existing plan data', () => {
      expect(component.form.get('dataInicio')?.value).toBe('2026-05-01');
      expect(component.form.get('objetivosTerapeuticos')?.value).toBe('Redução de dor lombar');
      expect(component.form.get('frequenciaSemanal')?.value).toBe(2);
      expect(component.form.get('condutasPropostas')?.value).toBe('Pilates solo');
      expect(component.form.get('status')?.value).toBe('ATIVO');
    });

    it('should call atualizar with updated data on save', () => {
      const updated = { ...mockPlano, objetivosTerapeuticos: 'Fortalecimento muscular' };
      planoTratamentoServiceSpy.atualizar.and.returnValue(of(updated));
      component.form.patchValue({ objetivosTerapeuticos: 'Fortalecimento muscular' });

      component.salvar();

      expect(planoTratamentoServiceSpy.atualizar).toHaveBeenCalledWith(
        1,
        jasmine.objectContaining({
          dataInicio: '2026-05-01',
          objetivosTerapeuticos: 'Fortalecimento muscular',
          frequenciaSemanal: 2,
          condutasPropostas: 'Pilates solo',
          exerciciosIndicados: 'Flexão de quadril',
          status: 'ATIVO'
        })
      );
      expect(component.sucesso).toBe('Plano de tratamento atualizado com sucesso.');
      expect(component.salvando).toBeFalse();
    });

    it('should set erro when update fails', () => {
      planoTratamentoServiceSpy.atualizar.and.returnValue(throwError(() => new Error('fail')));

      component.salvar();

      expect(component.erro).toBe('Erro ao salvar plano de tratamento.');
      expect(component.salvando).toBeFalse();
    });
  });

  it('should set parametroInvalido and erro when pacienteId is invalid', async () => {
    await setup({ pacienteId: 'abc' });

    expect(component.erro).toBe('Identificador inválido.');
    expect(component.parametroInvalido).toBeTrue();
    expect(pacienteServiceSpy.buscar).not.toHaveBeenCalled();
  });
});
