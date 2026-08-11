import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AulaService } from '../../../core/services/aula.service';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { AulaResponseDTO } from '../../../core/models/plano';
import { ProfissionalResponseDTO } from '../../../core/models/profissional';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { extrairMensagemErro } from '../../../shared/utils/api-error';
import { ConfirmarDialogComponent } from '../../../shared/components/confirmar-dialog/confirmar-dialog.component';

/**
 * Largura a partir da qual a tabela vira cards (mesmo valor do media query do
 * SCSS). Abaixo dela o contêiner não rola na horizontal e, por isso, não deve
 * ser parada de tabulação nem região anunciada (issue #164).
 */
const CARD_MODE_MAX_WIDTH = 640;

/**
 * `yyyy-MM-dd`, o formato que o `input[type=date]` produz e o único que o
 * `LocalDate` do backend aceita. O campo nativo parece impedir qualquer outra
 * coisa, mas aceita ano de até seis dígitos: digitar `20261` no segmento de ano
 * gera `20261-05-12`, que passaria por uma checagem de obrigatoriedade e voltaria
 * como `400 Dados inválidos` — erro que não diz nada a quem está remarcando.
 */
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

@Component({
  selector: 'app-aula-list',
  imports: [DatePipe, FormsModule, RouterLink, ConfirmarDialogComponent, BreadcrumbComponent],
  templateUrl: './aula-list.component.html',
  styleUrl: './aula-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AulaListComponent implements OnInit, OnDestroy {
  pacienteId: number | null = null;
  pagamentoId: number | null = null;
  aulas: AulaResponseDTO[] = [];
  profissionais: ProfissionalResponseDTO[] = [];
  profissionalSelecionadoPorAula: Record<number, number | null> = {};
  selectInvalidoPorAula: Record<number, boolean> = {};
  confirmarAulaId: number | null = null;
  remarcarAulaId: number | null = null;
  remarcarData = '';
  remarcarDataInvalida = false;
  remarcarErro: string | null = null;
  acaoEmAndamento = false;
  loading = false;
  erro: string | null = null;
  sucesso: string | null = null;
  titulo = 'Aulas';
  subtitulo: string | null = null;
  modoCard = false;
  private successTimer: ReturnType<typeof setTimeout> | null = null;
  private cardModeQuery: MediaQueryList | null = null;
  @ViewChild('remarcarDataInput') private remarcarDataInput?: ElementRef<HTMLInputElement>;
  private readonly onCardModeChange = (evento: MediaQueryListEvent): void => {
    this.modoCard = evento.matches;
    this.cdr.markForCheck();
  };

  constructor(
    private service: AulaService,
    private pagamentoService: PagamentoService,
    private profissionalService: ProfissionalService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.cardModeQuery = window.matchMedia(`(max-width: ${CARD_MODE_MAX_WIDTH}px)`);
    this.modoCard = this.cardModeQuery.matches;
    this.cardModeQuery.addEventListener('change', this.onCardModeChange);

    const rawPacienteId = this.route.snapshot.paramMap.get('pacienteId');
    const rawPagamentoId = this.route.snapshot.paramMap.get('pagamentoId');

    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    this.pagamentoId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pagamentoId');
    this.titulo = this.pagamentoId !== null ? 'Aulas do Pagamento' : 'Aulas do Paciente';

    if ((rawPacienteId !== null && this.pacienteId === null) || (rawPagamentoId !== null && this.pagamentoId === null)) {
      this.erro = 'Identificador inválido.';
      return;
    }

    if (this.pacienteId === null && this.pagamentoId === null) {
      this.erro = 'Identificador inválido.';
      return;
    }

    this.carregarProfissionais();

    if (this.pagamentoId !== null) {
      this.loading = true;
      this.erro = null;
      this.pagamentoService.buscar(this.pagamentoId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: pagamento => {
          this.pacienteId = pagamento.pacienteId;
          // Referência do pagamento + nome do paciente no cabeçalho (issue #143).
          this.subtitulo = pagamento.pacienteNome
            ? `Pagamento #${pagamento.id} · ${pagamento.pacienteNome}`
            : `Pagamento #${pagamento.id}`;
          this.carregar();
        },
        error: () => {
          this.erro = 'Erro ao carregar dados do pagamento.';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
    } else {
      this.carregar();
    }
  }

  ngOnDestroy(): void {
    if (this.successTimer !== null) {
      clearTimeout(this.successTimer);
    }

    this.cardModeQuery?.removeEventListener('change', this.onCardModeChange);
  }

  carregarProfissionais(): void {
    this.profissionalService.listar(0, 100).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: page => {
        this.profissionais = page.content;
        this.cdr.markForCheck();
      },
      error: () => {
        this.erro = 'Erro ao carregar profissionais.';
        this.cdr.markForCheck();
      }
    });
  }

  carregar(): void {
    if (this.pacienteId === null && this.pagamentoId === null) {
      this.erro = 'Identificador inválido.';
      return;
    }
    this.loading = true;
    this.erro = null;
    const request$ = this.pagamentoId !== null
      ? this.service.listarPorPagamento(this.pagamentoId)
      : this.service.listarPorPaciente(this.pacienteId!);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: aulas => {
        this.aulas = aulas;
        // Rota por paciente: nome vem do DTO da aula (issue #143). Na rota por pagamento o
        // subtítulo já foi definido com a referência do pagamento e não deve ser sobrescrito.
        if (this.pagamentoId === null) {
          this.subtitulo = aulas[0]?.pacienteNome ?? null;
        }
        this.profissionalSelecionadoPorAula = aulas.reduce<Record<number, number | null>>((acc, aula) => {
          acc[aula.id] = aula.profissionalId ?? null;
          return acc;
        }, {});
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.erro = 'Erro ao carregar aulas.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  trackByAula(_: number, aula: AulaResponseDTO): number {
    return aula.id;
  }

  get aulaEmConfirmacao(): AulaResponseDTO | null {
    if (this.confirmarAulaId === null) return null;
    return this.aulas.find(aula => aula.id === this.confirmarAulaId) ?? null;
  }

  get aulaEmRemarcacao(): AulaResponseDTO | null {
    if (this.remarcarAulaId === null) return null;
    return this.aulas.find(aula => aula.id === this.remarcarAulaId) ?? null;
  }

  get profissionalEmConfirmacaoNome(): string {
    const aula = this.aulaEmConfirmacao;
    if (aula === null) return '';
    const profissionalId = this.profissionalSelecionadoPorAula[aula.id];
    return this.profissionais.find(profissional => profissional.id === profissionalId)?.nome ?? '';
  }

  aoSelecionarProfissional(id: number): void {
    if (!this.selectInvalidoPorAula[id]) return;
    this.selectInvalidoPorAula[id] = false;
    this.erro = null;
  }

  solicitarRealizar(id: number): void {
    if (this.acaoEmAndamento) return;

    const profissionalId = this.profissionalSelecionadoPorAula[id];
    if (!profissionalId) {
      this.selectInvalidoPorAula[id] = true;
      this.erro = 'Selecione um profissional para marcar a aula como realizada.';
      return;
    }

    this.selectInvalidoPorAula[id] = false;
    this.erro = null;
    this.confirmarAulaId = id;
  }

  cancelarConfirmacao(): void {
    if (this.acaoEmAndamento) return;
    this.confirmarAulaId = null;
  }

  confirmarRealizar(): void {
    if (this.confirmarAulaId === null || this.acaoEmAndamento) return;

    const id = this.confirmarAulaId;
    const profissionalId = this.profissionalSelecionadoPorAula[id];
    if (!profissionalId) {
      this.selectInvalidoPorAula[id] = true;
      this.erro = 'Selecione um profissional para marcar a aula como realizada.';
      this.confirmarAulaId = null;
      return;
    }

    this.acaoEmAndamento = true;
    this.service.realizar(id, profissionalId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.acaoEmAndamento = false;
        this.confirmarAulaId = null;
        this.exibirSucesso('Aula marcada como realizada.');
        this.carregar();
      },
      error: () => {
        this.acaoEmAndamento = false;
        this.confirmarAulaId = null;
        this.erro = 'Erro ao marcar aula como realizada.';
        this.cdr.markForCheck();
      }
    });
  }

  solicitarRemarcar(aula: AulaResponseDTO): void {
    if (this.acaoEmAndamento) return;

    this.remarcarAulaId = aula.id;
    // O campo abre na data atual da aula: remarcar costuma ser mover um ou dois
    // dias, e partir do valor vigente poupa a digitação inteira.
    this.remarcarData = aula.data;
    this.remarcarDataInvalida = false;
    this.remarcarErro = null;
    this.erro = null;
  }

  aoAlterarDataRemarcacao(): void {
    this.remarcarDataInvalida = false;
    // A recusa era sobre a data anterior; mantê-la ao lado de um campo já
    // alterado afirmaria de novo algo que deixou de valer.
    this.remarcarErro = null;
  }

  cancelarRemarcar(): void {
    if (this.acaoEmAndamento) return;
    this.remarcarAulaId = null;
  }

  confirmarRemarcar(): void {
    if (this.remarcarAulaId === null || this.acaoEmAndamento) return;

    // Obrigatoriedade e formato. Data passada não é validada aqui de propósito: a
    // API a aceita, para registrar reposições já ocorridas.
    if (!DATA_ISO.test(this.remarcarData)) {
      this.remarcarDataInvalida = true;
      this.remarcarErro = null;
      // Sem mover o foco, quem usa teclado ou leitor de tela fica no botão de
      // confirmar e não recebe aviso nenhum: a mensagem está ligada ao campo por
      // `aria-describedby`, que só é lido quando ele ganha foco.
      this.remarcarDataInput?.nativeElement.focus();
      return;
    }

    const aula = this.aulaEmRemarcacao;
    // Confirmar sem trocar a data é o caminho de um Enter distraído: o diálogo
    // abre com a data atual e o foco já no botão. A API trata como no-op e
    // responde 200, mas o PATCH e o recarregamento da lista seriam desperdício.
    if (aula !== null && this.remarcarData === aula.data) {
      this.remarcarAulaId = null;
      return;
    }

    const id = this.remarcarAulaId;
    this.acaoEmAndamento = true;
    this.remarcarErro = null;
    this.erro = null;
    this.service.remarcar(id, this.remarcarData).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.acaoEmAndamento = false;
        this.remarcarAulaId = null;
        this.exibirSucesso('Aula remarcada.');
        // Sem `markForCheck` o diálogo continuaria na tela, congelado no estado
        // "processando", até a resposta do recarregamento: o callback do HTTP não
        // marca a view OnPush como suja.
        this.cdr.markForCheck();
        // Recarrega em vez de trocar a aula na lista: a data é o critério de
        // ordenação da listagem, e a aula remarcada muda de lugar.
        this.carregar();
      },
      error: err => {
        this.acaoEmAndamento = false;
        // O diálogo fica aberto com o motivo dentro: o 409 diz por que a data não
        // serve (aula já realizada, paciente já tem aula no dia) e existe para que
        // se escolha outra ali mesmo. Fechar e jogar o texto na faixa do topo
        // desfaria isso — reabrir o diálogo limparia a mensagem e devolveria o
        // campo à data original, apagando o aviso na hora exata de agir sobre ele.
        this.remarcarErro = extrairMensagemErro(err, 'Erro ao remarcar aula.');
        this.cdr.markForCheck();
      }
    });
  }

  private exibirSucesso(mensagem: string): void {
    this.sucesso = mensagem;
    if (this.successTimer !== null) {
      clearTimeout(this.successTimer);
    }
    this.successTimer = setTimeout(() => {
      this.sucesso = null;
      this.cdr.markForCheck();
    }, 4000);
  }
}
