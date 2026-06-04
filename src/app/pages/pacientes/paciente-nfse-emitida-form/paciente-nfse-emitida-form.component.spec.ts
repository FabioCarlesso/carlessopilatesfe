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

  async function setup(pacienteId = '10') {
    pacienteServiceSpy = jasmine.createSpyObj('PacienteService', ['buscar']);
    nfseEmitidaServiceSpy = jasmine.createSpyObj('NfseEmitidaService', ['listarPorPaciente', 'salvar']);

    pacienteServiceSpy.buscar.and.returnValue(of(mockPaciente));
    nfseEmitidaServiceSpy.salvar.and.returnValue(of(mockNota));

    await TestBed.configureTestingModule({
      imports: [PacienteNfseEmitidaFormComponent, RouterTestingModule],
      providers: [
        { provide: PacienteService, useValue: pacienteServiceSpy },
        { provide: NfseEmitidaService, useValue: nfseEmitidaServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ pacienteId }) } } }
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
    await setup('abc');

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

  it('should set erro when saving fails', async () => {
    await setup();
    nfseEmitidaServiceSpy.salvar.and.returnValue(throwError(() => new Error('fail')));

    component.form.patchValue({ competencia: '05/2026', dataEmissao: '2026-05-20' });
    component.salvar();

    expect(component.erro).toBe('Erro ao registrar NFSE emitida.');
    expect(component.salvando).toBeFalse();
  });
});
