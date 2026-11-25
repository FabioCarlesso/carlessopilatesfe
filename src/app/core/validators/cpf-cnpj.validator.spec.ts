import { FormControl } from '@angular/forms';
import { cpfCnpjValidator, cpfCnpjValido } from './cpf-cnpj.validator';

describe('cpfCnpjValidator', () => {
  it('should accept empty values', () => {
    expect(cpfCnpjValidator(new FormControl(''))).toBeNull();
    expect(cpfCnpjValidator(new FormControl(null))).toBeNull();
  });

  it('should accept valid CPFs with or without punctuation', () => {
    expect(cpfCnpjValido('52998224725')).toBeTrue();
    expect(cpfCnpjValido('529.982.247-25')).toBeTrue();
  });

  it('should accept valid CNPJs with or without punctuation', () => {
    expect(cpfCnpjValido('11222333000181')).toBeTrue();
    expect(cpfCnpjValido('11.222.333/0001-81')).toBeTrue();
  });

  it('should reject wrong check digits, repeated sequences and other lengths', () => {
    expect(cpfCnpjValido('52998224724')).toBeFalse();
    expect(cpfCnpjValido('11222333000182')).toBeFalse();
    expect(cpfCnpjValido('11111111111111')).toBeFalse();
    expect(cpfCnpjValido('123456789012')).toBeFalse();
    expect(cpfCnpjValido('abc')).toBeFalse();
    expect(cpfCnpjValidator(new FormControl('123'))).toEqual({ cpfCnpj: true });
  });
});
