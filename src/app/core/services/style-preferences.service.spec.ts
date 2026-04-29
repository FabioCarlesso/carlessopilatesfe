import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { StylePreferencesService } from './style-preferences.service';

describe('StylePreferencesService', () => {
  let service: StylePreferencesService;
  let documentRef: Document;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StylePreferencesService);
    documentRef = TestBed.inject(DOCUMENT);
  });

  afterEach(() => {
    documentRef.documentElement.removeAttribute('data-theme');
    documentRef.documentElement.removeAttribute('data-density');
  });

  it('should apply default theme and density to the document root', () => {
    expect(documentRef.documentElement.getAttribute('data-theme')).toBe('light');
    expect(documentRef.documentElement.getAttribute('data-density')).toBe('default');
  });

  it('should update the theme without changing density', () => {
    service.setTheme('dark');

    expect(service.current).toEqual({ theme: 'dark', density: 'default' });
    expect(documentRef.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(documentRef.documentElement.getAttribute('data-density')).toBe('default');
  });

  it('should update the density without changing theme', () => {
    service.setDensity('compact');

    expect(service.current).toEqual({ theme: 'light', density: 'compact' });
    expect(documentRef.documentElement.getAttribute('data-theme')).toBe('light');
    expect(documentRef.documentElement.getAttribute('data-density')).toBe('compact');
  });

  it('should apply theme and density together', () => {
    service.apply({ theme: 'dark', density: 'comfortable' });

    expect(documentRef.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(documentRef.documentElement.getAttribute('data-density')).toBe('comfortable');
  });
});
