import { Inject, Injectable, DOCUMENT } from '@angular/core';

export type StyleTheme = 'light' | 'dark';
export type StyleDensity = 'default' | 'compact' | 'comfortable';

export interface StylePreferences {
  theme: StyleTheme;
  density: StyleDensity;
}

const STORAGE_KEY = 'carlesso.style-preferences';

const DEFAULT_PREFERENCES: StylePreferences = {
  theme: 'light',
  density: 'default'
};

@Injectable({
  providedIn: 'root'
})
export class StylePreferencesService {
  private preferences: StylePreferences = { ...DEFAULT_PREFERENCES };

  constructor(@Inject(DOCUMENT) private readonly document: Document) {
    this.preferences = this.resolveInitialPreferences();
    this.applyToDom();
  }

  get current(): StylePreferences {
    return { ...this.preferences };
  }

  setTheme(theme: StyleTheme): void {
    this.apply({ ...this.preferences, theme });
  }

  setDensity(density: StyleDensity): void {
    this.apply({ ...this.preferences, density });
  }

  toggleTheme(): StyleTheme {
    const theme: StyleTheme = this.preferences.theme === 'dark' ? 'light' : 'dark';
    this.setTheme(theme);
    return theme;
  }

  apply(preferences: StylePreferences): void {
    this.preferences = { ...preferences };
    this.applyToDom();
    this.persist(this.preferences);
  }

  private applyToDom(): void {
    const root = this.document.documentElement;
    root.setAttribute('data-theme', this.preferences.theme);
    root.setAttribute('data-density', this.preferences.density);
  }

  private resolveInitialPreferences(): StylePreferences {
    const stored = this.readStoredPreferences();
    if (stored) {
      return stored;
    }
    return {
      ...DEFAULT_PREFERENCES,
      theme: this.prefersDarkScheme() ? 'dark' : 'light'
    };
  }

  private readStoredPreferences(): StylePreferences | null {
    const storage = this.getLocalStorage();
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<StylePreferences>;
      const theme = parsed.theme === 'light' || parsed.theme === 'dark' ? parsed.theme : null;
      const density =
        parsed.density === 'default' || parsed.density === 'compact' || parsed.density === 'comfortable'
          ? parsed.density
          : null;
      if (!theme && !density) {
        return null;
      }
      return {
        theme: theme ?? (this.prefersDarkScheme() ? 'dark' : 'light'),
        density: density ?? DEFAULT_PREFERENCES.density
      };
    } catch {
      return null;
    }
  }

  private persist(preferences: StylePreferences): void {
    const storage = this.getLocalStorage();
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // localStorage indisponível (modo privado/quota) — a preferência permanece apenas em memória
    }
  }

  private prefersDarkScheme(): boolean {
    const view = this.document.defaultView;
    return !!view?.matchMedia?.('(prefers-color-scheme: dark)').matches;
  }

  private getLocalStorage(): Storage | null {
    try {
      return this.document.defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  }
}
