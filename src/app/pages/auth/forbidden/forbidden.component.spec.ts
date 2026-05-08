import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ForbiddenComponent } from './forbidden.component';

describe('ForbiddenComponent', () => {
  let locationSpy: jasmine.SpyObj<Location>;

  beforeEach(async () => {
    locationSpy = jasmine.createSpyObj<Location>('Location', ['back']);

    await TestBed.configureTestingModule({
      imports: [ForbiddenComponent, RouterTestingModule],
      providers: [{ provide: Location, useValue: locationSpy }]
    }).compileComponents();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    const fixture = TestBed.createComponent(ForbiddenComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display 403 code and access denied title', () => {
    const fixture = TestBed.createComponent(ForbiddenComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.forbidden-code')?.textContent).toContain('403');
    expect(el.querySelector('.forbidden-title')?.textContent).toContain('Acesso negado');
  });

  it('should explain that the current profile lacks permission', () => {
    const fixture = TestBed.createComponent(ForbiddenComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.forbidden-message')?.textContent).toContain('perfil não possui permissão');
    expect(el.querySelector('.forbidden-message')?.textContent).toContain('administrador');
  });

  it('should contain a primary link back to home', () => {
    const fixture = TestBed.createComponent(ForbiddenComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const link = el.querySelector('a.btn-primary') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/');
    expect(link.textContent).toContain('Ir para o início');
  });

  it('should navigate back when the secondary action is clicked', () => {
    const fixture = TestBed.createComponent(ForbiddenComponent);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button.btn-secondary') as HTMLButtonElement;
    button.click();

    expect(locationSpy.back).toHaveBeenCalled();
  });
});
