import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  BLOQUEIO_MOTIVO_MAX,
  BloqueioAgendaRequestDTO,
  BloqueioAgendaResponseDTO
} from '../../../../core/models/bloqueio-agenda';
import { BloqueioAgendaService } from '../../../../core/services/bloqueio-agenda.service';
import { extrairMensagemErro } from '../../../../shared/utils/api-error';
import { ehDiaInteiro } from '../../../../shared/utils/bloqueio-agenda';
import { focarPrimeiroCampo, focarPrimeiroInvalido } from '../../../../shared/utils/form-focus';
import { normalizarHora } from '../../../../shared/utils/hora';
import { parseRouteNumberParam } from '../../../../shared/utils/route-param';

/**
 * Regras que a API valida entre campos e que aqui evitam um `400` previsível:
 * período invertido e faixa de horário vazia ou invertida. A obrigatoriedade de
 * cada campo isolado continua nos validadores do controle.
 */
/**
 * `Validators.required` aceita `"   "`, mas o motivo sai daqui com `trim()` e o
 * `@NotBlank` da API recusaria a string vazia com `400`. A checagem local existe
 * justamente para não gastar essa ida ao servidor.
 */
function textoNaoVazio(controle: AbstractControl): ValidationErrors | null {
  const valor = controle.value;
  return typeof valor === 'string' && valor.trim().length === 0 ? { required: true } : null;
}

function periodoCoerente(grupo: AbstractControl): ValidationErrors | null {
  const dataInicio = grupo.get('dataInicio')?.value;
  const dataFim = grupo.get('dataFim')?.value;
  const erros: ValidationErrors = {};

  // Comparação lexicográfica de `yyyy-MM-dd`, que para esse formato é a mesma
  // coisa que a cronológica.
  if (dataInicio && dataFim && dataFim < dataInicio) erros['periodoInvertido'] = true;

  if (!grupo.get('diaInteiro')?.value) {
    const horaInicio = grupo.get('horaInicio')?.value;
    const horaFim = grupo.get('horaFim')?.value;
    if (horaInicio && horaFim && horaFim <= horaInicio) erros['faixaInvertida'] = true;
  }

  return Object.keys(erros).length > 0 ? erros : null;
}

/**
 * Cadastro e edição de bloqueio de agenda (issue #135).
 *
 * "Dia inteiro" é um interruptor do formulário, e não um campo da API: o que o
 * backend deriva do par `horaInicio`/`horaFim` — as duas ausentes significam dia
 * inteiro, e mandar apenas uma volta `400`. Marcá-lo desabilita e limpa a faixa,
 * de modo que o par nunca saia daqui pela metade.
 */
