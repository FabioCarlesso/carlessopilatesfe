import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { SessaoRequestDTO, SessaoResponseDTO, SessaoUpdateDTO } from '../models/sessao';

interface SessaoApiRequestDTO {
  pacienteId: number;
  profissionalId?: number | null;
  tipo: string;
  data: string;
  horario?: string | null;
  duracaoMinutos?: number | null;
  observacoes?: string | null;
}

interface SessaoApiUpdateDTO {
  data?: string | null;
  horario?: string | null;
  duracaoMinutos?: number | null;
  status?: string | null;
  observacoes?: string | null;
}

interface SessaoApiResponseDTO {
  id: number;
  pacienteId: number;
  nomePaciente: string;
  profissionalId: number | null;
  nomeProfissional: string | null;
  planoTratamentoId?: number | null;
  tipo: SessaoResponseDTO['tipo'];
  status: SessaoResponseDTO['status'];
  data: string;
  horario: string | null;
  local?: string | null;
  duracaoMinutos: number | null;
  observacoes: string | null;
  dataCriacao: string;
  dataAtualizacao: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class SessaoService {
  private readonly apiUrl = '/api/sessoes';

  constructor(private http: HttpClient) {}

  listarPorPaciente(pacienteId: number): Observable<SessaoResponseDTO[]> {
    return this.http.get<SessaoApiResponseDTO[]>(`${this.apiUrl}/paciente/${pacienteId}`)
      .pipe(map(sessoes => sessoes.map(sessao => this.fromApi(sessao))));
  }

  buscar(id: number): Observable<SessaoResponseDTO> {
    return this.http.get<SessaoApiResponseDTO>(`${this.apiUrl}/${id}`)
      .pipe(map(sessao => this.fromApi(sessao)));
  }

  criar(dto: SessaoRequestDTO): Observable<SessaoResponseDTO> {
    return this.http.post<SessaoApiResponseDTO>(this.apiUrl, this.toApiRequest(dto))
      .pipe(map(sessao => this.fromApi(sessao)));
  }

  atualizar(id: number, dto: SessaoUpdateDTO): Observable<SessaoResponseDTO> {
    return this.http.put<SessaoApiResponseDTO>(`${this.apiUrl}/${id}`, this.toApiUpdate(dto))
      .pipe(map(sessao => this.fromApi(sessao)));
  }

  realizar(id: number): Observable<SessaoResponseDTO> {
    return this.http.patch<SessaoApiResponseDTO>(`${this.apiUrl}/${id}/realizar`, {})
      .pipe(map(sessao => this.fromApi(sessao)));
  }

  cancelar(id: number): Observable<SessaoResponseDTO> {
    return this.http.patch<SessaoApiResponseDTO>(`${this.apiUrl}/${id}/cancelar`, {})
      .pipe(map(sessao => this.fromApi(sessao)));
  }

  private toApiRequest(dto: SessaoRequestDTO): SessaoApiRequestDTO {
    const { data, horario } = this.splitDataHora(dto.dataHora);
    return {
      pacienteId: dto.pacienteId,
      profissionalId: dto.profissionalId,
      tipo: dto.tipo,
      data,
      horario,
      duracaoMinutos: dto.duracao,
      observacoes: dto.observacoes
    };
  }

  private toApiUpdate(dto: SessaoUpdateDTO): SessaoApiUpdateDTO {
    const dataHora = dto.dataHora ? this.splitDataHora(dto.dataHora) : null;
    return {
      data: dataHora?.data,
      horario: dataHora?.horario,
      duracaoMinutos: dto.duracao,
      status: dto.status,
      observacoes: dto.observacoes
    };
  }

  private fromApi(dto: SessaoApiResponseDTO): SessaoResponseDTO {
    return {
      id: dto.id,
      pacienteId: dto.pacienteId,
      nomePaciente: dto.nomePaciente,
      dataHora: this.joinDataHora(dto.data, dto.horario),
      tipo: dto.tipo,
      duracao: dto.duracaoMinutos ?? 0,
      profissionalId: dto.profissionalId,
      nomeProfissional: dto.nomeProfissional,
      status: dto.status,
      observacoes: dto.observacoes,
      dataCriacao: dto.dataCriacao,
      dataAtualizacao: dto.dataAtualizacao
    };
  }

  private splitDataHora(dataHora: string): { data: string; horario: string | null } {
    const [data, horario] = dataHora.split('T');
    return {
      data,
      horario: horario ? `${horario}:00`.slice(0, 8) : null
    };
  }

  private joinDataHora(data: string, horario: string | null): string {
    return horario ? `${data}T${horario.slice(0, 5)}` : `${data}T00:00`;
  }
}
