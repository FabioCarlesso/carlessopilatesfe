import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { AuthService } from './core/services/auth.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NotificacaoService } from './core/services/notificacao.service';
import { StylePreferencesService, StyleTheme } from './core/services/style-preferences.service';
import { AuthenticatedUser } from './core/models/auth';
import { renderizarEmViewport } from '../testing/viewport';

describe('AppComponent', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let stylePreferencesSpy: jasmine.SpyObj<StylePreferencesService>;

  const usuarioAdmin: AuthenticatedUser = {
    id: 1,
    name: 'Fabio Carlesso',
    email: 'fabio@carlessopilates.com.br',
    role: 'ADMIN'
  };

  function setup(
    authenticated: boolean,
    admin = false,
    theme: StyleTheme = 'light',
    currentUser: AuthenticatedUser | null = authenticated ? usuarioAdmin : null
  ) {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'isAdmin', 'logout', 'getCurrentUser']);
    authServiceSpy.isAuthenticated.and.returnValue(authenticated);
    authServiceSpy.isAdmin.and.returnValue(admin);
    authServiceSpy.getCurrentUser.and.returnValue(currentUser);

    stylePreferencesSpy = jasmine.createSpyObj<StylePreferencesService>(
      'StylePreferencesService',
      ['toggleTheme', 'setTheme', 'setDensity', 'apply'],
      { current: { theme, density: 'default' } }
    );

    TestBed.configureTestingModule({
      imports: [
        AppComponent,
        RouterTestingModule.withRoutes([
          { path: '', data: { layoutFluido: true }, children: [] },
          { path: 'inicio', children: [] },
          { path: 'outra-tela', children: [] },
          { path: 'pai', children: [{ path: 'filho', children: [] }] }
        ]),
        HttpClientTestingModule
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: StylePreferencesService, useValue: stylePreferencesSpy }
      ]
    }).compileComponents();
  }

  it('should create the app', async () => {
    await setup(false);
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should contain a router-outlet', async () => {
    await setup(false);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('router-outlet')).toBeTruthy();
  });

  it('should hide navbar when not authenticated', async () => {
    await setup(false);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.navbar')).toBeNull();
  });

  it('should show navbar when authenticated', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.navbar')).toBeTruthy();
  });

  it('should display "Carlesso Pilates" in the navbar brand when authenticated', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.navbar-brand')?.textContent).toContain('Carlesso Pilates');
  });

  it('should render admin navigation links when authenticated user is admin', async () => {
    await setup(true, true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('a[href="/profissionais"]')?.textContent).toContain('Profissionais');
    expect(el.querySelector('a[href="/relatorios"]')?.textContent).toContain('Relatórios');
    expect(el.querySelector('a[href="/admin"]')?.textContent).toContain('Administração');
  });

  it('should hide admin navigation links when authenticated user is not admin', async () => {
    await setup(true, false);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('a[href="/profissionais"]')).toBeNull();
    expect(el.querySelector('a[href="/relatorios"]')).toBeNull();
    expect(el.querySelector('a[href="/admin"]')).toBeNull();
  });

  it('should render dashboard navigation link when authenticated', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('a[href="/inicio"]')?.textContent).toContain('Carlesso Pilates');
    expect(el.querySelector('.navbar-menu a[href="/inicio"]')?.textContent).toContain('Início');
  });

  it('should render the alterar senha link when authenticated', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const link = el.querySelector('a[href="/perfil/alterar-senha"]');
    expect(link).toBeTruthy();
    expect(link?.textContent).toContain('Alterar senha');
  });

  it('should hide the alterar senha link when not authenticated', async () => {
    await setup(false);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('a[href="/perfil/alterar-senha"]')).toBeNull();
  });

  it('should render the account menu when authenticated', async () => {
    await setup(true, true, 'light', usuarioAdmin);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.navbar-actions app-menu-conta')).toBeTruthy();
  });

  it('should not render the account menu when not authenticated', async () => {
    await setup(false);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.navbar')).toBeNull();
    expect(el.querySelector('app-menu-conta')).toBeNull();
  });

  // Regressão da issue #219: até então a barra exigia ~1426px para caber numa
  // linha, mas só colapsava em ≤1024px — toda a faixa de notebook (1280, 1366,
  // 1440) renderizava marca e menu quebrados em duas linhas. 1025px é o pior
  // caso do ramo desktop. Em iframe de largura fixa porque a janela do Karma
  // roda a 765px, dentro do breakpoint, e o ramo desktop ficaria sem teste.
  it('should keep the navbar on a single row at the narrowest desktop width', async () => {
    await setup(true, true, 'light', usuarioAdmin);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
    const viewport = renderizarEmViewport(fixture.nativeElement, 1025);

    try {
      const navbar = fixture.nativeElement.querySelector('.navbar') as HTMLElement;
      const marca = fixture.nativeElement.querySelector('.navbar-brand a') as HTMLElement;
      const links = Array.from(
        fixture.nativeElement.querySelectorAll('.navbar-menu a')
      ) as HTMLElement[];

      expect(navbar.getBoundingClientRect().height).toBe(64);

      // Uma única linha de links: todos compartilham o mesmo topo.
      const topos = new Set(links.map(link => Math.round(link.getBoundingClientRect().top)));
      expect(links.length).toBe(6);
      expect(topos.size).toBe(1);

      // A marca cabe inteira, sem quebrar: com `nowrap` o conteúdo nunca excede
      // a caixa, então uma quebra apareceria como scrollWidth maior que a caixa.
      expect(marca.scrollWidth).toBeLessThanOrEqual(Math.ceil(marca.getBoundingClientRect().width));
      expect(viewport.janela.getComputedStyle(marca).whiteSpace).toBe('nowrap');
    } finally {
      viewport.destruir();
      document.body.removeChild(fixture.nativeElement);
    }
  });

  // O conteúdo acompanha o `.container` das páginas; só a faixa de fundo sangra
  // de ponta a ponta. A marca tem que começar na mesma coluna do conteúdo — foi
  // o padding interno do wrapper que resolveu os 16px de defasagem.
  it('should align the navbar content with the page container', async () => {
    await setup(true, true, 'light', usuarioAdmin);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
    const viewport = renderizarEmViewport(fixture.nativeElement, 1440);

    try {
      const inner = fixture.nativeElement.querySelector('.navbar-inner') as HTMLElement;
      const marca = fixture.nativeElement.querySelector('.navbar-brand a') as HTMLElement;
      const container = fixture.nativeElement.querySelector('main.container') as HTMLElement;
      const paddingContainer = parseFloat(viewport.janela.getComputedStyle(container).paddingLeft);

      expect(inner.getBoundingClientRect().width).toBeLessThanOrEqual(1120);
      expect(Math.round(marca.getBoundingClientRect().left))
        .toBe(Math.round(container.getBoundingClientRect().left + paddingContainer));
    } finally {
      viewport.destruir();
      document.body.removeChild(fixture.nativeElement);
    }
  });

  it('should render the collapsed menu toggle wired to the collapse region', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const toggle = el.querySelector('.navbar-toggle');
    const collapse = el.querySelector('.navbar-collapse');
    expect(toggle).toBeTruthy();
    expect(collapse).toBeTruthy();
    expect(toggle?.getAttribute('aria-controls')).toBe('navbar-collapse');
    expect(collapse?.getAttribute('id')).toBe('navbar-collapse');
  });

  it('should start with the menu closed and aria-expanded false', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const toggle = el.querySelector('.navbar-toggle');
    expect(el.querySelector('.navbar.is-open')).toBeNull();
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(toggle?.getAttribute('aria-label')).toBe('Abrir menu');
  });

  it('should toggle the menu open and closed on toggle button click', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const toggle = el.querySelector('.navbar-toggle') as HTMLButtonElement;

    toggle.click();
    fixture.detectChanges();
    expect(el.querySelector('.navbar.is-open')).toBeTruthy();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Fechar menu');

    toggle.click();
    fixture.detectChanges();
    expect(el.querySelector('.navbar.is-open')).toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('should close the menu when a navigation link is clicked', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('.navbar-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.navbar.is-open')).toBeTruthy();

    (el.querySelector('.navbar-menu a[href="/pacientes"]') as HTMLAnchorElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.navbar.is-open')).toBeNull();
  });

  it('should expose the navigation and the account menu inside the collapse region', async () => {
    await setup(true, true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const collapse = fixture.nativeElement.querySelector('.navbar-collapse') as HTMLElement;
    expect(collapse.querySelector('.navbar-menu a[href="/admin"]')).toBeTruthy();
    expect(collapse.querySelector('app-menu-conta')).toBeTruthy();
    expect(collapse.querySelector('a[href="/perfil/alterar-senha"]')).toBeTruthy();
    expect(collapse.querySelector('.menu-conta-sair')).toBeTruthy();
  });

  // O logout saiu do AppComponent junto com as demais ações de conta e passou a
  // navegar sem tocar em `menuAberto`; sem fechar por navegação, a barra
  // reapareceria expandida no login seguinte.
  it('should close the collapsed menu after a navigation completes', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('.navbar-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.navbar.is-open')).toBeTruthy();

    await router.navigateByUrl('/outra-tela');
    fixture.detectChanges();

    expect(el.querySelector('.navbar.is-open')).toBeNull();
  });

  it('should close the menu when Escape is pressed', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('.navbar-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.navbar.is-open')).toBeTruthy();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(el.querySelector('.navbar.is-open')).toBeNull();
  });

  it('should close the menu when clicking outside the navbar', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('.navbar-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.navbar.is-open')).toBeTruthy();

    (el.querySelector('main.container') as HTMLElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.navbar.is-open')).toBeNull();
  });

  it('should keep the menu open when clicking inside the navbar', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('.navbar-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    (el.querySelector('.navbar-collapse') as HTMLElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.navbar.is-open')).toBeTruthy();
  });

  it('should close the menu when the viewport grows to the desktop breakpoint', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('.navbar-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.navbar.is-open')).toBeTruthy();

    const originalWidth = window.innerWidth;
    try {
      Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();
      expect(el.querySelector('.navbar.is-open')).toBeNull();
    } finally {
      Object.defineProperty(window, 'innerWidth', { value: originalWidth, configurable: true });
    }
  });

  it('should keep the menu open when the viewport stays within the tablet breakpoint', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('.navbar-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.navbar.is-open')).toBeTruthy();

    const originalWidth = window.innerWidth;
    try {
      Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true });
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();
      expect(el.querySelector('.navbar.is-open')).toBeTruthy();
    } finally {
      Object.defineProperty(window, 'innerWidth', { value: originalWidth, configurable: true });
    }
  });

  it('should render the global search inside the navbar actions', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.navbar-actions app-busca-global')).toBeTruthy();
  });

  it('should not render the global search when not authenticated', async () => {
    await setup(false);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-busca-global')).toBeNull();
  });

  it('should not render the global notification banner when there is no notification', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.notificacao-global')).toBeNull();
  });

  it('should render the global notification message with role="alert"', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    const notificacoes = TestBed.inject(NotificacaoService);
    fixture.detectChanges();

    notificacoes.erro('Acesso negado: você não tem permissão para realizar esta ação.');
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('.notificacao-global') as HTMLElement;
    expect(banner).toBeTruthy();
    expect(banner.getAttribute('role')).toBe('alert');
    expect(banner.textContent).toContain('Acesso negado: você não tem permissão para realizar esta ação.');
  });

  it('should dismiss the global notification when the close button is clicked', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    const notificacoes = TestBed.inject(NotificacaoService);
    fixture.detectChanges();

    notificacoes.erro('Acesso negado.');
    fixture.detectChanges();

    const fechar = fixture.nativeElement.querySelector('.notificacao-fechar') as HTMLButtonElement;
    fechar.click();
    fixture.detectChanges();

    expect(notificacoes.notificacao()).toBeNull();
    expect(fixture.nativeElement.querySelector('.notificacao-global')).toBeNull();
  });

  function setupComRotas() {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'isAdmin', 'logout', 'getCurrentUser']);
    authServiceSpy.isAuthenticated.and.returnValue(true);
    authServiceSpy.isAdmin.and.returnValue(false);
    authServiceSpy.getCurrentUser.and.returnValue(usuarioAdmin);

    stylePreferencesSpy = jasmine.createSpyObj<StylePreferencesService>(
      'StylePreferencesService',
      ['toggleTheme', 'setTheme', 'setDensity', 'apply'],
      { current: { theme: 'light', density: 'default' } }
    );

    TestBed.configureTestingModule({
      imports: [
        AppComponent,
        RouterTestingModule.withRoutes([
          { path: '', data: { layoutFluido: true }, children: [] },
          { path: 'inicio', children: [] },
          { path: 'pacientes', children: [] },
          { path: 'pacientes/:pacienteId/sessoes', children: [] }
        ]),
        HttpClientTestingModule
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: StylePreferencesService, useValue: stylePreferencesSpy }
      ]
    }).compileComponents();
  }

  it('should mark the current section link active with aria-current="page"', async () => {
    await setupComRotas();
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    await router.navigateByUrl('/pacientes');
    fixture.detectChanges();

    const pacientes = fixture.nativeElement.querySelector('.navbar-menu a[href="/pacientes"]') as HTMLElement;
    expect(pacientes.classList).toContain('is-active');
    expect(pacientes.getAttribute('aria-current')).toBe('page');
  });

  it('should activate Início only on the exact dashboard route', async () => {
    await setupComRotas();
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    fixture.detectChanges();

    await router.navigateByUrl('/inicio');
    fixture.detectChanges();
    const inicio = fixture.nativeElement.querySelector('.navbar-menu a[href="/inicio"]') as HTMLElement;
    expect(inicio.classList).toContain('is-active');
    expect(inicio.getAttribute('aria-current')).toBe('page');

    await router.navigateByUrl('/pacientes');
    fixture.detectChanges();
    expect(inicio.classList).not.toContain('is-active');
    expect(inicio.hasAttribute('aria-current')).toBe(false);
  });

  it('should keep the Pacientes link active on child routes', async () => {
    await setupComRotas();
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    await router.navigateByUrl('/pacientes/12/sessoes');
    fixture.detectChanges();

    const pacientes = fixture.nativeElement.querySelector('.navbar-menu a[href="/pacientes"]') as HTMLElement;
    expect(pacientes.classList).toContain('is-active');
    expect(pacientes.getAttribute('aria-current')).toBe('page');

    const inicio = fixture.nativeElement.querySelector('.navbar-menu a[href="/inicio"]') as HTMLElement;
    expect(inicio.classList).not.toContain('is-active');
  });

  it('should clear the global notification after a navigation completes', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    const notificacoes = TestBed.inject(NotificacaoService);
    const router = TestBed.inject(Router);
    fixture.detectChanges();

    notificacoes.erro('Acesso negado.');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.notificacao-global')).toBeTruthy();

    await router.navigateByUrl('/outra-tela');
    fixture.detectChanges();

    expect(notificacoes.notificacao()).toBeNull();
    expect(fixture.nativeElement.querySelector('.notificacao-global')).toBeNull();
  });

  // A landing monta as próprias faixas de ponta a ponta; se o `.container`
  // continuasse aplicado, o fundo de cada seção pararia em 1120px e ainda
  // herdaria o gutter vertical (issue #244).
  it('should drop the page container on routes that ask for a fluid layout', async () => {
    await setup(false);
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    fixture.detectChanges();

    await router.navigateByUrl('/');
    fixture.detectChanges();

    expect(fixture.componentInstance.layoutFluido).toBeTrue();
    expect(fixture.nativeElement.querySelector('main.container')).toBeNull();
    expect(fixture.nativeElement.querySelector('main')).toBeTruthy();
  });

  it('should keep the page container on the regular screens', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    fixture.detectChanges();

    await router.navigateByUrl('/outra-tela');
    fixture.detectChanges();

    expect(fixture.componentInstance.layoutFluido).toBeFalse();
    expect(fixture.nativeElement.querySelector('main.container')).toBeTruthy();
  });

  // A leitura desce até a folha da árvore de rotas. Sem uma rota aninhada aqui,
  // o laço de descida nunca executa e o teste passaria mesmo se o código lesse
  // apenas o primeiro nível — que é errado para as rotas filhas de `/admin`.
  it('should read the fluid flag from the deepest activated route', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    fixture.detectChanges();

    await router.navigateByUrl('/pai/filho');
    fixture.detectChanges();

    expect(fixture.componentInstance.layoutFluido).toBeFalse();
    expect(fixture.nativeElement.querySelector('main.container')).toBeTruthy();
  });

  it('should restore the page container when leaving a fluid route', async () => {
    await setup(true);
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    fixture.detectChanges();

    await router.navigateByUrl('/');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('main.container')).toBeNull();

    await router.navigateByUrl('/outra-tela');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('main.container')).toBeTruthy();
  });
});
