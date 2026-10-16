import { HttpErrorResponse } from '@angular/common/http';

/** `409` do locking otimista da API: o update partiu de uma versão que outra pessoa já alterou. */
export function conflitoConcorrencia(): HttpErrorResponse {
  return new HttpErrorResponse({
    status: 409,
    error: { type: 'https://carlessopilates.com.br/problemas/concurrent-modification', status: 409 }
  });
}
