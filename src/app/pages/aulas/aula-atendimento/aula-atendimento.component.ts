import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, Observable, of, throwError } from 'rxjs';
import { AtendimentoRequestDTO, AtendimentoResponseDTO } from '../../../core/models/atendimento';
import { EvolucaoSessaoResponseDTO } from '../../../core/models/evolucao-sessao';
import { AulaResponseDTO } from '../../../core/models/plano';
import { ProfissionalResponseDTO } from '../../../core/models/profissional';
import { SESSAO_STATUS_LABEL, SESSAO_TIPO_LABEL, SessaoTipo } from '../../../core/models/sessao';
import { AulaService } from '../../../core/services/aula.service';
import { EvolucaoSessaoService } from '../../../core/services/evolucao-sessao.service';
import { ProfissionalService } from '../../../core/services/profissional.service';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';
import { EvolucaoCamposComponent } from '../../../shared/components/evolucao-campos/evolucao-campos.component';
import { ehConflitoConcorrencia, extrairMensagemErro } from '../../../shared/utils/api-error';
import {
  SITUACAO_ATENDIMENTO_CLASSE,
  SITUACAO_ATENDIMENTO_DESCRICAO,
  SITUACAO_ATENDIMENTO_LABEL,
  SituacaoAtendimento,
  situacaoAtendimento
} from '../../../shared/utils/atendimento';
import {
  camposDoFormularioEvolucao,
  criarFormularioEvolucao,
  preencherFormularioEvolucao
} from '../../../shared/utils/evolucao-form';
import { focarPrimeiroInvalido } from '../../../shared/utils/form-focus';
import { normalizarHora } from '../../../shared/utils/hora';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';

/** Página de profissionais grande o bastante para caber o quadro do estúdio. */
const TAMANHO_PAGINA_PROFISSIONAIS = 100;

/**
 * Mensagens de reserva por status do `POST /aulas/{id}/atendimento`, usadas
 * quando a API não manda `detail` aproveitável.
 */
const FALLBACK_ERRO_ATENDIMENTO: Record<number, string> = {
  400: 'Dados inválidos: confira a dor antes e depois (de 0 a 10).',
  404: 'Aula ou profissional não encontrado. A aula pode ser de um paciente inativo.',
  409: 'O atendimento desta aula mudou enquanto você registrava. Recarregue para ver o que já foi registrado.',
  422: 'Esta aula não aceita atendimento.'
};

/**
 * Atendimento da aula (issue #303): realizar a aula e registrar a evolução
 * numa tela só, a partir da aula — paciente, data, horário e profissional já
 * vêm dela. Por baixo continuam aula e sessão (carlessopilatesapi#246): o
 * `POST /aulas/{id}/atendimento` cria (ou reaproveita) a sessão vinculada,
 * realiza a aula e grava a evolução.
 *
 * Três estados, conforme o que já foi registrado:
 * - **sem atendimento**: profissional, tipo e evolução; salvar realiza e evolui;
 * - **sem evolução**: a sessão já existe e o formulário só registra a evolução
 *   (o mesmo `POST`, só com `evolucao`);
 * - **evoluída**: o formulário abre preenchido e salvar edita a evolução por
 *   `PUT /evolucoes-sessao/{id}`, com a versão do locking otimista — o `POST`
 *   recusaria uma segunda evolução com `409`.
 */
