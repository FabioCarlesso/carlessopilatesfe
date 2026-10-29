import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map, of, switchMap } from 'rxjs';
import { PAPEIS } from '../../../core/models/auth';
import { AuthService } from '../../../core/services/auth.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { STATUS_PAGAMENTO_LABEL, TIPO_LABEL } from '../../../core/models/plano';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { PlanoService } from '../../../core/services/plano.service';
import {
  SituacaoPlano,
  calcularSituacaoPlano,
  descreverPrazoRenovacao
} from '../../../shared/utils/renovacao-plano';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { ConfirmarDialogComponent } from '../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';

@Component({
  selector: 'app-paciente-detail',
  imports: [CurrencyPipe, DatePipe, RouterLink, ConfirmarDialogComponent, CarregandoComponent],
  templateUrl: './paciente-detail.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './paciente-detail.component.scss'
})
export class PacienteDetailComponent implements OnInit {
  paciente: PacienteResponseDTO | null = null;
  loading = false;
  erro: string | null = null;
  confirmarInativar = false;
  confirmarAtivar = false;
  acaoEmAndamento = false;
  readonly papeis = PAPEIS;
  readonly tipoLabel = TIPO_LABEL;
  readonly statusPagamentoLabel = STATUS_PAGAMENTO_LABEL;
  readonly descreverPrazo = descreverPrazoRenovacao;

  /** Bloco "Plano e renovação" (issue #133); `null` enquanto carrega ou para quem não é da cobrança. */
  situacaoPlano: SituacaoPlano | null = null;
  carregandoSituacao = false;
  erroSituacao: string | null = null;

  constructor(
    private service: PacienteService,
    private planoService: PlanoService,
    private pagamentoService: PagamentoService,
    public authService: AuthService,
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
    this.carregarSituacaoPlano(id);
    this.service.buscar(id).subscribe({
      next: p => {
        this.paciente = p;
        this.loading = false;
      },
      error: () => {
        this.erro = 'Paciente não encontrado.';
        this.loading = false;
      }
    });
  }

  /**
   * Só a cobrança (ADMIN, RECEPCAO e FINANCEIRO) acessa `/planos/**` e
   * `/pagamentos/**` na API: para os demais papéis nenhuma chamada é feita, em
   * vez de colher um `403`. Sem plano ativo (`204`) os pagamentos nem são
   * buscados.
   */
  private carregarSituacaoPlano(pacienteId: number): void {
    if (!this.authService.hasAnyRole(PAPEIS.cobranca)) return;
    this.carregandoSituacao = true;
    this.erroSituacao = null;
    this.planoService
      .buscarAtivo(pacienteId)
      .pipe(
        switchMap(plano =>
          plano
            ? this.pagamentoService.listar(pacienteId).pipe(map(pagamentos => calcularSituacaoPlano(plano, pagamentos)))
            : of(calcularSituacaoPlano(null, []))
        )
      )
      .subscribe({
        next: situacao => {
          this.situacaoPlano = situacao;
          this.carregandoSituacao = false;
        },
        error: () => {
          this.erroSituacao = 'Erro ao carregar a situação do plano.';
          this.carregandoSituacao = false;
        }
      });
  }

  ativar(): void {
    if (!this.paciente || this.acaoEmAndamento) return;
    this.acaoEmAndamento = true;
    this.service.ativar(this.paciente.id).subscribe({
      next: () => this.router.navigate(['/pacientes']),
      error: () => {
        this.erro = 'Erro ao ativar paciente.';
        this.acaoEmAndamento = false;
        this.confirmarAtivar = false;
      }
    });
  }

  inativar(): void {
    if (!this.paciente || this.acaoEmAndamento) return;
    this.acaoEmAndamento = true;
    this.service.inativar(this.paciente.id).subscribe({
      next: () => this.router.navigate(['/pacientes']),
      error: () => {
        this.erro = 'Erro ao inativar paciente.';
        this.acaoEmAndamento = false;
        this.confirmarInativar = false;
      }
    });
  }
}
