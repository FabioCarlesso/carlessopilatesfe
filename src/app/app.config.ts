import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { forbiddenInterceptor } from './core/interceptors/forbidden.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    // `anchorScrolling` porque a landing usa âncora de página (#como-funciona):
    // o componente é lazy, então no carregamento direto de `/#como-funciona` o
    // alvo ainda não existe quando o navegador tenta rolar, e sem isso o Angular
    // não repete a tentativa depois de ativar a rota (issue #244).
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled' })),
    provideHttpClient(withXhr(), withInterceptors([authInterceptor, forbiddenInterceptor]))
  ]
};
