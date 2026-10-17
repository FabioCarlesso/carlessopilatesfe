import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AulasPorProfissionalDTO, DashboardIndicadoresDTO } from '../../../core/models/dashboard';
import { DashboardService } from '../../../core/services/dashboard.service';
import { extrairMensagemErro } from '../../../shared/utils/api-error';
import {
  formatarMoeda,
  formatarPercentual,
  formatarValorCompacto,
  GraficoBarras,
  MESES_OPCOES,
  MESES_PADRAO,
  montarGraficoBarras,
  periodoDoMesAtual,
  rotuloMesExtenso,
  taxaOcupacao,
  validarPeriodoRanking
} from '../../../shared/utils/indicadores';

interface LinhaIndicadores {
  mes: string;
  rotulo: string;
  receita: string;
  realizadas: number;
  agendadas: number;
  ocupacao: string;
  novos: number;
  inativados: number;
  saldo: number;
}

interface ResumoIndicadores {
  receitaTotal: string;
  realizadas: number;
  ocupacao: string;
  saldoPacientes: number;
}

interface LinhaRanking extends AulasPorProfissionalDTO {
  posicao: number;
  /** Largura da barra decorativa, relativa ao primeiro colocado. */
  proporcao: number;
}

/**
 * Indicadores históricos do estúdio (issue #130): receita, ocupação e evasão
 * mês a mês, mais o ranking de aulas por profissional. Só `ADMIN` — a API
 * recusa os dois endpoints para os demais perfis.
 */
@Component({
  selector: 'app-indicadores',
  imports: [DatePipe, FormsModule, NgTemplateOutlet, RouterLink],
  templateUrl: './indicadores.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './indicadores.component.scss'
})
export class IndicadoresComponent implements OnInit {
  readonly mesesOpcoes = MESES_OPCOES;
  meses: number = MESES_PADRAO;

  indicadores: DashboardIndicadoresDTO | null = null;
  linhas: LinhaIndicadores[] = [];
  resumo: ResumoIndicadores | null = null;
  graficoReceita: GraficoBarras | null = null;
  graficoAulas: GraficoBarras | null = null;
  graficoPacientes: GraficoBarras | null = null;
  loadingIndicadores = false;
  erroIndicadores: string | null = null;

  inicio = '';
  fim = '';
  ranking: LinhaRanking[] = [];
  /** Período da última consulta bem-sucedida, para o texto não mudar enquanto o usuário edita as datas. */
  periodoRanking: { inicio: string; fim: string } | null = null;
  loadingRanking = false;
  erroRanking: string | null = null;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    const periodo = periodoDoMesAtual();
    this.inicio = periodo.inicio;
    this.fim = periodo.fim;
    this.carregarIndicadores();
    this.consultarRanking();
  }

  carregarIndicadores(): void {
    this.loadingIndicadores = true;
    this.erroIndicadores = null;
    this.dashboardService.indicadores(this.meses).subscribe({
      next: indicadores => {
        this.aplicarIndicadores(indicadores);
        this.loadingIndicadores = false;
      },
      error: err => {
        this.erroIndicadores = extrairMensagemErro(err, 'Erro ao carregar os indicadores.');
        this.loadingIndicadores = false;
      }
    });
  }

  alterarMeses(meses: number): void {
    this.meses = Number(meses);
    this.carregarIndicadores();
  }

  consultarRanking(): void {
    const invalido = validarPeriodoRanking(this.inicio, this.fim);
    if (invalido) {
      this.erroRanking = invalido;
      return;
    }

    const periodo = { inicio: this.inicio, fim: this.fim };
    this.loadingRanking = true;
    this.erroRanking = null;
    this.dashboardService.aulasPorProfissional(periodo.inicio, periodo.fim).subscribe({
      next: ranking => {
        const maior = ranking[0]?.totalRealizadas ?? 0;
        this.ranking = ranking.map((item, indice) => ({
          ...item,
          posicao: indice + 1,
          proporcao: maior === 0 ? 0 : item.totalRealizadas / maior
        }));
        this.periodoRanking = periodo;
        this.loadingRanking = false;
      },
      error: err => {
        this.erroRanking = extrairMensagemErro(err, 'Erro ao carregar o ranking de profissionais.');
        this.loadingRanking = false;
      }
    });
  }

  private aplicarIndicadores(indicadores: DashboardIndicadoresDTO): void {
    this.indicadores = indicadores;
    const meses = indicadores.receita.map(item => item.mes);

    // As três séries vêm alinhadas pelo mesmo mês, mas a tabela casa por `mes`
    // para não depender da ordem de cada lista.
    const aulasPorMes = new Map(indicadores.aulas.map(item => [item.mes, item]));
    const pacientesPorMes = new Map(indicadores.pacientes.map(item => [item.mes, item]));
    const aulasDe = (mes: string) => aulasPorMes.get(mes) ?? { mes, realizadas: 0, agendadas: 0 };
    const pacientesDe = (mes: string) => pacientesPorMes.get(mes) ?? { mes, novos: 0, inativados: 0 };

    this.linhas = indicadores.receita.map(({ mes, receita }) => {
      const aulas = aulasDe(mes);
      const pacientes = pacientesDe(mes);
      return {
        mes,
        rotulo: rotuloMesExtenso(mes),
        receita: formatarMoeda(receita),
        realizadas: aulas.realizadas,
        agendadas: aulas.agendadas,
        ocupacao: formatarPercentual(taxaOcupacao(aulas.realizadas, aulas.agendadas)),
        novos: pacientes.novos,
        inativados: pacientes.inativados,
        saldo: pacientes.novos - pacientes.inativados
      };
    });

    const soma = (valores: number[]) => valores.reduce((total, valor) => total + valor, 0);
    const realizadas = soma(meses.map(mes => aulasDe(mes).realizadas));
    const agendadas = soma(meses.map(mes => aulasDe(mes).agendadas));
    this.resumo = {
      receitaTotal: formatarMoeda(soma(indicadores.receita.map(item => item.receita))),
      realizadas,
      ocupacao: formatarPercentual(taxaOcupacao(realizadas, agendadas)),
      saldoPacientes: soma(meses.map(mes => pacientesDe(mes).novos - pacientesDe(mes).inativados))
    };

    this.graficoReceita = montarGraficoBarras(
      meses,
      [{ chave: 'receita', rotulo: 'Receita', valores: indicadores.receita.map(item => item.receita) }],
      { titulo: 'Receita confirmada por mês', formatarEixo: formatarValorCompacto }
    );
    this.graficoAulas = montarGraficoBarras(
      meses,
      [
        { chave: 'realizadas', rotulo: 'Realizadas', valores: meses.map(mes => aulasDe(mes).realizadas) },
        { chave: 'agendadas', rotulo: 'Não realizadas', valores: meses.map(mes => aulasDe(mes).agendadas) }
      ],
      { titulo: 'Aulas por mês', formatarEixo: formatarValorCompacto, inteiro: true }
    );
    this.graficoPacientes = montarGraficoBarras(
      meses,
      [
        { chave: 'novos', rotulo: 'Novos', valores: meses.map(mes => pacientesDe(mes).novos) },
        { chave: 'inativados', rotulo: 'Inativados', valores: meses.map(mes => pacientesDe(mes).inativados) }
      ],
      { titulo: 'Pacientes novos e inativados por mês', formatarEixo: formatarValorCompacto, inteiro: true }
    );
  }
}
