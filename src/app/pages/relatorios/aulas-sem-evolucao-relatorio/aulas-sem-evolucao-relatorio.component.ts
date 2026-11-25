import { DatePipe } from '@angular/common';
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
  RelatorioAulasSemEvolucaoDTO,
  RelatorioAulasSemEvolucaoFiltros
} from '../../../core/models/relatorio-aulas-sem-evolucao';
import { ProfissionalResponseDTO } from '../../../core/models/profissional';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { RelatorioService } from '../../../core/services/relatorio.service';
import { extrairMensagemErro, extrairMensagemErroBlob } from '../../../shared/utils/api-error';
import { baixarBlob } from '../../../shared/utils/file-download';
import { focarPrimeiroCampo } from '../../../shared/utils/form-focus';
// Mesmo teto de 366 dias e mesma regra `inicio <= fim` que a API aplica.
import { periodoDoMesAtual, validarPeriodoRanking } from '../../../shared/utils/indicadores';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';

export const MENSAGEM_SEM_PERMISSAO_AULAS_SEM_EVOLUCAO =
  'Você não tem permissão para acessar o relatório de aulas sem evolução.';

export const ROTULO_SEM_PROFISSIONAL = 'Sem profissional';

interface ConsultaAulasSemEvolucao {
  inicio: string;
  fim: string;
  filtros: RelatorioAulasSemEvolucaoFiltros;
}

/**
 * Aulas realizadas sem evolução registrada (issue #293): o controle do
 * prontuário por profissional. O critério (aula realizada sem sessão com
 * evolução do mesmo paciente na mesma data) e o resumo vêm prontos da API
 * (carlessopilatesapi#234); a tela não recalcula nada.
 */
@Component({
  selector: 'app-aulas-sem-evolucao-relatorio',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, CarregandoComponent],
  templateUrl: './aulas-sem-evolucao-relatorio.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './aulas-sem-evolucao-relatorio.component.scss'
})
export class AulasSemEvolucaoRelatorioComponent implements OnInit, AfterViewInit {
  private readonly relatorioService = inject(RelatorioService);
  private readonly profissionalService = inject(ProfissionalService);
  private readonly fb = inject(FormBuilder);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly semProfissional = ROTULO_SEM_PROFISSIONAL;

  form!: FormGroup;
  profissionais: ProfissionalResponseDTO[] = [];
  erroProfissionais: string | null = null;

  relatorio: RelatorioAulasSemEvolucaoDTO | null = null;
  /** A exportação usa a última consulta bem-sucedida, para o arquivo bater com a tabela. */
  private consultaAplicada: ConsultaAulasSemEvolucao | null = null;
  loading = false;
  exportando = false;
  erroPeriodo: string | null = null;
  erro: string | null = null;

  ngOnInit(): void {
    const { inicio, fim } = periodoDoMesAtual();
    this.form = this.fb.group({
      inicio: [inicio, Validators.required],
      fim: [fim, Validators.required],
      profissionalId: [null as number | null]
    });
    this.carregarProfissionais();
    this.consultar();
  }

  ngAfterViewInit(): void {
    focarPrimeiroCampo(this.host);
  }

  get podeExportar(): boolean {
    return !!this.consultaAplicada && !this.loading && !this.exportando;
  }

  get semAulas(): boolean {
    return !!this.relatorio && this.relatorio.aulas.length === 0;
  }

  /** Sem a lista o relatório continua funcionando; só o filtro de profissional fica vazio. */
  carregarProfissionais(): void {
    this.erroProfissionais = null;
    this.profissionalService.listar(0, 100).subscribe({
      next: pagina => (this.profissionais = pagina.content),
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
    this.relatorioService.relatorioAulasSemEvolucao(consulta.inicio, consulta.fim, consulta.filtros).subscribe({
      next: relatorio => {
        this.relatorio = relatorio;
        this.consultaAplicada = consulta;
        this.loading = false;
      },
      error: (err: unknown) => {
        this.erro = this.mensagemErro(err, 'Erro ao carregar o relatório de aulas sem evolução.');
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
    this.relatorioService
      .exportarRelatorioAulasSemEvolucao(consulta.inicio, consulta.fim, consulta.filtros)
      .subscribe({
        next: response => {
          try {
            baixarBlob(response, `relatorio-aulas-sem-evolucao-${consulta.inicio}-${consulta.fim}.xlsx`);
          } catch {
            this.erro = fallback;
          } finally {
            this.exportando = false;
          }
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status === 403) {
            this.erro = MENSAGEM_SEM_PERMISSAO_AULAS_SEM_EVOLUCAO;
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

  /** `HH:mm:ss` → `HH:mm`; aula sem horário mostra travessão. */
  horario(valor: string | null): string {
    return valor ? valor.slice(0, 5) : '—';
  }

  private consultaDoFormulario(): ConsultaAulasSemEvolucao | null {
    const { inicio, fim, profissionalId } = this.form.value as {
      inicio: string;
      fim: string;
      profissionalId: number | string | null;
    };
    this.erroPeriodo = validarPeriodoRanking(inicio, fim);
    if (this.erroPeriodo) {
      this.form.markAllAsTouched();
      return null;
    }
    return {
      inicio,
      fim,
      filtros: { profissionalId: profissionalId === null || profissionalId === '' ? null : Number(profissionalId) }
    };
  }

  /** O `403` chega aqui (`TRATA_403_LOCALMENTE`) para a tela explicar a falta de permissão. */
  private mensagemErro(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse && err.status === 403) {
      return MENSAGEM_SEM_PERMISSAO_AULAS_SEM_EVOLUCAO;
    }
    return extrairMensagemErro(err, fallback);
  }
}
