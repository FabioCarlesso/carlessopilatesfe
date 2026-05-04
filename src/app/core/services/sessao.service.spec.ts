import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SessaoService } from './sessao.service';
import { SessaoRequestDTO, SessaoResponseDTO, SessaoUpdateDTO } from '../models/sessao';

const mockSessao: SessaoResponseDTO = {
  id: 1,
  pacienteId: 10,
  nomePaciente: 'Ana Silva',
  dataHora: '2026-05-10T10:00:00',
  tipo: 'PILATES',
  duracao: 60,
  profissionalId: null,
  nomeProfissional: null,
  status: 'AGENDADA',
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
    req.flush([mockSessao]);
  });

  it('should GET /api/sessoes/:id', () => {
    service.buscar(1).subscribe(s => expect(s).toEqual(mockSessao));

    const req = httpMock.expectOne('/api/sessoes/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockSessao);
  });

  it('should POST to /api/sessoes with request body', () => {
    const dto: SessaoRequestDTO = {
      pacienteId: 10,
      dataHora: '2026-05-10T10:00:00',
      tipo: 'PILATES',
      duracao: 60
    };

    service.criar(dto).subscribe(s => expect(s).toEqual(mockSessao));

    const req = httpMock.expectOne('/api/sessoes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(mockSessao);
  });

  it('should PUT to /api/sessoes/:id with update body', () => {
    const dto: SessaoUpdateDTO = { duracao: 45, observacoes: 'Ajuste de carga' };

    service.atualizar(1, dto).subscribe(s => expect(s).toEqual(mockSessao));

    const req = httpMock.expectOne('/api/sessoes/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(dto);
    req.flush(mockSessao);
  });

  it('should PATCH /api/sessoes/:id/realizar', () => {
    const realizada = { ...mockSessao, status: 'REALIZADA' as const };
    service.realizar(1).subscribe(s => expect(s).toEqual(realizada));

    const req = httpMock.expectOne('/api/sessoes/1/realizar');
    expect(req.request.method).toBe('PATCH');
    req.flush(realizada);
  });

  it('should PATCH /api/sessoes/:id/cancelar', () => {
    const cancelada = { ...mockSessao, status: 'CANCELADA' as const };
    service.cancelar(1).subscribe(s => expect(s).toEqual(cancelada));

    const req = httpMock.expectOne('/api/sessoes/1/cancelar');
    expect(req.request.method).toBe('PATCH');
    req.flush(cancelada);
  });
});
