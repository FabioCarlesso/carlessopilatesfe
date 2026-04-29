import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { StylePreferencesService } from './core/services/style-preferences.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  constructor(
    public authService: AuthService,
    private readonly stylePreferences: StylePreferencesService
  ) {}

  sair(): void {
    this.authService.logout();
  }
}
