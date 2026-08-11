import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AulaService } from './aula.service';
import { AulaResponseDTO } from '../models/plano';

const mockAula: AulaResponseDTO = {
  id: 1,
  pacienteId: 10,
  pacienteNome: 'Ana Silva',
  pagamentoId: 1,
  data: '2026-05-05',
  realizada: false
};

describe('AulaService', () => {
  let service: AulaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AulaService]
    });
    service = TestBed.inject(AulaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('listarPorPaciente', () => {
    it('should GET /api/aulas/paciente/:id', () => {
      service.listarPorPaciente(10).subscribe(aulas => expect(aulas).toEqual([mockAula]));
      const req = httpMock.expectOne('/api/aulas/paciente/10');
      expect(req.request.method).toBe('GET');
      req.flush([mockAula]);
    });
  });

  describe('listarPorPeriodo', () => {
    it('should GET /api/aulas with the period as query params', () => {
      service.listarPorPeriodo('2026-05-17', '2026-05-23').subscribe(aulas => expect(aulas).toEqual([mockAula]));
      const req = httpMock.expectOne(request =>
        request.url === '/api/aulas'
        && request.params.get('inicio') === '2026-05-17'
        && request.params.get('fim') === '2026-05-23'
      );
      expect(req.request.method).toBe('GET');
      req.flush([mockAula]);
    });
  });

  describe('listarPorPagamento', () => {
    it('should GET /api/aulas/pagamento/:id', () => {
      service.listarPorPagamento(1).subscribe(aulas => expect(aulas).toEqual([mockAula]));
      const req = httpMock.expectOne('/api/aulas/pagamento/1');
      expect(req.request.method).toBe('GET');
      req.flush([mockAula]);
    });
  });

  describe('realizar', () => {
    it('should PATCH /api/aulas/:id/realizar with profissionalId query param', () => {
      service.realizar(1, 5).subscribe(aula => expect(aula).toEqual(mockAula));
      const req = httpMock.expectOne(request =>
        request.url === '/api/aulas/1/realizar' && request.params.get('profissionalId') === '5'
      );
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({});
      req.flush(mockAula);
    });
  });
});
