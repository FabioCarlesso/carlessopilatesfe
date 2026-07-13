import { TestBed } from '@angular/core/testing';
import { NotificacaoService } from './notificacao.service';

describe('NotificacaoService', () => {
  let service: NotificacaoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificacaoService);
  });

  it('should start with no notification', () => {
    expect(service.notificacao()).toBeNull();
  });

  it('should expose the last error message', () => {
    service.erro('Acesso negado.');

    expect(service.notificacao()).toEqual({ tipo: 'erro', mensagem: 'Acesso negado.' });
  });

  it('should clear the current notification', () => {
    service.erro('Acesso negado.');

    service.limpar();

    expect(service.notificacao()).toBeNull();
  });
});
