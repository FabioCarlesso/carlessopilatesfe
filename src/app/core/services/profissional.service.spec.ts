import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProfissionalService } from './profissional.service';
import {
  ProfissionalPage,
  ProfissionalPagamentoRelatorioDTO,
  ProfissionalRequestDTO,
  ProfissionalResponseDTO,
  ProfissionalUpdateDTO
} from '../models/profissional';

const mockProfissional: ProfissionalResponseDTO = {
  id: 1,
  nome: 'Paula Mendes',
  email: 'paula@carlessopilates.com',
  cpf: '123.456.111-00',
  telefone: '(11) 98888-1111',
  tipoContrato: 'PJ',
  percentualPagamentoAula: 45,
  dataInicio: '2024-01-15',
  ativo: true
};

const mockPage: ProfissionalPage = {
  content: [mockProfissional],
  page: { totalElements: 1, totalPages: 1, size: 10, number: 0 }
};

const mockRelatorio: ProfissionalPagamentoRelatorioDTO = {
  profissional: {
    id: 1,
    nome: 'Paula Mendes',
    cpf: '123.456.111-00',
    tipoContrato: 'PJ',
    percentualPagamentoAula: 45
  },
  periodo: { inicio: '2026-04-01', fim: '2026-04-30' },
  resumo: {
    totalAulas: 1,
    quantidadePagamentos: 1,
    totalPagamentosBruto: 200,
    totalProfissional: 11.25
  },
  pagamentos: [
    {
      pagamentoId: 5,
      valorPagamento: 200,
      quantidadeAulasPagamento: 8,
      quantidadeAulasNoPeriodo: 1,
      valorBaseAula: 25,
      totalProfissional: 11.25
    }
  ],
  aulas: [
    {
      aulaId: 10,
      data: '2026-04-03',
      pacienteId: 2,
      pacienteNome: 'Ana Silva',
      pagamentoId: 5,
      valorPagamento: 200,
      quantidadeAulasPagamento: 8,
      valorBaseAula: 25,
      percentualPagamentoAula: 45,
      valorProfissional: 11.25
    }
  ],
  geradoEm: '2026-04-27T10:00:00'
};

describe('ProfissionalService', () => {
  let service: ProfissionalService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProfissionalService]
    });
    service = TestBed.inject(ProfissionalService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should GET /api/profissionais with default params', () => {
    service.listar().subscribe(page => expect(page.content).toEqual([mockProfissional]));

    const req = httpMock.expectOne(r => r.url === '/api/profissionais');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');
    expect(req.request.params.get('sort')).toBe('nome');
    req.flush(mockPage);
  });

  it('should pass custom page and size params', () => {
    service.listar(2, 5).subscribe();

    const req = httpMock.expectOne(r => r.url === '/api/profissionais');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('5');
    req.flush(mockPage);
  });

  it('should pass filter params when provided', () => {
    service.listar(0, 10, {
      nome: 'Paula',
      email: 'paula@carlessopilates.com',
      tipoContrato: 'PJ',
      percentualPagamentoAula: 45,
      ativo: false
    }).subscribe();

    const req = httpMock.expectOne(r => r.url === '/api/profissionais');
    expect(req.request.params.get('nome')).toBe('Paula');
    expect(req.request.params.get('email')).toBe('paula@carlessopilates.com');
    expect(req.request.params.get('tipoContrato')).toBe('PJ');
    expect(req.request.params.get('percentualPagamentoAula')).toBe('45');
    expect(req.request.params.get('ativo')).toBe('false');
    req.flush(mockPage);
  });

  it('should ignore empty filter params', () => {
    service.listar(0, 10, {
      nome: '',
      email: undefined,
      ativo: true
    }).subscribe();

    const req = httpMock.expectOne(r => r.url === '/api/profissionais');
    expect(req.request.params.has('nome')).toBeFalse();
    expect(req.request.params.has('email')).toBeFalse();
    expect(req.request.params.get('ativo')).toBe('true');
    req.flush(mockPage);
  });

  it('should GET /api/profissionais/:id', () => {
    service.buscar(1).subscribe(item => expect(item).toEqual(mockProfissional));

    const req = httpMock.expectOne('/api/profissionais/1');
    expect(req.request.method).toBe('GET');
    req.flush(mockProfissional);
  });

  it('should POST /api/profissionais', () => {
    const dto: ProfissionalRequestDTO = {
      nome: 'Paula Mendes',
      email: 'paula@carlessopilates.com',
      cpf: '123.456.111-00',
      telefone: '(11) 98888-1111',
      tipoContrato: 'PJ',
      percentualPagamentoAula: 45,
      dataInicio: '2024-01-15'
    };

    service.cadastrar(dto).subscribe(item => expect(item).toEqual(mockProfissional));

    const req = httpMock.expectOne('/api/profissionais');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(mockProfissional);
  });

  it('should PUT /api/profissionais/:id', () => {
    const dto: ProfissionalUpdateDTO = { nome: 'Paula Atualizada', percentualPagamentoAula: 50 };

    service.atualizar(1, dto).subscribe(item => expect(item).toEqual(mockProfissional));

    const req = httpMock.expectOne('/api/profissionais/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(dto);
    req.flush(mockProfissional);
  });

  it('should PATCH /api/profissionais/:id/ativar', () => {
    service.ativar(1).subscribe();

    const req = httpMock.expectOne('/api/profissionais/1/ativar');
    expect(req.request.method).toBe('PATCH');
    req.flush(null);
  });

  it('should PATCH /api/profissionais/:id/inativar', () => {
    service.inativar(1).subscribe();

    const req = httpMock.expectOne('/api/profissionais/1/inativar');
    expect(req.request.method).toBe('PATCH');
    req.flush(null);
  });

  it('should GET /api/profissionais/:id/relatorio-pagamento with period params', () => {
    service.relatorioPagamento(1, '2026-04-01', '2026-04-30')
      .subscribe(relatorio => expect(relatorio).toEqual(mockRelatorio));

    const req = httpMock.expectOne(r => r.url === '/api/profissionais/1/relatorio-pagamento');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('inicio')).toBe('2026-04-01');
    expect(req.request.params.get('fim')).toBe('2026-04-30');
    req.flush(mockRelatorio);
  });

  it('should GET PDF report export as blob observing response', () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' });

    service.exportarRelatorioPagamentoProfissionalPdf(1, '2026-04-01', '2026-04-30')
      .subscribe(response => expect(response.body).toBe(blob));

    const req = httpMock.expectOne(r => r.url === '/api/profissionais/1/relatorio-pagamento/pdf');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('inicio')).toBe('2026-04-01');
    expect(req.request.params.get('fim')).toBe('2026-04-30');
    expect(req.request.responseType).toBe('blob');
    req.flush(blob);
  });

  it('should GET XLSX report export as blob observing response', () => {
    const blob = new Blob(['xlsx'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    service.exportarRelatorioPagamentoProfissionalExcel(1, '2026-04-01', '2026-04-30')
      .subscribe(response => expect(response.body).toBe(blob));

    const req = httpMock.expectOne(r => r.url === '/api/profissionais/1/relatorio-pagamento/xlsx');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('inicio')).toBe('2026-04-01');
    expect(req.request.params.get('fim')).toBe('2026-04-30');
    expect(req.request.responseType).toBe('blob');
    req.flush(blob);
  });
});
