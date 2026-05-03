import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AvaliacaoFisioterapeuticaService } from './avaliacao-fisioterapeutica.service';
import {
  AvaliacaoFisioterapeuticaRequestDTO,
  AvaliacaoFisioterapeuticaResponseDTO,
  AvaliacaoFisioterapeuticaUpdateDTO
} from '../models/avaliacao-fisioterapeutica';

const mockAvaliacao: AvaliacaoFisioterapeuticaResponseDTO = {
  id: 5,
  pacienteId: 1,
  nomePaciente: 'Ana Silva',
  dataAvaliacao: '2026-05-03',
  queixaFuncional: 'Dor no joelho direito',
  avaliacaoPostural: null,
  mobilidadeArticular: 'Redução de amplitude',
  forcaMuscular: 'Grau 4',
  flexibilidade: null,
  equilibrio: null,
  coordenacaoMotora: null,
  padraoRespiratorio: null,
  escalaDor: 7,
  testesFuncionaisRealizados: null,
  diagnosticoFisioterapeutico: 'Gonartrose',
  observacoesGerais: null,
  dataCriacao: '2026-05-03T10:00:00',
  dataAtualizacao: null
};

describe('AvaliacaoFisioterapeuticaService', () => {
  let service: AvaliacaoFisioterapeuticaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AvaliacaoFisioterapeuticaService]
    });
    service = TestBed.inject(AvaliacaoFisioterapeuticaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should GET /api/avaliacoes-fisioterapeuticas/paciente/:pacienteId', () => {
    service.listarPorPaciente(1).subscribe(a => expect(a).toEqual([mockAvaliacao]));

    const req = httpMock.expectOne('/api/avaliacoes-fisioterapeuticas/paciente/1');
    expect(req.request.method).toBe('GET');
    req.flush([mockAvaliacao]);
  });

  it('should POST to /api/avaliacoes-fisioterapeuticas with request body', () => {
    const dto: AvaliacaoFisioterapeuticaRequestDTO = {
      pacienteId: 1,
      dataAvaliacao: '2026-05-03',
      queixaFuncional: 'Dor no joelho direito',
      escalaDor: 7,
      diagnosticoFisioterapeutico: 'Gonartrose'
    };

    service.criar(dto).subscribe(a => expect(a).toEqual(mockAvaliacao));

    const req = httpMock.expectOne('/api/avaliacoes-fisioterapeuticas');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(mockAvaliacao);
  });

  it('should PUT to /api/avaliacoes-fisioterapeuticas/:id with update body', () => {
    const dto: AvaliacaoFisioterapeuticaUpdateDTO = {
      dataAvaliacao: '2026-05-04',
      queixaFuncional: 'Dor no joelho esquerdo',
      escalaDor: 6,
      diagnosticoFisioterapeutico: 'Gonalgia'
    };

    service.atualizar(5, dto).subscribe(a => expect(a).toEqual(mockAvaliacao));

    const req = httpMock.expectOne('/api/avaliacoes-fisioterapeuticas/5');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(dto);
    req.flush(mockAvaliacao);
  });
});
