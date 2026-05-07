import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AdminHomeComponent } from './admin-home.component';

describe('AdminHomeComponent', () => {
  let fixture: ComponentFixture<AdminHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminHomeComponent, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminHomeComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render administrative section heading', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Administração');
  });

  it('should render link to user management', () => {
    const el = fixture.nativeElement as HTMLElement;
    const link = el.querySelector('a[href="/admin/usuarios"]');

    expect(link).toBeTruthy();
    expect(link?.textContent).toContain('Usuários');
  });
});
