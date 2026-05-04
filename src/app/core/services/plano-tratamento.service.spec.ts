import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PlanoTratamentoService } from './plano-tratamento.service';
import {
  PlanoTratamentoRequestDTO,
  PlanoTratamentoResponseDTO,
  PlanoTratamentoUpdateDTO
} from '../models/plano-tratamento';

const mockPlano: PlanoTratamentoResponseDTO = {
  id: 1,
  pacienteId: 10,
  nomePaciente: 'Ana Silva',
  dataInicio: '2026-05-01',
  dataPrevisaoTermino: '2026-08-01',
  objetivosTerapeuticos: 'Redução de dor lombar',
  frequenciaSemanal: 2,
  condutasPropostas: 'Pilates solo e alongamento',
  exerciciosIndicados: 'Flexão de quadril, alongamento de isquiotibiais',
  exerciciosContraindicados: null,
  equipamentosPrevistos: 'Mat, bola',
  observacoesClinicas: null,
  status: 'ATIVO',
  dataCriacao: '2026-05-01T10:00:00',
  dataAtualizacao: null
};

describe('PlanoTratamentoService', () => {
  let service: PlanoTratamentoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PlanoTratamentoService]
    });
    service = TestBed.inject(PlanoTratamentoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should GET /api/planos-tratamento/paciente/:pacienteId', () => {
    service.listarPorPaciente(10).subscribe(p => expect(p).toEqual([mockPlano]));

    const req = httpMock.expectOne('/api/planos-tratamento/paciente/10');
    expect(req.request.method).toBe('GET');
    req.flush([mockPlano]);
  });

  it('should GET /api/planos-tratamento/:id', () => {
    service.buscar(1).subscribe(p => expect(p).toEqual(mockPlano));

    const req = httpMock.expectOne('/api/planos-tratamento/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockPlano);
  });

  it('should POST to /api/planos-tratamento with request body', () => {
    const dto: PlanoTratamentoRequestDTO = {
      pacienteId: 10,
      dataInicio: '2026-05-01',
      objetivosTerapeuticos: 'Redução de dor lombar',
      frequenciaSemanal: 2,
      condutasPropostas: 'Pilates solo e alongamento',
      exerciciosIndicados: 'Flexão de quadril'
    };

    service.criar(dto).subscribe(p => expect(p).toEqual(mockPlano));

    const req = httpMock.expectOne('/api/planos-tratamento');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(mockPlano);
  });

  it('should PUT to /api/planos-tratamento/:id with update body', () => {
    const dto: PlanoTratamentoUpdateDTO = {
      objetivosTerapeuticos: 'Fortalecimento muscular',
      frequenciaSemanal: 3
    };

    service.atualizar(1, dto).subscribe(p => expect(p).toEqual(mockPlano));

    const req = httpMock.expectOne('/api/planos-tratamento/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(dto);
    req.flush(mockPlano);
  });

  it('should PATCH /api/planos-tratamento/:id/encerrar', () => {
    const encerrado = { ...mockPlano, status: 'ENCERRADO' as const };
    service.encerrar(1).subscribe(p => expect(p).toEqual(encerrado));

    const req = httpMock.expectOne('/api/planos-tratamento/1/encerrar');
    expect(req.request.method).toBe('PATCH');
    req.flush(encerrado);
  });

  it('should PATCH /api/planos-tratamento/:id/suspender', () => {
    const suspenso = { ...mockPlano, status: 'SUSPENSO' as const };
    service.suspender(1).subscribe(p => expect(p).toEqual(suspenso));

    const req = httpMock.expectOne('/api/planos-tratamento/1/suspender');
    expect(req.request.method).toBe('PATCH');
    req.flush(suspenso);
  });
});
