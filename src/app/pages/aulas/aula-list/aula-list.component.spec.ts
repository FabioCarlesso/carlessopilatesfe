import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { AulaListComponent } from './aula-list.component';
import { AulaService } from '../../../core/services/aula.service';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { AulaResponseDTO, PagamentoResponseDTO } from '../../../core/models/plano';
import { ProfissionalPage, ProfissionalResponseDTO } from '../../../core/models/profissional';

const mockAula: AulaResponseDTO = {
  id: 1, pacienteId: 10, pacienteNome: 'Ana Silva', pagamentoId: 1, data: '2026-05-05', realizada: false
};

const mockPagamento: PagamentoResponseDTO = {
  id: 1, pacienteId: 10, pacienteNome: 'Ana Silva', planoId: 1,
  valor: 250, status: 'PENDENTE', dataPagamento: null,
  dataVencimento: '2026-05-10', periodoInicio: '2026-05-01', periodoFim: '2026-05-31'
};

const mockProfissional: ProfissionalResponseDTO = {
  id: 5,
  nome: 'Paula Mendes',
  email: 'paula@carlessopilates.com',
  cpf: '123.456.111-00',
  telefone: '(11) 98888-1111',
  tipoContrato: 'PJ',
  percentualPagamentoAula: 45,
  dataInicio: '2024-01-15',
  ativo: true
};

const mockProfissionalPage: ProfissionalPage = {
  content: [mockProfissional],
  page: { totalElements: 1, totalPages: 1, size: 100, number: 0 }
};

registerLocaleData(localePt);

