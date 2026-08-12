import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  BLOQUEIO_PERIODO_MAX_DIAS,
  BloqueioAgendaResponseDTO
} from '../../../../core/models/bloqueio-agenda';
import { BloqueioAgendaService } from '../../../../core/services/bloqueio-agenda.service';
import { ConfirmarDialogComponent } from '../../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import { LocalDatePipe } from '../../../../shared/pipes/local-date.pipe';
import { extrairMensagemErro } from '../../../../shared/utils/api-error';
import { formatarFaixaHoraria, formatarPeriodo } from '../../../../shared/utils/bloqueio-agenda';
import { hojeIso, paraData } from '../../../../shared/utils/calendario';

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Cadastro de bloqueios de agenda (issue #135): feriados, manutenções e eventos
 * em que o estúdio não funciona.
 *
 * A listagem é **por período**, como a da agenda: `GET /api/bloqueios` não é
 * paginado e exige as duas pontas. O período abre no **ano corrente** porque é
 * assim que feriado se cadastra e se confere — de uma vez, para o ano inteiro —,
 * e é justamente por isso que a API aceita aqui 366 dias em vez dos 92 da
 * agenda.
 */
@Component({
  selector: 'app-bloqueio-list',
  imports: [FormsModule, RouterLink, ConfirmarDialogComponent, LocalDatePipe],
  templateUrl: './bloqueio-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './bloqueio-list.component.scss'
})
export class BloqueioListComponent implements OnInit, OnDestroy {
  private readonly hoje = hojeIso();

  periodo = {
    inicio: `${this.hoje.slice(0, 4)}-01-01`,
    fim: `${this.hoje.slice(0, 4)}-12-31`
  };

  bloqueios: BloqueioAgendaResponseDTO[] = [];
  loading = false;
  erro: string | null = null;
  sucesso: string | null = null;
  /** Bloqueio aguardando confirmação de exclusão; `null` com o diálogo fechado. */
  confirmacao: BloqueioAgendaResponseDTO | null = null;
  acaoEmAndamento = false;

  private successTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private service: BloqueioAgendaService,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.carregar();
  }

  ngOnDestroy(): void {
    if (this.successTimer !== null) clearTimeout(this.successTimer);
  }

  carregar(): void {
    const invalido = this.validarPeriodo();
    if (invalido !== null) {
      this.bloqueios = [];
      this.erro = invalido;
      this.loading = false;
      return;
    }

    this.loading = true;
    this.erro = null;

    this.service.listarPorPeriodo(this.periodo.inicio, this.periodo.fim)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: bloqueios => {
          this.bloqueios = bloqueios;
          this.loading = false;
        },
        error: err => {
          this.bloqueios = [];
          this.erro = extrairMensagemErro(err, 'Erro ao carregar bloqueios.');
          this.loading = false;
        }
      });
  }

  /**
   * Recusa localmente o que a API recusaria com `400`, para que um período
   * digitado ao contrário devolva a mensagem na hora em vez de custar uma ida
   * ao servidor.
   */
  private validarPeriodo(): string | null {
    const { inicio, fim } = this.periodo;
    if (!inicio || !fim) return 'Informe o período inicial e o final.';
    if (fim < inicio) return 'O período inicial não pode ser posterior ao final.';

    const dias = Math.round((paraData(fim).getTime() - paraData(inicio).getTime()) / MS_POR_DIA) + 1;
    if (dias > BLOQUEIO_PERIODO_MAX_DIAS) {
      return `A consulta por período é limitada a ${BLOQUEIO_PERIODO_MAX_DIAS} dias.`;
    }
    return null;
  }

  faixaHoraria(bloqueio: BloqueioAgendaResponseDTO): string {
    return formatarFaixaHoraria(bloqueio);
  }

  periodoDoBloqueio(bloqueio: BloqueioAgendaResponseDTO): string {
    return formatarPeriodo(bloqueio);
  }

  confirmarExclusao(bloqueio: BloqueioAgendaResponseDTO): void {
    this.erro = null;
    this.confirmacao = bloqueio;
  }

  cancelarConfirmacao(): void {
    if (this.acaoEmAndamento) return;
    this.confirmacao = null;
  }

  get mensagemConfirmacao(): string {
    const bloqueio = this.confirmacao;
    if (bloqueio === null) return '';
    return `Confirma a exclusão do bloqueio "${bloqueio.motivo}" (${formatarPeriodo(bloqueio)})? `
      + 'Esta ação não pode ser desfeita.';
  }

  executarExclusao(): void {
    const bloqueio = this.confirmacao;
    if (bloqueio === null || this.acaoEmAndamento) return;

    this.acaoEmAndamento = true;
    this.service.excluir(bloqueio.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.confirmacao = null;
          this.acaoEmAndamento = false;
          this.exibirSucesso('Bloqueio excluído com sucesso.');
          this.carregar();
        },
        error: err => {
          this.erro = extrairMensagemErro(err, 'Erro ao excluir bloqueio.');
          this.confirmacao = null;
          this.acaoEmAndamento = false;
        }
      });
  }

  private exibirSucesso(mensagem: string): void {
    this.sucesso = mensagem;
    if (this.successTimer !== null) clearTimeout(this.successTimer);
    this.successTimer = setTimeout(() => { this.sucesso = null; }, 4000);
  }
}
