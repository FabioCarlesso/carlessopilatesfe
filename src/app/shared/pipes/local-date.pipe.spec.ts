import { LocalDatePipe } from './local-date.pipe';

describe('LocalDatePipe', () => {
  const pipe = new LocalDatePipe();

  it('should format a date-only ISO value without timezone conversion', () => {
    expect(pipe.transform('2026-05-10')).toBe('10/05/2026');
  });

  it('should return an empty string for missing values', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });

  it('should leave non date-only values unchanged', () => {
    expect(pipe.transform('2026-05-10T09:00:00')).toBe('2026-05-10T09:00:00');
  });
});
