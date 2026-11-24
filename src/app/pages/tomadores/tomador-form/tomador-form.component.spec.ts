import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { TomadorFormComponent } from './tomador-form.component';
import { TomadorService } from '../../../core/services/tomador.service';
import { TomadorResponseDTO } from '../../../core/models/tomador';

const empresa: TomadorResponseDTO = {
  id: 3, nome: 'Empresa Ltda', cpfCnpj: '11222333000181', email: 'fin@empresa.com', telefone: '45999990000',
  observacoes: null, ativo: true, quantidadePacientes: 2, version: 4
};

function configurar(id: string | null): { serviceSpy: jasmine.SpyObj<TomadorService>; router: Router } {
  const serviceSpy = jasmine.createSpyObj('TomadorService', ['buscar', 'cadastrar', 'atualizar']);
  serviceSpy.buscar.and.returnValue(of(empresa));
  TestBed.configureTestingModule({
    imports: [TomadorFormComponent, RouterTestingModule],
    providers: [
      { provide: TomadorService, useValue: serviceSpy },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } }
    ]
  });
  const router = TestBed.inject(Router);
  spyOn(router, 'navigate');
  return { serviceSpy, router };
}

describe('TomadorFormComponent', () => {
  describe('creating', () => {
    let fixture: ComponentFixture<TomadorFormComponent>;
    let component: TomadorFormComponent;
    let serviceSpy: jasmine.SpyObj<TomadorService>;
    let router: Router;

    beforeEach(() => {
      ({ serviceSpy, router } = configurar(null));
      fixture = TestBed.createComponent(TomadorFormComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should require name and a valid CPF/CNPJ', () => {
      component.form.patchValue({ nome: 'Empresa', cpfCnpj: '123' });
      component.salvar();
      expect(component.form.get('cpfCnpj')?.hasError('cpfCnpj')).toBeTrue();
      expect(serviceSpy.cadastrar).not.toHaveBeenCalled();
    });

    it('should send only digits and leave empty optionals out, then open the detail', () => {
      serviceSpy.cadastrar.and.returnValue(of(empresa));
      component.form.patchValue({ nome: ' Empresa Ltda ', cpfCnpj: '11.222.333/0001-81' });

      component.salvar();

      expect(serviceSpy.cadastrar).toHaveBeenCalledWith({
        nome: 'Empresa Ltda', cpfCnpj: '11222333000181', email: undefined, telefone: undefined, observacoes: undefined
      });
      expect(router.navigate).toHaveBeenCalledWith(['/tomadores', 3]);
    });

    it('should show the API message when the document already belongs to another tomador', () => {
      serviceSpy.cadastrar.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 409, error: { detail: 'CPF/CNPJ já cadastrado para outro tomador' }
      })));
      component.form.patchValue({ nome: 'Empresa Ltda', cpfCnpj: '11222333000181' });

      component.salvar();

      expect(component.erro).toBe('CPF/CNPJ já cadastrado para outro tomador');
    });
  });

  describe('editing', () => {
    let fixture: ComponentFixture<TomadorFormComponent>;
    let component: TomadorFormComponent;
    let serviceSpy: jasmine.SpyObj<TomadorService>;

    beforeEach(() => {
      ({ serviceSpy } = configurar('3'));
      fixture = TestBed.createComponent(TomadorFormComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should load the tomador with the document masked', () => {
      expect(component.isEdit).toBeTrue();
      expect(component.form.get('cpfCnpj')?.value).toBe('11.222.333/0001-81');
    });

    it('should send the version and an empty e-mail to clear it', () => {
      serviceSpy.atualizar.and.returnValue(of(empresa));
      component.form.patchValue({ email: '' });

      component.salvar();

      expect(serviceSpy.atualizar).toHaveBeenCalledWith(3, jasmine.objectContaining({ email: '', version: 4 }));
    });
  });
});
