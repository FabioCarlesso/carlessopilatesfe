import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DashboardResumoDTO } from '../../../core/models/dashboard';
import { DashboardService } from '../../../core/services/dashboard.service';
import { PAPEIS } from '../../../core/models/auth';
import { AuthService } from '../../../core/services/auth.service';
import { GraficoProporcaoComponent } from '../../../shared/components/grafico-proporcao/grafico-proporcao.component';
import { SegmentoProporcao } from '../../../shared/utils/grafico-proporcao';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, CurrencyPipe, DatePipe, GraficoProporcaoComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  resumo: DashboardResumoDTO | null = null;
  loading = true;
  erro: string | null = null;

  totalPacientes = 0;
  totalProfissionais = 0;
  totalPagamentos = 0;
  totalAulasMesAtual = 0;
  percentualAulasRealizadas = 0;
  // Partes dos gráficos (issue #120), montadas do mesmo resumo já carregado:
  // nenhum gráfico faz chamada própria à API.
  segmentosPagamentos: SegmentoProporcao[] = [];
  segmentosAulas: SegmentoProporcao[] = [];
  segmentosPacientes: SegmentoProporcao[] = [];
  readonly papeis = PAPEIS;

  constructor(
    private service: DashboardService,
    public authService: AuthService,
    private cdr: ChangeDetectorRef,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading = true;
    this.erro = null;
    this.resumo = null;

    this.service.resumo().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: resumo => {
        this.resumo = resumo;
        this.calcularTotais();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.erro = 'Erro ao carregar indicadores do sistema.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private calcularTotais(): void {
    if (!this.resumo) return;
    this.totalPacientes = this.resumo.pacientes.totalAtivos + this.resumo.pacientes.totalInativos;
    this.totalProfissionais = this.resumo.profissionais.totalAtivos + this.resumo.profissionais.totalInativos;
    const p = this.resumo.pagamentos;
    this.totalPagamentos = p.totalPendentes + p.totalPagos + p.totalVencidos;
    const realizadas = this.resumo.aulas.totalRealizadasMesAtual;
    const agendadas = this.resumo.aulas.totalAgendadasMesAtual;
    this.totalAulasMesAtual = realizadas + agendadas;
    this.percentualAulasRealizadas = this.totalAulasMesAtual === 0
      ? 0
      : Math.round((realizadas / this.totalAulasMesAtual) * 100);

    this.segmentosPagamentos = [
      { chave: 'pagos', rotulo: 'Pagos', valor: p.totalPagos, variante: 'sucesso' },
      { chave: 'pendentes', rotulo: 'Pendentes', valor: p.totalPendentes, variante: 'alerta' },
      { chave: 'vencidos', rotulo: 'Vencidos', valor: p.totalVencidos, variante: 'perigo' }
    ];
    this.segmentosAulas = [
      { chave: 'realizadas', rotulo: 'Realizadas', valor: realizadas, variante: 'sucesso' },
      { chave: 'agendadas', rotulo: 'Agendadas', valor: agendadas, variante: 'marca' }
    ];
    this.segmentosPacientes = [
      { chave: 'ativos', rotulo: 'Ativos', valor: this.resumo.pacientes.totalAtivos, variante: 'marca' },
      { chave: 'inativos', rotulo: 'Inativos', valor: this.resumo.pacientes.totalInativos, variante: 'neutro' }
    ];
  }
}
