import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { ProfissionalPagamentoRelatorioComponent } from './profissional-pagamento-relatorio.component';
import { ProfissionalService } from '../../../core/services/profissional.service';
import {
  ProfissionalPage,
  ProfissionalPagamentoRelatorioDTO,
  ProfissionalResponseDTO
} from '../../../core/models/profissional';

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
  profissionalId: 1,
  profissionalNome: 'Paula Mendes',
  periodoInicio: '2026-04-01',
  periodoFim: '2026-04-30',
  totalAulas: 1,
  totalPagamento: 11.25,
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
  ]
};

describe('ProfissionalPagamentoRelatorioComponent', () => {
  let component: ProfissionalPagamentoRelatorioComponent;
  let fixture: ComponentFixture<ProfissionalPagamentoRelatorioComponent>;
  let serviceSpy: jasmine.SpyObj<ProfissionalService>;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('ProfissionalService', ['listar', 'relatorioPagamento']);
    serviceSpy.listar.and.returnValue(of(mockPage));
    serviceSpy.relatorioPagamento.and.returnValue(of(mockRelatorio));

    await TestBed.configureTestingModule({
      imports: [ProfissionalPagamentoRelatorioComponent, RouterTestingModule],
      providers: [{ provide: ProfissionalService, useValue: serviceSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfissionalPagamentoRelatorioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load profissionais on init', () => {
    expect(serviceSpy.listar).toHaveBeenCalledWith(0, 100);
    expect(component.profissionais).toEqual([mockProfissional]);
  });

  it('should set erro when loading profissionais fails', () => {
    serviceSpy.listar.and.returnValue(throwError(() => new Error('fail')));

    component.carregarProfissionais();

    expect(component.erro).toBe('Erro ao carregar profissionais.');
  });

  it('should not request report when form is invalid', () => {
    component.form.reset();

    component.consultar();

    expect(serviceSpy.relatorioPagamento).not.toHaveBeenCalled();
  });

  it('should validate period order before requesting report', () => {
    component.form.setValue({ profissionalId: 1, inicio: '2026-04-30', fim: '2026-04-01' });

    component.consultar();

    expect(component.erro).toBe('A data inicial deve ser menor ou igual à data final.');
    expect(serviceSpy.relatorioPagamento).not.toHaveBeenCalled();
  });

  it('should request report and store response', () => {
    component.form.setValue({ profissionalId: 1, inicio: '2026-04-01', fim: '2026-04-30' });

    component.consultar();

    expect(serviceSpy.relatorioPagamento).toHaveBeenCalledWith(1, '2026-04-01', '2026-04-30');
    expect(component.relatorio).toEqual(mockRelatorio);
  });

  it('should set erro when report request fails', () => {
    serviceSpy.relatorioPagamento.and.returnValue(throwError(() => new Error('fail')));
    component.form.setValue({ profissionalId: 1, inicio: '2026-04-01', fim: '2026-04-30' });

    component.consultar();

    expect(component.erro).toBe('Erro ao carregar relatório de pagamento.');
    expect(component.loadingRelatorio).toBeFalse();
  });
});
