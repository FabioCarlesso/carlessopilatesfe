import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { PacienteListComponent } from './paciente-list.component';
import { PacienteService } from '../../../core/services/paciente.service';
import { Page, PacienteResponseDTO } from '../../../core/models/paciente';

const mockPaciente: PacienteResponseDTO = {
  id: 1,
  nome: 'Ana Silva',
  email: 'ana@email.com',
  cpf: '123.456.789-00',
  telefone: '(11) 99999-9999',
  dataNascimento: '1990-05-15',
  endereco: null,
  ativo: true
};

const mockPage: Page<PacienteResponseDTO> = {
  content: [mockPaciente],
  page: { totalElements: 21, totalPages: 3, size: 10, number: 0 }
};

describe('PacienteListComponent', () => {
  let component: PacienteListComponent;
  let fixture: ComponentFixture<PacienteListComponent>;
  let serviceSpy: jasmine.SpyObj<PacienteService>;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('PacienteService', ['listar', 'inativar', 'ativar']);
    serviceSpy.listar.and.callFake((page = 0, size = 10) => of({
      content: mockPage.content,
      page: { ...mockPage.page, number: page, size }
    }));

    await TestBed.configureTestingModule({
      imports: [PacienteListComponent, RouterTestingModule],
      providers: [{ provide: PacienteService, useValue: serviceSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(PacienteListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should use OnPush change detection strategy', () => {
    expect((PacienteListComponent as unknown as { ɵcmp: { onPush: boolean } }).ɵcmp.onPush).toBeTrue();
  });

  it('should mark for check after loading the list', () => {
    const cdr = (component as unknown as { cdr: { markForCheck: () => void } }).cdr;
    const markForCheckSpy = spyOn(cdr, 'markForCheck');
    component.carregar();
    expect(markForCheckSpy).toHaveBeenCalled();
  });

  it('should call listar on init with default page, size and active filter', () => {
    expect(serviceSpy.listar).toHaveBeenCalledWith(0, 10, {
      nome: '',
      email: '',
      cpf: '',
      telefone: '',
      ativo: true
    });
  });

  it('should populate pacientes and totalPages on success', () => {
    expect(component.pacientes).toEqual([mockPaciente]);
    expect(component.totalElements).toBe(21);
    expect(component.totalPages).toBe(3);
    expect(component.currentPage).toBe(0);
    expect(component.pageSize).toBe(10);
    expect(component.loading).toBeFalse();
    expect(component.erro).toBeNull();
  });

  it('should set erro when listar fails', () => {
    serviceSpy.listar.and.returnValue(throwError(() => new Error('fail')));
    component.carregar();
    expect(component.erro).toBe('Erro ao carregar pacientes. Verifique se a API está em execução.');
    expect(component.loading).toBeFalse();
  });

  it('should set confirmarInativarId when confirmarInativar is called', () => {
    component.confirmarInativar(5);
    expect(component.confirmarInativarId).toBe(5);
  });

  it('should clear confirmarInativarId when cancelarInativar is called', () => {
    component.confirmarInativarId = 5;
    component.cancelarInativar();
    expect(component.confirmarInativarId).toBeNull();
  });

  it('should set confirmarAtivarId when confirmarAtivar is called', () => {
    component.confirmarAtivar(5);
    expect(component.confirmarAtivarId).toBe(5);
  });

  it('should clear confirmarAtivarId when cancelarAtivar is called', () => {
    component.confirmarAtivarId = 5;
    component.cancelarAtivar();
    expect(component.confirmarAtivarId).toBeNull();
  });

  it('should not call service.inativar when confirmarInativarId is null', () => {
    component.confirmarInativarId = null;
    component.inativar();
    expect(serviceSpy.inativar).not.toHaveBeenCalled();
  });

  it('should call inativar, clear id, and reload list on success', () => {
    serviceSpy.inativar.and.returnValue(of(undefined));
    component.confirmarInativarId = 1;
    component.inativar();
    expect(serviceSpy.inativar).toHaveBeenCalledWith(1);
    expect(component.confirmarInativarId).toBeNull();
    expect(serviceSpy.listar).toHaveBeenCalledTimes(2);
  });

  it('should set erro and clear id when inativar fails', () => {
    serviceSpy.inativar.and.returnValue(throwError(() => new Error('fail')));
    component.confirmarInativarId = 1;
    component.inativar();
    expect(component.erro).toBe('Erro ao inativar paciente.');
    expect(component.confirmarInativarId).toBeNull();
  });

  it('should not call service.ativar when confirmarAtivarId is null', () => {
    component.confirmarAtivarId = null;
    component.ativar();
    expect(serviceSpy.ativar).not.toHaveBeenCalled();
  });

  it('should call ativar, clear id, and reload list on success', () => {
    serviceSpy.ativar.and.returnValue(of(undefined));
    component.confirmarAtivarId = 1;
    component.ativar();
    expect(serviceSpy.ativar).toHaveBeenCalledWith(1);
    expect(component.confirmarAtivarId).toBeNull();
    expect(serviceSpy.listar).toHaveBeenCalledTimes(2);
  });

  it('should set erro and clear id when ativar fails', () => {
    serviceSpy.ativar.and.returnValue(throwError(() => new Error('fail')));
    component.confirmarAtivarId = 1;
    component.ativar();
    expect(component.erro).toBe('Erro ao ativar paciente.');
    expect(component.confirmarAtivarId).toBeNull();
  });

  it('should change currentPage and reload when pagina is called', () => {
    component.pagina(2);
    expect(component.currentPage).toBe(2);
    expect(serviceSpy.listar).toHaveBeenCalledWith(2, 10, {
      nome: '',
      email: '',
      cpf: '',
      telefone: '',
      ativo: true
    });
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

  it('should navigate to previous and next pages', () => {
    serviceSpy.listar.calls.reset();
    component.totalPages = 3;
    component.currentPage = 1;

    component.paginaAnterior();
    expect(component.currentPage).toBe(0);
    expect(serviceSpy.listar).toHaveBeenCalledWith(0, 10, {
      nome: '',
      email: '',
      cpf: '',
      telefone: '',
      ativo: true
    });

    component.proximaPagina();
    expect(component.currentPage).toBe(1);
    expect(serviceSpy.listar).toHaveBeenCalledWith(1, 10, {
      nome: '',
      email: '',
      cpf: '',
      telefone: '',
      ativo: true
    });
  });

  it('should reset to first page and reload when page size changes', () => {
    component.currentPage = 2;

    component.alterarTamanhoPagina('20');

    expect(component.pageSize).toBe(20);
    expect(component.currentPage).toBe(0);
    expect(serviceSpy.listar).toHaveBeenCalledWith(0, 20, {
      nome: '',
      email: '',
      cpf: '',
      telefone: '',
      ativo: true
    });
  });

  it('should ignore unsupported or unchanged page size', () => {
    serviceSpy.listar.calls.reset();

    component.alterarTamanhoPagina('10');
    component.alterarTamanhoPagina('15');

    expect(component.pageSize).toBe(10);
    expect(serviceSpy.listar).not.toHaveBeenCalled();
  });

  it('should reload previous page when current page is outside API result range', () => {
    serviceSpy.listar.and.returnValues(
      of({
        content: [],
        page: { totalElements: 20, totalPages: 2, size: 10, number: 2 }
      }),
      of({
        content: [mockPaciente],
        page: { totalElements: 20, totalPages: 2, size: 10, number: 1 }
      })
    );
    component.currentPage = 2;

    component.carregar();

    expect(component.currentPage).toBe(1);
    expect(serviceSpy.listar).toHaveBeenCalledWith(2, 10, {
      nome: '',
      email: '',
      cpf: '',
      telefone: '',
      ativo: true
    });
    expect(serviceSpy.listar).toHaveBeenCalledWith(1, 10, {
      nome: '',
      email: '',
      cpf: '',
      telefone: '',
      ativo: true
    });
  });

  it('should reset page and reload with trimmed filters when buscar is called', () => {
    component.currentPage = 2;
    component.filtro = {
      nome: ' Ana ',
      email: ' ana@email.com ',
      cpf: ' 12345678900 ',
      telefone: ' 11999999999 ',
      status: 'inativos'
    };

    component.buscar();

    expect(component.currentPage).toBe(0);
    expect(serviceSpy.listar).toHaveBeenCalledWith(0, 10, {
      nome: 'Ana',
      email: 'ana@email.com',
      cpf: '12345678900',
      telefone: '11999999999',
      ativo: false
    });
  });

  it('should omit ativo param when status is todos', () => {
    component.filtro = {
      nome: '',
      email: '',
      cpf: '',
      telefone: '',
      status: 'todos'
    };

    component.buscar();

    const call = serviceSpy.listar.calls.mostRecent().args[2]!;
    expect(call.ativo).toBeUndefined();
  });

  it('should restore default filters and reload when limparFiltros is called', () => {
    component.filtro = {
      nome: 'Ana',
      email: 'ana@email.com',
      cpf: '12345678900',
      telefone: '11999999999',
      status: 'inativos'
    };
    component.currentPage = 1;

    component.limparFiltros();

    expect(component.filtro).toEqual({
      nome: '',
      email: '',
      cpf: '',
      telefone: '',
      status: 'ativos'
    });
    expect(component.currentPage).toBe(0);
    expect(serviceSpy.listar).toHaveBeenCalledWith(0, 10, {
      nome: '',
      email: '',
      cpf: '',
      telefone: '',
      ativo: true
    });
  });

  it('should return array of page indices from pages()', () => {
    component.totalPages = 3;
    expect(component.pages()).toEqual([0, 1, 2]);
  });

  it('should return a sliding window of page indices from pages()', () => {
    component.totalPages = 10;

    component.currentPage = 0;
    expect(component.pages()).toEqual([0, 1, 2, 3, 4]);

    component.currentPage = 4;
    expect(component.pages()).toEqual([2, 3, 4, 5, 6]);

    component.currentPage = 9;
    expect(component.pages()).toEqual([5, 6, 7, 8, 9]);
  });

  it('should return empty array from pages() when totalPages is 0', () => {
    component.totalPages = 0;
    expect(component.pages()).toEqual([]);
  });

  it('should expose pagination state helpers', () => {
    component.totalElements = 21;
    component.totalPages = 3;
    component.pageSize = 10;
    component.currentPage = 0;

    expect(component.canGoPrevious()).toBeFalse();
    expect(component.canGoNext()).toBeTrue();
    expect(component.pageStart()).toBe(1);
    expect(component.pageEnd()).toBe(10);

    component.currentPage = 2;
    expect(component.canGoPrevious()).toBeTrue();
    expect(component.canGoNext()).toBeFalse();
    expect(component.pageStart()).toBe(21);
    expect(component.pageEnd()).toBe(21);
  });

  it('should return zero as pageStart when there are no elements', () => {
    component.totalElements = 0;
    expect(component.pageStart()).toBe(0);
  });

  it('should fall back to current values when API returns metadata with undefined number/size', () => {
    serviceSpy.listar.and.returnValue(of({
      content: [mockPaciente],
      page: {
        totalElements: 1,
        totalPages: 1,
        size: undefined as unknown as number,
        number: undefined as unknown as number
      }
    }));
    component.currentPage = 0;
    component.pageSize = 10;

    component.carregar();

    expect(component.currentPage).toBe(0);
    expect(component.pageSize).toBe(10);
    expect(Number.isNaN(component.pageStart())).toBeFalse();
    expect(Number.isNaN(component.pageEnd())).toBeFalse();
  });

  it('should fall back to current values when API returns no page metadata at all', () => {
    serviceSpy.listar.and.returnValue(of({
      content: [mockPaciente]
    } as Page<PacienteResponseDTO>));
    component.currentPage = 0;
    component.pageSize = 10;

    component.carregar();

    expect(component.pacientes).toEqual([mockPaciente]);
    expect(component.currentPage).toBe(0);
    expect(component.pageSize).toBe(10);
    expect(Number.isNaN(component.pageStart())).toBeFalse();
    expect(Number.isNaN(component.pageEnd())).toBeFalse();
  });

  it('should ignore unsupported page sizes returned by the API', () => {
    serviceSpy.listar.and.returnValue(of({
      content: [mockPaciente],
      page: { totalElements: 1, totalPages: 1, size: 17, number: 0 }
    }));
    component.pageSize = 10;

    component.carregar();

    expect(component.pageSize).toBe(10);
    expect(component.pageSizeOptions).toContain(component.pageSize);
  });

  it('should mark the current page size as selected in the dropdown', () => {
    component.pageSize = 20;
    fixture.detectChanges();

    const select = fixture.nativeElement.querySelector('.pagination-summary select') as HTMLSelectElement;
    expect(select).withContext('page size select must be present').toBeTruthy();
    expect(select.value).toBe('20');
  });

  it('should render patient actions inside a wrapped actions group', () => {
    fixture.detectChanges();

    const actionsCell = fixture.nativeElement.querySelector('td.acoes-cell') as HTMLTableCellElement;
    const actionsGroup = actionsCell?.querySelector('.acoes[aria-label="Ações do paciente"]');

    expect(actionsCell).withContext('actions must stay in a table cell').toBeTruthy();
    expect(actionsGroup).withContext('buttons must be grouped for flexible wrapping').toBeTruthy();
    expect(actionsGroup?.querySelectorAll('.btn').length).toBe(3);
  });
});
