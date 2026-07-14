import { NgFor, NgIf } from '@angular/common';
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
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, catchError, combineLatest, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { PacienteFiltro, PacienteService } from '../../../core/services/paciente.service';
import { ProfissionalService } from '../../../core/services/profissional.service';

export type BuscaGlobalTipo = 'paciente' | 'profissional';

export interface BuscaGlobalResultado {
  tipo: BuscaGlobalTipo;
  id: number;
  nome: string;
  detalhe: string;
}

// Uma falha de rede não pode ser confundida com "não existe": cada ramo devolve o erro
// em vez de uma lista vazia, e a UI distingue os dois estados.
interface BuscaParcial {
  resultados: BuscaGlobalResultado[];
  falhou: boolean;
}

// Termos muito curtos trariam praticamente a base inteira; o debounce evita uma
// requisição por tecla digitada.
const TAMANHO_MINIMO_TERMO = 2;
const DEBOUNCE_MS = 300;
// Busca de acesso rápido: poucos resultados por tipo bastam para o fluxo da recepção.
const TAMANHO_PAGINA = 5;

const ROTA_POR_TIPO: Record<BuscaGlobalTipo, string> = {
  paciente: '/pacientes',
  profissional: '/profissionais'
};

const VAZIO: BuscaParcial = { resultados: [], falhou: false };

