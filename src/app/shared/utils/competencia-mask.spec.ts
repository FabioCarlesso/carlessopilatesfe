import { formatCompetencia } from './competencia-mask';

describe('formatCompetencia', () => {
  it('should keep up to two digits without a slash while typing the month', () => {
    expect(formatCompetencia('')).toBe('');
    expect(formatCompetencia('0')).toBe('0');
    expect(formatCompetencia('05')).toBe('05');
  });

  it('should insert the slash automatically once the year starts', () => {
    expect(formatCompetencia('052')).toBe('05/2');
    expect(formatCompetencia('052026')).toBe('05/2026');
  });

  it('should strip non-digit characters, allowing a numeric keyboard to fill the field', () => {
    expect(formatCompetencia('05/2026')).toBe('05/2026');
    expect(formatCompetencia('05-2026')).toBe('05/2026');
    expect(formatCompetencia('ab05cd2026')).toBe('05/2026');
  });

  it('should ignore digits beyond MM/AAAA', () => {
    expect(formatCompetencia('0520261234')).toBe('05/2026');
  });

  it('should handle null and undefined input', () => {
    expect(formatCompetencia(null)).toBe('');
    expect(formatCompetencia(undefined)).toBe('');
  });

  it('should drop the trailing slash when the year is erased', () => {
    expect(formatCompetencia('05/')).toBe('05');
  });
});
