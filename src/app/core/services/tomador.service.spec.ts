import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TomadorService } from './tomador.service';
import { TomadorResponseDTO } from '../models/tomador';

const mockTomador: TomadorResponseDTO = {
  id: 3,
  nome: 'Empresa Ltda',
  cpfCnpj: '11222333000181',
  email: null,
  telefone: null,
  observacoes: null,
  ativo: true,
  quantidadePacientes: 2,
  version: 0
};

describe('TomadorService', () => {
  let service: TomadorService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(TomadorService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should list with paging, sort and only the filled filters', () => {
    service.listar(0, 20, { nome: 'Emp', cpfCnpj: '', ativo: false }).subscribe();

    const req = http.expectOne(r => r.url === '/api/tomadores');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    expect(req.request.params.get('sort')).toBe('nome');
    expect(req.request.params.get('nome')).toBe('Emp');
    expect(req.request.params.has('cpfCnpj')).toBeFalse();
    expect(req.request.params.get('ativo')).toBe('false');
    req.flush({ content: [mockTomador], page: { size: 20, number: 0, totalElements: 1, totalPages: 1 } });
  });

  it('should get, create, update and list the linked patients', () => {
    service.buscar(3).subscribe(t => expect(t.nome).toBe('Empresa Ltda'));
    http.expectOne('/api/tomadores/3').flush(mockTomador);

    service.cadastrar({ nome: 'Empresa Ltda', cpfCnpj: '11222333000181' }).subscribe();
    const post = http.expectOne('/api/tomadores');
    expect(post.request.method).toBe('POST');
    post.flush(mockTomador);

    service.atualizar(3, { email: '', version: 0 }).subscribe();
    const put = http.expectOne('/api/tomadores/3');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ email: '', version: 0 });
    put.flush(mockTomador);

    service.pacientes(3).subscribe(p => expect(p.length).toBe(1));
    http.expectOne('/api/tomadores/3/pacientes').flush([{ id: 7, nome: 'Ana', ativo: true, cpfNaNota: true }]);
  });

  it('should activate and inactivate with PATCH', () => {
    service.inativar(3).subscribe();
    expect(http.expectOne('/api/tomadores/3/inativar').request.method).toBe('PATCH');
    service.ativar(3).subscribe();
    expect(http.expectOne('/api/tomadores/3/ativar').request.method).toBe('PATCH');
  });
});
