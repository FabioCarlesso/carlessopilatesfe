import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PagamentoService } from './pagamento.service';
import { PagamentoRequestDTO, PagamentoResponseDTO } from '../models/plano';

const mockPagamento: PagamentoResponseDTO = {
  id: 1,
  pacienteId: 10,
  pacienteNome: 'Ana Silva',
  planoId: 1,
  valor: 250,
  status: 'PENDENTE',
  dataPagamento: null,
  dataVencimento: '2026-05-10',
  periodoInicio: '2026-05-01',
  periodoFim: '2026-05-31'
};

describe('PagamentoService', () => {
  let service: PagamentoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PagamentoService]
    });
    service = TestBed.inject(PagamentoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('listar', () => {
    it('should GET /api/pagamentos/paciente/:id', () => {
      service.listar(10).subscribe(p => expect(p).toEqual([mockPagamento]));
      const req = httpMock.expectOne('/api/pagamentos/paciente/10');
      expect(req.request.method).toBe('GET');
      req.flush([mockPagamento]);
    });
  });

  describe('criar', () => {
    it('should POST to /api/pagamentos with body', () => {
      const dto: PagamentoRequestDTO = {
        pacienteId: 10,
        planoId: 1,
        valor: 250,
        dataVencimento: '2026-05-10',
        periodoInicio: '2026-05-01'
      };
      service.criar(dto).subscribe(p => expect(p).toEqual(mockPagamento));
      const req = httpMock.expectOne('/api/pagamentos');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(mockPagamento);
    });
  });

  describe('pagar', () => {
    it('should PATCH /api/pagamentos/:id/pagar with dataPagamento', () => {
      const pagoPagamento = { ...mockPagamento, status: 'PAGO' as const, dataPagamento: '2026-05-05' };
      service.pagar(1, '2026-05-05').subscribe(p => expect(p.status).toBe('PAGO'));
      const req = httpMock.expectOne(r => r.url === '/api/pagamentos/1/pagar');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({});
      expect(req.request.params.get('dataPagamento')).toBe('2026-05-05');
      req.flush(pagoPagamento);
    });
  });
});
