import { CurrencyPipe, DatePipe } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  RelatorioFinanceiroDTO,
  RelatorioFinanceiroFormatoExportacao
} from '../../../core/models/relatorio';
import { RelatorioService } from '../../../core/services/relatorio.service';
import { extrairMensagemErro } from '../../../shared/utils/api-error';
import { baixarBlob } from '../../../shared/utils/file-download';
import { focarPrimeiroCampo } from '../../../shared/utils/form-focus';
// O teto de 366 dias e a regra `inicio <= fim` são os mesmos do ranking de
// indicadores, e o relatório financeiro da API aplica os dois.
import { periodoDoMesAtual, validarPeriodoRanking } from '../../../shared/utils/indicadores';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';

export const MENSAGEM_SEM_PERMISSAO_FINANCEIRO =
  'Você não tem permissão para acessar o relatório financeiro do estúdio.';

/**
 * Relatório financeiro consolidado do estúdio (issue #268): receita, repasses,
 * inadimplência e resultado líquido de um período, com exportação PDF/XLSX.
 * Todo valor vem pronto da API (carlessopilatesapi#108); a tela não soma nada.
 */
@Component({
  selector: 'app-financeiro-relatorio',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink, CarregandoComponent],
  templateUrl: './financeiro-relatorio.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './financeiro-relatorio.component.scss'
})
export class FinanceiroRelatorioComponent implements OnInit, AfterViewInit {
  form!: FormGroup;
  relatorio: RelatorioFinanceiroDTO | null = null;
  loading = false;
  exportando: RelatorioFinanceiroFormatoExportacao | null = null;
  erroPeriodo: string | null = null;
  erro: string | null = null;

  constructor(
    private relatorioService: RelatorioService,
    private fb: FormBuilder,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    const { inicio, fim } = periodoDoMesAtual();
    this.form = this.fb.group({
      inicio: [inicio, Validators.required],
      fim: [fim, Validators.required]
    });
    this.consultar();
  }

  ngAfterViewInit(): void {
    focarPrimeiroCampo(this.host);
  }

  /** Período sem nenhum movimento: a API devolve zeros, e a tela avisa sem tratar como erro. */
  get semMovimento(): boolean {
    const r = this.relatorio;
    return !!r
      && r.receita.quantidadePagamentos === 0
      && r.repasses.profissionais.length === 0
      && r.inadimplencia.quantidadePagamentos === 0;
  }

  consultar(): void {
    const periodo = this.periodoValido();
    if (!periodo) {
      this.relatorio = null;
      return;
    }

    this.loading = true;
    this.erro = null;
    this.relatorio = null;
    this.relatorioService.relatorioFinanceiro(periodo.inicio, periodo.fim).subscribe({
      next: relatorio => {
        this.relatorio = relatorio;
        this.loading = false;
      },
      error: (err: unknown) => {
        this.erro = this.mensagemErro(err, 'Erro ao carregar o relatório financeiro.');
        this.loading = false;
      }
    });
  }

  exportar(formato: RelatorioFinanceiroFormatoExportacao): void {
    const periodo = this.periodoValido();
    if (!periodo) return;

    const rotulo = formato === 'pdf' ? 'PDF' : 'Excel';
    const fallbackNomeArquivo = `relatorio-financeiro-${periodo.inicio}-${periodo.fim}.${formato}`;

    this.exportando = formato;
    this.erro = null;
    this.relatorioService.exportarRelatorioFinanceiro(periodo.inicio, periodo.fim, formato).subscribe({
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
        this.erro = this.mensagemErro(err, `Erro ao exportar o relatório em ${rotulo}.`);
        this.exportando = null;
      }
    });
  }

  private periodoValido(): { inicio: string; fim: string } | null {
    const { inicio, fim } = this.form.value as { inicio: string; fim: string };
    this.erroPeriodo = validarPeriodoRanking(inicio, fim);
    if (this.erroPeriodo) {
      this.form.markAllAsTouched();
      return null;
    }
    return { inicio, fim };
  }

  /**
   * O `403` chega aqui (o serviço marca `TRATA_403_LOCALMENTE`) para a tela
   * explicar a falta de permissão em vez de trocar de página. Na exportação o
   * corpo de erro é um `Blob`, então o restante cai no `fallback`.
   */
  private mensagemErro(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse && err.status === 403) {
      return MENSAGEM_SEM_PERMISSAO_FINANCEIRO;
    }
    return extrairMensagemErro(err, fallback);
  }
}
