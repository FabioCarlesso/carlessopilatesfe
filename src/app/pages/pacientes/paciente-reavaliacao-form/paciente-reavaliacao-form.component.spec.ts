import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { ReavaliacaoResponseDTO } from '../../../core/models/reavaliacao';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { ReavaliacaoService } from '../../../core/services/reavaliacao.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { PacienteReavaliacaoFormComponent } from './paciente-reavaliacao-form.component';

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

const mockReavaliacao: ReavaliacaoResponseDTO = {
  id: 1,
  pacienteId: 10,
  nomePaciente: 'Ana Silva',
  dataReavaliacao: '2026-05-10',
  comparativoAvaliacaoAnterior: 'Melhora significativa.',
  evolucaoDor: 'Redução de 7 para 3.',
  evolucaoForca: null,
  evolucaoMobilidade: null,
  evolucaoFuncional: null,
  objetivosAlcancados: 'Redução de dor.',
  pontosAtencao: null,
  ajustesPlanoTratamento: null,
  observacoesGerais: null,
  dataCriacao: '2026-05-10T09:00:00',
  dataAtualizacao: null
};

describe('PacienteReavaliacaoFormComponent', () => {
  let component: PacienteReavaliacaoFormComponent;
  let fixture: ComponentFixture<PacienteReavaliacaoFormComponent>;
  let pacienteServiceSpy: jasmine.SpyObj<PacienteService>;
  let reavaliacaoServiceSpy: jasmine.SpyObj<ReavaliacaoService>;
  let router: Router;

  async function setup(
    params: { pacienteId: string; id?: string } = { pacienteId: '10' },
    reavaliacao: ReavaliacaoResponseDTO = mockReavaliacao,
    reavaliacaoLoadError = false
  ) {
    pacienteServiceSpy = jasmine.createSpyObj('PacienteService', ['buscar']);
    reavaliacaoServiceSpy = jasmine.createSpyObj('ReavaliacaoService', [
      'listarPorPaciente',
      'buscar',
      'criar',
      'atualizar'
    ]);

    pacienteServiceSpy.buscar.and.returnValue(of(mockPaciente));

    if (params.id && reavaliacaoLoadError) {
      reavaliacaoServiceSpy.buscar.and.returnValue(throwError(() => new Error('fail')));
    } else if (params.id) {
      reavaliacaoServiceSpy.buscar.and.returnValue(of(reavaliacao));
    }

    await TestBed.configureTestingModule({
      imports: [PacienteReavaliacaoFormComponent, RouterTestingModule],
      providers: [
        { provide: PacienteService, useValue: pacienteServiceSpy },
        { provide: ReavaliacaoService, useValue: reavaliacaoServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(params) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PacienteReavaliacaoFormComponent);
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
      expect(component.reavaliacao).toBeNull();
      expect(component.paciente).toEqual(mockPaciente);
    });

    it('should have empty form initially', () => {
      expect(component.form.get('dataReavaliacao')?.value).toBe('');
      expect(component.form.get('evolucaoDor')?.value).toBe('');
      expect(component.form.get('observacoesGerais')?.value).toBe('');
    });

    it('should not submit when dataReavaliacao is missing', () => {
      component.salvar();

      expect(reavaliacaoServiceSpy.criar).not.toHaveBeenCalled();
      expect(component.form.get('dataReavaliacao')?.touched).toBeTrue();
    });

    it('should create and navigate to list on success', () => {
      reavaliacaoServiceSpy.criar.and.returnValue(of(mockReavaliacao));
      spyOn(router, 'navigate');
      component.form.patchValue({ dataReavaliacao: '2026-05-10' });

      component.salvar();

      expect(reavaliacaoServiceSpy.criar).toHaveBeenCalledWith(jasmine.objectContaining({
        pacienteId: 10,
        dataReavaliacao: '2026-05-10'
      }));
      expect(router.navigate).toHaveBeenCalledWith(['/pacientes', 10, 'reavaliacoes']);
    });

    it('should set erro when loading fails', async () => {
      pacienteServiceSpy.buscar.and.returnValue(throwError(() => new Error('fail')));

      component.carregar();

      expect(component.erro).toBe('Erro ao carregar dados da reavaliação.');
      expect(component.loading).toBeFalse();
    });

    it('should set erro when criar fails', () => {
      reavaliacaoServiceSpy.criar.and.returnValue(throwError(() => new Error('fail')));
      component.form.patchValue({ dataReavaliacao: '2026-05-10' });

      component.salvar();

      expect(component.erro).toBe('Erro ao salvar reavaliação.');
      expect(component.salvando).toBeFalse();
    });
  });

  describe('edit mode (with id param)', () => {
    beforeEach(async () => setup({ pacienteId: '10', id: '1' }));

    it('should create component in edit mode and load existing reavaliacao', () => {
      expect(component).toBeTruthy();
      expect(component.modoEdicao).toBeTrue();
      expect(component.reavaliacao).toEqual(mockReavaliacao);
      expect(reavaliacaoServiceSpy.buscar).toHaveBeenCalledWith(1);
    });

    it('should pre-fill form with existing reavaliacao data', () => {
      expect(component.form.get('dataReavaliacao')?.value).toBe('2026-05-10');
      expect(component.form.get('comparativoAvaliacaoAnterior')?.value).toBe('Melhora significativa.');
      expect(component.form.get('evolucaoDor')?.value).toBe('Redução de 7 para 3.');
    });

    it('should call atualizar and show success message on save', fakeAsync(() => {
      const updated = { ...mockReavaliacao, observacoesGerais: 'Excelente progresso.' };
      reavaliacaoServiceSpy.atualizar.and.returnValue(of(updated));
      component.form.patchValue({ observacoesGerais: 'Excelente progresso.' });

      component.salvar();

      expect(reavaliacaoServiceSpy.atualizar).toHaveBeenCalledWith(
        1,
        jasmine.objectContaining({ dataReavaliacao: '2026-05-10' })
      );
      expect(component.sucesso).toBe('Reavaliação atualizada com sucesso.');
      expect(component.salvando).toBeFalse();
      tick(4000);
      expect(component.sucesso).toBeNull();
    }));

    it('should set erro when update fails', () => {
      reavaliacaoServiceSpy.atualizar.and.returnValue(throwError(() => new Error('fail')));

      component.salvar();

      expect(component.erro).toBe('Erro ao salvar reavaliação.');
      expect(component.salvando).toBeFalse();
    });
  });

  it('should block saving when edit reavaliacao loading fails', async () => {
    await setup({ pacienteId: '10', id: '1' }, mockReavaliacao, true);
    component.form.patchValue({ dataReavaliacao: '2026-05-10' });

    component.salvar();

    expect(component.parametroInvalido).toBeTrue();
    expect(component.erro).toBe('Identificador inválido.');
    expect(reavaliacaoServiceSpy.criar).not.toHaveBeenCalled();
    expect(reavaliacaoServiceSpy.atualizar).not.toHaveBeenCalled();
  });

  it('should reject a reavaliacao that belongs to another patient', async () => {
    await setup({ pacienteId: '10', id: '1' }, { ...mockReavaliacao, pacienteId: 99 });

    expect(component.parametroInvalido).toBeTrue();
    expect(component.erro).toBe('Reavaliação não pertence ao paciente informado.');
    expect(component.reavaliacao).toBeNull();
  });

  it('should set parametroInvalido and erro when pacienteId is invalid', async () => {
    await setup({ pacienteId: 'abc' });

    expect(component.erro).toBe('Identificador inválido.');
    expect(component.parametroInvalido).toBeTrue();
    expect(pacienteServiceSpy.buscar).not.toHaveBeenCalled();
  });

  it('should set parametroInvalido and erro when reavaliacao id is invalid', async () => {
    await setup({ pacienteId: '10', id: 'abc' });

    expect(component.erro).toBe('Identificador inválido.');
    expect(component.parametroInvalido).toBeTrue();
    expect(pacienteServiceSpy.buscar).not.toHaveBeenCalled();
    expect(reavaliacaoServiceSpy.buscar).not.toHaveBeenCalled();
  });
});
