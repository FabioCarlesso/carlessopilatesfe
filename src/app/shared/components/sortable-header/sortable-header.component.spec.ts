import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { isOnPush } from '../../../../testing/onpush';
import { Ordenacao } from '../../../core/models/ordenacao';
import { SortableHeaderComponent } from './sortable-header.component';

@Component({
  standalone: true,
  imports: [SortableHeaderComponent],
  template: `
    <table>
      <thead>
        <tr>
          <th app-sortable campo="nome" [ordenacao]="ordenacao" (ordenar)="onOrdenar($event)">Nome</th>
          <th app-sortable campo="email" [ordenacao]="ordenacao" (ordenar)="onOrdenar($event)">E-mail</th>
        </tr>
      </thead>
    </table>
  `
})
class HostComponent {
  ordenacao: Ordenacao = { campo: 'nome', direcao: 'asc' };
  ultimoCampo: string | null = null;

  onOrdenar(campo: string): void {
    this.ultimoCampo = campo;
  }
}

describe('SortableHeaderComponent (issue #151)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function headers(): HTMLTableCellElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('th[app-sortable]'));
  }

  it('should use OnPush change detection strategy', () => {
    expect(isOnPush(SortableHeaderComponent)).toBeTrue();
  });

  it('should project the column label into a button', () => {
    const button = headers()[0].querySelector('button.sort-header') as HTMLButtonElement;
    expect(button).toBeTruthy();
    expect(button.textContent).toContain('Nome');
  });

  it('should mark the active column with aria-sort ascending and the others as none', () => {
    expect(headers()[0].getAttribute('aria-sort')).toBe('ascending');
    expect(headers()[1].getAttribute('aria-sort')).toBe('none');
  });

  it('should reflect descending direction on the active column', () => {
    host.ordenacao = { campo: 'nome', direcao: 'desc' };
    fixture.detectChanges();
    expect(headers()[0].getAttribute('aria-sort')).toBe('descending');
  });

  it('should emit the field when the header button is clicked', () => {
    const button = headers()[1].querySelector('button.sort-header') as HTMLButtonElement;
    button.click();
    expect(host.ultimoCampo).toBe('email');
  });

  it('should show a directional arrow only on the active column', () => {
    const arrows = fixture.nativeElement.querySelectorAll('.sort-arrow');
    expect((arrows[0] as HTMLElement).textContent?.trim()).toBe('▲');
    // Coluna inativa exibe o indicador neutro de ordenável.
    expect((arrows[1] as HTMLElement).textContent?.trim()).toBe('⇅');
  });
});
