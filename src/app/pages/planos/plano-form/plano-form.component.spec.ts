import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { PlanoFormComponent } from './plano-form.component';
import { PlanoService } from '../../../core/services/plano.service';
import { PlanoResponseDTO } from '../../../core/models/plano';

const mockPlano: PlanoResponseDTO = {
  id: 1, pacienteId: 10, tipo: 'MENSAL', valor: 250,
  frequenciaSemanal: 'DUAS_VEZES', dataInicio: '2026-05-01',
  diasSemana: ['MONDAY', 'WEDNESDAY'], ativo: true
};

describe('PlanoFormComponent', () => {
  let component: PlanoFormComponent;
  let fixture: ComponentFixture<PlanoFormComponent>;
  let serviceSpy: jasmine.SpyObj<PlanoService>;
  let router: Router;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('PlanoService', ['criar']);

    await TestBed.configureTestingModule({
      imports: [PlanoFormComponent, RouterTestingModule],
      providers: [
        { provide: PlanoService, useValue: serviceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: (key: string) => key === 'pacienteId' ? '10' : null } } } }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(PlanoFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());

  it('should initialize with pacienteId from route', () => {
    expect(component.pacienteId).toBe(10);
  });

  it('should have all form controls', () => {
    ['tipo', 'valor', 'frequenciaSemanal', 'dataInicio', 'diasSemana'].forEach(c =>
      expect(component.form.contains(c)).toBeTrue()
    );
  });

  it('should fail validation when diasSemana count does not match frequencia', () => {
    component.form.patchValue({ frequenciaSemanal: 'DUAS_VEZES', diasSemana: ['MONDAY'] });
    component.form.get('diasSemana')?.markAsTouched();
    expect(component.form.get('diasSemana')?.hasError('diasInvalidos')).toBeTrue();
  });

  it('should pass validation when diasSemana matches frequencia', () => {
    component.form.patchValue({ frequenciaSemanal: 'DUAS_VEZES', diasSemana: ['MONDAY', 'WEDNESDAY'] });
    expect(component.form.get('diasSemana')?.hasError('diasInvalidos')).toBeFalse();
  });

  it('toggleDia should add and remove a day', () => {
    component.toggleDia('MONDAY');
    expect(component.diaSelecionado('MONDAY')).toBeTrue();
    component.toggleDia('MONDAY');
    expect(component.diaSelecionado('MONDAY')).toBeFalse();
  });

  it('diasEsperados should return correct count for frequencia', () => {
    component.form.get('frequenciaSemanal')?.setValue('TRES_VEZES');
    expect(component.diasEsperados()).toBe(3);
  });

  it('should call criar and navigate on valid submit', () => {
    serviceSpy.criar.and.returnValue(of(mockPlano));
    component.form.setValue({
      tipo: 'MENSAL',
      valor: 250,
      frequenciaSemanal: 'DUAS_VEZES',
      dataInicio: '2026-05-01',
      diasSemana: ['MONDAY', 'WEDNESDAY']
    });
    component.salvar();
    expect(serviceSpy.criar).toHaveBeenCalledWith({ ...component.form.value, pacienteId: 10 });
    expect(router.navigate).toHaveBeenCalledWith(['/planos/paciente', 10]);
  });

  it('should set erro on criar failure', () => {
    serviceSpy.criar.and.returnValue(throwError(() => new Error('fail')));
    component.form.setValue({
      tipo: 'MENSAL', valor: 250, frequenciaSemanal: 'UMA_VEZ',
      dataInicio: '2026-05-01', diasSemana: ['MONDAY']
    });
    component.salvar();
    expect(component.erro).toBe('Erro ao salvar plano.');
    expect(component.salvando).toBeFalse();
  });

  it('should not call service when form is invalid', () => {
    component.salvar();
    expect(serviceSpy.criar).not.toHaveBeenCalled();
  });

  it('should not call criar when pacienteId route param is invalid', () => {
    const invalidServiceSpy = jasmine.createSpyObj('PlanoService', ['criar']);
    const invalidRouterSpy = jasmine.createSpyObj('Router', ['navigate']);
    const invalidRoute = { snapshot: { paramMap: convertToParamMap({ pacienteId: 'abc' }) } } as ActivatedRoute;
    const invalidComponent = new PlanoFormComponent(
      TestBed.inject(FormBuilder),
      invalidServiceSpy,
      invalidRoute,
      invalidRouterSpy
    );

    invalidComponent.ngOnInit();
    invalidComponent.form.setValue({
      tipo: 'MENSAL',
      valor: 250,
      frequenciaSemanal: 'UMA_VEZ',
      dataInicio: '2026-05-01',
      diasSemana: ['MONDAY']
    });
    invalidComponent.salvar();

    expect(invalidComponent.erro).toBe('Identificador inválido.');
    expect(invalidServiceSpy.criar).not.toHaveBeenCalled();
  });
});
