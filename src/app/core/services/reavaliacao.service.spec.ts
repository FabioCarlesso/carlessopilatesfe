import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReavaliacaoService } from './reavaliacao.service';
import {
  ReavaliacaoRequestDTO,
  ReavaliacaoResponseDTO,
  ReavaliacaoUpdateDTO
} from '../models/reavaliacao';

const mockReavaliacao: ReavaliacaoResponseDTO = {
  id: 1,
  pacienteId: 10,
  nomePaciente: 'Ana Silva',
  dataReavaliacao: '2026-05-10',
  comparativoAvaliacaoAnterior: 'Melhora significativa.',
  evolucaoDor: 'Redução de 7 para 3.',
  evolucaoForca: 'Aumento de força no core.',
  evolucaoMobilidade: null,
  evolucaoFuncional: null,
  objetivosAlcancados: 'Redução de dor.',
  pontosAtencao: null,
  ajustesPlanoTratamento: null,
  observacoesGerais: null,
  dataCriacao: '2026-05-10T09:00:00',
  dataAtualizacao: null
};

describe('ReavaliacaoService', () => {
  let service: ReavaliacaoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ReavaliacaoService]
    });
    service = TestBed.inject(ReavaliacaoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should GET /api/reavaliacoes/paciente/:pacienteId', () => {
    service.listarPorPaciente(10).subscribe(r => expect(r).toEqual([mockReavaliacao]));

    const req = httpMock.expectOne('/api/reavaliacoes/paciente/10');
    expect(req.request.method).toBe('GET');
    req.flush([mockReavaliacao]);
  });

  it('should GET /api/reavaliacoes/:id', () => {
    service.buscar(1).subscribe(r => expect(r).toEqual(mockReavaliacao));

    const req = httpMock.expectOne('/api/reavaliacoes/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockReavaliacao);
  });

  it('should POST to /api/reavaliacoes with request body', () => {
    const dto: ReavaliacaoRequestDTO = {
      pacienteId: 10,
      dataReavaliacao: '2026-05-10',
      evolucaoDor: 'Redução de 7 para 3.'
    };

    service.criar(dto).subscribe(r => expect(r).toEqual(mockReavaliacao));

    const req = httpMock.expectOne('/api/reavaliacoes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(mockReavaliacao);
  });

  it('should PUT to /api/reavaliacoes/:id with update body', () => {
    const dto: ReavaliacaoUpdateDTO = { observacoesGerais: 'Excelente progresso.' };

    service.atualizar(1, dto).subscribe(r => expect(r).toEqual(mockReavaliacao));

    const req = httpMock.expectOne('/api/reavaliacoes/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(dto);
    req.flush(mockReavaliacao);
  });
});
