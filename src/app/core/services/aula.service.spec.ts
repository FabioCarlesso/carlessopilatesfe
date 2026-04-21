import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AulaService } from './aula.service';
import { AulaResponseDTO } from '../models/plano';

const mockAula: AulaResponseDTO = {
  id: 1,
  pacienteId: 10,
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

  describe('listar', () => {
    it('should GET /api/pacientes/:id/aulas', () => {
      service.listar(10).subscribe(aulas => expect(aulas).toEqual([mockAula]));
      const req = httpMock.expectOne('/api/pacientes/10/aulas');
      expect(req.request.method).toBe('GET');
      req.flush([mockAula]);
    });
  });

  describe('confirmar', () => {
    it('should PATCH /api/aulas/:id/confirmar', () => {
      service.confirmar(1).subscribe();
      const req = httpMock.expectOne('/api/aulas/1/confirmar');
      expect(req.request.method).toBe('PATCH');
      req.flush(null);
    });
  });
});
