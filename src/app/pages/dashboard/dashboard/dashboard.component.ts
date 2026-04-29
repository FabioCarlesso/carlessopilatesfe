import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DashboardResumoDTO } from '../../../core/models/dashboard';
import { DashboardService } from '../../../core/services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, CurrencyPipe, DatePipe],
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

  constructor(
    private service: DashboardService,
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
  }
}
