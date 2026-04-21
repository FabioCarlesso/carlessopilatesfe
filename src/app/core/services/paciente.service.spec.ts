import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PacienteService } from './paciente.service';
import { Page, PacienteRequestDTO, PacienteResponseDTO, PacienteUpdateDTO } from '../models/paciente';

const mockPaciente: PacienteResponseDTO = {
  id: 1,
  nome: 'Ana Silva',
  email: 'ana@email.com',
  cpf: '123.456.789-00',
  telefone: '(11) 99999-9999',
  dataNascimento: '1990-05-15',
  endereco: null,
  ativo: true
};

const mockPage: Page<PacienteResponseDTO> = {
  content: [mockPaciente],
  totalElements: 1,
  totalPages: 1,
  size: 10,
  number: 0
};

describe('PacienteService', () => {
  let service: PacienteService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PacienteService]
    });
    service = TestBed.inject(PacienteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('listar', () => {
    it('should GET /api/pacientes with default params (page=0, size=10, sort=nome)', () => {
      service.listar().subscribe(page => {
        expect(page.content).toEqual([mockPaciente]);
        expect(page.totalPages).toBe(1);
      });

      const req = httpMock.expectOne(r => r.url === '/api/pacientes');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('0');
      expect(req.request.params.get('size')).toBe('10');
      expect(req.request.params.get('sort')).toBe('nome');
      req.flush(mockPage);
    });

    it('should pass custom page and size params', () => {
      service.listar(2, 5).subscribe();

      const req = httpMock.expectOne(r => r.url === '/api/pacientes');
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('size')).toBe('5');
      req.flush({ ...mockPage, size: 5, number: 2 });
    });
  });

  describe('buscar', () => {
    it('should GET /api/pacientes/:id and return the patient', () => {
      service.buscar(1).subscribe(p => expect(p).toEqual(mockPaciente));

      const req = httpMock.expectOne('/api/pacientes/1');
      expect(req.request.method).toBe('GET');
      req.flush(mockPaciente);
    });
  });

  describe('cadastrar', () => {
    it('should POST to /api/pacientes with request body and return created patient', () => {
      const dto: PacienteRequestDTO = {
        nome: 'Ana Silva',
        email: 'ana@email.com',
        cpf: '123.456.789-00'
      };

      service.cadastrar(dto).subscribe(p => expect(p).toEqual(mockPaciente));

      const req = httpMock.expectOne('/api/pacientes');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(dto);
      req.flush(mockPaciente);
    });
  });

  describe('atualizar', () => {
    it('should PUT to /api/pacientes/:id with request body and return updated patient', () => {
      const dto: PacienteUpdateDTO = { nome: 'Ana Updated', email: 'nova@email.com' };

      service.atualizar(1, dto).subscribe(p => expect(p).toEqual(mockPaciente));

      const req = httpMock.expectOne('/api/pacientes/1');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(dto);
      req.flush(mockPaciente);
    });
  });

  describe('ativar', () => {
    it('should PATCH /api/pacientes/:id/ativar', () => {
      service.ativar(1).subscribe();

      const req = httpMock.expectOne('/api/pacientes/1/ativar');
      expect(req.request.method).toBe('PATCH');
      req.flush(null);
    });
  });

  describe('inativar', () => {
    it('should PATCH /api/pacientes/:id/inativar', () => {
      service.inativar(1).subscribe();

      const req = httpMock.expectOne('/api/pacientes/1/inativar');
      expect(req.request.method).toBe('PATCH');
      req.flush(null);
    });
  });
});