@Component({
  selector: 'app-aula-atendimento',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, BreadcrumbComponent, CarregandoComponent, EvolucaoCamposComponent],
  templateUrl: './aula-atendimento.component.html',
  styleUrl: './aula-atendimento.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class AulaAtendimentoComponent implements OnInit, OnDestroy {
  aulaId: number | null = null;
  aula: AulaResponseDTO | null = null;
  atendimento: AtendimentoResponseDTO | null = null;
  profissionais: ProfissionalResponseDTO[] = [];

  /** Evolução; criado por `criarFormularioEvolucao`, como na evolução da sessão. */
  form: FormGroup;
  /** Profissional e tipo da sessão: só existem enquanto a aula não tem atendimento. */
  readonly registroForm = new FormGroup({
    profissionalId: new FormControl<number | null>(null),
    tipo: new FormControl<SessaoTipo>('PILATES', { nonNullable: true })
  });

  loading = false;
  salvando = false;
  erro: string | null = null;
  sucesso: string | null = null;
  /** O `409` pede recarregar: a tela está descrevendo um atendimento que já mudou. */
  podeRecarregar = false;
  /** Sem aula para mostrar (identificador inválido ou aula inexistente): some o formulário. */
  semAula = false;

  readonly tipoLabel = SESSAO_TIPO_LABEL;
  readonly statusLabel = SESSAO_STATUS_LABEL;
  readonly tipos: SessaoTipo[] = ['PILATES', 'FISIOTERAPIA'];
  readonly situacaoLabel = SITUACAO_ATENDIMENTO_LABEL;
  readonly situacaoDescricao = SITUACAO_ATENDIMENTO_DESCRICAO;
  readonly situacaoClasse = SITUACAO_ATENDIMENTO_CLASSE;

  private successTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    fb: FormBuilder,
    private aulaService: AulaService,
    private evolucaoSessaoService: EvolucaoSessaoService,
    private profissionalService: ProfissionalService,
    private route: ActivatedRoute,
    private destroyRef: DestroyRef,
    private host: ElementRef<HTMLElement>
  ) {
    this.form = criarFormularioEvolucao(fb);
  }

  ngOnInit(): void {
    this.aulaId = parseRouteNumberParam(this.route.snapshot.paramMap, 'aulaId');
    if (this.aulaId === null) {
      this.semAula = true;
      this.erro = 'Identificador inválido.';
      return;
    }
    this.carregarProfissionais();
    this.carregar();
  }

  ngOnDestroy(): void {
    if (this.successTimer !== null) clearTimeout(this.successTimer);
  }

  /**
   * Aula e atendimento juntos. O `404` do atendimento é o estado "ainda sem
   * atendimento", e não erro; o da aula, sim — aula inexistente ou de paciente
   * inativo, que não tem o que atender.
   */
  carregar(): void {
    if (this.aulaId === null) return;
    const aulaId = this.aulaId;

    this.loading = true;
    this.erro = null;
    this.podeRecarregar = false;

    forkJoin({
      aula: this.aulaService.buscar(aulaId),
      atendimento: this.aulaService.buscarAtendimento(aulaId).pipe(
        catchError((err: unknown) =>
          err instanceof HttpErrorResponse && err.status === 404
            ? of(null)
            : throwError(() => err)
        )
      )
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ aula, atendimento }) => {
        this.aplicarAtendimento(atendimento?.aula ?? aula, atendimento);
        this.loading = false;
      },
      error: (err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 404) {
          this.semAula = true;
          this.erro = 'Aula não encontrada. Ela pode ter sido removida ou ser de um paciente inativo.';
        } else {
          this.erro = extrairMensagemErro(err, 'Erro ao carregar o atendimento da aula.');
        }
        this.loading = false;
      }
    });
  }

  /**
   * Só profissionais ativos: a API recusa o inativo com `422`. A falha não
   * impede o atendimento — sem a lista, o select fica só com o profissional da
   * aula, que é o padrão do envio.
   */
  private carregarProfissionais(): void {
    this.profissionalService.listar(0, TAMANHO_PAGINA_PROFISSIONAIS, { ativo: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: page => { this.profissionais = page.content; },
        error: () => { this.profissionais = []; }
      });
  }

  get situacao(): SituacaoAtendimento | null {
    return this.aula ? situacaoAtendimento(this.aula) : null;
  }

  get feriado(): boolean {
    return this.aula?.feriado === true;
  }

  get evolucao(): EvolucaoSessaoResponseDTO | null {
    return this.atendimento?.evolucao ?? null;
  }

  /** O profissional é obrigatório só para realizar a aula, que é quando ele define o repasse. */
  get exigeProfissional(): boolean {
    return this.atendimento === null && this.aula !== null && !this.aula.realizada;
  }

  get horario(): string | null {
    return normalizarHora(this.aula?.horario);
  }

  /**
   * O profissional da aula pode não estar na lista de ativos (inativado depois
   * de atribuído); ele continua como opção para o select não ficar em branco,
   * e a API responde `422` se ele for enviado — a mensagem diz o motivo.
   */
  get opcoesProfissional(): { id: number; nome: string }[] {
    const opcoes = this.profissionais.map(p => ({ id: p.id, nome: p.nome }));
    const daAula = this.aula?.profissionalId ?? null;
    if (daAula !== null && !opcoes.some(p => p.id === daAula)) {
      opcoes.unshift({ id: daAula, nome: this.aula?.profissionalNome ?? `Profissional #${daAula}` });
    }
    return opcoes;
  }

  get rotuloSalvar(): string {
    if (this.salvando) return 'Salvando...';
    if (this.evolucao) return 'Atualizar evolução';
    if (this.atendimento) return 'Registrar evolução';
    return this.aula?.realizada ? 'Registrar atendimento' : 'Realizar e registrar evolução';
  }

  get rotuloSemEvolucao(): string {
    return this.aula?.realizada ? 'Registrar sem evolução' : 'Realizar sem evolução';
  }

  /** Salva a evolução: registra o atendimento, a evolução de um atendimento já feito ou edita a existente. */
  salvar(): void {
    if (this.salvando || this.aula === null || this.feriado) return;

    const registroValido = this.validarRegistro();
    if (this.form.invalid || !registroValido) {
      this.form.markAllAsTouched();
      if (this.form.invalid) focarPrimeiroInvalido(this.form, this.host);
      else this.focarProfissional();
      return;
    }

    const campos = camposDoFormularioEvolucao(this.form);
    const evolucaoAtual = this.evolucao;

    if (evolucaoAtual !== null) {
      this.enviar(
        this.evolucaoSessaoService.atualizar(evolucaoAtual.id, { ...campos, version: evolucaoAtual.version }),
        evolucao => {
          this.atualizarEvolucao(evolucao);
          return 'Evolução atualizada.';
        },
        'Erro ao atualizar a evolução.'
      );
      return;
    }

    const criandoAtendimento = this.atendimento === null;
    const dto: AtendimentoRequestDTO = criandoAtendimento
      ? { ...this.dadosDoRegistro(), evolucao: campos }
      : { evolucao: campos };
    this.enviar(
      this.aulaService.registrarAtendimento(this.aula.id, dto),
      atendimento => {
        this.aplicarAtendimento(atendimento.aula, atendimento);
        return criandoAtendimento ? 'Atendimento registrado: aula realizada e evolução salva.' : 'Evolução registrada.';
      },
      'Erro ao registrar o atendimento.'
    );
  }

  /** Realiza a aula e cria o atendimento sem evolução, que pode ser registrada depois nesta mesma tela. */
  realizarSemEvolucao(): void {
    if (this.salvando || this.aula === null || this.feriado || this.atendimento !== null) return;
    if (!this.validarRegistro()) {
      this.focarProfissional();
      return;
    }

    this.enviar(
      this.aulaService.registrarAtendimento(this.aula.id, this.dadosDoRegistro()),
      atendimento => {
        this.aplicarAtendimento(atendimento.aula, atendimento);
        return 'Atendimento registrado sem evolução.';
      },
      'Erro ao registrar o atendimento.'
    );
  }

  profissionalInvalido(): boolean {
    const controle = this.registroForm.controls.profissionalId;
    return controle.invalid && controle.touched;
  }

  private enviar<T>(requisicao$: Observable<T>, aoConcluir: (resposta: T) => string, fallback: string): void {
    this.salvando = true;
    this.erro = null;
    this.sucesso = null;
    this.podeRecarregar = false;

    requisicao$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: resposta => {
        this.salvando = false;
        this.exibirSucesso(aoConcluir(resposta));
      },
      error: (err: unknown) => {
        this.salvando = false;
        this.erro = this.mensagemDeErro(err, fallback);
        this.podeRecarregar = err instanceof HttpErrorResponse && err.status === 409;
      }
    });
  }

  /**
   * A mensagem da API (`detail` do problem+json) é a mais precisa — "Aula de
   * feriado não aceita atendimento", "Profissional inativo" —; sem ela, cai na
   * reserva do status. O `409` de concorrência tem texto próprio.
   */
  private mensagemDeErro(err: unknown, fallback: string): string {
    if (ehConflitoConcorrencia(err)) return extrairMensagemErro(err, fallback);
    const status = err instanceof HttpErrorResponse ? err.status : 0;
    return extrairMensagemErro(err, FALLBACK_ERRO_ATENDIMENTO[status] ?? fallback);
  }

  private aplicarAtendimento(aula: AulaResponseDTO, atendimento: AtendimentoResponseDTO | null): void {
    this.aula = aula;
    this.atendimento = atendimento;
    this.registroForm.reset({ profissionalId: aula.profissionalId ?? null, tipo: 'PILATES' });
    this.registroForm.controls.profissionalId.setValidators(this.exigeProfissional ? Validators.required : null);
    this.registroForm.controls.profissionalId.updateValueAndValidity();
    if (atendimento?.evolucao) {
      preencherFormularioEvolucao(this.form, atendimento.evolucao);
      this.form.markAsPristine();
      this.form.markAsUntouched();
    }
  }

  private atualizarEvolucao(evolucao: EvolucaoSessaoResponseDTO): void {
    if (this.atendimento === null) return;
    this.atendimento = { ...this.atendimento, evolucao };
    preencherFormularioEvolucao(this.form, evolucao);
  }

  private validarRegistro(): boolean {
    if (this.atendimento !== null) return true;
    this.registroForm.markAllAsTouched();
    return this.registroForm.valid;
  }

  private dadosDoRegistro(): AtendimentoRequestDTO {
    const { profissionalId, tipo } = this.registroForm.getRawValue();
    return profissionalId === null ? { tipo } : { profissionalId, tipo };
  }

  private focarProfissional(): void {
    this.host.nativeElement.querySelector<HTMLElement>('#profissionalId')?.focus();
  }

  private exibirSucesso(mensagem: string): void {
    this.sucesso = mensagem;
    if (this.successTimer !== null) clearTimeout(this.successTimer);
    this.successTimer = setTimeout(() => { this.sucesso = null; }, 4000);
  }
}
