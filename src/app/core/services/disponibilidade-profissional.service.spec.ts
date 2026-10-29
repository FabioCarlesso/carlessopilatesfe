import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TRATA_403_LOCALMENTE } from '../interceptors/forbidden.interceptor';
import { DisponibilidadeProfissionalResponseDTO } from '../models/disponibilidade-profissional';
import { DisponibilidadeProfissionalService } from './disponibilidade-profissional.service';

const mockFaixa: DisponibilidadeProfissionalResponseDTO = {
  id: 7,
  profissionalId: 3,
  diaSemana: 'MONDAY',
  horaInicio: '07:00:00',
  horaFim: '12:00:00',
  version: 0,
  dataCriacao: '2026-10-28T09:00:00',
  dataAtualizacao: null
};

describe('DisponibilidadeProfissionalService', () => {
  let service: DisponibilidadeProfissionalService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(DisponibilidadeProfissionalService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should list the ranges of a professional', () => {
    service.listar(3).subscribe(faixas => expect(faixas).toEqual([mockFaixa]));

    const req = httpMock.expectOne('/api/profissionais/3/disponibilidades');
    expect(req.request.method).toBe('GET');
    req.flush([mockFaixa]);
  });

  it('should create a range under the professional', () => {
    const dto = { diaSemana: 'MONDAY' as const, horaInicio: '07:00', horaFim: '12:00' };
    service.criar(3, dto).subscribe(faixa => expect(faixa).toEqual(mockFaixa));

    const req = httpMock.expectOne('/api/profissionais/3/disponibilidades');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(mockFaixa);
  });

  it('should update a range by its own id, sending the version', () => {
    const dto = { diaSemana: 'MONDAY' as const, horaInicio: '08:00', horaFim: '12:00', version: 0 };
    service.atualizar(7, dto).subscribe();

    const req = httpMock.expectOne('/api/disponibilidades/7');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(dto);
    req.flush({ ...mockFaixa, horaInicio: '08:00:00', version: 1 });
  });

  it('should delete a range by its own id', () => {
    service.excluir(7).subscribe();

    const req = httpMock.expectOne('/api/disponibilidades/7');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('should check a date and time, handling 403 locally', () => {
    service.verificar(3, '2026-11-02', '09:30').subscribe(r => expect(r.dentroDaDisponibilidade).toBeFalse());

    const req = httpMock.expectOne(r => r.url === '/api/profissionais/3/disponibilidades/verificar');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('data')).toBe('2026-11-02');
    expect(req.request.params.get('horario')).toBe('09:30');
    expect(req.request.context.get(TRATA_403_LOCALMENTE)).toBeTrue();
    req.flush({ dentroDaDisponibilidade: false });
  });
});
