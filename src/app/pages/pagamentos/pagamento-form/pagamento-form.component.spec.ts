import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ElementRef } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
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
  horario: null,
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
      invalidRouterSpy,
      new ElementRef(document.createElement('div'))
    );

    invalidComponent.ngOnInit();

    expect(invalidComponent.erro).toBe('Identificador inválido.');
    expect(invalidPlanoServiceSpy.listar).not.toHaveBeenCalled();
  });

  it('should open without renewal prefill when there are no query params', () => {
    expect(component.renovacao).toBeFalse();
    expect(component.form.value).toEqual({ planoId: null, valor: null, dataVencimento: '', periodoInicio: '' });
    expect(fixture.nativeElement.querySelector('[data-testid="aviso-renovacao"]')).toBeNull();
  });

  it('should show the API message and a link to the patient payments on 409', () => {
    pagamentoServiceSpy.criar.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409,
      error: { type: 'https://carlesso/problemas/conflict', detail: 'Já existe um pagamento para este plano no período iniciado em 2026-05-01' }
    })));
    component.form.setValue({ planoId: '1', valor: 250, dataVencimento: '2026-05-10', periodoInicio: '2026-05-01' });

    component.salvar();
    fixture.detectChanges();

    expect(component.erro).toBe('Já existe um pagamento para este plano no período iniciado em 2026-05-01');
    expect(component.conflitoPeriodo).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.alert-danger a');
    expect(link.textContent).toContain('Ver pagamentos do paciente');
    expect(new URL(link.href).pathname).toBe('/pagamentos/paciente/10');
  });

  it('should show the API message on 400 (value below the plan) without the 409 link', () => {
    pagamentoServiceSpy.criar.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: { detail: 'Valor do pagamento (R$ 100) não pode ser menor que o valor do plano (R$ 250)' }
    })));
    component.form.setValue({ planoId: '1', valor: 100, dataVencimento: '2026-05-10', periodoInicio: '2026-05-01' });

    component.salvar();

    expect(component.erro).toBe('Valor do pagamento (R$ 100) não pode ser menor que o valor do plano (R$ 250)');
    expect(component.conflitoPeriodo).toBeFalse();
    expect(component.salvando).toBeFalse();
  });
});

describe('PagamentoFormComponent — pré-preenchimento da renovação (issue #133)', () => {
  let pagamentoServiceSpy: jasmine.SpyObj<PagamentoService>;
  let planoServiceSpy: jasmine.SpyObj<PlanoService>;
  let fixture: ComponentFixture<PagamentoFormComponent>;
  let component: PagamentoFormComponent;

  function criar(query: Record<string, string>) {
    pagamentoServiceSpy = jasmine.createSpyObj('PagamentoService', ['criar']);
    planoServiceSpy = jasmine.createSpyObj('PlanoService', ['listar']);
    planoServiceSpy.listar.and.returnValue(of([mockPlano, { ...mockPlano, id: 2, ativo: false }]));

    TestBed.configureTestingModule({
      imports: [PagamentoFormComponent, RouterTestingModule],
      providers: [
        { provide: PagamentoService, useValue: pagamentoServiceSpy },
        { provide: PlanoService, useValue: planoServiceSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ pacienteId: '10' }),
              queryParamMap: convertToParamMap(query)
            }
          }
        }
      ]
    });
    spyOn(TestBed.inject(Router), 'navigate');
    fixture = TestBed.createComponent(PagamentoFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  const renovacao = { planoId: '1', valor: '250', periodoInicio: '2026-06-01', dataVencimento: '2026-06-11' };

  it('should prefill plan, value, period start and due date and show the renewal notice', () => {
    criar(renovacao);

    expect(component.renovacao).toBeTrue();
    expect(component.form.value).toEqual({
      planoId: 1,
      valor: 250,
      dataVencimento: '2026-06-11',
      periodoInicio: '2026-06-01'
    });
    expect((fixture.nativeElement.querySelector('#planoId') as HTMLSelectElement).selectedIndex).toBe(1);
    const aviso: HTMLElement = fixture.nativeElement.querySelector('[data-testid="aviso-renovacao"]');
    expect(aviso.textContent).toContain('01/06/2026');
    expect(aviso.textContent).toContain('30/06/2026');
  });

  it('should keep every prefilled field editable and recompute the notice period', () => {
    criar(renovacao);
    ['planoId', 'valor', 'periodoInicio', 'dataVencimento'].forEach(nome => {
      expect(component.form.get(nome)!.enabled).toBeTrue();
    });

    component.form.patchValue({ periodoInicio: '2026-07-15', valor: 300 });
    expect(component.periodoRenovacao).toEqual({ inicio: '2026-07-15', fim: '2026-08-14' });
  });

  it('should submit the prefilled values through the existing POST', () => {
    criar(renovacao);
    pagamentoServiceSpy.criar.and.returnValue(of({} as PagamentoResponseDTO));

    component.salvar();

    expect(pagamentoServiceSpy.criar).toHaveBeenCalledWith({
      pacienteId: 10,
      planoId: 1,
      valor: 250,
      dataVencimento: '2026-06-11',
      periodoInicio: '2026-06-01'
    });
  });

  it('should ignore invalid parameters and an inactive plan, leaving the fields empty', () => {
    criar({ planoId: '2', valor: 'abc', periodoInicio: '2026-02-30', dataVencimento: '2026-06-11' });

    expect(component.renovacao).toBeFalse();
    expect(component.form.value).toEqual({
      planoId: null,
      valor: null,
      dataVencimento: '2026-06-11',
      periodoInicio: ''
    });
    expect(fixture.nativeElement.querySelector('[data-testid="aviso-renovacao"]')).toBeNull();
  });
});
