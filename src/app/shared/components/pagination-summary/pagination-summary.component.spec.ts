import { ComponentFixture, TestBed } from '@angular/core/testing';
import { isOnPush } from '../../../../testing/onpush';
import { PaginationSummaryComponent } from './pagination-summary.component';

describe('PaginationSummaryComponent', () => {
  let component: PaginationSummaryComponent;
  let fixture: ComponentFixture<PaginationSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginationSummaryComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PaginationSummaryComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should use OnPush change detection strategy', () => {
    expect(isOnPush(PaginationSummaryComponent)).toBeTrue();
  });

  it('should compute the displayed range for the first page', () => {
    component.currentPage = 0;
    component.pageSize = 10;
    component.totalElements = 21;

    expect(component.pageStart()).toBe(1);
    expect(component.pageEnd()).toBe(10);
  });

  it('should cap pageEnd at the total on the last page', () => {
    component.currentPage = 2;
    component.pageSize = 10;
    component.totalElements = 21;

    expect(component.pageStart()).toBe(21);
    expect(component.pageEnd()).toBe(21);
  });

  it('should return zero for start and end when there are no elements', () => {
    component.totalElements = 0;

    expect(component.pageStart()).toBe(0);
    expect(component.pageEnd()).toBe(0);
  });

  it('should render the summary text with the provided item label', () => {
    component.currentPage = 1;
    component.pageSize = 10;
    component.totalElements = 25;
    component.itemLabel = 'profissionais';
    fixture.detectChanges();

    const summary: HTMLElement = fixture.nativeElement.querySelector('.pagination-summary span');
    expect(summary.textContent?.trim()).toBe('Exibindo 11-20 de 25 profissionais');
  });

  it('should render an option per configured page size and mark the current one as selected', () => {
    component.pageSize = 20;
    component.pageSizeOptions = [5, 10, 20, 50];
    fixture.detectChanges();

    const select: HTMLSelectElement = fixture.nativeElement.querySelector('.pagination-summary select');
    expect(select.options.length).toBe(4);
    expect(select.value).toBe('20');
  });

  // Antes o select não tinha classe e exibia a seta nativa do sistema, com o
  // SCSS local redeclarando o campo inteiro — inclusive a shorthand
  // `background`, que apagaria a seta global (issue #200). A largura continua
  // sendo do componente: 100% brigaria com o rótulo dentro do label flex.
  it('should use the global form-control select with the custom chevron (issue #200)', () => {
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);

    try {
      const select: HTMLSelectElement = fixture.nativeElement.querySelector('.pagination-summary select');
      const estilo = getComputedStyle(select);

      expect(select.classList).toContain('form-control');
      expect(estilo.appearance).toBe('none');
      expect(estilo.backgroundImage).not.toBe('none');
      expect(estilo.backgroundSize).toBe('12px 8px');
      // Com os 100% do global o select passaria de metade do label, espremendo
      // o rótulo "Itens por página" ao lado dele.
      const label = select.parentElement as HTMLElement;
      expect(select.getBoundingClientRect().width)
        .toBeLessThan(label.getBoundingClientRect().width / 2);
    } finally {
      document.body.removeChild(fixture.nativeElement);
    }
  });

  it('should emit the numeric page size when the selector changes', () => {
    component.pageSize = 10;
    component.pageSizeOptions = [5, 10, 20, 50];
    fixture.detectChanges();

    const emitted: number[] = [];
    component.pageSizeChange.subscribe(size => emitted.push(size));

    const select: HTMLSelectElement = fixture.nativeElement.querySelector('.pagination-summary select');
    select.value = '20';
    select.dispatchEvent(new Event('change'));

    expect(emitted).toEqual([20]);
  });
});