@Component({
  selector: 'app-bloqueio-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './bloqueio-form.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './bloqueio-form.component.scss'
})
export class BloqueioFormComponent implements OnInit, AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(BloqueioAgendaService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  // Anotado em vez de inferido: `inject(ElementRef<HTMLElement>)` devolve
  // `ElementRef<any>`, e `nativeElement` chega ao `querySelector` sem tipo.
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  form!: FormGroup;
  bloqueioId: number | null = null;
  parametroInvalido = false;
  /**
   * Carga da edição que falhou. Esconde o formulário, e não é só cosmético: o
   * `PUT` é substituição completa, então um formulário em branco mas editável,
   * ainda apontando para `bloqueioId`, sobrescreveria o bloqueio real com o que
   * fosse digitado por cima — inclusive apagando a faixa de horário, já que
   * horas ausentes significam dia inteiro.
   */
  cargaFalhou = false;
  loading = false;
  salvando = false;
  erro: string | null = null;

  readonly motivoMax = BLOQUEIO_MOTIVO_MAX;

  ngOnInit(): void {
    this.form = this.fb.group({
      dataInicio: ['', Validators.required],
      dataFim: ['', Validators.required],
      diaInteiro: [true],
      horaInicio: [{ value: '', disabled: true }, Validators.required],
      horaFim: [{ value: '', disabled: true }, Validators.required],
      motivo: ['', [Validators.required, textoNaoVazio, Validators.maxLength(BLOQUEIO_MOTIVO_MAX)]]
    }, { validators: periodoCoerente });

    if (!this.route.snapshot.paramMap.has('id')) return;

    this.bloqueioId = parseRouteNumberParam(this.route.snapshot.paramMap, 'id');
    if (this.bloqueioId === null) {
      this.parametroInvalido = true;
      this.erro = 'Identificador inválido.';
      return;
    }

    this.carregar(this.bloqueioId);
  }

  ngAfterViewInit(): void {
    if (!this.modoEdicao) focarPrimeiroCampo(this.host);
  }

  get modoEdicao(): boolean {
    return this.bloqueioId !== null;
  }

  get diaInteiro(): boolean {
    return this.form.get('diaInteiro')?.value === true;
  }

  /**
   * Desabilitar (e não só ignorar) a faixa é o que mantém o formulário coerente
   * com a API: controle desabilitado sai do cálculo de validade, então o
   * `Validators.required` das horas não trava o salvamento de um bloqueio de dia
   * inteiro. O valor é limpo junto para que desmarcar a opção não reviva um
   * horário digitado antes.
   */
  aoAlternarDiaInteiro(): void {
    const horaInicio = this.form.get('horaInicio');
    const horaFim = this.form.get('horaFim');

    if (this.diaInteiro) {
      horaInicio?.reset({ value: '', disabled: true });
      horaFim?.reset({ value: '', disabled: true });
    } else {
      horaInicio?.enable();
      horaFim?.enable();
    }
    this.form.updateValueAndValidity();
  }

  private carregar(id: number): void {
    this.loading = true;
    this.erro = null;

    this.service.buscar(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: bloqueio => {
        this.preencher(bloqueio);
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.erro = err?.status === 404 ? 'Bloqueio não encontrado.' : 'Erro ao carregar bloqueio.';
        this.cargaFalhou = true;
        this.loading = false;
      }
    });
  }

  private preencher(bloqueio: BloqueioAgendaResponseDTO): void {
    const diaInteiro = ehDiaInteiro(bloqueio);
    this.form.patchValue({
      dataInicio: bloqueio.dataInicio,
      dataFim: bloqueio.dataFim,
      diaInteiro,
      // O `<input type="time">` só aceita `HH:mm`; a API manda os segundos
      // quando eles não são zero.
      horaInicio: normalizarHora(bloqueio.horaInicio) ?? '',
      horaFim: normalizarHora(bloqueio.horaFim) ?? '',
      motivo: bloqueio.motivo
    });
    this.aoAlternarDiaInteiro();
  }

  salvar(): void {
    if (this.parametroInvalido) {
      this.erro = 'Identificador inválido.';
      return;
    }

    if (this.salvando || this.cargaFalhou) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Erro só de grupo (período ou faixa invertidos) não marca nenhum
      // `input` como inválido, e `focarPrimeiroInvalido` não tem o que focar:
      // num celular a mensagem renderiza fora da tela e o botão parece morto.
      if (!focarPrimeiroInvalido(this.form, this.host)) this.revelarErroDeGrupo();
      return;
    }

    this.salvando = true;
    this.erro = null;

    const valor = this.form.getRawValue();
    const dto: BloqueioAgendaRequestDTO = {
      dataInicio: valor.dataInicio,
      dataFim: valor.dataFim,
      // As duas ausentes é o que a API lê como dia inteiro; no `PUT`, que é
      // substituição completa, é também o que remove uma faixa cadastrada antes.
      horaInicio: this.diaInteiro ? null : valor.horaInicio,
      horaFim: this.diaInteiro ? null : valor.horaFim,
      motivo: (valor.motivo ?? '').trim()
    };

    const request$ = this.bloqueioId !== null
      ? this.service.atualizar(this.bloqueioId, dto)
      : this.service.criar(dto);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.router.navigate(['/admin/bloqueios']),
      error: (err: HttpErrorResponse) => {
        this.erro = extrairMensagemErro(err, 'Erro ao salvar bloqueio.');
        this.salvando = false;
      }
    });
  }

  /** Rola até a mensagem de erro de grupo, que não pertence a nenhum campo. */
  private revelarErroDeGrupo(): void {
    const alvo = this.host.nativeElement.querySelector<HTMLElement>('.invalid-feedback[role="alert"]');
    alvo?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  campo(nome: string) {
    return this.form.get(nome);
  }

  /** Erros de grupo só aparecem depois que os campos envolvidos foram tocados. */
  erroDeGrupo(nome: 'periodoInvertido' | 'faixaInvertida'): boolean {
    if (!this.form.hasError(nome)) return false;
    const campos = nome === 'periodoInvertido' ? ['dataInicio', 'dataFim'] : ['horaInicio', 'horaFim'];
    return campos.every(campo => this.form.get(campo)?.touched);
  }
}
