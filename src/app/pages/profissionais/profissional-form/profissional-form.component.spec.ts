import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProfissionalFormComponent } from './profissional-form.component';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { ProfissionalResponseDTO } from '../../../core/models/profissional';

const mockProfissional: ProfissionalResponseDTO = {
  id: 1,
  nome: 'Paula Mendes',
  email: 'paula@carlessopilates.com',
  cpf: '123.456.111-00',
  telefone: '(11) 98888-1111',
  tipoContrato: 'PJ',
  percentualPagamentoAula: 45,
  dataInicio: '2024-01-15',
  ativo: true
};

describe('ProfissionalFormComponent', () => {
  describe('in create mode', () => {
    let component: ProfissionalFormComponent;
    let fixture: ComponentFixture<ProfissionalFormComponent>;
    let serviceSpy: jasmine.SpyObj<ProfissionalService>;
    let router: Router;

    beforeEach(async () => {
      serviceSpy = jasmine.createSpyObj('ProfissionalService', ['cadastrar', 'buscar', 'atualizar']);

      await TestBed.configureTestingModule({
        imports: [ProfissionalFormComponent, RouterTestingModule],
        providers: [
          { provide: ProfissionalService, useValue: serviceSpy },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } }
        ]
      }).compileComponents();

      router = TestBed.inject(Router);
      spyOn(router, 'navigate');

      fixture = TestBed.createComponent(ProfissionalFormComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create with isEdit false', () => {
      expect(component).toBeTruthy();
      expect(component.isEdit).toBeFalse();
    });

    it('should initialize all form controls', () => {
      ['nome', 'email', 'cpf', 'telefone', 'tipoContrato', 'percentualPagamentoAula', 'dataInicio'].forEach(ctrl => {
        expect(component.form.contains(ctrl)).toBeTrue();
      });
    });

    it('should call cadastrar and navigate on valid submit', () => {
      serviceSpy.cadastrar.and.returnValue(of(mockProfissional));
      component.form.patchValue({
        nome: 'Paula Mendes',
        email: 'paula@carlessopilates.com',
        cpf: '123.456.111-00',
        tipoContrato: 'PJ',
        percentualPagamentoAula: 45,
        dataInicio: '2024-01-15'
      });
      component.salvar();
      expect(serviceSpy.cadastrar).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/profissionais']);
    });

    it('should not call service when form is invalid', () => {
      component.salvar();
      expect(serviceSpy.cadastrar).not.toHaveBeenCalled();
    });

    it('should set erro on cadastrar failure', () => {
      serviceSpy.cadastrar.and.returnValue(throwError(() => new Error('fail')));
      component.form.patchValue({
        nome: 'Paula Mendes',
        email: 'paula@carlessopilates.com',
        cpf: '123.456.111-00',
        tipoContrato: 'PJ',
        percentualPagamentoAula: 45,
        dataInicio: '2024-01-15'
      });
      component.salvar();
      expect(component.erro).toBe('Erro ao salvar profissional.');
      expect(component.salvando).toBeFalse();
    });
  });

  describe('in edit mode', () => {
    let component: ProfissionalFormComponent;
    let fixture: ComponentFixture<ProfissionalFormComponent>;
    let serviceSpy: jasmine.SpyObj<ProfissionalService>;
    let router: Router;

    beforeEach(async () => {
      serviceSpy = jasmine.createSpyObj('ProfissionalService', ['buscar', 'cadastrar', 'atualizar']);
      serviceSpy.buscar.and.returnValue(of(mockProfissional));

      await TestBed.configureTestingModule({
        imports: [ProfissionalFormComponent, RouterTestingModule],
        providers: [
          { provide: ProfissionalService, useValue: serviceSpy },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } }
        ]
      }).compileComponents();

      router = TestBed.inject(Router);
      spyOn(router, 'navigate');

      fixture = TestBed.createComponent(ProfissionalFormComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should load profissional data on init', () => {
      expect(component.isEdit).toBeTrue();
      expect(serviceSpy.buscar).toHaveBeenCalledWith(1);
      expect(component.form.get('nome')?.value).toBe('Paula Mendes');
    });

    it('should disable cpf field in edit mode', () => {
      expect(component.form.get('cpf')?.disabled).toBeTrue();
    });

    it('should call atualizar and navigate on valid submit', () => {
      serviceSpy.atualizar.and.returnValue(of(mockProfissional));
      component.salvar();
      expect(serviceSpy.atualizar).toHaveBeenCalledWith(
        1,
        jasmine.objectContaining({ nome: 'Paula Mendes', email: 'paula@carlessopilates.com' })
      );
      expect(router.navigate).toHaveBeenCalledWith(['/profissionais']);
    });

    it('should set erro on atualizar failure', () => {
      serviceSpy.atualizar.and.returnValue(throwError(() => new Error('fail')));
      component.salvar();
      expect(component.erro).toBe('Erro ao salvar profissional.');
      expect(component.salvando).toBeFalse();
    });

    it('should set erro when buscar fails', () => {
      serviceSpy.buscar.and.returnValue(throwError(() => new Error('fail')));
      component.ngOnInit();
      expect(component.erro).toBe('Erro ao carregar profissional.');
    });
  });

  describe('with invalid id in route', () => {
    let component: ProfissionalFormComponent;
    let fixture: ComponentFixture<ProfissionalFormComponent>;
    let serviceSpy: jasmine.SpyObj<ProfissionalService>;

    beforeEach(async () => {
      serviceSpy = jasmine.createSpyObj('ProfissionalService', ['buscar', 'cadastrar', 'atualizar']);

      await TestBed.configureTestingModule({
        imports: [ProfissionalFormComponent, RouterTestingModule],
        providers: [
          { provide: ProfissionalService, useValue: serviceSpy },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'abc' }) } } }
        ]
      }).compileComponents();

      fixture = TestBed.createComponent(ProfissionalFormComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should not load profissional or enter edit mode', () => {
      expect(component.erro).toBe('Identificador inválido.');
      expect(component.parametroInvalido).toBeTrue();
      expect(component.isEdit).toBeFalse();
      expect(serviceSpy.buscar).not.toHaveBeenCalled();
    });

    it('should hide form when id route param is invalid', () => {
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
    });

    it('should not call cadastrar when saving with invalid route param', () => {
      component.form.patchValue({
        nome: 'Paula Mendes',
        email: 'paula@carlessopilates.com',
        cpf: '123.456.111-00',
        tipoContrato: 'PJ',
        percentualPagamentoAula: 45,
        dataInicio: '2024-01-15'
      });

      component.salvar();

      expect(component.erro).toBe('Identificador inválido.');
      expect(serviceSpy.cadastrar).not.toHaveBeenCalled();
      expect(serviceSpy.atualizar).not.toHaveBeenCalled();
    });
  });
});
