import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, DestroyRef } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { isOnPush } from '../../../../testing/onpush';
import { renderizarEmViewport } from '../../../../testing/viewport';
import { AulaListComponent } from './aula-list.component';
import { AulaService } from '../../../core/services/aula.service';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { AulaResponseDTO, PagamentoResponseDTO } from '../../../core/models/plano';
import { ProfissionalPage, ProfissionalResponseDTO } from '../../../core/models/profissional';

const mockAula: AulaResponseDTO = {
  id: 1, pacienteId: 10, pacienteNome: 'Ana Silva', pagamentoId: 1, data: '2026-05-05', realizada: false
};

const mockPagamento: PagamentoResponseDTO = {
  id: 1, pacienteId: 10, pacienteNome: 'Ana Silva', planoId: 1,
  valor: 250, status: 'PENDENTE', dataPagamento: null,
  dataVencimento: '2026-05-10', periodoInicio: '2026-05-01', periodoFim: '2026-05-31'
};

const mockProfissional: ProfissionalResponseDTO = {
  id: 5,
  nome: 'Paula Mendes',
  email: 'paula@carlessopilates.com',
  cpf: '123.456.111-00',
  telefone: '(11) 98888-1111',
  numeroRegistro: null,
  tipoContrato: 'PJ',
  percentualPagamentoAula: 45,
  dataInicio: '2024-01-15',
  ativo: true
};

const mockProfissionalPage: ProfissionalPage = {
  content: [mockProfissional],
  page: { totalElements: 1, totalPages: 1, size: 100, number: 0 }
};

registerLocaleData(localePt);

