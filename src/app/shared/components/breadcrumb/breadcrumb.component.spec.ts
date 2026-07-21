import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { isOnPush } from '../../../../testing/onpush';
import { BreadcrumbComponent, BreadcrumbItem } from './breadcrumb.component';

describe('BreadcrumbComponent', () => {
  let component: BreadcrumbComponent;
  let fixture: ComponentFixture<BreadcrumbComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BreadcrumbComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(BreadcrumbComponent);
    component = fixture.componentInstance;
  });

  function setItems(items: BreadcrumbItem[]): void {
    component.items = items;
    fixture.detectChanges();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should use OnPush change detection strategy', () => {
    expect(isOnPush(BreadcrumbComponent)).toBeTrue();
  });

  it('should not render the nav when there are no items', () => {
    setItems([]);
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
  });

  it('should expose the accessible breadcrumb landmark', () => {
    setItems([{ label: 'Pacientes', link: '/pacientes' }, { label: 'Sessões' }]);

    const nav: HTMLElement = fixture.nativeElement.querySelector('nav');
    expect(nav).not.toBeNull();
    expect(nav.getAttribute('aria-label')).toBe('breadcrumb');
  });

  it('should render one entry per item with the provided labels', () => {
    setItems([
      { label: 'Pacientes', link: '/pacientes' },
      { label: 'Maria Silva', link: ['/pacientes', 1] },
      { label: 'Sessões', link: ['/pacientes', 1, 'sessoes'] },
      { label: 'Evolução' }
    ]);

    const items = fixture.nativeElement.querySelectorAll('.breadcrumb-item');
    expect(items.length).toBe(4);
    const labels = Array.from(items).map(el => (el as HTMLElement).textContent?.replace('/', '').trim());
    expect(labels).toEqual(['Pacientes', 'Maria Silva', 'Sessões', 'Evolução']);
  });

  it('should render navigable links for every level except the current page', () => {
    setItems([
      { label: 'Pacientes', link: '/pacientes' },
      { label: 'Maria Silva', link: ['/pacientes', 1] },
      { label: 'Sessões' }
    ]);

    const links = fixture.nativeElement.querySelectorAll('a.breadcrumb-link');
    expect(links.length).toBe(2);
    expect(links[0].getAttribute('href')).toBe('/pacientes');
    expect(links[1].getAttribute('href')).toBe('/pacientes/1');
  });

  it('should mark only the last item as the current page and not link it', () => {
    setItems([{ label: 'Pacientes', link: '/pacientes' }, { label: 'Sessões' }]);

    const current: HTMLElement = fixture.nativeElement.querySelector('[aria-current="page"]');
    expect(current).not.toBeNull();
    expect(current.textContent?.trim()).toBe('Sessões');
    expect(current.tagName.toLowerCase()).toBe('span');
    expect(fixture.nativeElement.querySelectorAll('[aria-current="page"]').length).toBe(1);
  });

  it('should render an intermediate item without link as plain text', () => {
    setItems([
      { label: 'Pacientes', link: '/pacientes' },
      { label: 'Paciente' },
      { label: 'Sessões' }
    ]);

    const plain: HTMLElement = fixture.nativeElement.querySelector('.breadcrumb-text');
    expect(plain).not.toBeNull();
    expect(plain.textContent?.trim()).toBe('Paciente');
  });

  it('should render a separator between items but not after the last one', () => {
    setItems([
      { label: 'Pacientes', link: '/pacientes' },
      { label: 'Maria Silva', link: ['/pacientes', 1] },
      { label: 'Sessões' }
    ]);

    const separators = fixture.nativeElement.querySelectorAll('.breadcrumb-separator');
    expect(separators.length).toBe(2);
    separators.forEach((sep: HTMLElement) => expect(sep.getAttribute('aria-hidden')).toBe('true'));
  });
});
