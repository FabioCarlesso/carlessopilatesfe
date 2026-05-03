import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AnamneseService } from './anamnese.service';
import { AnamneseRequestDTO, AnamneseResponseDTO, AnamneseUpdateDTO } from '../models/anamnese';

const mockAnamnese: AnamneseResponseDTO = {
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

describe('AnamneseService', () => {
  let service: AnamneseService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AnamneseService]
    });
    service = TestBed.inject(AnamneseService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should GET /api/anamneses/paciente/:pacienteId', () => {
    service.buscarPorPaciente(1).subscribe(a => expect(a).toEqual(mockAnamnese));

    const req = httpMock.expectOne('/api/anamneses/paciente/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockAnamnese);
  });

  it('should GET /api/anamneses/:id', () => {
    service.buscarPorId(10).subscribe(a => expect(a).toEqual(mockAnamnese));

    const req = httpMock.expectOne('/api/anamneses/10');
    expect(req.request.method).toBe('GET');
    req.flush(mockAnamnese);
  });

  it('should POST to /api/anamneses with request body', () => {
    const dto: AnamneseRequestDTO = {
      pacienteId: 1,
      queixaPrincipal: 'Dor lombar',
      objetivos: 'Fortalecimento'
    };

    service.criar(dto).subscribe(a => expect(a).toEqual(mockAnamnese));

    const req = httpMock.expectOne('/api/anamneses');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(mockAnamnese);
  });

  it('should PUT to /api/anamneses/:id with update body', () => {
    const dto: AnamneseUpdateDTO = {
      queixaPrincipal: 'Dor cervical',
      objetivos: 'Mobilidade'
    };

    service.atualizar(10, dto).subscribe(a => expect(a).toEqual(mockAnamnese));

    const req = httpMock.expectOne('/api/anamneses/10');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(dto);
    req.flush(mockAnamnese);
  });
});
