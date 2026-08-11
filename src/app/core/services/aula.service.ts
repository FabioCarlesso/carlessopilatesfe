import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AulaResponseDTO } from '../models/plano';

@Injectable({ providedIn: 'root' })
export class AulaService {
  private readonly apiUrl = '/api';

  constructor(private http: HttpClient) {}

  listarPorPaciente(pacienteId: number): Observable<AulaResponseDTO[]> {
    return this.http.get<AulaResponseDTO[]>(`${this.apiUrl}/aulas/paciente/${pacienteId}`);
  }

  /**
   * Aulas do período, para a agenda do estúdio (issue #125) e para a agenda de
   * um profissional (issue #126). As datas vão em `yyyy-MM-dd`; a API exige as
   * duas pontas, limita o período a 92 dias e a resposta a 5000 registros —
   * folga larga para as visões semanal e diária da agenda.
   *
   * Sem `profissionalId` vêm as aulas de todos os pacientes; com ele o recorte é
   * **do servidor**, e não do cliente: a agenda de um profissional não tem por
   * que baixar o estúdio inteiro para descartar quase tudo.
   */
  listarPorPeriodo(inicio: string, fim: string, profissionalId?: number): Observable<AulaResponseDTO[]> {
    let params = new HttpParams().set('inicio', inicio).set('fim', fim);
    if (profissionalId !== undefined) params = params.set('profissionalId', profissionalId);
    return this.http.get<AulaResponseDTO[]>(`${this.apiUrl}/aulas`, { params });
  }

  listarPorPagamento(pagamentoId: number): Observable<AulaResponseDTO[]> {
    return this.http.get<AulaResponseDTO[]>(`${this.apiUrl}/aulas/pagamento/${pagamentoId}`);
  }

  realizar(aulaId: number, profissionalId: number): Observable<AulaResponseDTO> {
    const params = new HttpParams().set('profissionalId', profissionalId);
    return this.http.patch<AulaResponseDTO>(`${this.apiUrl}/aulas/${aulaId}/realizar`, {}, { params });
  }
}
