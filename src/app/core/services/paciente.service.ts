import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TRATA_403_LOCALMENTE } from '../interceptors/forbidden.interceptor';
import {
  Page,
  PacienteRequestDTO,
  PacienteResponseDTO,
  PacienteUpdateDTO
} from '../models/paciente';

export interface PacienteFiltro {
  nome?: string;
  email?: string;
  cpf?: string;
  telefone?: string;
  ativo?: boolean;
  /** Só os pacientes com esse fisioterapeuta padrão (issue #300). */
  profissionalId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PacienteService {
  private readonly apiUrl = '/api/pacientes';

  constructor(private http: HttpClient) {}

  listar(page = 0, size = 10, filtro: PacienteFiltro = {}, sort = 'nome'): Observable<Page<PacienteResponseDTO>> {
    let params = new HttpParams().set('page', page).set('size', size).set('sort', sort);

    Object.entries(filtro).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<Page<PacienteResponseDTO>>(this.apiUrl, { params });
  }

  buscar(id: number): Observable<PacienteResponseDTO> {
    return this.http.get<PacienteResponseDTO>(`${this.apiUrl}/${id}`);
  }

  cadastrar(dto: PacienteRequestDTO): Observable<PacienteResponseDTO> {
    return this.http.post<PacienteResponseDTO>(this.apiUrl, dto);
  }

  atualizar(id: number, dto: PacienteUpdateDTO): Observable<PacienteResponseDTO> {
    return this.http.put<PacienteResponseDTO>(`${this.apiUrl}/${id}`, dto);
  }

  ativar(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/ativar`, {});
  }

  /** Vincula (`tomadorId`) ou desvincula (`null`) o tomador da nota fiscal. */
  vincularTomador(id: number, tomadorId: number | null): Observable<PacienteResponseDTO> {
    return this.http.patch<PacienteResponseDTO>(`${this.apiUrl}/${id}/tomador`, { tomadorId });
  }

  /**
   * Define (`profissionalId`) ou remove (`null`) o fisioterapeuta padrão
   * (issue #300). O campo vai sempre no corpo: é o `null` explícito que remove.
   */
  definirProfissionalPadrao(id: number, profissionalId: number | null): Observable<PacienteResponseDTO> {
    return this.http.patch<PacienteResponseDTO>(`${this.apiUrl}/${id}/profissional-padrao`, { profissionalId });
  }

  inativar(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/inativar`, {});
  }

  /**
   * Prontuário em PDF (carlessopilatesapi#250), só para os papéis clínicos.
   * `inicio` e `fim` são opcionais e independentes: o lado vazio não vai na URL,
   * e sem nenhum dos dois a API exporta o prontuário completo. O `403` é tratado
   * pela tela, que mostra a mensagem em vez de levar a `/403`.
   */
  exportarProntuarioPdf(id: number, periodo: { inicio?: string | null; fim?: string | null } = {}): Observable<HttpResponse<Blob>> {
    let params = new HttpParams();
    if (periodo.inicio) params = params.set('inicio', periodo.inicio);
    if (periodo.fim) params = params.set('fim', periodo.fim);

    return this.http.get(`${this.apiUrl}/${id}/prontuario/pdf`, {
      params,
      context: new HttpContext().set(TRATA_403_LOCALMENTE, true),
      observe: 'response',
      responseType: 'blob'
    });
  }
}
