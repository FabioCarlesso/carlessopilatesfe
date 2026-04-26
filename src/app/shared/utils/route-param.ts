import { ParamMap } from '@angular/router';

export function parseRouteNumberParam(paramMap: ParamMap, name: string): number | null {
  const raw = paramMap.get(name);
  if (raw === null) return null;

  const value = Number(raw);
  return Number.isNaN(value) ? null : value;
}
