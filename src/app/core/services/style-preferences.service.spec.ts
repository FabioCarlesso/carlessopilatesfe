import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StylePreferencesService } from './style-preferences.service';

const STORAGE_KEY = 'carlesso.style-preferences';

describe('StylePreferencesService', () => {
  let documentRef: Document;

  function mockPrefersDark(matches: boolean): void {
    spyOn(window, 'matchMedia').and.returnValue({
      matches,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false
    } as MediaQueryList);
  }

  function createService(): StylePreferencesService {
    return TestBed.inject(StylePreferencesService);
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    documentRef = TestBed.inject(DOCUMENT);
  });

  afterEach(() => {
    documentRef.documentElement.removeAttribute('data-theme');
    documentRef.documentElement.removeAttribute('data-density');
    localStorage.clear();
  });

  it('should apply the light theme and default density when there is no saved preference and the OS does not prefer dark', () => {
    mockPrefersDark(false);

    const service = createService();

    expect(service.current).toEqual({ theme: 'light', density: 'default' });
    expect(documentRef.documentElement.getAttribute('data-theme')).toBe('light');
    expect(documentRef.documentElement.getAttribute('data-density')).toBe('default');
  });

  it('should fall back to the dark theme when there is no saved preference and the OS prefers dark', () => {
    mockPrefersDark(true);

    const service = createService();

    expect(service.current.theme).toBe('dark');
    expect(documentRef.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should not persist the fallback preference resolved on startup', () => {
    mockPrefersDark(true);

    createService();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('should load the saved preference from localStorage instead of the OS preference', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: 'dark', density: 'compact' }));
    mockPrefersDark(false);

    const service = createService();

    expect(service.current).toEqual({ theme: 'dark', density: 'compact' });
    expect(documentRef.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(documentRef.documentElement.getAttribute('data-density')).toBe('compact');
  });

  it('should ignore a corrupted saved preference and fall back to the OS preference', () => {
    localStorage.setItem(STORAGE_KEY, '{not-json');
    mockPrefersDark(true);

    const service = createService();

    expect(service.current.theme).toBe('dark');
  });

  it('should preserve a valid saved density while falling back to the OS preference when the saved theme is invalid', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: 'invalid', density: 'compact' }));
    mockPrefersDark(true);

    const service = createService();

    expect(service.current).toEqual({ theme: 'dark', density: 'compact' });
    expect(documentRef.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(documentRef.documentElement.getAttribute('data-density')).toBe('compact');
  });

  it('should persist the theme to localStorage and apply data-theme when it changes', () => {
    mockPrefersDark(false);
    const service = createService();

    service.setTheme('dark');

    expect(service.current).toEqual({ theme: 'dark', density: 'default' });
    expect(documentRef.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({ theme: 'dark', density: 'default' });
  });

  it('should persist the density without changing the theme', () => {
    mockPrefersDark(false);
    const service = createService();

    service.setDensity('comfortable');

    expect(service.current).toEqual({ theme: 'light', density: 'comfortable' });
    expect(documentRef.documentElement.getAttribute('data-density')).toBe('comfortable');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).density).toBe('comfortable');
  });

  it('should toggle between light and dark, persisting and applying each result', () => {
    mockPrefersDark(false);
    const service = createService();

    expect(service.toggleTheme()).toBe('dark');
    expect(documentRef.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).theme).toBe('dark');

    expect(service.toggleTheme()).toBe('light');
    expect(documentRef.documentElement.getAttribute('data-theme')).toBe('light');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).theme).toBe('light');
  });

  it('should apply theme and density together', () => {
    mockPrefersDark(false);
    const service = createService();

    service.apply({ theme: 'dark', density: 'comfortable' });

    expect(documentRef.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(documentRef.documentElement.getAttribute('data-density')).toBe('comfortable');
  });
});
