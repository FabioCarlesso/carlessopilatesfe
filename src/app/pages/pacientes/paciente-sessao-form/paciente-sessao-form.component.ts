import { Component, DestroyRef, ElementRef, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import {
  SessaoRequestDTO,
  SessaoResponseDTO,
  SESSAO_STATUS_LABEL,
  SESSAO_TIPO_LABEL,
  SessaoStatus,
  SessaoTipo,
  SessaoUpdateDTO
} from '../../../core/models/sessao';
import { BloqueioAgendaResponseDTO } from '../../../core/models/bloqueio-agenda';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { BloqueioAgendaService } from '../../../core/services/bloqueio-agenda.service';
import { SessaoService } from '../../../core/services/sessao.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { bloqueiosDoHorario, descreverBloqueio } from '../../../shared/utils/bloqueio-agenda';
import { parseRouteNumberParam } from '../../../shared/utils/route-param';
import { focarPrimeiroCampo, focarPrimeiroInvalido } from '../../../shared/utils/form-focus';

const DIA_ISO = /^\d{4}-\d{2}-\d{2}$/;
/** Formato que o `input[type=datetime-local]` aceita — sem segundos. */
const DATA_HORA_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

@Component({
  selector: 'app-paciente-sessao-form',
  imports: [ReactiveFormsModule, RouterLink, BreadcrumbComponent],
  templateUrl: './paciente-sessao-form.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './paciente-sessao-form.component.scss'
})
export class PacienteSessaoFormComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  pacienteId: number | null = null;
  sessaoId: number | null = null;
  paciente: PacienteResponseDTO | null = null;
  sessao: SessaoResponseDTO | null = null;
  loading = false;
  salvando = false;
  erro: string | null = null;
  sucesso: string | null = null;
  parametroInvalido = false;
  /**
   * Bloqueios do dia escolhido em `dataHora` (issue #135), recarregados a cada
   * troca de dia. Só do dia, e não de um período: o formulário agenda uma sessão
   * de cada vez, e um `GET` por dia é mais barato que baixar o ano do estúdio.
   */
  bloqueiosDoDia: BloqueioAgendaResponseDTO[] = [];
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  readonly tipos: SessaoTipo[] = ['PILATES', 'FISIOTERAPIA'];
  readonly statuses: SessaoStatus[] = ['AGENDADA', 'REALIZADA', 'CANCELADA'];
  readonly tipoLabel = SESSAO_TIPO_LABEL;
  readonly statusLabel = SESSAO_STATUS_LABEL;

  constructor(
    private fb: FormBuilder,
    private pacienteService: PacienteService,
    private sessaoService: SessaoService,
    private bloqueioService: BloqueioAgendaService,
    private route: ActivatedRoute,
    private router: Router,
    private destroyRef: DestroyRef,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      dataHora: ['', Validators.required],
      tipo: ['PILATES', Validators.required],
      duracao: [null, [Validators.required, Validators.min(1), Validators.max(480)]],
      profissionalId: [null, [Validators.min(1), Validators.pattern(/^[1-9]\d*$/)]],
      observacoes: [''],
      status: ['AGENDADA', Validators.required]
    });

    // Antes de `carregar()`: na edição é o `patchValue` da sessão carregada que
    // dispara a primeira consulta, e a inscrição precisa já existir.
    this.observarBloqueios();

    this.pacienteId = parseRouteNumberParam(this.route.snapshot.paramMap, 'pacienteId');
    this.sessaoId = parseRouteNumberParam(this.route.snapshot.paramMap, 'id');

    if (this.pacienteId === null || (this.route.snapshot.paramMap.has('id') && this.sessaoId === null)) {
      this.parametroInvalido = true;
      this.erro = 'Identificador inválido.';
      return;
    }

    if (this.modoEdicao) {
      // O PUT /api/sessoes/{id} não persiste tipo, profissional nem status:
      // ficam somente informativos na edição.
      this.form.get('tipo')?.disable();
      this.form.get('profissionalId')?.disable();
      this.form.get('status')?.disable();
    } else {
      this.aplicarPreenchimentoDaEspera();
    }

    this.carregar();
  }

  ngOnDestroy(): void {
    if (this.successTimer !== null) {
      clearTimeout(this.successTimer);
    }
  }

  get modoEdicao(): boolean {
    return this.sessaoId !== null;
  }

  /**
   * Pré-preenchimento vindo da lista de espera (issue #137): a conversão de uma
   * entrada da fila abre esta tela com `?dataHora=&duracao=`, já na próxima
   * ocorrência do dia da semana pedido.
   *
   * É **sugestão**, não imposição: os campos continuam editáveis, e um valor
   * fora do formato é ignorado em silêncio em vez de acender faixa de erro —
   * uma URL torta não pode impedir o agendamento manual, que é o caminho normal
   * desta tela. Por isso também não há validação de futuro aqui: a fila guarda
   * o horário pedido, e quem agenda decide a data.
   */
  private aplicarPreenchimentoDaEspera(): void {
    const { dataHora, duracao } = this.route.snapshot.queryParams;

    if (typeof dataHora === 'string' && DATA_HORA_LOCAL.test(dataHora)) {
      this.form.get('dataHora')?.setValue(dataHora);
    }

    const minutos = Number(duracao);
    if (Number.isInteger(minutos) && minutos >= 1 && minutos <= 480) {
      this.form.get('duracao')?.setValue(minutos);
    }
  }

  /**
   * Consulta os bloqueios sempre que o **dia** de `dataHora` muda.
   *
   * São duas guardas, e as duas fazem falta. O `distinctUntilChanged` sobre o
   * dia descarta a troca de hora, que não muda o dia consultado. O
   * `debounceTime` cobre o que ele não alcança: o segmento de ano do
   * `datetime-local` emite um valor **completo e distinto** a cada dígito
   * digitado (`0002-…`, `0020-…`, `0202-…`, `2026-…`), e sem a espera cada um
   * viraria uma requisição — três delas abortadas na sequência pelo `switchMap`.
   *
   * A falha vira lista vazia em vez de faixa de erro — o aviso é um extra, e
   * impedir o agendamento porque a consulta de feriados caiu seria pior do que
   * não avisar.
   */
  private observarBloqueios(): void {
    this.form.get('dataHora')?.valueChanges
      .pipe(
        map(valor => (typeof valor === 'string' ? valor.slice(0, 10) : '')),
        debounceTime(250),
        distinctUntilChanged(),
        switchMap(dia => (DIA_ISO.test(dia)
          ? this.bloqueioService.listarPorPeriodo(dia, dia).pipe(
              catchError(() => of([] as BloqueioAgendaResponseDTO[]))
            )
          : of([] as BloqueioAgendaResponseDTO[]))),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(bloqueios => {
        this.bloqueiosDoDia = bloqueios;
      });
  }

  /**
   * Aviso do horário bloqueado, ou `null` quando o horário está livre. O
   * bloqueio **não impede** o agendamento — nem na API, nem aqui: é a recepção
   * que decide se a sessão acontece assim mesmo, e travar o formulário
   * inventaria uma regra que o backend não tem.
   *
   * Reavaliado pelo template a cada ciclo, e não guardado num campo, para que
   * mudar a duração — que estende a sessão até dentro da faixa bloqueada —
   * atualize o aviso sem uma nova ida à API.
   */
  get avisoBloqueio(): string | null {
    if (this.bloqueiosDoDia.length === 0) return null;
    const valor = this.form.getRawValue();
    const alcancados = bloqueiosDoHorario(this.bloqueiosDoDia, valor.dataHora, valor.duracao);
    return alcancados.length > 0 ? alcancados.map(descreverBloqueio).join('; ') : null;
  }

  carregar(): void {
    if (this.pacienteId === null) return;

    this.loading = true;
    this.erro = null;

    const paciente$ = this.pacienteService.buscar(this.pacienteId);
    const sessao$ = this.sessaoId !== null
      ? this.sessaoService.buscar(this.sessaoId)
      : of(null);

    forkJoin({ paciente: paciente$, sessao: sessao$ })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ paciente, sessao }) => {
          this.paciente = paciente;
          if (sessao) {
            if (sessao.pacienteId !== this.pacienteId) {
              this.parametroInvalido = true;
              this.erro = 'Sessão não pertence ao paciente informado.';
              this.loading = false;
              return;
            }
            this.sessao = sessao;
            const { id, pacienteId, nomePaciente, nomeProfissional, dataCriacao, dataAtualizacao, ...formFields } = sessao;
            this.form.patchValue({
              ...formFields,
              profissionalId: formFields.profissionalId ?? null,
              observacoes: formFields.observacoes ?? ''
            });
          } else {
            this.sessao = null;
            // O formulário só existe no DOM após o *ngIf="!loading"; adia o foco.
            setTimeout(() => focarPrimeiroCampo(this.host));
          }
          this.loading = false;
        },
        error: () => {
          this.erro = 'Erro ao carregar dados da sessão.';
          this.loading = false;
        }
      });
  }

  salvar(): void {
    if (this.parametroInvalido || this.pacienteId === null) {
      this.erro = 'Identificador inválido.';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      focarPrimeiroInvalido(this.form, this.host);
      return;
    }

    this.salvando = true;
    this.erro = null;
    this.sucesso = null;

    const valor = this.form.getRawValue();
    const opt = (v: string | null | undefined): string | null => (v?.trim() ? v.trim() : null);

    const updateDto: SessaoUpdateDTO = {
      dataHora: valor.dataHora,
      duracao: Number(valor.duracao),
      observacoes: opt(valor.observacoes)
    };

    const createDto: SessaoRequestDTO = {
      pacienteId: this.pacienteId,
      dataHora: valor.dataHora,
      tipo: valor.tipo as SessaoTipo,
      duracao: Number(valor.duracao),
      profissionalId: valor.profissionalId ? Number(valor.profissionalId) : null,
      observacoes: opt(valor.observacoes)
    };

    const sessaoAtual = this.sessao;
    const criando = sessaoAtual === null;
    const obs = criando
      ? this.sessaoService.criar(createDto)
      : this.sessaoService.atualizar(sessaoAtual.id, updateDto);

    obs.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        if (criando) {
          this.router.navigate(['/pacientes', this.pacienteId, 'sessoes']);
        } else {
          this.sessao = response;
          const { id, pacienteId, nomePaciente, nomeProfissional, dataCriacao, dataAtualizacao, ...formFields } = response;
          this.form.patchValue({
            ...formFields,
            profissionalId: formFields.profissionalId ?? null,
            observacoes: formFields.observacoes ?? ''
          });
          if (this.successTimer !== null) {
            clearTimeout(this.successTimer);
          }
          this.sucesso = 'Sessão atualizada com sucesso.';
          this.successTimer = setTimeout(() => { this.sucesso = null; }, 4000);
          this.salvando = false;
        }
      },
      error: () => {
        this.erro = 'Erro ao salvar sessão.';
        this.salvando = false;
      }
    });
  }

  campo(nome: string) {
    return this.form.get(nome);
  }
}
