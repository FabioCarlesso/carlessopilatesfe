import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CanActivateFn, Route, Router, Routes } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { USER_ROLES, UserRole } from '../../core/models/auth';
import { AuthService } from '../../core/services/auth.service';
import { ATALHOS, TEMPO_SEQUENCIA_MS } from '../utils/atalhos-teclado';
import { AtalhosTecladoService } from './atalhos-teclado.service';

describe('AtalhosTecladoService', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let service: AtalhosTecladoService;
  let criados: HTMLElement[];

  function setup(roles: UserRole[] = ['RECEPCAO'], autenticado = true): void {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['isAuthenticated', 'hasAnyRole']);
    authService.isAuthenticated.and.returnValue(autenticado);
    authService.hasAnyRole.and.callFake(grupo => grupo.some(role => roles.includes(role)));
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    router.navigateByUrl.and.resolveTo(true);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router }
      ]
    });
    service = TestBed.inject(AtalhosTecladoService);
  }

  function teclar(key: string, opcoes: KeyboardEventInit = {}, alvo: EventTarget = document): KeyboardEvent {
    const evento = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opcoes });
    alvo.dispatchEvent(evento);
    return evento;
  }

  function criar<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] {
    const elemento = document.createElement(tag);
    document.body.appendChild(elemento);
    criados.push(elemento);
    return elemento;
  }

  beforeEach(() => {
    criados = [];
  });

  afterEach(() => {
    criados.forEach(elemento => elemento.remove());
  });

  describe('sequências de navegação', () => {
    it('deve ir para pacientes com "g p" e impedir a ação padrão das teclas', () => {
      setup();
      const primeira = teclar('g');
      const segunda = teclar('p');

      expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/pacientes');
      expect(primeira.defaultPrevented).toBeTrue();
      expect(segunda.defaultPrevented).toBeTrue();
    });

    it('deve ir para o dashboard com "g d" e para o novo paciente com "n p"', () => {
      setup();
      teclar('g');
      teclar('d');
      teclar('n');
      teclar('p');

      expect(router.navigateByUrl.calls.allArgs()).toEqual([['/inicio'], ['/pacientes/novo']]);
    });

    it('deve aceitar a segunda tecla dentro do tempo limite', fakeAsync(() => {
      setup();
      teclar('g');
      tick(TEMPO_SEQUENCIA_MS - 100);
      teclar('p');

      expect(router.navigateByUrl).toHaveBeenCalledWith('/pacientes');
    }));

    it('deve descartar a sequência quando o tempo entre as teclas se esgota', fakeAsync(() => {
      setup();
      teclar('g');
      tick(TEMPO_SEQUENCIA_MS + 1);
      const evento = teclar('p');

      expect(router.navigateByUrl).not.toHaveBeenCalled();
      expect(evento.defaultPrevented).toBeFalse();
    }));

    it('deve recomeçar a sequência pela tecla que a quebrou', () => {
      setup();
      teclar('g');
      teclar('g');
      teclar('p');

      expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/pacientes');
    });

    it('deve descartar a sequência com uma tecla sem atalho no meio', () => {
      setup();
      teclar('g');
      teclar('x');
      teclar('p');

      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('não deve impedir a ação padrão de uma tecla sem atalho', () => {
      setup();
      expect(teclar('x').defaultPrevented).toBeFalse();
    });

    it('deve aceitar letras com Caps Lock, sem Shift', () => {
      setup();
      teclar('G');
      teclar('P');

      expect(router.navigateByUrl).toHaveBeenCalledWith('/pacientes');
    });

    it('não deve reagir a uma tecla segurada (repetição)', () => {
      setup();
      teclar('g');
      teclar('p', { repeat: true });

      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });
  });

  describe('modificadores não previstos', () => {
    it('deve ignorar Shift em letras', () => {
      setup();
      teclar('G', { shiftKey: true });
      teclar('P', { shiftKey: true });

      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('deve ignorar Ctrl, Alt e Meta combinados com as letras', () => {
      setup();
      for (const modificador of ['ctrlKey', 'altKey', 'metaKey']) {
        teclar('g', { [modificador]: true });
        teclar('p', { [modificador]: true });
      }

      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('deve ignorar Alt+/ e Ctrl+Alt+K (AltGr)', () => {
      setup();
      const emitidos: unknown[] = [];
      service.focoBusca$.subscribe(v => emitidos.push(v));

      teclar('/', { altKey: true });
      teclar('k', { ctrlKey: true, altKey: true });

      expect(emitidos.length).toBe(0);
    });

    it('não deve interromper a sequência pelo keydown do próprio Shift', () => {
      setup();
      teclar('g');
      teclar('Shift', { shiftKey: true });
      teclar('d');

      expect(router.navigateByUrl).toHaveBeenCalledWith('/inicio');
    });
  });

  describe('busca e ajuda', () => {
    it('deve pedir o foco na busca com "/" e com Ctrl+K ou Cmd+K', () => {
      setup();
      let pedidos = 0;
      service.focoBusca$.subscribe(() => pedidos++);

      expect(teclar('/').defaultPrevented).toBeTrue();
      expect(teclar('k', { ctrlKey: true }).defaultPrevented).toBeTrue();
      teclar('K', { metaKey: true });

      expect(pedidos).toBe(3);
    });

    it('deve abrir a ajuda com "?" (com Shift) e fechá-la', () => {
      setup();
      teclar('?', { shiftKey: true });
      expect(service.ajudaAberta()).toBeTrue();

      service.fecharAjuda();
      expect(service.ajudaAberta()).toBeFalse();
    });

    it('não deve disparar atalhos com a ajuda aberta', () => {
      setup();
      service.abrirAjuda();
      teclar('g');
      teclar('p');

      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });
  });

  describe('foco em campo de texto', () => {
    const campos: (() => HTMLElement)[] = [
      () => criar('input'),
      () => criar('textarea'),
      () => criar('select'),
      () => {
        const div = criar('div');
        div.contentEditable = 'true';
        div.tabIndex = 0;
        return div;
      }
    ];

    it('não deve disparar sequências, "/" nem "?" com o foco em input, textarea, select ou contenteditable', () => {
      setup();
      let pedidosBusca = 0;
      service.focoBusca$.subscribe(() => pedidosBusca++);

      for (const criarCampo of campos) {
        const campo = criarCampo();
        campo.focus();

        const g = teclar('g', {}, campo);
        teclar('p', {}, campo);
        const barra = teclar('/', {}, campo);
        teclar('?', { shiftKey: true }, campo);

        expect(g.defaultPrevented).withContext(campo.tagName).toBeFalse();
        expect(barra.defaultPrevented).withContext(campo.tagName).toBeFalse();
      }

      expect(router.navigateByUrl).not.toHaveBeenCalled();
      expect(pedidosBusca).toBe(0);
      expect(service.ajudaAberta()).toBeFalse();
    });

    it('não deve completar uma sequência iniciada fora quando a segunda tecla vem de um campo', () => {
      setup();
      const campo = criar('input');
      teclar('g');
      campo.focus();
      teclar('p', {}, campo);

      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('deve aceitar Ctrl+K mesmo com o foco num campo, porque a combinação não digita', () => {
      setup();
      let pedidos = 0;
      service.focoBusca$.subscribe(() => pedidos++);
      const campo = criar('input');
      campo.focus();

      teclar('k', { ctrlKey: true }, campo);

      expect(pedidos).toBe(1);
    });
  });

  describe('perfil e sessão', () => {
    it('não deve navegar para rota que o perfil não abre', () => {
      setup(['FINANCEIRO']);
      // Agenda e lista de espera são do grupo agenda, que não inclui FINANCEIRO.
      teclar('g');
      teclar('a');
      teclar('n');
      const e = teclar('e');
      // Profissionais e administração são só de ADMIN.
      teclar('g');
      teclar('f');
      teclar('g');
      teclar('m');

      expect(router.navigateByUrl).not.toHaveBeenCalled();
      expect(e.defaultPrevented).toBeFalse();
    });

    it('deve liberar os atalhos administrativos para ADMIN', () => {
      setup(['ADMIN']);
      teclar('g');
      teclar('m');

      expect(router.navigateByUrl).toHaveBeenCalledWith('/admin');
    });

    it('deve listar só os atalhos do perfil atual', () => {
      setup(['RECEPCAO']);
      const rotas = service
        .atalhosDisponiveis()
        .flatMap(atalho => (atalho.acao.tipo === 'navegar' ? [atalho.acao.rota] : []));

      expect(rotas).toEqual(['/inicio', '/agenda', '/lista-espera', '/pacientes', '/pacientes/novo', '/lista-espera/nova']);
    });

    it('deve ficar inativo sem sessão', () => {
      setup(['ADMIN'], false);
      teclar('g');
      teclar('d');
      teclar('?', { shiftKey: true });

      expect(router.navigateByUrl).not.toHaveBeenCalled();
      expect(service.ajudaAberta()).toBeFalse();
    });

    it('deve ficar inativo com um diálogo modal aberto', () => {
      setup();
      const dialogo = criar('div');
      dialogo.setAttribute('aria-modal', 'true');

      teclar('g');
      teclar('p');

      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('deve ignorar a tecla já tratada por outro componente', () => {
      setup();
      const botao = criar('button');
      botao.addEventListener('keydown', evento => evento.preventDefault());

      teclar('?', { shiftKey: true }, botao);

      expect(service.ajudaAberta()).toBeFalse();
    });
  });
});

describe('ATALHOS e os guards das rotas', () => {
  function rotaDe(caminho: string, lista: Routes = routes, prefixo = ''): Route | undefined {
    for (const rota of lista) {
      const completo = [prefixo, rota.path].filter(Boolean).join('/');
      if (completo === caminho) return rota;
      if (rota.children && caminho.startsWith(`${completo}/`)) {
        const filha = rotaDe(caminho, rota.children, completo);
        if (filha) return filha;
      }
    }
    return undefined;
  }

  afterEach(() => localStorage.clear());

  // O atalho lê o mesmo `PAPEIS` do `roleGuard`; este teste garante que ninguém
  // mude um sem o outro, comparando com o guard real de cada rota de destino.
  it('deve liberar cada atalho de navegação exatamente para os papéis que abrem a rota', () => {
    TestBed.configureTestingModule({ imports: [RouterTestingModule, HttpClientTestingModule] });
    const auth = TestBed.inject(AuthService);

    for (const atalho of ATALHOS) {
      if (atalho.acao.tipo !== 'navegar') continue;
      const rota = rotaDe(atalho.acao.rota.slice(1));
      expect(rota).withContext(atalho.acao.rota).toBeDefined();
      const guards = (rota?.canActivate ?? []) as CanActivateFn[];
      expect(guards.length).withContext(atalho.acao.rota).toBeGreaterThan(0);

      for (const role of USER_ROLES) {
        localStorage.setItem('accessToken', 'token');
        localStorage.setItem('currentUser', JSON.stringify({ id: 1, name: 'U', email: 'u@x.com', roles: [role] }));

        const rotaAbre = guards.every(guard => TestBed.runInInjectionContext(() => guard({} as never, {} as never)) === true);
        const atalhoLiberado = !atalho.papeis || auth.hasAnyRole(atalho.papeis);

        expect(atalhoLiberado).withContext(`${atalho.acao.rota} para ${role}`).toBe(rotaAbre);
      }
    }
  });
});
