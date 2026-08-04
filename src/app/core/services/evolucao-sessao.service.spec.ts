import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EvolucaoSessaoService } from './evolucao-sessao.service';
import {
  EvolucaoSessaoRequestDTO,
  EvolucaoSessaoResponseDTO,
  EvolucaoSessaoUpdateDTO
} from '../models/evolucao-sessao';

const mockEvolucao: EvolucaoSessaoResponseDTO = {
  id: 1,
  sessaoId: 5,
  profissionalId: null,
  profissionalNome: null,
  profissionalNumeroRegistro: null,
  dataHoraRegistro: '2026-05-10T10:30:00',
  exerciciosRealizados: 'Agachamento, ponte, dead bug.',
  equipamentosUtilizados: 'Reformer',
  cargasMolas: 'Mola 3',
  dorAntes: 5,
  dorDepois: 2,
  respostaPaciente: 'Boa evolução.',
  intercorrencias: null,
  orientacoes: 'Manter exercícios em casa.',
  observacoesFisioterapeuta: null,
  dataCriacao: '2026-05-01T09:00:00',
  dataAtualizacao: null
};

describe('EvolucaoSessaoService', () => {
  let service: EvolucaoSessaoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EvolucaoSessaoService]
    });
    service = TestBed.inject(EvolucaoSessaoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should GET /api/evolucoes-sessao/paciente/:pacienteId', () => {
    service.listarPorPaciente(10).subscribe(lista => expect(lista).toEqual([mockEvolucao]));

    const req = httpMock.expectOne('/api/evolucoes-sessao/paciente/10');
    expect(req.request.method).toBe('GET');
    req.flush([mockEvolucao]);
  });

  it('should return an empty list when the patient has no evolucoes', () => {
    service.listarPorPaciente(10).subscribe(lista => expect(lista).toEqual([]));

    httpMock.expectOne('/api/evolucoes-sessao/paciente/10').flush([]);
  });

  it('should GET /api/evolucoes-sessao/sessao/:sessaoId', () => {
    service.buscarPorSessao(5).subscribe(e => expect(e).toEqual(mockEvolucao));

    const req = httpMock.expectOne('/api/evolucoes-sessao/sessao/5');
    expect(req.request.method).toBe('GET');
    req.flush(mockEvolucao);
  });

  it('should POST to /api/evolucoes-sessao with request body', () => {
    const dto: EvolucaoSessaoRequestDTO = {
      sessaoId: 5,
      dataHoraRegistro: '2026-05-10T10:30:00',
      exerciciosRealizados: 'Agachamento, ponte, dead bug.',
      dorAntes: 5,
      dorDepois: 2
    };

    service.criar(dto).subscribe(e => expect(e).toEqual(mockEvolucao));

    const req = httpMock.expectOne('/api/evolucoes-sessao');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(mockEvolucao);
  });

  it('should PUT to /api/evolucoes-sessao/:id with update body', () => {
    const dto: EvolucaoSessaoUpdateDTO = { dorDepois: 1, observacoesFisioterapeuta: 'Progresso notável.' };

    service.atualizar(1, dto).subscribe(e => expect(e).toEqual(mockEvolucao));

    const req = httpMock.expectOne('/api/evolucoes-sessao/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(dto);
    req.flush(mockEvolucao);
  });
});
