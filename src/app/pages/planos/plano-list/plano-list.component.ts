import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PlanoService } from '../../../core/services/plano.service';
import { PlanoResponseDTO, TIPO_LABEL, FREQUENCIA_LABEL, DIAS_SEMANA_LABEL } from '../../../core/models/plano';

@Component({
  selector: 'app-plano-list',
  imports: [CommonModule, RouterLink],
  templateUrl: './plano-list.component.html',
  styleUrl: './plano-list.component.scss'
})
export class PlanoListComponent implements OnInit {
  pacienteId!: number;
  planos: PlanoResponseDTO[] = [];
  loading = false;
  erro: string | null = null;
  confirmarInativarId: number | null = null;

  readonly tipoLabel = TIPO_LABEL;
  readonly frequenciaLabel = FREQUENCIA_LABEL;
  readonly diasLabel = DIAS_SEMANA_LABEL;

  constructor(private service: PlanoService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.pacienteId = +this.route.snapshot.paramMap.get('id')!;
    this.carregar();
  }

  carregar(): void {
    this.loading = true;
    this.erro = null;
    this.service.listar(this.pacienteId).subscribe({
      next: planos => {
        this.planos = planos;
        this.loading = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar planos.';
        this.loading = false;
      }
    });
  }

  confirmarInativar(id: number): void {
    this.confirmarInativarId = id;
  }

  cancelarInativar(): void {
    this.confirmarInativarId = null;
  }

  inativar(): void {
    if (this.confirmarInativarId === null) return;
    this.service.inativar(this.confirmarInativarId).subscribe({
      next: () => {
        this.confirmarInativarId = null;
        this.carregar();
      },
      error: () => {
        this.erro = 'Erro ao inativar plano.';
        this.confirmarInativarId = null;
      }
    });
  }

  diasFormatados(plano: PlanoResponseDTO): string {
    return plano.diasSemana.map(d => this.diasLabel[d]).join(', ');
  }
}
