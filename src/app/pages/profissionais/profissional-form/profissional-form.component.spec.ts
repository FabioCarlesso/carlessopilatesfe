import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProfissionalFormComponent } from './profissional-form.component';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { ProfissionalResponseDTO } from '../../../core/models/profissional';
import { MENSAGEM_CONFLITO_CONCORRENCIA } from '../../../shared/utils/api-error';
import { conflitoConcorrencia } from '../../../../testing/conflito';

const mockProfissional: ProfissionalResponseDTO = {
  version: 0,
  id: 1,
  nome: 'Paula Mendes',
  email: 'paula@carlessopilates.com',
  cpf: '123.456.111-00',
  telefone: '(11) 98888-1111',
  numeroRegistro: '350544-F',
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
      ['nome', 'email', 'cpf', 'telefone', 'numeroRegistro', 'tipoContrato', 'percentualPagamentoAula', 'dataInicio']
        .forEach(ctrl => {
          expect(component.form.contains(ctrl)).toBeTrue();
        });
    });

    // Issue #308: o prontuário identifica cada evolução pelo número no CREFITO.
    it('should require the CREFITO number with a clear message, rejecting blanks, without calling the API', () => {
      component.form.patchValue({
        nome: 'Paula Mendes',
        email: 'paula@carlessopilates.com',
        cpf: '123.456.111-54',
        tipoContrato: 'PJ',
        percentualPagamentoAula: 45,
        dataInicio: '2024-01-15'
      });
      const campo = component.form.get('numeroRegistro');
      expect(campo?.errors?.['required']).toBeTrue();

      component.salvar();
      fixture.detectChanges();

      expect(serviceSpy.cadastrar).not.toHaveBeenCalled();
      const el = fixture.nativeElement as HTMLElement;
      const input = el.querySelector<HTMLInputElement>('#numeroRegistro')!;
      expect(el.querySelector('label[for="numeroRegistro"]')?.textContent?.trim()).toBe('Número no CREFITO *');
      expect(input.getAttribute('aria-required')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toBe('numeroRegistroErro');
      expect(el.querySelector('#numeroRegistroErro')?.textContent?.trim())
        .toBe('Número no CREFITO é obrigatório: ele identifica o fisioterapeuta no prontuário.');

      campo?.setValue('   ');
      expect(campo?.errors?.['emBranco']).toBeTrue();
      component.salvar();
      expect(serviceSpy.cadastrar).not.toHaveBeenCalled();
    });

    it('should show the API detail when the create is refused with 400', () => {
      serviceSpy.cadastrar.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 400,
        error: { title: 'Bad Request', detail: 'Número de registro no CREFITO é obrigatório' }
      })));
      component.form.patchValue({
        nome: 'Paula Mendes',
        email: 'paula@carlessopilates.com',
        cpf: '123.456.111-54',
        numeroRegistro: '350544-F',
        tipoContrato: 'PJ',
        percentualPagamentoAula: 45,
        dataInicio: '2024-01-15'
      });

      component.salvar();
      fixture.detectChanges();

      expect(component.erro).toBe('Número de registro no CREFITO é obrigatório');
      expect((fixture.nativeElement as HTMLElement).querySelector('.alert-danger')?.getAttribute('role')).toBe('alert');
      expect(component.salvando).toBeFalse();
    });

    // Só alcançável por `setValue`: o `maxlength="30"` do template trunca a
    // digitação e a colagem em 30 caracteres, então na UI o validador defende
    // o valor que vier do servidor na edição, não avisa quem está digitando.
    it('should invalidate a numeroRegistro longer than 30 characters', () => {
      const campo = component.form.get('numeroRegistro');
      campo?.setValue('x'.repeat(31));
      campo?.markAsTouched();
      fixture.detectChanges();

      expect(campo?.errors?.['maxlength']).toBeTruthy();
      const grupo = (fixture.nativeElement as HTMLElement).querySelector('#numeroRegistro')?.closest('.form-group');
      expect(grupo?.querySelector('.invalid-feedback')?.textContent?.trim())
        .toBe('Número no CREFITO deve ter no máximo 30 caracteres.');
    });

    it('should send numeroRegistro in the create payload', () => {
      serviceSpy.cadastrar.and.returnValue(of(mockProfissional));
      component.form.patchValue({
        nome: 'Paula Mendes',
        email: 'paula@carlessopilates.com',
        cpf: '123.456.111-54',
        telefone: '(11) 98888-1111',
        numeroRegistro: '  350544-F ',
        tipoContrato: 'PJ',
        percentualPagamentoAula: 45,
        dataInicio: '2024-01-15'
      });

      component.salvar();

      expect(serviceSpy.cadastrar).toHaveBeenCalledWith(
        jasmine.objectContaining({ numeroRegistro: '350544-F' })
      );
    });

    it('should call cadastrar and navigate on valid submit', () => {
      serviceSpy.cadastrar.and.returnValue(of(mockProfissional));
      component.form.patchValue({
        nome: 'Paula Mendes',
        email: 'paula@carlessopilates.com',
        cpf: '123.456.111-54',
        numeroRegistro: '350544-F',
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
        cpf: '123.456.111-54',
        numeroRegistro: '350544-F',
        tipoContrato: 'PJ',
        percentualPagamentoAula: 45,
        dataInicio: '2024-01-15'
      });
      component.salvar();
      expect(component.erro).toBe('Erro ao salvar profissional.');
      expect(component.salvando).toBeFalse();
    });

    it('should reject an invalid CPF inline without calling the API', () => {
      component.form.patchValue({
        nome: 'Paula Mendes',
        email: 'paula@carlessopilates.com',
        cpf: '123.456.111-00',
        tipoContrato: 'PJ',
        percentualPagamentoAula: 45,
        dataInicio: '2024-01-15'
      });
      component.salvar();
      fixture.detectChanges();

      expect(serviceSpy.cadastrar).not.toHaveBeenCalled();
      const grupo = (fixture.nativeElement as HTMLElement).querySelector('#cpf')?.closest('.form-group');
      const mensagens = Array.from(grupo?.querySelectorAll('.invalid-feedback') ?? []).map(m => m.textContent?.trim());
      expect(mensagens).toEqual(['CPF inválido.']);
    });

    it('should show only the required message when CPF is empty', () => {
      component.form.get('cpf')?.markAsTouched();
      fixture.detectChanges();

      const grupo = (fixture.nativeElement as HTMLElement).querySelector('#cpf')?.closest('.form-group');
      const mensagens = Array.from(grupo?.querySelectorAll('.invalid-feedback') ?? []).map(m => m.textContent?.trim());
      expect(mensagens).toEqual(['CPF é obrigatório.']);
    });

    it('should mask CPF and phone inputs and send only digits to the API', () => {
      serviceSpy.cadastrar.and.returnValue(of(mockProfissional));
      const el = fixture.nativeElement as HTMLElement;
      const digitar = (id: string, valor: string) => {
        const input = el.querySelector(`#${id}`) as HTMLInputElement;
        input.value = valor;
        input.dispatchEvent(new Event('input'));
        return input;
      };

      component.form.patchValue({
        nome: 'Paula Mendes',
        email: 'paula@carlessopilates.com',
        numeroRegistro: '350544-F',
        tipoContrato: 'PJ',
        percentualPagamentoAula: 45,
        dataInicio: '2024-01-15'
      });
      expect(digitar('cpf', '12345611154').value).toBe('123.456.111-54');
      expect(digitar('telefone', '(11) 98888-1111').value).toBe('(11) 98888-1111');

      component.salvar();

      expect(serviceSpy.cadastrar).toHaveBeenCalledWith(jasmine.objectContaining({
        cpf: '12345611154',
        telefone: '11988881111'
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

    // O CPF do mock tem dígito verificador errado: desabilitado, ele não é
    // validado, e um cadastro antigo fora do padrão continua editável.
    it('should save the rest of the record even when the stored CPF is invalid', () => {
      serviceSpy.atualizar.and.returnValue(of(mockProfissional));
      expect(component.form.valid).toBeTrue();
      component.salvar();
      expect(serviceSpy.atualizar).toHaveBeenCalled();
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

    it('should load numeroRegistro into the form', () => {
      expect(component.form.get('numeroRegistro')?.value).toBe('350544-F');
      expect(component.form.get('numeroRegistro')?.disabled).toBeFalse();
    });

    // O PUT monta o DTO campo a campo: sem `numeroRegistro` explícito, salvar
    // sem tocar no campo apagaria o valor no servidor.
    it('should keep the loaded numeroRegistro in the update payload', () => {
      serviceSpy.atualizar.and.returnValue(of(mockProfissional));

      component.salvar();

      expect(serviceSpy.atualizar).toHaveBeenCalledWith(
        1,
        jasmine.objectContaining({ numeroRegistro: '350544-F' })
      );
    });

    // Antes da issue #308 limpar o campo apagava o registro no servidor; agora
    // o formulário recusa o vazio antes de chegar à API.
    it('should not save when the CREFITO number is cleared', () => {
      component.form.patchValue({ numeroRegistro: '' });

      component.salvar();

      expect(serviceSpy.atualizar).not.toHaveBeenCalled();
      expect(component.form.get('numeroRegistro')?.errors?.['required']).toBeTrue();
    });

    it('should send the edited numeroRegistro in the update payload', () => {
      serviceSpy.atualizar.and.returnValue(of(mockProfissional));
      component.form.patchValue({ numeroRegistro: '123456-TO' });

      component.salvar();

      expect(serviceSpy.atualizar).toHaveBeenCalledWith(
        1,
        jasmine.objectContaining({ numeroRegistro: '123456-TO' })
      );
    });

    it('should send the loaded version and explain the concurrent-modification conflict', () => {
      serviceSpy.atualizar.and.returnValue(throwError(() => conflitoConcorrencia()));

      component.salvar();

      expect(serviceSpy.atualizar).toHaveBeenCalledWith(jasmine.any(Number), jasmine.objectContaining({ version: 0 }));
      expect(component.erro).toBe(MENSAGEM_CONFLITO_CONCORRENCIA);
      expect(component.salvando).toBeFalse();
    });

    it('should set erro on atualizar failure', () => {
      serviceSpy.atualizar.and.returnValue(throwError(() => new Error('fail')));
      component.salvar();
      expect(component.erro).toBe('Erro ao salvar profissional.');
      expect(component.salvando).toBeFalse();
    });

    it('should show the API detail on a 400 from the update', () => {
      serviceSpy.atualizar.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 400,
        error: { detail: 'Número de registro no CREFITO é obrigatório' }
      })));
      component.salvar();
      expect(component.erro).toBe('Número de registro no CREFITO é obrigatório');
    });

    it('should flag a legacy record without CREFITO as soon as it loads', () => {
      serviceSpy.buscar.and.returnValue(of({ ...mockProfissional, numeroRegistro: null }));
      component.ngOnInit();
      fixture.detectChanges();

      expect(component.form.get('numeroRegistro')?.touched).toBeTrue();
      expect((fixture.nativeElement as HTMLElement).querySelector('#numeroRegistroErro')).not.toBeNull();
      component.salvar();
      expect(serviceSpy.atualizar).not.toHaveBeenCalled();
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
        cpf: '123.456.111-54',
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
