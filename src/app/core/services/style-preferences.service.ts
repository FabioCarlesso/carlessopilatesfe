import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

export type StyleTheme = 'light' | 'dark';
export type StyleDensity = 'default' | 'compact' | 'comfortable';

export interface StylePreferences {
  theme: StyleTheme;
  density: StyleDensity;
}

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
    this.apply(this.preferences);
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

  apply(preferences: StylePreferences): void {
    this.preferences = { ...preferences };
    const root = this.document.documentElement;
    root.setAttribute('data-theme', this.preferences.theme);
    root.setAttribute('data-density', this.preferences.density);
  }
}
