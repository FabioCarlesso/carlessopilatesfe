import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { PacienteDetailComponent } from './paciente-detail.component';
import { PacienteService } from '../../../core/services/paciente.service';
import { PacienteResponseDTO } from '../../../core/models/paciente';

const mockPacienteAtivo: PacienteResponseDTO = {
  id: 1,
  nome: 'Ana Silva',
  email: 'ana@email.com',
  cpf: '123.456.789-00',
  telefone: '(11) 99999-9999',
  dataNascimento: '1990-05-15',
  endereco: null,
  ativo: true
};

const mockPacienteInativo: PacienteResponseDTO = { ...mockPacienteAtivo, ativo: false };

describe('PacienteDetailComponent', () => {
  let component: PacienteDetailComponent;
  let fixture: ComponentFixture<PacienteDetailComponent>;
  let serviceSpy: jasmine.SpyObj<PacienteService>;
  let router: Router;

  function setup(paciente: PacienteResponseDTO = mockPacienteAtivo) {
    serviceSpy = jasmine.createSpyObj('PacienteService', ['buscar', 'ativar', 'inativar']);
    serviceSpy.buscar.and.returnValue(of(paciente));

    TestBed.configureTestingModule({
      imports: [PacienteDetailComponent, RouterTestingModule],
      providers: [
        { provide: PacienteService, useValue: serviceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } }
      ]
    });

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(PacienteDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('with active patient', () => {
    beforeEach(() => setup(mockPacienteAtivo));

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should load patient by id on init', () => {
      expect(serviceSpy.buscar).toHaveBeenCalledWith(1);
      expect(component.paciente).toEqual(mockPacienteAtivo);
      expect(component.loading).toBeFalse();
      expect(component.erro).toBeNull();
    });

    it('should initialize confirmarInativar and confirmarAtivar as false', () => {
      expect(component.confirmarInativar).toBeFalse();
      expect(component.confirmarAtivar).toBeFalse();
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
  });

  describe('with inactive patient', () => {
    beforeEach(() => setup(mockPacienteInativo));

    it('should load inactive patient', () => {
      expect(component.paciente?.ativo).toBeFalse();
    });

    it('should call ativar service and navigate to /pacientes on success', () => {
      serviceSpy.ativar.and.returnValue(of(undefined));
      component.ativar();
      expect(serviceSpy.ativar).toHaveBeenCalledWith(1);
      expect(router.navigate).toHaveBeenCalledWith(['/pacientes']);
    });

    it('should set erro when ativar fails', () => {
      serviceSpy.ativar.and.returnValue(throwError(() => new Error('fail')));
      component.ativar();
      expect(component.erro).toBe('Erro ao ativar paciente.');
    });

    it('should not call ativar service when paciente is null', () => {
      component.paciente = null;
      component.ativar();
      expect(serviceSpy.ativar).not.toHaveBeenCalled();
    });
  });

  describe('load error', () => {
    beforeEach(() => setup(mockPacienteAtivo));

    it('should set erro when buscar fails', () => {
      serviceSpy.buscar.and.returnValue(throwError(() => new Error('fail')));
      component.ngOnInit();
      expect(component.erro).toBe('Paciente não encontrado.');
      expect(component.loading).toBeFalse();
    });
  });

  it('should not call buscar when id route param is invalid', () => {
    serviceSpy = jasmine.createSpyObj('PacienteService', ['buscar', 'ativar', 'inativar']);

    TestBed.configureTestingModule({
      imports: [PacienteDetailComponent, RouterTestingModule],
      providers: [
        { provide: PacienteService, useValue: serviceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'abc' }) } } }
      ]
    });

    fixture = TestBed.createComponent(PacienteDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.erro).toBe('Identificador inválido.');
    expect(serviceSpy.buscar).not.toHaveBeenCalled();
  });

  it('should not fire a second inativar request while the action is in progress', () => {
    setup(mockPacienteAtivo);
    const pending = new Subject<void>();
    serviceSpy.inativar.and.returnValue(pending.asObservable());

    component.inativar();
    component.inativar();

    expect(serviceSpy.inativar).toHaveBeenCalledTimes(1);
    expect(component.acaoEmAndamento).toBeTrue();
  });

});
