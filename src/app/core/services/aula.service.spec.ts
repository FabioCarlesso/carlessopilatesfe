import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AulaService } from './aula.service';
import { AulaResponseDTO } from '../models/plano';
import { pagina } from '../../../testing/pagina';

const mockAula: AulaResponseDTO = {
  id: 1,
  pacienteId: 10,
  pacienteNome: 'Ana Silva',
  pagamentoId: 1,
  data: '2026-05-05',
  horario: null,
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
      const req = httpMock.expectOne('/api/aulas/paciente/10?page=0&size=2000&sort=data,asc');
      expect(req.request.method).toBe('GET');
      req.flush(pagina([mockAula]));
    });

    it('should request the next pages until totalPages and concatenate them', () => {
      const segunda = { ...mockAula, id: 2 };
      let resultado: AulaResponseDTO[] | undefined;
      service.listarPorPaciente(10).subscribe(aulas => (resultado = aulas));

      httpMock.expectOne('/api/aulas/paciente/10?page=0&size=2000&sort=data,asc').flush(pagina([mockAula], 0, 2));
      httpMock.expectOne('/api/aulas/paciente/10?page=1&size=2000&sort=data,asc').flush(pagina([segunda], 1, 2));

      expect(resultado).toEqual([mockAula, segunda]);
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

    // Sem o parâmetro a agenda do estúdio pediria o período inteiro; com ele, a
    // agenda de um profissional recorta no servidor (issue #126).
    it('should not send profissionalId when it is omitted', () => {
      service.listarPorPeriodo('2026-05-17', '2026-05-23').subscribe();
      const req = httpMock.expectOne(request => request.url === '/api/aulas');
      expect(req.request.params.has('profissionalId')).toBeFalse();
      req.flush([mockAula]);
    });

    it('should send profissionalId when informed', () => {
      service.listarPorPeriodo('2026-05-17', '2026-05-23', 3)
        .subscribe(aulas => expect(aulas).toEqual([mockAula]));
      const req = httpMock.expectOne(request =>
        request.url === '/api/aulas'
        && request.params.get('inicio') === '2026-05-17'
        && request.params.get('fim') === '2026-05-23'
        && request.params.get('profissionalId') === '3'
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

  describe('remarcar', () => {
    it('should PATCH /api/aulas/:id/remarcar with the new date in the body', () => {
      const remarcada = { ...mockAula, data: '2026-05-12' };
      service.remarcar(1, '2026-05-12').subscribe(aula => expect(aula).toEqual(remarcada));
      const req = httpMock.expectOne('/api/aulas/1/remarcar');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ data: '2026-05-12' });
      req.flush(remarcada);
    });

    // Sem horário, a API mantém o atual: nem mesmo `null` deve sair daqui.
    it('should not send horario when it is not informed', () => {
      service.remarcar(1, '2026-05-12').subscribe();
      const req = httpMock.expectOne('/api/aulas/1/remarcar');
      expect(Object.keys(req.request.body as object)).toEqual(['data']);
      req.flush(mockAula);
    });

    it('should send horario in the body when informed', () => {
      service.remarcar(1, '2026-05-12', '18:00').subscribe();
      const req = httpMock.expectOne('/api/aulas/1/remarcar');
      expect(req.request.body).toEqual({ data: '2026-05-12', horario: '18:00' });
      req.flush({ ...mockAula, data: '2026-05-12', horario: '18:00:00' });
    });
  });

  describe('atribuirProfissional', () => {
    it('should PATCH /api/aulas/:id/profissional with profissionalId in the body', () => {
      service.atribuirProfissional(1, 7).subscribe();
      const req = httpMock.expectOne('/api/aulas/1/profissional');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ profissionalId: 7 });
      req.flush({ ...mockAula, profissionalId: 7 });
    });

    // A API recusa `{}` com 400: desvincular exige o campo presente e nulo.
    it('should send profissionalId null explicitly to unlink', () => {
      service.atribuirProfissional(1, null).subscribe();
      const req = httpMock.expectOne('/api/aulas/1/profissional');
      expect(req.request.body).toEqual({ profissionalId: null });
      req.flush({ ...mockAula, profissionalId: null });
    });
  });
});
