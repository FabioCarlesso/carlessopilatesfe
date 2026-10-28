import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { PacienteFormComponent } from './paciente-form.component';
import { PacienteService } from '../../../core/services/paciente.service';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { MENSAGEM_CONFLITO_CONCORRENCIA } from '../../../shared/utils/api-error';

const mockPaciente: PacienteResponseDTO = {
  version: 0,
  id: 1,
  nome: 'Ana Silva',
  email: 'ana@email.com',
  cpf: '123.456.789-00',
  telefone: '(11) 99999-9999',
  dataNascimento: '1990-05-15',
  endereco: null,
  ativo: true
};

describe('PacienteFormComponent', () => {
  describe('in create mode (no id in route)', () => {
    let component: PacienteFormComponent;
    let fixture: ComponentFixture<PacienteFormComponent>;
    let serviceSpy: jasmine.SpyObj<PacienteService>;
    let router: Router;

    beforeEach(async () => {
      serviceSpy = jasmine.createSpyObj('PacienteService', ['cadastrar', 'buscar', 'atualizar']);

      await TestBed.configureTestingModule({
        imports: [PacienteFormComponent, RouterTestingModule],
        providers: [
          { provide: PacienteService, useValue: serviceSpy },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } }
        ]
      }).compileComponents();

      router = TestBed.inject(Router);
      spyOn(router, 'navigate');

      fixture = TestBed.createComponent(PacienteFormComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create with isEdit false', () => {
      expect(component).toBeTruthy();
      expect(component.isEdit).toBeFalse();
      expect(component.pacienteId).toBeNull();
    });

    it('should initialize all form controls', () => {
      ['nome', 'email', 'cpf', 'telefone', 'dataNascimento', 'endereco'].forEach(ctrl => {
        expect(component.form.contains(ctrl)).toBeTrue();
      });
    });

    it('should have email and cpf enabled in create mode', () => {
      expect(component.form.get('email')?.disabled).toBeFalse();
      expect(component.form.get('cpf')?.disabled).toBeFalse();
    });

    it('should mark nome as invalid when fewer than 3 characters', () => {
      component.form.get('nome')?.setValue('AB');
      expect(component.form.get('nome')?.hasError('minlength')).toBeTrue();
    });

    it('should mark nome as invalid when empty', () => {
      component.form.get('nome')?.setValue('');
      expect(component.form.get('nome')?.hasError('required')).toBeTrue();
    });

    it('should mark email as invalid when malformed', () => {
      component.form.get('email')?.setValue('not-an-email');
      expect(component.form.get('email')?.hasError('email')).toBeTrue();
    });

    it('should call cadastrar and navigate to /pacientes on valid submit', () => {
      serviceSpy.cadastrar.and.returnValue(of(mockPaciente));
      component.form.patchValue({
        nome: 'Ana Silva',
        email: 'ana@email.com',
        cpf: '123.456.789-09'
      });
      component.salvar();
      expect(serviceSpy.cadastrar).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/pacientes']);
    });

    it('should not call service when form is invalid', () => {
      component.form.get('nome')?.setValue('');
      component.salvar();
      expect(serviceSpy.cadastrar).not.toHaveBeenCalled();
    });

    it('should keep the submit button enabled while the form is invalid', () => {
      const btn = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(component.form.invalid).toBeTrue();
      expect(btn.disabled).toBeFalse();
    });

    it('should mark all fields as touched and focus the first invalid field on invalid submit', () => {
      component.salvar();
      fixture.detectChanges();

      expect(component.form.touched).toBeTrue();
      const nomeInput = fixture.nativeElement.querySelector('#nome') as HTMLInputElement;
      expect(document.activeElement).toBe(nomeInput);
    });

    it('should focus the first field when opening the create form', () => {
      const nomeInput = fixture.nativeElement.querySelector('#nome') as HTMLInputElement;
      expect(document.activeElement).toBe(nomeInput);
    });

    it('should set erro and clear salvando flag on cadastrar failure', () => {
      serviceSpy.cadastrar.and.returnValue(throwError(() => new Error('fail')));
      component.form.patchValue({ nome: 'Ana Silva', email: 'ana@email.com', cpf: '12345678909' });
      component.salvar();
      expect(component.erro).toBe('Erro ao salvar paciente.');
      expect(component.salvando).toBeFalse();
    });

    it('should reject an invalid CPF without calling the API', () => {
      component.form.patchValue({ nome: 'Ana Silva', email: 'ana@email.com', cpf: '123.456.789-00' });
      component.salvar();
      fixture.detectChanges();

      expect(component.form.get('cpf')?.hasError('cpf')).toBeTrue();
      expect(serviceSpy.cadastrar).not.toHaveBeenCalled();
      const grupo = (fixture.nativeElement as HTMLElement).querySelector('#cpf')?.closest('.form-group');
      const mensagens = Array.from(grupo?.querySelectorAll('.invalid-feedback') ?? []).map(m => m.textContent?.trim());
      expect(mensagens).toEqual(['CPF inválido.']);
    });

    it('should reject a CPF made of a single repeated digit', () => {
      component.form.get('cpf')?.setValue('111.111.111-11');
      expect(component.form.get('cpf')?.hasError('cpf')).toBeTrue();
    });

    it('should show only the required message when CPF is empty', () => {
      component.form.get('cpf')?.markAsTouched();
      fixture.detectChanges();

      const grupo = (fixture.nativeElement as HTMLElement).querySelector('#cpf')?.closest('.form-group');
      const mensagens = Array.from(grupo?.querySelectorAll('.invalid-feedback') ?? []).map(m => m.textContent?.trim());
      expect(mensagens).toEqual(['CPF é obrigatório.']);
    });

    it('should accept a valid CPF with or without punctuation', () => {
      const cpf = component.form.get('cpf');
      cpf?.setValue('529.982.247-25');
      expect(cpf?.valid).toBeTrue();
      cpf?.setValue('52998224725');
      expect(cpf?.valid).toBeTrue();
    });

    it('should mask CPF, phone and CEP inputs and send only digits to the API', () => {
      serviceSpy.cadastrar.and.returnValue(of(mockPaciente));
      const el = fixture.nativeElement as HTMLElement;
      const digitar = (id: string, valor: string) => {
        const input = el.querySelector(`#${id}`) as HTMLInputElement;
        input.value = valor;
        input.dispatchEvent(new Event('input'));
        return input;
      };

      component.form.patchValue({ nome: 'Ana Silva', email: 'ana@email.com' });
      expect(digitar('cpf', '529.982.247-25').value).toBe('529.982.247-25');
      expect(digitar('telefone', '11999998888').value).toBe('(11) 99999-8888');
      expect(digitar('cep', '01310-100').value).toBe('01310-100');

      component.salvar();

      expect(serviceSpy.cadastrar).toHaveBeenCalledWith(jasmine.objectContaining({
        cpf: '52998224725',
        telefone: '11999998888',
        endereco: jasmine.objectContaining({ cep: '01310100' })
      }));
    });

    it('should normalize punctuated values set programmatically before creating', () => {
      serviceSpy.cadastrar.and.returnValue(of(mockPaciente));
      component.form.patchValue({
        nome: 'Ana Silva',
        email: 'ana@email.com',
        cpf: '529.982.247-25',
        telefone: '(11) 3333-4444',
        endereco: { cep: '01310-100' }
      });

      component.salvar();

      expect(serviceSpy.cadastrar).toHaveBeenCalledWith(jasmine.objectContaining({
        cpf: '52998224725',
        telefone: '1133334444',
        endereco: jasmine.objectContaining({ cep: '01310100' })
      }));
    });

    it('campo() should return the matching AbstractControl', () => {
      expect(component.campo('nome')).toBe(component.form.get('nome'));
    });

    it('should expose mobile-friendly keyboard/autocomplete attributes on inputs', () => {
      const el = fixture.nativeElement as HTMLElement;

      const nome = el.querySelector('#nome') as HTMLInputElement;
      expect(nome.getAttribute('autocomplete')).toBe('name');

      const email = el.querySelector('#email') as HTMLInputElement;
      expect(email.getAttribute('autocomplete')).toBe('email');

      const cpf = el.querySelector('#cpf') as HTMLInputElement;
      expect(cpf.getAttribute('inputmode')).toBe('numeric');

      const telefone = el.querySelector('#telefone') as HTMLInputElement;
      expect(telefone.getAttribute('type')).toBe('tel');
      expect(telefone.getAttribute('autocomplete')).toBe('tel');

      const cep = el.querySelector('#cep') as HTMLInputElement;
      expect(cep.getAttribute('inputmode')).toBe('numeric');
      expect(cep.getAttribute('autocomplete')).toBe('postal-code');
    });
  });

  describe('in edit mode (id present in route)', () => {
    let component: PacienteFormComponent;
    let fixture: ComponentFixture<PacienteFormComponent>;
    let serviceSpy: jasmine.SpyObj<PacienteService>;
    let router: Router;

    beforeEach(async () => {
      serviceSpy = jasmine.createSpyObj('PacienteService', ['buscar', 'cadastrar', 'atualizar']);
      serviceSpy.buscar.and.returnValue(of(mockPaciente));

      await TestBed.configureTestingModule({
        imports: [PacienteFormComponent, RouterTestingModule],
        providers: [
          { provide: PacienteService, useValue: serviceSpy },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } }
        ]
      }).compileComponents();

      router = TestBed.inject(Router);
      spyOn(router, 'navigate');

      fixture = TestBed.createComponent(PacienteFormComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create with isEdit true and pacienteId set', () => {
      expect(component.isEdit).toBeTrue();
      expect(component.pacienteId).toBe(1);
    });

    it('should load patient data from service on init', () => {
      expect(serviceSpy.buscar).toHaveBeenCalledWith(1);
      expect(component.form.get('nome')?.value).toBe('Ana Silva');
    });

    it('should keep email enabled in edit mode (email is mutable)', () => {
      expect(component.form.get('email')?.disabled).toBeFalse();
    });

    it('should disable only cpf field in edit mode (cpf is immutable)', () => {
      expect(component.form.get('cpf')?.disabled).toBeTrue();
    });

    // O CPF gravado no mock tem dígito verificador errado: como o campo fica
    // desabilitado na edição, o Angular não o valida e o cadastro continua editável.
    it('should save the rest of the record even when the stored CPF is invalid', () => {
      serviceSpy.atualizar.and.returnValue(of(mockPaciente));
      expect(component.form.valid).toBeTrue();
      component.salvar();
      expect(serviceSpy.atualizar).toHaveBeenCalled();
    });

    it('should show the stored CPF masked in the disabled field', () => {
      const cpf = (fixture.nativeElement as HTMLElement).querySelector('#cpf') as HTMLInputElement;
      expect(cpf.disabled).toBeTrue();
      expect(cpf.value).toBe('123.456.789-00');
    });

    // Telefone gravado e não editado volta como veio: normalizar aqui mudaria
    // registros antigos só por abrir e salvar a tela.
    it('should send an untouched stored phone unchanged', () => {
      serviceSpy.atualizar.and.returnValue(of(mockPaciente));
      component.salvar();
      expect(serviceSpy.atualizar).toHaveBeenCalledWith(1, jasmine.objectContaining({ telefone: '(11) 99999-9999' }));
    });

    it('should include email in atualizar payload', () => {
      serviceSpy.atualizar.and.returnValue(of(mockPaciente));
      component.salvar();
      expect(serviceSpy.atualizar).toHaveBeenCalledWith(
        1,
        jasmine.objectContaining({ nome: 'Ana Silva', email: 'ana@email.com' })
      );
      expect(router.navigate).toHaveBeenCalledWith(['/pacientes']);
    });

    it('should send the version loaded in the GET so the API can detect concurrent edits', () => {
      serviceSpy.atualizar.and.returnValue(of(mockPaciente));
      component.salvar();
      expect(serviceSpy.atualizar).toHaveBeenCalledWith(1, jasmine.objectContaining({ version: 0 }));
    });

    it('should explain the concurrent-modification conflict and keep the form open', () => {
      serviceSpy.atualizar.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 409,
        error: { type: 'https://carlessopilates.com.br/problemas/concurrent-modification' }
      })));
      component.salvar();
      expect(component.erro).toBe(MENSAGEM_CONFLITO_CONCORRENCIA);
      expect(component.salvando).toBeFalse();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should set erro and clear salvando flag on atualizar failure', () => {
      serviceSpy.atualizar.and.returnValue(throwError(() => new Error('fail')));
      component.salvar();
      expect(component.erro).toBe('Erro ao salvar paciente.');
      expect(component.salvando).toBeFalse();
    });

    it('should set erro when buscar fails on init', () => {
      serviceSpy.buscar.and.returnValue(throwError(() => new Error('fail')));
      component.ngOnInit();
      expect(component.erro).toBe('Erro ao carregar paciente.');
      expect(component.loading).toBeFalse();
    });
  });

  describe('with invalid id in route', () => {
    let component: PacienteFormComponent;
    let fixture: ComponentFixture<PacienteFormComponent>;
    let serviceSpy: jasmine.SpyObj<PacienteService>;

    beforeEach(async () => {
      serviceSpy = jasmine.createSpyObj('PacienteService', ['buscar', 'cadastrar', 'atualizar']);

      await TestBed.configureTestingModule({
        imports: [PacienteFormComponent, RouterTestingModule],
        providers: [
          { provide: PacienteService, useValue: serviceSpy },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'abc' }) } } }
        ]
      }).compileComponents();

      fixture = TestBed.createComponent(PacienteFormComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should not load patient or enter edit mode', () => {
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
        nome: 'Ana Silva',
        email: 'ana@email.com',
        cpf: '123.456.789-00'
      });

      component.salvar();

      expect(component.erro).toBe('Identificador inválido.');
      expect(serviceSpy.cadastrar).not.toHaveBeenCalled();
      expect(serviceSpy.atualizar).not.toHaveBeenCalled();
    });
  });
});
