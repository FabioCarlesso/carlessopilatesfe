import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Subject, of, throwError } from 'rxjs';
import { isOnPush } from '../../../../testing/onpush';
import { ProfissionalListComponent } from './profissional-list.component';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { ProfissionalPage, ProfissionalResponseDTO } from '../../../core/models/profissional';

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
  page: { totalElements: 1, totalPages: 2, size: 10, number: 0 }
};

const defaultFiltro = { nome: '', email: '', ativo: true };

describe('ProfissionalListComponent', () => {
  let component: ProfissionalListComponent;
  let fixture: ComponentFixture<ProfissionalListComponent>;
  let serviceSpy: jasmine.SpyObj<ProfissionalService>;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('ProfissionalService', ['listar', 'inativar']);
    serviceSpy.listar.and.returnValue(of(mockPage));

    await TestBed.configureTestingModule({
      imports: [ProfissionalListComponent, RouterTestingModule],
      providers: [{ provide: ProfissionalService, useValue: serviceSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(ProfissionalListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should use OnPush change detection strategy', () => {
    expect(isOnPush(ProfissionalListComponent)).toBeTrue();
  });

  it('should mark for check after loading the list', () => {
    const cdr = (component as unknown as { cdr: { markForCheck: () => void } }).cdr;
    const markForCheckSpy = spyOn(cdr, 'markForCheck');
    component.carregar();
    expect(markForCheckSpy).toHaveBeenCalled();
  });

  it('should track table rows by id', () => {
    expect(component.trackByProfissional(0, mockProfissional)).toBe(mockProfissional.id);
  });

  it('should wrap the table in a scroll container to keep overflow inside the card', () => {
    const table: HTMLTableElement = fixture.nativeElement.querySelector('table.table');
    expect(table).toBeTruthy();
    expect(table.parentElement?.classList.contains('table-wrap')).toBeTrue();
  });

  it('should load profissionais on init', () => {
    expect(serviceSpy.listar).toHaveBeenCalledWith(0, 10, defaultFiltro);
    expect(component.profissionais).toEqual([mockProfissional]);
    expect(component.totalPages).toBe(2);
    expect(component.currentPage).toBe(0);
    expect(component.pageSize).toBe(10);
    expect(component.visiblePages).toEqual([0, 1]);
  });

  it('should sync currentPage and pageSize with API metadata', () => {
    const response: ProfissionalPage = {
      content: [mockProfissional],
      page: { totalElements: 41, totalPages: 3, size: 20, number: 2 }
    };

    serviceSpy.listar.calls.reset();
    serviceSpy.listar.and.returnValue(of(response));

    component.currentPage = 1;
    component.pageSize = 10;
    component.carregar();

    expect(serviceSpy.listar).toHaveBeenCalledWith(1, 10, defaultFiltro);
    expect(component.currentPage).toBe(2);
    expect(component.pageSize).toBe(20);
    expect(component.totalPages).toBe(3);
    expect(component.visiblePages).toEqual([0, 1, 2]);
  });

  it('should keep currentPage and pageSize when API omits pagination metadata', () => {
    const response = {
      content: [mockProfissional],
      page: { totalElements: 41, totalPages: 3 }
    } as ProfissionalPage;

    serviceSpy.listar.calls.reset();
    serviceSpy.listar.and.returnValue(of(response));

    component.currentPage = 1;
    component.pageSize = 20;
    component.carregar();

    expect(component.currentPage).toBe(1);
    expect(component.pageSize).toBe(20);
    expect(component.totalPages).toBe(3);
  });

  it('should set erro when listar fails', () => {
    serviceSpy.listar.and.returnValue(throwError(() => new Error('fail')));
    component.carregar();
    expect(component.erro).toBe('Erro ao carregar profissionais.');
  });

  it('should send trimmed filter params built from the UI state', () => {
    serviceSpy.listar.calls.reset();
    component.filtro = {
      nome: '  Paula  ',
      email: '  paula@carlessopilates.com  ',
      tipoContrato: 'PJ',
      percentualPagamentoAula: 45,
      status: 'inativos'
    };

    component.buscar();

    expect(component.currentPage).toBe(0);
    expect(serviceSpy.listar).toHaveBeenCalledWith(0, 10, {
      nome: 'Paula',
      email: 'paula@carlessopilates.com',
      tipoContrato: 'PJ',
      percentualPagamentoAula: 45,
      ativo: false
    });
  });

  it('should omit contrato and percentual when not informed and ativo when status is todos', () => {
    serviceSpy.listar.calls.reset();
    component.filtro = {
      nome: '',
      email: '',
      tipoContrato: '',
      percentualPagamentoAula: null,
      status: 'todos'
    };

    component.buscar();

    expect(serviceSpy.listar).toHaveBeenCalledWith(0, 10, { nome: '', email: '' });
  });

  it('should reset to first page when buscar is called', () => {
    component.currentPage = 4;
    component.buscar();
    expect(component.currentPage).toBe(0);
  });

  it('should reset filters to defaults and reload when limparFiltros is called', () => {
    serviceSpy.listar.calls.reset();
    component.filtro = {
      nome: 'Paula',
      email: 'paula@carlessopilates.com',
      tipoContrato: 'CLT',
      percentualPagamentoAula: 30,
      status: 'inativos'
    };
    component.currentPage = 3;

    component.limparFiltros();

    expect(component.filtro).toEqual({
      nome: '',
      email: '',
      tipoContrato: '',
      percentualPagamentoAula: null,
      status: 'ativos'
    });
    expect(component.currentPage).toBe(0);
    expect(serviceSpy.listar).toHaveBeenCalledWith(0, 10, defaultFiltro);
  });

  it('should set confirmarInativarId when confirmarInativar is called', () => {
    component.confirmarInativar(1);
    expect(component.confirmarInativarId).toBe(1);
  });

  it('should clear confirmarInativarId when cancelarInativar is called', () => {
    component.confirmarInativarId = 1;
    component.cancelarInativar();
    expect(component.confirmarInativarId).toBeNull();
  });

  it('should call inativar and reload list on success', () => {
    serviceSpy.inativar.and.returnValue(of(undefined));
    component.confirmarInativarId = 1;
    component.inativar();
    expect(serviceSpy.inativar).toHaveBeenCalledWith(1);
    expect(serviceSpy.listar).toHaveBeenCalledTimes(2);
  });

  it('should go back one page and reload when current page becomes out of range', () => {
    const currentPageResponse: ProfissionalPage = {
      content: [mockProfissional],
      page: { totalElements: 151, totalPages: 16, size: 10, number: 15 }
    };
    const afterInactivationResponse: ProfissionalPage = {
      content: [],
      page: { totalElements: 150, totalPages: 15, size: 10, number: 15 }
    };
    const previousPageResponse: ProfissionalPage = {
      content: [mockProfissional],
      page: { totalElements: 150, totalPages: 15, size: 10, number: 14 }
    };

    serviceSpy.listar.calls.reset();
    serviceSpy.listar.and.returnValues(
      of(currentPageResponse),
      of(afterInactivationResponse),
      of(previousPageResponse)
    );
    serviceSpy.inativar.and.returnValue(of(undefined));

    component.currentPage = 15;
    component.carregar();
    component.confirmarInativarId = 1;
    component.inativar();

    expect(component.currentPage).toBe(14);
    expect(serviceSpy.listar).toHaveBeenCalledTimes(3);
    expect(serviceSpy.listar).toHaveBeenCalledWith(15, 10, defaultFiltro);
    expect(serviceSpy.listar).toHaveBeenCalledWith(14, 10, defaultFiltro);
    expect(component.profissionais).toEqual([mockProfissional]);
    expect(component.visiblePages.length).toBeGreaterThan(0);
    expect(component.loading).toBeFalse();
  });

  it('should not backtrack and show empty list when totalPages is 0', () => {
    const emptyResponse: ProfissionalPage = {
      content: [],
      page: { totalElements: 0, totalPages: 0, size: 10, number: 0 }
    };

    serviceSpy.listar.calls.reset();
    serviceSpy.listar.and.returnValue(of(emptyResponse));

    component.currentPage = 0;
    component.carregar();

    expect(serviceSpy.listar).toHaveBeenCalledTimes(1);
    expect(component.profissionais).toEqual([]);
    expect(component.totalPages).toBe(0);
    expect(component.loading).toBeFalse();
  });

  it('should stop backtracking after 3 retries to prevent infinite recursion', () => {
    const responses: ProfissionalPage[] = [
      { content: [], page: { totalElements: 40, totalPages: 4, size: 10, number: 10 } },
      { content: [], page: { totalElements: 30, totalPages: 3, size: 10, number: 3 } },
      { content: [], page: { totalElements: 20, totalPages: 2, size: 10, number: 2 } },
      { content: [mockProfissional], page: { totalElements: 10, totalPages: 1, size: 10, number: 1 } },
    ];

    serviceSpy.listar.calls.reset();
    serviceSpy.listar.and.returnValues(...responses.map(r => of(r)));

    component.currentPage = 10;
    component.carregar();

    expect(serviceSpy.listar).toHaveBeenCalledTimes(4);
    expect(component.loading).toBeFalse();
    expect(component.profissionais).toEqual([mockProfissional]);
  });

  it('should set erro when inativar fails', () => {
    serviceSpy.inativar.and.returnValue(throwError(() => new Error('fail')));
    component.confirmarInativarId = 1;
    component.inativar();
    expect(component.erro).toBe('Erro ao inativar profissional.');
  });

  it('should change currentPage and reload when pagina is called with a valid page', () => {
    serviceSpy.listar.and.returnValue(of({
      content: [mockProfissional],
      page: { totalElements: 21, totalPages: 3, size: 10, number: 1 }
    }));

    component.totalPages = 3;
    component.pagina(1);

    expect(component.currentPage).toBe(1);
    expect(serviceSpy.listar).toHaveBeenCalledWith(1, 10, defaultFiltro);
  });

  it('should ignore invalid or current page when pagina is called', () => {
    serviceSpy.listar.calls.reset();
    component.totalPages = 3;
    component.currentPage = 1;

    component.pagina(-1);
    component.pagina(1);
    component.pagina(3);

    expect(component.currentPage).toBe(1);
    expect(serviceSpy.listar).not.toHaveBeenCalled();
  });

  it('should return all page indices when total pages fit in visible window', () => {
    component.totalPages = 3;

    expect(component.pages()).toEqual([0, 1, 2]);
  });

  it('should return a sliding window of up to five page indices', () => {
    component.totalPages = 10;

    component.currentPage = 0;
    expect(component.pages()).toEqual([0, 1, 2, 3, 4]);

    component.currentPage = 4;
    expect(component.pages()).toEqual([2, 3, 4, 5, 6]);

    component.currentPage = 9;
    expect(component.pages()).toEqual([5, 6, 7, 8, 9]);
  });

  it('should return empty page indices when there are no pages', () => {
    component.totalPages = 0;

    expect(component.pages()).toEqual([]);
  });

  it('should render only visible page buttons in the DOM', () => {
    component.totalPages = 500;
    component.currentPage = 250;
    component.visiblePages = component.pages();

    (component as unknown as { cdr: ChangeDetectorRef }).cdr.markForCheck();
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.pagination .page-number');
    expect(buttons.length).toBe(5);
  });

  it('should not fire a second inativar request while the action is in progress', () => {
    const pending = new Subject<void>();
    serviceSpy.inativar.and.returnValue(pending.asObservable());

    component.confirmarInativarId = 1;
    component.inativar();
    component.inativar();

    expect(serviceSpy.inativar).toHaveBeenCalledTimes(1);
    expect(component.acaoEmAndamento).toBeTrue();

    pending.next();
    pending.complete();

    expect(component.acaoEmAndamento).toBeFalse();
    expect(component.confirmarInativarId).toBeNull();
  });

  it('should start with the filters panel collapsed (issue #163)', () => {
    expect(component.filtrosAbertos).toBeFalse();
  });

  it('should toggle the filters panel open and closed', () => {
    component.alternarFiltros();
    expect(component.filtrosAbertos).toBeTrue();
    component.alternarFiltros();
    expect(component.filtrosAbertos).toBeFalse();
  });

  it('should collapse the filters panel when buscar is called', () => {
    component.filtrosAbertos = true;
    component.buscar();
    expect(component.filtrosAbertos).toBeFalse();
  });

  it('should count active filters ignoring the default status', () => {
    expect(component.filtrosAtivos()).toBe(0);

    component.filtro = { nome: 'Paula', email: '', tipoContrato: '', percentualPagamentoAula: null, status: 'ativos' };
    expect(component.filtrosAtivos()).toBe(1);

    component.filtro = { nome: ' Paula ', email: 'a@b.com', tipoContrato: 'PJ', percentualPagamentoAula: 45, status: 'inativos' };
    expect(component.filtrosAtivos()).toBe(5);
  });

  it('should render the filters toggle bound to the panel with aria attributes', () => {
    const toggle = fixture.nativeElement.querySelector('.filtros-toggle') as HTMLButtonElement;
    const form = fixture.nativeElement.querySelector('form.filters') as HTMLFormElement;

    expect(toggle).withContext('filters toggle button must be present').toBeTruthy();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe('filtros-profissionais');
    expect(form.id).toBe('filtros-profissionais');
    expect(form.classList).toContain('filtros-recolhidos');
  });

  it('should reflect the open state and active-filter badge in the template', () => {
    component.filtro = { nome: 'Paula', email: 'a@b.com', tipoContrato: '', percentualPagamentoAula: null, status: 'ativos' };
    component.alternarFiltros();
    (component as unknown as { cdr: ChangeDetectorRef }).cdr.markForCheck();
    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector('.filtros-toggle') as HTMLButtonElement;
    const badge = fixture.nativeElement.querySelector('.filtros-badge') as HTMLElement;
    const form = fixture.nativeElement.querySelector('form.filters') as HTMLFormElement;

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(form.classList).not.toContain('filtros-recolhidos');
    expect(badge).withContext('badge must show the active-filter count').toBeTruthy();
    expect(badge.textContent?.trim()).toBe('2');
  });

});
