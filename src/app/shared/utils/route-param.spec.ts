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
});
