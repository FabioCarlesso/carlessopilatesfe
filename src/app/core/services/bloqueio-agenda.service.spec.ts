import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BloqueioAgendaRequestDTO, BloqueioAgendaResponseDTO } from '../models/bloqueio-agenda';
import { BloqueioAgendaService } from './bloqueio-agenda.service';

const mockBloqueio: BloqueioAgendaResponseDTO = {
  id: 1,
  dataInicio: '2026-12-25',
  dataFim: '2026-12-25',
  horaInicio: null,
  horaFim: null,
  diaInteiro: true,
  motivo: 'Natal',
  dataCriacao: '2026-01-02T09:00:00',
  dataAtualizacao: null
};

const mockRequest: BloqueioAgendaRequestDTO = {
  dataInicio: '2026-12-25',
  dataFim: '2026-12-25',
  horaInicio: null,
  horaFim: null,
  motivo: 'Natal'
};

describe('BloqueioAgendaService', () => {
  let service: BloqueioAgendaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [BloqueioAgendaService]
    });
    service = TestBed.inject(BloqueioAgendaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('listarPorPeriodo', () => {
    it('should GET /api/bloqueios with the period as query params', () => {
      service.listarPorPeriodo('2026-01-01', '2026-12-31')
        .subscribe(bloqueios => expect(bloqueios).toEqual([mockBloqueio]));

      const req = httpMock.expectOne(request =>
        request.url === '/api/bloqueios'
        && request.params.get('inicio') === '2026-01-01'
        && request.params.get('fim') === '2026-12-31'
      );
      expect(req.request.method).toBe('GET');
      req.flush([mockBloqueio]);
    });
  });

  describe('buscar', () => {
    it('should GET /api/bloqueios/:id', () => {
      service.buscar(1).subscribe(bloqueio => expect(bloqueio).toEqual(mockBloqueio));
      const req = httpMock.expectOne('/api/bloqueios/1');
      expect(req.request.method).toBe('GET');
      req.flush(mockBloqueio);
    });
  });

  describe('criar', () => {
    it('should POST /api/bloqueios with the payload', () => {
      service.criar(mockRequest).subscribe(bloqueio => expect(bloqueio).toEqual(mockBloqueio));
      const req = httpMock.expectOne('/api/bloqueios');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockRequest);
      req.flush(mockBloqueio);
    });
  });

  describe('atualizar', () => {
    // Substituição completa: mandar as horas nulas é o que devolve o bloqueio
    // para dia inteiro, então elas precisam sair no corpo.
    it('should PUT /api/bloqueios/:id with the full payload', () => {
      service.atualizar(1, mockRequest).subscribe(bloqueio => expect(bloqueio).toEqual(mockBloqueio));
      const req = httpMock.expectOne('/api/bloqueios/1');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(mockRequest);
      req.flush(mockBloqueio);
    });
  });

  describe('excluir', () => {
    it('should DELETE /api/bloqueios/:id', () => {
      service.excluir(1).subscribe();
      const req = httpMock.expectOne('/api/bloqueios/1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });
});
