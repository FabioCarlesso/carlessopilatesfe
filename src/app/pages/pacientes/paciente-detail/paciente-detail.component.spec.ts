import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PacienteDetailComponent } from './paciente-detail.component';
import { PacienteService } from '../../../core/services/paciente.service';
import { PacienteResponseDTO } from '../../../core/models/paciente';

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

describe('PacienteDetailComponent', () => {
  let component: PacienteDetailComponent;
  let fixture: ComponentFixture<PacienteDetailComponent>;
  let serviceSpy: jasmine.SpyObj<PacienteService>;
  let router: Router;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('PacienteService', ['buscar', 'inativar']);
    serviceSpy.buscar.and.returnValue(of(mockPaciente));

    await TestBed.configureTestingModule({
      imports: [PacienteDetailComponent, RouterTestingModule],
      providers: [
        { provide: PacienteService, useValue: serviceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(PacienteDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load patient by id on init', () => {
    expect(serviceSpy.buscar).toHaveBeenCalledWith(1);
    expect(component.paciente).toEqual(mockPaciente);
    expect(component.loading).toBeFalse();
    expect(component.erro).toBeNull();
  });

  it('should set erro when buscar fails', () => {
    serviceSpy.buscar.and.returnValue(throwError(() => new Error('fail')));
    component.ngOnInit();
    expect(component.erro).toBe('Paciente não encontrado.');
    expect(component.loading).toBeFalse();
  });

  it('should call inativar service and navigate to /pacientes on success', () => {
    serviceSpy.inativar.and.returnValue(of(undefined));
    component.inativar();
    expect(serviceSpy.inativar).toHaveBeenCalledWith(1);
    expect(router.navigate).toHaveBeenCalledWith(['/pacientes']);
  });

  it('should set erro when inativar fails', () => {
    serviceSpy.inativar.and.returnValue(throwError(() => new Error('fail')));
    component.inativar();
    expect(component.erro).toBe('Erro ao inativar paciente.');
  });

  it('should not call inativar service when paciente is null', () => {
    component.paciente = null;
    component.inativar();
    expect(serviceSpy.inativar).not.toHaveBeenCalled();
  });

  it('should initialize confirmarInativar as false', () => {
    expect(component.confirmarInativar).toBeFalse();
  });
});
