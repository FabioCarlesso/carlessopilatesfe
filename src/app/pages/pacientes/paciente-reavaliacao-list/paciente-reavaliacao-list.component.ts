import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReavaliacaoResponseDTO } from '../../../core/models/reavaliacao';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { ReavaliacaoService } from '../../../core/services/reavaliacao.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';

@Component({
  selector: 'app-paciente-reavaliacao-list',
  imports: [NgIf, NgFor, DatePipe, RouterLink],
  templateUrl: './paciente-reavaliacao-list.component.html',
  styleUrl: './paciente-reavaliacao-list.component.scss'
})
export class PacienteReavaliacaoListComponent implements OnInit, OnDestroy {
  pacienteId: number | null = null;
  paciente: PacienteResponseDTO | null = null;
  reavaliacoes: ReavaliacaoResponseDTO[] = [];
  loading = false;
  erro: string | null = null;
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private reavaliacaoService: ReavaliacaoService,
    private pacienteService: PacienteService,
    private route: ActivatedRoute,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    if (this.pacienteId === null) {
      this.erro = 'Identificador inválido.';
      return;
    }
    this.carregar();
  }

  ngOnDestroy(): void {
    if (this.successTimer !== null) {
      clearTimeout(this.successTimer);
    }
  }

  carregar(): void {
    if (this.pacienteId === null) return;

    this.loading = true;
    this.erro = null;

    this.pacienteService.buscar(this.pacienteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: paciente => {
          this.paciente = paciente;
          this.carregarReavaliacoes();
        },
        error: () => {
          this.erro = 'Erro ao carregar dados do paciente.';
          this.loading = false;
        }
      });
  }

  private carregarReavaliacoes(): void {
    if (this.pacienteId === null) return;

    this.reavaliacaoService.listarPorPaciente(this.pacienteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: reavaliacoes => {
          this.reavaliacoes = reavaliacoes;
          this.loading = false;
        },
        error: () => {
          this.erro = 'Erro ao carregar reavaliações.';
          this.loading = false;
        }
      });
  }
}
