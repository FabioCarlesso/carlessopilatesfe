import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { ProfissionalResponseDTO, TIPO_CONTRATO_LABEL } from '../../../core/models/profissional';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { ConfirmarDialogComponent } from '../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';
import { ProfissionalDisponibilidadeComponent } from '../profissional-disponibilidade/profissional-disponibilidade.component';

export type AbaProfissional = 'dados' | 'disponibilidade';
const ABAS: readonly AbaProfissional[] = ['dados', 'disponibilidade'];

@Component({
  selector: 'app-profissional-detail',
  imports: [DatePipe, RouterLink, ConfirmarDialogComponent, CarregandoComponent, ProfissionalDisponibilidadeComponent],
  templateUrl: './profissional-detail.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './profissional-detail.component.scss'
})
export class ProfissionalDetailComponent implements OnInit {
  profissional: ProfissionalResponseDTO | null = null;
  loading = false;
  erro: string | null = null;
  confirmarAtivar = false;
  confirmarInativar = false;
  acaoEmAndamento = false;
  /**
   * Aba visível (issue #134). A de disponibilidade só é montada quando
   * escolhida: a grade custa um `GET` próprio, que quem abre o detalhe para
   * editar ou inativar o cadastro não precisa pagar.
   */
  aba: AbaProfissional = 'dados';

  readonly tipoContratoLabel = TIPO_CONTRATO_LABEL;

  constructor(
    private service: ProfissionalService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = parseRouteNumberParam(this.route.snapshot.paramMap, 'id');
    if (id === null) {
      this.erro = 'Identificador inválido.';
      return;
    }

    this.loading = true;
    this.service.buscar(id).subscribe({
      next: profissional => {
        this.profissional = profissional;
        this.loading = false;
      },
      error: () => {
        this.erro = 'Profissional não encontrado.';
        this.loading = false;
      }
    });
  }

  ativar(): void {
    if (!this.profissional || this.acaoEmAndamento) return;

    this.acaoEmAndamento = true;
    this.service.ativar(this.profissional.id).subscribe({
      next: () => this.router.navigate(['/profissionais']),
      error: () => {
        this.erro = 'Erro ao ativar profissional.';
        this.acaoEmAndamento = false;
        this.confirmarAtivar = false;
      }
    });
  }

  inativar(): void {
    if (!this.profissional || this.acaoEmAndamento) return;

    this.acaoEmAndamento = true;
    this.service.inativar(this.profissional.id).subscribe({
      next: () => this.router.navigate(['/profissionais']),
      error: () => {
        this.erro = 'Erro ao inativar profissional.';
        this.acaoEmAndamento = false;
        this.confirmarInativar = false;
      }
    });
  }

  selecionarAba(aba: AbaProfissional): void {
    this.aba = aba;
  }

  /** Padrão de abas da WAI-ARIA: setas e Home/End trocam de aba e levam o foco junto. */
  navegarAbas(evento: KeyboardEvent): void {
    const atual = ABAS.indexOf(this.aba);
    const destinos: Record<string, number> = {
      ArrowRight: (atual + 1) % ABAS.length,
      ArrowLeft: (atual - 1 + ABAS.length) % ABAS.length,
      Home: 0,
      End: ABAS.length - 1
    };
    const destino = destinos[evento.key];
    if (destino === undefined) return;

    evento.preventDefault();
    this.aba = ABAS[destino];
    const lista = (evento.target as HTMLElement).closest('[role="tablist"]');
    lista?.querySelector<HTMLElement>(`#aba-${this.aba}`)?.focus();
  }
}
