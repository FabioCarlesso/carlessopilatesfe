import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TomadorService } from '../../../core/services/tomador.service';
import { TomadorFiltro, TomadorResponseDTO } from '../../../core/models/tomador';
import { exibirValorGravado } from '../../../shared/utils/mascara';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

type Situacao = 'ativos' | 'inativos';

/**
 * Tomadores da nota fiscal (carlessopilatesapi#229): quem recebe a nota quando não é
 * o próprio paciente. Um tomador atende vários pacientes.
 */
@Component({
  selector: 'app-tomador-list',
  imports: [FormsModule, RouterLink, CarregandoComponent, EmptyStateComponent],
  templateUrl: './tomador-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TomadorListComponent implements OnInit {
  tomadores: TomadorResponseDTO[] = [];
  loading = false;
  erro: string | null = null;
  pagina = 0;
  totalPaginas = 0;
  totalElementos = 0;
  readonly tamanhoPagina = 20;
  filtro: { nome: string; cpfCnpj: string; situacao: Situacao } = { nome: '', cpfCnpj: '', situacao: 'ativos' };
  /** Se a última busca saiu com filtro: o estado vazio descreve a busca que produziu a lista. */
  buscaFiltrada = false;

  constructor(private service: TomadorService, private cdr: ChangeDetectorRef, private destroyRef: DestroyRef) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.loading = true;
    this.erro = null;
    this.buscaFiltrada = !!(this.filtro.nome.trim() || this.filtro.cpfCnpj.trim() || this.filtro.situacao !== 'ativos');
    this.service.listar(this.pagina, this.tamanhoPagina, this.montarFiltro())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: page => {
          this.tomadores = page.content;
          this.totalPaginas = page.page?.totalPages ?? 0;
          this.totalElementos = page.page?.totalElements ?? page.content.length;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.erro = 'Erro ao carregar tomadores.';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  buscar(): void {
    this.pagina = 0;
    this.carregar();
  }

  limparFiltros(): void {
    this.filtro = { nome: '', cpfCnpj: '', situacao: 'ativos' };
    this.buscar();
  }

  irParaPagina(p: number): void {
    if (p < 0 || p >= this.totalPaginas || p === this.pagina) return;
    this.pagina = p;
    this.carregar();
  }

  documento(cpfCnpj: string): string {
    return exibirValorGravado('cpfCnpj', cpfCnpj);
  }

  private montarFiltro(): TomadorFiltro {
    // A API filtra ativos ou inativos (omitir `ativo` traz só os ativos), então a tela
    // oferece as duas situações em vez de um "todos" que a consulta não atende.
    const filtro: TomadorFiltro = { nome: this.filtro.nome.trim(), cpfCnpj: this.filtro.cpfCnpj.trim() };
    filtro.ativo = this.filtro.situacao === 'ativos';
    return filtro;
  }
}