describe('AulaListComponent', () => {
  describe('when route has pacienteId', () => {
    let component: AulaListComponent;
    let fixture: ComponentFixture<AulaListComponent>;
    let serviceSpy: jasmine.SpyObj<AulaService>;
    let pagamentoServiceSpy: jasmine.SpyObj<PagamentoService>;
    let profissionalServiceSpy: jasmine.SpyObj<ProfissionalService>;

    beforeEach(async () => {
      serviceSpy = jasmine.createSpyObj('AulaService', ['listarPorPaciente', 'listarPorPagamento', 'realizar']);
      pagamentoServiceSpy = jasmine.createSpyObj('PagamentoService', ['buscar']);
      profissionalServiceSpy = jasmine.createSpyObj('ProfissionalService', ['listar']);
      serviceSpy.listarPorPaciente.and.returnValue(of([mockAula]));
      profissionalServiceSpy.listar.and.returnValue(of(mockProfissionalPage));

      await TestBed.configureTestingModule({
        imports: [AulaListComponent, RouterTestingModule],
        providers: [
          { provide: AulaService, useValue: serviceSpy },
          { provide: PagamentoService, useValue: pagamentoServiceSpy },
          { provide: ProfissionalService, useValue: profissionalServiceSpy },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: (key: string) => key === 'pacienteId' ? '10' : null } } } }
        ]
      }).compileComponents();

      fixture = TestBed.createComponent(AulaListComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create', () => expect(component).toBeTruthy());

    it('should use OnPush change detection strategy', () => {
      expect((AulaListComponent as unknown as { ɵcmp: { onPush: boolean } }).ɵcmp.onPush).toBeTrue();
    });

    it('should mark for check after loading the list', () => {
      const cdr = (component as unknown as { cdr: { markForCheck: () => void } }).cdr;
      const markForCheckSpy = spyOn(cdr, 'markForCheck');
      component.carregar();
      expect(markForCheckSpy).toHaveBeenCalled();
    });

    it('should load aulas on init', () => {
      expect(serviceSpy.listarPorPaciente).toHaveBeenCalledWith(10);
      expect(profissionalServiceSpy.listar).toHaveBeenCalledWith(0, 100);
      expect(component.aulas).toEqual([mockAula]);
      expect(component.profissionais).toEqual([mockProfissional]);
      expect(component.loading).toBeFalse();
    });

    it('should set erro when profissionais fail to load', () => {
      profissionalServiceSpy.listar.and.returnValue(throwError(() => new Error('fail')));
      component.carregarProfissionais();
      expect(component.erro).toBe('Erro ao carregar profissionais.');
    });

    it('should set erro when listar fails', () => {
      serviceSpy.listarPorPaciente.and.returnValue(throwError(() => new Error('fail')));
      component.carregar();
      expect(component.erro).toBe('Erro ao carregar aulas.');
    });

    it('should call realizar and reload on success', () => {
      serviceSpy.realizar.and.returnValue(of({ ...mockAula, realizada: true }));
      component.profissionalSelecionadoPorAula[1] = 5;
      component.realizar(1);
      expect(serviceSpy.realizar).toHaveBeenCalledWith(1, 5);
      expect(serviceSpy.listarPorPaciente).toHaveBeenCalledTimes(2);
    });

    it('should require profissional before realizar', () => {
      component.profissionalSelecionadoPorAula[1] = null;
      component.realizar(1);
      expect(component.erro).toBe('Selecione um profissional para marcar a aula como realizada.');
      expect(serviceSpy.realizar).not.toHaveBeenCalled();
    });

    it('should set erro when realizar fails', () => {
      serviceSpy.realizar.and.returnValue(throwError(() => new Error('fail')));
      component.profissionalSelecionadoPorAula[1] = 5;
      component.realizar(1);
      expect(component.erro).toBe('Erro ao marcar aula como realizada.');
    });
  });

  describe('when route has pagamentoId', () => {
    let component: AulaListComponent;
    let fixture: ComponentFixture<AulaListComponent>;
    let serviceSpy: jasmine.SpyObj<AulaService>;
    let pagamentoServiceSpy: jasmine.SpyObj<PagamentoService>;
    let profissionalServiceSpy: jasmine.SpyObj<ProfissionalService>;

    beforeEach(async () => {
      serviceSpy = jasmine.createSpyObj('AulaService', ['listarPorPaciente', 'listarPorPagamento', 'realizar']);
      pagamentoServiceSpy = jasmine.createSpyObj('PagamentoService', ['buscar']);
      profissionalServiceSpy = jasmine.createSpyObj('ProfissionalService', ['listar']);
      serviceSpy.listarPorPagamento.and.returnValue(of([mockAula]));
      pagamentoServiceSpy.buscar.and.returnValue(of(mockPagamento));
      profissionalServiceSpy.listar.and.returnValue(of(mockProfissionalPage));

      await TestBed.configureTestingModule({
        imports: [AulaListComponent, RouterTestingModule],
        providers: [
          { provide: AulaService, useValue: serviceSpy },
          { provide: PagamentoService, useValue: pagamentoServiceSpy },
          { provide: ProfissionalService, useValue: profissionalServiceSpy },
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
      expect(profissionalServiceSpy.listar).toHaveBeenCalledWith(0, 100);
      expect(component.pacienteId).toBe(10);
      expect(component.titulo).toBe('Aulas do Pagamento');
    });

    it('should set erro when buscar payment fails', () => {
      pagamentoServiceSpy.buscar.and.returnValue(throwError(() => new Error('fail')));
      component.ngOnInit();
      expect(component.erro).toBe('Erro ao carregar dados do pagamento.');
      expect(component.loading).toBeFalse();
    });

    it('should show loading while fetching payment before loading aulas', () => {
      const pagamentoSubject = new Subject<PagamentoResponseDTO>();
      pagamentoServiceSpy.buscar.and.returnValue(pagamentoSubject.asObservable());
      serviceSpy.listarPorPagamento.calls.reset();

      component.ngOnInit();

      expect(component.loading).toBeTrue();
      expect(serviceSpy.listarPorPagamento).not.toHaveBeenCalled();

      pagamentoSubject.next(mockPagamento);
      pagamentoSubject.complete();

      expect(serviceSpy.listarPorPagamento).toHaveBeenCalledWith(1);
      expect(component.loading).toBeFalse();
    });
  });

  it('should not load aulas when route param is invalid', () => {
    const serviceSpy = jasmine.createSpyObj('AulaService', ['listarPorPaciente', 'listarPorPagamento', 'realizar']);
    const pagamentoServiceSpy = jasmine.createSpyObj('PagamentoService', ['buscar']);
    const profissionalServiceSpy = jasmine.createSpyObj('ProfissionalService', ['listar']);
    const invalidRoute = { snapshot: { paramMap: convertToParamMap({ pacienteId: 'abc' }) } } as ActivatedRoute;
    const component = new AulaListComponent(serviceSpy, pagamentoServiceSpy, profissionalServiceSpy, invalidRoute, { markForCheck: () => {} } as ChangeDetectorRef);

    component.ngOnInit();

    expect(component.erro).toBe('Identificador inválido.');
    expect(serviceSpy.listarPorPaciente).not.toHaveBeenCalled();
    expect(serviceSpy.listarPorPagamento).not.toHaveBeenCalled();
    expect(pagamentoServiceSpy.buscar).not.toHaveBeenCalled();
    expect(profissionalServiceSpy.listar).not.toHaveBeenCalled();
  });
});
