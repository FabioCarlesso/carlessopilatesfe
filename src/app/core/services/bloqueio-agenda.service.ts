import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BloqueioAgendaRequestDTO, BloqueioAgendaResponseDTO } from '../models/bloqueio-agenda';

/**
 * Bloqueios de agenda (issue #135). A **leitura** é aberta a qualquer usuário
 * autenticado — é ela que alimenta o aviso de feriado na agenda e no formulário
 * de sessão, usados pela recepção —, enquanto cadastro, edição e exclusão
 * exigem `ADMIN` no backend, o mesmo perfil da tela `/admin/bloqueios`.
 */
@Injectable({ providedIn: 'root' })
export class BloqueioAgendaService {
  private readonly apiUrl = '/api/bloqueios';

  constructor(private http: HttpClient) {}

  /**
   * Bloqueios que **intersectam** o período, inclusive os que começam antes de
   * `inicio` ou terminam depois de `fim`. As duas pontas são obrigatórias, em
   * `yyyy-MM-dd`, e a API limita o período a 366 dias.
   */
  listarPorPeriodo(inicio: string, fim: string): Observable<BloqueioAgendaResponseDTO[]> {
    const params = new HttpParams().set('inicio', inicio).set('fim', fim);
    return this.http.get<BloqueioAgendaResponseDTO[]>(this.apiUrl, { params });
  }

  buscar(id: number): Observable<BloqueioAgendaResponseDTO> {
    return this.http.get<BloqueioAgendaResponseDTO>(`${this.apiUrl}/${id}`);
  }

  criar(dto: BloqueioAgendaRequestDTO): Observable<BloqueioAgendaResponseDTO> {
    return this.http.post<BloqueioAgendaResponseDTO>(this.apiUrl, dto);
  }

  atualizar(id: number, dto: BloqueioAgendaRequestDTO): Observable<BloqueioAgendaResponseDTO> {
    return this.http.put<BloqueioAgendaResponseDTO>(`${this.apiUrl}/${id}`, dto);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
