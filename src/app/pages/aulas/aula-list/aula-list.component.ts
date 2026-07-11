import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnDestroy, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AulaService } from '../../../core/services/aula.service';
import { PagamentoService } from '../../../core/services/pagamento.service';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { AulaResponseDTO } from '../../../core/models/plano';
import { ProfissionalResponseDTO } from '../../../core/models/profissional';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { ConfirmarDialogComponent } from '../../../shared/components/confirmar-dialog/confirmar-dialog.component';

@Component({
  selector: 'app-aula-list',
  imports: [NgIf, NgFor, DatePipe, FormsModule, RouterLink, ConfirmarDialogComponent],
  templateUrl: './aula-list.component.html',
  styleUrl: './aula-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AulaListComponent implements OnInit, OnDestroy {
  pacienteId: number | null = null;
  pagamentoId: number | null = null;
  aulas: AulaResponseDTO[] = [];
  profissionais: ProfissionalResponseDTO[] = [];
  profissionalSelecionadoPorAula: Record<number, number | null> = {};
  selectInvalidoPorAula: Record<number, boolean> = {};
  confirmarAulaId: number | null = null;
  acaoEmAndamento = false;
  loading = false;
  erro: string | null = null;
  sucesso: string | null = null;
  titulo = 'Aulas';
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private service: AulaService,
    private pagamentoService: PagamentoService,
    private profissionalService: ProfissionalService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    const rawPacienteId = this.route.snapshot.paramMap.get('pacienteId');
    const rawPagamentoId = this.route.snapshot.paramMap.get('pagamentoId');

    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    this.pagamentoId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pagamentoId');
    this.titulo = this.pagamentoId !== null ? 'Aulas do Pagamento' : 'Aulas do Paciente';

    if ((rawPacienteId !== null && this.pacienteId === null) || (rawPagamentoId !== null && this.pagamentoId === null)) {
      this.erro = 'Identificador inválido.';
      return;
    }

    if (this.pacienteId === null && this.pagamentoId === null) {
      this.erro = 'Identificador inválido.';
      return;
    }

    this.carregarProfissionais();

    if (this.pagamentoId !== null) {
      this.loading = true;
      this.erro = null;
      this.pagamentoService.buscar(this.pagamentoId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: pagamento => {
          this.pacienteId = pagamento.pacienteId;
          this.carregar();
        },
        error: () => {
          this.erro = 'Erro ao carregar dados do pagamento.';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
    } else {
      this.carregar();
    }
  }

  ngOnDestroy(): void {
    if (this.successTimer !== null) {
      clearTimeout(this.successTimer);
    }
  }

  carregarProfissionais(): void {
    this.profissionalService.listar(0, 100).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: page => {
        this.profissionais = page.content;
        this.cdr.markForCheck();
      },
      error: () => {
        this.erro = 'Erro ao carregar profissionais.';
        this.cdr.markForCheck();
      }
    });
  }

  carregar(): void {
    if (this.pacienteId === null && this.pagamentoId === null) {
      this.erro = 'Identificador inválido.';
      return;
    }
    this.loading = true;
    this.erro = null;
    const request$ = this.pagamentoId !== null
      ? this.service.listarPorPagamento(this.pagamentoId)
      : this.service.listarPorPaciente(this.pacienteId!);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: aulas => {
        this.aulas = aulas;
        this.profissionalSelecionadoPorAula = aulas.reduce<Record<number, number | null>>((acc, aula) => {
          acc[aula.id] = aula.profissionalId ?? null;
          return acc;
        }, {});
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.erro = 'Erro ao carregar aulas.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  trackByAula(_: number, aula: AulaResponseDTO): number {
    return aula.id;
  }

  get aulaEmConfirmacao(): AulaResponseDTO | null {
    if (this.confirmarAulaId === null) return null;
    return this.aulas.find(aula => aula.id === this.confirmarAulaId) ?? null;
  }

  get profissionalEmConfirmacaoNome(): string {
    const aula = this.aulaEmConfirmacao;
    if (aula === null) return '';
    const profissionalId = this.profissionalSelecionadoPorAula[aula.id];
    return this.profissionais.find(profissional => profissional.id === profissionalId)?.nome ?? '';
  }

  solicitarRealizar(id: number): void {
    if (this.acaoEmAndamento) return;

    const profissionalId = this.profissionalSelecionadoPorAula[id];
    if (!profissionalId) {
      this.selectInvalidoPorAula[id] = true;
      this.erro = 'Selecione um profissional para marcar a aula como realizada.';
      return;
    }

    this.selectInvalidoPorAula[id] = false;
    this.erro = null;
    this.confirmarAulaId = id;
  }

  cancelarConfirmacao(): void {
    if (this.acaoEmAndamento) return;
    this.confirmarAulaId = null;
  }

  confirmarRealizar(): void {
    if (this.confirmarAulaId === null || this.acaoEmAndamento) return;

    const id = this.confirmarAulaId;
    const profissionalId = this.profissionalSelecionadoPorAula[id];
    if (!profissionalId) {
      this.selectInvalidoPorAula[id] = true;
      this.erro = 'Selecione um profissional para marcar a aula como realizada.';
      this.confirmarAulaId = null;
      return;
    }

    this.acaoEmAndamento = true;
    this.service.realizar(id, profissionalId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.acaoEmAndamento = false;
        this.confirmarAulaId = null;
        this.exibirSucesso('Aula marcada como realizada.');
        this.carregar();
      },
      error: () => {
        this.acaoEmAndamento = false;
        this.confirmarAulaId = null;
        this.erro = 'Erro ao marcar aula como realizada.';
        this.cdr.markForCheck();
      }
    });
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
}
