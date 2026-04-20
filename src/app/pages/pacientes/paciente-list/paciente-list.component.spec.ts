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
  totalElements: 1,
  totalPages: 3,
  size: 10,
  number: 0
};

describe('PacienteListComponent', () => {
  let component: PacienteListComponent;
  let fixture: ComponentFixture<PacienteListComponent>;
  let serviceSpy: jasmine.SpyObj<PacienteService>;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('PacienteService', ['listar', 'inativar']);
    serviceSpy.listar.and.returnValue(of(mockPage));

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

  it('should call listar on init with default page and size', () => {
    expect(serviceSpy.listar).toHaveBeenCalledWith(0, 10);
  });

  it('should populate pacientes and totalPages on success', () => {
    expect(component.pacientes).toEqual([mockPaciente]);
    expect(component.totalPages).toBe(3);
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

  it('should change currentPage and reload when pagina is called', () => {
    component.pagina(2);
    expect(component.currentPage).toBe(2);
    expect(serviceSpy.listar).toHaveBeenCalledWith(2, 10);
  });

  it('should return array of page indices from pages()', () => {
    component.totalPages = 3;
    expect(component.pages()).toEqual([0, 1, 2]);
  });

  it('should return empty array from pages() when totalPages is 0', () => {
    component.totalPages = 0;
    expect(component.pages()).toEqual([]);
  });
});
