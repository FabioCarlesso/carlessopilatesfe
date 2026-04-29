import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardResumoDTO } from '../models/dashboard';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly apiUrl = '/api/dashboard/resumo';

  constructor(private http: HttpClient) {}

  resumo(): Observable<DashboardResumoDTO> {
    return this.http.get<DashboardResumoDTO>(this.apiUrl);
  }
}
