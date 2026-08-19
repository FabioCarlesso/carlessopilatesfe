import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ForbiddenComponent } from './forbidden.component';

describe('ForbiddenComponent', () => {
  let locationSpy: jasmine.SpyObj<Location>;

  beforeEach(async () => {
    locationSpy = jasmine.createSpyObj<Location>('Location', ['back']);

    await TestBed.configureTestingModule({
      imports: [ForbiddenComponent],
      providers: [
        provideRouter([]),
        { provide: Location, useValue: locationSpy }
      ]
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

  it('should expose the title as the section accessible name', () => {
    const fixture = TestBed.createComponent(ForbiddenComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const section = el.querySelector('section.forbidden-container');
    const title = el.querySelector('.forbidden-title');
    expect(section?.getAttribute('aria-labelledby')).toBe('forbidden-title');
    expect(title?.id).toBe('forbidden-title');
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
    expect(link.getAttribute('href')).toBe('/inicio');
    expect(link.textContent).toContain('Ir para o início');
  });

  it('should expose the action group with role="group" and an accessible label', () => {
    const fixture = TestBed.createComponent(ForbiddenComponent);
    fixture.detectChanges();

    const group = (fixture.nativeElement as HTMLElement).querySelector('.forbidden-actions');
    expect(group?.getAttribute('role')).toBe('group');
    expect(group?.getAttribute('aria-label')).toContain('Ações');
  });

  it('should call Location.back when there is browser history', () => {
    spyOnProperty(window.history, 'length', 'get').and.returnValue(2);
    const fixture = TestBed.createComponent(ForbiddenComponent);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button.btn-secondary') as HTMLButtonElement;
    button.click();

    expect(locationSpy.back).toHaveBeenCalled();
  });

  it('should fall back to navigating home when there is no previous history', () => {
    spyOnProperty(window.history, 'length', 'get').and.returnValue(1);
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl');
    const fixture = TestBed.createComponent(ForbiddenComponent);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button.btn-secondary') as HTMLButtonElement;
    button.click();

    expect(locationSpy.back).not.toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith('/inicio');
  });
});
