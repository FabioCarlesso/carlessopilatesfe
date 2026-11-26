import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import {
  MENSAGEM_SEM_PERMISSAO_RECEBIMENTOS,
  RecebimentosRelatorioComponent
} from './recebimentos-relatorio.component';
import { RelatorioService } from '../../../core/services/relatorio.service';
import { PacienteService } from '../../../core/services/paciente.service';
import {
  FORMA_RECEBIMENTO_OPCOES,
  RelatorioRecebimentosDTO
} from '../../../core/models/relatorio-recebimentos';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { periodoDoMesAtual } from '../../../shared/utils/indicadores';
import { normalizarEspacos, provideLocalePtBr } from '../../../../testing/locale';

const DESCRICOES = {
  PIX: 'PIX',
  DINHEIRO: 'Dinheiro',
  CARTAO_CREDITO: 'Cartão de crédito',
  CARTAO_DEBITO: 'Cartão de débito',
  TRANSFERENCIA: 'Transferência',
  NAO_INFORMADA: 'Não informada'
} as const;

const relatorioComRecebimentos: RelatorioRecebimentosDTO = {
  periodo: { inicio: '2026-11-01', fim: '2026-11-30' },
  filtros: { formaPagamento: null, pacienteId: null },
  resumo: {
    quantidadePagamentos: 2,
    total: 550,
    porFormaPagamento: FORMA_RECEBIMENTO_OPCOES.map(forma => ({
      formaPagamento: forma,
      descricao: DESCRICOES[forma],
      quantidade: forma === 'PIX' || forma === 'NAO_INFORMADA' ? 1 : 0,
      total: forma === 'PIX' ? 300 : forma === 'NAO_INFORMADA' ? 250 : 0
    }))
  },
  recebimentos: [
    {
      pagamentoId: 11,
      pacienteId: 7,
      pacienteNome: 'Ana Silva',
      valor: 300,
      dataPagamento: '2026-11-05',
      formaPagamento: 'PIX',
      dataVencimento: '2026-11-05',
      periodoInicio: '2026-11-05',
      periodoFim: '2026-12-04',
      planoId: 1,
      frequenciaSemanal: 'DUAS_VEZES'
    },
    {
      pagamentoId: 12,
      pacienteId: 8,
      pacienteNome: 'Bruno Lima',
      valor: 250,
      dataPagamento: '2026-11-10',
      formaPagamento: 'NAO_INFORMADA',
      dataVencimento: '2026-11-08',
      periodoInicio: '2026-11-08',
      periodoFim: '2026-12-07',
      planoId: 2,
      frequenciaSemanal: 'UMA_VEZ'
    }
  ],
  geradoEm: '2026-11-25T10:00:00'
};

const relatorioVazio: RelatorioRecebimentosDTO = {
  ...relatorioComRecebimentos,
  resumo: {
    quantidadePagamentos: 0,
    total: 0,
    porFormaPagamento: relatorioComRecebimentos.resumo.porFormaPagamento.map(f => ({ ...f, quantidade: 0, total: 0 }))
  },
  recebimentos: []
};

function paciente(id: number, nome: string, ativo: boolean): PacienteResponseDTO {
  return {
    version: 0,
    id,
    nome,
    email: null,
    cpf: null,
    telefone: '',
    dataNascimento: null,
    endereco: null,
    ativo,
    cpfNaNota: false,
    tomadorId: null,
    tomadorNome: null,
    tomadorCpfCnpj: null
  } as unknown as PacienteResponseDTO;
}

function pagina(content: PacienteResponseDTO[]) {
  return { content, page: { size: 8, number: 0, totalElements: content.length, totalPages: 1 } };
}

function arquivo(nome: string): HttpResponse<Blob> {
  return new HttpResponse({
    body: new Blob(['conteudo']),
    headers: new HttpHeaders({ 'Content-Disposition': `attachment; filename="${nome}"` })
  });
}

