import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthenticatedUser } from '../../../core/models/auth';
import { AuthService } from '../../../core/services/auth.service';
import { StylePreferencesService, StyleTheme } from '../../../core/services/style-preferences.service';
import { isOnPush } from '../../../../testing/onpush';
import { renderizarEmViewport } from '../../../../testing/viewport';
import { MenuContaComponent } from './menu-conta.component';

describe('MenuContaComponent', () => {
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let stylePreferencesSpy: jasmine.SpyObj<StylePreferencesService>;

  const usuarioAdmin: AuthenticatedUser = {
    id: 1,
    name: 'Fabio Carlesso',
    email: 'fabio@carlessopilates.com.br',
    role: 'ADMIN'
  };

  // O componente lê `matchMedia` no ngOnInit para decidir entre dropdown e lista
  // plana. Sem o duplo, o Karma responderia com a largura real da sua janela e o
  // modo sob teste variaria conforme a máquina.
  function mockarMediaQuery(compacto: boolean): ((evento: MediaQueryListEvent) => void)[] {
    const ouvintes: ((evento: MediaQueryListEvent) => void)[] = [];
    const consulta = {
      matches: compacto,
      addEventListener: (_: string, ouvinte: (evento: MediaQueryListEvent) => void) => ouvintes.push(ouvinte),
      removeEventListener: (_: string, ouvinte: (evento: MediaQueryListEvent) => void) =>
        ouvintes.splice(ouvintes.indexOf(ouvinte), 1)
    } as unknown as MediaQueryList;
    spyOn(window, 'matchMedia').and.returnValue(consulta);
    return ouvintes;
  }

  async function setup(
    currentUser: AuthenticatedUser | null = usuarioAdmin,
    theme: StyleTheme = 'light',
    compacto = false
  ) {
    const ouvintes = mockarMediaQuery(compacto);

    authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'logout']);
    authServiceSpy.getCurrentUser.and.returnValue(currentUser);

    stylePreferencesSpy = jasmine.createSpyObj<StylePreferencesService>(
      'StylePreferencesService',
      ['toggleTheme', 'setTheme', 'setDensity', 'apply'],
      { current: { theme, density: 'default' } }
    );

    await TestBed.configureTestingModule({
      imports: [
        MenuContaComponent,
        RouterTestingModule.withRoutes([
          { path: '', children: [] },
          { path: 'outra-tela', children: [] },
          { path: 'perfil/alterar-senha', children: [] }
        ])
      ],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: StylePreferencesService, useValue: stylePreferencesSpy }
      ]
    }).compileComponents();

    return ouvintes;
  }

  function criar(): ComponentFixture<MenuContaComponent> {
    const fixture = TestBed.createComponent(MenuContaComponent);
    fixture.detectChanges();
    return fixture;
  }

  function gatilhoDe(fixture: ComponentFixture<MenuContaComponent>): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.menu-conta-gatilho') as HTMLButtonElement;
  }

  function abrir(fixture: ComponentFixture<MenuContaComponent>): void {
    gatilhoDe(fixture).click();
    fixture.detectChanges();
  }

  it('should create', async () => {
    await setup();
    expect(criar().componentInstance).toBeTruthy();
  });

  it('should use OnPush change detection', () => {
    expect(isOnPush(MenuContaComponent)).toBeTrue();
  });

  describe('identificação', () => {
    it('should show only the first name and the initials on the trigger', async () => {
      await setup();
      const fixture = criar();
      expect(fixture.nativeElement.querySelector('.menu-conta-nome').textContent.trim()).toBe('Fabio');
      expect(fixture.nativeElement.querySelector('.menu-conta-avatar').textContent.trim()).toBe('FC');
    });

    it('should build the initials from a single word name', async () => {
      await setup({ ...usuarioAdmin, name: 'Administrador' });
      const fixture = criar();
      expect(fixture.nativeElement.querySelector('.menu-conta-avatar').textContent.trim()).toBe('A');
      expect(fixture.nativeElement.querySelector('.menu-conta-nome').textContent.trim()).toBe('Administrador');
    });

    it('should preserve accented initials in upper case', async () => {
      await setup({ ...usuarioAdmin, name: 'Ávila Ângelo' });
      const fixture = criar();
      expect(fixture.nativeElement.querySelector('.menu-conta-avatar').textContent.trim()).toBe('ÁÂ');
    });

    it('should use the first and the last name for the initials', async () => {
      await setup({ ...usuarioAdmin, name: 'Maria Aparecida da Conceição Albuquerque' });
      const fixture = criar();
      expect(fixture.nativeElement.querySelector('.menu-conta-avatar').textContent.trim()).toBe('MA');
    });

    it('should show the full name, e-mail and admin role label in the panel header', async () => {
      await setup();
      const fixture = criar();
      abrir(fixture);
      const cabecalho = fixture.nativeElement.querySelector('.menu-conta-cabecalho') as HTMLElement;
      expect(cabecalho.textContent).toContain('Fabio Carlesso');
      expect(cabecalho.textContent).toContain('fabio@carlessopilates.com.br');
      expect(cabecalho.textContent).toContain('Administrador');
    });

    it('should show the "Usuário" role label for a non admin user', async () => {
      await setup({ id: 2, name: 'Ana Souza', email: 'ana@exemplo.com', role: 'USER' });
      const fixture = criar();
      abrir(fixture);
      const cabecalho = fixture.nativeElement.querySelector('.menu-conta-cabecalho') as HTMLElement;
      expect(cabecalho.textContent).toContain('Usuário');
      expect(cabecalho.textContent).not.toContain('Administrador');
    });

    // Sessão sem `currentUser` no localStorage (ausente ou corrompido): o menu
    // segue funcional e apenas omite a identificação.
    it('should stay usable without the current user', async () => {
      await setup(null);
      const fixture = criar();
      expect(fixture.nativeElement.querySelector('.menu-conta-avatar')).toBeNull();
      expect(fixture.nativeElement.querySelector('.menu-conta-cabecalho')).toBeNull();
      expect(gatilhoDe(fixture)).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.menu-conta-sair')).toBeTruthy();
    });

    it('should label the trigger with the account owner', async () => {
      await setup();
      const fixture = criar();
      expect(gatilhoDe(fixture).getAttribute('aria-label')).toBe('Conta de Fabio Carlesso');
    });

    it('should refresh the identification after a navigation completes', async () => {
      await setup(null);
      const fixture = criar();
      const router = TestBed.inject(Router);
      expect(fixture.nativeElement.querySelector('.menu-conta-nome').textContent.trim()).toBe('');

      authServiceSpy.getCurrentUser.and.returnValue(usuarioAdmin);
      await router.navigateByUrl('/outra-tela');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.menu-conta-nome').textContent.trim()).toBe('Fabio');
    });

    // `getCurrentUser()` faz JSON.parse + validação a cada chamada; resolver na
    // interpolação faria isso a cada ciclo de detecção de mudanças.
    it('should resolve the current user once per navigation, not per change detection', async () => {
      await setup();
      const fixture = criar();
      const chamadasIniciais = authServiceSpy.getCurrentUser.calls.count();

      fixture.detectChanges();
      fixture.detectChanges();

      expect(authServiceSpy.getCurrentUser.calls.count()).toBe(chamadasIniciais);
    });
  });

  // `--c-cloud-dancer` é re-tematizado em [data-theme="dark"] (#f0ede8 → #0e1620)
  // e o fundo da navbar é o --c-horizonte fixo nos dois temas: usar o token no
  // gatilho derrubaria o texto para 2,16:1 no escuro. A literal rende 7,20:1 nos
  // dois. O guard trava a cor contra o tema, que é o que o token quebra.
  it('should keep the trigger legible in both themes', async () => {
    await setup();
    const fixture = criar();
    document.body.appendChild(fixture.nativeElement);
    const temaAnterior = document.documentElement.getAttribute('data-theme');

    try {
      const gatilho = gatilhoDe(fixture);

      document.documentElement.setAttribute('data-theme', 'light');
      expect(getComputedStyle(gatilho).color).toBe('rgb(240, 237, 232)');

      document.documentElement.setAttribute('data-theme', 'dark');
      expect(getComputedStyle(gatilho).color).toBe('rgb(240, 237, 232)');
    } finally {
      if (temaAnterior === null) {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', temaAnterior);
      }
      document.body.removeChild(fixture.nativeElement);
    }
  });

  describe('abertura e fechamento', () => {
    it('should start closed with aria-expanded false', async () => {
      await setup();
      const fixture = criar();
      expect(fixture.nativeElement.querySelector('.menu-conta.is-aberto')).toBeNull();
      expect(gatilhoDe(fixture).getAttribute('aria-expanded')).toBe('false');
      expect(gatilhoDe(fixture).getAttribute('aria-haspopup')).toBe('menu');
      expect(fixture.nativeElement.querySelector('.menu-conta-painel').getAttribute('role')).toBe('menu');
    });

    it('should wire the trigger to the panel through aria-controls', async () => {
      await setup();
      const fixture = criar();
      const painel = fixture.nativeElement.querySelector('.menu-conta-painel') as HTMLElement;
      expect(gatilhoDe(fixture).getAttribute('aria-controls')).toBe(painel.id);
      expect(painel.id).toBeTruthy();
    });

    it('should toggle open and closed on trigger click', async () => {
      await setup();
      const fixture = criar();

      abrir(fixture);
      expect(fixture.nativeElement.querySelector('.menu-conta.is-aberto')).toBeTruthy();
      expect(gatilhoDe(fixture).getAttribute('aria-expanded')).toBe('true');

      gatilhoDe(fixture).click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.menu-conta.is-aberto')).toBeNull();
      expect(gatilhoDe(fixture).getAttribute('aria-expanded')).toBe('false');
    });

    // Em iframe largo porque a janela do Karma roda a 765px, dentro do
    // breakpoint compacto: lá o gatilho é `display: none` pelo próprio SCSS do
    // componente e `focus()` não teria efeito sobre um elemento sem caixa.
    it('should close on Escape and return the focus to the trigger', async () => {
      await setup();
      const fixture = criar();
      document.body.appendChild(fixture.nativeElement);
      const viewport = renderizarEmViewport(fixture.nativeElement, 1280);

      try {
        abrir(fixture);
        const painel = fixture.nativeElement.querySelector('.menu-conta-painel') as HTMLElement;
        painel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.menu-conta.is-aberto')).toBeNull();
        expect(viewport.janela.document.activeElement).toBe(gatilhoDe(fixture));
      } finally {
        viewport.destruir();
        document.body.removeChild(fixture.nativeElement);
      }
    });

    // O AppComponent fecha a navbar colapsada em `document:keydown.escape`: sem
    // parar a propagação, o Esc que dispensa este painel fecharia o menu inteiro
    // no mobile.
    it('should not let the Escape reach the document', async () => {
      await setup();
      const fixture = criar();
      document.body.appendChild(fixture.nativeElement);
      const noDocumento = jasmine.createSpy('escapeNoDocumento');
      document.addEventListener('keydown', noDocumento);

      try {
        abrir(fixture);
        const painel = fixture.nativeElement.querySelector('.menu-conta-painel') as HTMLElement;
        painel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(noDocumento).not.toHaveBeenCalled();
      } finally {
        document.removeEventListener('keydown', noDocumento);
        document.body.removeChild(fixture.nativeElement);
      }
    });

    it('should close when clicking outside the component', async () => {
      await setup();
      const fixture = criar();
      document.body.appendChild(fixture.nativeElement);

      try {
        abrir(fixture);
        document.body.click();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.menu-conta.is-aberto')).toBeNull();
      } finally {
        document.body.removeChild(fixture.nativeElement);
      }
    });

    it('should stay open when clicking inside the panel', async () => {
      await setup();
      const fixture = criar();
      document.body.appendChild(fixture.nativeElement);

      try {
        abrir(fixture);
        (fixture.nativeElement.querySelector('.menu-conta-cabecalho') as HTMLElement).click();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.menu-conta.is-aberto')).toBeTruthy();
      } finally {
        document.body.removeChild(fixture.nativeElement);
      }
    });

    // Dispensa legítima: o dropdown não prende o foco, porque é menu e não
    // diálogo modal.
    it('should close when the focus leaves the panel by Tab', async () => {
      await setup();
      const fixture = criar();
      abrir(fixture);

      const painel = fixture.nativeElement.querySelector('.menu-conta-painel') as HTMLElement;
      painel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.menu-conta.is-aberto')).toBeNull();
    });

    it('should close the panel when leaving the compact layout', async () => {
      const ouvintes = await setup(usuarioAdmin, 'light', true);
      const fixture = criar();
      fixture.componentInstance.aberto = true;

      ouvintes[0]({ matches: false } as MediaQueryListEvent);
      fixture.detectChanges();

      expect(fixture.componentInstance.compacto).toBeFalse();
      expect(fixture.componentInstance.aberto).toBeFalse();
    });

    it('should drop the media query listener on destroy', async () => {
      const ouvintes = await setup();
      const fixture = criar();
      expect(ouvintes.length).toBe(1);

      fixture.destroy();
      expect(ouvintes.length).toBe(0);
    });
  });

  describe('navegação por teclado', () => {
    function itensDe(fixture: ComponentFixture<MenuContaComponent>): HTMLElement[] {
      return Array.from(fixture.nativeElement.querySelectorAll('.menu-conta-item')) as HTMLElement[];
    }

    it('should open and focus the first item on ArrowDown from the trigger', async () => {
      await setup();
      const fixture = criar();
      document.body.appendChild(fixture.nativeElement);

      try {
        gatilhoDe(fixture).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('.menu-conta.is-aberto')).toBeTruthy();

        // O foco é adiado até o Angular renderizar a abertura.
        await new Promise(resolve => setTimeout(resolve));
        expect(document.activeElement).toBe(itensDe(fixture)[0]);
      } finally {
        document.body.removeChild(fixture.nativeElement);
      }
    });

    it('should move the focus between items with the arrow keys, wrapping around', async () => {
      await setup();
      const fixture = criar();
      document.body.appendChild(fixture.nativeElement);

      try {
        abrir(fixture);
        const itens = itensDe(fixture);
        const painel = fixture.nativeElement.querySelector('.menu-conta-painel') as HTMLElement;

        itens[0].focus();
        painel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        expect(document.activeElement).toBe(itens[1]);

        painel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
        expect(document.activeElement).toBe(itens[0]);

        // Circular: subir a partir do primeiro chega ao último.
        painel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
        expect(document.activeElement).toBe(itens[itens.length - 1]);
      } finally {
        document.body.removeChild(fixture.nativeElement);
      }
    });

    it('should jump to the first and the last item with Home and End', async () => {
      await setup();
      const fixture = criar();
      document.body.appendChild(fixture.nativeElement);

      try {
        abrir(fixture);
        const itens = itensDe(fixture);
        const painel = fixture.nativeElement.querySelector('.menu-conta-painel') as HTMLElement;

        painel.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
        expect(document.activeElement).toBe(itens[itens.length - 1]);

        painel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
        expect(document.activeElement).toBe(itens[0]);
      } finally {
        document.body.removeChild(fixture.nativeElement);
      }
    });
  });

  describe('ações', () => {
    it('should link to the change password screen and close the panel', async () => {
      await setup();
      const fixture = criar();
      abrir(fixture);

      const link = fixture.nativeElement.querySelector('a[href="/perfil/alterar-senha"]') as HTMLAnchorElement;
      expect(link.textContent).toContain('Alterar senha');

      link.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.menu-conta.is-aberto')).toBeNull();
    });

    it('should delegate the theme change and close the panel', async () => {
      await setup();
      const fixture = criar();
      abrir(fixture);

      const botao = fixture.nativeElement.querySelectorAll('.menu-conta-item')[1] as HTMLButtonElement;
      botao.click();
      fixture.detectChanges();

      expect(stylePreferencesSpy.toggleTheme).toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('.menu-conta.is-aberto')).toBeNull();
    });

    it('should label the theme item to switch to dark while the light theme is active', async () => {
      await setup(usuarioAdmin, 'light');
      const fixture = criar();
      const botao = fixture.nativeElement.querySelectorAll('.menu-conta-item')[1] as HTMLButtonElement;
      expect(botao.textContent).toContain('Tema escuro');
      expect(botao.getAttribute('aria-label')).toBe('Mudar para tema escuro');
      expect(botao.getAttribute('aria-pressed')).toBe('false');
    });

    it('should label the theme item to switch to light while the dark theme is active', async () => {
      await setup(usuarioAdmin, 'dark');
      const fixture = criar();
      const botao = fixture.nativeElement.querySelectorAll('.menu-conta-item')[1] as HTMLButtonElement;
      expect(botao.textContent).toContain('Tema claro');
      expect(botao.getAttribute('aria-label')).toBe('Mudar para tema claro');
      expect(botao.getAttribute('aria-pressed')).toBe('true');
    });

    it('should delegate the logout', async () => {
      await setup();
      const fixture = criar();
      abrir(fixture);

      (fixture.nativeElement.querySelector('.menu-conta-sair') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(authServiceSpy.logout).toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('.menu-conta.is-aberto')).toBeNull();
    });
  });

  describe('layout compacto', () => {
    // Dentro do painel colapsado da navbar o menu vira lista plana: um dropdown
    // ali seria menu dentro de menu. Sem gatilho não há o que anunciar como
    // `menu` — os atributos ARIA saem junto.
    it('should render flat, without menu semantics, in the compact layout', async () => {
      await setup(usuarioAdmin, 'light', true);
      const fixture = criar();

      const gatilho = gatilhoDe(fixture);
      const painel = fixture.nativeElement.querySelector('.menu-conta-painel') as HTMLElement;

      expect(fixture.componentInstance.compacto).toBeTrue();
      expect(gatilho.getAttribute('aria-haspopup')).toBeNull();
      expect(gatilho.getAttribute('aria-expanded')).toBeNull();
      expect(painel.getAttribute('role')).toBeNull();
      expect(fixture.nativeElement.querySelector('.menu-conta-item')?.getAttribute('role')).toBeNull();
    });

    it('should keep the menu semantics in the desktop layout', async () => {
      await setup(usuarioAdmin, 'light', false);
      const fixture = criar();

      expect(fixture.componentInstance.compacto).toBeFalse();
      expect(gatilhoDe(fixture).getAttribute('aria-haspopup')).toBe('menu');
      expect(fixture.nativeElement.querySelector('.menu-conta-item').getAttribute('role')).toBe('menuitem');
    });

    it('should query the media list against the shared breakpoint', async () => {
      await setup();
      criar();
      expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 1024px)');
    });
  });
});
