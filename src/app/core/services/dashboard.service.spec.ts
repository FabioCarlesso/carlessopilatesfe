import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DashboardService } from './dashboard.service';
import { DashboardResumoDTO } from '../models/dashboard';

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
});
