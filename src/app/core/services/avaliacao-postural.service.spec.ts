import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AvaliacaoPosturalService } from './avaliacao-postural.service';
import { AvaliacaoPosturalFotoResponseDTO, AvaliacaoPosturalResponseDTO } from '../models/avaliacao-postural';

const mockAnalise: AvaliacaoPosturalResponseDTO = {
  id: 10,
  avaliacaoFisioterapeuticaId: 5,
  vista: 'FRENTE',
  status: 'RASCUNHO',
  linhaPrumoX: null,
  calibracaoCmPorUnidade: null,
  proporcaoImagem: null,
  observacoes: null,
  temFoto: false,
  landmarks: [],
  metricas: null,
  dataCriacao: '2026-07-20T10:00:00',
  dataAtualizacao: null
};

const mockFoto: AvaliacaoPosturalFotoResponseDTO = {
  avaliacaoPosturalId: 10,
  contentType: 'image/jpeg',
  tamanhoBytes: 123456,
  larguraPx: 1080,
  alturaPx: 1440,
  dataCriacao: '2026-07-20T10:05:00'
};

describe('AvaliacaoPosturalService', () => {
  let service: AvaliacaoPosturalService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AvaliacaoPosturalService]
    });
    service = TestBed.inject(AvaliacaoPosturalService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should POST to /api/avaliacoes-posturais with request body', () => {
    service.criar({ avaliacaoFisioterapeuticaId: 5, vista: 'FRENTE' }).subscribe(a => expect(a).toEqual(mockAnalise));

    const req = httpMock.expectOne('/api/avaliacoes-posturais');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ avaliacaoFisioterapeuticaId: 5, vista: 'FRENTE' });
    req.flush(mockAnalise);
  });

  it('should GET /api/avaliacoes-posturais/avaliacao-fisioterapeutica/:id', () => {
    service.listarPorAvaliacaoFisioterapeutica(5).subscribe(a => expect(a).toEqual([mockAnalise]));

    const req = httpMock.expectOne('/api/avaliacoes-posturais/avaliacao-fisioterapeutica/5');
    expect(req.request.method).toBe('GET');
    req.flush([mockAnalise]);
  });

  it('should PUT multipart form data to /api/avaliacoes-posturais/:id/foto', () => {
    const arquivo = new File(['conteudo'], 'foto.jpg', { type: 'image/jpeg' });

    service.enviarFoto(10, arquivo).subscribe(f => expect(f).toEqual(mockFoto));

    const req = httpMock.expectOne('/api/avaliacoes-posturais/10/foto');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toBeInstanceOf(FormData);
    expect((req.request.body as FormData).get('foto')).toBe(arquivo);
    req.flush(mockFoto);
  });

  it('should GET /api/avaliacoes-posturais/:id/foto as a Blob', () => {
    const blobEsperado = new Blob(['binario'], { type: 'image/jpeg' });

    service.baixarFoto(10).subscribe(b => expect(b).toEqual(blobEsperado));

    const req = httpMock.expectOne('/api/avaliacoes-posturais/10/foto');
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(blobEsperado);
  });

  it('should PATCH /api/avaliacoes-posturais/:id/cancelar', () => {
    const canceladaEsperada = { ...mockAnalise, status: 'RASCUNHO' as const };

    service.cancelar(10).subscribe(a => expect(a).toEqual(canceladaEsperada));

    const req = httpMock.expectOne('/api/avaliacoes-posturais/10/cancelar');
    expect(req.request.method).toBe('PATCH');
    req.flush(canceladaEsperada);
  });
});
