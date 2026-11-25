import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, forkJoin, map, of, switchMap } from 'rxjs';
import {
  FORMA_RECEBIMENTO_LABEL,
  FORMA_RECEBIMENTO_OPCOES,
  FormaRecebimento,
  RelatorioRecebimentosDTO,
  RelatorioRecebimentosFiltros,
  RelatorioRecebimentosFormatoExportacao
} from '../../../core/models/relatorio-recebimentos';
import { FREQUENCIA_LABEL } from '../../../core/models/plano';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { PacienteService } from '../../../core/services/paciente.service';
import { RelatorioService } from '../../../core/services/relatorio.service';
import { extrairMensagemErro, extrairMensagemErroBlob } from '../../../shared/utils/api-error';
import { baixarBlob } from '../../../shared/utils/file-download';
import { focarPrimeiroCampo } from '../../../shared/utils/form-focus';
// Mesmo teto de 366 dias e mesma regra `inicio <= fim` que a API aplica.
import { periodoDoMesAtual, validarPeriodoRanking } from '../../../shared/utils/indicadores';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';

export const MENSAGEM_SEM_PERMISSAO_RECEBIMENTOS =
  'Você não tem permissão para acessar o relatório de recebimentos.';

/** Mesmos números da busca de paciente da inadimplência e da lista de espera. */
const TAMANHO_MINIMO_TERMO = 2;
const DEBOUNCE_MS = 300;
const TAMANHO_SUGESTOES = 8;

interface ConsultaRecebimentos {
  inicio: string;
  fim: string;
  filtros: RelatorioRecebimentosFiltros;
}

/**
 * Recebimentos do período (issue #289): quem pagou, por data de pagamento, com
 * totais por forma. Valores e totais vêm prontos da API (carlessopilatesapi#231),
 * com o mesmo critério de receita do relatório financeiro; a tela não soma nada.
 */
