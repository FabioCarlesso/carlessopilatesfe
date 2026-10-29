import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TRATA_403_LOCALMENTE } from '../interceptors/forbidden.interceptor';
import {
  DisponibilidadeProfissionalRequestDTO,
  DisponibilidadeProfissionalResponseDTO,
  VerificacaoDisponibilidadeDTO
} from '../models/disponibilidade-profissional';

/**
 * Disponibilidade semanal dos profissionais (issue #134, carlessopilatesapi#216).
 *
 * A leitura é liberada para toda a equipe na API; cadastro, edição e exclusão
 * exigem `ADMIN`, o mesmo recorte de `/profissionais`.
 */
@Injectable({ providedIn: 'root' })
export class DisponibilidadeProfissionalService {
  private readonly apiUrl = '/api';

  constructor(private http: HttpClient) {}

  /** Faixas do profissional, ordenadas pela API de segunda a domingo e por `horaInicio`. */
  listar(profissionalId: number): Observable<DisponibilidadeProfissionalResponseDTO[]> {
    return this.http.get<DisponibilidadeProfissionalResponseDTO[]>(
      `${this.apiUrl}/profissionais/${profissionalId}/disponibilidades`
    );
  }

  criar(
    profissionalId: number,
    dto: DisponibilidadeProfissionalRequestDTO
  ): Observable<DisponibilidadeProfissionalResponseDTO> {
    return this.http.post<DisponibilidadeProfissionalResponseDTO>(
      `${this.apiUrl}/profissionais/${profissionalId}/disponibilidades`,
      dto
    );
  }

  atualizar(id: number, dto: DisponibilidadeProfissionalRequestDTO): Observable<DisponibilidadeProfissionalResponseDTO> {
    return this.http.put<DisponibilidadeProfissionalResponseDTO>(`${this.apiUrl}/disponibilidades/${id}`, dto);
  }

  /** Exclusão física: a faixa é configuração, não histórico. */
  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/disponibilidades/${id}`);
  }

  /**
   * Se o profissional atende em `data` (`yyyy-MM-dd`) às `horario` (`HH:mm`).
   *
   * Sai marcada para o `forbiddenInterceptor` não agir sozinho: quem consome é
   * o aviso do formulário de sessão, que absorve a falha de propósito — um `403`
   * aqui não pode tirar a recepção da tela no meio de um agendamento.
   */
  verificar(profissionalId: number, data: string, horario: string): Observable<VerificacaoDisponibilidadeDTO> {
    const params = new HttpParams().set('data', data).set('horario', horario);
    return this.http.get<VerificacaoDisponibilidadeDTO>(
      `${this.apiUrl}/profissionais/${profissionalId}/disponibilidades/verificar`,
      { params, context: new HttpContext().set(TRATA_403_LOCALMENTE, true) }
    );
  }
}
