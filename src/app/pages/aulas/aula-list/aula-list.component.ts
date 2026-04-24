import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AulaService } from '../../../core/services/aula.service';
import { AulaResponseDTO } from '../../../core/models/plano';

@Component({
  selector: 'app-aula-list',
  imports: [CommonModule, RouterLink],
  templateUrl: './aula-list.component.html',
  styleUrl: './aula-list.component.scss'
})
export class AulaListComponent implements OnInit {
  pacienteId: number | null = null;
  pagamentoId: number | null = null;
  aulas: AulaResponseDTO[] = [];
  loading = false;
  erro: string | null = null;
  titulo = 'Aulas';

  constructor(private service: AulaService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    const pacienteId = this.route.snapshot.paramMap.get('pacienteId');
    const pagamentoId = this.route.snapshot.paramMap.get('pagamentoId');

    this.pacienteId = pacienteId ? +pacienteId : null;
    this.pagamentoId = pagamentoId ? +pagamentoId : null;
    this.titulo = this.pagamentoId !== null ? 'Aulas do Pagamento' : 'Aulas do Paciente';
    this.carregar();
  }

  carregar(): void {
    this.loading = true;
    this.erro = null;
    const request$ = this.pagamentoId !== null
      ? this.service.listarPorPagamento(this.pagamentoId)
      : this.service.listarPorPaciente(this.pacienteId!);

    request$.subscribe({
      next: aulas => {
        this.aulas = aulas;
        if (this.pacienteId === null && aulas.length > 0) {
          this.pacienteId = aulas[0].pacienteId;
        }
        this.loading = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar aulas.';
        this.loading = false;
      }
    });
  }

  realizar(id: number): void {
    this.service.realizar(id).subscribe({
      next: () => this.carregar(),
      error: () => (this.erro = 'Erro ao marcar aula como realizada.')
    });
  }
}
