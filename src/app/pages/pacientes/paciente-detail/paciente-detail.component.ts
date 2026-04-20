import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PacienteService } from '../../../core/services/paciente.service';
import { PacienteResponseDTO } from '../../../core/models/paciente';

@Component({
  selector: 'app-paciente-detail',
  imports: [CommonModule, RouterLink],
  templateUrl: './paciente-detail.component.html',
  styleUrl: './paciente-detail.component.scss'
})
export class PacienteDetailComponent implements OnInit {
  paciente: PacienteResponseDTO | null = null;
  loading = false;
  erro: string | null = null;
  confirmarInativar = false;

  constructor(
    private service: PacienteService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.loading = true;
    this.service.buscar(+id).subscribe({
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

  inativar(): void {
    if (!this.paciente) return;
    this.service.inativar(this.paciente.id).subscribe({
      next: () => this.router.navigate(['/pacientes']),
      error: () => (this.erro = 'Erro ao inativar paciente.')
    });
  }
}
