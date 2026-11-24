import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { TomadorDetailComponent } from './tomador-detail.component';
import { TomadorService } from '../../../core/services/tomador.service';
import { AuthService } from '../../../core/services/auth.service';
import { TomadorResponseDTO } from '../../../core/models/tomador';

const empresa: TomadorResponseDTO = {
  id: 3, nome: 'Empresa Ltda', cpfCnpj: '11222333000181', email: null, telefone: null, observacoes: null,
  ativo: true, quantidadePacientes: 2, version: 0
};

describe('TomadorDetailComponent', () => {
  let fixture: ComponentFixture<TomadorDetailComponent>;
  let component: TomadorDetailComponent;
  let serviceSpy: jasmine.SpyObj<TomadorService>;

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj('TomadorService', ['buscar', 'pacientes', 'inativar', 'ativar']);
    serviceSpy.buscar.and.returnValue(of(empresa));
    serviceSpy.pacientes.and.returnValue(of([
      { id: 7, nome: 'Ana', ativo: true, cpfNaNota: true },
      { id: 8, nome: 'Bia', ativo: false, cpfNaNota: false }
    ]));
    serviceSpy.inativar.and.returnValue(of(undefined));
    await TestBed.configureTestingModule({
      imports: [TomadorDetailComponent, RouterTestingModule],
      providers: [
        { provide: TomadorService, useValue: serviceSpy },
        { provide: AuthService, useValue: { hasAnyRole: () => true } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '3' }) } } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(TomadorDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should show the data, the linked patients and the link to its invoices', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('11.222.333/0001-81');
    expect(el.textContent).toContain('Pacientes vinculados (2)');
    expect(el.querySelector('a[href="/pacientes/7"]')?.textContent?.trim()).toBe('Ana');
    expect(el.querySelector('a[href="/relatorios/nfse?tomadorId=3"]')).not.toBeNull();
  });

  it('should inactivate and reload', () => {
    component.alterarSituacao();
    expect(serviceSpy.inativar).toHaveBeenCalledWith(3);
    expect(serviceSpy.buscar).toHaveBeenCalledTimes(2);
  });
});
