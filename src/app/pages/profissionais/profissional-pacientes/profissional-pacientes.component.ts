import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { PacienteService } from '../../../core/services/paciente.service';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

/** Tamanho da página: a lista de um profissional é curta, e a aba não tem seletor. */
export const PACIENTES_DO_PROFISSIONAL_POR_PAGINA = 10;

/**
 * Aba "Pacientes" do detalhe do profissional (issue #300): os pacientes que têm
 * este profissional como **fisioterapeuta padrão**, por
 * `GET /api/pacientes?profissionalId=` (carlessopilatesapi#245), paginado no
 * servidor e ordenado por nome.
 *
 * O vínculo é o do cadastro do paciente, e não o das aulas: quem só cobriu a
 * folga de outro profissional numa aula não aparece aqui.
 */
@Component({
  selector: 'app-profissional-pacientes',
  imports: [RouterLink, CarregandoComponent, EmptyStateComponent],
  templateUrl: './profissional-pacientes.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './profissional-pacientes.component.scss'
})
export class ProfissionalPacientesComponent implements OnInit {
  @Input({ required: true }) profissionalId!: number;

  private readonly service = inject(PacienteService);
  private readonly destroyRef = inject(DestroyRef);

  pacientes: PacienteResponseDTO[] = [];
  pagina = 0;
  totalPaginas = 0;
  totalElementos = 0;
  loading = false;
  erro: string | null = null;

  ngOnInit(): void {
    this.carregar(0);
  }

  carregar(pagina: number): void {
    this.loading = true;
    this.erro = null;
    this.service.listar(pagina, PACIENTES_DO_PROFISSIONAL_POR_PAGINA, { profissionalId: this.profissionalId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: resposta => {
          this.pacientes = resposta.content;
          // A página devolvida pela API é a fonte de verdade; a pedida só vale
          // como retaguarda se o metadado vier ausente.
          this.pagina = resposta.page?.number ?? pagina;
          this.totalPaginas = resposta.page?.totalPages ?? 0;
          this.totalElementos = resposta.page?.totalElements ?? resposta.content.length;
          this.loading = false;
        },
        error: () => {
          this.erro = 'Erro ao carregar os pacientes do profissional.';
          this.loading = false;
        }
      });
  }

  anterior(): void {
    if (this.pagina > 0 && !this.loading) this.carregar(this.pagina - 1);
  }

  proxima(): void {
    if (this.pagina < this.totalPaginas - 1 && !this.loading) this.carregar(this.pagina + 1);
  }
}
