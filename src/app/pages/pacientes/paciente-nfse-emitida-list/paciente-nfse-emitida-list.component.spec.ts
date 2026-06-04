import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { NotaFiscalEmitidaResponseDTO } from '../../../core/models/nfse-emitida';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { NfseEmitidaService } from '../../../core/services/nfse-emitida.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { PacienteNfseEmitidaListComponent } from './paciente-nfse-emitida-list.component';

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
  observacoes: 'Nota emitida no portal.',
  dataCriacao: '2026-05-20T09:00:00',
  dataAtualizacao: null
};

const mockNotaAntiga: NotaFiscalEmitidaResponseDTO = {
  ...mockNota,
  id: 2,
  competencia: '04/2026',
  numeroNota: '11111',
  dataEmissao: '2026-04-18'
};

describe('PacienteNfseEmitidaListComponent', () => {
  let component: PacienteNfseEmitidaListComponent;
  let fixture: ComponentFixture<PacienteNfseEmitidaListComponent>;
  let pacienteServiceSpy: jasmine.SpyObj<PacienteService>;
  let nfseEmitidaServiceSpy: jasmine.SpyObj<NfseEmitidaService>;

  async function setup(
    notas: NotaFiscalEmitidaResponseDTO[] = [mockNota],
    pacienteId = '10'
  ) {
    pacienteServiceSpy = jasmine.createSpyObj('PacienteService', ['buscar']);
    nfseEmitidaServiceSpy = jasmine.createSpyObj('NfseEmitidaService', ['listarPorPaciente', 'salvar']);

    pacienteServiceSpy.buscar.and.returnValue(of(mockPaciente));
    nfseEmitidaServiceSpy.listarPorPaciente.and.returnValue(of(notas));

    await TestBed.configureTestingModule({
      imports: [PacienteNfseEmitidaListComponent, RouterTestingModule],
      providers: [
        { provide: PacienteService, useValue: pacienteServiceSpy },
        { provide: NfseEmitidaService, useValue: nfseEmitidaServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ pacienteId }) } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PacienteNfseEmitidaListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should create and load patient and notas', async () => {
    await setup([mockNota]);

    expect(component).toBeTruthy();
    expect(pacienteServiceSpy.buscar).toHaveBeenCalledWith(10);
    expect(nfseEmitidaServiceSpy.listarPorPaciente).toHaveBeenCalledWith(10);
    expect(component.paciente).toEqual(mockPaciente);
    expect(component.notas).toEqual([mockNota]);
    expect(component.loading).toBeFalse();
    expect(component.erro).toBeNull();
  });

  it('should order notas by emission date descending and expose the latest', async () => {
    await setup([mockNotaAntiga, mockNota]);

    expect(component.notas[0]).toEqual(mockNota);
    expect(component.ultimaNota).toEqual(mockNota);
  });

  it('should break ties on equal emission dates by id descending', async () => {
    const mesmaData = { ...mockNota, id: 5, dataEmissao: '2026-05-20' };
    const mesmaDataAntiga = { ...mockNota, id: 3, dataEmissao: '2026-05-20' };

    await setup([mesmaDataAntiga, mesmaData]);

    expect(component.notas[0].id).toBe(5);
    expect(component.ultimaNota?.id).toBe(5);
  });

  it('should show empty state and null ultimaNota when no notas exist', async () => {
    await setup([]);

    expect(component.notas.length).toBe(0);
    expect(component.ultimaNota).toBeNull();
    expect(component.erro).toBeNull();
  });

  it('should display date-only values without timezone shift', async () => {
    await setup([mockNota]);

    const dateElement: HTMLElement | null = fixture.nativeElement.querySelector('.nfse-data');

    expect(dateElement?.textContent?.trim()).toBe('20/05/2026');
  });

  it('should set erro when patient loading fails', async () => {
    await setup([]);
    pacienteServiceSpy.buscar.and.returnValue(throwError(() => new Error('fail')));

    component.carregar();

    expect(component.erro).toBe('Erro ao carregar dados do paciente.');
    expect(component.loading).toBeFalse();
  });

  it('should set erro when notas loading fails', async () => {
    await setup([]);
    nfseEmitidaServiceSpy.listarPorPaciente.and.returnValue(throwError(() => new Error('fail')));

    component['carregarNotas']();

    expect(component.erro).toBe('Erro ao carregar NFSEs emitidas.');
    expect(component.loading).toBeFalse();
  });

  it('should set erro when pacienteId is invalid', async () => {
    await setup([], 'abc');

    expect(component.erro).toBe('Identificador inválido.');
    expect(pacienteServiceSpy.buscar).not.toHaveBeenCalled();
  });
});
