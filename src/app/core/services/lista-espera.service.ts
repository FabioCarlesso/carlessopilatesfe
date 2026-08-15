import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TRATA_403_LOCALMENTE } from '../interceptors/forbidden.interceptor';
import {
  ListaEsperaFiltro,
  ListaEsperaRequestDTO,
  ListaEsperaResponseDTO
} from '../models/lista-espera';

/**
 * A **leitura** sai marcada para o `forbiddenInterceptor` não agir sozinho.
 * Ele manda todo `GET` com `403` para `/403`, e isso acontece **antes** do
 * `catchError` de quem chamou: a agenda e a listagem de sessões absorvem a
 * falha da consulta de interessados de propósito, mas sem esta marca o
 * redirecionamento global tiraria o usuário da tela no meio de um
 * cancelamento. Hoje a API abre a lista de espera a qualquer autenticado; a
 * marca existe para que restringi-la depois vire "sem aviso de fila", e não
 * "recepção expulsa da agenda".
 */
const LEITURA_TRATADA_LOCALMENTE = () => new HttpContext().set(TRATA_403_LOCALMENTE, true);

/**
 * Lista de espera por horário (issue #137). Todo o recurso é aberto a qualquer
 * usuário autenticado no backend: é a recepção que inscreve, consulta e retira
 * da fila.
 */
@Injectable({ providedIn: 'root' })
export class ListaEsperaService {
  private readonly apiUrl = '/api/lista-espera';

  constructor(private http: HttpClient) {}

  /**
   * Fila **ativa**, sempre em ordem de chegada (`dataEntrada` crescente) — a
   * ordenação é do servidor, e a tela não reordena.
   *
   * A faixa casa por **interseção**: uma busca por 08:00–09:00 encontra quem se
   * inscreveu para 07:30–09:30. `horaInicio` e `horaFim` só valem juntas, e
   * mandar apenas uma volta `400`; por isso o par é enviado só quando as duas
   * chegam preenchidas.
   */
  listar(filtro: ListaEsperaFiltro = {}): Observable<ListaEsperaResponseDTO[]> {
    let params = new HttpParams();
    if (filtro.diaSemana) params = params.set('diaSemana', filtro.diaSemana);
    if (filtro.horaInicio && filtro.horaFim) {
      params = params.set('horaInicio', filtro.horaInicio).set('horaFim', filtro.horaFim);
    }
    if (filtro.pacienteId != null) params = params.set('pacienteId', filtro.pacienteId);

    return this.http.get<ListaEsperaResponseDTO[]>(this.apiUrl, {
      params,
      context: LEITURA_TRATADA_LOCALMENTE()
    });
  }

  criar(dto: ListaEsperaRequestDTO): Observable<ListaEsperaResponseDTO> {
    return this.http.post<ListaEsperaResponseDTO>(this.apiUrl, dto);
  }

  /**
   * Tira a entrada da fila. A remoção é **lógica** no backend: a entrada some
   * da listagem, mas o registro de quem esperou é preservado para histórico.
   */
  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
