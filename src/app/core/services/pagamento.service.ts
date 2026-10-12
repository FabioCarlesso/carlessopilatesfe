import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Page } from '../models/common';
import {
  ContatoCobrancaDTO,
  ContatoCobrancaRequestDTO,
  PagamentoFiltro
} from '../models/inadimplencia';
import { PagamentoRequestDTO, PagamentoResponseDTO } from '../models/plano';

@Injectable({ providedIn: 'root' })
export class PagamentoService {
  private readonly apiUrl = '/api';

  constructor(private http: HttpClient) {}

  listar(pacienteId: number): Observable<PagamentoResponseDTO[]> {
    return this.http.get<PagamentoResponseDTO[]>(`${this.apiUrl}/pagamentos/paciente/${pacienteId}`);
  }

  buscar(pagamentoId: number): Observable<PagamentoResponseDTO> {
    return this.http.get<PagamentoResponseDTO>(`${this.apiUrl}/pagamentos/${pagamentoId}`);
  }

  criar(dto: PagamentoRequestDTO): Observable<PagamentoResponseDTO> {
    return this.http.post<PagamentoResponseDTO>(`${this.apiUrl}/pagamentos`, dto);
  }

  pagar(pagamentoId: number, dataPagamento: string): Observable<PagamentoResponseDTO> {
    return this.http.patch<PagamentoResponseDTO>(
      `${this.apiUrl}/pagamentos/${pagamentoId}/pagar`,
      {},
      { params: { dataPagamento } }
    );
  }

  /**
   * Listagem global paginada (issue #127, só `ADMIN`). Os filtros vazios ficam
   * fora da query: sem `status` a API devolve todos os status, e o `400` de
   * faixa invertida é evitado pela tela antes de chegar aqui. `status` vai
   * repetido, um parâmetro por valor, como o `@RequestParam List` espera.
   *
   * `sort` segue o `Pageable` do Spring (`campo,direcao`); a API aceita
   * `dataVencimento`, `valor`, `status` e `paciente.nome`.
   */
  listarTodos(
    filtro: PagamentoFiltro = {},
    page = 0,
    size = 10,
    sort = 'dataVencimento,asc'
  ): Observable<Page<PagamentoResponseDTO>> {
    let params = new HttpParams().set('page', page).set('size', size).set('sort', sort);
    for (const status of filtro.status ?? []) {
      params = params.append('status', status);
    }
    if (filtro.vencimentoDe) params = params.set('vencimentoDe', filtro.vencimentoDe);
    if (filtro.vencimentoAte) params = params.set('vencimentoAte', filtro.vencimentoAte);
    if (filtro.pacienteId != null) params = params.set('pacienteId', filtro.pacienteId);

    return this.http.get<Page<PagamentoResponseDTO>>(`${this.apiUrl}/pagamentos`, { params });
  }

  /** Contatos de cobrança do pagamento, do mais recente para o mais antigo. */
  listarCobrancas(pagamentoId: number): Observable<ContatoCobrancaDTO[]> {
    return this.http.get<ContatoCobrancaDTO[]>(`${this.apiUrl}/pagamentos/${pagamentoId}/cobrancas`);
  }

  /** Registra um contato de cobrança; a API recusa com `422` pagamento já `PAGO`. */
  registrarCobranca(pagamentoId: number, dto: ContatoCobrancaRequestDTO): Observable<ContatoCobrancaDTO> {
    return this.http.post<ContatoCobrancaDTO>(`${this.apiUrl}/pagamentos/${pagamentoId}/cobrancas`, dto);
  }
}
