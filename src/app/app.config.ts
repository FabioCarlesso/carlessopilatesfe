import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
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
    provideHttpClient(withXhr(), withInterceptors([authInterceptor, forbiddenInterceptor])),
    // Fonte única do locale dos pipes (`currency`, `date`, `number`, `percent`).
    // Os dados de `pt` são registrados no `main.ts`, e o Angular resolve `pt-BR`
    // para eles. Sem este provider o padrão é `en-US`, e todo `currency:'BRL'`
    // saía como `R$250.00` (issue #254).
    { provide: LOCALE_ID, useValue: 'pt-BR' }
  ]
};
