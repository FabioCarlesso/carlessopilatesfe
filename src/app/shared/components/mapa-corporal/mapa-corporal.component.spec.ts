import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MAX_PONTOS_DOR, PontoDor } from '../../../core/models/ponto-dor';
import { MapaCorporalComponent } from './mapa-corporal.component';

function ponto(parcial: Partial<PontoDor> = {}): PontoDor {
  return { vista: 'FRENTE', x: 0.5, y: 0.5, desenhoVersao: 1, intensidade: null, observacao: null, ...parcial };
}

describe('MapaCorporalComponent', () => {
  let fixture: ComponentFixture<MapaCorporalComponent>;
  let component: MapaCorporalComponent;
  let emitidos: PontoDor[][];

  function montar(pontos: PontoDor[] = [], extras: Record<string, unknown> = {}): void {
    fixture = TestBed.createComponent(MapaCorporalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('pontos', pontos);
    for (const [nome, valor] of Object.entries(extras)) fixture.componentRef.setInput(nome, valor);
    emitidos = [];
    component.pontosChange.subscribe(p => emitidos.push(p));
    fixture.detectChanges();
  }

  function el(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function desenho(vista: string): HTMLElement {
    return el().querySelector<HTMLElement>(`figure[data-vista="${vista}"] .desenho`)!;
  }

  function botoesPonto(): HTMLButtonElement[] {
    return Array.from(el().querySelectorAll<HTMLButtonElement>('button.ponto'));
  }

  function tecla(alvo: HTMLElement, key: string, shiftKey = false): KeyboardEvent {
    const evento = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });
    alvo.dispatchEvent(evento);
    fixture.detectChanges();
    return evento;
  }

  /** Simula um clique na posição normalizada (x, y) de um desenho de 120×260 px em (10, 20). */
  function clicar(vista: string, x: number, y: number): void {
    const alvo = desenho(vista);
    spyOn(alvo.querySelector('img')!, 'getBoundingClientRect').and.returnValue(
      { left: 10, top: 20, width: 120, height: 260 } as DOMRect
    );
    alvo.dispatchEvent(new MouseEvent('click', { clientX: 10 + x * 120, clientY: 20 + y * 260, bubbles: true }));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MapaCorporalComponent] }).compileComponents();
  });

  it('should show the four views with the current drawing when there are no points', () => {
    montar();
    const figuras = Array.from(el().querySelectorAll<HTMLElement>('figure'));
    expect(figuras.map(f => f.dataset['vista'])).toEqual(['FRENTE', 'COSTAS', 'LATERAL_DIREITA', 'LATERAL_ESQUERDA']);
    expect(el().querySelector<HTMLImageElement>('figure[data-vista="COSTAS"] img')!.getAttribute('src'))
      .toBe('mapa-corporal/v1/costas.svg');
    expect(el().querySelector('.lista-pontos__vazia')?.textContent).toContain('Nenhum ponto de dor marcado.');
  });

  it('should open each view with the drawing version of its points', () => {
    montar([ponto({ desenhoVersao: 2 }), ponto({ vista: 'COSTAS', desenhoVersao: 1 })]);
    expect(el().querySelector('figure[data-vista="FRENTE"] img')!.getAttribute('src')).toBe('mapa-corporal/v2/frente.svg');
    expect(el().querySelector('figure[data-vista="COSTAS"] img')!.getAttribute('src')).toBe('mapa-corporal/v1/costas.svg');
    expect(el().querySelector('figure[data-vista="FRENTE"] figcaption')!.textContent).not.toContain('v2');
  });

  it('should show one drawing per version when a view mixes versions', () => {
    montar([ponto({ desenhoVersao: 1 }), ponto({ desenhoVersao: 2 })]);
    const frente = el().querySelectorAll('figure[data-vista="FRENTE"]');
    expect(frente.length).toBe(2);
    expect(frente[1].querySelector('figcaption')!.textContent).toContain('desenho v2');
  });

  it('should add a point at the normalized coordinate of the click, with the drawing version', () => {
    montar();
    clicar('COSTAS', 0.25, 0.75);
    expect(emitidos.at(-1)).toEqual([ponto({ vista: 'COSTAS', x: 0.25, y: 0.75 })]);
    const botao = botoesPonto()[0];
    expect(botao.style.left).toBe('25%');
    expect(botao.style.top).toBe('75%');
  });

  it('should place the saved points by percentage, so they keep their place at any size', () => {
    montar([ponto({ x: 0.3, y: 0.6, intensidade: 10 })]);
    const botao = botoesPonto()[0];
    expect(botao.style.left).toBe('30%');
    expect(botao.style.top).toBe('60%');
    expect(botao.style.width).toBe('10%');
    expect(botao.classList).toContain('ponto--intensa');
  });

  it('should open the editor on a point click without adding another point', () => {
    montar([ponto()]);
    botoesPonto()[0].click();
    fixture.detectChanges();
    expect(component.selecionado).toBe(0);
    expect(emitidos).toEqual([]);
    expect(el().querySelector('.editor-ponto__titulo')?.textContent).toContain('Ponto 1 · Frente · Quadril');
  });

  it('should edit the intensity and the note of the selected point', () => {
    montar([ponto()]);
    component.selecionar(0);
    fixture.detectChanges();

    const select = el().querySelector<HTMLSelectElement>('.editor-ponto select')!;
    select.value = '8';
    select.dispatchEvent(new Event('change'));
    const input = el().querySelector<HTMLInputElement>('.editor-ponto input')!;
    input.value = 'Piora ao agachar';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(emitidos.at(-1)).toEqual([ponto({ intensidade: 8, observacao: 'Piora ao agachar' })]);
    expect(el().querySelector('.lista-pontos__item')?.textContent).toContain('intensidade 8/10');

    select.value = '';
    select.dispatchEvent(new Event('change'));
    input.value = '   ';
    input.dispatchEvent(new Event('input'));
    expect(emitidos.at(-1)).toEqual([ponto()]);
  });

  it('should not submit the host form with Enter in the note, closing the editor instead', fakeAsync(() => {
    montar([ponto()]);
    component.selecionar(0);
    fixture.detectChanges();
    const evento = tecla(el().querySelector<HTMLInputElement>('.editor-ponto input')!, 'Enter');
    tick();
    expect(evento.defaultPrevented).toBeTrue();
    expect(component.selecionado).toBeNull();
    expect(document.activeElement).toBe(botoesPonto()[0]);
  }));

  it('should remove the point from the editor and from the list', () => {
    montar([ponto(), ponto({ vista: 'COSTAS' }), ponto({ vista: 'LATERAL_DIREITA' })]);
    component.selecionar(2);
    component.remover(0);
    expect(component.selecionado).toBe(1);
    fixture.detectChanges();
    el().querySelector<HTMLButtonElement>('.editor-ponto .btn-danger')!.click();
    fixture.detectChanges();
    expect(emitidos.at(-1)).toEqual([ponto({ vista: 'COSTAS' })]);
    expect(component.selecionado).toBeNull();

    el().querySelector<HTMLButtonElement>('button[aria-label="Remover ponto 1"]')!.click();
    expect(emitidos.at(-1)).toEqual([]);
    component.remover(5);
    expect(emitidos.length).toBe(3);
  });

  it('should toggle the editor from the list and close it with Concluir', () => {
    montar([ponto()]);
    el().querySelector<HTMLButtonElement>('button[aria-label="Editar ponto 1"]')!.click();
    fixture.detectChanges();
    expect(botoesPonto()[0].getAttribute('aria-expanded')).toBe('true');
    el().querySelector<HTMLButtonElement>('.editor-ponto .btn-outline')!.click();
    expect(component.selecionado).toBeNull();
    component.selecionar(0);
    component.selecionar(0);
    expect(component.selecionado).toBeNull();
  });

  it('should refuse a point beyond the limit of 50, with a warning', () => {
    montar(Array.from({ length: MAX_PONTOS_DOR }, () => ponto()));
    clicar('FRENTE', 0.1, 0.1);
    expect(emitidos).toEqual([]);
    expect(el().querySelector('.mapa__aviso')?.textContent).toContain('Limite de 50 pontos atingido');
    expect(el().querySelector('.mapa__contagem')?.textContent).toContain('50 de 50 pontos');

    component.remover(0);
    fixture.detectChanges();
    expect(el().querySelector('.mapa__aviso')).toBeNull();
  });

  describe('teclado', () => {
    it('should add a point at the center with Enter on the drawing and focus it', fakeAsync(() => {
      montar();
      const evento = tecla(desenho('LATERAL_ESQUERDA'), 'Enter');
      tick();
      expect(evento.defaultPrevented).toBeTrue();
      expect(emitidos.at(-1)).toEqual([ponto({ vista: 'LATERAL_ESQUERDA' })]);
      expect(document.activeElement).toBe(botoesPonto()[0]);

      tecla(desenho('FRENTE'), ' ');
      tick();
      expect(emitidos.at(-1)?.length).toBe(2);
      tecla(desenho('FRENTE'), 'a');
      expect(emitidos.length).toBe(2);
    }));

    it('should move the focused point with the arrows, with a larger step on Shift', () => {
      montar([ponto()]);
      const botao = botoesPonto()[0];
      expect(tecla(botao, 'ArrowRight').defaultPrevented).toBeTrue();
      expect(emitidos.at(-1)![0]).toEqual(jasmine.objectContaining({ x: 0.51, y: 0.5 }));
      tecla(botoesPonto()[0], 'ArrowUp', true);
      expect(emitidos.at(-1)![0]).toEqual(jasmine.objectContaining({ x: 0.51, y: 0.45 }));
      tecla(botoesPonto()[0], 'ArrowLeft');
      tecla(botoesPonto()[0], 'ArrowDown');
      expect(emitidos.at(-1)![0]).toEqual(jasmine.objectContaining({ x: 0.5, y: 0.46 }));
      // Nenhum ponto novo: a tecla no ponto não chega ao desenho.
      expect(emitidos.at(-1)!.length).toBe(1);
    });

    it('should keep the point inside the drawing', () => {
      montar([ponto({ x: 1, y: 0 })]);
      tecla(botoesPonto()[0], 'ArrowRight', true);
      tecla(botoesPonto()[0], 'ArrowUp');
      expect(emitidos.at(-1)![0]).toEqual(jasmine.objectContaining({ x: 1, y: 0 }));
    });

    it('should remove the focused point with Delete or Backspace and ignore other keys', () => {
      montar([ponto(), ponto({ vista: 'COSTAS' })]);
      tecla(botoesPonto()[0], 'x');
      expect(emitidos).toEqual([]);
      tecla(botoesPonto()[0], 'Delete');
      expect(emitidos.at(-1)).toEqual([ponto({ vista: 'COSTAS' })]);
      tecla(botoesPonto()[0], 'Backspace');
      expect(emitidos.at(-1)).toEqual([]);
    });
  });

  it('should describe each point in the text list with view, region, intensity and note', () => {
    montar([
      ponto({ x: 82 / 240, y: 160 / 520, intensidade: 4, observacao: 'Ao erguer o braço' }),
      ponto({ vista: 'COSTAS', x: 0.5, y: 240 / 520 })
    ]);
    const itens = Array.from(el().querySelectorAll('.lista-pontos__item')).map(li => li.textContent!.replace(/\s+/g, ' '));
    expect(itens[0]).toContain('1. Frente · Braço, lado direito · intensidade 4/10 · Ao erguer o braço');
    expect(itens[1]).toContain('2. Costas · Região lombar · intensidade não informada');
    expect(botoesPonto()[0].getAttribute('aria-label')).toBe('Ponto 1: Frente, Braço, lado direito, intensidade 4 de 10');
    expect(botoesPonto()[1].getAttribute('aria-label')).toContain('intensidade não informada');
  });

  describe('somente leitura', () => {
    it('should draw the points without buttons, editing or adding', () => {
      montar([ponto(), ponto({ vista: 'COSTAS' })], { somenteLeitura: true, vistas: ['COSTAS'] });
      expect(el().querySelectorAll('figure').length).toBe(1);
      expect(botoesPonto().length).toBe(0);
      expect(el().querySelectorAll('span.ponto').length).toBe(1);
      expect(el().querySelector('.lista-pontos__acoes')).toBeNull();
      expect(el().querySelectorAll('.lista-pontos__item').length).toBe(1);
      expect(el().querySelector('.mapa__dica')).toBeNull();

      el().querySelector<HTMLElement>('.desenho')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      component.aoTeclarDesenho(new KeyboardEvent('keydown', { key: 'Enter' }), { vista: 'COSTAS', versao: 1 });
      component.aoTeclarPonto(new KeyboardEvent('keydown', { key: 'Delete' }), 0);
      component.selecionar(0);
      component.remover(0);
      expect(component.adicionar({ vista: 'COSTAS', versao: 1 }, 0.5, 0.5)).toBeNull();
      expect(component.selecionado).toBeNull();
      expect(emitidos).toEqual([]);
    });

    it('should show the empty message of the view', () => {
      montar([ponto()], { somenteLeitura: true, vistas: ['COSTAS'], mensagemVazia: 'Sem pontos nesta vista.' });
      expect(el().querySelector('.lista-pontos__vazia')?.textContent).toContain('Sem pontos nesta vista.');
    });
  });

  it('should drop the selection when the input list shrinks and ignore edits without a selection', () => {
    montar([ponto(), ponto()]);
    component.selecionar(1);
    fixture.componentRef.setInput('pontos', [ponto()]);
    fixture.detectChanges();
    expect(component.selecionado).toBeNull();
    component.definirIntensidade('3');
    component.definirObservacao('x');
    component.fecharEditor();
    expect(emitidos).toEqual([]);
  });
});
