import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PagamentoListComponent } from './pagamento-list.component';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { PagamentoResponseDTO } from '../../../core/models/plano';

const mockPagamento: PagamentoResponseDTO = {
  id: 1, pacienteId: 10, planoId: 1, valor: 250, status: 'PENDENTE',
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
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '10' } } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PagamentoListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());

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

  it('should set erro when pagar fails', () => {
    serviceSpy.pagar.and.returnValue(throwError(() => new Error('fail')));
    component.pagarId = 1;
    component.pagarForm.setValue({ dataPagamento: '2026-05-05' });
    component.confirmarPagar();
    expect(component.erro).toBe('Erro ao confirmar pagamento.');
  });
});
