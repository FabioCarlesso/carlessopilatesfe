import { FormControl, Validators } from '@angular/forms';
import { cpfValidator, cpfValido } from './cpf.validator';

describe('cpfValidator', () => {
  const validar = (valor: unknown) => cpfValidator(new FormControl(valor));

  it('should accept a valid CPF with punctuation', () => {
    expect(validar('529.982.247-25')).toBeNull();
    expect(validar('123.456.789-09')).toBeNull();
  });

  it('should accept a valid CPF as 11 digits', () => {
    expect(validar('52998224725')).toBeNull();
    expect(validar('12345678909')).toBeNull();
  });

  it('should accept surrounding whitespace', () => {
    expect(validar(' 52998224725 ')).toBeNull();
  });

  it('should reject a CPF with a wrong first check digit', () => {
    expect(validar('529.982.247-15')).toEqual({ cpf: true });
  });

  it('should reject a CPF with a wrong second check digit', () => {
    expect(validar('52998224726')).toEqual({ cpf: true });
    expect(validar('123.456.789-00')).toEqual({ cpf: true });
  });

  it('should reject sequences of a single repeated digit, even though their check digits match', () => {
    for (let d = 0; d <= 9; d++) {
      expect(validar(String(d).repeat(11))).withContext(`${d} repetido`).toEqual({ cpf: true });
    }
    expect(validar('000.000.000-00')).toEqual({ cpf: true });
    expect(validar('111.111.111-11')).toEqual({ cpf: true });
  });

  it('should reject a CPF with the wrong number of digits', () => {
    expect(validar('5299822472')).toEqual({ cpf: true });
    expect(validar('529982247250')).toEqual({ cpf: true });
    expect(validar('529.982.247-2')).toEqual({ cpf: true });
    expect(validar('123')).toEqual({ cpf: true });
  });

  it('should reject partial or foreign punctuation', () => {
    expect(validar('529982.247-25')).toEqual({ cpf: true });
    expect(validar('529 982 247 25')).toEqual({ cpf: true });
    expect(validar('529.982.247/25')).toEqual({ cpf: true });
    expect(validar('abc.def.ghi-jk')).toEqual({ cpf: true });
  });

  it('should leave empty values to Validators.required', () => {
    expect(validar('')).toBeNull();
    expect(validar('   ')).toBeNull();
    expect(validar(null)).toBeNull();
    expect(validar(undefined)).toBeNull();

    const controle = new FormControl('', [Validators.required, cpfValidator]);
    expect(controle.errors).toEqual({ required: true });
  });

  it('cpfValido should mirror the validator', () => {
    expect(cpfValido('529.982.247-25')).toBeTrue();
    expect(cpfValido('52998224724')).toBeFalse();
  });
});
