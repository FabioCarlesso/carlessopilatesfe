import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SessaoService } from './sessao.service';
import { SessaoRequestDTO, SessaoResponseDTO, SessaoUpdateDTO } from '../models/sessao';

const mockSessao: SessaoResponseDTO = {
  id: 1,
  pacienteId: 10,
  nomePaciente: 'Ana Silva',
  dataHora: '2026-05-10T10:00',
  tipo: 'PILATES',
  duracao: 60,
  profissionalId: null,
  nomeProfissional: null,
  status: 'AGENDADA',
  observacoes: null,
  dataCriacao: '2026-05-01T09:00:00',
  dataAtualizacao: null
};

const mockSessaoApi = {
  id: 1,
  pacienteId: 10,
  nomePaciente: 'Ana Silva',
  profissionalId: null,
  nomeProfissional: null,
  planoTratamentoId: null,
  tipo: 'PILATES',
  status: 'AGENDADA',
  data: '2026-05-10',
  horario: '10:00:00',
  local: null,
  duracaoMinutos: 60,
  observacoes: null,
  dataCriacao: '2026-05-01T09:00:00',
  dataAtualizacao: null
};

describe('SessaoService', () => {
  let service: SessaoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SessaoService]
    });
    service = TestBed.inject(SessaoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should GET /api/sessoes/paciente/:pacienteId', () => {
    service.listarPorPaciente(10).subscribe(s => expect(s).toEqual([mockSessao]));

    const req = httpMock.expectOne('/api/sessoes/paciente/10');
    expect(req.request.method).toBe('GET');
    req.flush([mockSessaoApi]);
  });

  // Agenda do estúdio (issue #125): mesma tradução do payload da API, agora
  // sobre a listagem global por período.
  it('should GET /api/sessoes with the period as query params', () => {
    service.listarPorPeriodo('2026-05-17', '2026-05-23').subscribe(s => expect(s).toEqual([mockSessao]));

    const req = httpMock.expectOne(request =>
      request.url === '/api/sessoes'
      && request.params.get('inicio') === '2026-05-17'
      && request.params.get('fim') === '2026-05-23'
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('profissionalId')).toBeFalse();
    req.flush([mockSessaoApi]);
  });

  // Agenda de um profissional (issue #126): o recorte é do servidor, e não do
  // cliente sobre o estúdio inteiro.
  it('should GET /api/sessoes filtered by profissional when informed', () => {
    service.listarPorPeriodo('2026-05-17', '2026-05-23', 3).subscribe(s => expect(s).toEqual([mockSessao]));

    const req = httpMock.expectOne(request =>
      request.url === '/api/sessoes'
      && request.params.get('inicio') === '2026-05-17'
      && request.params.get('fim') === '2026-05-23'
      && request.params.get('profissionalId') === '3'
    );
    expect(req.request.method).toBe('GET');
    req.flush([mockSessaoApi]);
  });

  it('should GET /api/sessoes/:id', () => {
    service.buscar(1).subscribe(s => expect(s).toEqual(mockSessao));

    const req = httpMock.expectOne('/api/sessoes/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockSessaoApi);
  });

  it('should POST to /api/sessoes with API request body', () => {
    const dto: SessaoRequestDTO = {
      pacienteId: 10,
      dataHora: '2026-05-10T10:00:00',
      tipo: 'PILATES',
      duracao: 60,
      profissionalId: null,
      observacoes: null
    };

    service.criar(dto).subscribe(s => expect(s).toEqual(mockSessao));

    const req = httpMock.expectOne('/api/sessoes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      pacienteId: 10,
      profissionalId: null,
      tipo: 'PILATES',
      data: '2026-05-10',
      horario: '10:00:00',
      duracaoMinutos: 60,
      observacoes: null
    });
    req.flush(mockSessaoApi);
  });

  it('should PUT to /api/sessoes/:id with API update body', () => {
    const dto: SessaoUpdateDTO = {
      dataHora: '2026-05-10T11:30',
      duracao: 45,
      observacoes: 'Ajuste de carga'
    };

    service.atualizar(1, dto).subscribe(s => expect(s).toEqual(mockSessao));

    const req = httpMock.expectOne('/api/sessoes/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      data: '2026-05-10',
      horario: '11:30:00',
      duracaoMinutos: 45,
      observacoes: 'Ajuste de carga'
    });
    req.flush(mockSessaoApi);
  });

  it('should not send status, tipo or profissionalId in the PUT body', () => {
    service.atualizar(1, { dataHora: '2026-05-10T11:30', duracao: 45, observacoes: null }).subscribe();

    const req = httpMock.expectOne('/api/sessoes/1');
    expect(Object.keys(req.request.body).sort())
      .toEqual(['data', 'duracaoMinutos', 'horario', 'observacoes']);
    req.flush(mockSessaoApi);
  });

  it('should PUT to /api/sessoes/:id without data/horario when dataHora is absent', () => {
    const dto: SessaoUpdateDTO = { duracao: 45, observacoes: 'Ajuste' };

    service.atualizar(1, dto).subscribe();

    const req = httpMock.expectOne('/api/sessoes/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.data).toBeUndefined();
    expect(req.request.body.horario).toBeUndefined();
    expect(req.request.body.duracaoMinutos).toBe(45);
    req.flush(mockSessaoApi);
  });

  it('should normalise API response with null horario and null duracaoMinutos', () => {
    service.buscar(1).subscribe(s => {
      expect(s.dataHora).toBe('2026-05-10T00:00');
      expect(s.duracao).toBeNull();
    });

    httpMock.expectOne('/api/sessoes/1').flush({ ...mockSessaoApi, horario: null, duracaoMinutos: null });
  });

  it('should PATCH /api/sessoes/:id/realizar', () => {
    const realizada = { ...mockSessao, status: 'REALIZADA' as const };
    service.realizar(1).subscribe(s => expect(s).toEqual(realizada));

    const req = httpMock.expectOne('/api/sessoes/1/realizar');
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...mockSessaoApi, status: 'REALIZADA' });
  });

  it('should PATCH /api/sessoes/:id/cancelar', () => {
    const cancelada = { ...mockSessao, status: 'CANCELADA' as const };
    service.cancelar(1).subscribe(s => expect(s).toEqual(cancelada));

    const req = httpMock.expectOne('/api/sessoes/1/cancelar');
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...mockSessaoApi, status: 'CANCELADA' });
  });
});
