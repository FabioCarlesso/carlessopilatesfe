import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { ProfissionalResponseDTO, TIPO_CONTRATO_LABEL } from '../../../core/models/profissional';
import { PageMetadata } from '../../../core/models/paciente';

@Component({
  selector: 'app-profissional-list',
  imports: [NgIf, NgFor, RouterLink],
  templateUrl: './profissional-list.component.html',
  styleUrl: './profissional-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
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

  constructor(private service: ProfissionalService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(retryCount = 0): void {
    this.loading = true;
    this.erro = null;
    this.service.listar(this.currentPage, this.pageSize).subscribe({
      next: page => {
        const meta = page.page ?? ({} as Partial<PageMetadata>);
        const totalPages = meta.totalPages ?? this.totalPages;
        if (totalPages > 0 && this.currentPage >= totalPages && retryCount < 3) {
          this.currentPage = totalPages - 1;
          this.carregar(retryCount + 1);
          return;
        }

        this.profissionais = page.content;
        this.totalPages = totalPages;
        this.currentPage = this.normalizarPagina(meta.number, this.currentPage);
        this.pageSize = this.normalizarTamanhoPagina(meta.size, this.pageSize);
        this.visiblePages = this.pages();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.erro = 'Erro ao carregar profissionais.';
        this.loading = false;
        this.cdr.markForCheck();
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
        this.cdr.markForCheck();
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

  private normalizarPagina(pageNumber: number | undefined, fallback: number): number {
    return typeof pageNumber === 'number' && Number.isInteger(pageNumber) && pageNumber >= 0 ? pageNumber : fallback;
  }

  private normalizarTamanhoPagina(size: number | undefined, fallback: number): number {
    return typeof size === 'number' && Number.isInteger(size) && size > 0 ? size : fallback;
  }
}