describe('RecebimentosRelatorioComponent', () => {
  let fixture: ComponentFixture<RecebimentosRelatorioComponent>;
  let component: RecebimentosRelatorioComponent;
  let serviceSpy: jasmine.SpyObj<RelatorioService>;
  let pacienteSpy: jasmine.SpyObj<PacienteService>;

  const el = () => fixture.nativeElement as HTMLElement;
  const texto = (seletor: string) => normalizarEspacos(el().querySelector(seletor)?.textContent).trim();
  const consultar = (valores: { inicio: string; fim: string; formaPagamento?: string }) => {
    component.form.setValue({ formaPagamento: '', ...valores });
    component.consultar();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    serviceSpy = jasmine.createSpyObj<RelatorioService>('RelatorioService', [
      'relatorioRecebimentos',
      'exportarRelatorioRecebimentos'
    ]);
    serviceSpy.relatorioRecebimentos.and.returnValue(of(relatorioComRecebimentos));
    serviceSpy.exportarRelatorioRecebimentos.and.returnValue(of(arquivo('relatorio-recebimentos.pdf')));
    pacienteSpy = jasmine.createSpyObj<PacienteService>('PacienteService', ['listar']);
    pacienteSpy.listar.and.callFake((_p, _s, filtro) =>
      of(pagina(filtro?.ativo === false ? [paciente(9, 'Ana Antiga', false)] : [paciente(7, 'Ana Silva', true)])) as never
    );

    await TestBed.configureTestingModule({
      imports: [RecebimentosRelatorioComponent],
      providers: [
        provideRouter([]),
        provideLocalePtBr(),
        { provide: RelatorioService, useValue: serviceSpy },
        { provide: PacienteService, useValue: pacienteSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RecebimentosRelatorioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should suggest the current month and query it without filters on open', () => {
    const { inicio, fim } = periodoDoMesAtual();

    expect(component.form.value).toEqual({ inicio, fim, formaPagamento: '' });
    expect(serviceSpy.relatorioRecebimentos).toHaveBeenCalledOnceWith(inicio, fim, {
      formaPagamento: null,
      pacienteId: null
    });
  });

  it('should render the total card and one card per payment method, as returned by the API', () => {
    expect(texto('[data-card="total"] strong')).toBe('R$ 550,00');
    expect(texto('[data-card="total"] .detalhe')).toBe('2 pagamento(s)');
    expect(texto('[data-card="PIX"] strong')).toBe('R$ 300,00');
    expect(texto('[data-card="NAO_INFORMADA"] .label')).toBe('Não informada');
    expect(texto('[data-card="NAO_INFORMADA"] strong')).toBe('R$ 250,00');
    expect(el().querySelectorAll('.summary-item').length).toBe(7);
    expect(el().querySelector('[data-card="DINHEIRO"]')?.classList).toContain('summary-item--zerado');
  });

  it('should list each receipt and a total row matching the total card', () => {
    const linhas = el().querySelectorAll('table tbody tr');
    expect(linhas.length).toBe(2);
    const segunda = Array.from(linhas[1].querySelectorAll('td')).map(td => normalizarEspacos(td.textContent).trim());
    expect(segunda).toEqual([
      'Bruno Lima',
      'R$ 250,00',
      '10/11/2026',
      'Não informada',
      '08/11/2026',
      '08/11/2026 a 07/12/2026',
      '1x por semana'
    ]);
    expect(linhas[0].querySelector('a')?.getAttribute('href')).toBe('/pacientes/7/financeiro');

    const total = Array.from(el().querySelectorAll('tfoot tr > *')).map(c => normalizarEspacos(c.textContent).trim());
    expect(total[0]).toBe('Total (2)');
    expect(total[1]).toBe(texto('[data-card="total"] strong'));
  });

  it('should send the payment method filter, including "não informada"', () => {
    consultar({ inicio: '2026-11-01', fim: '2026-11-30', formaPagamento: 'NAO_INFORMADA' });

    expect(serviceSpy.relatorioRecebimentos).toHaveBeenCalledWith('2026-11-01', '2026-11-30', {
      formaPagamento: 'NAO_INFORMADA',
      pacienteId: null
    });
  });

  it('should show an empty state, not an error, for a period without receipts', () => {
    serviceSpy.relatorioRecebimentos.and.returnValue(of(relatorioVazio));
    consultar({ inicio: '2026-11-01', fim: '2026-11-30' });

    expect(component.semRecebimentos).toBeTrue();
    expect(el().querySelector('.sem-recebimentos')).toBeTruthy();
    expect(el().querySelector('table')).toBeNull();
    expect(el().querySelector('.alert-danger')).toBeNull();
    expect(texto('[data-card="total"] strong')).toBe('R$ 0,00');
  });

  it('should block an inverted period with a message in the form', () => {
    serviceSpy.relatorioRecebimentos.calls.reset();
    consultar({ inicio: '2026-11-30', fim: '2026-11-01' });

    expect(serviceSpy.relatorioRecebimentos).not.toHaveBeenCalled();
    expect(texto('.periodo-erro')).toBe('A data inicial deve ser menor ou igual à data final.');
    expect(el().querySelector('#inicio')?.classList).toContain('is-invalid');
    expect(component.relatorio).toBeNull();
  });

  it('should block a period longer than the API limit', () => {
    serviceSpy.relatorioRecebimentos.calls.reset();
    consultar({ inicio: '2025-01-01', fim: '2026-11-30' });

    expect(serviceSpy.relatorioRecebimentos).not.toHaveBeenCalled();
    expect(component.erroPeriodo).toContain('366');
  });

  it('should show a permission message on 403 and the API detail on other errors', () => {
    serviceSpy.relatorioRecebimentos.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    consultar({ inicio: '2026-11-01', fim: '2026-11-30' });
    expect(texto('.alert-danger')).toBe(MENSAGEM_SEM_PERMISSAO_RECEBIMENTOS);
    expect(component.loading).toBeFalse();

    serviceSpy.relatorioRecebimentos.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'Consulta por período limitada a 366 dias' } }))
    );
    consultar({ inicio: '2026-11-01', fim: '2026-11-30' });
    expect(texto('.alert-danger')).toBe('Consulta por período limitada a 366 dias');
  });

  it('should fall back to a friendly message on network failure', () => {
    serviceSpy.relatorioRecebimentos.and.returnValue(throwError(() => new Error('falha')));
    consultar({ inicio: '2026-11-01', fim: '2026-11-30' });

    expect(component.erro).toBe('Erro ao carregar o relatório de recebimentos.');
  });

  describe('filtro de paciente', () => {
    it('should search active and inactive patients after the debounce and apply the selected one', fakeAsync(() => {
      const input = el().querySelector('#buscaPaciente') as HTMLInputElement;
      input.value = 'An';
      input.dispatchEvent(new Event('input'));
      tick(300);
      fixture.detectChanges();

      expect(pacienteSpy.listar).toHaveBeenCalledWith(0, 8, { nome: 'An', ativo: true }, 'nome');
      expect(pacienteSpy.listar).toHaveBeenCalledWith(0, 8, { nome: 'An', ativo: false }, 'nome');
      const sugestoes = Array.from(el().querySelectorAll<HTMLButtonElement>('.sugestao'));
      expect(sugestoes.map(s => normalizarEspacos(s.querySelector('.sugestao-nome')?.textContent).trim()))
        .toEqual(['Ana Antiga', 'Ana Silva']);
      expect(normalizarEspacos(sugestoes[0].querySelector('.sugestao-detalhe')?.textContent).trim()).toBe('Inativo');
      expect(sugestoes[1].querySelector('.sugestao-detalhe')).toBeNull();

      sugestoes[1].click();
      fixture.detectChanges();
      tick(300);
      expect(texto('.paciente-selecionado span')).toBe('Ana Silva');

      component.consultar();
      expect(serviceSpy.relatorioRecebimentos.calls.mostRecent().args[2]).toEqual({
        formaPagamento: null,
        pacienteId: 7
      });
    }));

    it('should not search with fewer than two letters', fakeAsync(() => {
      component.busca.setValue('A');
      tick(300);

      expect(pacienteSpy.listar).not.toHaveBeenCalled();
    }));

    it('should tell a failed patient search apart from an empty result', fakeAsync(() => {
      pacienteSpy.listar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      component.busca.setValue('Ana');
      tick(300);
      fixture.detectChanges();

      expect(texto('.sugestao-status')).toBe('Não foi possível buscar agora.');
      expect(component.erro).toBeNull();
    }));

    it('should remove the patient filter', () => {
      component.selecionarPaciente(paciente(7, 'Ana Silva', true));
      fixture.detectChanges();

      (el().querySelector('.paciente-selecionado button') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(component.pacienteSelecionado).toBeNull();
      expect(el().querySelector('#buscaPaciente')).toBeTruthy();
    });
  });

  describe('exportação', () => {
    /** `Blob.text()` resolve fora do controle do teste: espera a leitura do corpo terminar. */
    async function aguardarExportacao(): Promise<void> {
      for (let i = 0; i < 50 && component.exportando; i++) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      fixture.detectChanges();
    }

    for (const [formato, rotulo] of [['pdf', 'PDF'], ['xlsx', 'Excel']] as const) {
      it(`should disable both export buttons while generating the ${rotulo} and download with the API file name`, () => {
        const resposta$ = new Subject<HttpResponse<Blob>>();
        serviceSpy.exportarRelatorioRecebimentos.and.returnValue(resposta$);
        spyOn(window.URL, 'createObjectURL').and.returnValue('blob:relatorio');
        spyOn(window.URL, 'revokeObjectURL');
        const cliques: string[] = [];
        spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
          cliques.push(this.download);
        });
        consultar({ inicio: '2026-11-01', fim: '2026-11-30', formaPagamento: 'PIX' });

        component.exportar(formato);
        fixture.detectChanges();

        expect(serviceSpy.exportarRelatorioRecebimentos).toHaveBeenCalledWith('2026-11-01', '2026-11-30', formato, {
          formaPagamento: 'PIX',
          pacienteId: null
        });
        const botoes = Array.from(el().querySelectorAll<HTMLButtonElement>('.form-actions button[type="button"]'));
        expect(botoes.length).toBe(2);
        expect(botoes.every(b => b.disabled)).toBeTrue();
        expect(normalizarEspacos(el().textContent)).toContain(`Gerando ${rotulo}...`);

        resposta$.next(arquivo(`relatorio-recebimentos-2026-11-01-2026-11-30.${formato}`));
        resposta$.complete();
        fixture.detectChanges();

        expect(cliques).toEqual([`relatorio-recebimentos-2026-11-01-2026-11-30.${formato}`]);
        expect(component.exportando).toBeNull();
        expect(botoes.every(b => !b.disabled)).toBeTrue();
      });
    }

    it('should export the last applied query, not unsubmitted form edits', () => {
      // Sem os stubs, o clique de download é real e grava o Blob falso em ~/Downloads.
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:relatorio');
      spyOn(window.URL, 'revokeObjectURL');
      spyOn(HTMLAnchorElement.prototype, 'click');
      consultar({ inicio: '2026-11-01', fim: '2026-11-30', formaPagamento: 'PIX' });
      component.form.patchValue({ formaPagamento: 'DINHEIRO', inicio: '2026-10-01' });

      component.exportar('xlsx');

      expect(serviceSpy.exportarRelatorioRecebimentos).toHaveBeenCalledWith('2026-11-01', '2026-11-30', 'xlsx', {
        formaPagamento: 'PIX',
        pacienteId: null
      });
    });

    it('should not export while there is no valid query on screen', () => {
      consultar({ inicio: '2026-11-30', fim: '2026-11-01' });

      component.exportar('pdf');

      expect(serviceSpy.exportarRelatorioRecebimentos).not.toHaveBeenCalled();
      const botoes = Array.from(el().querySelectorAll<HTMLButtonElement>('.form-actions button[type="button"]'));
      expect(botoes.every(b => b.disabled)).toBeTrue();
    });

    it('should show the API detail read from the Blob body when the export fails', async () => {
      const corpo = new Blob([JSON.stringify({ detail: 'Resultado acima de 5000 linhas' })], {
        type: 'application/problem+json'
      });
      serviceSpy.exportarRelatorioRecebimentos.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 400, error: corpo }))
      );

      component.exportar('xlsx');
      await aguardarExportacao();

      expect(component.erro).toBe('Resultado acima de 5000 linhas');
      expect(component.exportando).toBeNull();
    });

    it('should show friendly messages for a 403 and for an unreadable failure', async () => {
      serviceSpy.exportarRelatorioRecebimentos.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
      component.exportar('pdf');
      expect(component.erro).toBe(MENSAGEM_SEM_PERMISSAO_RECEBIMENTOS);
      expect(component.exportando).toBeNull();

      serviceSpy.exportarRelatorioRecebimentos.and.returnValue(throwError(() => new Error('falha')));
      component.exportar('xlsx');
      await aguardarExportacao();
      expect(component.erro).toBe('Erro ao exportar o relatório em Excel.');
      expect(component.exportando).toBeNull();
    });
  });
});
