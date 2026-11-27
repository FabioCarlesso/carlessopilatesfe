import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PontoDorService } from './ponto-dor.service';
import { TRATA_403_LOCALMENTE } from '../interceptors/forbidden.interceptor';
import { PontoDor, PontoDorDTO, PontosDorRegistroDTO } from '../models/ponto-dor';

const ponto: PontoDor = { vista: 'FRENTE', x: 0.5, y: 0.25, desenhoVersao: 1, intensidade: 7, observacao: 'Pontada' };
const gravado: PontoDorDTO = { ...ponto, id: 3 };

describe('PontoDorService', () => {
  let service: PontoDorService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(PontoDorService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should GET the points of an assessment, handling 403 locally', () => {
    service.listar('AVALIACAO', 5).subscribe(r => expect(r).toEqual([gravado]));

    const req = httpMock.expectOne('/api/avaliacoes-fisioterapeuticas/5/pontos-dor');
    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(TRATA_403_LOCALMENTE)).toBeTrue();
    req.flush([gravado]);
  });

  it('should GET the points of a reassessment', () => {
    service.listar('REAVALIACAO', 8).subscribe();

    const req = httpMock.expectOne('/api/reavaliacoes/8/pontos-dor');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should PUT the whole set without ids, trimming the note', () => {
    service.salvar('REAVALIACAO', 8, [{ ...gravado, observacao: '  Pontada  ' } as PontoDor, { ...ponto, observacao: '   ' }])
      .subscribe(r => expect(r).toEqual([gravado]));

    const req = httpMock.expectOne('/api/reavaliacoes/8/pontos-dor');
    expect(req.request.method).toBe('PUT');
    expect(req.request.context.get(TRATA_403_LOCALMENTE)).toBeTrue();
    expect(req.request.body).toEqual({ pontos: [ponto, { ...ponto, observacao: null }] });
    req.flush([gravado]);
  });

  it('should PUT an empty list to clear the points of an assessment', () => {
    service.salvar('AVALIACAO', 5, []).subscribe();

    const req = httpMock.expectOne('/api/avaliacoes-fisioterapeuticas/5/pontos-dor');
    expect(req.request.body).toEqual({ pontos: [] });
    req.flush([]);
  });

  it('should GET the history of the patient', () => {
    const historico: PontosDorRegistroDTO[] = [
      { origem: 'AVALIACAO', registroId: 5, data: '2026-01-10', pontos: [gravado] }
    ];
    service.historicoDoPaciente(10).subscribe(r => expect(r).toEqual(historico));

    const req = httpMock.expectOne('/api/pacientes/10/pontos-dor');
    expect(req.request.method).toBe('GET');
    expect(req.request.context.get(TRATA_403_LOCALMENTE)).toBeTrue();
    req.flush(historico);
  });
});
