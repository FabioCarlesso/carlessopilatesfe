import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { isOnPush } from '../../../../testing/onpush';
import { normalizarEspacos, provideLocalePtBr } from '../../../../testing/locale';
import { ContatoCobrancaDTO } from '../../../core/models/inadimplencia';
import { PagamentoResponseDTO } from '../../../core/models/plano';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { CobrancaDialogComponent } from './cobranca-dialog.component';

/** Segunda-feira, 12/10/2026: fixa o teto da data do contato. */
const HOJE = new Date(2026, 9, 12, 9, 0);

const vencido: PagamentoResponseDTO = {
  id: 1, pacienteId: 10, pacienteNome: 'Ana Silva', planoId: 1, valor: 250, status: 'VENCIDO',
  dataPagamento: null, dataVencimento: '2026-09-12', periodoInicio: '2026-09-01', periodoFim: '2026-09-30'
};
const pago: PagamentoResponseDTO = { ...vencido, id: 3, status: 'PAGO', dataPagamento: '2026-08-05' };

const contatos: ContatoCobrancaDTO[] = [
  {
    id: 8, pagamentoId: 1, dataContato: '2026-10-10', observacao: 'Ligação: prometeu pagar na sexta.',
    registradoPor: 'admin@carlesso.com', registradoEm: '2026-10-10T14:03:00'
  },
  {
    id: 7, pagamentoId: 1, dataContato: '2026-09-20', observacao: 'Mensagem por WhatsApp.',
    registradoPor: 'recepcao@carlesso.com', registradoEm: '2026-09-20T09:15:00'
  }
];

function erroHttp(status: number, error: unknown = null): HttpErrorResponse {
  return new HttpErrorResponse({ status, error });
}

