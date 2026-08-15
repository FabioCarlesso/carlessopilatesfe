import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of, throwError } from 'rxjs';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { ListaEsperaResponseDTO } from '../../../core/models/lista-espera';
import { SessaoResponseDTO, SESSAO_STATUS_LABEL, SESSAO_TIPO_LABEL } from '../../../core/models/sessao';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { ListaEsperaService } from '../../../core/services/lista-espera.service';
import { SessaoService } from '../../../core/services/sessao.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { extrairMensagemErro } from '../../../shared/utils/api-error';
import { avisoDeInteressados, faixaDoAgendamento } from '../../../shared/utils/lista-espera';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { focarPrimeiroInvalido } from '../../../shared/utils/form-focus';
import { ConfirmarDialogComponent } from '../../../shared/components/confirmar-dialog/confirmar-dialog.component';

function dataHoraFutura(control: AbstractControl): ValidationErrors | null {
  const valor = control.value;
  if (!valor) return null;

  const dataHora = new Date(valor);
  if (Number.isNaN(dataHora.getTime())) {
    return { dataHoraFutura: true };
  }

  return dataHora.getTime() > Date.now() ? null : { dataHoraFutura: true };
}

/** Data/hora local no formato aceito pelo `input[type=datetime-local]` (sem segundos). */
function formatarDataHoraLocal(data: Date): string {
  const pad = (valor: number) => String(valor).padStart(2, '0');
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`
    + `T${pad(data.getHours())}:${pad(data.getMinutes())}`;
}

@Component({
  selector: 'app-paciente-sessao-list',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, ConfirmarDialogComponent, BreadcrumbComponent],
  templateUrl: './paciente-sessao-list.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './paciente-sessao-list.component.scss'
})
export class PacienteSessaoListComponent implements OnInit, OnDestroy {
  pacienteId: number | null = null;
  paciente: PacienteResponseDTO | null = null;
  sessoes: SessaoResponseDTO[] = [];
  loading = false;
  erro: string | null = null;
  sucesso: string | null = null;
  confirmarAcaoId: number | null = null;
  acaoPendente: 'realizar' | 'cancelar' | null = null;
  acaoEmAndamentoId: number | null = null;
  reagendarId: number | null = null;
  reagendarForm!: FormGroup;
  reagendarMinDataHora = '';
  /**
   * Interessados na faixa da sessão que está para ser cancelada (issue #137).
   * Consultados ao abrir a confirmação e limpos ao fechá-la: a fila muda, e uma
   * lista guardada da confirmação anterior descreveria outro horário.
   */
  interessados: ListaEsperaResponseDTO[] = [];
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  readonly statusLabel = SESSAO_STATUS_LABEL;
  readonly tipoLabel = SESSAO_TIPO_LABEL;

  constructor(
    private sessaoService: SessaoService,
    private pacienteService: PacienteService,
    private listaEsperaService: ListaEsperaService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private destroyRef: DestroyRef,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.reagendarForm = this.fb.group({
      dataHora: ['', [Validators.required, dataHoraFutura]]
    });

    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    if (this.pacienteId === null) {
      this.erro = 'Identificador inválido.';
      return;
    }
    this.carregar();
  }

  ngOnDestroy(): void {
    if (this.successTimer !== null) {
      clearTimeout(this.successTimer);
    }
  }

  carregar(): void {
    if (this.pacienteId === null) return;

    this.loading = true;
    this.erro = null;

    this.pacienteService.buscar(this.pacienteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: paciente => {
          this.paciente = paciente;
          this.carregarSessoes();
        },
        error: () => {
          this.erro = 'Erro ao carregar dados do paciente.';
          this.loading = false;
        }
      });
  }

  private carregarSessoes(): void {
    if (this.pacienteId === null) return;

    this.sessaoService.listarPorPaciente(this.pacienteId)
      .pipe(
        // `GET /sessoes/paciente/{id}` responde 404 para paciente inativo, tratando-o como
        // inexistente (issue #203). Aqui o paciente já foi carregado por `carregar()`, então
        // 404 nesta chamada só pode significar "sem sessões" — paciente inexistente falha
        // antes, com "Erro ao carregar dados do paciente.". Se alguma mudança futura passar a
        // paralelizar as duas chamadas, esta garantia deixa de valer.
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404) {
            return of<SessaoResponseDTO[]>([]);
          }
          return throwError(() => error);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: sessoes => {
          this.sessoes = sessoes;
          this.loading = false;
        },
        error: () => {
          this.erro = 'Erro ao carregar sessões.';
          this.loading = false;
        }
      });
  }

  confirmarAcao(id: number, acao: 'realizar' | 'cancelar'): void {
    if (this.acaoEmAndamentoId !== null) return;

    this.confirmarAcaoId = id;
    this.acaoPendente = acao;
    this.interessados = [];
    if (acao === 'cancelar') this.consultarListaEspera(id);
  }

  /**
   * Quem espera pelo horário que o cancelamento vai liberar (issue #137). A
   * faixa é a da própria sessão, e a API cruza faixas por interseção: quem
   * pediu 07:30–09:30 também aparece para uma sessão das 08:00 às 09:00.
   *
   * A falha vira silêncio, e não faixa de erro: o aviso é um extra, e impedir o
   * cancelamento porque a fila não carregou seria pior do que não avisar.
   */
  private consultarListaEspera(sessaoId: number): void {
    const sessao = this.sessoes.find(atual => atual.id === sessaoId);
    const faixa = faixaDoAgendamento(sessao?.dataHora, sessao?.duracao);
    if (faixa === null) return;

    this.listaEsperaService.listar(faixa)
      .pipe(
        catchError(() => of<ListaEsperaResponseDTO[]>([])),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(fila => {
        // A confirmação pode ter sido fechada enquanto a consulta ia e voltava;
        // guardar a fila então acenderia o aviso na confirmação seguinte.
        if (this.confirmarAcaoId === sessaoId && this.acaoPendente === 'cancelar') {
          this.interessados = fila;
        }
      });
  }

  get avisoListaEspera(): string | null {
    return avisoDeInteressados(this.interessados);
  }

  cancelarAcao(): void {
    this.confirmarAcaoId = null;
    this.acaoPendente = null;
    this.interessados = [];
  }

  executarAcao(): void {
    if (this.confirmarAcaoId === null || this.acaoPendente === null || this.acaoEmAndamentoId !== null) return;

    const id = this.confirmarAcaoId;
    const acao = this.acaoPendente;
    this.cancelarAcao();
    this.acaoEmAndamentoId = id;

    const obs = acao === 'realizar'
      ? this.sessaoService.realizar(id)
      : this.sessaoService.cancelar(id);

    obs.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.exibirSucesso(acao === 'realizar'
          ? 'Sessão marcada como realizada.'
          : 'Sessão cancelada com sucesso.');
        this.carregarSessoes();
        this.acaoEmAndamentoId = null;
      },
      error: () => {
        this.erro = `Erro ao ${acao} sessão.`;
        this.acaoEmAndamentoId = null;
      }
    });
  }

  acaoLabel(): string {
    return this.acaoPendente === 'realizar' ? 'marcar como realizada' : 'cancelar';
  }

  abrirReagendar(sessao: SessaoResponseDTO): void {
    if (this.acaoEmAndamentoId !== null) return;

    this.reagendarId = sessao.id;
    this.erro = null;
    this.reagendarMinDataHora = formatarDataHoraLocal(new Date());
    this.reagendarForm.reset({ dataHora: sessao.dataHora });

    // Sessão atrasada abre o diálogo já com o horário passado no campo: sem marcar como
    // touched, o botão de confirmação apareceria desabilitado sem nenhuma mensagem de erro.
    if (this.reagendarForm.invalid) {
      this.reagendarForm.markAllAsTouched();
    }
  }

  cancelarReagendar(): void {
    if (this.acaoEmAndamentoId !== null) return;
    this.reagendarId = null;
  }

  confirmarReagendar(): void {
    if (this.reagendarId === null || this.reagendarForm.invalid || this.acaoEmAndamentoId !== null) {
      this.reagendarForm.markAllAsTouched();
      focarPrimeiroInvalido(this.reagendarForm, this.host);
      return;
    }

    const id = this.reagendarId;
    const dataHora: string = this.reagendarForm.value.dataHora;
    this.acaoEmAndamentoId = id;
    this.erro = null;

    this.sessaoService.atualizar(id, { dataHora })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: sessao => {
          this.sessoes = this.sessoes.map(atual => (atual.id === sessao.id ? sessao : atual));
          this.acaoEmAndamentoId = null;
          this.reagendarId = null;
          this.exibirSucesso('Sessão reagendada com sucesso.');
        },
        error: err => {
          this.erro = extrairMensagemErro(err, 'Erro ao reagendar sessão.');
          this.acaoEmAndamentoId = null;
          this.reagendarId = null;
        }
      });
  }

  campoReagendar(nome: string) {
    return this.reagendarForm.get(nome);
  }

  private exibirSucesso(mensagem: string): void {
    this.sucesso = mensagem;
    if (this.successTimer !== null) {
      clearTimeout(this.successTimer);
    }
    this.successTimer = setTimeout(() => { this.sucesso = null; }, 4000);
  }
}
