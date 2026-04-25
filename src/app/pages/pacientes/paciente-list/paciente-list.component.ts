import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PacienteFiltro, PacienteService } from '../../../core/services/paciente.service';
import { PacienteResponseDTO } from '../../../core/models/paciente';

interface FiltroUI {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  status: 'ativos' | 'inativos' | 'todos';
}

@Component({
  selector: 'app-paciente-list',
  imports: [CommonModule, FormsModule, RouterLink],
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
  confirmarAtivarId: number | null = null;
  filtro: FiltroUI = {
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    status: 'ativos'
  };

  constructor(private service: PacienteService) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading = true;
    this.erro = null;
    this.service.listar(this.currentPage, this.pageSize, this.montarFiltro()).subscribe({
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

  buscar(): void {
    this.currentPage = 0;
    this.carregar();
  }

  limparFiltros(): void {
    this.filtro = {
      nome: '',
      email: '',
      cpf: '',
      telefone: '',
      status: 'ativos'
    };
    this.buscar();
  }

  private montarFiltro(): PacienteFiltro {
    const filtro: PacienteFiltro = {
      nome: this.filtro.nome.trim(),
      email: this.filtro.email.trim(),
      cpf: this.filtro.cpf.trim(),
      telefone: this.filtro.telefone.trim(),
    };
    if (this.filtro.status !== 'todos') {
      filtro.ativo = this.filtro.status === 'ativos';
    }
    return filtro;
  }

  confirmarInativar(id: number): void {
    this.confirmarInativarId = id;
  }

  confirmarAtivar(id: number): void {
    this.confirmarAtivarId = id;
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

  ativar(): void {
    if (this.confirmarAtivarId === null) return;
    this.service.ativar(this.confirmarAtivarId).subscribe({
      next: () => {
        this.confirmarAtivarId = null;
        this.carregar();
      },
      error: () => {
        this.erro = 'Erro ao ativar paciente.';
        this.confirmarAtivarId = null;
      }
    });
  }

  cancelarInativar(): void {
    this.confirmarInativarId = null;
  }

  cancelarAtivar(): void {
    this.confirmarAtivarId = null;
  }

  pagina(p: number): void {
    this.currentPage = p;
    this.carregar();
  }

  pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }
}
