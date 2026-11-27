import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { AnamneseResponseDTO } from '../../../core/models/anamnese';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { AnamneseService } from '../../../core/services/anamnese.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { PacienteAnamneseComponent } from './paciente-anamnese.component';

const mockPaciente: PacienteResponseDTO = {
  version: 0,
  id: 1,
  nome: 'Ana Silva',
  email: 'ana@email.com',
  cpf: '123.456.789-00',
  telefone: '(11) 99999-9999',
  dataNascimento: '1990-05-15',
  endereco: null,
  ativo: true,
  cpfNaNota: false,
  tomadorId: null,
  tomadorNome: null,
  tomadorCpfCnpj: null
};

const mockAnamnese: AnamneseResponseDTO = {
  version: 0,
  id: 10,
  pacienteId: 1,
  nomePaciente: 'Ana Silva',
  queixaPrincipal: 'Dor lombar',
  historicoDoencas: 'Hipertensão',
  historicoCirurgias: null,
  historicoLesoes: null,
  medicamentosUso: 'Losartana',
  alergias: null,
  nivelAtividadeFisica: 'Leve',
  restricoesMedicas: 'Evitar impacto',
  objetivos: 'Fortalecimento',
  observacoes: null,
  dataCriacao: '2026-05-03T10:00:00',
  dataAtualizacao: null
};

