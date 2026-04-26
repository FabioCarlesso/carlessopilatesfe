import { ParamMap } from '@angular/router';

export function parseRouteNumberParam(paramMap: ParamMap, name: string): number | null {
  const raw = paramMap.get(name);
  if (raw === null) return null;
  if (!/^[1-9]\d*$/.test(raw)) return null;

  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}
