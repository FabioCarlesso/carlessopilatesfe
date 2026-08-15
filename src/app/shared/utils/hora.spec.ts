import { horaDeMinutos, minutosDoDia, normalizarHora } from './hora';

describe('hora utils', () => {
  describe('normalizarHora', () => {
    it('should keep HH:mm untouched', () => {
      expect(normalizarHora('08:30')).toBe('08:30');
    });

    // A API sempre devolve `HH:mm:ss`, inclusive para um `POST` que mandou
    // `08:00`; os formulários trabalham em `HH:mm`.
    it('should drop the seconds the API sends', () => {
      expect(normalizarHora('08:30:00')).toBe('08:30');
      expect(normalizarHora('08:30:45')).toBe('08:30');
    });

    it('should return null for absent or unrecognized values', () => {
      expect(normalizarHora(null)).toBeNull();
      expect(normalizarHora(undefined)).toBeNull();
      expect(normalizarHora('')).toBeNull();
      expect(normalizarHora('manhã')).toBeNull();
    });
  });

  describe('minutosDoDia', () => {
    it('should count the minutes since midnight', () => {
      expect(minutosDoDia('00:00')).toBe(0);
      expect(minutosDoDia('08:30:00')).toBe(510);
      expect(minutosDoDia('23:59')).toBe(1439);
    });

    it('should return null for absent or unrecognized values', () => {
      expect(minutosDoDia(null)).toBeNull();
      expect(minutosDoDia('tarde')).toBeNull();
    });
  });

  describe('horaDeMinutos', () => {
    it('should format the minutes back to HH:mm', () => {
      expect(horaDeMinutos(0)).toBe('00:00');
      expect(horaDeMinutos(510)).toBe('08:30');
    });

    // O fim da faixa de uma sessão noturna estouraria o dia; saturar mantém a
    // consulta dentro de `HH:mm` em vez de mandar `24:30` para a API.
    it('should saturate at the end of the day', () => {
      expect(horaDeMinutos(1440)).toBe('23:59');
      expect(horaDeMinutos(2000)).toBe('23:59');
    });

    it('should saturate at midnight for negative values', () => {
      expect(horaDeMinutos(-10)).toBe('00:00');
    });
  });
});
