import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { PagamentoFormComponent } from './pagamento-form.component';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { PlanoService } from '../../../core/services/plano.service';
import { PagamentoResponseDTO, PlanoResponseDTO } from '../../../core/models/plano';

const mockPlano: PlanoResponseDTO = {
  id: 1,
  pacienteId: 10,
  tipo: 'MENSAL',
  valor: 250,
  frequenciaSemanal: 'DUAS_VEZES',
  dataInicio: '2026-05-01',
  diasSemana: ['MONDAY', 'WEDNESDAY'],
  ativo: true
};

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

describe('PagamentoFormComponent', () => {
  let component: PagamentoFormComponent;
  let fixture: ComponentFixture<PagamentoFormComponent>;
  let pagamentoServiceSpy: jasmine.SpyObj<PagamentoService>;
  let planoServiceSpy: jasmine.SpyObj<PlanoService>;
  let router: Router;

  beforeEach(async () => {
    pagamentoServiceSpy = jasmine.createSpyObj('PagamentoService', ['criar']);
    planoServiceSpy = jasmine.createSpyObj('PlanoService', ['listar']);
    planoServiceSpy.listar.and.returnValue(of([mockPlano]));

    await TestBed.configureTestingModule({
      imports: [PagamentoFormComponent, RouterTestingModule],
      providers: [
        { provide: PagamentoService, useValue: pagamentoServiceSpy },
        { provide: PlanoService, useValue: planoServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: (key: string) => key === 'pacienteId' ? '10' : null } } } }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(PagamentoFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load active planos on init', () => {
    expect(planoServiceSpy.listar).toHaveBeenCalledWith(10);
    expect(component.planos).toEqual([mockPlano]);
  });

  it('should initialize form without periodoFim', () => {
    ['planoId', 'valor', 'dataVencimento', 'periodoInicio'].forEach(ctrl => {
      expect(component.form.contains(ctrl)).toBeTrue();
    });
    expect(component.form.contains('periodoFim')).toBeFalse();
  });

  it('campo() should return the matching AbstractControl', () => {
    expect(component.campo('valor')).toBe(component.form.get('valor'));
  });

  it('should call criar with pacienteId and navigate on valid submit', () => {
    pagamentoServiceSpy.criar.and.returnValue(of(mockPagamento));
    component.form.setValue({
      planoId: '1',
      valor: 250,
      dataVencimento: '2026-05-10',
      periodoInicio: '2026-05-01'
    });

    component.salvar();

    expect(pagamentoServiceSpy.criar).toHaveBeenCalledWith({
      pacienteId: 10,
      planoId: 1,
      valor: 250,
      dataVencimento: '2026-05-10',
      periodoInicio: '2026-05-01'
    });
    expect(router.navigate).toHaveBeenCalledWith(['/pagamentos/paciente', 10]);
  });

  it('should not call criar when form is invalid', () => {
    component.salvar();
    expect(pagamentoServiceSpy.criar).not.toHaveBeenCalled();
  });

  it('should set erro when loading planos fails', () => {
    planoServiceSpy.listar.and.returnValue(throwError(() => new Error('fail')));
    component.carregarPlanos();
    expect(component.erro).toBe('Erro ao carregar planos.');
  });

  it('should set erro when criar fails', () => {
    pagamentoServiceSpy.criar.and.returnValue(throwError(() => new Error('fail')));
    component.form.setValue({
      planoId: '1',
      valor: 250,
      dataVencimento: '2026-05-10',
      periodoInicio: '2026-05-01'
    });

    component.salvar();

    expect(component.erro).toBe('Erro ao registrar pagamento.');
    expect(component.salvando).toBeFalse();
  });

  it('should not load planos when pacienteId route param is invalid', () => {
    const invalidPagamentoServiceSpy = jasmine.createSpyObj('PagamentoService', ['criar']);
    const invalidPlanoServiceSpy = jasmine.createSpyObj('PlanoService', ['listar']);
    const invalidRoute = { snapshot: { paramMap: convertToParamMap({ pacienteId: 'abc' }) } } as ActivatedRoute;
    const invalidRouterSpy = jasmine.createSpyObj('Router', ['navigate']);
    const invalidComponent = new PagamentoFormComponent(
      TestBed.inject(FormBuilder),
      invalidPagamentoServiceSpy,
      invalidPlanoServiceSpy,
      invalidRoute,
      invalidRouterSpy
    );

    invalidComponent.ngOnInit();

    expect(invalidComponent.erro).toBe('Identificador inválido.');
    expect(invalidPlanoServiceSpy.listar).not.toHaveBeenCalled();
  });
});
