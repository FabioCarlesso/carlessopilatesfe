import { ComponentFixture, TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AulaListComponent } from './aula-list.component';
import { AulaService } from '../../../core/services/aula.service';
import { AulaResponseDTO } from '../../../core/models/plano';

const mockAula: AulaResponseDTO = {
  id: 1, pacienteId: 10, pacienteNome: 'Ana Silva', pagamentoId: 1, data: '2026-05-05', realizada: false
};

registerLocaleData(localePt);

describe('AulaListComponent', () => {
  let component: AulaListComponent;
  let fixture: ComponentFixture<AulaListComponent>;
  let serviceSpy: jasmine.SpyObj<AulaService>;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('AulaService', ['listarPorPaciente', 'listarPorPagamento', 'realizar']);
    serviceSpy.listarPorPaciente.and.returnValue(of([mockAula]));

    await TestBed.configureTestingModule({
      imports: [AulaListComponent, RouterTestingModule],
      providers: [
        { provide: AulaService, useValue: serviceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: (key: string) => key === 'pacienteId' ? '10' : null } } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AulaListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => expect(component).toBeTruthy());

  it('should load aulas on init', () => {
    expect(serviceSpy.listarPorPaciente).toHaveBeenCalledWith(10);
    expect(component.aulas).toEqual([mockAula]);
    expect(component.loading).toBeFalse();
  });

  it('should set erro when listar fails', () => {
    serviceSpy.listarPorPaciente.and.returnValue(throwError(() => new Error('fail')));
    component.carregar();
    expect(component.erro).toBe('Erro ao carregar aulas.');
  });

  it('should call realizar and reload on success', () => {
    serviceSpy.realizar.and.returnValue(of({ ...mockAula, realizada: true }));
    component.realizar(1);
    expect(serviceSpy.realizar).toHaveBeenCalledWith(1);
    expect(serviceSpy.listarPorPaciente).toHaveBeenCalledTimes(2);
  });

  it('should set erro when realizar fails', () => {
    serviceSpy.realizar.and.returnValue(throwError(() => new Error('fail')));
    component.realizar(1);
    expect(component.erro).toBe('Erro ao marcar aula como realizada.');
  });

  it('should load aulas by pagamento when pagamentoId is present', async () => {
    const pagamentoRoute = { snapshot: { paramMap: { get: (key: string) => key === 'pagamentoId' ? '1' : null } } };
    serviceSpy.listarPorPagamento.and.returnValue(of([mockAula]));

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [AulaListComponent, RouterTestingModule],
      providers: [
        { provide: AulaService, useValue: serviceSpy },
        { provide: ActivatedRoute, useValue: pagamentoRoute }
      ]
    }).compileComponents();

    const pagamentoFixture = TestBed.createComponent(AulaListComponent);
    const pagamentoComponent = pagamentoFixture.componentInstance;
    pagamentoFixture.detectChanges();

    expect(serviceSpy.listarPorPagamento).toHaveBeenCalledWith(1);
    expect(pagamentoComponent.titulo).toBe('Aulas do Pagamento');
    expect(pagamentoComponent.pacienteId).toBe(10);
  });
});
