import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AulasPorProfissionalDTO, DashboardIndicadoresDTO, DashboardResumoDTO } from '../models/dashboard';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly apiUrl = '/api/dashboard';

  constructor(private http: HttpClient) {}

  resumo(): Observable<DashboardResumoDTO> {
    return this.http.get<DashboardResumoDTO>(`${this.apiUrl}/resumo`);
  }

  /** Séries dos últimos `meses` meses, terminando no atual. A API aceita de 1 a 24. */
  indicadores(meses: number): Observable<DashboardIndicadoresDTO> {
    const params = new HttpParams().set('meses', String(meses));
    return this.http.get<DashboardIndicadoresDTO>(`${this.apiUrl}/indicadores`, { params });
  }

  /** Ranking do período, com datas `AAAA-MM-DD` inclusivas (até 366 dias). */
  aulasPorProfissional(inicio: string, fim: string): Observable<AulasPorProfissionalDTO[]> {
    const params = new HttpParams().set('inicio', inicio).set('fim', fim);
    return this.http.get<AulasPorProfissionalDTO[]>(`${this.apiUrl}/aulas-por-profissional`, { params });
  }
}
