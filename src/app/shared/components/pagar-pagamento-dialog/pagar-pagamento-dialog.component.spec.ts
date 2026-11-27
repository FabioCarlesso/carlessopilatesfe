import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { isOnPush } from '../../../../testing/onpush';
import { FORMA_PAGAMENTO_LABEL, FORMA_PAGAMENTO_OPCOES, PagamentoResponseDTO } from '../../../core/models/plano';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { PagarPagamentoDialogComponent } from './pagar-pagamento-dialog.component';

const pago: PagamentoResponseDTO = {
  id: 7, pacienteId: 10, pacienteNome: 'Ana Silva', planoId: 1, valor: 250, status: 'PAGO',
  dataPagamento: '2026-05-05', dataVencimento: '2026-05-10', periodoInicio: '2026-05-01', periodoFim: '2026-05-31'
};

describe('PagarPagamentoDialogComponent', () => {
  let fixture: ComponentFixture<PagarPagamentoDialogComponent>;
  let component: PagarPagamentoDialogComponent;
  let serviceSpy: jasmine.SpyObj<PagamentoService>;
  let emitidos: { pago: PagamentoResponseDTO[]; falhou: number; cancelar: number };

  beforeEach(() => {
    serviceSpy = jasmine.createSpyObj('PagamentoService', ['pagar']);
    serviceSpy.pagar.and.returnValue(of(pago));
    TestBed.configureTestingModule({
      imports: [PagarPagamentoDialogComponent],
      providers: [{ provide: PagamentoService, useValue: serviceSpy }]
    });
    fixture = TestBed.createComponent(PagarPagamentoDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('pagamentoId', 7);
    emitidos = { pago: [], falhou: 0, cancelar: 0 };
    component.pago.subscribe(p => emitidos.pago.push(p));
    component.falhou.subscribe(() => emitidos.falhou++);
    component.cancelar.subscribe(() => emitidos.cancelar++);
    fixture.detectChanges();
  });

  const el = () => fixture.nativeElement as HTMLElement;
  const botaoConfirmar = () => el().querySelector('.dialog-actions .btn:not(.btn-outline)') as HTMLButtonElement;
  const botaoCancelar = () => el().querySelector('.dialog-actions .btn-outline') as HTMLButtonElement;

  it('should use OnPush change detection strategy', () => {
    expect(isOnPush(PagarPagamentoDialogComponent)).toBeTrue();
  });

  it('should open with an empty date and no payment method', () => {
    expect(component.form.getRawValue()).toEqual({ dataPagamento: '', formaPagamento: null });
    expect(el().querySelector('.dialog-title')?.textContent?.trim()).toBe('Confirmar Pagamento');
  });

  it('should offer every payment method with its centralized label', () => {
    const opcoes = Array.from(el().querySelectorAll<HTMLOptionElement>('select#formaPagamento option'))
      .map(o => o.textContent?.trim());
    expect(opcoes).toEqual(['Não informada', ...FORMA_PAGAMENTO_OPCOES.map(f => FORMA_PAGAMENTO_LABEL[f])]);
  });

  it('should not call the API without the payment date', () => {
    botaoConfirmar().click();
    expect(serviceSpy.pagar).not.toHaveBeenCalled();
    expect(component.form.controls.dataPagamento.touched).toBeTrue();
  });

  it('should send a null payment method when it is not informed and emit the paid payment', () => {
    component.form.patchValue({ dataPagamento: '2026-05-05' });
    botaoConfirmar().click();

    expect(serviceSpy.pagar).toHaveBeenCalledOnceWith(7, '2026-05-05', null);
    expect(emitidos.pago).toEqual([pago]);
  });

  it('should send the chosen payment method', () => {
    component.form.setValue({ dataPagamento: '2026-05-05', formaPagamento: 'PIX' });
    component.confirmar();
    expect(serviceSpy.pagar).toHaveBeenCalledOnceWith(7, '2026-05-05', 'PIX');
  });

  it('should emit a failure when the API refuses', () => {
    serviceSpy.pagar.and.returnValue(throwError(() => new Error('500')));
    component.form.patchValue({ dataPagamento: '2026-05-05' });
    component.confirmar();

    expect(emitidos.falhou).toBe(1);
    expect(emitidos.pago).toEqual([]);
    expect(component.processando()).toBeFalse();
  });

  it('should ask to close on cancel', () => {
    botaoCancelar().click();
    expect(emitidos.cancelar).toBe(1);
  });

  it('should neither fire a second request nor close while the confirmation is in progress', () => {
    const pendente = new Subject<PagamentoResponseDTO>();
    serviceSpy.pagar.and.returnValue(pendente.asObservable());
    component.form.patchValue({ dataPagamento: '2026-05-05' });

    component.confirmar();
    component.confirmar();
    component.fechar();

    expect(serviceSpy.pagar).toHaveBeenCalledTimes(1);
    expect(component.processando()).toBeTrue();
    expect(emitidos.cancelar).toBe(0);

    pendente.next(pago);
    expect(component.processando()).toBeFalse();
    expect(emitidos.pago).toEqual([pago]);
  });
});
