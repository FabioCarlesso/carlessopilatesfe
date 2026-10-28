import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MascaraDirective } from './mascara.directive';

@Component({
  imports: [ReactiveFormsModule, FormsModule, MascaraDirective],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <input id="cpf" appMascara="cpf" [formControl]="cpf" />
    <input id="telefone" appMascara="telefone" [formControl]="telefone" />
    <input id="cep" appMascara="cep" [formControl]="cep" />
    <input id="filtro" appMascara="cpf" name="filtro" [(ngModel)]="filtro" />
  `
})
class HostComponent {
  cpf = new FormControl<string | null>('');
  telefone = new FormControl<string | null>('');
  cep = new FormControl<string | null>('');
  filtro = '';
}

describe('MascaraDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  const input = (id: string) => (fixture.nativeElement as HTMLElement).querySelector(`#${id}`) as HTMLInputElement;

  /** Simula digitação ou colagem: o navegador troca o valor e dispara `input`. */
  function digitar(id: string, valor: string, cursor = valor.length): void {
    const el = input(id);
    el.focus();
    el.value = valor;
    el.setSelectionRange(cursor, cursor);
    el.dispatchEvent(new Event('input'));
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should show the CPF punctuated and hand only digits to the form control', () => {
    digitar('cpf', '52998224725');
    expect(input('cpf').value).toBe('529.982.247-25');
    expect(host.cpf.value).toBe('52998224725');
  });

  it('should treat a paste with or without punctuation the same way', () => {
    digitar('cpf', '529.982.247-25');
    expect(input('cpf').value).toBe('529.982.247-25');
    expect(host.cpf.value).toBe('52998224725');

    digitar('telefone', '(11) 99999-8888');
    expect(input('telefone').value).toBe('(11) 99999-8888');
    expect(host.telefone.value).toBe('11999998888');

    digitar('cep', '01310100');
    expect(input('cep').value).toBe('01310-100');
    expect(host.cep.value).toBe('01310100');
  });

  it('should accept 10-digit landlines and 11-digit mobiles', () => {
    digitar('telefone', '1133334444');
    expect(input('telefone').value).toBe('(11) 3333-4444');
    expect(host.telefone.value).toBe('1133334444');

    digitar('telefone', '11999998888');
    expect(input('telefone').value).toBe('(11) 99999-8888');
  });

  it('should discard letters and digits beyond the mask', () => {
    digitar('cep', '01a310-1009');
    expect(input('cep').value).toBe('01310-100');
    expect(host.cep.value).toBe('01310100');
  });

  it('should format values written by the form', () => {
    host.cpf.setValue('52998224725');
    host.telefone.setValue('11 99999-8888');
    expect(input('cpf').value).toBe('529.982.247-25');
    expect(input('telefone').value).toBe('(11) 99999-8888');
  });

  it('should not rewrite the model when a stored value is only displayed', () => {
    host.telefone.setValue('(11) 99999-8888');
    expect(input('telefone').value).toBe('(11) 99999-8888');
    expect(host.telefone.value).toBe('(11) 99999-8888');
  });

  it('should keep the caret after the same digit when editing in the middle', () => {
    digitar('cpf', '529.982.247-25');
    // Apaga o "9" de "982" com o cursor logo depois dele: o navegador deixa
    // "529.82.247-25" com o cursor na posição 4.
    digitar('cpf', '529.82.247-25', 4);
    expect(input('cpf').value).toBe('529.822.472-5');
    expect(input('cpf').selectionStart).toBe(3);
  });

  it('should step the caret over punctuation removed by backspace', () => {
    digitar('telefone', '(11) 3333-4');
    // Backspace logo depois do hífen: "(11) 33334" com o cursor na posição 9.
    digitar('telefone', '(11) 33334', 9);
    expect(input('telefone').value).toBe('(11) 3333-4');
    expect(input('telefone').selectionStart).toBe(9);
  });

  it('should follow the disabled state of the control', () => {
    host.cpf.disable();
    expect(input('cpf').disabled).toBeTrue();
    host.cpf.enable();
    expect(input('cpf').disabled).toBeFalse();
  });

  it('should mark the control as touched on blur', () => {
    input('cpf').dispatchEvent(new Event('blur'));
    expect(host.cpf.touched).toBeTrue();
  });

  it('should work with ngModel', async () => {
    digitar('filtro', '529.982');
    expect(input('filtro').value).toBe('529.982');
    expect(host.filtro).toBe('529982');

    host.filtro = '52998224725';
    fixture.detectChanges();
    await fixture.whenStable();
    expect(input('filtro').value).toBe('529.982.247-25');
  });
});
