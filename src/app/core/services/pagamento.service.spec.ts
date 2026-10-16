import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PagamentoService } from './pagamento.service';
import { PagamentoRequestDTO, PagamentoResponseDTO } from '../models/plano';
import { pagina } from '../../../testing/pagina';

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
      const req = httpMock.expectOne('/api/pagamentos/paciente/10?page=0&size=2000&sort=dataVencimento,asc');
      expect(req.request.method).toBe('GET');
      req.flush(pagina([mockPagamento]));
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

  describe('listarTodos', () => {
    const pagina = {
      content: [mockPagamento],
      page: { size: 10, number: 0, totalElements: 1, totalPages: 1 }
    };

    it('should GET /api/pagamentos with pagination and the default sort', () => {
      service.listarTodos().subscribe(p => expect(p).toEqual(pagina));
      const req = httpMock.expectOne(r => r.url === '/api/pagamentos');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('0');
      expect(req.request.params.get('size')).toBe('10');
      expect(req.request.params.get('sort')).toBe('dataVencimento,asc');
      expect(req.request.params.has('status')).toBeFalse();
      expect(req.request.params.has('vencimentoDe')).toBeFalse();
      expect(req.request.params.has('vencimentoAte')).toBeFalse();
      expect(req.request.params.has('pacienteId')).toBeFalse();
      req.flush(pagina);
    });

    it('should repeat status and send every filled filter', () => {
      service.listarTodos(
        { status: ['PENDENTE', 'VENCIDO'], vencimentoDe: '2026-01-01', vencimentoAte: '2026-06-30', pacienteId: 10 },
        2,
        20,
        'paciente.nome,desc'
      ).subscribe();
      const req = httpMock.expectOne(r => r.url === '/api/pagamentos');
      expect(req.request.params.getAll('status')).toEqual(['PENDENTE', 'VENCIDO']);
      expect(req.request.params.get('vencimentoDe')).toBe('2026-01-01');
      expect(req.request.params.get('vencimentoAte')).toBe('2026-06-30');
      expect(req.request.params.get('pacienteId')).toBe('10');
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('size')).toBe('20');
      expect(req.request.params.get('sort')).toBe('paciente.nome,desc');
      expect(req.request.urlWithParams).toContain('status=PENDENTE&status=VENCIDO');
      req.flush(pagina);
    });

    it('should send one sort param per criterion, in order', () => {
      service.listarTodos({}, 0, 10, ['status,desc', 'dataVencimento,asc']).subscribe();
      const req = httpMock.expectOne(r => r.url === '/api/pagamentos');
      expect(req.request.params.getAll('sort')).toEqual(['status,desc', 'dataVencimento,asc']);
      req.flush(pagina);
    });

    it('should leave empty filters out of the query', () => {
      service.listarTodos({ status: [], vencimentoDe: '', vencimentoAte: '' }).subscribe();
      const req = httpMock.expectOne(r => r.url === '/api/pagamentos');
      expect(req.request.params.keys().sort()).toEqual(['page', 'size', 'sort']);
      req.flush(pagina);
    });
  });

  describe('cobranças', () => {
    const contato = {
      id: 5,
      pagamentoId: 1,
      dataContato: '2026-05-12',
      observacao: 'Ligação: prometeu pagar na sexta.',
      registradoPor: 'admin@carlesso.com',
      registradoEm: '2026-05-12T14:03:00'
    };

    it('should GET /api/pagamentos/:id/cobrancas', () => {
      service.listarCobrancas(1).subscribe(c => expect(c).toEqual([contato]));
      const req = httpMock.expectOne('/api/pagamentos/1/cobrancas');
      expect(req.request.method).toBe('GET');
      req.flush([contato]);
    });

    it('should POST /api/pagamentos/:id/cobrancas with body', () => {
      const dto = { dataContato: '2026-05-12', observacao: 'Ligação: prometeu pagar na sexta.' };
      service.registrarCobranca(1, dto).subscribe(c => expect(c).toEqual(contato));
      const req = httpMock.expectOne('/api/pagamentos/1/cobrancas');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(contato, { status: 201, statusText: 'Created' });
    });
  });
});