@Component({
  selector: 'app-recebimentos-relatorio',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink, CarregandoComponent],
  templateUrl: './recebimentos-relatorio.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './recebimentos-relatorio.component.scss'
})
export class RecebimentosRelatorioComponent implements OnInit, AfterViewInit {
  private readonly relatorioService = inject(RelatorioService);
  private readonly pacienteService = inject(PacienteService);
  private readonly fb = inject(FormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly formas = FORMA_RECEBIMENTO_OPCOES;
  readonly formaLabel = FORMA_RECEBIMENTO_LABEL;
  readonly frequenciaLabel = FREQUENCIA_LABEL;
  readonly listaSugestoesId = 'recebimentos-sugestoes-paciente';

  form!: FormGroup;
  readonly busca = new FormControl('', { nonNullable: true });
  sugestoes: PacienteResponseDTO[] = [];
  pacienteSelecionado: PacienteResponseDTO | null = null;
  buscando = false;
  buscaFalhou = false;

  relatorio: RelatorioRecebimentosDTO | null = null;
  /** A exportação usa o último filtro consultado, para o arquivo bater com a tabela. */
  private consultaAplicada: ConsultaRecebimentos | null = null;
  loading = false;
  exportando: RelatorioRecebimentosFormatoExportacao | null = null;
  erroPeriodo: string | null = null;
  erro: string | null = null;

  ngOnInit(): void {
    const { inicio, fim } = periodoDoMesAtual();
    this.form = this.fb.group({
      inicio: [inicio, Validators.required],
      fim: [fim, Validators.required],
      formaPagamento: ['' as FormaRecebimento | '']
    });
    this.observarBusca();
    this.consultar();
  }

  ngAfterViewInit(): void {
    focarPrimeiroCampo(this.host);
  }

  get semRecebimentos(): boolean {
    return !!this.relatorio && this.relatorio.recebimentos.length === 0;
  }

  consultar(): void {
    const consulta = this.consultaDoFormulario();
    if (!consulta) {
      this.relatorio = null;
      this.consultaAplicada = null;
      return;
    }

    this.loading = true;
    this.erro = null;
    this.relatorio = null;
    this.relatorioService.relatorioRecebimentos(consulta.inicio, consulta.fim, consulta.filtros).subscribe({
      next: relatorio => {
        this.relatorio = relatorio;
        this.consultaAplicada = consulta;
        this.loading = false;
      },
      error: (err: unknown) => {
        this.erro = this.mensagemErro(err, 'Erro ao carregar o relatório de recebimentos.');
        this.consultaAplicada = null;
        this.loading = false;
      }
    });
  }

  exportar(formato: RelatorioRecebimentosFormatoExportacao): void {
    const consulta = this.consultaAplicada;
    if (!consulta || this.exportando) return;

    const rotulo = formato === 'pdf' ? 'PDF' : 'Excel';
    const fallbackNomeArquivo = `relatorio-recebimentos-${consulta.inicio}-${consulta.fim}.${formato}`;

    this.exportando = formato;
    this.erro = null;
    this.relatorioService
      .exportarRelatorioRecebimentos(consulta.inicio, consulta.fim, formato, consulta.filtros)
      .subscribe({
        next: response => {
          try {
            baixarBlob(response, fallbackNomeArquivo);
          } catch {
            this.erro = `Erro ao exportar o relatório em ${rotulo}.`;
          } finally {
            this.exportando = null;
          }
        },
        error: (err: unknown) => {
          const fallback = `Erro ao exportar o relatório em ${rotulo}.`;
          if (err instanceof HttpErrorResponse && err.status === 403) {
            this.erro = MENSAGEM_SEM_PERMISSAO_RECEBIMENTOS;
            this.exportando = null;
            return;
          }
          // Na exportação o corpo do erro chega como Blob: o `detail` da API
          // (ex.: teto de linhas) precisa ser lido antes de aparecer.
          void extrairMensagemErroBlob(err, fallback).then(mensagem => {
            this.erro = mensagem;
            this.exportando = null;
            this.cdr.markForCheck();
          });
        }
      });
  }

  selecionarPaciente(paciente: PacienteResponseDTO): void {
    this.pacienteSelecionado = paciente;
    this.sugestoes = [];
    this.busca.setValue('');
  }

  limparPaciente(): void {
    this.pacienteSelecionado = null;
    this.sugestoes = [];
    this.busca.setValue('');
  }

  private consultaDoFormulario(): ConsultaRecebimentos | null {
    const { inicio, fim, formaPagamento } = this.form.value as {
      inicio: string;
      fim: string;
      formaPagamento: FormaRecebimento | '';
    };
    this.erroPeriodo = validarPeriodoRanking(inicio, fim);
    if (this.erroPeriodo) {
      this.form.markAllAsTouched();
      return null;
    }
    return {
      inicio,
      fim,
      filtros: {
        formaPagamento: formaPagamento || null,
        pacienteId: this.pacienteSelecionado?.id ?? null
      }
    };
  }

  /**
   * Busca de paciente com debounce, como na inadimplência. Inclui inativos,
   * porque o relatório lista quem pagou no período mesmo que já tenha saído.
   */
  private observarBusca(): void {
    this.busca.valueChanges
      .pipe(
        map(termo => termo.trim()),
        distinctUntilChanged(),
        debounceTime(DEBOUNCE_MS),
        switchMap(termo => {
          if (termo.length < TAMANHO_MINIMO_TERMO) {
            this.buscando = false;
            this.buscaFalhou = false;
            return of<PacienteResponseDTO[] | null>([]);
          }
          this.buscando = true;
          this.buscaFalhou = false;
          // `GET /pacientes` sem `ativo` traz só os ativos: busca as duas situações.
          return forkJoin([
            this.pacienteService.listar(0, TAMANHO_SUGESTOES, { nome: termo, ativo: true }, 'nome'),
            this.pacienteService.listar(0, TAMANHO_SUGESTOES, { nome: termo, ativo: false }, 'nome')
          ]).pipe(
            map(([ativos, inativos]) =>
              [...ativos.content, ...inativos.content]
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
                .slice(0, TAMANHO_SUGESTOES)
            ),
            catchError(() => of(null))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(pacientes => {
        this.buscando = false;
        this.buscaFalhou = pacientes === null;
        this.sugestoes = pacientes ?? [];
      });
  }

  /** O `403` chega aqui (`TRATA_403_LOCALMENTE`) para a tela explicar a falta de permissão. */
  private mensagemErro(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse && err.status === 403) {
      return MENSAGEM_SEM_PERMISSAO_RECEBIMENTOS;
    }
    return extrairMensagemErro(err, fallback);
  }
}
