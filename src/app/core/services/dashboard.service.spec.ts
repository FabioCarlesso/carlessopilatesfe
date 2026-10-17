import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DashboardService } from './dashboard.service';
import { AulasPorProfissionalDTO, DashboardIndicadoresDTO, DashboardResumoDTO } from '../models/dashboard';

const mockResumo: DashboardResumoDTO = {
  pacientes: {
    totalAtivos: 10,
    totalInativos: 2
  },
  profissionais: {
    totalAtivos: 3,
    totalInativos: 1
  },
  pagamentos: {
    totalPendentes: 5,
    totalPagos: 8,
    totalVencidos: 2,
    receitaMesAtual: 1600
  },
  aulas: {
    totalRealizadasMesAtual: 40,
    totalAgendadasMesAtual: 20
  },
  geradoEm: '2026-04-29T10:00:00'
};

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DashboardService]
    });
    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should GET /api/dashboard/resumo', () => {
    service.resumo().subscribe(resumo => expect(resumo).toEqual(mockResumo));

    const req = httpMock.expectOne('/api/dashboard/resumo');
    expect(req.request.method).toBe('GET');
    req.flush(mockResumo);
  });

  it('should GET /api/dashboard/indicadores with meses', () => {
    const indicadores: DashboardIndicadoresDTO = {
      meses: 6,
      receita: [{ mes: '2026-01', receita: 1500 }],
      aulas: [{ mes: '2026-01', realizadas: 40, agendadas: 5 }],
      pacientes: [{ mes: '2026-01', novos: 3, inativados: 1 }],
      geradoEm: '2026-01-20T10:00:00'
    };

    service.indicadores(6).subscribe(resposta => expect(resposta).toEqual(indicadores));

    const req = httpMock.expectOne(r => r.url === '/api/dashboard/indicadores');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('meses')).toBe('6');
    req.flush(indicadores);
  });

  it('should GET /api/dashboard/aulas-por-profissional with the period', () => {
    const ranking: AulasPorProfissionalDTO[] = [{ profissionalId: 2, nome: 'Paula', totalRealizadas: 30 }];

    service.aulasPorProfissional('2026-01-01', '2026-06-30').subscribe(resposta => expect(resposta).toEqual(ranking));

    const req = httpMock.expectOne(r => r.url === '/api/dashboard/aulas-por-profissional');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('inicio')).toBe('2026-01-01');
    expect(req.request.params.get('fim')).toBe('2026-06-30');
    req.flush(ranking);
  });
});
