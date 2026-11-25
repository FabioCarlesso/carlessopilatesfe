import { DatePipe, DecimalPipe } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  inject
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  RelatorioFrequenciaDTO,
  RelatorioFrequenciaFiltros,
  RelatorioFrequenciaPaciente
} from '../../../core/models/relatorio-frequencia';
import { ProfissionalResponseDTO } from '../../../core/models/profissional';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { RelatorioService } from '../../../core/services/relatorio.service';
import { extrairMensagemErro, extrairMensagemErroBlob } from '../../../shared/utils/api-error';
import { baixarBlob } from '../../../shared/utils/file-download';
import { focarPrimeiroCampo } from '../../../shared/utils/form-focus';
// Mesmo teto de 366 dias e mesma regra `inicio <= fim` que a API aplica.
import { periodoDoMesAtual, validarPeriodoRanking } from '../../../shared/utils/indicadores';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';

export const MENSAGEM_SEM_PERMISSAO_FREQUENCIA =
  'Você não tem permissão para acessar o relatório de frequência.';

interface ConsultaFrequencia {
  inicio: string;
  fim: string;
  filtros: RelatorioFrequenciaFiltros;
}

interface FiltrosForm {
  inicio: string;
  fim: string;
  profissionalId: number | null;
  taxaMaxima: number | string | null;
}

/**
 * Frequência e faltas por paciente (issue #292): aulas previstas, realizadas e
 * faltas no período, com a taxa de presença (carlessopilatesapi#233). Números,
 * ordenação (menor presença primeiro) e totais vêm prontos da API; a tela só
 * destaca quem ficou abaixo do limite informado.
 */
@Component({
  selector: 'app-frequencia-relatorio',
  imports: [DatePipe, DecimalPipe, ReactiveFormsModule, RouterLink, CarregandoComponent],
  templateUrl: './frequencia-relatorio.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './frequencia-relatorio.component.scss'
})
export class FrequenciaRelatorioComponent implements OnInit, AfterViewInit {
  private readonly relatorioService = inject(RelatorioService);
  private readonly profissionalService = inject(ProfissionalService);
  private readonly fb = inject(FormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);

  form!: FormGroup;
  profissionais: ProfissionalResponseDTO[] = [];
  erroProfissionais: string | null = null;

  relatorio: RelatorioFrequenciaDTO | null = null;
  /** A exportação usa a última consulta bem-sucedida, para o arquivo bater com a tabela. */
  private consultaAplicada: ConsultaFrequencia | null = null;
  loading = false;
  exportando = false;
  erroPeriodo: string | null = null;
  erroTaxa: string | null = null;
  erro: string | null = null;

  ngOnInit(): void {
    const { inicio, fim } = periodoDoMesAtual();
    this.form = this.fb.group({
      inicio: [inicio, Validators.required],
      fim: [fim, Validators.required],
      profissionalId: [null as number | null],
      taxaMaxima: [null as number | null]
    });
    this.carregarProfissionais();
    this.consultar();
  }

  ngAfterViewInit(): void {
    focarPrimeiroCampo(this.host);
  }

  get semPacientes(): boolean {
    return !!this.relatorio && this.relatorio.pacientes.length === 0;
  }

  get podeExportar(): boolean {
    return !!this.consultaAplicada && !!this.relatorio && !this.loading && !this.exportando;
  }

  /** Sem a lista o relatório continua funcionando; só o filtro de profissional fica vazio. */
  carregarProfissionais(): void {
    this.profissionalService.listar(0, 100).subscribe({
      next: page => (this.profissionais = page.content),
      error: () => (this.erroProfissionais = 'Não foi possível carregar os profissionais para o filtro.')
    });
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
    this.consultaAplicada = null;
    this.relatorioService.relatorioFrequencia(consulta.inicio, consulta.fim, consulta.filtros).subscribe({
      next: relatorio => {
        this.relatorio = relatorio;
        this.consultaAplicada = consulta;
        this.loading = false;
      },
      error: (err: unknown) => {
        this.erro = this.mensagemErro(err, 'Erro ao carregar o relatório de frequência.');
        this.loading = false;
      }
    });
  }

  exportar(): void {
    const consulta = this.consultaAplicada;
    if (!consulta || this.exportando) return;

    const fallback = 'Erro ao exportar o relatório em Excel.';
    this.exportando = true;
    this.erro = null;
    this.relatorioService.exportarRelatorioFrequencia(consulta.inicio, consulta.fim, consulta.filtros).subscribe({
      next: response => {
        try {
          baixarBlob(response, `relatorio-frequencia-${consulta.inicio}-${consulta.fim}.xlsx`);
        } catch {
          this.erro = fallback;
        } finally {
          this.exportando = false;
        }
      },
      error: (err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 403) {
          this.erro = MENSAGEM_SEM_PERMISSAO_FREQUENCIA;
          this.exportando = false;
          return;
        }
        // Na exportação o corpo do erro chega como Blob: o `detail` da API
        // (ex.: teto de linhas) precisa ser lido antes de aparecer.
        void extrairMensagemErroBlob(err, fallback).then(mensagem => {
          this.erro = mensagem;
          this.exportando = false;
          this.cdr.markForCheck();
        });
      }
    });
  }

  /** Destaque da linha: só quando a consulta teve limite e o paciente ficou abaixo dele. */
  abaixoDoLimite(paciente: RelatorioFrequenciaPaciente): boolean {
    const limite = this.consultaAplicada?.filtros.taxaMaxima;
    return limite !== null && limite !== undefined && paciente.taxaPresenca < limite;
  }

  private consultaDoFormulario(): ConsultaFrequencia | null {
    const valor = this.form.value as FiltrosForm;
    this.erroPeriodo = validarPeriodoRanking(valor.inicio, valor.fim);
    this.erroTaxa = this.validarTaxa(valor.taxaMaxima);
    if (this.erroPeriodo || this.erroTaxa) {
      this.form.markAllAsTouched();
      return null;
    }
    return {
      inicio: valor.inicio,
      fim: valor.fim,
      filtros: {
        profissionalId: valor.profissionalId === null ? null : Number(valor.profissionalId),
        taxaMaxima: this.taxaInformada(valor.taxaMaxima)
      }
    };
  }

  private taxaInformada(taxa: number | string | null): number | null {
    return taxa === null || taxa === '' ? null : Number(taxa);
  }

  /** Mesma faixa da API (0 a 100), para não mandar um `400` previsível. */
  private validarTaxa(taxa: number | string | null): string | null {
    const valor = this.taxaInformada(taxa);
    if (valor === null) return null;
    if (Number.isNaN(valor) || valor < 0 || valor > 100) {
      return 'Informe uma presença entre 0 e 100%.';
    }
    return null;
  }

  /** O `403` chega aqui (`TRATA_403_LOCALMENTE`) para a tela explicar a falta de permissão. */
  private mensagemErro(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse && err.status === 403) {
      return MENSAGEM_SEM_PERMISSAO_FREQUENCIA;
    }
    return extrairMensagemErro(err, fallback);
  }
}
