import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AulaResponseDTO } from '../models/plano';

@Injectable({ providedIn: 'root' })
export class AulaService {
  private readonly apiUrl = '/api';

  constructor(private http: HttpClient) {}

  listar(pacienteId: number): Observable<AulaResponseDTO[]> {
    return this.http.get<AulaResponseDTO[]>(`${this.apiUrl}/pacientes/${pacienteId}/aulas`);
  }

  confirmar(aulaId: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/aulas/${aulaId}/confirmar`, {});
  }
}
