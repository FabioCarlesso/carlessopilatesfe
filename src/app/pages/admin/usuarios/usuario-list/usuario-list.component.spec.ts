import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UsuarioListComponent } from './usuario-list.component';

describe('UsuarioListComponent', () => {
  let fixture: ComponentFixture<UsuarioListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsuarioListComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(UsuarioListComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the users heading', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Usuários');
  });

  it('should render a disabled button for creating a new user', () => {
    const el = fixture.nativeElement as HTMLElement;
    const button = el.querySelector('button[disabled]');

    expect(button).toBeTruthy();
    expect(button?.textContent).toContain('Novo Usuário');
  });

  it('should render a link back to the admin home', () => {
    const el = fixture.nativeElement as HTMLElement;
    const link = el.querySelector('a[href="/admin"]');
    expect(link).toBeTruthy();
  });
});