describe('AulaListComponent', () => {
  describe('when route has pacienteId', () => {
    let component: AulaListComponent;
    let fixture: ComponentFixture<AulaListComponent>;
    let serviceSpy: jasmine.SpyObj<AulaService>;
    let pagamentoServiceSpy: jasmine.SpyObj<PagamentoService>;
    let profissionalServiceSpy: jasmine.SpyObj<ProfissionalService>;

    beforeEach(async () => {
      serviceSpy = jasmine.createSpyObj('AulaService', ['listarPorPaciente', 'listarPorPagamento', 'realizar', 'remarcar']);
      pagamentoServiceSpy = jasmine.createSpyObj('PagamentoService', ['buscar']);
      profissionalServiceSpy = jasmine.createSpyObj('ProfissionalService', ['listar']);
      serviceSpy.listarPorPaciente.and.returnValue(of([mockAula]));
      profissionalServiceSpy.listar.and.returnValue(of(mockProfissionalPage));

      await TestBed.configureTestingModule({
        imports: [AulaListComponent, RouterTestingModule],
        providers: [
          { provide: AulaService, useValue: serviceSpy },
          { provide: PagamentoService, useValue: pagamentoServiceSpy },
          { provide: ProfissionalService, useValue: profissionalServiceSpy },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: (key: string) => key === 'pacienteId' ? '10' : null } } } }
        ]
      }).compileComponents();

      fixture = TestBed.createComponent(AulaListComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create', () => expect(component).toBeTruthy());

    it('should use OnPush change detection strategy', () => {
      expect(isOnPush(AulaListComponent)).toBeTrue();
    });

    it('should mark for check after loading the list', () => {
      const cdr = (component as unknown as { cdr: { markForCheck: () => void } }).cdr;
      const markForCheckSpy = spyOn(cdr, 'markForCheck');
      component.carregar();
      expect(markForCheckSpy).toHaveBeenCalled();
    });

    it('should track table rows by id', () => {
      expect(component.trackByAula(0, mockAula)).toBe(mockAula.id);
    });

    it('should wrap the table in a scroll container to keep overflow inside the card', () => {
      const table: HTMLTableElement = fixture.nativeElement.querySelector('table.table');
      expect(table).toBeTruthy();
      expect(table.parentElement?.classList.contains('table-wrap')).toBeTrue();
    });

    it('should label the data cells for the stacked mobile card layout', () => {
      const cells = fixture.nativeElement.querySelectorAll('tbody td[data-label]');
      const labels = Array.from(cells).map((cell) => (cell as HTMLElement).getAttribute('data-label'));
      expect(labels).toContain('Data');
      expect(labels).toContain('Status');
      expect(labels).toContain('Profissional');
    });

    it('should load aulas on init', () => {
      expect(serviceSpy.listarPorPaciente).toHaveBeenCalledWith(10);
      expect(profissionalServiceSpy.listar).toHaveBeenCalledWith(0, 100);
      expect(component.aulas).toEqual([mockAula]);
      expect(component.profissionais).toEqual([mockProfissional]);
      expect(component.loading).toBeFalse();
    });

    it('should show the paciente name from the DTO as subtitle in the header', () => {
      expect(component.subtitulo).toBe('Ana Silva');
      const subtitle: HTMLElement = fixture.nativeElement.querySelector('.page-header .page-subtitle');
      expect(subtitle).toBeTruthy();
      expect(subtitle.textContent?.trim()).toBe('Ana Silva');
    });

    it('should fall back to the generic title when there are no aulas', () => {
      serviceSpy.listarPorPaciente.and.returnValue(of([]));
      component.carregar();
      fixture.detectChanges();
      expect(component.subtitulo).toBeNull();
      expect(fixture.nativeElement.querySelector('.page-subtitle')).toBeNull();
    });

    it('should set erro when profissionais fail to load', () => {
      profissionalServiceSpy.listar.and.returnValue(throwError(() => new Error('fail')));
      component.carregarProfissionais();
      expect(component.erro).toBe('Erro ao carregar profissionais.');
    });

    it('should set erro when listar fails', () => {
      serviceSpy.listarPorPaciente.and.returnValue(throwError(() => new Error('fail')));
      component.carregar();
      expect(component.erro).toBe('Erro ao carregar aulas.');
    });

    it('should open confirmation dialog before realizar', () => {
      component.profissionalSelecionadoPorAula[1] = 5;
      component.solicitarRealizar(1);
      expect(component.confirmarAulaId).toBe(1);
      expect(serviceSpy.realizar).not.toHaveBeenCalled();
    });

    it('should expose aula and profissional in confirmation', () => {
      component.profissionalSelecionadoPorAula[1] = 5;
      component.solicitarRealizar(1);
      expect(component.aulaEmConfirmacao).toEqual(mockAula);
      expect(component.profissionalEmConfirmacaoNome).toBe('Paula Mendes');
    });

    it('should render confirmation dialog with data and profissional', () => {
      component.profissionalSelecionadoPorAula[1] = 5;
      component.solicitarRealizar(1);
      fixture.detectChanges();
      const dialog = fixture.nativeElement.querySelector('app-confirmar-dialog');
      expect(dialog).toBeTruthy();
      expect(dialog.textContent).toContain('05/05/2026');
      expect(dialog.textContent).toContain('Paula Mendes');
    });

    it('should call realizar and reload after confirming', () => {
      serviceSpy.realizar.and.returnValue(of({ ...mockAula, realizada: true }));
      component.profissionalSelecionadoPorAula[1] = 5;
      component.solicitarRealizar(1);
      component.confirmarRealizar();
      expect(serviceSpy.realizar).toHaveBeenCalledWith(1, 5);
      expect(serviceSpy.listarPorPaciente).toHaveBeenCalledTimes(2);
      expect(component.confirmarAulaId).toBeNull();
      expect(component.acaoEmAndamento).toBeFalse();
    });

    it('should close dialog when confirmation is cancelled', () => {
      component.profissionalSelecionadoPorAula[1] = 5;
      component.solicitarRealizar(1);
      component.cancelarConfirmacao();
      expect(component.confirmarAulaId).toBeNull();
      expect(serviceSpy.realizar).not.toHaveBeenCalled();
    });

    it('should flag the select and not open dialog when profissional is missing', () => {
      component.profissionalSelecionadoPorAula[1] = null;
      component.solicitarRealizar(1);
      expect(component.erro).toBe('Selecione um profissional para marcar a aula como realizada.');
      expect(component.selectInvalidoPorAula[1]).toBeTrue();
      expect(component.confirmarAulaId).toBeNull();
      expect(serviceSpy.realizar).not.toHaveBeenCalled();
    });

    it('should clear the invalid flag and erro when a profissional is selected', () => {
      component.profissionalSelecionadoPorAula[1] = null;
      component.solicitarRealizar(1);
      expect(component.selectInvalidoPorAula[1]).toBeTrue();

      component.aoSelecionarProfissional(1);
      expect(component.selectInvalidoPorAula[1]).toBeFalse();
      expect(component.erro).toBeNull();
    });

    it('should link the invalid feedback message to the select via aria-describedby', () => {
      component.profissionalSelecionadoPorAula[1] = null;
      component.solicitarRealizar(1);
      fixture.detectChanges();
      const select: HTMLSelectElement = fixture.nativeElement.querySelector('select.form-control-sm');
      const feedback: HTMLElement = fixture.nativeElement.querySelector('.invalid-feedback');
      expect(feedback).toBeTruthy();
      expect(select.getAttribute('aria-invalid')).toBe('true');
      expect(select.getAttribute('aria-describedby')).toBe(feedback.id);
      expect(feedback.id).toBe('profissional-erro-1');
    });

    it('should show sucesso with role status after realizar and clear it after timeout', fakeAsync(() => {
      serviceSpy.realizar.and.returnValue(of({ ...mockAula, realizada: true }));
      component.profissionalSelecionadoPorAula[1] = 5;
      component.solicitarRealizar(1);
      component.confirmarRealizar();
      expect(component.sucesso).toBe('Aula marcada como realizada.');
      fixture.detectChanges();
      const alert = fixture.nativeElement.querySelector('.alert-success');
      expect(alert).toBeTruthy();
      expect(alert.getAttribute('role')).toBe('status');
      tick(4000);
      expect(component.sucesso).toBeNull();
    }));

    it('should set erro when realizar fails', () => {
      serviceSpy.realizar.and.returnValue(throwError(() => new Error('fail')));
      component.profissionalSelecionadoPorAula[1] = 5;
      component.solicitarRealizar(1);
      component.confirmarRealizar();
      expect(component.erro).toBe('Erro ao marcar aula como realizada.');
      expect(component.confirmarAulaId).toBeNull();
      expect(component.acaoEmAndamento).toBeFalse();
    });

    it('should open the remarcar dialog with the current date already filled in', () => {
      component.solicitarRemarcar(mockAula);
      expect(component.remarcarAulaId).toBe(1);
      expect(component.remarcarData).toBe('2026-05-05');
      expect(component.aulaEmRemarcacao).toEqual(mockAula);
      expect(serviceSpy.remarcar).not.toHaveBeenCalled();
    });

    // `tick()` porque o `ngModel` escreve o valor no campo só na microtask
    // seguinte ao primeiro ciclo de detecção.
    it('should render the remarcar dialog with a date field', fakeAsync(() => {
      component.solicitarRemarcar(mockAula);
      fixture.detectChanges();
      tick();

      const input: HTMLInputElement = fixture.nativeElement.querySelector('#remarcarData');
      expect(input).toBeTruthy();
      expect(input.type).toBe('date');
      expect(input.value).toBe('2026-05-05');
    }));

    it('should offer Remarcar only for aulas not yet realizadas', () => {
      const acoes = (): string[] => Array.from(
        fixture.nativeElement.querySelectorAll('td.acoes-cell button')
      ).map(botao => (botao as HTMLButtonElement).textContent?.trim() ?? '');

      expect(acoes()).toContain('Remarcar');

      component.aulas = [{ ...mockAula, realizada: true }];
      fixture.detectChanges();
      expect(acoes()).toEqual([]);
    });

    it('should flag the date field and not call remarcar when the date is empty', () => {
      component.solicitarRemarcar(mockAula);
      component.remarcarData = '';
      component.confirmarRemarcar();
      expect(component.remarcarDataInvalida).toBeTrue();
      expect(component.remarcarAulaId).toBe(1);
      expect(serviceSpy.remarcar).not.toHaveBeenCalled();
    });

    it('should link the date error message to the field via aria-describedby', () => {
      component.solicitarRemarcar(mockAula);
      component.remarcarData = '';
      component.confirmarRemarcar();
      fixture.detectChanges();

      const input: HTMLInputElement = fixture.nativeElement.querySelector('#remarcarData');
      const feedback: HTMLElement = fixture.nativeElement.querySelector('#remarcarDataErro');
      expect(feedback).toBeTruthy();
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toBe('remarcarDataErro');
    });

    it('should clear the invalid flag when the date changes', () => {
      component.solicitarRemarcar(mockAula);
      component.remarcarData = '';
      component.confirmarRemarcar();
      expect(component.remarcarDataInvalida).toBeTrue();

      component.remarcarData = '2026-05-12';
      component.aoAlterarDataRemarcacao();
      expect(component.remarcarDataInvalida).toBeFalse();
    });

    // A listagem vem ordenada por data e a aula remarcada muda de lugar, então a
    // tela recarrega em vez de trocar o item no array.
    it('should call remarcar and reload the list after confirming', fakeAsync(() => {
      serviceSpy.remarcar.and.returnValue(of({ ...mockAula, data: '2026-05-12' }));
      component.solicitarRemarcar(mockAula);
      component.remarcarData = '2026-05-12';
      component.confirmarRemarcar();

      expect(serviceSpy.remarcar).toHaveBeenCalledWith(1, '2026-05-12');
      expect(serviceSpy.listarPorPaciente).toHaveBeenCalledTimes(2);
      expect(component.remarcarAulaId).toBeNull();
      expect(component.acaoEmAndamento).toBeFalse();
      expect(component.sucesso).toBe('Aula remarcada.');
      tick(4000);
    }));

    it('should close the remarcar dialog when cancelled', () => {
      component.solicitarRemarcar(mockAula);
      component.cancelarRemarcar();
      expect(component.remarcarAulaId).toBeNull();
      expect(serviceSpy.remarcar).not.toHaveBeenCalled();
    });

    // O 409 diz por que a data não serve (aula já realizada, paciente com aula no
    // dia); trocar isso por um texto genérico esconderia o que resolve o problema.
    // O corpo é o `{ erro: ... }` real da API, verificado contra o backend local.
    it('should surface the API message when remarcar is refused', () => {
      serviceSpy.remarcar.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 409,
        error: { erro: 'Paciente já possui aula na data 2026-05-12' }
      })));
      component.solicitarRemarcar(mockAula);
      component.remarcarData = '2026-05-12';
      component.confirmarRemarcar();

      expect(component.erro).toBe('Paciente já possui aula na data 2026-05-12');
      expect(component.remarcarAulaId).toBeNull();
      expect(component.acaoEmAndamento).toBeFalse();
    });

    it('should surface the API message when the aula is already realizada', () => {
      serviceSpy.remarcar.and.returnValue(throwError(() => new HttpErrorResponse({
        status: 409,
        error: { erro: 'Aula já realizada não pode ser remarcada' }
      })));
      component.solicitarRemarcar(mockAula);
      component.remarcarData = '2026-05-12';
      component.confirmarRemarcar();

      expect(component.erro).toBe('Aula já realizada não pode ser remarcada');
    });

    // No modo card (≤640px) as duas ações empilham em largura total; lado a lado
    // ficariam estreitas demais para o alvo de toque. Em iframe de largura fixa,
    // como as demais regressões de breakpoint desta suíte: a janela do Karma é
    // sempre larga e o ramo mobile ficaria sem teste efetivo.
    it('should stack the row actions only in card mode', () => {
      document.body.appendChild(fixture.nativeElement);

      [375, 1200].forEach(largura => {
        const viewport = renderizarEmViewport(fixture.nativeElement, largura);

        try {
          const acoes: HTMLElement = fixture.nativeElement.querySelector('.acoes-aula');
          expect(viewport.janela.getComputedStyle(acoes).flexDirection)
            .withContext(`ações em ${largura}px`)
            .toBe(largura === 375 ? 'column' : 'row');
        } finally {
          viewport.destruir();
        }
      });

      document.body.removeChild(fixture.nativeElement);
    });

    it('should fall back to a generic message when remarcar fails without a body', () => {
      serviceSpy.remarcar.and.returnValue(throwError(() => new Error('fail')));
      component.solicitarRemarcar(mockAula);
      component.remarcarData = '2026-05-12';
      component.confirmarRemarcar();
      expect(component.erro).toBe('Erro ao remarcar aula.');
    });

    // A shorthand `background` do `.form-control-sm` local zerava o
    // `background-image` do global e, com `appearance: none` já aplicado, o
    // campo ficava sem seta alguma. O recuo também é menor que o do campo
    // padrão, senão os 36px comeriam a largura útil do texto (issue #200).
    it('should keep the custom chevron on the small select with its own right padding (issue #200)', () => {
      document.body.appendChild(fixture.nativeElement);

      try {
        const select: HTMLSelectElement = fixture.nativeElement.querySelector('select.form-control-sm');
        const estilo = getComputedStyle(select);

        expect(estilo.backgroundImage).not.toBe('none');
        expect(estilo.backgroundSize).toBe('12px 8px');
        expect(estilo.paddingRight).toBe('26px');
      } finally {
        document.body.removeChild(fixture.nativeElement);
      }
    });

    // A tabela e as linhas tinham fundo próprio no SCSS local, cobrindo as
    // sombras que o `.table-wrap` pinta para sinalizar o scroll horizontal; no
    // modo card (≤640px) a linha volta a ser uma superfície elevada (issue
    // #164).
    it('should let the scroll shadows of the wrapper show through the table (issue #164)', () => {
      document.body.appendChild(fixture.nativeElement);

      try {
        const tabela: HTMLElement = fixture.nativeElement.querySelector('table.table');
        expect(getComputedStyle(tabela).backgroundColor).toBe('rgba(0, 0, 0, 0)');
      } finally {
        document.body.removeChild(fixture.nativeElement);
      }
    });

    it('should elevate each row only in card mode (issue #164)', () => {
      document.body.appendChild(fixture.nativeElement);

      // Em iframe de largura fixa: a janela do Karma é sempre larga e o ramo
      // mobile ficaria sem teste efetivo.
      [375, 1200].forEach(largura => {
        const viewport = renderizarEmViewport(fixture.nativeElement, largura);

        try {
          const linha: HTMLElement = fixture.nativeElement.querySelector('tbody tr');
          // No modo card cada linha é um card sobre o fundo da página; no modo
          // tabela ela é transparente para não cobrir as sombras do wrapper.
          expect(viewport.janela.getComputedStyle(linha).backgroundColor)
            .withContext(`linha em ${largura}px`)
            .toBe(largura === 375 ? 'rgb(255, 255, 255)' : 'rgba(0, 0, 0, 0)');
        } finally {
          viewport.destruir();
        }
      });

      document.body.removeChild(fixture.nativeElement);
    });

    // O contêiner só é parada de tabulação onde de fato rola: no modo card
    // (≤640px) ele não tem scroll horizontal e um tab stop ali não levaria a
    // lugar nenhum (issue #164).
    it('should expose the scroll region only outside card mode (issue #164)', () => {
      // Modo tabela: a fixture do beforeEach, na janela larga do Karma.
      const wrap: HTMLElement = fixture.nativeElement.querySelector('.table-wrap');
      expect(wrap.getAttribute('tabindex')).toBe('0');
      expect(wrap.getAttribute('role')).toBe('region');
      expect(wrap.getAttribute('aria-label')).toBe('Lista de aulas');

      // Modo card: nova fixture com o media query casando, que é como o
      // componente decide em produção.
      spyOn(window, 'matchMedia').and.returnValue({
        matches: true,
        addEventListener: () => undefined,
        removeEventListener: () => undefined
      } as unknown as MediaQueryList);
      const fixtureCard = TestBed.createComponent(AulaListComponent);
      fixtureCard.detectChanges();

      const wrapCard: HTMLElement = fixtureCard.nativeElement.querySelector('.table-wrap');
      expect(wrapCard.getAttribute('tabindex')).toBeNull();
      expect(wrapCard.getAttribute('role')).toBeNull();
      expect(wrapCard.getAttribute('aria-label')).toBeNull();
      fixtureCard.destroy();
    });

    it('should track the card mode media query and drop the listener on destroy (issue #164)', () => {
      const ouvintes: ((evento: MediaQueryListEvent) => void)[] = [];
      const consulta = {
        matches: true,
        addEventListener: (_: string, ouvinte: (evento: MediaQueryListEvent) => void) => ouvintes.push(ouvinte),
        removeEventListener: (_: string, ouvinte: (evento: MediaQueryListEvent) => void) =>
          ouvintes.splice(ouvintes.indexOf(ouvinte), 1)
      } as unknown as MediaQueryList;
      spyOn(window, 'matchMedia').and.returnValue(consulta);

      const outraFixture = TestBed.createComponent(AulaListComponent);
      outraFixture.detectChanges();

      expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 640px)');
      expect(outraFixture.componentInstance.modoCard).toBeTrue();

      ouvintes[0]({ matches: false } as MediaQueryListEvent);
      expect(outraFixture.componentInstance.modoCard).toBeFalse();

      outraFixture.destroy();
      expect(ouvintes.length).toBe(0);
    });

    it('should set an aria-label on the profissional select', () => {
      const select: HTMLSelectElement = fixture.nativeElement.querySelector('select.form-control-sm');
      expect(select.getAttribute('aria-label')).toBe('Profissional responsável pela aula de 05/05/2026');
    });

    it('should show a hint explaining the disabled button when there are no profissionais', () => {
      component.profissionais = [];
      fixture.detectChanges();
      const hint = fixture.nativeElement.querySelector('.field-hint');
      expect(hint).toBeTruthy();
      expect(hint.textContent).toContain('Cadastre um profissional ativo para confirmar aulas');
      const button: HTMLButtonElement = fixture.nativeElement.querySelector('td .btn-secondary');
      expect(button.disabled).toBeTrue();
    });
  });

  describe('when route has pagamentoId', () => {
    let component: AulaListComponent;
    let fixture: ComponentFixture<AulaListComponent>;
    let serviceSpy: jasmine.SpyObj<AulaService>;
    let pagamentoServiceSpy: jasmine.SpyObj<PagamentoService>;
    let profissionalServiceSpy: jasmine.SpyObj<ProfissionalService>;

    beforeEach(async () => {
      serviceSpy = jasmine.createSpyObj('AulaService', ['listarPorPaciente', 'listarPorPagamento', 'realizar', 'remarcar']);
      pagamentoServiceSpy = jasmine.createSpyObj('PagamentoService', ['buscar']);
      profissionalServiceSpy = jasmine.createSpyObj('ProfissionalService', ['listar']);
      serviceSpy.listarPorPagamento.and.returnValue(of([mockAula]));
      pagamentoServiceSpy.buscar.and.returnValue(of(mockPagamento));
      profissionalServiceSpy.listar.and.returnValue(of(mockProfissionalPage));

      await TestBed.configureTestingModule({
        imports: [AulaListComponent, RouterTestingModule],
        providers: [
          { provide: AulaService, useValue: serviceSpy },
          { provide: PagamentoService, useValue: pagamentoServiceSpy },
          { provide: ProfissionalService, useValue: profissionalServiceSpy },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: (key: string) => key === 'pagamentoId' ? '1' : null } } } }
        ]
      }).compileComponents();

      fixture = TestBed.createComponent(AulaListComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should fetch payment to resolve pacienteId then load aulas', () => {
      expect(pagamentoServiceSpy.buscar).toHaveBeenCalledWith(1);
      expect(serviceSpy.listarPorPagamento).toHaveBeenCalledWith(1);
      expect(profissionalServiceSpy.listar).toHaveBeenCalledWith(0, 100);
      expect(component.pacienteId).toBe(10);
      expect(component.titulo).toBe('Aulas do Pagamento');
    });

    it('should show the payment reference and paciente name as subtitle', () => {
      expect(component.subtitulo).toBe('Pagamento #1 · Ana Silva');
      const subtitle: HTMLElement = fixture.nativeElement.querySelector('.page-header .page-subtitle');
      expect(subtitle).toBeTruthy();
      expect(subtitle.textContent?.trim()).toBe('Pagamento #1 · Ana Silva');
    });

    it('should set erro when buscar payment fails', () => {
      pagamentoServiceSpy.buscar.and.returnValue(throwError(() => new Error('fail')));
      component.ngOnInit();
      expect(component.erro).toBe('Erro ao carregar dados do pagamento.');
      expect(component.loading).toBeFalse();
    });

    it('should show loading while fetching payment before loading aulas', () => {
      const pagamentoSubject = new Subject<PagamentoResponseDTO>();
      pagamentoServiceSpy.buscar.and.returnValue(pagamentoSubject.asObservable());
      serviceSpy.listarPorPagamento.calls.reset();

      component.ngOnInit();

      expect(component.loading).toBeTrue();
      expect(serviceSpy.listarPorPagamento).not.toHaveBeenCalled();

      pagamentoSubject.next(mockPagamento);
      pagamentoSubject.complete();

      expect(serviceSpy.listarPorPagamento).toHaveBeenCalledWith(1);
      expect(component.loading).toBeFalse();
    });
  });

  it('should not load aulas when route param is invalid', () => {
    const serviceSpy = jasmine.createSpyObj('AulaService', ['listarPorPaciente', 'listarPorPagamento', 'realizar', 'remarcar']);
    const pagamentoServiceSpy = jasmine.createSpyObj('PagamentoService', ['buscar']);
    const profissionalServiceSpy = jasmine.createSpyObj('ProfissionalService', ['listar']);
    const invalidRoute = { snapshot: { paramMap: convertToParamMap({ pacienteId: 'abc' }) } } as ActivatedRoute;
    const component = new AulaListComponent(serviceSpy, pagamentoServiceSpy, profissionalServiceSpy, invalidRoute, { markForCheck: () => {} } as ChangeDetectorRef, { onDestroy: () => () => {} } as unknown as DestroyRef);

    component.ngOnInit();

    expect(component.erro).toBe('Identificador inválido.');
    expect(serviceSpy.listarPorPaciente).not.toHaveBeenCalled();
    expect(serviceSpy.listarPorPagamento).not.toHaveBeenCalled();
    expect(pagamentoServiceSpy.buscar).not.toHaveBeenCalled();
    expect(profissionalServiceSpy.listar).not.toHaveBeenCalled();
  });
});
