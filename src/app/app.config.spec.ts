import { CurrencyPipe, DatePipe, registerLocaleData } from '@angular/common';
import { FetchBackend, HttpBackend, HttpXhrBackend } from '@angular/common/http';
import localePt from '@angular/common/locales/pt';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { normalizarEspacos } from '../testing/locale';
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

/**
 * Guarda do locale da aplicação (issue #254).
 *
 * Os specs de componente montam o próprio TestBed e não passam por `appConfig`,
 * então remover o `LOCALE_ID` dali não quebraria nenhum deles: a aplicação
 * voltaria a mostrar `R$250.00` com a suíte verde. Este teste usa os providers
 * reais e registra os dados de `pt` como faz o `main.ts`.
 */
describe('appConfig — locale', () => {
  beforeEach(() => {
    registerLocaleData(localePt);
    TestBed.configureTestingModule({ providers: [...appConfig.providers, CurrencyPipe, DatePipe] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('define o LOCALE_ID como pt-BR', () => {
    expect(TestBed.inject(LOCALE_ID)).toBe('pt-BR');
  });

  it('formata moeda no padrão brasileiro, com vírgula decimal e ponto de milhar', () => {
    const currency = TestBed.inject(CurrencyPipe);

    expect(normalizarEspacos(currency.transform(250, 'BRL'))).toBe('R$ 250,00');
    expect(normalizarEspacos(currency.transform(1250, 'BRL'))).toBe('R$ 1.250,00');
  });

  it('mantém as datas de formato fixo e traduz os nomes de dia da semana', () => {
    const date = TestBed.inject(DatePipe);

    expect(date.transform('2026-05-05T14:30:00', 'dd/MM/yyyy HH:mm')).toBe('05/05/2026 14:30');
    expect(date.transform('2026-05-05T00:00:00', 'dd/MM/yyyy (EEE)')).toBe('05/05/2026 (ter.)');
  });
});
