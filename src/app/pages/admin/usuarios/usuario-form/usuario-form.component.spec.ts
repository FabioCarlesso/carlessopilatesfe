import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { UsuarioFormComponent } from './usuario-form.component';

function configure(idParam: string | null) {
  return TestBed.configureTestingModule({
    imports: [UsuarioFormComponent],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap(idParam === null ? {} : { id: idParam })
          }
        }
      }
    ]
  }).compileComponents();
}

describe('UsuarioFormComponent', () => {
  let fixture: ComponentFixture<UsuarioFormComponent>;

  afterEach(() => TestBed.resetTestingModule());

  it('should create in new mode when no id param is present', async () => {
    await configure(null);
    fixture = TestBed.createComponent(UsuarioFormComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance.isEdit).toBeFalse();
    expect(fixture.componentInstance.parametroInvalido).toBeFalse();
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent)
      .toContain('Novo Usuário');
  });

  it('should switch to edit mode when a valid id param is present', async () => {
    await configure('42');
    fixture = TestBed.createComponent(UsuarioFormComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.isEdit).toBeTrue();
    expect(fixture.componentInstance.usuarioId).toBe(42);
    expect(fixture.componentInstance.parametroInvalido).toBeFalse();
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent)
      .toContain('Editar Usuário');
  });

  it('should flag invalid id parameters and show error message', async () => {
    await configure('abc');
    fixture = TestBed.createComponent(UsuarioFormComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.parametroInvalido).toBeTrue();
    expect(fixture.componentInstance.isEdit).toBeFalse();
    expect((fixture.nativeElement as HTMLElement).querySelector('.alert-danger')?.textContent)
      .toContain('Identificador inválido.');
  });

  it('should render link back to user list', async () => {
    await configure(null);
    fixture = TestBed.createComponent(UsuarioFormComponent);
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href="/admin/usuarios"]');
    expect(link).toBeTruthy();
  });

  const invalidIds = ['0', '-1', '1.5', '9007199254740992'];
  for (const id of invalidIds) {
    it(`should flag '${id}' as an invalid id`, async () => {
      await configure(id);
      fixture = TestBed.createComponent(UsuarioFormComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance.parametroInvalido).toBeTrue();
      expect(fixture.componentInstance.isEdit).toBeFalse();
    });
  }
});
