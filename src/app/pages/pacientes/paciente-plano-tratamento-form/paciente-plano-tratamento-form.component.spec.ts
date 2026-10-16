import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { PlanoTratamentoResponseDTO } from '../../../core/models/plano-tratamento';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { PlanoTratamentoService } from '../../../core/services/plano-tratamento.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { PacientePlanoTratamentoFormComponent } from './paciente-plano-tratamento-form.component';
import { MENSAGEM_CONFLITO_CONCORRENCIA } from '../../../shared/utils/api-error';
import { conflitoConcorrencia } from '../../../../testing/conflito';

const mockPaciente: PacienteResponseDTO = {
  version: 0,
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
  version: 0,
  id: 1,
  pacienteId: 10,
  nomePaciente: 'Ana Silva',
  dataInicio: '2026-05-01',
  dataFimPrevista: null,
  objetivosTratamento: 'Redução de dor lombar',
  intervencoesPlanejadas: 'Pilates solo',
  numeroSessoesPrevistas: 24,
  frequenciaSessoes: '2x por semana',
  responsavelTratamento: null,
  observacoes: null,
  dataCriacao: '2026-05-01T10:00:00',
  dataAtualizacao: null
};

describe('PacientePlanoTratamentoFormComponent', () => {
  let component: PacientePlanoTratamentoFormComponent;
  let fixture: ComponentFixture<PacientePlanoTratamentoFormComponent>;
  let pacienteServiceSpy: jasmine.SpyObj<PacienteService>;
  let planoTratamentoServiceSpy: jasmine.SpyObj<PlanoTratamentoService>;
  let router: Router;

  async function setup(
    params: { pacienteId: string; id?: string } = { pacienteId: '10' },
    plano: PlanoTratamentoResponseDTO = mockPlano
  ) {
    pacienteServiceSpy = jasmine.createSpyObj('PacienteService', ['buscar']);
    planoTratamentoServiceSpy = jasmine.createSpyObj('PlanoTratamentoService', [
      'listarPorPaciente',
      'buscar',
      'criar',
      'atualizar'
    ]);

    pacienteServiceSpy.buscar.and.returnValue(of(mockPaciente));

    if (params.id) {
      planoTratamentoServiceSpy.buscar.and.returnValue(of(plano));
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
    router = TestBed.inject(Router);
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
      expect(component.form.get('objetivosTratamento')?.value).toBe('');
      expect(component.form.get('intervencoesPlanejadas')?.value).toBe('');
      expect(component.form.get('numeroSessoesPrevistas')?.value).toBeNull();
      expect(component.form.get('frequenciaSessoes')?.value).toBe('');
    });

    it('should require only dataInicio and objetivosTratamento', () => {
      component.salvar();

      expect(planoTratamentoServiceSpy.criar).not.toHaveBeenCalled();
      expect(component.form.get('dataInicio')?.hasError('required')).toBeTrue();
      expect(component.form.get('objetivosTratamento')?.hasError('required')).toBeTrue();
      expect(component.form.get('objetivosTratamento')?.touched).toBeTrue();
      for (const opcional of ['dataFimPrevista', 'intervencoesPlanejadas', 'numeroSessoesPrevistas',
        'frequenciaSessoes', 'responsavelTratamento', 'observacoes']) {
        expect(component.form.get(opcional)?.valid).withContext(opcional).toBeTrue();
      }
    });

    it('should keep objetivosTratamento invalid when it contains only whitespace', () => {
      component.form.patchValue({ dataInicio: '2026-05-01', objetivosTratamento: '   ' });

      component.salvar();

      expect(planoTratamentoServiceSpy.criar).not.toHaveBeenCalled();
      expect(component.form.get('objetivosTratamento')?.hasError('pattern')).toBeTrue();
    });

    it('should reject numeroSessoesPrevistas that is not a positive integer', () => {
      const campo = component.form.get('numeroSessoesPrevistas');

      campo?.setValue(0);
      expect(campo?.hasError('min')).toBeTrue();
      campo?.setValue(2.5);
      expect(campo?.hasError('pattern')).toBeTrue();
      campo?.setValue(12);
      expect(campo?.valid).toBeTrue();
    });

    it('should reject dataFimPrevista before dataInicio and revalidate when dataInicio changes', () => {
      component.form.patchValue({ dataInicio: '2026-05-01', dataFimPrevista: '2026-04-30', objetivosTratamento: 'Objetivo' });

      component.salvar();

      expect(planoTratamentoServiceSpy.criar).not.toHaveBeenCalled();
      expect(component.form.get('dataFimPrevista')?.hasError('periodoInvertido')).toBeTrue();

      component.form.get('dataInicio')?.setValue('2026-04-01');
      expect(component.form.get('dataFimPrevista')?.valid).toBeTrue();
    });

    it('should POST the API field names, with blank optionals as null', () => {
      planoTratamentoServiceSpy.criar.and.returnValue(of(mockPlano));
      spyOn(router, 'navigate');
      component.form.patchValue({
        dataInicio: '2026-05-01',
        objetivosTratamento: 'Objetivo',
        intervencoesPlanejadas: '  Pilates solo  ',
        numeroSessoesPrevistas: '24',
        frequenciaSessoes: '2x por semana',
        responsavelTratamento: '   '
      });

      component.salvar();

      expect(planoTratamentoServiceSpy.criar).toHaveBeenCalledWith({
        pacienteId: 10,
        dataInicio: '2026-05-01',
        dataFimPrevista: null,
        objetivosTratamento: 'Objetivo',
        intervencoesPlanejadas: 'Pilates solo',
        numeroSessoesPrevistas: 24,
        frequenciaSessoes: '2x por semana',
        responsavelTratamento: null,
        observacoes: null
      });
      expect(router.navigate).toHaveBeenCalledWith(['/pacientes', 10, 'plano-tratamento']);
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

    it('should pre-fill form with existing plan data and start valid', () => {
      expect(component.form.get('dataInicio')?.value).toBe('2026-05-01');
      expect(component.form.get('dataFimPrevista')?.value).toBe('');
      expect(component.form.get('objetivosTratamento')?.value).toBe('Redução de dor lombar');
      expect(component.form.get('intervencoesPlanejadas')?.value).toBe('Pilates solo');
      expect(component.form.get('numeroSessoesPrevistas')?.value).toBe(24);
      expect(component.form.get('frequenciaSessoes')?.value).toBe('2x por semana');
      expect(component.form.get('responsavelTratamento')?.value).toBe('');
      expect(component.form.valid).toBeTrue();
    });

    it('should call atualizar with updated data on save', () => {
      const updated = { ...mockPlano, objetivosTratamento: 'Fortalecimento muscular', version: 1 };
      planoTratamentoServiceSpy.atualizar.and.returnValue(of(updated));
      component.form.patchValue({ objetivosTratamento: 'Fortalecimento muscular' });

      component.salvar();

      expect(planoTratamentoServiceSpy.atualizar).toHaveBeenCalledWith(1, {
        dataInicio: '2026-05-01',
        dataFimPrevista: null,
        objetivosTratamento: 'Fortalecimento muscular',
        intervencoesPlanejadas: 'Pilates solo',
        numeroSessoesPrevistas: 24,
        frequenciaSessoes: '2x por semana',
        responsavelTratamento: null,
        observacoes: null,
        version: 0
      });
      expect(component.plano).toEqual(updated);
      expect(component.sucesso).toBe('Plano de tratamento atualizado com sucesso.');
      expect(component.salvando).toBeFalse();
    });

    it('should send the loaded version and explain the concurrent-modification conflict', () => {
      planoTratamentoServiceSpy.atualizar.and.returnValue(throwError(() => conflitoConcorrencia()));

      component.salvar();

      expect(planoTratamentoServiceSpy.atualizar).toHaveBeenCalledWith(jasmine.any(Number), jasmine.objectContaining({ version: 0 }));
      expect(component.erro).toBe(MENSAGEM_CONFLITO_CONCORRENCIA);
      expect(component.salvando).toBeFalse();
    });

    // O `PUT` da API ignora `null`: sem o `""`, o texto apagado voltava junto com o sucesso.
    it('should send "" to clear a saved text field and keep null for fields that were already empty', () => {
      planoTratamentoServiceSpy.atualizar.and.returnValue(of({ ...mockPlano, intervencoesPlanejadas: '' }));
      component.form.patchValue({ intervencoesPlanejadas: '   ' });

      component.salvar();

      const dto = planoTratamentoServiceSpy.atualizar.calls.mostRecent().args[1];
      expect(dto.intervencoesPlanejadas).toBe('');
      expect(dto.responsavelTratamento).toBeNull();
      expect(dto.observacoes).toBeNull();
    });

    it('should not let a saved numeroSessoesPrevistas be removed, since the API ignores null', () => {
      component.form.patchValue({ numeroSessoesPrevistas: null });

      component.salvar();

      expect(planoTratamentoServiceSpy.atualizar).not.toHaveBeenCalled();
      expect(component.form.get('numeroSessoesPrevistas')?.hasError('naoRemovivel')).toBeTrue();
    });

    it('should show the API detail when the update is rejected with 400', () => {
      planoTratamentoServiceSpy.atualizar.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 400,
        error: { type: 'https://carlessopilates.com.br/problemas/bad-request', detail: 'Mensagem da API.' }
      })));

      component.salvar();

      expect(component.erro).toBe('Mensagem da API.');
    });

    it('should set erro when update fails', () => {
      planoTratamentoServiceSpy.atualizar.and.returnValue(throwError(() => new Error('fail')));

      component.salvar();

      expect(component.erro).toBe('Erro ao salvar plano de tratamento.');
      expect(component.salvando).toBeFalse();
    });
  });

  it('should not let a saved dataFimPrevista be removed, but allow it while it was never saved', async () => {
    await setup({ pacienteId: '10', id: '1' }, { ...mockPlano, dataFimPrevista: '2026-08-01' });
    const campo = component.form.get('dataFimPrevista');
    expect(campo?.value).toBe('2026-08-01');

    campo?.setValue('');
    expect(campo?.hasError('naoRemovivel')).toBeTrue();
    campo?.setValue('2026-09-01');
    expect(campo?.valid).toBeTrue();
  });

  it('should reject a plan that belongs to another patient', async () => {
    await setup({ pacienteId: '10', id: '1' }, { ...mockPlano, pacienteId: 99 });

    expect(component.parametroInvalido).toBeTrue();
    expect(component.erro).toBe('Plano de tratamento não pertence ao paciente informado.');
    expect(component.plano).toBeNull();
  });

  it('should set parametroInvalido and erro when pacienteId is invalid', async () => {
    await setup({ pacienteId: 'abc' });

    expect(component.erro).toBe('Identificador inválido.');
    expect(component.parametroInvalido).toBeTrue();
    expect(pacienteServiceSpy.buscar).not.toHaveBeenCalled();
  });

  it('should set parametroInvalido and erro when plano id is invalid', async () => {
    await setup({ pacienteId: '10', id: 'abc' });

    expect(component.erro).toBe('Identificador inválido.');
    expect(component.parametroInvalido).toBeTrue();
    expect(pacienteServiceSpy.buscar).not.toHaveBeenCalled();
    expect(planoTratamentoServiceSpy.buscar).not.toHaveBeenCalled();
  });
});
