import { ComponentFixture, TestBed } from '@angular/core/testing';
import { isOnPush } from '../../../../testing/onpush';
import { CarregandoComponent } from './carregando.component';

describe('CarregandoComponent', () => {
  let fixture: ComponentFixture<CarregandoComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarregandoComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CarregandoComponent);
    el = fixture.nativeElement;
  });

  function raiz(): HTMLElement {
    return el.querySelector('.loading') as HTMLElement;
  }

  it('should use OnPush change detection strategy', () => {
    expect(isOnPush(CarregandoComponent)).toBeTrue();
  });

  it('should announce the loading state to screen readers', () => {
    fixture.detectChanges();

    expect(raiz().getAttribute('role')).toBe('status');
    expect(raiz().getAttribute('aria-live')).toBe('polite');
  });

  it('should render the spinner with the default message', () => {
    fixture.detectChanges();

    const spinner = el.querySelector('.loading__spinner');
    expect(spinner).not.toBeNull();
    expect(spinner?.getAttribute('aria-hidden')).toBe('true');
    expect(raiz().textContent?.trim()).toBe('Carregando...');
    expect(el.querySelector('.loading__skeleton')).toBeNull();
  });

  it('should render a contextual message', () => {
    fixture.componentRef.setInput('mensagem', 'Gerando arquivo...');
    fixture.detectChanges();

    expect(el.querySelector('.loading__texto')?.textContent?.trim()).toBe('Gerando arquivo...');
  });

  it('should render the requested number of skeleton rows hidden from assistive tech', () => {
    fixture.componentRef.setInput('variante', 'skeleton');
    fixture.componentRef.setInput('linhas', 3);
    fixture.componentRef.setInput('mensagem', 'Carregando pacientes...');
    fixture.detectChanges();

    expect(raiz().classList).toContain('loading--skeleton');
    expect(el.querySelector('.loading__skeleton')?.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelectorAll('.loading__skeleton-linha').length).toBe(3);
    expect(el.querySelector('.loading__spinner')).toBeNull();
    // A mensagem continua no status, só que visualmente oculta.
    expect(el.querySelector('.loading__sr')?.textContent?.trim()).toBe('Carregando pacientes...');
    expect(raiz().getAttribute('role')).toBe('status');
  });

  it('should render at least one skeleton row for invalid counts', () => {
    fixture.componentRef.setInput('variante', 'skeleton');
    fixture.componentRef.setInput('linhas', 0);
    fixture.detectChanges();

    expect(el.querySelectorAll('.loading__skeleton-linha').length).toBe(1);
  });
});
