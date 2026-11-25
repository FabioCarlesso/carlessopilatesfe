import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RelatorioService } from './relatorio.service';
import { RelatorioFinanceiroDTO, RelatorioNfseResponseDTO } from '../models/relatorio';
import { TRATA_403_LOCALMENTE } from '../interceptors/forbidden.interceptor';
import { RelatorioRecebimentosDTO } from '../models/relatorio-recebimentos';

const mockRelatorioNfse: RelatorioNfseResponseDTO[] = [
  {
    pacienteId: 1,
    nome: 'Ana Silva',
    cpfCnpj: '123.456.789-00',
    valorPago: 250,
    competencia: '04/2026',
    descricaoServico: 'Aulas de Pilates - Competência 04/2026',
    notaAnteriorEmitida: false,
    dataPagamento: '2026-04-10',
    observacoes: 'Plano mensal',
    cpfNaNota: true,
    pendencia: null,
    pacienteNome: 'Paciente Teste',
    tomadorId: null
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
    expect(req.request.params.has('cpfNaNota')).toBeFalse();
    req.flush(mockRelatorioNfse);
  });

  it('should include notaAnteriorEmitida when filter is informed', () => {
    service.relatorioNfse('04/2026', { notaAnteriorEmitida: false }).subscribe();

    const req = httpMock.expectOne(r => r.url === '/api/api/relatorios/nfse');
    expect(req.request.params.get('competencia')).toBe('04/2026');
    expect(req.request.params.get('notaAnteriorEmitida')).toBe('false');
    expect(req.request.params.has('cpfNaNota')).toBeFalse();
    req.flush(mockRelatorioNfse);
  });

  it('should include cpfNaNota when filter is informed and skip null filters', () => {
    service.relatorioNfse('04/2026', { notaAnteriorEmitida: null, cpfNaNota: true }).subscribe();

    const req = httpMock.expectOne(r => r.url === '/api/api/relatorios/nfse');
    expect(req.request.params.get('cpfNaNota')).toBe('true');
    expect(req.request.params.has('notaAnteriorEmitida')).toBeFalse();
    req.flush(mockRelatorioNfse);
  });

  it('should export NFSE report as blob with selected format', () => {
    const blob = new Blob(['xlsx'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    service.exportarRelatorioNfse('04/2026', 'XLSX', { notaAnteriorEmitida: true, cpfNaNota: false })
      .subscribe(response => expect(response.body).toBe(blob));

    const req = httpMock.expectOne(r => r.url === '/api/api/relatorios/nfse');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('competencia')).toBe('04/2026');
    expect(req.request.params.get('notaAnteriorEmitida')).toBe('true');
    expect(req.request.params.get('cpfNaNota')).toBe('false');
    expect(req.request.params.get('formato')).toBe('XLSX');
    expect(req.request.responseType).toBe('blob');
    req.flush(blob);
  });

  it('should GET the consolidated financial report with inicio and fim', () => {
    const relatorio = { resultadoLiquido: 100 } as RelatorioFinanceiroDTO;
    service.relatorioFinanceiro('2026-10-01', '2026-10-31').subscribe(r => expect(r).toEqual(relatorio));

    const req = httpMock.expectOne(r => r.url === '/api/api/relatorios/financeiro');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('inicio')).toBe('2026-10-01');
    expect(req.request.params.get('fim')).toBe('2026-10-31');
    expect(req.request.context.get(TRATA_403_LOCALMENTE)).toBeTrue();
    req.flush(relatorio);
  });

  for (const formato of ['pdf', 'xlsx'] as const) {
    it(`should export the financial report as ${formato} blob through its own route`, () => {
      const blob = new Blob([formato]);
      service.exportarRelatorioFinanceiro('2026-10-01', '2026-10-31', formato)
        .subscribe(response => expect(response.body).toBe(blob));

      const req = httpMock.expectOne(r => r.url === `/api/api/relatorios/financeiro/${formato}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('inicio')).toBe('2026-10-01');
      expect(req.request.params.get('fim')).toBe('2026-10-31');
      expect(req.request.params.has('formato')).toBeFalse();
      expect(req.request.responseType).toBe('blob');
      expect(req.request.context.get(TRATA_403_LOCALMENTE)).toBeTrue();
      req.flush(blob);
    });
  }

  describe('recebimentos do período', () => {
    it('should GET the receipts report with the period only when no filter is informed', () => {
      const relatorio = { recebimentos: [] } as unknown as RelatorioRecebimentosDTO;
      service.relatorioRecebimentos('2026-11-01', '2026-11-30').subscribe(r => expect(r).toEqual(relatorio));

      const req = httpMock.expectOne(r => r.url === '/api/api/relatorios/recebimentos');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys().sort()).toEqual(['fim', 'inicio']);
      expect(req.request.params.get('inicio')).toBe('2026-11-01');
      expect(req.request.params.get('fim')).toBe('2026-11-30');
      expect(req.request.context.get(TRATA_403_LOCALMENTE)).toBeTrue();
      req.flush(relatorio);
    });

    it('should send formaPagamento (including NAO_INFORMADA) and pacienteId and skip null filters', () => {
      service.relatorioRecebimentos('2026-11-01', '2026-11-30', { formaPagamento: 'NAO_INFORMADA', pacienteId: 7 })
        .subscribe();
      const req = httpMock.expectOne(r => r.url === '/api/api/relatorios/recebimentos');
      expect(req.request.params.get('formaPagamento')).toBe('NAO_INFORMADA');
      expect(req.request.params.get('pacienteId')).toBe('7');
      req.flush({});

      service.relatorioRecebimentos('2026-11-01', '2026-11-30', { formaPagamento: null, pacienteId: null }).subscribe();
      const semFiltro = httpMock.expectOne(r => r.url === '/api/api/relatorios/recebimentos');
      expect(semFiltro.request.params.has('formaPagamento')).toBeFalse();
      expect(semFiltro.request.params.has('pacienteId')).toBeFalse();
      semFiltro.flush({});
    });

    for (const formato of ['pdf', 'xlsx'] as const) {
      it(`should export the receipts report as ${formato} blob through its own route, with the filters`, () => {
        const blob = new Blob([formato]);
        service.exportarRelatorioRecebimentos('2026-11-01', '2026-11-30', formato, { formaPagamento: 'PIX', pacienteId: 3 })
          .subscribe(response => expect(response.body).toBe(blob));

        const req = httpMock.expectOne(r => r.url === `/api/api/relatorios/recebimentos/${formato}`);
        expect(req.request.method).toBe('GET');
        expect(req.request.params.get('inicio')).toBe('2026-11-01');
        expect(req.request.params.get('fim')).toBe('2026-11-30');
        expect(req.request.params.get('formaPagamento')).toBe('PIX');
        expect(req.request.params.get('pacienteId')).toBe('3');
        expect(req.request.responseType).toBe('blob');
        expect(req.request.context.get(TRATA_403_LOCALMENTE)).toBeTrue();
        req.flush(blob);
      });
    }
  });

  describe('relatório de pacientes', () => {
    it('should GET /api/api/relatorios/pacientes sem parâmetros quando não há filtro', () => {
      service.relatorioPacientes().subscribe();

      const req = httpMock.expectOne(r => r.url === '/api/api/relatorios/pacientes');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys()).toEqual([]);
      expect(req.request.context.get(TRATA_403_LOCALMENTE)).toBeTrue();
      req.flush({});
    });

    it('should send every informed filter and skip the false booleans', () => {
      service.relatorioPacientes({
        situacao: 'TODOS',
        semPlanoAtivo: false,
        cadastroIncompleto: true,
        mesNascimento: 12,
        profissionalId: 5
      }).subscribe();

      const req = httpMock.expectOne(r => r.url === '/api/api/relatorios/pacientes');
      expect(req.request.params.get('situacao')).toBe('TODOS');
      expect(req.request.params.has('semPlanoAtivo')).toBeFalse();
      expect(req.request.params.get('cadastroIncompleto')).toBe('true');
      expect(req.request.params.get('mesNascimento')).toBe('12');
      expect(req.request.params.get('profissionalId')).toBe('5');
      req.flush({});
    });

    for (const formato of ['pdf', 'xlsx'] as const) {
      it(`should export the patients report as ${formato} blob through its own route`, () => {
        const blob = new Blob([formato]);
        service.exportarRelatorioPacientes(formato, { situacao: 'INATIVOS', semPlanoAtivo: true })
          .subscribe(response => expect(response.body).toBe(blob));

        const req = httpMock.expectOne(r => r.url === `/api/api/relatorios/pacientes/${formato}`);
        expect(req.request.method).toBe('GET');
        expect(req.request.params.get('situacao')).toBe('INATIVOS');
        expect(req.request.params.get('semPlanoAtivo')).toBe('true');
        expect(req.request.responseType).toBe('blob');
        expect(req.request.context.get(TRATA_403_LOCALMENTE)).toBeTrue();
        req.flush(blob);
      });
    }
  });

  describe('ocupação da grade', () => {
    it('should GET /api/api/relatorios/ocupacao without params when no filter is given', () => {
      service.relatorioOcupacao().subscribe();

      const req = httpMock.expectOne(r => r.url === '/api/api/relatorios/ocupacao');
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys()).toEqual([]);
      expect(req.request.context.get(TRATA_403_LOCALMENTE)).toBeTrue();
      req.flush({});
    });

    it('should send semana and profissionalId and skip null filters', () => {
      service.relatorioOcupacao({ semana: '2026-11-25', profissionalId: 5 }).subscribe();
      const req = httpMock.expectOne(r => r.url === '/api/api/relatorios/ocupacao');
      expect(req.request.params.get('semana')).toBe('2026-11-25');
      expect(req.request.params.get('profissionalId')).toBe('5');
      req.flush({});

      service.relatorioOcupacao({ semana: null, profissionalId: null }).subscribe();
      const semFiltro = httpMock.expectOne(r => r.url === '/api/api/relatorios/ocupacao');
      expect(semFiltro.request.params.keys()).toEqual([]);
      semFiltro.flush({});
    });
  });
});
