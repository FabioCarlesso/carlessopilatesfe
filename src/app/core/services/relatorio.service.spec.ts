import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RelatorioService } from './relatorio.service';
import { RelatorioNfseResponseDTO } from '../models/relatorio';

const mockRelatorioNfse: RelatorioNfseResponseDTO[] = [
  {
    nome: 'Ana Silva',
    cpfCnpj: '123.456.789-00',
    valorPago: 250,
    competencia: '04/2026',
    descricaoServico: 'Aulas de Pilates - Competência 04/2026',
    notaAnteriorEmitida: false,
    dataPagamento: '2026-04-10',
    observacoes: 'Plano mensal'
  }
];

describe('RelatorioService', () => {
  let service: RelatorioService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RelatorioService]
    });
    service = TestBed.inject(RelatorioService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should GET /api/api/relatorios/nfse with competencia param', () => {
    service.relatorioNfse('04/2026').subscribe(relatorio => expect(relatorio).toEqual(mockRelatorioNfse));

    const req = httpMock.expectOne(r => r.url === '/api/api/relatorios/nfse');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('competencia')).toBe('04/2026');
    expect(req.request.params.has('notaAnteriorEmitida')).toBeFalse();
    req.flush(mockRelatorioNfse);
  });

  it('should include notaAnteriorEmitida when filter is informed', () => {
    service.relatorioNfse('04/2026', false).subscribe();

    const req = httpMock.expectOne(r => r.url === '/api/api/relatorios/nfse');
    expect(req.request.params.get('competencia')).toBe('04/2026');
    expect(req.request.params.get('notaAnteriorEmitida')).toBe('false');
    req.flush(mockRelatorioNfse);
  });

  it('should export NFSE report as blob with selected format', () => {
    const blob = new Blob(['xlsx'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    service.exportarRelatorioNfse('04/2026', 'XLSX', true)
      .subscribe(response => expect(response.body).toBe(blob));

    const req = httpMock.expectOne(r => r.url === '/api/api/relatorios/nfse');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('competencia')).toBe('04/2026');
    expect(req.request.params.get('notaAnteriorEmitida')).toBe('true');
    expect(req.request.params.get('formato')).toBe('XLSX');
    expect(req.request.responseType).toBe('blob');
    req.flush(blob);
  });
});
