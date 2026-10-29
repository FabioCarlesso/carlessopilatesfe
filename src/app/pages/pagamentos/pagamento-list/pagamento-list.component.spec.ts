import { ChangeDetectorRef, DestroyRef, ElementRef } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { Subject, of, throwError } from 'rxjs';
import { isOnPush } from '../../../../testing/onpush';
import { PagamentoListComponent } from './pagamento-list.component';
import { AuthService } from '../../../core/services/auth.service';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { FORMA_PAGAMENTO_LABEL, FORMA_PAGAMENTO_OPCOES, PagamentoResponseDTO } from '../../../core/models/plano';
import { normalizarEspacos, provideLocalePtBr } from '../../../../testing/locale';

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
        provideLocalePtBr(),
        { provide: PagamentoService, useValue: serviceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: (key: string) => key === 'pacienteId' ? '10' : null } } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PagamentoListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function abrirDialogoPagar(): void {
    const botao = Array.from(fixture.nativeElement.querySelectorAll('tbody button') as NodeListOf<HTMLButtonElement>)
      .find(b => b.textContent?.trim() === 'Confirmar Pagamento')!;
    botao.click();
    fixture.detectChanges();
  }

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

  it('should render the value in Brazilian currency format and dates as dd/MM/yyyy', () => {
    const celulas = Array.from(fixture.nativeElement.querySelectorAll('table.table tbody tr td') as NodeListOf<HTMLElement>)
      .map(td => normalizarEspacos(td.textContent).trim());
    expect(celulas).toContain('R$ 250,00');
    expect(celulas).toContain('01/05/2026 – 31/05/2026');
    expect(celulas).toContain('10/05/2026');
  });

  it('should wrap the table in a scroll container to keep overflow inside the card', () => {
    const table: HTMLTableElement = fixture.nativeElement.querySelector('table.table');
    expect(table).toBeTruthy();
    expect(table.parentElement?.classList.contains('table-wrap')).toBeTrue();
  });

  it('should load pagamentos on init', () => {
    expect(serviceSpy.listar).toHaveBeenCalledWith(10);
    expect(component.pagamentos).toEqual([mockPagamento]);
  });

  it('should show the paciente name from the DTO as subtitle in the header', () => {
    expect(component.pacienteNome).toBe('Ana Silva');
    const subtitle: HTMLElement = fixture.nativeElement.querySelector('.page-header .page-subtitle');
    expect(subtitle).toBeTruthy();
    expect(subtitle.textContent?.trim()).toBe('Ana Silva');
  });

  it('should fall back to the generic title when there are no pagamentos', () => {
    serviceSpy.listar.and.returnValue(of([]));
    component.carregar();
    fixture.detectChanges();
    expect(component.pacienteNome).toBeNull();
    expect(fixture.nativeElement.querySelector('.page-subtitle')).toBeNull();
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
    expect(component.pagarForm.value.formaPagamento).toBeNull();
  });

  it('should not call pagar without formaPagamento and flag the select as invalid', () => {
    abrirDialogoPagar();
    component.pagarForm.patchValue({ dataPagamento: '2026-05-05' });
    (fixture.nativeElement.querySelector('.dialog-actions .btn:not(.btn-outline)') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(serviceSpy.pagar).not.toHaveBeenCalled();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('select#formaPagamento')!;
    expect(select.classList).toContain('is-invalid');
    expect(select.getAttribute('aria-describedby')).toBe('formaPagamento-erro');
    expect(fixture.nativeElement.querySelector('#formaPagamento-erro')?.textContent?.trim())
      .toBe('Forma de pagamento é obrigatória.');
  });

  it('should offer every forma de pagamento with its centralized label in the confirmation dialog', () => {
    abrirDialogoPagar();

    const opcoes = Array.from(fixture.nativeElement.querySelectorAll('select#formaPagamento option') as NodeListOf<HTMLOptionElement>)
      .map(o => o.textContent?.trim());
    expect(opcoes).toEqual(['Selecione...', ...FORMA_PAGAMENTO_OPCOES.map(f => FORMA_PAGAMENTO_LABEL[f])]);
  });

  it('should show the forma de pagamento label in the list and a dash when it is missing', () => {
    const antigo = { ...mockPagamento, id: 2, status: 'PAGO' as const, dataPagamento: '2026-04-05', formaPagamento: null };
    const semCampo = { ...mockPagamento, id: 3 };
    const comForma = { ...mockPagamento, id: 4, status: 'PAGO' as const, dataPagamento: '2026-05-05', formaPagamento: 'CARTAO_CREDITO' as const };
    serviceSpy.listar.and.returnValue(of([antigo, semCampo, comForma]));
    component.carregar();
    fixture.detectChanges();

    const colunaForma = Array.from(fixture.nativeElement.querySelectorAll('table.table thead th') as NodeListOf<HTMLElement>)
      .findIndex(th => th.textContent?.trim() === 'Forma');
    expect(colunaForma).toBeGreaterThan(-1);
    const formas = Array.from(fixture.nativeElement.querySelectorAll('table.table tbody tr') as NodeListOf<HTMLElement>)
      .map(tr => tr.querySelectorAll('td')[colunaForma].textContent?.trim());
    expect(formas).toEqual(['—', '—', 'Cartão de crédito']);
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
    component.pagarForm.setValue({ dataPagamento: '2026-05-05', formaPagamento: 'DINHEIRO' });
    component.confirmarPagar();
    expect(serviceSpy.pagar).toHaveBeenCalledWith(1, '2026-05-05', 'DINHEIRO');
    expect(component.pagarId).toBeNull();
    expect(serviceSpy.listar).toHaveBeenCalledTimes(2);
  });

  it('should show sucesso with role status after pagar and clear it after timeout', fakeAsync(() => {
    const pago = { ...mockPagamento, status: 'PAGO' as const, dataPagamento: '2026-05-05' };
    serviceSpy.pagar.and.returnValue(of(pago));
    component.pagarId = 1;
    component.pagarForm.setValue({ dataPagamento: '2026-05-05', formaPagamento: 'DINHEIRO' });
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
    component.pagarForm.setValue({ dataPagamento: '2026-05-05', formaPagamento: 'DINHEIRO' });
    component.confirmarPagar();
    expect(component.erro).toBe('Erro ao confirmar pagamento.');
  });

  it('should not load pagamentos when pacienteId route param is invalid', () => {
    const invalidServiceSpy = jasmine.createSpyObj('PagamentoService', ['listar', 'pagar']);
    const invalidRoute = { snapshot: { paramMap: convertToParamMap({ pacienteId: 'abc' }) } } as ActivatedRoute;
    const invalidComponent = new PagamentoListComponent(invalidServiceSpy, TestBed.inject(AuthService), invalidRoute, TestBed.inject(FormBuilder), { markForCheck: () => {} } as ChangeDetectorRef, { onDestroy: () => () => {} } as unknown as DestroyRef, new ElementRef(document.createElement('div')));

    invalidComponent.ngOnInit();

    expect(invalidComponent.erro).toBe('Identificador inválido.');
    expect(invalidServiceSpy.listar).not.toHaveBeenCalled();
  });

  it('should not fire a second pagar request while the action is in progress', () => {
    const pending = new Subject<PagamentoResponseDTO>();
    serviceSpy.pagar.and.returnValue(pending.asObservable());

    component.abrirPagar(1);
    component.pagarForm.setValue({ dataPagamento: '2026-05-10', formaPagamento: 'PIX' });
    component.confirmarPagar();
    component.confirmarPagar();

    expect(serviceSpy.pagar).toHaveBeenCalledTimes(1);
    expect(component.acaoEmAndamento).toBeTrue();

    pending.next(mockPagamento);
    pending.complete();

    expect(component.acaoEmAndamento).toBeFalse();
    expect(component.pagarId).toBeNull();
  });

});
