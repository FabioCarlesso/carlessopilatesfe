import { TestBed } from '@angular/core/testing';
import { LandingFuncionalidadesComponent } from './landing-funcionalidades.component';
import { isOnPush } from '../../../../testing/onpush';

describe('LandingFuncionalidadesComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingFuncionalidadesComponent]
    }).compileComponents();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    const fixture = TestBed.createComponent(LandingFuncionalidadesComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should use OnPush change detection', () => {
    expect(isOnPush(LandingFuncionalidadesComponent)).toBeTrue();
  });

  it('should render one card per feature', () => {
    const fixture = TestBed.createComponent(LandingFuncionalidadesComponent);
    fixture.detectChanges();

    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('li.funcionalidade');
    expect(cards.length).toBe(fixture.componentInstance.funcionalidades.length);
  });

  it('should render the modules the studio actually has today', () => {
    const fixture = TestBed.createComponent(LandingFuncionalidadesComponent);
    fixture.detectChanges();

    const titulos = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.funcionalidade__titulo')
    ).map(t => t.textContent?.trim());

    expect(titulos).toEqual([
      'Agenda do estúdio',
      'Prontuário completo',
      'Simetrógrafo virtual',
      'Planos e pagamentos',
      'Lista de espera',
      'Relatórios e NFSE',
      'Administração e acesso',
      'Busca global'
    ]);
  });

  it('should describe every feature', () => {
    const fixture = TestBed.createComponent(LandingFuncionalidadesComponent);
    fixture.detectChanges();

    const descricoes = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.funcionalidade__descricao')
    );
    expect(descricoes.length).toBe(fixture.componentInstance.funcionalidades.length);
    for (const descricao of descricoes) {
      expect(descricao.textContent?.trim().length).toBeGreaterThan(30);
    }
  });
});
