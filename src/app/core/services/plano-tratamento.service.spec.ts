import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PlanoTratamentoService } from './plano-tratamento.service';
import {
  PlanoTratamentoRequestDTO,
  PlanoTratamentoResponseDTO,
  PlanoTratamentoUpdateDTO
} from '../models/plano-tratamento';
import { pagina } from '../../../testing/pagina';

const mockPlano: PlanoTratamentoResponseDTO = {
  version: 0,
  id: 1,
  pacienteId: 10,
  nomePaciente: 'Ana Silva',
  dataInicio: '2026-05-01',
  dataFimPrevista: '2026-08-01',
  objetivosTratamento: 'Redução de dor lombar',
  intervencoesPlanejadas: 'Pilates solo e alongamento',
  numeroSessoesPrevistas: 24,
  frequenciaSessoes: '2x por semana',
  responsavelTratamento: 'Dra. Carla',
  observacoes: null,
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

    const req = httpMock.expectOne('/api/planos-tratamento/paciente/10?page=0&size=2000');
    expect(req.request.method).toBe('GET');
    req.flush(pagina([mockPlano]));
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
      objetivosTratamento: 'Redução de dor lombar',
      numeroSessoesPrevistas: 24,
      frequenciaSessoes: '2x por semana'
    };

    service.criar(dto).subscribe(p => expect(p).toEqual(mockPlano));

    const req = httpMock.expectOne('/api/planos-tratamento');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(mockPlano);
  });

  it('should PUT to /api/planos-tratamento/:id with update body', () => {
    const dto: PlanoTratamentoUpdateDTO = {
      objetivosTratamento: 'Fortalecimento muscular',
      frequenciaSessoes: '3x por semana',
      version: 0
    };

    service.atualizar(1, dto).subscribe(p => expect(p).toEqual(mockPlano));

    const req = httpMock.expectOne('/api/planos-tratamento/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(dto);
    req.flush(mockPlano);
  });

  it('should DELETE /api/planos-tratamento/:id to inactivate', () => {
    service.inativar(1).subscribe();

    const req = httpMock.expectOne('/api/planos-tratamento/1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
