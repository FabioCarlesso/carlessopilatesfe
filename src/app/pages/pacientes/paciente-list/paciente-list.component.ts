import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnDestroy, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PacienteFiltro, PacienteService } from '../../../core/services/paciente.service';
import { PacienteResponseDTO, PageMetadata } from '../../../core/models/paciente';
import { ConfirmarDialogComponent } from '../../../shared/components/confirmar-dialog/confirmar-dialog.component';

interface FiltroUI {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  status: 'ativos' | 'inativos' | 'todos';
}

@Component({
  selector: 'app-paciente-list',
  imports: [NgIf, NgFor, FormsModule, RouterLink, ConfirmarDialogComponent],
  templateUrl: './paciente-list.component.html',
  styleUrl: './paciente-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PacienteListComponent implements OnInit, OnDestroy {
  pacientes: PacienteResponseDTO[] = [];
  totalElements = 0;
  totalPages = 0;
  currentPage = 0;
  pageSize = 10;
  readonly pageSizeOptions = [5, 10, 20, 50];
  readonly maxVisiblePages = 5;
  loading = false;
  erro: string | null = null;
  sucesso: string | null = null;
  confirmarInativarId: number | null = null;
  confirmarAtivarId: number | null = null;
  acaoEmAndamento = false;
  filtrosAbertos = false;
  private successTimer: ReturnType<typeof setTimeout> | null = null;
  filtro: FiltroUI = {
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    status: 'ativos'
  };

  constructor(private service: PacienteService, private cdr: ChangeDetectorRef, private destroyRef: DestroyRef) {}

  ngOnInit(): void {
    this.carregar();
  }

  ngOnDestroy(): void {
    if (this.successTimer !== null) {
      clearTimeout(this.successTimer);
    }
  }

  carregar(): void {
    this.loading = true;
    this.erro = null;
    this.service.listar(this.currentPage, this.pageSize, this.montarFiltro()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: page => {
        const meta = page.page ?? ({} as Partial<PageMetadata>);
        if ((meta.totalPages ?? 0) > 0 && this.currentPage >= (meta.totalPages ?? 0)) {
          this.currentPage = Math.max(0, (meta.totalPages ?? 1) - 1);
          this.carregar();
          return;
        }

        this.pacientes = page.content;
        this.totalElements = meta.totalElements ?? this.totalElements;
        this.totalPages = meta.totalPages ?? this.totalPages;
        this.currentPage = meta.number ?? this.currentPage;
        this.pageSize = this.pageSizeOptions.includes(meta.size as number) ? (meta.size as number) : this.pageSize;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.erro = 'Erro ao carregar pacientes. Verifique se a API está em execução.';
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
    if (this.filtro.cpf.trim()) count++;
    if (this.filtro.telefone.trim()) count++;
    if (this.filtro.status !== 'ativos') count++;
    return count;
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
    if (this.confirmarInativarId === null || this.acaoEmAndamento) return;
    this.acaoEmAndamento = true;
    this.service.inativar(this.confirmarInativarId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.acaoEmAndamento = false;
        this.confirmarInativarId = null;
        this.exibirSucesso('Paciente inativado com sucesso.');
        this.carregar();
      },
      error: () => {
        this.erro = 'Erro ao inativar paciente.';
        this.acaoEmAndamento = false;
        this.confirmarInativarId = null;
        this.cdr.markForCheck();
      }
    });
  }

  ativar(): void {
    if (this.confirmarAtivarId === null || this.acaoEmAndamento) return;
    this.acaoEmAndamento = true;
    this.service.ativar(this.confirmarAtivarId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.acaoEmAndamento = false;
        this.confirmarAtivarId = null;
        this.exibirSucesso('Paciente ativado com sucesso.');
        this.carregar();
      },
      error: () => {
        this.erro = 'Erro ao ativar paciente.';
        this.acaoEmAndamento = false;
        this.confirmarAtivarId = null;
        this.cdr.markForCheck();
      }
    });
  }

  cancelarInativar(): void {
    if (this.acaoEmAndamento) return;
    this.confirmarInativarId = null;
  }

  private exibirSucesso(mensagem: string): void {
    this.sucesso = mensagem;
    if (this.successTimer !== null) {
      clearTimeout(this.successTimer);
    }
    this.successTimer = setTimeout(() => {
      this.sucesso = null;
      this.cdr.markForCheck();
    }, 4000);
  }

  cancelarAtivar(): void {
    if (this.acaoEmAndamento) return;
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

  trackByPaciente(_: number, paciente: PacienteResponseDTO): number {
    return paciente.id;
  }

  pages(): number[] {
    if (this.totalPages <= this.maxVisiblePages) {
      return Array.from({ length: this.totalPages }, (_, i) => i);
    }

    const start = Math.max(0, Math.min(this.currentPage - 2, this.totalPages - this.maxVisiblePages));
    return Array.from({ length: this.maxVisiblePages }, (_, i) => start + i);
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
    if (this.totalElements === 0) return 0;
    return Math.min((this.currentPage + 1) * this.pageSize, this.totalElements);
  }
}
