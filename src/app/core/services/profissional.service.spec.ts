import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ProfissionalService } from './profissional.service';
import {
  ProfissionalPage,
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
  totalElements: 1,
  totalPages: 1,
  size: 10,
  number: 0
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
});
