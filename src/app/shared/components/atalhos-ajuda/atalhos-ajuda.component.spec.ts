import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { isOnPush } from '../../../../testing/onpush';
import { ATALHOS, AtalhoTeclado } from '../../utils/atalhos-teclado';
import { AtalhosAjudaComponent } from './atalhos-ajuda.component';

@Component({
  imports: [AtalhosAjudaComponent],
  template: `
    <button type="button" id="disparador">Antes</button>
    @if (aberto()) {
      <app-atalhos-ajuda [atalhos]="atalhos" (fechar)="aberto.set(false)" />
    }
  `
})
class HostComponent {
  readonly aberto = signal(false);
  atalhos: readonly AtalhoTeclado[] = ATALHOS;
}

describe('AtalhosAjudaComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    document.body.appendChild(el);
    fixture.detectChanges();
  });

  afterEach(() => el.remove());

  function abrir(atalhos: readonly AtalhoTeclado[] = ATALHOS): void {
    host.atalhos = atalhos;
    (el.querySelector('#disparador') as HTMLButtonElement).focus();
    host.aberto.set(true);
    fixture.detectChanges();
  }

  it('deve usar ChangeDetectionStrategy.OnPush', () => {
    expect(isOnPush(AtalhosAjudaComponent)).toBeTrue();
  });

  it('deve abrir um diálogo modal rotulado com o foco no botão Fechar', () => {
    abrir();
    const dialogo = el.querySelector('[role="dialog"]') as HTMLElement;

    expect(dialogo.getAttribute('aria-modal')).toBe('true');
    const titulo = document.getElementById(dialogo.getAttribute('aria-labelledby') ?? '');
    expect(titulo?.textContent?.trim()).toBe('Atalhos de teclado');
    expect(document.activeElement?.textContent?.trim()).toBe('Fechar');
  });

  it('deve listar os atalhos recebidos, agrupados, com as teclas em <kbd>', () => {
    abrir();
    const grupos = Array.from(el.querySelectorAll('.atalhos-ajuda-grupo')).map(g => g.textContent?.trim());
    const itens = el.querySelectorAll('.atalhos-ajuda-item');

    expect(grupos).toEqual(['Geral', 'Navegação', 'Cadastro']);
    expect(itens.length).toBe(ATALHOS.length);

    const ctrlK = Array.from(itens[0].querySelectorAll('kbd')).map(k => k.textContent);
    expect(ctrlK).toEqual(['Ctrl', 'K']);

    const gp = Array.from(itens).find(item => item.textContent?.includes('Ir para pacientes')) as HTMLElement;
    expect(Array.from(gp.querySelectorAll('kbd')).map(k => k.textContent)).toEqual(['g', 'p']);
    expect(gp.textContent).toContain('depois');
  });

  it('deve mostrar só os atalhos que recebeu (os do perfil)', () => {
    abrir(ATALHOS.filter(atalho => !atalho.papeis));

    expect(el.textContent).not.toContain('Ir para a administração');
    expect(el.textContent).toContain('Ir para o início');
  });

  it('deve fechar com Esc e devolver o foco ao elemento anterior', () => {
    abrir();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(el.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement?.id).toBe('disparador');
  });

  it('deve fechar pelo botão Fechar', () => {
    abrir();
    const fechar = Array.from(el.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Fechar') as HTMLButtonElement;
    fechar.click();
    fixture.detectChanges();

    expect(host.aberto()).toBeFalse();
    expect(el.querySelector('[role="dialog"]')).toBeNull();
  });
});
