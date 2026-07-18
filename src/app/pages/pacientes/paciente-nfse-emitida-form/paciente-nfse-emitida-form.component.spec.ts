import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { NotaFiscalEmitidaResponseDTO } from '../../../core/models/nfse-emitida';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { NfseEmitidaService } from '../../../core/services/nfse-emitida.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { PacienteNfseEmitidaFormComponent } from './paciente-nfse-emitida-form.component';

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

const mockNota: NotaFiscalEmitidaResponseDTO = {
  id: 1,
  pacienteId: 10,
  nomePaciente: 'Ana Silva',
  competencia: '05/2026',
  numeroNota: '12345',
  dataEmissao: '2026-05-20',
  valor: 350,
  observacoes: null,
  dataCriacao: '2026-05-20T09:00:00',
  dataAtualizacao: null
};

describe('PacienteNfseEmitidaFormComponent', () => {
  let component: PacienteNfseEmitidaFormComponent;
  let fixture: ComponentFixture<PacienteNfseEmitidaFormComponent>;
  let pacienteServiceSpy: jasmine.SpyObj<PacienteService>;
  let nfseEmitidaServiceSpy: jasmine.SpyObj<NfseEmitidaService>;
  let router: Router;

  async function setup(
    params: { pacienteId?: string; id?: string } = { pacienteId: '10' },
    notas: NotaFiscalEmitidaResponseDTO[] = [mockNota]
  ) {
    pacienteServiceSpy = jasmine.createSpyObj('PacienteService', ['buscar']);
    nfseEmitidaServiceSpy = jasmine.createSpyObj('NfseEmitidaService', ['listarPorPaciente', 'salvar']);

    pacienteServiceSpy.buscar.and.returnValue(of(mockPaciente));
    nfseEmitidaServiceSpy.listarPorPaciente.and.returnValue(of(notas));
    nfseEmitidaServiceSpy.salvar.and.returnValue(of(mockNota));

    await TestBed.configureTestingModule({
      imports: [PacienteNfseEmitidaFormComponent, RouterTestingModule],
      providers: [
        { provide: PacienteService, useValue: pacienteServiceSpy },
        { provide: NfseEmitidaService, useValue: nfseEmitidaServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(params) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PacienteNfseEmitidaFormComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should create and load patient', async () => {
    await setup();

    expect(component).toBeTruthy();
    expect(pacienteServiceSpy.buscar).toHaveBeenCalledWith(10);
    expect(component.paciente).toEqual(mockPaciente);
    expect(component.loading).toBeFalse();
  });

  it('should set parametroInvalido when pacienteId is invalid', async () => {
    await setup({ pacienteId: 'abc' });

    expect(component.parametroInvalido).toBeTrue();
    expect(component.erro).toBe('Identificador inválido.');
    expect(pacienteServiceSpy.buscar).not.toHaveBeenCalled();
  });

  it('should not call listarPorPaciente in create mode', async () => {
    await setup();

    expect(component.modoEdicao).toBeFalse();
    expect(nfseEmitidaServiceSpy.listarPorPaciente).not.toHaveBeenCalled();
  });

  it('should load and prefill the nota in edit mode', async () => {
    await setup({ pacienteId: '10', id: '1' }, [mockNota]);

    expect(component.modoEdicao).toBeTrue();
    expect(nfseEmitidaServiceSpy.listarPorPaciente).toHaveBeenCalledWith(10);
    expect(component.form.value.competencia).toBe('05/2026');
    expect(component.form.value.dataEmissao).toBe('2026-05-20');
    expect(component.form.value.numeroNota).toBe('12345');
    expect(component.form.value.valor).toBe(350);
    expect(component.parametroInvalido).toBeFalse();
  });

  it('should flag erro when the nota is not found in edit mode', async () => {
    await setup({ pacienteId: '10', id: '999' }, [mockNota]);

    expect(component.parametroInvalido).toBeTrue();
    expect(component.erro).toBe('NFSE emitida não encontrada para o paciente informado.');
  });

  it('should set parametroInvalido when the edit id is invalid', async () => {
    await setup({ pacienteId: '10', id: 'abc' });

    expect(component.parametroInvalido).toBeTrue();
    expect(component.erro).toBe('Identificador inválido.');
    expect(pacienteServiceSpy.buscar).not.toHaveBeenCalled();
  });

  it('should not submit when form is invalid', async () => {
    await setup();

    component.salvar();

    expect(nfseEmitidaServiceSpy.salvar).not.toHaveBeenCalled();
    expect(component.form.touched).toBeTrue();
  });

  it('should expose numeric inputmode on the competencia field', async () => {
    await setup();

    const competencia = fixture.nativeElement.querySelector('#competencia') as HTMLInputElement;
    expect(competencia.getAttribute('inputmode')).toBe('numeric');
  });

  it('should reject competencia outside MM/AAAA format', async () => {
    await setup();

    component.form.patchValue({ competencia: '13/2026', dataEmissao: '2026-05-20' });

    expect(component.campo('competencia')?.invalid).toBeTrue();
  });

  it('should POST sanitized payload and navigate on success', async () => {
    await setup();

    component.form.patchValue({
      competencia: '05/2026',
      dataEmissao: '2026-05-20',
      numeroNota: '  12345  ',
      valor: 350,
      observacoes: '   '
    });

    component.salvar();

    expect(nfseEmitidaServiceSpy.salvar).toHaveBeenCalledWith({
      pacienteId: 10,
      competencia: '05/2026',
      dataEmissao: '2026-05-20',
      numeroNota: '12345',
      valor: 350,
      observacoes: null
    });
    expect(router.navigate).toHaveBeenCalledWith(['/pacientes', 10, 'nfse-emitidas']);
  });

  it('should send null valor when left empty', async () => {
    await setup();

    component.form.patchValue({
      competencia: '05/2026',
      dataEmissao: '2026-05-20'
    });

    component.salvar();

    const dto = nfseEmitidaServiceSpy.salvar.calls.mostRecent().args[0];
    expect(dto.valor).toBeNull();
    expect(dto.numeroNota).toBeNull();
  });

  it('should set generic erro when saving fails without a usable body', async () => {
    await setup();
    nfseEmitidaServiceSpy.salvar.and.returnValue(throwError(() => new Error('fail')));

    component.form.patchValue({ competencia: '05/2026', dataEmissao: '2026-05-20' });
    component.salvar();

    expect(component.erro).toBe('Erro ao registrar NFSE emitida.');
    expect(component.salvando).toBeFalse();
  });

  it('should surface the backend message on a 409 conflict', async () => {
    await setup();
    nfseEmitidaServiceSpy.salvar.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { message: 'Já existe NFSE para a competência.' } }))
    );

    component.form.patchValue({ competencia: '05/2026', dataEmissao: '2026-05-20' });
    component.salvar();

    expect(component.erro).toBe('Já existe NFSE para a competência.');
    expect(component.salvando).toBeFalse();
  });
});
