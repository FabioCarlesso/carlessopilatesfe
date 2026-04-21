import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PlanoService } from './plano.service';
import { PlanoRequestDTO, PlanoResponseDTO } from '../models/plano';

const mockPlano: PlanoResponseDTO = {
  id: 1,
  pacienteId: 10,
  tipo: 'MENSAL',
  valor: 250,
  frequenciaSemanal: 'DUAS_VEZES',
  dataInicio: '2026-05-01',
  diasSemana: ['MONDAY', 'WEDNESDAY'],
  ativo: true
};

describe('PlanoService', () => {
  let service: PlanoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PlanoService]
    });
    service = TestBed.inject(PlanoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('listar', () => {
    it('should GET /api/pacientes/:id/planos', () => {
      service.listar(10).subscribe(planos => expect(planos).toEqual([mockPlano]));
      const req = httpMock.expectOne('/api/pacientes/10/planos');
      expect(req.request.method).toBe('GET');
      req.flush([mockPlano]);
    });
  });

  describe('criar', () => {
    it('should POST to /api/pacientes/:id/planos with body', () => {
      const dto: PlanoRequestDTO = {
        tipo: 'MENSAL',
        valor: 250,
        frequenciaSemanal: 'DUAS_VEZES',
        dataInicio: '2026-05-01',
        diasSemana: ['MONDAY', 'WEDNESDAY']
      };
      service.criar(10, dto).subscribe(p => expect(p).toEqual(mockPlano));
      const req = httpMock.expectOne('/api/pacientes/10/planos');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(mockPlano);
    });
  });

  describe('inativar', () => {
    it('should PATCH /api/planos/:id/inativar', () => {
      service.inativar(1).subscribe();
      const req = httpMock.expectOne('/api/planos/1/inativar');
      expect(req.request.method).toBe('PATCH');
      req.flush(null);
    });
  });
});
