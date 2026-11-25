import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TRATA_403_LOCALMENTE } from '../interceptors/forbidden.interceptor';
import {
  RelatorioFinanceiroDTO,
  RelatorioFinanceiroFormatoExportacao,
  RelatorioNfseFiltros,
  RelatorioNfseFormatoExportacao,
  RelatorioNfseResponseDTO
} from '../models/relatorio';
import {
  RelatorioPacientesDTO,
  RelatorioPacientesFiltros,
  RelatorioPacientesFormatoExportacao
} from '../models/relatorio-pacientes';
import {
  RelatorioRecebimentosDTO,
  RelatorioRecebimentosFiltros,
  RelatorioRecebimentosFormatoExportacao
} from '../models/relatorio-recebimentos';

@Injectable({
  providedIn: 'root'
})
export class RelatorioService {
  private readonly nfseUrl = '/api/api/relatorios/nfse';
  private readonly financeiroUrl = '/api/api/relatorios/financeiro';
  private readonly pacientesUrl = '/api/api/relatorios/pacientes';
  private readonly recebimentosUrl = '/api/api/relatorios/recebimentos';

  constructor(private http: HttpClient) {}

  relatorioNfse(
    competencia: string,
    filtros: RelatorioNfseFiltros = {}
  ): Observable<RelatorioNfseResponseDTO[]> {
    return this.http.get<RelatorioNfseResponseDTO[]>(this.nfseUrl, {
      params: this.nfseParams(competencia, filtros)
    });
  }

  exportarRelatorioNfse(
    competencia: string,
    formato: RelatorioNfseFormatoExportacao,
    filtros: RelatorioNfseFiltros = {}
  ): Observable<HttpResponse<Blob>> {
    return this.http.get(this.nfseUrl, {
      params: this.nfseParams(competencia, filtros).set('formato', formato),
      observe: 'response',
      responseType: 'blob'
    });
  }

  /**
   * Relatório financeiro consolidado (carlessopilatesapi#108). O `403` é tratado
   * pela tela, que mostra a mensagem no lugar de redirecionar para `/403`.
   */
  relatorioFinanceiro(inicio: string, fim: string): Observable<RelatorioFinanceiroDTO> {
    return this.http.get<RelatorioFinanceiroDTO>(this.financeiroUrl, {
      params: new HttpParams().set('inicio', inicio).set('fim', fim),
      context: new HttpContext().set(TRATA_403_LOCALMENTE, true)
    });
  }

  /** Diferente do relatório de NFSE, a API exporta por rota (`/pdf`, `/xlsx`), não por `?formato=`. */
  exportarRelatorioFinanceiro(
    inicio: string,
    fim: string,
    formato: RelatorioFinanceiroFormatoExportacao
  ): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.financeiroUrl}/${formato}`, {
      params: new HttpParams().set('inicio', inicio).set('fim', fim),
      context: new HttpContext().set(TRATA_403_LOCALMENTE, true),
      observe: 'response',
      responseType: 'blob'
    });
  }

  /**
   * Relatório de pacientes (carlessopilatesapi#230), para `ADMIN` e `RECEPCAO`.
   * Como o financeiro, exporta por rota (`/pdf`, `/xlsx`) e a tela trata o `403`.
   */
  relatorioPacientes(filtros: RelatorioPacientesFiltros = {}): Observable<RelatorioPacientesDTO> {
    return this.http.get<RelatorioPacientesDTO>(this.pacientesUrl, {
      params: this.pacientesParams(filtros),
      context: new HttpContext().set(TRATA_403_LOCALMENTE, true)
    });
  }

  exportarRelatorioPacientes(
    formato: RelatorioPacientesFormatoExportacao,
    filtros: RelatorioPacientesFiltros = {}
  ): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.pacientesUrl}/${formato}`, {
      params: this.pacientesParams(filtros),
      context: new HttpContext().set(TRATA_403_LOCALMENTE, true),
      observe: 'response',
      responseType: 'blob'
    });
  }

  /** `semPlanoAtivo` e `cadastroIncompleto` só vão quando `true`: na API, `false` não filtra. */
  private pacientesParams(filtros: RelatorioPacientesFiltros): HttpParams {
    let params = new HttpParams();

    if (filtros.situacao) {
      params = params.set('situacao', filtros.situacao);
    }
    if (filtros.semPlanoAtivo) {
      params = params.set('semPlanoAtivo', 'true');
    }
    if (filtros.cadastroIncompleto) {
      params = params.set('cadastroIncompleto', 'true');
    }
    if (filtros.mesNascimento !== null && filtros.mesNascimento !== undefined) {
      params = params.set('mesNascimento', String(filtros.mesNascimento));
    }
    if (filtros.profissionalId !== null && filtros.profissionalId !== undefined) {
      params = params.set('profissionalId', String(filtros.profissionalId));
    }

    return params;
  }

  private nfseParams(competencia: string, filtros: RelatorioNfseFiltros): HttpParams {
    let params = new HttpParams().set('competencia', competencia);

    if (filtros.notaAnteriorEmitida !== null && filtros.notaAnteriorEmitida !== undefined) {
      params = params.set('notaAnteriorEmitida', String(filtros.notaAnteriorEmitida));
    }
    if (filtros.cpfNaNota !== null && filtros.cpfNaNota !== undefined) {
      params = params.set('cpfNaNota', String(filtros.cpfNaNota));
    }
    if (filtros.tomadorId !== null && filtros.tomadorId !== undefined) {
      params = params.set('tomadorId', String(filtros.tomadorId));
    }

    return params;
  }

  // --- Recebimentos do período (carlessopilatesapi#231) ---

  /** Pagamentos confirmados no período, por data de pagamento. O `403` é tratado pela tela. */
  relatorioRecebimentos(
    inicio: string,
    fim: string,
    filtros: RelatorioRecebimentosFiltros = {}
  ): Observable<RelatorioRecebimentosDTO> {
    return this.http.get<RelatorioRecebimentosDTO>(this.recebimentosUrl, {
      params: this.recebimentosParams(inicio, fim, filtros),
      context: new HttpContext().set(TRATA_403_LOCALMENTE, true)
    });
  }

  /** Como no financeiro, a exportação é por rota (`/pdf`, `/xlsx`). */
  exportarRelatorioRecebimentos(
    inicio: string,
    fim: string,
    formato: RelatorioRecebimentosFormatoExportacao,
    filtros: RelatorioRecebimentosFiltros = {}
  ): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.recebimentosUrl}/${formato}`, {
      params: this.recebimentosParams(inicio, fim, filtros),
      context: new HttpContext().set(TRATA_403_LOCALMENTE, true),
      observe: 'response',
      responseType: 'blob'
    });
  }

  private recebimentosParams(inicio: string, fim: string, filtros: RelatorioRecebimentosFiltros): HttpParams {
    let params = new HttpParams().set('inicio', inicio).set('fim', fim);
    if (filtros.formaPagamento) {
      params = params.set('formaPagamento', filtros.formaPagamento);
    }
    if (filtros.pacienteId !== null && filtros.pacienteId !== undefined) {
      params = params.set('pacienteId', String(filtros.pacienteId));
    }
    return params;
  }

  // --- fim: recebimentos ---
}
