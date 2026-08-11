import { HttpErrorResponse } from '@angular/common/http';
import { extrairMensagemErro } from './api-error';

describe('extrairMensagemErro', () => {
  const fallback = 'Erro genérico.';

  it('should return fallback for non-HTTP errors', () => {
    expect(extrairMensagemErro(new Error('x'), fallback)).toBe(fallback);
    expect(extrairMensagemErro(null, fallback)).toBe(fallback);
  });

  it('should return an authorization message for 401/403', () => {
    const msg401 = extrairMensagemErro(new HttpErrorResponse({ status: 401 }), fallback);
    const msg403 = extrairMensagemErro(new HttpErrorResponse({ status: 403 }), fallback);
    expect(msg401).toContain('sessão expirou');
    expect(msg403).toContain('sessão expirou');
  });

  it('should return a throttling message for 429', () => {
    const msg = extrairMensagemErro(new HttpErrorResponse({ status: 429 }), fallback);
    expect(msg).toContain('Muitas requisições');
  });

  it('should use the explicit message field from the body', () => {
    const err = new HttpErrorResponse({ status: 400, error: { message: 'Competência inválida.' } });
    expect(extrairMensagemErro(err, fallback)).toBe('Competência inválida.');
  });

  // `erro` é a chave que este backend usa de fato; antes ela só chegava ao usuário
  // pela junção dos valores string, que costuraria dois campos numa frase só.
  it('should use the erro field the API actually returns', () => {
    const err = new HttpErrorResponse({ status: 409, error: { erro: 'Aula já realizada não pode ser remarcada' } });
    expect(extrairMensagemErro(err, fallback)).toBe('Aula já realizada não pode ser remarcada');
  });

  it('should not concatenate other string fields alongside erro', () => {
    const err = new HttpErrorResponse({
      status: 409,
      error: { erro: 'Paciente já possui aula na data 2026-08-17', path: '/aulas/2/remarcar' }
    });
    expect(extrairMensagemErro(err, fallback)).toBe('Paciente já possui aula na data 2026-08-17');
  });

  it('should join field-error messages when there is no message field', () => {
    const err = new HttpErrorResponse({
      status: 422,
      error: { competencia: 'Formato inválido.', dataEmissao: 'Obrigatória.' }
    });
    expect(extrairMensagemErro(err, fallback)).toBe('Formato inválido. Obrigatória.');
  });

  it('should use a plain string body', () => {
    const err = new HttpErrorResponse({ status: 409, error: 'Já existe NFSE para a competência.' });
    expect(extrairMensagemErro(err, fallback)).toBe('Já existe NFSE para a competência.');
  });

  it('should fall back when the body has no usable text', () => {
    const err = new HttpErrorResponse({ status: 500, error: {} });
    expect(extrairMensagemErro(err, fallback)).toBe(fallback);
  });
});
