import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TRATA_403_LOCALMENTE } from '../interceptors/forbidden.interceptor';
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

  // As telas de NFSE já exibem a mensagem de erro da API (inclusive 403) via
  // `extrairMensagemErro`, então o tratamento global de 403 é dispensado aqui.
  private contextoTrata403Localmente(): HttpContext {
    return new HttpContext().set(TRATA_403_LOCALMENTE, true);
  }

  listarPorPaciente(pacienteId: number): Observable<NotaFiscalEmitidaResponseDTO[]> {
    return this.http.get<NotaFiscalEmitidaResponseDTO[]>(`${this.apiUrl}/paciente/${pacienteId}`, {
      context: this.contextoTrata403Localmente()
    });
  }

  salvar(dto: NotaFiscalEmitidaRequestDTO): Observable<NotaFiscalEmitidaResponseDTO> {
    return this.http.post<NotaFiscalEmitidaResponseDTO>(this.apiUrl, dto, {
      context: this.contextoTrata403Localmente()
    });
  }
}
