import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TRATA_403_LOCALMENTE } from '../interceptors/forbidden.interceptor';
import { BloqueioAgendaRequestDTO, BloqueioAgendaResponseDTO } from '../models/bloqueio-agenda';

/**
 * As **leituras** saem marcadas para o `forbiddenInterceptor` não agir sozinho.
 * Ele manda todo `GET` com `403` para `/403`, e isso acontece **antes** do
 * `catchError` de quem chamou: a agenda e o formulário de sessão absorvem a
 * falha dos bloqueios de propósito, mas sem esta marca o redirecionamento
 * global tiraria o usuário da tela mesmo assim — a grade carregaria e seria
 * descartada. Hoje a API abre a leitura a qualquer autenticado; a marca existe
 * para que restringi-la depois vire "sem aviso de feriado", e não "recepção
 * expulsa da agenda".
 */
const LEITURA_TRATADA_LOCALMENTE = () => new HttpContext().set(TRATA_403_LOCALMENTE, true);

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
    return this.http.get<BloqueioAgendaResponseDTO[]>(this.apiUrl, {
      params,
      context: LEITURA_TRATADA_LOCALMENTE()
    });
  }

  buscar(id: number): Observable<BloqueioAgendaResponseDTO> {
    return this.http.get<BloqueioAgendaResponseDTO>(`${this.apiUrl}/${id}`, {
      context: LEITURA_TRATADA_LOCALMENTE()
    });
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
