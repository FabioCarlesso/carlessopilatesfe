import {
  exibirValorGravado,
  formatar,
  formatarCep,
  formatarCpf,
  formatarTelefone,
  somenteDigitos
} from './mascara';

describe('mascara', () => {
  describe('somenteDigitos', () => {
    it('should drop everything but digits', () => {
      expect(somenteDigitos('(11) 99999-8888')).toBe('11999998888');
      expect(somenteDigitos('529.982.247-25')).toBe('52998224725');
      expect(somenteDigitos(null)).toBe('');
      expect(somenteDigitos(undefined)).toBe('');
    });
  });

  describe('formatarCpf', () => {
    it('should build the mask progressively while typing', () => {
      expect(formatarCpf('')).toBe('');
      expect(formatarCpf('529')).toBe('529');
      expect(formatarCpf('5299')).toBe('529.9');
      expect(formatarCpf('529982')).toBe('529.982');
      expect(formatarCpf('5299822')).toBe('529.982.2');
      expect(formatarCpf('529982247')).toBe('529.982.247');
      expect(formatarCpf('5299822472')).toBe('529.982.247-2');
      expect(formatarCpf('52998224725')).toBe('529.982.247-25');
    });

    it('should give the same result for pasted values with or without punctuation', () => {
      expect(formatarCpf('529.982.247-25')).toBe('529.982.247-25');
      expect(formatarCpf('529 982 247 25')).toBe('529.982.247-25');
    });

    it('should ignore digits beyond 11', () => {
      expect(formatarCpf('529982247251234')).toBe('529.982.247-25');
    });
  });

  describe('formatarTelefone', () => {
    it('should build the mask progressively while typing', () => {
      expect(formatarTelefone('')).toBe('');
      expect(formatarTelefone('1')).toBe('(1');
      expect(formatarTelefone('11')).toBe('(11');
      expect(formatarTelefone('113')).toBe('(11) 3');
      expect(formatarTelefone('113333')).toBe('(11) 3333');
      expect(formatarTelefone('1133334')).toBe('(11) 3333-4');
    });

    it('should format a 10-digit landline as (00) 0000-0000', () => {
      expect(formatarTelefone('1133334444')).toBe('(11) 3333-4444');
    });

    it('should format an 11-digit mobile as (00) 00000-0000', () => {
      expect(formatarTelefone('11999998888')).toBe('(11) 99999-8888');
    });

    it('should give the same result for pasted values with or without punctuation', () => {
      expect(formatarTelefone('(11) 99999-8888')).toBe('(11) 99999-8888');
      expect(formatarTelefone('11 99999 8888')).toBe('(11) 99999-8888');
      expect(formatarTelefone('(11) 3333-4444')).toBe('(11) 3333-4444');
    });

    it('should ignore digits beyond 11', () => {
      expect(formatarTelefone('119999988887')).toBe('(11) 99999-8888');
    });
  });

  describe('formatarCep', () => {
    it('should build the mask progressively while typing', () => {
      expect(formatarCep('')).toBe('');
      expect(formatarCep('01310')).toBe('01310');
      expect(formatarCep('013101')).toBe('01310-1');
      expect(formatarCep('01310100')).toBe('01310-100');
    });

    it('should give the same result for pasted values with or without punctuation, ignoring extra digits', () => {
      expect(formatarCep('01310-100')).toBe('01310-100');
      expect(formatarCep('01.310-100')).toBe('01310-100');
      expect(formatarCep('013101009')).toBe('01310-100');
    });
  });

  describe('formatar', () => {
    it('should dispatch to the formatter of each type', () => {
      expect(formatar('cpf', '52998224725')).toBe('529.982.247-25');
      expect(formatar('telefone', '11999998888')).toBe('(11) 99999-8888');
      expect(formatar('cep', '01310100')).toBe('01310-100');
    });
  });

  describe('exibirValorGravado', () => {
    it('should format stored values that are digits or use another punctuation', () => {
      expect(exibirValorGravado('cpf', '52998224725')).toBe('529.982.247-25');
      expect(exibirValorGravado('telefone', '11 99999-8888')).toBe('(11) 99999-8888');
      expect(exibirValorGravado('cep', '01310100')).toBe('01310-100');
    });

    it('should keep legacy values the mask would mangle as they were stored', () => {
      expect(exibirValorGravado('telefone', '11 99999-8888 (recado)')).toBe('11 99999-8888 (recado)');
      expect(exibirValorGravado('telefone', '11999998888 / 1133334444')).toBe('11999998888 / 1133334444');
      expect(exibirValorGravado('cpf', '529.982.247-25.0')).toBe('529.982.247-25.0');
    });

    it('should show an empty field for null and undefined', () => {
      expect(exibirValorGravado('cpf', null)).toBe('');
      expect(exibirValorGravado('cep', undefined)).toBe('');
    });
  });
});
