import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TRATA_403_LOCALMENTE } from '../interceptors/forbidden.interceptor';
import { OrigemPontosDor, PontoDor, PontoDorDTO, PontosDorRegistroDTO } from '../models/ponto-dor';

/** Recurso da API de cada origem: os pontos pendem da avaliação ou da reavaliação. */
const RECURSO: Record<OrigemPontosDor, string> = {
  AVALIACAO: '/api/avaliacoes-fisioterapeuticas',
  REAVALIACAO: '/api/reavaliacoes'
};

/**
 * Pontos do mapa corporal de dor (issue #307). O `403` (papel não clínico) é
 * tratado pela tela, com o `detail` da API: o mapa é uma seção do formulário e
 * não deve levar a página inteira para `/403`.
 */
@Injectable({
  providedIn: 'root'
})
export class PontoDorService {
  constructor(private http: HttpClient) {}

  listar(origem: OrigemPontosDor, registroId: number): Observable<PontoDorDTO[]> {
    return this.http.get<PontoDorDTO[]>(`${RECURSO[origem]}/${registroId}/pontos-dor`, { context: contexto() });
  }

  /** Substitui o conjunto de pontos do registro (lista vazia apaga todos); devolve a lista gravada. */
  salvar(origem: OrigemPontosDor, registroId: number, pontos: readonly PontoDor[]): Observable<PontoDorDTO[]> {
    const corpo = {
      pontos: pontos.map(({ vista, x, y, desenhoVersao, intensidade, observacao }) => ({
        vista, x, y, desenhoVersao, intensidade, observacao: observacao?.trim() || null
      }))
    };
    return this.http.put<PontoDorDTO[]>(`${RECURSO[origem]}/${registroId}/pontos-dor`, corpo, { context: contexto() });
  }

  /** Pontos de todas as avaliações e reavaliações do paciente que têm pontos, do mais antigo ao mais recente. */
  historicoDoPaciente(pacienteId: number): Observable<PontosDorRegistroDTO[]> {
    return this.http.get<PontosDorRegistroDTO[]>(`/api/pacientes/${pacienteId}/pontos-dor`, { context: contexto() });
  }
}

function contexto(): HttpContext {
  return new HttpContext().set(TRATA_403_LOCALMENTE, true);
}
