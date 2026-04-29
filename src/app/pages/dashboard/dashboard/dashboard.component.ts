import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardResumoDTO } from '../../../core/models/dashboard';
import { DashboardService } from '../../../core/services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  resumo: DashboardResumoDTO | null = null;
  loading = false;
  erro: string | null = null;

  constructor(private service: DashboardService) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading = true;
    this.erro = null;

    this.service.resumo().subscribe({
      next: resumo => {
        this.resumo = resumo;
        this.loading = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar indicadores do sistema.';
        this.loading = false;
      }
    });
  }

  totalPacientes(): number {
    if (!this.resumo) return 0;
    return this.resumo.pacientes.totalAtivos + this.resumo.pacientes.totalInativos;
  }

  totalProfissionais(): number {
    if (!this.resumo) return 0;
    return this.resumo.profissionais.totalAtivos + this.resumo.profissionais.totalInativos;
  }

  totalPagamentos(): number {
    if (!this.resumo) return 0;
    const pagamentos = this.resumo.pagamentos;
    return pagamentos.totalPendentes + pagamentos.totalPagos + pagamentos.totalVencidos;
  }

  totalAulasMesAtual(): number {
    if (!this.resumo) return 0;
    return this.resumo.aulas.totalRealizadasMesAtual + this.resumo.aulas.totalAgendadasMesAtual;
  }

  percentualAulasRealizadas(): number {
    const total = this.totalAulasMesAtual();
    if (!this.resumo || total === 0) return 0;
    return Math.round((this.resumo.aulas.totalRealizadasMesAtual / total) * 100);
  }
}
