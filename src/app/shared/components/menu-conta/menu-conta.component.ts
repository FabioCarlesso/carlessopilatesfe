import { NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { AuthenticatedUser } from '../../../core/models/auth';
import { ROLE_LABEL } from '../../../core/models/usuario-admin';
import { AuthService } from '../../../core/services/auth.service';
import { StylePreferencesService } from '../../../core/services/style-preferences.service';
import { MEDIA_QUERY_COMPACTO } from '../../utils/breakpoints';

// Itens focáveis do painel, na ordem em que aparecem. Consultado a cada
// navegação por seta em vez de guardado numa lista: os itens são poucos e
// estáveis, mas o de tema é o único que troca de rótulo, e reconsultar evita
// manter cache sincronizado à toa.
const SELETOR_ITENS = '.menu-conta-item';

@Component({
  selector: 'app-menu-conta',
  imports: [NgIf, RouterLink],
  templateUrl: './menu-conta.component.html',
  styleUrl: './menu-conta.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuContaComponent implements OnInit {
  @ViewChild('gatilho') private gatilho?: ElementRef<HTMLButtonElement>;

  readonly painelId = 'menu-conta-painel';

  aberto = false;

  // Usuário autenticado exibido no gatilho e no cabeçalho do painel; `null`
  // quando não há sessão válida (ausente ou corrompida no localStorage), caso em
  // que o componente segue funcional e apenas omite a identificação.
  //
  // Resolvido uma vez por navegação — e não na interpolação do template —
  // porque `getCurrentUser()` faz `JSON.parse` + validação a cada chamada e o
  // template reavalia a cada ciclo de detecção de mudanças. Login e logout
  // sempre passam por uma navegação, então o valor acompanha a sessão.
  usuario: AuthenticatedUser | null = null;

  // O layout compacto renderiza o painel como lista plana, sem gatilho: um
  // dropdown dentro do painel colapsado da navbar seria um menu dentro de menu.
  // A troca vive aqui, e não só no media query, porque a semântica ARIA muda
  // junto (ver `aria-haspopup`/`role` no template) e CSS não altera atributo.
  compacto = false;

  constructor(
    private authService: AuthService,
    private stylePreferences: StylePreferencesService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private destroyRef: DestroyRef,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.resolverUsuario();

    this.router.events
      .pipe(
        filter(evento => evento instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.resolverUsuario();
        this.cdr.markForCheck();
      });

    const consulta = window.matchMedia(MEDIA_QUERY_COMPACTO);
    this.compacto = consulta.matches;
    const aoMudar = (evento: MediaQueryListEvent) => {
      this.compacto = evento.matches;
      // Ao voltar para o desktop o painel precisa reabrir fechado: no compacto
      // ele fica sempre visível, e herdar `aberto = true` deixaria o dropdown
      // aberto sem que o usuário tenha clicado no gatilho.
      this.aberto = false;
      this.cdr.markForCheck();
    };
    consulta.addEventListener('change', aoMudar);
    this.destroyRef.onDestroy(() => consulta.removeEventListener('change', aoMudar));
  }

  get nome(): string {
    return this.usuario?.name ?? '';
  }

  /**
   * Primeiro nome, usado no gatilho. O nome completo fica no cabeçalho do painel:
   * exibi-lo na barra é o que obrigava a truncar com reticências e ainda assim
   * espremia a navegação (issue #219).
   */
  get primeiroNome(): string {
    return this.nome.trim().split(/\s+/)[0] ?? '';
  }

  get perfil(): string {
    return this.usuario ? ROLE_LABEL[this.usuario.role] : '';
  }

  get temaEscuro(): boolean {
    return this.stylePreferences.current.theme === 'dark';
  }

  get rotuloTema(): string {
    return this.temaEscuro ? 'Tema claro' : 'Tema escuro';
  }

  get rotuloAcessivelTema(): string {
    return this.temaEscuro ? 'Mudar para tema claro' : 'Mudar para tema escuro';
  }

  /**
   * Iniciais do avatar: primeira letra do primeiro e do último nome, ou apenas
   * a primeira letra quando o nome tem uma palavra só. Sem nome resolvido devolve
   * vazio — o template esconde o avatar nesse caso.
   *
   * `toLocaleUpperCase('pt-BR')` preserva acentuação (o "Á" de "Ávila" continua
   * sendo uma letra só) e a fatia usa spread para não partir pares substitutos.
   */
  get iniciais(): string {
    const palavras = this.nome.trim().split(/\s+/).filter(Boolean);
    if (palavras.length === 0) return '';

    const primeira = [...palavras[0]][0] ?? '';
    const ultima = palavras.length > 1 ? ([...palavras[palavras.length - 1]][0] ?? '') : '';

    return `${primeira}${ultima}`.toLocaleUpperCase('pt-BR');
  }

  alternar(): void {
    this.aberto = !this.aberto;
  }

  fechar(): void {
    this.aberto = false;
  }

  alternarTema(): void {
    this.stylePreferences.toggleTheme();
    this.fechar();
  }

  sair(): void {
    this.fechar();
    this.authService.logout();
  }

  aoTeclarNoGatilho(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.aberto = true;
      // O foco é adiado porque os itens só existem no DOM depois que o Angular
      // renderiza a abertura; focar ainda dentro do keydown não acharia nada.
      const posicao = event.key === 'ArrowDown' ? 0 : -1;
      setTimeout(() => this.focarItem(posicao));
    }
  }

  aoTeclarNoPainel(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      // O AppComponent fecha a navbar colapsada em `document:keydown.escape`; sem
      // parar a propagação, o Esc que dispensa este painel fecharia o menu inteiro
      // no mobile — mesmo cuidado tomado na busca global.
      event.stopPropagation();
      this.fechar();
      this.gatilho?.nativeElement.focus();
      return;
    }

    if (event.key === 'Tab') {
      // Sair do painel por Tab é uma dispensa legítima: o dropdown não prende o
      // foco (é menu, não diálogo modal).
      this.fechar();
      return;
    }

    const itens = this.itens();
    if (itens.length === 0) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const passo = event.key === 'ArrowDown' ? 1 : -1;
      const atual = itens.indexOf(document.activeElement as HTMLElement);
      this.focarItem(atual + passo);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      this.focarItem(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      this.focarItem(-1);
    }
  }

  @HostListener('document:click', ['$event'])
  aoClicarNoDocumento(event: MouseEvent): void {
    if (!this.aberto) return;
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.fechar();
      this.cdr.markForCheck();
    }
  }

  private itens(): HTMLElement[] {
    return Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>(SELETOR_ITENS));
  }

  // Índice circular: -1 chega no último item e o passo além do fim volta ao começo.
  private focarItem(indice: number): void {
    const itens = this.itens();
    if (itens.length === 0) return;
    const total = itens.length;
    itens[((indice % total) + total) % total].focus();
  }

  private resolverUsuario(): void {
    this.usuario = this.authService.getCurrentUser();
  }
}
