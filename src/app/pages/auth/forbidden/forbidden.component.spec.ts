import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ForbiddenComponent } from './forbidden.component';

describe('ForbiddenComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForbiddenComponent, RouterTestingModule]
    }).compileComponents();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    const fixture = TestBed.createComponent(ForbiddenComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display 403 code', () => {
    const fixture = TestBed.createComponent(ForbiddenComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.forbidden-code')?.textContent).toContain('403');
  });

  it('should display access denied message', () => {
    const fixture = TestBed.createComponent(ForbiddenComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.forbidden-title')?.textContent).toContain('Acesso não autorizado');
  });

  it('should contain a link back to home', () => {
    const fixture = TestBed.createComponent(ForbiddenComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const link = el.querySelector('a.btn-home') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/');
  });
});
