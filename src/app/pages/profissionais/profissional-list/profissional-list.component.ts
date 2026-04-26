import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { ProfissionalResponseDTO, TIPO_CONTRATO_LABEL } from '../../../core/models/profissional';

@Component({
  selector: 'app-profissional-list',
  imports: [CommonModule, RouterLink],
  templateUrl: './profissional-list.component.html',
  styleUrl: './profissional-list.component.scss'
})
export class ProfissionalListComponent implements OnInit {
  profissionais: ProfissionalResponseDTO[] = [];
  totalPages = 0;
  currentPage = 0;
  pageSize = 10;
  visiblePages: number[] = [];
  readonly maxVisiblePages = 5;
  loading = false;
  erro: string | null = null;
  confirmarInativarId: number | null = null;

  readonly tipoContratoLabel = TIPO_CONTRATO_LABEL;

  constructor(private service: ProfissionalService) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading = true;
    this.erro = null;
    this.service.listar(this.currentPage, this.pageSize).subscribe({
      next: page => {
        this.profissionais = page.content;
        this.totalPages = page.page?.totalPages ?? this.totalPages;
        this.visiblePages = this.pages();
        this.loading = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar profissionais.';
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
        this.erro = 'Erro ao inativar profissional.';
        this.confirmarInativarId = null;
      }
    });
  }

  pagina(p: number): void {
    if (p < 0 || p >= this.totalPages || p === this.currentPage) return;
    this.currentPage = p;
    this.carregar();
  }

  pages(): number[] {
    if (this.totalPages <= this.maxVisiblePages) {
      return Array.from({ length: this.totalPages }, (_, i) => i);
    }

    const start = Math.max(0, Math.min(this.currentPage - 2, this.totalPages - this.maxVisiblePages));
    return Array.from({ length: this.maxVisiblePages }, (_, i) => start + i);
  }
}
