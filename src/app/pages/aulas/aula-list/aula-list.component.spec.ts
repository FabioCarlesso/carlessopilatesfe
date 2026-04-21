import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AulaListComponent } from './aula-list.component';
import { AulaService } from '../../../core/services/aula.service';
import { AulaResponseDTO } from '../../../core/models/plano';

const mockAula: AulaResponseDTO = {
  id: 1, pacienteId: 10, pagamentoId: 1, data: '2026-05-05', realizada: false
};

describe('AulaListComponent', () => {
  let component: AulaListComponent;
  let fixture: ComponentFixture<AulaListComponent>;
  let serviceSpy: jasmine.SpyObj<AulaService>;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('AulaService', ['listar', 'confirmar']);
    serviceSpy.listar.and.returnValue(of([mockAula]));

    await TestBed.configureTestingModule({
      imports: [AulaListComponent, RouterTestingModule],
      providers: [
        { provide: AulaService, useValue: serviceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '10' } } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AulaListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());

  it('should load aulas on init', () => {
    expect(serviceSpy.listar).toHaveBeenCalledWith(10);
    expect(component.aulas).toEqual([mockAula]);
    expect(component.loading).toBeFalse();
  });

  it('should set erro when listar fails', () => {
    serviceSpy.listar.and.returnValue(throwError(() => new Error('fail')));
    component.carregar();
    expect(component.erro).toBe('Erro ao carregar aulas.');
  });

  it('should call confirmar and reload on success', () => {
    serviceSpy.confirmar.and.returnValue(of(undefined));
    component.confirmar(1);
    expect(serviceSpy.confirmar).toHaveBeenCalledWith(1);
    expect(serviceSpy.listar).toHaveBeenCalledTimes(2);
  });

  it('should set erro when confirmar fails', () => {
    serviceSpy.confirmar.and.returnValue(throwError(() => new Error('fail')));
    component.confirmar(1);
    expect(component.erro).toBe('Erro ao confirmar presença.');
  });
});
