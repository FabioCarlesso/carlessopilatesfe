import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { isOnPush } from '../../../../testing/onpush';
import { EmptyStateComponent } from './empty-state.component';

@Component({
  imports: [EmptyStateComponent],
  template: `
    <app-empty-state mensagem="Nenhum resultado para os filtros aplicados." variante="filtrado">
      <button type="button" class="btn btn-outline" (click)="limpou = true">Limpar filtros</button>
    </app-empty-state>
  `
})
class HostComAcaoComponent {
  limpou = false;
}

describe('EmptyStateComponent', () => {
  let fixture: ComponentFixture<EmptyStateComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent, HostComAcaoComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyStateComponent);
    el = fixture.nativeElement;
    fixture.componentRef.setInput('mensagem', 'Nenhum paciente cadastrado.');
  });

  it('should use OnPush change detection strategy', () => {
    expect(isOnPush(EmptyStateComponent)).toBeTrue();
  });

  it('should render the message inside a status region', () => {
    fixture.detectChanges();

    const conteudo = el.querySelector('.empty-state__conteudo');
    expect(conteudo?.getAttribute('role')).toBe('status');
    expect(el.querySelector('.empty-state__mensagem')?.textContent?.trim()).toBe('Nenhum paciente cadastrado.');
    expect(el.querySelector('.empty-state__texto')).toBeNull();
  });

  it('should hide the decorative icon from assistive tech', () => {
    fixture.detectChanges();

    const icone = el.querySelector('.empty-state__icone');
    expect(icone?.getAttribute('aria-hidden')).toBe('true');
    expect(icone?.getAttribute('focusable')).toBe('false');
  });

  it('should render the optional explanatory text', () => {
    fixture.componentRef.setInput('texto', 'As aulas são criadas automaticamente.');
    fixture.detectChanges();

    expect(el.querySelector('.empty-state__texto')?.textContent?.trim()).toBe('As aulas são criadas automaticamente.');
  });

  it('should mark the filtered variant', () => {
    fixture.detectChanges();
    expect(el.querySelector('.empty-state')?.classList).not.toContain('empty-state--filtrado');

    fixture.componentRef.setInput('variante', 'filtrado');
    fixture.detectChanges();
    expect(el.querySelector('.empty-state')?.classList).toContain('empty-state--filtrado');
  });

  it('should drop the status role when the page already announces the result', () => {
    fixture.componentRef.setInput('anunciar', false);
    fixture.detectChanges();

    expect(el.querySelector('.empty-state__conteudo')?.hasAttribute('role')).toBeFalse();
  });

  it('should render no action when nothing is projected', () => {
    fixture.detectChanges();

    expect(el.querySelector('.empty-state__acoes')?.children.length).toBe(0);
  });

  it('should project the actions outside the status region', () => {
    const host = TestBed.createComponent(HostComAcaoComponent);
    host.detectChanges();
    const raiz: HTMLElement = host.nativeElement;

    const botao = raiz.querySelector('.empty-state__acoes button') as HTMLButtonElement;
    expect(botao.textContent?.trim()).toBe('Limpar filtros');
    expect(raiz.querySelector('[role="status"] button')).toBeNull();

    botao.click();
    expect(host.componentInstance.limpou).toBeTrue();
  });
});
