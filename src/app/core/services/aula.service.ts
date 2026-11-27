import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { AtendimentoRequestDTO, AtendimentoResponseDTO } from '../models/atendimento';
import { EvolucaoSessaoResponseDTO } from '../models/evolucao-sessao';
import { AulaResponseDTO } from '../models/plano';
import { SessaoApiResponseDTO, sessaoDaApi } from './sessao.service';
import { Page } from '../models/common';
import { buscarTodasAsPaginas, paramsPaginaHistorico } from '../models/paginacao';

/** O atendimento como a API o devolve: a sessão vem com `data` e `horario` separados. */
interface AtendimentoApiResponseDTO {
  aula: AulaResponseDTO;
  sessao: SessaoApiResponseDTO;
  evolucao: EvolucaoSessaoResponseDTO | null;
}

function atendimentoDaApi(dto: AtendimentoApiResponseDTO): AtendimentoResponseDTO {
  return { aula: dto.aula, sessao: sessaoDaApi(dto.sessao), evolucao: dto.evolucao ?? null };
}

@Injectable({ providedIn: 'root' })
export class AulaService {
  private readonly apiUrl = '/api';

  constructor(private http: HttpClient) {}

  // A tela de aulas sempre listou da mais antiga para a mais nova; o padrão da API
  // paginada é o inverso, por isso o `sort` explícito.
  listarPorPaciente(pacienteId: number): Observable<AulaResponseDTO[]> {
    return buscarTodasAsPaginas(pagina =>
      this.http.get<Page<AulaResponseDTO>>(`${this.apiUrl}/aulas/paciente/${pacienteId}`, {
        params: paramsPaginaHistorico(pagina, 'data,asc')
      })
    );
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
   * Vincula (ou, com `null`, desvincula) o profissional de uma aula ainda não
   * realizada, sem marcá-la como realizada (issue #266). O campo vai sempre no
   * corpo, mesmo nulo: a API recusa `{}` com `400` para que um corpo incompleto
   * nunca apague o vínculo em silêncio.
   *
   * Com a aula num horário lotado, a API responde `409` com a ocupação no
   * `detail` — diferente de `realizar`, que não confere capacidade.
   */
  atribuirProfissional(aulaId: number, profissionalId: number | null): Observable<AulaResponseDTO> {
    return this.http.patch<AulaResponseDTO>(`${this.apiUrl}/aulas/${aulaId}/profissional`, { profissionalId });
  }

  /**
   * Troca a data e, opcionalmente, o horário de uma aula ainda não realizada
   * (issues #131 e #266). A data vai em `yyyy-MM-dd` e **pode estar no
   * passado**: a API aceita de propósito, para que a recepção registre
   * reposições já ocorridas.
   *
   * `horario` (`HH:mm`) só é serializado quando informado: ausente, a API
   * mantém o horário atual da aula.
   */
  remarcar(aulaId: number, data: string, horario?: string | null): Observable<AulaResponseDTO> {
    const corpo = horario ? { data, horario } : { data };
    return this.http.patch<AulaResponseDTO>(`${this.apiUrl}/aulas/${aulaId}/remarcar`, corpo);
  }

  buscar(aulaId: number): Observable<AulaResponseDTO> {
    return this.http.get<AulaResponseDTO>(`${this.apiUrl}/aulas/${aulaId}`);
  }

  /**
   * Atendimento da aula (issue #303): aula, sessão vinculada e evolução. A API
   * responde `404` quando a aula ainda não tem atendimento — quem chama trata
   * esse caso como "sem atendimento", e não como erro.
   */
  buscarAtendimento(aulaId: number): Observable<AtendimentoResponseDTO> {
    return this.http.get<AtendimentoApiResponseDTO>(`${this.apiUrl}/aulas/${aulaId}/atendimento`)
      .pipe(map(atendimento => atendimentoDaApi(atendimento)));
  }

  /**
   * Registra o atendimento numa chamada só: cria (ou reaproveita) a sessão
   * vinculada, marca a aula como realizada se ainda não estiver e grava a
   * evolução, se veio e a sessão ainda não tem. É idempotente: reenviar sem
   * evolução devolve o mesmo atendimento. Uma evolução já existente é editada
   * por `PUT /evolucoes-sessao/{id}`, e não por aqui (`409`).
   */
  registrarAtendimento(aulaId: number, dto: AtendimentoRequestDTO = {}): Observable<AtendimentoResponseDTO> {
    return this.http.post<AtendimentoApiResponseDTO>(`${this.apiUrl}/aulas/${aulaId}/atendimento`, dto)
      .pipe(map(atendimento => atendimentoDaApi(atendimento)));
  }
}
