import { ChangeDetectorRef, DestroyRef } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { isOnPush } from '../../../../testing/onpush';
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

  it('should use OnPush change detection strategy', () => {
    expect(isOnPush(PlanoListComponent)).toBeTrue();
  });

  it('should mark for check after loading the list', () => {
    const cdr = (component as unknown as { cdr: { markForCheck: () => void } }).cdr;
    const markForCheckSpy = spyOn(cdr, 'markForCheck');
    component.carregar();
    expect(markForCheckSpy).toHaveBeenCalled();
  });

  it('should track table rows by id', () => {
    expect(component.trackByPlano(0, mockPlano)).toBe(mockPlano.id);
  });

  it('should wrap the table in a scroll container to keep overflow inside the card', () => {
    const table: HTMLTableElement = fixture.nativeElement.querySelector('table.table');
    expect(table).toBeTruthy();
    expect(table.parentElement?.classList.contains('table-wrap')).toBeTrue();
  });

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

  it('should show sucesso with role status after inativar and clear it after timeout', fakeAsync(() => {
    serviceSpy.inativar.and.returnValue(of(undefined));
    component.confirmarInativarId = 1;
    component.inativar();
    expect(component.sucesso).toBe('Plano inativado com sucesso.');
    fixture.detectChanges();
    const alert = fixture.nativeElement.querySelector('.alert-success');
    expect(alert).toBeTruthy();
    expect(alert.getAttribute('role')).toBe('status');
    tick(4000);
    expect(component.sucesso).toBeNull();
  }));

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
    const invalidComponent = new PlanoListComponent(invalidServiceSpy, invalidRoute, { markForCheck: () => {} } as ChangeDetectorRef, { onDestroy: () => () => {} } as DestroyRef);

    invalidComponent.ngOnInit();

    expect(invalidComponent.erro).toBe('Identificador inválido.');
    expect(invalidServiceSpy.listar).not.toHaveBeenCalled();
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

});
