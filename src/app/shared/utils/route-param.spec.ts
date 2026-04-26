import { convertToParamMap } from '@angular/router';
import { parseRouteNumberParam } from './route-param';

describe('parseRouteNumberParam', () => {
  it('should parse numeric route params', () => {
    const paramMap = convertToParamMap({ pacienteId: '10' });

    expect(parseRouteNumberParam(paramMap, 'pacienteId')).toBe(10);
  });

  it('should return null when route param is missing', () => {
    const paramMap = convertToParamMap({});

    expect(parseRouteNumberParam(paramMap, 'pacienteId')).toBeNull();
  });

  it('should return null when route param is not numeric', () => {
    const paramMap = convertToParamMap({ pacienteId: 'abc' });

    expect(parseRouteNumberParam(paramMap, 'pacienteId')).toBeNull();
  });

  it('should return null for non-positive, decimal or non-finite values', () => {
    ['0', '-1', '1.5', '1e2', 'Infinity', ' ', '0x10'].forEach(value => {
      const paramMap = convertToParamMap({ pacienteId: value });

      expect(parseRouteNumberParam(paramMap, 'pacienteId')).toBeNull();
    });
  });

  it('should return null when route param is outside safe integer range', () => {
    const paramMap = convertToParamMap({ pacienteId: '9007199254740992' });

    expect(parseRouteNumberParam(paramMap, 'pacienteId')).toBeNull();
  });
});
