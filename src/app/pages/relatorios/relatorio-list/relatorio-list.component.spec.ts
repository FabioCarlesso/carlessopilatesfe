import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { RelatorioListComponent } from './relatorio-list.component';

describe('RelatorioListComponent', () => {
  let fixture: ComponentFixture<RelatorioListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RelatorioListComponent, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(RelatorioListComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render professional payment report link', () => {
    const el = fixture.nativeElement as HTMLElement;
    const link = el.querySelector('a[href="/relatorios/pagamento-profissional"]');

    expect(link).toBeTruthy();
    expect(link?.textContent).toContain('Pagamento de Profissional');
  });

  it('should render NFSE report link', () => {
    const el = fixture.nativeElement as HTMLElement;
    const link = el.querySelector('a[href="/relatorios/nfse"]');

    expect(link).toBeTruthy();
    expect(link?.textContent).toContain('Emissão de NFSEs');
  });
});
