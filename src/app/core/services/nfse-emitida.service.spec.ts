import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NfseEmitidaService } from './nfse-emitida.service';
import {
  NotaFiscalEmitidaRequestDTO,
  NotaFiscalEmitidaResponseDTO
} from '../models/nfse-emitida';

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

describe('NfseEmitidaService', () => {
  let service: NfseEmitidaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [NfseEmitidaService]
    });
    service = TestBed.inject(NfseEmitidaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should GET /api/api/nfse-emitidas/paciente/:pacienteId', () => {
    service.listarPorPaciente(10).subscribe(r => expect(r).toEqual([mockNota]));

    const req = httpMock.expectOne('/api/api/nfse-emitidas/paciente/10');
    expect(req.request.method).toBe('GET');
    req.flush([mockNota]);
  });

  it('should POST to /api/api/nfse-emitidas with request body', () => {
    const dto: NotaFiscalEmitidaRequestDTO = {
      pacienteId: 10,
      competencia: '05/2026',
      dataEmissao: '2026-05-20',
      numeroNota: '12345',
      valor: 350,
      observacoes: null
    };

    service.salvar(dto).subscribe(r => expect(r).toEqual(mockNota));

    const req = httpMock.expectOne('/api/api/nfse-emitidas');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(mockNota);
  });
});
