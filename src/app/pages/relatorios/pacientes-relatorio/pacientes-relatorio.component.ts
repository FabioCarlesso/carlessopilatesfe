import { CurrencyPipe, DatePipe } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DIAS_SEMANA_LABEL, FREQUENCIA_LABEL } from '../../../core/models/plano';
import { ProfissionalResponseDTO } from '../../../core/models/profissional';
import {
  MESES_LABEL,
  PENDENCIA_CADASTRO_LABEL,
  PendenciaCadastroPaciente,
  RelatorioPacientesDTO,
  RelatorioPacientesFiltros,
  RelatorioPacientesFormatoExportacao,
  RelatorioPacientesPlanoAtivo,
  SITUACAO_PACIENTE_RELATORIO_LABEL,
  SituacaoPacienteRelatorio
} from '../../../core/models/relatorio-pacientes';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { RelatorioService } from '../../../core/services/relatorio.service';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';
import { extrairMensagemErro, extrairMensagemErroBlob } from '../../../shared/utils/api-error';
import { baixarBlob } from '../../../shared/utils/file-download';
import { focarPrimeiroCampo } from '../../../shared/utils/form-focus';

export const MENSAGEM_SEM_PERMISSAO_PACIENTES =
  'Você não tem permissão para acessar o relatório de pacientes.';

interface FiltrosForm {
  situacao: SituacaoPacienteRelatorio;
  semPlanoAtivo: boolean;
  cadastroIncompleto: boolean;
  mesNascimento: number | null;
  profissionalId: number | null;
}

/**
 * Relatório de pacientes (issue #288): situação, plano ativo, profissional das
 * próximas aulas e pendências de cadastro, com exportação PDF/XLSX. Filtros,
 * totais e pendências vêm prontos da API (carlessopilatesapi#230).
 */
@Component({
  selector: 'app-pacientes-relatorio',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink, CarregandoComponent],
  templateUrl: './pacientes-relatorio.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './pacientes-relatorio.component.scss'
})
export class PacientesRelatorioComponent implements OnInit, AfterViewInit {
  readonly situacoes = Object.entries(SITUACAO_PACIENTE_RELATORIO_LABEL) as [SituacaoPacienteRelatorio, string][];
  readonly meses = MESES_LABEL.map((nome, i) => ({ valor: i + 1, nome }));

  form!: FormGroup;
  relatorio: RelatorioPacientesDTO | null = null;
  profissionais: ProfissionalResponseDTO[] = [];
  loading = false;
  exportando: RelatorioPacientesFormatoExportacao | null = null;
  erro: string | null = null;
  erroProfissionais: string | null = null;

  constructor(
    private relatorioService: RelatorioService,
    private profissionalService: ProfissionalService,
    private fb: FormBuilder,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      situacao: ['ATIVOS' as SituacaoPacienteRelatorio],
      semPlanoAtivo: [false],
      cadastroIncompleto: [false],
      mesNascimento: [null as number | null],
      profissionalId: [null as number | null]
    });
    this.carregarProfissionais();
    this.consultar();
  }

  ngAfterViewInit(): void {
    focarPrimeiroCampo(this.host);
  }

  /** Sem a lista o relatório continua funcionando; só o filtro de profissional fica vazio. */
  carregarProfissionais(): void {
    this.profissionalService.listar(0, 100).subscribe({
      next: page => (this.profissionais = page.content),
      error: () => (this.erroProfissionais = 'Não foi possível carregar os profissionais para o filtro.')
    });
  }

  consultar(): void {
    this.loading = true;
    this.erro = null;
    this.relatorio = null;
    this.relatorioService.relatorioPacientes(this.filtros()).subscribe({
      next: relatorio => {
        this.relatorio = relatorio;
        this.loading = false;
      },
      error: (err: unknown) => {
        this.erro = this.mensagemErro(err, 'Erro ao carregar o relatório de pacientes.');
        this.loading = false;
      }
    });
  }

  exportar(formato: RelatorioPacientesFormatoExportacao): void {
    const filtros = this.filtros();
    const rotulo = formato === 'pdf' ? 'PDF' : 'Excel';
    const situacao = (filtros.situacao ?? 'ATIVOS').toLowerCase();
    const fallbackNomeArquivo = `relatorio-pacientes-${situacao}.${formato}`;

    this.exportando = formato;
    this.erro = null;
    this.relatorioService.exportarRelatorioPacientes(formato, filtros).subscribe({
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
        // O corpo de erro chega como `Blob`; o `detail` do `400` (teto de
        // registros, filtro inválido) só aparece depois de lido.
        this.exportando = null;
        if (err instanceof HttpErrorResponse && err.status === 403) {
          this.erro = MENSAGEM_SEM_PERMISSAO_PACIENTES;
          return;
        }
        void extrairMensagemErroBlob(err, `Erro ao exportar o relatório em ${rotulo}.`)
          .then(mensagem => (this.erro = mensagem));
      }
    });
  }

  rotuloPendencia(pendencia: PendenciaCadastroPaciente): string {
    return PENDENCIA_CADASTRO_LABEL[pendencia] ?? pendencia;
  }

  /** Ex.: "2x por semana · Seg, Qua · 08:00". O valor vai em linha própria no template. */
  descricaoPlano(plano: RelatorioPacientesPlanoAtivo): string {
    const partes = [FREQUENCIA_LABEL[plano.frequenciaSemanal] ?? plano.frequenciaSemanal];
    if (plano.diasSemana.length > 0) {
      partes.push(plano.diasSemana.map(dia => (DIAS_SEMANA_LABEL[dia] ?? dia).slice(0, 3)).join(', '));
    }
    if (plano.horario) {
      partes.push(plano.horario.slice(0, 5));
    }
    return partes.join(' · ');
  }

  private filtros(): RelatorioPacientesFiltros {
    const valor = this.form.value as FiltrosForm;
    return {
      situacao: valor.situacao,
      semPlanoAtivo: valor.semPlanoAtivo,
      cadastroIncompleto: valor.cadastroIncompleto,
      mesNascimento: valor.mesNascimento === null ? null : Number(valor.mesNascimento),
      profissionalId: valor.profissionalId === null ? null : Number(valor.profissionalId)
    };
  }

  /**
   * O `403` chega aqui (o serviço marca `TRATA_403_LOCALMENTE`) para a tela
   * explicar a falta de permissão em vez de trocar de página.
   */
  private mensagemErro(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse && err.status === 403) {
      return MENSAGEM_SEM_PERMISSAO_PACIENTES;
    }
    return extrairMensagemErro(err, fallback);
  }
}
