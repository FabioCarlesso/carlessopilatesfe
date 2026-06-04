import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  NotaFiscalEmitidaRequestDTO,
  NotaFiscalEmitidaResponseDTO
} from '../models/nfse-emitida';

@Injectable({
  providedIn: 'root'
})
export class NfseEmitidaService {
  // O backend expõe este recurso em `/api/nfse-emitidas`. Como o proxy de
  // desenvolvimento e o Nginx removem o primeiro prefixo `/api`, o frontend
  // chama `/api/api/nfse-emitidas` para encaminhar ao backend corretamente.
  private readonly apiUrl = '/api/api/nfse-emitidas';

  constructor(private http: HttpClient) {}

  listarPorPaciente(pacienteId: number): Observable<NotaFiscalEmitidaResponseDTO[]> {
    return this.http.get<NotaFiscalEmitidaResponseDTO[]>(`${this.apiUrl}/paciente/${pacienteId}`);
  }

  salvar(dto: NotaFiscalEmitidaRequestDTO): Observable<NotaFiscalEmitidaResponseDTO> {
    return this.http.post<NotaFiscalEmitidaResponseDTO>(this.apiUrl, dto);
  }
}
