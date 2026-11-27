import { Component, DestroyRef, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, forkJoin, map } from 'rxjs';
import { PAPEIS, UserRole } from '../../../core/models/auth';
import { AuthService } from '../../../core/services/auth.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { STATUS_PAGAMENTO_LABEL, TIPO_LABEL } from '../../../core/models/plano';
import { AulaService } from '../../../core/services/aula.service';
import { AvaliacaoFisioterapeuticaService } from '../../../core/services/avaliacao-fisioterapeutica.service';
import { EvolucaoSessaoService } from '../../../core/services/evolucao-sessao.service';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { PlanoService } from '../../../core/services/plano.service';
import { descreverPrazoRenovacao } from '../../../shared/utils/renovacao-plano';
import {
  AREAS_PACIENTE,
  AREA_PACIENTE_LABEL,
  AreaPaciente,
  DIAS_FALTAS_RECENTES,
  ResumoAgenda,
  ResumoClinico,
  ResumoFinanceiro,
  lerAreaPaciente,
  resumirAgenda,
  resumirClinico,
  resumirFinanceiro
} from '../../../shared/utils/resumo-paciente';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { exibirValorGravado } from '../../../shared/utils/mascara';
import { ConfirmarDialogComponent } from '../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';
import { ExportarProntuarioComponent } from '../../../shared/components/exportar-prontuario/exportar-prontuario.component';

/** Estado do resumo de uma área: carregado uma vez, na primeira abertura da aba. */
interface EstadoResumo<T> {
  carregando: boolean;
  erro: string | null;
  dados: T | null;
}

function resumoVazio<T>(): EstadoResumo<T> {
  return { carregando: false, erro: null, dados: null };
}

/**
 * Quem alcança cada área: são os grupos das rotas dos atalhos dela. Na área
 * Financeiro o atalho de NFSE ainda exige _fiscal_, que está contido em
 * _cobrança_.
 */
const PAPEIS_DA_AREA: Record<AreaPaciente, readonly UserRole[]> = {
  clinico: PAPEIS.clinica,
  agenda: PAPEIS.agenda,
  financeiro: PAPEIS.cobranca
};

@Component({
  selector: 'app-paciente-detail',
  imports: [CurrencyPipe, DatePipe, RouterLink, ConfirmarDialogComponent, CarregandoComponent, ExportarProntuarioComponent],
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
  /** CPF/CNPJ do tomador da nota, gravado só com dígitos, com a pontuação de exibição. */
  readonly documentoTomador = (valor: string | null): string => exibirValorGravado('cpfCnpj', valor);
  readonly tipoLabel = TIPO_LABEL;
  readonly statusPagamentoLabel = STATUS_PAGAMENTO_LABEL;
  readonly descreverPrazo = descreverPrazoRenovacao;
  readonly areaLabel = AREA_PACIENTE_LABEL;
  readonly diasFaltasRecentes = DIAS_FALTAS_RECENTES;

  /**
   * Áreas que o papel alcança (issue #301), na ordem das abas. Uma área sem
   * nenhum atalho acessível não aparece — e o resumo dela nunca é pedido, em vez
   * de colher um `403`.
   */
  abas: AreaPaciente[] = [];
  /** Aba aberta, lida de `?aba=`; a URL é a fonte, para o voltar do navegador funcionar. */
  aba: AreaPaciente | null = null;

  resumoClinico: EstadoResumo<ResumoClinico> = resumoVazio();
  resumoAgenda: EstadoResumo<ResumoAgenda> = resumoVazio();
  resumoFinanceiro: EstadoResumo<ResumoFinanceiro> = resumoVazio();

  private pacienteId: number | null = null;
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private service: PacienteService,
    private planoService: PlanoService,
    private pagamentoService: PagamentoService,
    private aulaService: AulaService,
    private avaliacaoService: AvaliacaoFisioterapeuticaService,
    private evolucaoService: EvolucaoSessaoService,
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
    this.pacienteId = id;
    this.abas = AREAS_PACIENTE.filter(area => this.authService.hasAnyRole(PAPEIS_DA_AREA[area]));
    this.loading = true;
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

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.aba = lerAreaPaciente(params.get('aba'), this.abas);
      if (this.aba) this.carregarResumo(this.aba);
    });
  }

  /** Grava a aba na URL; cada troca é uma entrada do histórico, desfeita pelo voltar. */
  selecionarAba(area: AreaPaciente): void {
    if (area === this.aba) return;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { aba: area },
      queryParamsHandling: 'merge'
    });
  }

  /** Padrão de abas da WAI-ARIA, como no detalhe do profissional: setas e Home/End trocam de aba e levam o foco junto. */
  navegarAbas(evento: KeyboardEvent): void {
    if (!this.aba) return;
    const total = this.abas.length;
    const atual = this.abas.indexOf(this.aba);
    const destinos: Record<string, number> = {
      ArrowRight: (atual + 1) % total,
      ArrowLeft: (atual - 1 + total) % total,
      Home: 0,
      End: total - 1
    };
    const destino = destinos[evento.key];
    if (destino === undefined) return;

    evento.preventDefault();
    const area = this.abas[destino];
    this.selecionarAba(area);
    const lista = (evento.target as HTMLElement).closest('[role="tablist"]');
    lista?.querySelector<HTMLElement>(`#aba-${area}`)?.focus();
  }

  /** Resumo da área, pedido só na primeira vez que ela é aberta. */
  private carregarResumo(area: AreaPaciente): void {
    const id = this.pacienteId;
    if (id === null) return;
    if (area === 'clinico') {
      this.carregar(this.resumoClinico, 'Erro ao carregar o resumo clínico.', () => forkJoin({
        avaliacoes: this.avaliacaoService.listarPorPaciente(id),
        evolucoes: this.evolucaoService.listarPorPaciente(id)
      }).pipe(map(({ avaliacoes, evolucoes }) => resumirClinico(avaliacoes, evolucoes))));
    } else if (area === 'agenda') {
      this.carregar(this.resumoAgenda, 'Erro ao carregar o resumo da agenda.',
        () => this.aulaService.listarPorPaciente(id).pipe(map(aulas => resumirAgenda(aulas))));
    } else {
      // Os pagamentos são buscados mesmo sem plano ativo: a pendência de um
      // plano anterior continua sendo pendência.
      this.carregar(this.resumoFinanceiro, 'Erro ao carregar o resumo financeiro.', () => forkJoin({
        plano: this.planoService.buscarAtivo(id),
        pagamentos: this.pagamentoService.listar(id)
      }).pipe(map(({ plano, pagamentos }) => resumirFinanceiro(plano, pagamentos))));
    }
  }

  /** `buscar` é uma fábrica para nem montar as chamadas quando o resumo já existe. */
  private carregar<T>(estado: EstadoResumo<T>, mensagemErro: string, buscar: () => Observable<T>): void {
    if (estado.carregando || estado.dados) return;
    estado.carregando = true;
    estado.erro = null;
    buscar().subscribe({
      next: dados => {
        estado.dados = dados;
        estado.carregando = false;
      },
      error: () => {
        estado.erro = mensagemErro;
        estado.carregando = false;
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
