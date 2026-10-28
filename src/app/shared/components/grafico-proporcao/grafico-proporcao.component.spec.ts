import { ComponentFixture, TestBed } from '@angular/core/testing';
import { isOnPush } from '../../../../testing/onpush';
import { SegmentoProporcao } from '../../utils/grafico-proporcao';
import { GraficoProporcaoComponent } from './grafico-proporcao.component';

const pagamentos: SegmentoProporcao[] = [
  { chave: 'pagos', rotulo: 'Pagos', valor: 6, variante: 'sucesso' },
  { chave: 'pendentes', rotulo: 'Pendentes', valor: 3, variante: 'alerta' },
  { chave: 'vencidos', rotulo: 'Vencidos', valor: 0, variante: 'perigo' }
];

describe('GraficoProporcaoComponent', () => {
  let fixture: ComponentFixture<GraficoProporcaoComponent>;
  let el: HTMLElement;

  function renderizar(entradas: Partial<GraficoProporcaoComponent>): void {
    fixture.componentRef.setInput('titulo', 'Pagamentos por status');
    for (const [nome, valor] of Object.entries(entradas)) {
      fixture.componentRef.setInput(nome, valor);
    }
    fixture.detectChanges();
  }

  function legenda(): string[] {
    return Array.from(el.querySelectorAll('.grafico-proporcao__item'))
      .map(item => (item.textContent ?? '').replace(/\s+/g, ' ').trim());
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraficoProporcaoComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(GraficoProporcaoComponent);
    el = fixture.nativeElement as HTMLElement;
  });

  it('should use OnPush change detection strategy', () => {
    expect(isOnPush(GraficoProporcaoComponent)).toBeTrue();
  });

  it('should expose the title as the accessible name of the figure', () => {
    renderizar({ segmentos: pagamentos });

    expect(el.querySelector('figure')?.getAttribute('aria-label')).toBe('Pagamentos por status');
  });

  it('should list every part in text with value and percentage, including zeros', () => {
    renderizar({ segmentos: pagamentos });

    expect(legenda()).toEqual(['Pagos 6 67%', 'Pendentes 3 33%', 'Vencidos 0 0%']);
  });

  it('should hide the drawing from assistive technology, leaving the numbers to the legend', () => {
    renderizar({ tipo: 'rosca', segmentos: pagamentos });
    expect(el.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');

    renderizar({ tipo: 'barra' });
    expect(el.querySelector('.grafico-proporcao__barra')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('should draw one donut slice per non-zero part, starting after the previous ones', () => {
    renderizar({ tipo: 'rosca', segmentos: pagamentos, rotuloTotal: 'pagamentos' });

    const fatias = Array.from(el.querySelectorAll('.grafico-proporcao__fatia'));
    expect(fatias.map(f => f.getAttribute('data-chave'))).toEqual(['pagos', 'pendentes']);
    expect(fatias[1].getAttribute('stroke-dasharray')).toBe(
      `${(3 / 9) * 100} ${100 - (3 / 9) * 100}`
    );
    expect(Number(fatias[1].getAttribute('stroke-dashoffset'))).toBeCloseTo(-(6 / 9) * 100, 6);
    expect(el.querySelector('.grafico-proporcao__centro')?.textContent).toContain('9');
    expect(el.querySelector('.grafico-proporcao__centro')?.textContent).toContain('pagamentos');
  });

  it('should size each bar part by its share of the total', () => {
    renderizar({
      segmentos: [
        { chave: 'realizadas', rotulo: 'Realizadas', valor: 30, variante: 'sucesso' },
        { chave: 'agendadas', rotulo: 'Agendadas', valor: 10, variante: 'marca' }
      ]
    });

    const partes = Array.from(el.querySelectorAll<HTMLElement>('.grafico-proporcao__parte'));
    expect(partes.map(p => p.style.width)).toEqual(['75%', '25%']);
  });

  it('should keep an empty track and explain it when every part is zero', () => {
    renderizar({
      tipo: 'rosca',
      textoVazio: 'Nenhum pagamento registrado.',
      segmentos: pagamentos.map(s => ({ ...s, valor: 0 }))
    });

    expect(el.querySelectorAll('.grafico-proporcao__fatia').length).toBe(0);
    expect(el.querySelector('.grafico-proporcao__trilho')).not.toBeNull();
    expect(el.querySelector('.grafico-proporcao__vazio')?.textContent).toContain('Nenhum pagamento registrado.');
    expect(legenda()).toEqual(['Pagos 0 0%', 'Pendentes 0 0%', 'Vencidos 0 0%']);
  });

  it('should not show the empty message when there is data', () => {
    renderizar({ segmentos: pagamentos });

    expect(el.querySelector('.grafico-proporcao__vazio')).toBeNull();
  });

  // As cores das partes vêm de tokens com versão no tema escuro. Um nome de
  // token inexistente não quebraria nada e só apagaria a fatia (issue #213).
  it('should paint the parts with theme tokens that change in dark theme', () => {
    renderizar({ tipo: 'rosca', segmentos: pagamentos });
    document.body.appendChild(el);
    const temaAnterior = document.documentElement.getAttribute('data-theme');

    try {
      const fatia = el.querySelector('.grafico-proporcao__fatia') as SVGElement;
      const marca = el.querySelector('.grafico-proporcao__marca') as HTMLElement;

      document.documentElement.setAttribute('data-theme', 'light');
      const claro = getComputedStyle(fatia).stroke;
      expect(claro).toBe('rgb(90, 122, 94)');
      expect(getComputedStyle(marca).backgroundColor).toBe(claro);

      document.documentElement.setAttribute('data-theme', 'dark');
      expect(getComputedStyle(fatia).stroke).toBe('rgb(109, 163, 114)');
    } finally {
      if (temaAnterior === null) {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', temaAnterior);
      }
      document.body.removeChild(el);
    }
  });
});
