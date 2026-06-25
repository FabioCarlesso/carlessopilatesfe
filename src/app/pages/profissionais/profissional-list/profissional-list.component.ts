import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProfissionalFiltro, ProfissionalService } from '../../../core/services/profissional.service';
import { ProfissionalResponseDTO, TipoContrato, TIPO_CONTRATO_LABEL } from '../../../core/models/profissional';
import { PageMetadata } from '../../../core/models/paciente';

interface FiltroUI {
  nome: string;
  email: string;
  tipoContrato: '' | TipoContrato;
  percentualPagamentoAula: string;
  status: 'ativos' | 'inativos' | 'todos';
}

@Component({
  selector: 'app-profissional-list',
  imports: [NgIf, NgFor, FormsModule, RouterLink],
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
  filtro: FiltroUI = {
    nome: '',
    email: '',
    tipoContrato: '',
    percentualPagamentoAula: '',
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
    this.carregar();
  }

  limparFiltros(): void {
    this.filtro = {
      nome: '',
      email: '',
      tipoContrato: '',
      percentualPagamentoAula: '',
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

    const percentual = this.filtro.percentualPagamentoAula.trim();
    if (percentual !== '') {
      const valor = Number(percentual);
      if (Number.isFinite(valor)) {
        filtro.percentualPagamentoAula = valor;
      }
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
    this.confirmarInativarId = null;
  }

  inativar(): void {
    if (this.confirmarInativarId === null) return;

    this.service.inativar(this.confirmarInativarId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
