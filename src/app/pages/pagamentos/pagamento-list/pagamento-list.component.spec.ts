import { ChangeDetectorRef, DestroyRef } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { isOnPush } from '../../../../testing/onpush';
import { PagamentoListComponent } from './pagamento-list.component';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { PagamentoResponseDTO } from '../../../core/models/plano';

const mockPagamento: PagamentoResponseDTO = {
  id: 1, pacienteId: 10, pacienteNome: 'Ana Silva', planoId: 1, valor: 250, status: 'PENDENTE',
  dataPagamento: null, dataVencimento: '2026-05-10',
  periodoInicio: '2026-05-01', periodoFim: '2026-05-31'
};

describe('PagamentoListComponent', () => {
  let component: PagamentoListComponent;
  let fixture: ComponentFixture<PagamentoListComponent>;
  let serviceSpy: jasmine.SpyObj<PagamentoService>;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('PagamentoService', ['listar', 'pagar']);
    serviceSpy.listar.and.returnValue(of([mockPagamento]));

    await TestBed.configureTestingModule({
      imports: [PagamentoListComponent, RouterTestingModule],
      providers: [
        { provide: PagamentoService, useValue: serviceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: (key: string) => key === 'pacienteId' ? '10' : null } } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PagamentoListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());

  it('should use OnPush change detection strategy', () => {
    expect(isOnPush(PagamentoListComponent)).toBeTrue();
  });

  it('should mark for check after loading the list', () => {
    const cdr = (component as unknown as { cdr: { markForCheck: () => void } }).cdr;
    const markForCheckSpy = spyOn(cdr, 'markForCheck');
    component.carregar();
    expect(markForCheckSpy).toHaveBeenCalled();
  });

  it('should track table rows by id', () => {
    expect(component.trackByPagamento(0, mockPagamento)).toBe(mockPagamento.id);
  });

  it('should load pagamentos on init', () => {
    expect(serviceSpy.listar).toHaveBeenCalledWith(10);
    expect(component.pagamentos).toEqual([mockPagamento]);
  });

  it('should set erro when listar fails', () => {
    serviceSpy.listar.and.returnValue(throwError(() => new Error('fail')));
    component.carregar();
    expect(component.erro).toBe('Erro ao carregar pagamentos.');
  });

  it('abrirPagar should set pagarId and reset form', () => {
    component.abrirPagar(1);
    expect(component.pagarId).toBe(1);
    expect(component.pagarForm.value.dataPagamento).toBeFalsy();
  });

  it('cancelarPagar should clear pagarId', () => {
    component.pagarId = 1;
    component.cancelarPagar();
    expect(component.pagarId).toBeNull();
  });

  it('should not call pagar when form is invalid', () => {
    component.pagarId = 1;
    component.confirmarPagar();
    expect(serviceSpy.pagar).not.toHaveBeenCalled();
  });

  it('should call pagar and reload on success', () => {
    const pago = { ...mockPagamento, status: 'PAGO' as const, dataPagamento: '2026-05-05' };
    serviceSpy.pagar.and.returnValue(of(pago));
    component.pagarId = 1;
    component.pagarForm.setValue({ dataPagamento: '2026-05-05' });
    component.confirmarPagar();
    expect(serviceSpy.pagar).toHaveBeenCalledWith(1, '2026-05-05');
    expect(component.pagarId).toBeNull();
    expect(serviceSpy.listar).toHaveBeenCalledTimes(2);
  });

  it('should show sucesso with role status after pagar and clear it after timeout', fakeAsync(() => {
    const pago = { ...mockPagamento, status: 'PAGO' as const, dataPagamento: '2026-05-05' };
    serviceSpy.pagar.and.returnValue(of(pago));
    component.pagarId = 1;
    component.pagarForm.setValue({ dataPagamento: '2026-05-05' });
    component.confirmarPagar();
    expect(component.sucesso).toBe('Pagamento confirmado com sucesso.');
    fixture.detectChanges();
    const alert = fixture.nativeElement.querySelector('.alert-success');
    expect(alert).toBeTruthy();
    expect(alert.getAttribute('role')).toBe('status');
    tick(4000);
    expect(component.sucesso).toBeNull();
  }));

  it('should set erro when pagar fails', () => {
    serviceSpy.pagar.and.returnValue(throwError(() => new Error('fail')));
    component.pagarId = 1;
    component.pagarForm.setValue({ dataPagamento: '2026-05-05' });
    component.confirmarPagar();
    expect(component.erro).toBe('Erro ao confirmar pagamento.');
  });

  it('should not load pagamentos when pacienteId route param is invalid', () => {
    const invalidServiceSpy = jasmine.createSpyObj('PagamentoService', ['listar', 'pagar']);
    const invalidRoute = { snapshot: { paramMap: convertToParamMap({ pacienteId: 'abc' }) } } as ActivatedRoute;
    const invalidComponent = new PagamentoListComponent(invalidServiceSpy, invalidRoute, TestBed.inject(FormBuilder), { markForCheck: () => {} } as ChangeDetectorRef, { onDestroy: () => () => {} } as DestroyRef);

    invalidComponent.ngOnInit();

    expect(invalidComponent.erro).toBe('Identificador inválido.');
    expect(invalidServiceSpy.listar).not.toHaveBeenCalled();
  });
});