@Component({
  selector: 'app-busca-global',
  imports: [NgIf, NgFor, ReactiveFormsModule],
  templateUrl: './busca-global.component.html',
  styleUrl: './busca-global.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BuscaGlobalComponent implements OnInit {
  @ViewChild('campoBusca') private campoBusca?: ElementRef<HTMLInputElement>;

  readonly termo = new FormControl('', { nonNullable: true });
  readonly listaId = 'busca-global-resultados';

  resultados: BuscaGlobalResultado[] = [];
  buscando = false;
  erro = false;
  aberto = false;
  indiceAtivo = -1;
  private termoBuscado = '';

  constructor(
    private pacienteService: PacienteService,
    private profissionalService: ProfissionalService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private destroyRef: DestroyRef,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.termo.valueChanges
      .pipe(
        debounceTime(DEBOUNCE_MS),
        map(valor => valor.trim()),
        distinctUntilChanged(),
        switchMap(termo => {
          this.termoBuscado = termo;

          if (termo.length < TAMANHO_MINIMO_TERMO) {
            this.buscando = false;
            this.erro = false;
            this.cdr.markForCheck();
            return of(VAZIO);
          }

          this.buscando = true;
          this.erro = false;
          this.aberto = true;
          this.cdr.markForCheck();
          return this.buscar(termo);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ resultados, falhou }) => {
        this.resultados = resultados;
        // Com resultados parciais preferimos mostrá-los a bloquear a tela com o erro.
        this.erro = falhou && resultados.length === 0;
        this.buscando = false;
        this.indiceAtivo = -1;
        this.aberto = this.termoValido;
        this.cdr.markForCheck();
      });
  }

  get termoValido(): boolean {
    return this.termoBuscado.length >= TAMANHO_MINIMO_TERMO;
  }

  get semResultados(): boolean {
    return this.aberto && !this.buscando && !this.erro && this.termoValido && this.resultados.length === 0;
  }

  get mensagemStatus(): string {
    if (this.buscando) return 'Buscando...';
    if (this.erro) return 'Não foi possível buscar agora. Tente novamente.';
    if (this.semResultados) return 'Nenhum resultado encontrado.';
    return '';
  }

  idOpcao(indice: number): string {
    return `busca-global-opcao-${indice}`;
  }

  aoFocar(): void {
    if (this.termoValido) {
      this.aberto = true;
    }
  }

  aoTeclar(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      // O AppComponent fecha a navbar colapsada em `document:keydown.escape`; sem parar a
      // propagação, o Esc que dispensa o dropdown fecharia o menu inteiro no mobile.
      event.stopPropagation();
      this.fechar();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (this.resultados.length === 0) return;
      event.preventDefault();
      this.aberto = true;
      const passo = event.key === 'ArrowDown' ? 1 : -1;
      const total = this.resultados.length;
      this.indiceAtivo = (this.indiceAtivo + passo + total) % total;
      return;
    }

    if (event.key === 'Enter') {
      const resultado = this.resultados[this.indiceAtivo];
      if (!resultado) return;
      event.preventDefault();
      this.selecionar(resultado);
    }
  }

  selecionar(resultado: BuscaGlobalResultado): void {
    this.limpar();
    this.router.navigate([ROTA_POR_TIPO[resultado.tipo], resultado.id]);
  }

  fechar(): void {
    this.aberto = false;
    this.indiceAtivo = -1;
  }

  // Atalhos globais de foco: `/` (fora de campos de texto) e `Ctrl/Cmd+K`.
  @HostListener('document:keydown', ['$event'])
  aoTeclarNoDocumento(event: KeyboardEvent): void {
    const atalhoCtrlK = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
    const atalhoBarra = event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !this.digitandoEmCampo();

    if (!atalhoCtrlK && !atalhoBarra) return;

    event.preventDefault();
    this.campoBusca?.nativeElement.focus();
  }

  @HostListener('document:click', ['$event'])
  aoClicarNoDocumento(event: MouseEvent): void {
    if (!this.aberto) return;
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.fechar();
      this.cdr.markForCheck();
    }
  }

  // O reset emite no stream de propósito: sem isso o `distinctUntilChanged` ignoraria
  // uma nova digitação do mesmo termo logo após a seleção anterior.
  private limpar(): void {
    this.termoBuscado = '';
    this.termo.setValue('');
    this.resultados = [];
    this.buscando = false;
    this.erro = false;
    this.fechar();
  }

  private digitandoEmCampo(): boolean {
    const ativo = document.activeElement;
    if (!(ativo instanceof HTMLElement)) return false;
    return (
      ativo instanceof HTMLInputElement ||
      ativo instanceof HTMLTextAreaElement ||
      ativo instanceof HTMLSelectElement ||
      ativo.isContentEditable
    );
  }

  private buscar(termo: string): Observable<BuscaParcial> {
    // Sem `ativo` no filtro a API devolve apenas registros ativos, mesmo padrão das
    // listagens de pacientes e profissionais.
    const pacientes$ = this.pacienteService.listar(0, TAMANHO_PAGINA, this.filtroPaciente(termo)).pipe(
      map(page => ({
        resultados: (page.content ?? []).map<BuscaGlobalResultado>(paciente => ({
          tipo: 'paciente' as const,
          id: paciente.id,
          nome: paciente.nome,
          detalhe: paciente.cpf
        })),
        falhou: false
      })),
      catchError(() => of({ resultados: [], falhou: true } as BuscaParcial))
    );

    // Profissionais são restritos a ADMIN no backend; para os demais perfis a
    // requisição sequer é disparada, evitando um 403 e o redirecionamento global.
    // O endpoint também não filtra por CPF, então termos numéricos ficam de fora.
    const profissionais$: Observable<BuscaParcial> =
      this.authService.isAdmin() && !this.pareceCpf(termo)
        ? this.profissionalService.listar(0, TAMANHO_PAGINA, { nome: termo }).pipe(
            map(page => ({
              resultados: (page.content ?? []).map<BuscaGlobalResultado>(profissional => ({
                tipo: 'profissional' as const,
                id: profissional.id,
                nome: profissional.nome,
                detalhe: profissional.email
              })),
              falhou: false
            })),
            catchError(() => of({ resultados: [], falhou: true } as BuscaParcial))
          )
        : of(VAZIO);

    return combineLatest([pacientes$, profissionais$]).pipe(
      map(([pacientes, profissionais]) => ({
        resultados: [...pacientes.resultados, ...profissionais.resultados],
        falhou: pacientes.falhou || profissionais.falhou
      }))
    );
  }

  // O filtro `cpf` da API é `LIKE %termo%` sobre o valor gravado, que o cadastro guarda
  // exatamente como digitado (com ou sem máscara). Por isso o termo vai como veio: normalizar
  // para só dígitos faria "12345678901" deixar de casar com um "123.456.789-01" gravado.
  private filtroPaciente(termo: string): PacienteFiltro {
    return this.pareceCpf(termo) ? { cpf: termo } : { nome: termo };
  }

  private pareceCpf(termo: string): boolean {
    return /^[\d.\-\s]+$/.test(termo) && /\d/.test(termo);
  }
}