describe('PacienteAnamneseComponent', () => {
  let component: PacienteAnamneseComponent;
  let fixture: ComponentFixture<PacienteAnamneseComponent>;
  let pacienteServiceSpy: jasmine.SpyObj<PacienteService>;
  let anamneseServiceSpy: jasmine.SpyObj<AnamneseService>;

  async function setup(anamnese: AnamneseResponseDTO | null = mockAnamnese, pacienteId = '1') {
    pacienteServiceSpy = jasmine.createSpyObj('PacienteService', ['buscar']);
    anamneseServiceSpy = jasmine.createSpyObj('AnamneseService', ['buscarPorPaciente', 'criar', 'atualizar']);

    pacienteServiceSpy.buscar.and.returnValue(of(mockPaciente));
    anamneseServiceSpy.buscarPorPaciente.and.returnValue(
      anamnese === null
        ? throwError(() => new HttpErrorResponse({ status: 404 }))
        : of(anamnese)
    );

    await TestBed.configureTestingModule({
      imports: [PacienteAnamneseComponent, RouterTestingModule],
      providers: [
        { provide: PacienteService, useValue: pacienteServiceSpy },
        { provide: AnamneseService, useValue: anamneseServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ pacienteId }) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PacienteAnamneseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('with existing anamnese', () => {
    beforeEach(async () => setup(mockAnamnese));

    it('should create and load patient and anamnese', () => {
      expect(component).toBeTruthy();
      expect(pacienteServiceSpy.buscar).toHaveBeenCalledWith(1);
      expect(anamneseServiceSpy.buscarPorPaciente).toHaveBeenCalledWith(1);
      expect(component.paciente).toEqual(mockPaciente);
      expect(component.anamnese).toEqual(mockAnamnese);
      expect(component.form.get('queixaPrincipal')?.value).toBe('Dor lombar');
      expect(component.loading).toBeFalse();
    });

    it('should update an existing anamnese and show success message', () => {
      const updated = { ...mockAnamnese, objetivos: 'Mobilidade' };
      anamneseServiceSpy.atualizar.and.returnValue(of(updated));
      component.form.patchValue({ objetivos: 'Mobilidade' });

      component.salvar();

      expect(anamneseServiceSpy.atualizar).toHaveBeenCalledWith(
        10,
        jasmine.objectContaining({ queixaPrincipal: 'Dor lombar', objetivos: 'Mobilidade' })
      );
      expect(component.anamnese).toEqual(updated);
      expect(component.sucesso).toBe('Anamnese atualizada com sucesso.');
      expect(component.salvando).toBeFalse();
    });

    it('should send the version of the loaded anamnese and keep the one returned by the API', () => {
      const updated = { ...mockAnamnese, objetivos: 'Mobilidade', version: 1 };
      anamneseServiceSpy.atualizar.and.returnValue(of(updated));

      component.salvar();

      expect(anamneseServiceSpy.atualizar).toHaveBeenCalledWith(10, jasmine.objectContaining({ version: 0 }));
      expect(component.anamnese?.version).toBe(1);
    });

    it('should explain the concurrent-modification conflict', () => {
      anamneseServiceSpy.atualizar.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 409,
        error: { type: 'https://carlessopilates.com.br/problemas/concurrent-modification' }
      })));

      component.salvar();

      expect(component.erro).toContain('alterado por outra pessoa');
      expect(component.salvando).toBeFalse();
    });

    it('should set erro when update fails', () => {
      anamneseServiceSpy.atualizar.and.returnValue(throwError(() => new Error('fail')));

      component.salvar();

      expect(component.erro).toBe('Erro ao salvar anamnese.');
      expect(component.salvando).toBeFalse();
    });
  });

  describe('without existing anamnese', () => {
    beforeEach(async () => setup(null));

    it('should keep form empty when API returns 404 for anamnese', () => {
      expect(component.paciente).toEqual(mockPaciente);
      expect(component.anamnese).toBeNull();
      expect(component.form.get('queixaPrincipal')?.value).toBe('');
      expect(component.loading).toBeFalse();
      expect(component.erro).toBeNull();
    });

    it('should create a new anamnese and include pacienteId in payload', () => {
      anamneseServiceSpy.criar.and.returnValue(of(mockAnamnese));
      component.form.patchValue({
        queixaPrincipal: 'Dor lombar',
        objetivos: 'Fortalecimento'
      });

      component.salvar();

      expect(anamneseServiceSpy.criar).toHaveBeenCalledWith(
        jasmine.objectContaining({ pacienteId: 1, queixaPrincipal: 'Dor lombar', objetivos: 'Fortalecimento' })
      );
      expect(component.anamnese).toEqual(mockAnamnese);
      expect(component.sucesso).toBe('Anamnese cadastrada com sucesso.');
      expect(component.salvando).toBeFalse();
    });

    it('should not save when required fields are missing', () => {
      component.salvar();

      expect(anamneseServiceSpy.criar).not.toHaveBeenCalled();
      expect(component.form.get('queixaPrincipal')?.touched).toBeTrue();
      expect(component.form.get('objetivos')?.touched).toBeTrue();
    });

    it('should focus the first field when opening the form for creation', async () => {
      // O foco inicial é adiado para o próximo ciclo (após o *ngIf renderizar).
      await new Promise(resolve => setTimeout(resolve));
      const primeiro = fixture.nativeElement.querySelector('#queixaPrincipal') as HTMLTextAreaElement;
      expect(document.activeElement).toBe(primeiro);
    });

    it('should focus the first invalid field on invalid submit', () => {
      component.salvar();
      fixture.detectChanges();

      const primeiro = fixture.nativeElement.querySelector('#queixaPrincipal') as HTMLTextAreaElement;
      expect(document.activeElement).toBe(primeiro);
    });

    it('should keep required fields invalid when they contain only whitespace', () => {
      component.form.patchValue({
        queixaPrincipal: '   ',
        objetivos: '   '
      });

      component.salvar();

      expect(anamneseServiceSpy.criar).not.toHaveBeenCalled();
      expect(component.form.get('queixaPrincipal')?.hasError('pattern')).toBeTrue();
      expect(component.form.get('objetivos')?.hasError('pattern')).toBeTrue();
    });
  });

  it('should not call services when pacienteId route param is invalid', async () => {
    await setup(null, 'abc');

    expect(component.erro).toBe('Identificador inválido.');
    expect(component.parametroInvalido).toBeTrue();
    expect(pacienteServiceSpy.buscar).not.toHaveBeenCalled();
    expect(anamneseServiceSpy.buscarPorPaciente).not.toHaveBeenCalled();
  });

  it('should set erro when patient loading fails', async () => {
    await setup(mockAnamnese);
    pacienteServiceSpy.buscar.and.returnValue(throwError(() => new Error('fail')));

    component.carregar();

    expect(component.erro).toBe('Erro ao carregar anamnese do paciente.');
    expect(component.loading).toBeFalse();
  });

  it('should set erro when buscarPorPaciente returns a non-404 error', async () => {
    await setup(mockAnamnese);
    anamneseServiceSpy.buscarPorPaciente.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500 }))
    );

    component.carregar();

    expect(component.erro).toBe('Erro ao carregar anamnese do paciente.');
    expect(component.loading).toBeFalse();
  });

  describe('modo embutido (issue #305)', () => {
    async function setupEmbutido(anamnese: AnamneseResponseDTO | null) {
      pacienteServiceSpy = jasmine.createSpyObj('PacienteService', ['buscar']);
      anamneseServiceSpy = jasmine.createSpyObj('AnamneseService', ['buscarPorPaciente', 'criar', 'atualizar']);
      pacienteServiceSpy.buscar.and.returnValue(of(mockPaciente));
      anamneseServiceSpy.buscarPorPaciente.and.returnValue(
        anamnese === null ? throwError(() => new HttpErrorResponse({ status: 404 })) : of(anamnese)
      );
      await TestBed.configureTestingModule({
        imports: [PacienteAnamneseComponent, RouterTestingModule],
        providers: [
          { provide: PacienteService, useValue: pacienteServiceSpy },
          { provide: AnamneseService, useValue: anamneseServiceSpy },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ pacienteId: '1' }) } } }
        ]
      }).compileComponents();
      fixture = TestBed.createComponent(PacienteAnamneseComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('embutido', true);
      fixture.detectChanges();
    }

    function el(): HTMLElement {
      return fixture.nativeElement as HTMLElement;
    }

    it('should hide the page header, the breadcrumb and the exit links', async () => {
      await setupEmbutido(mockAnamnese);
      expect(el().querySelector('h1')).toBeNull();
      expect(el().querySelector('app-breadcrumb')).toBeNull();
      expect(el().querySelector('.form-actions a')).toBeNull();
      expect(el().querySelector('button[type="submit"]')?.textContent?.trim()).toBe('Salvar e continuar');
    });

    it('should keep the same fields as the standalone screen', async () => {
      await setupEmbutido(mockAnamnese);
      expect(el().querySelector('#queixaPrincipal')).not.toBeNull();
      expect(component.form.get('queixaPrincipal')?.value).toBe('Dor lombar');
    });

    it('should emit salvo with the created anamnese', async () => {
      await setupEmbutido(null);
      const emitidos: AnamneseResponseDTO[] = [];
      component.salvo.subscribe(a => emitidos.push(a));
      anamneseServiceSpy.criar.and.returnValue(of(mockAnamnese));
      component.form.patchValue({ queixaPrincipal: 'Dor lombar', objetivos: 'Fortalecimento' });

      component.salvar();

      expect(anamneseServiceSpy.criar).toHaveBeenCalled();
      expect(emitidos).toEqual([mockAnamnese]);
    });

    it('should not emit salvo when saving fails', async () => {
      await setupEmbutido(mockAnamnese);
      const emitido = jasmine.createSpy('salvo');
      component.salvo.subscribe(emitido);
      anamneseServiceSpy.atualizar.and.returnValue(throwError(() => new Error('fail')));

      component.salvar();

      expect(emitido).not.toHaveBeenCalled();
      expect(component.erro).toBe('Erro ao salvar anamnese.');
    });
  });

  it('should keep the standalone header and labels outside the flow', async () => {
    await setup();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Anamnese');
    expect(el.querySelector('button[type="submit"]')?.textContent?.trim()).toBe('Atualizar');
  });
});
