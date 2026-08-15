import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ListaEsperaResponseDTO } from '../../../core/models/lista-espera';
import { DiaSemana, DIAS_SEMANA_LABEL } from '../../../core/models/plano';
import { ListaEsperaService } from '../../../core/services/lista-espera.service';
import { ConfirmarDialogComponent } from '../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import { extrairMensagemErro } from '../../../shared/utils/api-error';
import {
  descreverEspera,
  DIAS_SEMANA_EXIBICAO,
  formatarFaixa,
  proximoAgendamento
} from '../../../shared/utils/lista-espera';

/**
 * Uma linha da fila, montada na carga. A conversão em sessão precisa da próxima
 * data do dia da semana, que depende do relógio: resolvê-la aqui — e não no
 * template — evita recalcular a data a cada ciclo de detecção de mudanças.
 */
interface LinhaDaFila {
  entrada: ListaEsperaResponseDTO;
  /** Posição na fila consultada; a ordem de chegada é a da API. */
  ordem: number;
  dia: string;
  faixa: string;
  /**
   * `queryParams` do formulário de sessão. Só o início: a faixa da inscrição é
   * uma **janela de disponibilidade** ("posso das 08:00 às 12:00"), e não a
   * duração da sessão — pré-preencher 240 minutos a partir dela marcaria o
   * estúdio por quatro horas.
   */
  conversao: { dataHora: string };
}

/**
 * Lista de espera por horário (issue #137): quem quer entrar num dia da semana
 * e faixa hoje lotados e aguarda a vaga que um cancelamento abrir.
 *
 * A fila é do estúdio inteiro e a tela é aberta a qualquer usuário autenticado,
 * como a agenda: é a recepção que inscreve, consulta e retira da fila.
 *
 * A **ordem é do servidor** — `dataEntrada` crescente, a ordem de chegada — e a
 * tela nunca reordena. Não há edição: a entrada é criada, convertida em sessão
 * ou removida, porque mudar o horário pedido é entrar na fila de outra faixa, e
 * ali a posição de chegada é outra.
 */
@Component({
  selector: 'app-lista-espera-list',
  imports: [DatePipe, FormsModule, RouterLink, ConfirmarDialogComponent],
  templateUrl: './lista-espera-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './lista-espera-list.component.scss'
})
export class ListaEsperaListComponent implements OnInit, OnDestroy {
  filtro: { diaSemana: DiaSemana | 'todos'; horaInicio: string; horaFim: string } = {
    diaSemana: 'todos',
    horaInicio: '',
    horaFim: ''
  };

  /**
   * Filtro que de fato produziu a lista na tela. Separado de `filtro`, que o
   * `[(ngModel)]` move a cada tecla: é ele que a recarga pós-remoção repete, de
   * modo que um filtro digitado pela metade e nunca aplicado não transforme uma
   * remoção bem-sucedida em faixa de erro sobre uma tabela vazia.
   */
  private filtroAplicado = { ...this.filtro };

  linhas: LinhaDaFila[] = [];
  /** Verdadeiro quando a lista na tela veio de uma consulta com filtro. */
  filtrada = false;
  loading = false;
  erro: string | null = null;
  sucesso: string | null = null;
  /** Entrada aguardando confirmação de remoção; `null` com o diálogo fechado. */
  confirmacao: ListaEsperaResponseDTO | null = null;
  acaoEmAndamento = false;

  readonly diasSemana = DIAS_SEMANA_EXIBICAO;
  readonly diaSemanaLabel = DIAS_SEMANA_LABEL;

  private successTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private service: ListaEsperaService,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.carregar();
  }

  ngOnDestroy(): void {
    if (this.successTimer !== null) clearTimeout(this.successTimer);
  }

  /** Aplica o que está nos campos. É o único caminho que move `filtroAplicado`. */
  carregar(): void {
    const invalido = this.validarFiltro();
    if (invalido !== null) {
      this.linhas = [];
      this.erro = invalido;
      this.loading = false;
      return;
    }

    this.filtroAplicado = { ...this.filtro };
    this.buscar();
  }

  /**
   * Consulta com o filtro **aplicado**, e não com o que estiver nos campos: a
   * recarga que segue uma remoção não pode arrastar um filtro que o usuário
   * começou a digitar e ainda não submeteu.
   */
  private buscar(): void {
    this.loading = true;
    this.erro = null;

    const { diaSemana, horaInicio, horaFim } = this.filtroAplicado;
    const comFiltro = diaSemana !== 'todos' || horaInicio !== '';

    this.service.listar({
      diaSemana: diaSemana === 'todos' ? null : diaSemana,
      horaInicio: horaInicio || null,
      horaFim: horaFim || null
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: fila => {
          const agora = new Date();
          this.linhas = fila.map((entrada, indice) => this.montarLinha(entrada, indice, agora));
          this.filtrada = comFiltro;
          this.loading = false;
        },
        error: err => {
          this.linhas = [];
          this.erro = extrairMensagemErro(err, 'Erro ao carregar a lista de espera.');
          this.loading = false;
        }
      });
  }

  limparFiltro(): void {
    this.filtro = { diaSemana: 'todos', horaInicio: '', horaFim: '' };
    this.carregar();
  }

  /**
   * Recusa localmente o que a API recusaria com `400`: meia faixa e faixa
   * invertida. A mensagem sai na hora, em vez de custar uma ida ao servidor.
   */
  private validarFiltro(): string | null {
    const { horaInicio, horaFim } = this.filtro;
    if (!horaInicio && !horaFim) return null;
    if (!horaInicio || !horaFim) {
      return 'Informe as duas pontas do horário, ou deixe as duas em branco.';
    }
    if (horaFim <= horaInicio) return 'A hora final deve ser posterior à inicial.';
    return null;
  }

  private montarLinha(entrada: ListaEsperaResponseDTO, indice: number, agora: Date): LinhaDaFila {
    return {
      entrada,
      ordem: indice + 1,
      dia: DIAS_SEMANA_LABEL[entrada.diaSemana] ?? entrada.diaSemana,
      faixa: formatarFaixa(entrada),
      conversao: { dataHora: proximoAgendamento(entrada, agora) }
    };
  }

  confirmarRemocao(entrada: ListaEsperaResponseDTO): void {
    this.erro = null;
    this.confirmacao = entrada;
  }

  cancelarConfirmacao(): void {
    if (this.acaoEmAndamento) return;
    this.confirmacao = null;
  }

  get mensagemConfirmacao(): string {
    const entrada = this.confirmacao;
    if (entrada === null) return '';
    return `Remover ${descreverEspera(entrada)} da lista de espera? `
      + 'A pessoa perde a posição na fila e precisa ser inscrita de novo para voltar a ela.';
  }

  executarRemocao(): void {
    const entrada = this.confirmacao;
    if (entrada === null || this.acaoEmAndamento) return;

    this.acaoEmAndamento = true;
    this.service.excluir(entrada.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.confirmacao = null;
          this.acaoEmAndamento = false;
          this.exibirSucesso('Entrada removida da lista de espera.');
          // A remoção muda as posições de quem ficou: recarrega em vez de
          // recortar a lista no cliente, que deixaria a coluna de ordem errada.
          this.buscar();
        },
        error: err => {
          this.erro = extrairMensagemErro(err, 'Erro ao remover a entrada.');
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
