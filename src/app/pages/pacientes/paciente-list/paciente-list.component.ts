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
  totalElements = 0;
  totalPages = 0;
  currentPage = 0;
  pageSize = 10;
  readonly pageSizeOptions = [5, 10, 20, 50];
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
        if (page.totalPages > 0 && this.currentPage >= page.totalPages) {
          this.currentPage = page.totalPages - 1;
          this.carregar();
          return;
        }

        this.pacientes = page.content;
        this.totalElements = page.totalElements;
        this.totalPages = page.totalPages;
        this.currentPage = page.number;
        this.pageSize = page.size;
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
    if (p < 0 || p >= this.totalPages || p === this.currentPage) return;
    this.currentPage = p;
    this.carregar();
  }

  paginaAnterior(): void {
    this.pagina(this.currentPage - 1);
  }

  proximaPagina(): void {
    this.pagina(this.currentPage + 1);
  }

  alterarTamanhoPagina(size: string): void {
    const novoTamanho = Number(size);
    if (!this.pageSizeOptions.includes(novoTamanho) || novoTamanho === this.pageSize) return;

    this.pageSize = novoTamanho;
    this.currentPage = 0;
    this.carregar();
  }

  pages(): number[] {
    const visiblePages = 5;
    if (this.totalPages <= visiblePages) {
      return Array.from({ length: this.totalPages }, (_, i) => i);
    }

    const start = Math.max(0, Math.min(this.currentPage - 2, this.totalPages - visiblePages));
    return Array.from({ length: visiblePages }, (_, i) => start + i);
  }

  canGoPrevious(): boolean {
    return this.currentPage > 0;
  }

  canGoNext(): boolean {
    return this.currentPage < this.totalPages - 1;
  }

  pageStart(): number {
    if (this.totalElements === 0) return 0;
    return this.currentPage * this.pageSize + 1;
  }

  pageEnd(): number {
    return Math.min((this.currentPage + 1) * this.pageSize, this.totalElements);
  }
}
