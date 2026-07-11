import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ConfirmarDialogComponent } from '../../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import { UsuarioAdminService } from '../../../../core/services/usuario-admin.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ROLE_OPTIONS, UsuarioAdminResponseDTO } from '../../../../core/models/usuario-admin';
import { PageMetadata } from '../../../../core/models/common';
import { UserRole } from '../../../../core/models/auth';

type ConfirmacaoAcao = 'inativar' | 'ativar' | 'excluir';

interface Confirmacao {
  acao: ConfirmacaoAcao;
  usuario: UsuarioAdminResponseDTO;
}

const ROLE_LABEL: Record<UserRole, string> = ROLE_OPTIONS.reduce((acc, opt) => {
  acc[opt.value] = opt.label;
  return acc;
}, {} as Record<UserRole, string>);

@Component({
  selector: 'app-usuario-list',
  standalone: true,
  imports: [NgIf, NgFor, RouterLink, ConfirmarDialogComponent],
  templateUrl: './usuario-list.component.html',
  styleUrl: './usuario-list.component.scss'
})
export class UsuarioListComponent implements OnInit {
  usuarios: UsuarioAdminResponseDTO[] = [];
  totalPages = 0;
  currentPage = 0;
  pageSize = 10;
  visiblePages: number[] = [];
  readonly maxVisiblePages = 5;
  loading = false;
  erro: string | null = null;
  confirmacao: Confirmacao | null = null;
  acaoEmAndamento = false;
  private currentUserId: number | null = null;

  readonly roleLabel = ROLE_LABEL;

  constructor(
    private service: UsuarioAdminService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.auth.getCurrentUser()?.id ?? null;
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

        this.usuarios = page.content;
        this.totalPages = totalPages;
        this.currentPage = this.normalizarPagina(meta.number, this.currentPage);
        this.pageSize = this.normalizarTamanhoPagina(meta.size, this.pageSize);
        this.visiblePages = this.pages();
        this.loading = false;
      },
      error: () => {
        this.erro = 'Erro ao carregar usuários.';
        this.loading = false;
      }
    });
  }

  isUsuarioAtual(usuario: UsuarioAdminResponseDTO): boolean {
    return this.currentUserId === usuario.id;
  }

  confirmarAcao(acao: ConfirmacaoAcao, usuario: UsuarioAdminResponseDTO): void {
    this.erro = null;
    this.confirmacao = { acao, usuario };
  }

  cancelarConfirmacao(): void {
    if (this.acaoEmAndamento) return;
    this.confirmacao = null;
  }

  executarConfirmacao(): void {
    if (!this.confirmacao || this.acaoEmAndamento) return;
    const { acao, usuario } = this.confirmacao;

    this.acaoEmAndamento = true;

    const onError = () => {
      this.erro = this.mensagemErro(acao);
      this.confirmacao = null;
      this.acaoEmAndamento = false;
    };

    const onSuccess = () => {
      this.confirmacao = null;
      this.acaoEmAndamento = false;
      this.carregar();
    };

    switch (acao) {
      case 'inativar':
        this.service.inativar(usuario.id).subscribe({ next: onSuccess, error: onError });
        break;
      case 'ativar':
        this.service.ativar(usuario.id).subscribe({ next: onSuccess, error: onError });
        break;
      case 'excluir':
        this.service.excluir(usuario.id).subscribe({ next: onSuccess, error: onError });
        break;
    }
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

  mensagemConfirmacao(): string {
    if (!this.confirmacao) return '';
    const nome = this.confirmacao.usuario.name;
    switch (this.confirmacao.acao) {
      case 'inativar':
        return `Confirma a inativação do usuário ${nome}?`;
      case 'ativar':
        return `Confirma a reativação do usuário ${nome}?`;
      case 'excluir':
        return `Confirma a exclusão do usuário ${nome}? Esta ação não pode ser desfeita.`;
    }
  }

  private mensagemErro(acao: ConfirmacaoAcao): string {
    switch (acao) {
      case 'inativar':
        return 'Erro ao inativar usuário.';
      case 'ativar':
        return 'Erro ao reativar usuário.';
      case 'excluir':
        return 'Erro ao excluir usuário.';
    }
  }

  private normalizarPagina(pageNumber: number | undefined, fallback: number): number {
    return typeof pageNumber === 'number' && Number.isInteger(pageNumber) && pageNumber >= 0 ? pageNumber : fallback;
  }

  private normalizarTamanhoPagina(size: number | undefined, fallback: number): number {
    return typeof size === 'number' && Number.isInteger(size) && size > 0 ? size : fallback;
  }
}
