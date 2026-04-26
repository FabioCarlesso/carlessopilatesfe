import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PlanoListComponent } from './plano-list.component';
import { PlanoService } from '../../../core/services/plano.service';
import { PlanoResponseDTO } from '../../../core/models/plano';

const mockPlano: PlanoResponseDTO = {
  id: 1, pacienteId: 10, tipo: 'MENSAL', valor: 250,
  frequenciaSemanal: 'DUAS_VEZES', dataInicio: '2026-05-01',
  diasSemana: ['MONDAY', 'WEDNESDAY'], ativo: true
};

describe('PlanoListComponent', () => {
  let component: PlanoListComponent;
  let fixture: ComponentFixture<PlanoListComponent>;
  let serviceSpy: jasmine.SpyObj<PlanoService>;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('PlanoService', ['listar', 'inativar']);
    serviceSpy.listar.and.returnValue(of([mockPlano]));

    await TestBed.configureTestingModule({
      imports: [PlanoListComponent, RouterTestingModule],
      providers: [
        { provide: PlanoService, useValue: serviceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '10' } } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PlanoListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());

  it('should load planos on init', () => {
    expect(serviceSpy.listar).toHaveBeenCalledWith(10);
    expect(component.planos).toEqual([mockPlano]);
    expect(component.loading).toBeFalse();
  });

  it('should set erro when listar fails', () => {
    serviceSpy.listar.and.returnValue(throwError(() => new Error('fail')));
    component.carregar();
    expect(component.erro).toBe('Erro ao carregar planos.');
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

  it('should call inativar service and reload on success', () => {
    serviceSpy.inativar.and.returnValue(of(undefined));
    component.confirmarInativarId = 1;
    component.inativar();
    expect(serviceSpy.inativar).toHaveBeenCalledWith(1);
    expect(component.confirmarInativarId).toBeNull();
    expect(serviceSpy.listar).toHaveBeenCalledTimes(2);
  });

  it('should set erro when inativar fails', () => {
    serviceSpy.inativar.and.returnValue(throwError(() => new Error('fail')));
    component.confirmarInativarId = 1;
    component.inativar();
    expect(component.erro).toBe('Erro ao inativar plano.');
  });

  it('diasFormatados should join day labels', () => {
    const result = component.diasFormatados(mockPlano);
    expect(result).toBe('Segunda, Quarta');
  });

  it('should not load planos when pacienteId route param is invalid', () => {
    const invalidServiceSpy = jasmine.createSpyObj('PlanoService', ['listar', 'inativar']);
    const invalidRoute = { snapshot: { paramMap: convertToParamMap({ pacienteId: 'abc' }) } } as ActivatedRoute;
    const invalidComponent = new PlanoListComponent(invalidServiceSpy, invalidRoute);

    invalidComponent.ngOnInit();

    expect(invalidComponent.erro).toBe('Identificador inválido.');
    expect(invalidServiceSpy.listar).not.toHaveBeenCalled();
  });
});
