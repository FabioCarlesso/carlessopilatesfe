import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnDestroy, OnInit } from '@angular/core';
import { CurrencyPipe, DatePipe, NgFor, NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PlanoService } from '../../../core/services/plano.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { PlanoResponseDTO, TIPO_LABEL, FREQUENCIA_LABEL, DIAS_SEMANA_LABEL } from '../../../core/models/plano';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { ConfirmarDialogComponent } from '../../../shared/components/confirmar-dialog/confirmar-dialog.component';

@Component({
  selector: 'app-plano-list',
  imports: [NgIf, NgFor, CurrencyPipe, DatePipe, RouterLink, ConfirmarDialogComponent, BreadcrumbComponent],
  templateUrl: './plano-list.component.html',
  styleUrl: './plano-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanoListComponent implements OnInit, OnDestroy {
  pacienteId: number | null = null;
  pacienteNome: string | null = null;
  planos: PlanoResponseDTO[] = [];
  loading = false;
  erro: string | null = null;
  sucesso: string | null = null;
  confirmarInativarId: number | null = null;
  acaoEmAndamento = false;
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  readonly tipoLabel = TIPO_LABEL;
  readonly frequenciaLabel = FREQUENCIA_LABEL;
  readonly diasLabel = DIAS_SEMANA_LABEL;

  constructor(private service: PlanoService, private pacienteService: PacienteService, private route: ActivatedRoute, private cdr: ChangeDetectorRef, private destroyRef: DestroyRef) {}

  ngOnInit(): void {
    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    if (this.pacienteId === null) {
      this.erro = 'Identificador inválido.';
      return;
    }
    this.carregarNomePaciente();
    this.carregar();
  }

  private carregarNomePaciente(): void {
    if (this.pacienteId === null) return;
    this.pacienteService.buscar(this.pacienteId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: paciente => {
        this.pacienteNome = paciente.nome;
        this.cdr.markForCheck();
      },
      // Falha ao carregar o nome não bloqueia a listagem (issue #143): mantém o título genérico.
      error: () => { this.pacienteNome = null; }
    });
  }

  ngOnDestroy(): void {
    if (this.successTimer !== null) {
      clearTimeout(this.successTimer);
    }
  }

  carregar(): void {
    if (this.pacienteId === null) {
      this.erro = 'Identificador inválido.';
      return;
    }
    this.loading = true;
    this.erro = null;
    this.service.listar(this.pacienteId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: planos => {
        this.planos = planos;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.erro = 'Erro ao carregar planos.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
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
        this.exibirSucesso('Plano inativado com sucesso.');
        this.carregar();
      },
      error: () => {
        this.erro = 'Erro ao inativar plano.';
        this.acaoEmAndamento = false;
        this.confirmarInativarId = null;
        this.cdr.markForCheck();
      }
    });
  }

  trackByPlano(_: number, plano: PlanoResponseDTO): number {
    return plano.id;
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

  diasFormatados(plano: PlanoResponseDTO): string {
    return plano.diasSemana.map(d => this.diasLabel[d]).join(', ');
  }
}
