import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PacienteService } from '../../../core/services/paciente.service';
import { PacienteResponseDTO } from '../../../core/models/paciente';

@Component({
  selector: 'app-paciente-list',
  imports: [CommonModule, RouterLink],
  templateUrl: './paciente-list.component.html',
  styleUrl: './paciente-list.component.scss'
})
export class PacienteListComponent implements OnInit {
  pacientes: PacienteResponseDTO[] = [];
  totalPages = 0;
  currentPage = 0;
  pageSize = 10;
  loading = false;
  erro: string | null = null;
  confirmarInativarId: number | null = null;

  constructor(private service: PacienteService) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading = true;
    this.erro = null;
    this.service.listar(this.currentPage, this.pageSize).subscribe({
      next: page => {
        this.pacientes = page.content;
        this.totalPages = page.totalPages;
        this.loading = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar pacientes. Verifique se a API está em execução.';
        this.loading = false;
      }
    });
  }

  confirmarInativar(id: number): void {
    this.confirmarInativarId = id;
  }

  inativar(): void {
    if (this.confirmarInativarId === null) return;
    this.service.inativar(this.confirmarInativarId).subscribe({
      next: () => {
        this.confirmarInativarId = null;
        this.carregar();
      },
      error: () => {
        this.erro = 'Erro ao inativar paciente.';
        this.confirmarInativarId = null;
      }
    });
  }

  cancelarInativar(): void {
    this.confirmarInativarId = null;
  }

  pagina(p: number): void {
    this.currentPage = p;
    this.carregar();
  }

  pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }
}