describe('CobrancaDialogComponent', () => {
  let fixture: ComponentFixture<CobrancaDialogComponent>;
  let component: CobrancaDialogComponent;
  let pagamentoSpy: jasmine.SpyObj<PagamentoService>;
  let fechou: number;
  let desatualizou: number;

  beforeEach(() => {
    pagamentoSpy = jasmine.createSpyObj('PagamentoService', ['listarCobrancas', 'registrarCobranca']);
    pagamentoSpy.listarCobrancas.and.returnValue(of(contatos));
    pagamentoSpy.registrarCobranca.and.returnValue(of(contatos[0]));
    TestBed.configureTestingModule({
      imports: [CobrancaDialogComponent],
      providers: [provideLocalePtBr(), { provide: PagamentoService, useValue: pagamentoSpy }]
    });
  });

  /** Abre o diálogo com o relógio em {@link HOJE}, que vira o teto da data do contato. */
  function criar(pagamento: PagamentoResponseDTO = vencido, diasAtraso = 30): void {
    jasmine.clock().install();
    jasmine.clock().mockDate(HOJE);
    try {
      fixture = TestBed.createComponent(CobrancaDialogComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('pagamento', pagamento);
      fixture.componentRef.setInput('diasAtraso', diasAtraso);
      fechou = 0;
      desatualizou = 0;
      component.fechar.subscribe(() => fechou++);
      component.listaDesatualizada.subscribe(() => desatualizou++);
      fixture.detectChanges();
    } finally {
      jasmine.clock().uninstall();
    }
  }

  const el = () => fixture.nativeElement as HTMLElement;
  const todos = (seletor: string) => Array.from(el().querySelectorAll<HTMLElement>(seletor));
  const texto = (seletor: string) => el().querySelector(seletor)?.textContent?.trim() ?? '';
  const botaoRegistrar = () => el().querySelector('.dialog .btn-primary') as HTMLButtonElement | null;

  /** Preenche e registra pelo botão do diálogo, como o usuário faz. */
  function registrar(valor: { dataContato: string; observacao: string }): void {
    component.cobrancaForm.setValue(valor);
    botaoRegistrar()!.click();
    fixture.detectChanges();
  }

  it('should use OnPush change detection strategy', () => {
    expect(isOnPush(CobrancaDialogComponent)).toBeTrue();
  });

  it('should show the payment summary and its contact history', () => {
    criar();

    expect(pagamentoSpy.listarCobrancas).toHaveBeenCalledOnceWith(1);
    expect(texto('.dialog-title')).toBe('Cobrança — Ana Silva');
    expect(normalizarEspacos(texto('.cobranca-resumo'))).toContain('R$ 250,00 · vencimento 12/09/2026');
    expect(texto('.cobranca-resumo')).toContain('Vencido');
    expect(texto('.cobranca-resumo')).toContain('30 dias em atraso');
    const itens = todos('.cobranca-contato');
    expect(itens.length).toBe(2);
    expect(itens[0].querySelector('.cobranca-contato-data')?.textContent?.trim()).toBe('10/10/2026');
    expect(itens[0].querySelector('.cobranca-contato-observacao')?.textContent?.trim())
      .toBe('Ligação: prometeu pagar na sexta.');
    expect(itens[0].querySelector('.cobranca-contato-registro')?.textContent?.trim())
      .toBe('Registrado por admin@carlesso.com em 10/10/2026 às 14:03');
  });

  it('should not mention days overdue for a payment still on time', () => {
    criar(vencido, 0);
    expect(texto('.cobranca-resumo')).not.toContain('atraso');
  });

  it('should prefill the contact date with today', () => {
    criar();
    expect(component.cobrancaForm.getRawValue()).toEqual({ dataContato: '2026-10-12', observacao: '' });
    expect((el().querySelector('#dataContato') as HTMLInputElement).max).toBe('2026-10-12');
  });

  it('should register a contact with a trimmed note and reload the history', () => {
    criar();
    pagamentoSpy.listarCobrancas.calls.reset();

    registrar({ dataContato: '2026-10-11', observacao: '  Ligação sem resposta.  ' });

    expect(pagamentoSpy.registrarCobranca).toHaveBeenCalledOnceWith(1, {
      dataContato: '2026-10-11',
      observacao: 'Ligação sem resposta.'
    });
    expect(pagamentoSpy.listarCobrancas).toHaveBeenCalledOnceWith(1);
    expect(texto('.dialog .alert-success')).toBe('Contato de cobrança registrado.');
    expect(component.campoCobranca('observacao').value).toBe('');
    expect(desatualizou).toBe(0);
  });

  it('should not submit an empty, blank or too long note', () => {
    criar();

    registrar({ dataContato: '2026-10-11', observacao: '   ' });
    expect(texto('.cobranca-form .invalid-feedback')).toBe('Descreva o contato.');

    registrar({ dataContato: '2026-10-11', observacao: 'x'.repeat(501) });
    expect(texto('.cobranca-form .invalid-feedback')).toBe('A observação deve ter no máximo 500 caracteres.');

    expect(pagamentoSpy.registrarCobranca).not.toHaveBeenCalled();
  });

  it('should not submit a future or missing contact date', () => {
    criar();

    registrar({ dataContato: '2026-10-13', observacao: 'Ligação.' });
    expect(texto('.cobranca-form .invalid-feedback')).toBe('A data do contato não pode ser futura.');

    registrar({ dataContato: '', observacao: 'Ligação.' });
    expect(texto('.cobranca-form .invalid-feedback')).toBe('Informe a data do contato.');

    expect(pagamentoSpy.registrarCobranca).not.toHaveBeenCalled();
  });

  it('should show the note length counter', () => {
    criar();
    const campo = el().querySelector('#observacaoCobranca') as HTMLTextAreaElement;
    campo.value = 'Ligação';
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(texto('#observacaoCobrancaHint')).toBe('7/500 caracteres.');
  });

  it('should only show the history for a paid payment', () => {
    criar(pago, 0);

    expect(el().querySelector('.cobranca-form')).toBeNull();
    expect(botaoRegistrar()).toBeNull();
    expect(texto('.cobranca-aviso')).toContain('Pagamento quitado');
    expect(todos('.cobranca-contato').length).toBe(2);
    component.registrarContato();
    expect(pagamentoSpy.registrarCobranca).not.toHaveBeenCalled();
  });

  // O pagamento foi quitado depois da carga da lista.
  it('should turn read-only and ask for a reload on 422', () => {
    criar();
    pagamentoSpy.registrarCobranca.and.returnValue(throwError(() => erroHttp(422, { erro: 'Pagamento já está pago.' })));

    registrar({ dataContato: '2026-10-11', observacao: 'Ligação.' });

    expect(texto('.dialog .alert-danger')).toBe('Pagamento já está pago.');
    expect(component.status()).toBe('PAGO');
    expect(texto('.cobranca-resumo')).toContain('Pago');
    expect(el().querySelector('.cobranca-form')).toBeNull();
    expect(desatualizou).toBe(1);
  });

  it('should fall back to a specific message on 422 without a body', () => {
    criar();
    pagamentoSpy.registrarCobranca.and.returnValue(throwError(() => erroHttp(422)));

    registrar({ dataContato: '2026-10-11', observacao: 'Ligação.' });

    expect(component.erroCobranca()).toBe('Este pagamento já foi quitado e não aceita novos contatos de cobrança.');
  });

  it('should ask for a reload when the payment no longer exists', () => {
    criar();
    pagamentoSpy.registrarCobranca.and.returnValue(throwError(() => erroHttp(404)));

    registrar({ dataContato: '2026-10-11', observacao: 'Ligação.' });

    expect(component.erroCobranca()).toBe('Pagamento não encontrado.');
    expect(desatualizou).toBe(1);
  });

  it('should show the API validation message and keep the note on 400', () => {
    criar();
    pagamentoSpy.registrarCobranca.and.returnValue(
      throwError(() => erroHttp(400, { observacao: 'A observação é obrigatória.' })));

    registrar({ dataContato: '2026-10-11', observacao: 'Ligação.' });

    expect(texto('.dialog .alert-danger')).toBe('A observação é obrigatória.');
    expect(component.campoCobranca('observacao').value).toBe('Ligação.');
    expect(component.registrando()).toBeFalse();
    expect(desatualizou).toBe(0);
  });

  it('should show an empty history', () => {
    pagamentoSpy.listarCobrancas.and.returnValue(of([]));
    criar();
    expect(texto('.cobranca-historico-status')).toBe('Nenhum contato registrado para este pagamento.');
  });

  it('should show a failed history without blocking the registration', () => {
    pagamentoSpy.listarCobrancas.and.returnValue(throwError(() => erroHttp(500)));
    criar();
    expect(texto('.cobranca-historico-status')).toBe('Não foi possível carregar os contatos de cobrança.');
    expect(el().querySelector('.cobranca-form')).toBeTruthy();
  });

  it('should show the loading history and drop a late response once destroyed', () => {
    const atrasado = new Subject<ContatoCobrancaDTO[]>();
    pagamentoSpy.listarCobrancas.and.returnValue(atrasado as Observable<ContatoCobrancaDTO[]>);
    criar();
    expect(texto('.cobranca-historico-status')).toBe('Carregando contatos...');

    fixture.destroy();
    atrasado.next(contatos);

    expect(component.contatos()).toEqual([]);
  });

  it('should ask to close from the close button', () => {
    criar();
    (el().querySelector('.dialog .btn-outline') as HTMLButtonElement).click();
    expect(fechou).toBe(1);
  });

  it('should not close while a contact is being registered', () => {
    pagamentoSpy.registrarCobranca.and.returnValue(new Subject<ContatoCobrancaDTO>());
    criar();
    component.cobrancaForm.setValue({ dataContato: '2026-10-11', observacao: 'Ligação.' });

    component.registrarContato();
    component.fecharDialogo();

    expect(component.registrando()).toBeTrue();
    expect(fechou).toBe(0);
  });
});
