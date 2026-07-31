import { FetchBackend, HttpBackend, HttpXhrBackend } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { appConfig } from './app.config';

/**
 * Guarda do transporte HTTP (issue #208).
 *
 * O Angular 22 tornou o `FetchBackend` o transporte padrão, e a migração optou
 * por congelar o XHR com `withXhr()` para que a troca de major não mudasse
 * também o transporte. Sem este guard a decisão fica sem rede: removendo o
 * `withXhr()` de `app.config.ts` a suíte inteira continua verde, e a aplicação
 * troca de transporte em silêncio.
 *
 * Os `withXhr()` dos specs de interceptor não servem para isso — eles usam
 * `provideHttpClientTesting()`, que substitui o backend, então lá a chamada é
 * no-op. Por isso este teste monta os providers reais de `appConfig`.
 */
describe('appConfig — transporte HTTP', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...appConfig.providers] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('resolve o HttpBackend para HttpXhrBackend', () => {
    expect(TestBed.inject(HttpBackend)).toBeInstanceOf(HttpXhrBackend);
  });

  it('não usa o FetchBackend, que é o padrão do v22', () => {
    expect(TestBed.inject(HttpBackend)).not.toBeInstanceOf(FetchBackend);
  });
});
