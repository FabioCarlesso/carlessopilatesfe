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
    it('should GET /api/planos/paciente/:id', () => {
      service.listar(10).subscribe(planos => expect(planos).toEqual([mockPlano]));
      const req = httpMock.expectOne('/api/planos/paciente/10');
      expect(req.request.method).toBe('GET');
      req.flush([mockPlano]);
    });
  });

  describe('criar', () => {
    it('should POST to /api/planos with body', () => {
      const dto: PlanoRequestDTO = {
        pacienteId: 10,
        tipo: 'MENSAL',
        valor: 250,
        frequenciaSemanal: 'DUAS_VEZES',
        dataInicio: '2026-05-01',
        diasSemana: ['MONDAY', 'WEDNESDAY']
      };
      service.criar(dto).subscribe(p => expect(p).toEqual(mockPlano));
      const req = httpMock.expectOne('/api/planos');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(mockPlano);
    });
  });

  describe('buscarAtivo', () => {
    it('should GET /api/planos/paciente/:id/ativo', () => {
      service.buscarAtivo(10).subscribe(p => expect(p).toEqual(mockPlano));
      const req = httpMock.expectOne('/api/planos/paciente/10/ativo');
      expect(req.request.method).toBe('GET');
      req.flush(mockPlano);
    });

    it('should return null when no active plan exists', () => {
      service.buscarAtivo(10).subscribe(p => expect(p).toBeNull());
      const req = httpMock.expectOne('/api/planos/paciente/10/ativo');
      req.flush(null);
    });
  });

  describe('inativar', () => {
    it('should DELETE /api/planos/:id', () => {
      service.inativar(1).subscribe();
      const req = httpMock.expectOne('/api/planos/1');
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });
});
