import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PacienteService } from '../../../core/services/paciente.service';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { ConfirmarDialogComponent } from '../../../shared/components/confirmar-dialog/confirmar-dialog.component';

@Component({
  selector: 'app-paciente-detail',
  imports: [DatePipe, RouterLink, ConfirmarDialogComponent],
  templateUrl: './paciente-detail.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './paciente-detail.component.scss'
})
export class PacienteDetailComponent implements OnInit {
  paciente: PacienteResponseDTO | null = null;
  loading = false;
  erro: string | null = null;
  confirmarInativar = false;
  confirmarAtivar = false;
  acaoEmAndamento = false;

  constructor(
    private service: PacienteService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = parseRouteNumberParam(this.route.snapshot.paramMap, 'id');
    if (id === null) {
      this.erro = 'Identificador inválido.';
      return;
    }
    this.loading = true;
    this.service.buscar(id).subscribe({
      next: p => {
        this.paciente = p;
        this.loading = false;
      },
      error: () => {
        this.erro = 'Paciente não encontrado.';
        this.loading = false;
      }
    });
  }

  ativar(): void {
    if (!this.paciente || this.acaoEmAndamento) return;
    this.acaoEmAndamento = true;
    this.service.ativar(this.paciente.id).subscribe({
      next: () => this.router.navigate(['/pacientes']),
      error: () => {
        this.erro = 'Erro ao ativar paciente.';
        this.acaoEmAndamento = false;
        this.confirmarAtivar = false;
      }
    });
  }

  inativar(): void {
    if (!this.paciente || this.acaoEmAndamento) return;
    this.acaoEmAndamento = true;
    this.service.inativar(this.paciente.id).subscribe({
      next: () => this.router.navigate(['/pacientes']),
      error: () => {
        this.erro = 'Erro ao inativar paciente.';
        this.acaoEmAndamento = false;
        this.confirmarInativar = false;
      }
    });
  }
}
