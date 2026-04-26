import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
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

  it('should load profissionais on init', () => {
    expect(serviceSpy.listar).toHaveBeenCalledWith(0, 10);
    expect(component.profissionais).toEqual([mockProfissional]);
    expect(component.totalPages).toBe(2);
    expect(component.visiblePages).toEqual([0, 1]);
  });

  it('should set erro when listar fails', () => {
    serviceSpy.listar.and.returnValue(throwError(() => new Error('fail')));
    component.carregar();
    expect(component.erro).toBe('Erro ao carregar profissionais.');
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

  it('should set erro when inativar fails', () => {
    serviceSpy.inativar.and.returnValue(throwError(() => new Error('fail')));
    component.confirmarInativarId = 1;
    component.inativar();
    expect(component.erro).toBe('Erro ao inativar profissional.');
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

    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.pagination button');
    expect(buttons.length).toBe(5);
  });
});
