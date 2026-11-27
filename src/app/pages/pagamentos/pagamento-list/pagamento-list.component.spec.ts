import { ChangeDetectorRef, DestroyRef } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { isOnPush } from '../../../../testing/onpush';
import { PagamentoListComponent } from './pagamento-list.component';
import { AuthService } from '../../../core/services/auth.service';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { PagamentoResponseDTO } from '../../../core/models/plano';
import { PagarPagamentoDialogComponent } from '../../../shared/components/pagar-pagamento-dialog/pagar-pagamento-dialog.component';
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

  /** Instância do diálogo extraído (issue #302), onde moram o formulário e a chamada à API. */
  function dialogo(): PagarPagamentoDialogComponent {
    return fixture.debugElement.query(By.directive(PagarPagamentoDialogComponent)).componentInstance;
  }

  /** Abre o diálogo da linha, preenche e confirma pela própria tela. */
  function confirmarPeloDialogo(valor: { dataPagamento: string; formaPagamento: 'DINHEIRO' | 'PIX' }): void {
    abrirDialogoPagar();
    dialogo().form.setValue(valor);
    (fixture.nativeElement.querySelector('.dialog-actions .btn:not(.btn-outline)') as HTMLButtonElement).click();
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

  // Aula gerada sem profissional (lotação ou indisponibilidade do padrão):
  // a recepção precisa atribuir à mão (issue #300).
  it('should warn about classes generated without a professional', () => {
    serviceSpy.listar.and.returnValue(of([
      { ...mockPagamento, id: 2, aulasSemProfissional: 2 },
      { ...mockPagamento, id: 3, aulasSemProfissional: 1 },
      { ...mockPagamento, id: 4, aulasSemProfissional: 0 },
      { ...mockPagamento, id: 5 }
    ]));
    component.carregar();
    fixture.detectChanges();

    const avisos = Array.from(fixture.nativeElement.querySelectorAll('table.table tbody tr') as NodeListOf<HTMLElement>)
      .map(tr => tr.querySelector('.aviso-sem-profissional')?.textContent?.trim() ?? null);
    expect(avisos).toEqual(['2 aulas sem profissional', '1 aula sem profissional', null, null]);
  });

  it('should open the confirmation dialog for a pending payment and close it on cancel', () => {
    abrirDialogoPagar();
    expect(component.pagarId).toBe(1);
    expect(fixture.nativeElement.querySelector('app-pagar-pagamento-dialog')).toBeTruthy();

    (fixture.nativeElement.querySelector('.dialog-actions .btn-outline') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.pagarId).toBeNull();
    expect(fixture.nativeElement.querySelector('app-pagar-pagamento-dialog')).toBeNull();
  });

  it('should call pagar and reload on success', () => {
    const pago = { ...mockPagamento, status: 'PAGO' as const, dataPagamento: '2026-05-05' };
    serviceSpy.pagar.and.returnValue(of(pago));
    confirmarPeloDialogo({ dataPagamento: '2026-05-05', formaPagamento: 'DINHEIRO' });
    expect(serviceSpy.pagar).toHaveBeenCalledWith(1, '2026-05-05', 'DINHEIRO');
    expect(component.pagarId).toBeNull();
    expect(serviceSpy.listar).toHaveBeenCalledTimes(2);
  });

  it('should show sucesso with role status after pagar and clear it after timeout', fakeAsync(() => {
    const pago = { ...mockPagamento, status: 'PAGO' as const, dataPagamento: '2026-05-05' };
    serviceSpy.pagar.and.returnValue(of(pago));
    confirmarPeloDialogo({ dataPagamento: '2026-05-05', formaPagamento: 'DINHEIRO' });
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
    confirmarPeloDialogo({ dataPagamento: '2026-05-05', formaPagamento: 'DINHEIRO' });
    expect(component.erro).toBe('Erro ao confirmar pagamento.');
    expect(component.pagarId).toBeNull();
  });

  it('should not load pagamentos when pacienteId route param is invalid', () => {
    const invalidServiceSpy = jasmine.createSpyObj('PagamentoService', ['listar', 'pagar']);
    const invalidRoute = { snapshot: { paramMap: convertToParamMap({ pacienteId: 'abc' }) } } as ActivatedRoute;
    const invalidComponent = new PagamentoListComponent(invalidServiceSpy, TestBed.inject(AuthService), invalidRoute, { markForCheck: () => {} } as ChangeDetectorRef, { onDestroy: () => () => {} } as unknown as DestroyRef);

    invalidComponent.ngOnInit();

    expect(invalidComponent.erro).toBe('Identificador inválido.');
    expect(invalidServiceSpy.listar).not.toHaveBeenCalled();
  });

  it('should offer the create CTA in the empty state (issue #146)', async () => {
    serviceSpy.listar.and.returnValue(of([]));
    component.carregar();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.empty-state__mensagem')?.textContent?.trim()).toBe('Nenhum pagamento registrado.');
    const cta = el.querySelector('.empty-state__acoes a');
    expect(cta?.textContent?.trim()).toBe('Novo Pagamento');
    expect(cta?.getAttribute('href')).toBe('/pagamentos/novo/10');
  });
});
