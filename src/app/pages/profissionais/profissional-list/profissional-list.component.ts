import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProfissionalFiltro, ProfissionalService } from '../../../core/services/profissional.service';
import { ProfissionalResponseDTO, TipoContrato, TIPO_CONTRATO_LABEL } from '../../../core/models/profissional';
import { PageMetadata } from '../../../core/models/paciente';
import { ConfirmarDialogComponent } from '../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import { PaginationSummaryComponent } from '../../../shared/components/pagination-summary/pagination-summary.component';

interface FiltroUI {
  nome: string;
  email: string;
  tipoContrato: '' | TipoContrato;
  percentualPagamentoAula: number | null;
  status: 'ativos' | 'inativos' | 'todos';
}

@Component({
  selector: 'app-profissional-list',
  imports: [NgIf, NgFor, FormsModule, RouterLink, ConfirmarDialogComponent, PaginationSummaryComponent],
  templateUrl: './profissional-list.component.html',
  styleUrl: './profissional-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfissionalListComponent implements OnInit {
  profissionais: ProfissionalResponseDTO[] = [];
  totalElements = 0;
  totalPages = 0;
  currentPage = 0;
  pageSize = 10;
  visiblePages: number[] = [];
  readonly pageSizeOptions = [5, 10, 20, 50];
  readonly maxVisiblePages = 5;
  loading = false;
  erro: string | null = null;
  confirmarInativarId: number | null = null;
  acaoEmAndamento = false;
  filtrosAbertos = false;
  filtro: FiltroUI = {
    nome: '',
    email: '',
    tipoContrato: '',
    percentualPagamentoAula: null,
    status: 'ativos'
  };

  readonly tipoContratoLabel = TIPO_CONTRATO_LABEL;
  readonly tiposContrato: TipoContrato[] = ['CLT', 'PJ', 'AUTONOMO'];

  constructor(private service: ProfissionalService, private cdr: ChangeDetectorRef, private destroyRef: DestroyRef) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(retryCount = 0): void {
    this.loading = true;
    this.erro = null;
    this.service.listar(this.currentPage, this.pageSize, this.montarFiltro()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: page => {
        const meta = page.page ?? ({} as Partial<PageMetadata>);
        const totalPages = meta.totalPages ?? this.totalPages;
        if (totalPages > 0 && this.currentPage >= totalPages && retryCount < 3) {
          this.currentPage = totalPages - 1;
          this.carregar(retryCount + 1);
          return;
        }

        this.profissionais = page.content;
        this.totalElements = meta.totalElements ?? this.totalElements;
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

  buscar(): void {
    this.currentPage = 0;
    // No mobile, recolhe o painel após aplicar para que o primeiro resultado
    // apareça na primeira dobra (issue #163). No desktop o painel está sempre
    // visível via CSS, então o estado não tem efeito visual.
    this.filtrosAbertos = false;
    this.carregar();
  }

  alternarFiltros(): void {
    this.filtrosAbertos = !this.filtrosAbertos;
  }

  filtrosAtivos(): number {
    let count = 0;
    if (this.filtro.nome.trim()) count++;
    if (this.filtro.email.trim()) count++;
    if (this.filtro.tipoContrato) count++;
    if (this.filtro.percentualPagamentoAula !== null && Number.isFinite(this.filtro.percentualPagamentoAula)) count++;
    if (this.filtro.status !== 'ativos') count++;
    return count;
  }

  limparFiltros(): void {
    this.filtro = {
      nome: '',
      email: '',
      tipoContrato: '',
      percentualPagamentoAula: null,
      status: 'ativos'
    };
    this.buscar();
  }

  private montarFiltro(): ProfissionalFiltro {
    const filtro: ProfissionalFiltro = {
      nome: this.filtro.nome.trim(),
      email: this.filtro.email.trim()
    };

    if (this.filtro.tipoContrato) {
      filtro.tipoContrato = this.filtro.tipoContrato;
    }

    const percentual = this.filtro.percentualPagamentoAula;
    if (percentual !== null && Number.isFinite(percentual)) {
      filtro.percentualPagamentoAula = percentual;
    }

    if (this.filtro.status !== 'todos') {
      filtro.ativo = this.filtro.status === 'ativos';
    }

    return filtro;
  }

  confirmarInativar(id: number): void {
    this.confirmarInativarId = id;
  }

  cancelarInativar(): void {
    if (this.acaoEmAndamento) return;
    this.confirmarInativarId = null;
  }

  inativar(): void {
    if (this.confirmarInativarId === null || this.acaoEmAndamento) return;

    this.acaoEmAndamento = true;
    this.service.inativar(this.confirmarInativarId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.acaoEmAndamento = false;
        this.confirmarInativarId = null;
        this.carregar();
      },
      error: () => {
        this.erro = 'Erro ao inativar profissional.';
        this.acaoEmAndamento = false;
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

  alterarTamanhoPagina(size: number): void {
    if (!this.pageSizeOptions.includes(size) || size === this.pageSize) return;

    this.pageSize = size;
    this.currentPage = 0;
    this.carregar();
  }

  trackByProfissional(_: number, profissional: ProfissionalResponseDTO): number {
    return profissional.id;
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
