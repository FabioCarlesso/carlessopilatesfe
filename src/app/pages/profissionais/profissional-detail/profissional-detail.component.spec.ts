import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { ProfissionalDetailComponent } from './profissional-detail.component';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { ProfissionalResponseDTO } from '../../../core/models/profissional';

const mockProfissional: ProfissionalResponseDTO = {
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

describe('ProfissionalDetailComponent', () => {
  let component: ProfissionalDetailComponent;
  let fixture: ComponentFixture<ProfissionalDetailComponent>;
  let serviceSpy: jasmine.SpyObj<ProfissionalService>;
  let router: Router;

  /** Valor exibido no `detail-item` de um rótulo, sem depender da ordem do grid. */
  function textoDoItem(rotulo: string): string | undefined {
    const itens = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.detail-item'));
    const item = itens.find(el => el.querySelector('.label')?.textContent?.trim() === rotulo);
    return item?.querySelector('span:not(.label)')?.textContent?.trim();
  }

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

  // A agenda do profissional (issue #126) é alcançada a partir do detalhe: é a
  // tela que já identifica de quem se está falando.
  it('should link to the agenda of the profissional', () => {
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.acoes a'));
    const agenda = links.find(link => link.textContent?.trim() === 'Agenda');

    expect(agenda?.getAttribute('href')).toBe('/profissionais/1/agenda');
  });

  it('should render numeroRegistro', () => {
    expect(textoDoItem('Nr. de Registro')).toBe('350544-F');
  });

  it('should fall back to a dash when the profissional has no numeroRegistro', () => {
    component.profissional = { ...mockProfissional, numeroRegistro: null };
    fixture.detectChanges();

    expect(textoDoItem('Nr. de Registro')).toBe('-');
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

  it('should not call buscar when id route param is invalid', async () => {
    const invalidServiceSpy = jasmine.createSpyObj('ProfissionalService', ['buscar', 'ativar', 'inativar']);

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ProfissionalDetailComponent, RouterTestingModule],
      providers: [
        { provide: ProfissionalService, useValue: invalidServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'abc' }) } } }
      ]
    }).compileComponents();

    const invalidFixture = TestBed.createComponent(ProfissionalDetailComponent);
    const invalidComponent = invalidFixture.componentInstance;
    invalidFixture.detectChanges();

    expect(invalidComponent.erro).toBe('Identificador inválido.');
    expect(invalidServiceSpy.buscar).not.toHaveBeenCalled();
  });

  it('should not fire a second inativar request while the action is in progress', () => {
    const pending = new Subject<void>();
    serviceSpy.inativar.and.returnValue(pending.asObservable());

    component.inativar();
    component.inativar();

    expect(serviceSpy.inativar).toHaveBeenCalledTimes(1);
    expect(component.acaoEmAndamento).toBeTrue();
  });

});
