import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PacienteFormComponent } from './paciente-form.component';
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

describe('PacienteFormComponent', () => {
  describe('in create mode (no id in route)', () => {
    let component: PacienteFormComponent;
    let fixture: ComponentFixture<PacienteFormComponent>;
    let serviceSpy: jasmine.SpyObj<PacienteService>;
    let router: Router;

    beforeEach(async () => {
      serviceSpy = jasmine.createSpyObj('PacienteService', ['cadastrar', 'buscar', 'atualizar']);

      await TestBed.configureTestingModule({
        imports: [PacienteFormComponent, RouterTestingModule],
        providers: [
          { provide: PacienteService, useValue: serviceSpy },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } }
        ]
      }).compileComponents();

      router = TestBed.inject(Router);
      spyOn(router, 'navigate');

      fixture = TestBed.createComponent(PacienteFormComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create with isEdit false', () => {
      expect(component).toBeTruthy();
      expect(component.isEdit).toBeFalse();
      expect(component.pacienteId).toBeNull();
    });

    it('should initialize all form controls', () => {
      ['nome', 'email', 'cpf', 'telefone', 'dataNascimento', 'endereco'].forEach(ctrl => {
        expect(component.form.contains(ctrl)).toBeTrue();
      });
    });

    it('should have email and cpf enabled in create mode', () => {
      expect(component.form.get('email')?.disabled).toBeFalse();
      expect(component.form.get('cpf')?.disabled).toBeFalse();
    });

    it('should mark nome as invalid when fewer than 3 characters', () => {
      component.form.get('nome')?.setValue('AB');
      expect(component.form.get('nome')?.hasError('minlength')).toBeTrue();
    });

    it('should mark nome as invalid when empty', () => {
      component.form.get('nome')?.setValue('');
      expect(component.form.get('nome')?.hasError('required')).toBeTrue();
    });

    it('should mark email as invalid when malformed', () => {
      component.form.get('email')?.setValue('not-an-email');
      expect(component.form.get('email')?.hasError('email')).toBeTrue();
    });

    it('should call cadastrar and navigate to /pacientes on valid submit', () => {
      serviceSpy.cadastrar.and.returnValue(of(mockPaciente));
      component.form.patchValue({
        nome: 'Ana Silva',
        email: 'ana@email.com',
        cpf: '123.456.789-00'
      });
      component.salvar();
      expect(serviceSpy.cadastrar).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/pacientes']);
    });

    it('should not call service when form is invalid', () => {
      component.form.get('nome')?.setValue('');
      component.salvar();
      expect(serviceSpy.cadastrar).not.toHaveBeenCalled();
    });

    it('should set erro and clear salvando flag on cadastrar failure', () => {
      serviceSpy.cadastrar.and.returnValue(throwError(() => new Error('fail')));
      component.form.patchValue({ nome: 'Ana Silva', email: 'ana@email.com', cpf: '123' });
      component.salvar();
      expect(component.erro).toBe('Erro ao salvar paciente.');
      expect(component.salvando).toBeFalse();
    });

    it('campo() should return the matching AbstractControl', () => {
      expect(component.campo('nome')).toBe(component.form.get('nome'));
    });
  });

  describe('in edit mode (id present in route)', () => {
    let component: PacienteFormComponent;
    let fixture: ComponentFixture<PacienteFormComponent>;
    let serviceSpy: jasmine.SpyObj<PacienteService>;
    let router: Router;

    beforeEach(async () => {
      serviceSpy = jasmine.createSpyObj('PacienteService', ['buscar', 'cadastrar', 'atualizar']);
      serviceSpy.buscar.and.returnValue(of(mockPaciente));

      await TestBed.configureTestingModule({
        imports: [PacienteFormComponent, RouterTestingModule],
        providers: [
          { provide: PacienteService, useValue: serviceSpy },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } }
        ]
      }).compileComponents();

      router = TestBed.inject(Router);
      spyOn(router, 'navigate');

      fixture = TestBed.createComponent(PacienteFormComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create with isEdit true and pacienteId set', () => {
      expect(component.isEdit).toBeTrue();
      expect(component.pacienteId).toBe(1);
    });

    it('should load patient data from service on init', () => {
      expect(serviceSpy.buscar).toHaveBeenCalledWith(1);
      expect(component.form.get('nome')?.value).toBe('Ana Silva');
    });

    it('should disable email and cpf fields in edit mode', () => {
      expect(component.form.get('email')?.disabled).toBeTrue();
      expect(component.form.get('cpf')?.disabled).toBeTrue();
    });

    it('should call atualizar and navigate to /pacientes on valid submit', () => {
      serviceSpy.atualizar.and.returnValue(of(mockPaciente));
      component.salvar();
      expect(serviceSpy.atualizar).toHaveBeenCalledWith(
        1,
        jasmine.objectContaining({ nome: 'Ana Silva' })
      );
      expect(router.navigate).toHaveBeenCalledWith(['/pacientes']);
    });

    it('should set erro and clear salvando flag on atualizar failure', () => {
      serviceSpy.atualizar.and.returnValue(throwError(() => new Error('fail')));
      component.salvar();
      expect(component.erro).toBe('Erro ao salvar paciente.');
      expect(component.salvando).toBeFalse();
    });

    it('should set erro when buscar fails on init', () => {
      serviceSpy.buscar.and.returnValue(throwError(() => new Error('fail')));
      component.ngOnInit();
      expect(component.erro).toBe('Erro ao carregar paciente.');
      expect(component.loading).toBeFalse();
    });
  });
});
