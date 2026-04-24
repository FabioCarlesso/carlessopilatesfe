import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProfissionalDetailComponent } from './profissional-detail.component';
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

describe('ProfissionalDetailComponent', () => {
  let component: ProfissionalDetailComponent;
  let fixture: ComponentFixture<ProfissionalDetailComponent>;
  let serviceSpy: jasmine.SpyObj<ProfissionalService>;
  let router: Router;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('ProfissionalService', ['buscar', 'ativar', 'inativar']);
    serviceSpy.buscar.and.returnValue(of(mockProfissional));

    await TestBed.configureTestingModule({
      imports: [ProfissionalDetailComponent, RouterTestingModule],
      providers: [
        { provide: ProfissionalService, useValue: serviceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(ProfissionalDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load profissional on init', () => {
    expect(serviceSpy.buscar).toHaveBeenCalledWith(1);
    expect(component.profissional).toEqual(mockProfissional);
  });

  it('should navigate after ativar succeeds', () => {
    component.profissional = { ...mockProfissional, ativo: false };
    serviceSpy.ativar.and.returnValue(of(undefined));
    component.ativar();
    expect(serviceSpy.ativar).toHaveBeenCalledWith(1);
    expect(router.navigate).toHaveBeenCalledWith(['/profissionais']);
  });

  it('should navigate after inativar succeeds', () => {
    serviceSpy.inativar.and.returnValue(of(undefined));
    component.inativar();
    expect(serviceSpy.inativar).toHaveBeenCalledWith(1);
    expect(router.navigate).toHaveBeenCalledWith(['/profissionais']);
  });

  it('should set erro when buscar fails', () => {
    serviceSpy.buscar.and.returnValue(throwError(() => new Error('fail')));
    component.ngOnInit();
    expect(component.erro).toBe('Profissional não encontrado.');
  });

  it('should set erro when ativar fails', () => {
    component.profissional = { ...mockProfissional, ativo: false };
    serviceSpy.ativar.and.returnValue(throwError(() => new Error('fail')));
    component.ativar();
    expect(component.erro).toBe('Erro ao ativar profissional.');
  });

  it('should set erro when inativar fails', () => {
    serviceSpy.inativar.and.returnValue(throwError(() => new Error('fail')));
    component.inativar();
    expect(component.erro).toBe('Erro ao inativar profissional.');
  });
});
