import { ElementRef } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { focarPrimeiroCampo, focarPrimeiroInvalido } from './form-focus';

describe('focarPrimeiroInvalido', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
  });

  function form(controls: Record<string, FormControl>): FormGroup {
    return new FormGroup(controls);
  }

  it('should focus and scroll to the first invalid field', () => {
    host.innerHTML = `
      <input id="nome" class="ng-invalid" />
      <input id="email" class="ng-invalid" />
    `;
    const nome = host.querySelector('#nome') as HTMLInputElement;
    const scrollSpy = spyOn(nome, 'scrollIntoView');

    const grupo = form({ nome: new FormControl('', Validators.required) });
    const resultado = focarPrimeiroInvalido(grupo, host);

    expect(resultado).toBeTrue();
    expect(document.activeElement).toBe(nome);
    expect(scrollSpy).toHaveBeenCalled();
  });

  it('should pick the first invalid field in document order', () => {
    host.innerHTML = `
      <input id="nome" />
      <input id="email" class="ng-invalid" />
    `;
    const email = host.querySelector('#email') as HTMLInputElement;

    const grupo = form({ email: new FormControl('', Validators.required) });
    focarPrimeiroInvalido(grupo, host);

    expect(document.activeElement).toBe(email);
  });

  it('should support select and textarea controls', () => {
    host.innerHTML = `<textarea id="obs" class="ng-invalid"></textarea>`;
    const obs = host.querySelector('#obs') as HTMLTextAreaElement;

    const grupo = form({ obs: new FormControl('', Validators.required) });

    expect(focarPrimeiroInvalido(grupo, host)).toBeTrue();
    expect(document.activeElement).toBe(obs);
  });

  it('should ignore disabled invalid fields', () => {
    host.innerHTML = `<input id="nome" class="ng-invalid" disabled />`;

    const grupo = form({ nome: new FormControl('', Validators.required) });

    expect(focarPrimeiroInvalido(grupo, host)).toBeFalse();
  });

  it('should accept an ElementRef as host', () => {
    host.innerHTML = `<input id="nome" class="ng-invalid" />`;
    const nome = host.querySelector('#nome') as HTMLInputElement;

    const grupo = form({ nome: new FormControl('', Validators.required) });
    const resultado = focarPrimeiroInvalido(grupo, new ElementRef(host));

    expect(resultado).toBeTrue();
    expect(document.activeElement).toBe(nome);
  });

  it('should do nothing when the form is valid', () => {
    host.innerHTML = `<input id="nome" class="ng-invalid" />`;

    const grupo = form({ nome: new FormControl('ok', Validators.required) });

    expect(focarPrimeiroInvalido(grupo, host)).toBeFalse();
  });

  it('should return false when there is no invalid field in the DOM', () => {
    host.innerHTML = `<input id="nome" />`;

    const grupo = form({ nome: new FormControl('', Validators.required) });

    expect(focarPrimeiroInvalido(grupo, host)).toBeFalse();
  });

  it('should return false for a missing host', () => {
    const grupo = form({ nome: new FormControl('', Validators.required) });

    expect(focarPrimeiroInvalido(grupo, null)).toBeFalse();
  });
});

describe('focarPrimeiroCampo', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  afterEach(() => {
    host.remove();
  });

  it('should focus the first focusable field', () => {
    host.innerHTML = `
      <input id="nome" />
      <input id="email" />
    `;
    const nome = host.querySelector('#nome') as HTMLInputElement;

    expect(focarPrimeiroCampo(host)).toBeTrue();
    expect(document.activeElement).toBe(nome);
  });

  it('should skip hidden and disabled fields', () => {
    host.innerHTML = `
      <input id="oculto" type="hidden" />
      <input id="desabilitado" disabled />
      <input id="nome" />
    `;
    const nome = host.querySelector('#nome') as HTMLInputElement;

    expect(focarPrimeiroCampo(host)).toBeTrue();
    expect(document.activeElement).toBe(nome);
  });

  it('should accept an ElementRef as host', () => {
    host.innerHTML = `<input id="nome" />`;
    const nome = host.querySelector('#nome') as HTMLInputElement;

    expect(focarPrimeiroCampo(new ElementRef(host))).toBeTrue();
    expect(document.activeElement).toBe(nome);
  });

  it('should return false when there is no focusable field', () => {
    host.innerHTML = `<p>Sem campos</p>`;

    expect(focarPrimeiroCampo(host)).toBeFalse();
  });

  it('should return false for a missing host', () => {
    expect(focarPrimeiroCampo(null)).toBeFalse();
  });
});
