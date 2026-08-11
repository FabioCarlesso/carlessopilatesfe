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
  listarPorPeriodo(inicio: string, fim: string, profissionalId?: number | null): Observable<AulaResponseDTO[]> {
    let params = new HttpParams().set('inicio', inicio).set('fim', fim);
    // `null` é tratado como ausente, e não serializado: o `profissionalId` que
    // circula na tela vem de `CalendarioEvento`, onde é `number | null`, e
    // `?profissionalId=null` viraria 400 no binding do `Long` do backend em vez
    // de cair na listagem sem filtro. Mesma guarda de `ProfissionalService.listar`.
    if (profissionalId !== undefined && profissionalId !== null) {
      params = params.set('profissionalId', profissionalId);
    }
    return this.http.get<AulaResponseDTO[]>(`${this.apiUrl}/aulas`, { params });
  }

  listarPorPagamento(pagamentoId: number): Observable<AulaResponseDTO[]> {
    return this.http.get<AulaResponseDTO[]>(`${this.apiUrl}/aulas/pagamento/${pagamentoId}`);
  }

  realizar(aulaId: number, profissionalId: number): Observable<AulaResponseDTO> {
    const params = new HttpParams().set('profissionalId', profissionalId);
    return this.http.patch<AulaResponseDTO>(`${this.apiUrl}/aulas/${aulaId}/realizar`, {}, { params });
  }

  /**
   * Troca a data de uma aula ainda não realizada (issue #131). A data vai em
   * `yyyy-MM-dd` e **pode estar no passado**: a API aceita de propósito, para que
   * a recepção registre reposições já ocorridas.
   *
   * O corpo leva só `data`. O contrato tem um `horario` reservado para a #106 da
   * API, mas enquanto a entidade não tiver o campo qualquer valor enviado ali
   * volta como `400` — por isso ele não é sequer serializado aqui.
   */
  remarcar(aulaId: number, data: string): Observable<AulaResponseDTO> {
    return this.http.patch<AulaResponseDTO>(`${this.apiUrl}/aulas/${aulaId}/remarcar`, { data });
  }
}
