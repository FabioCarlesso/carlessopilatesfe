import { ComponentFixture, TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AulaListComponent } from './aula-list.component';
import { AulaService } from '../../../core/services/aula.service';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { AulaResponseDTO, PagamentoResponseDTO } from '../../../core/models/plano';

const mockAula: AulaResponseDTO = {
  id: 1, pacienteId: 10, pacienteNome: 'Ana Silva', pagamentoId: 1, data: '2026-05-05', realizada: false
};

const mockPagamento: PagamentoResponseDTO = {
  id: 1, pacienteId: 10, pacienteNome: 'Ana Silva', planoId: 1,
  valor: 250, status: 'PENDENTE', dataPagamento: null,
  dataVencimento: '2026-05-10', periodoInicio: '2026-05-01', periodoFim: '2026-05-31'
};

registerLocaleData(localePt);

describe('AulaListComponent', () => {
  describe('when route has pacienteId', () => {
    let component: AulaListComponent;
    let fixture: ComponentFixture<AulaListComponent>;
    let serviceSpy: jasmine.SpyObj<AulaService>;
    let pagamentoServiceSpy: jasmine.SpyObj<PagamentoService>;

    beforeEach(async () => {
      serviceSpy = jasmine.createSpyObj('AulaService', ['listarPorPaciente', 'listarPorPagamento', 'realizar']);
      pagamentoServiceSpy = jasmine.createSpyObj('PagamentoService', ['buscar']);
      serviceSpy.listarPorPaciente.and.returnValue(of([mockAula]));

      await TestBed.configureTestingModule({
        imports: [AulaListComponent, RouterTestingModule],
        providers: [
          { provide: AulaService, useValue: serviceSpy },
          { provide: PagamentoService, useValue: pagamentoServiceSpy },
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
  });

  describe('when route has pagamentoId', () => {
    let component: AulaListComponent;
    let fixture: ComponentFixture<AulaListComponent>;
    let serviceSpy: jasmine.SpyObj<AulaService>;
    let pagamentoServiceSpy: jasmine.SpyObj<PagamentoService>;

    beforeEach(async () => {
      serviceSpy = jasmine.createSpyObj('AulaService', ['listarPorPaciente', 'listarPorPagamento', 'realizar']);
      pagamentoServiceSpy = jasmine.createSpyObj('PagamentoService', ['buscar']);
      serviceSpy.listarPorPagamento.and.returnValue(of([mockAula]));
      pagamentoServiceSpy.buscar.and.returnValue(of(mockPagamento));

      await TestBed.configureTestingModule({
        imports: [AulaListComponent, RouterTestingModule],
        providers: [
          { provide: AulaService, useValue: serviceSpy },
          { provide: PagamentoService, useValue: pagamentoServiceSpy },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: (key: string) => key === 'pagamentoId' ? '1' : null } } } }
        ]
      }).compileComponents();

      fixture = TestBed.createComponent(AulaListComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should fetch payment to resolve pacienteId then load aulas', () => {
      expect(pagamentoServiceSpy.buscar).toHaveBeenCalledWith(1);
      expect(serviceSpy.listarPorPagamento).toHaveBeenCalledWith(1);
      expect(component.pacienteId).toBe(10);
      expect(component.titulo).toBe('Aulas do Pagamento');
    });

    it('should set erro when buscar payment fails', () => {
      pagamentoServiceSpy.buscar.and.returnValue(throwError(() => new Error('fail')));
      component.ngOnInit();
      expect(component.erro).toBe('Erro ao carregar dados do pagamento.');
    });
  });
});
