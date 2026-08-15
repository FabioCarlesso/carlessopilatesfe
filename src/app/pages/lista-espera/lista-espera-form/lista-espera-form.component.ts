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
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import {
  LISTA_ESPERA_OBSERVACAO_MAX,
  ListaEsperaRequestDTO
} from '../../../core/models/lista-espera';
import { PacienteResponseDTO } from '../../../core/models/paciente';
import { DiaSemana, DIAS_SEMANA_LABEL } from '../../../core/models/plano';
import { ListaEsperaService } from '../../../core/services/lista-espera.service';
import { PacienteService } from '../../../core/services/paciente.service';
import { extrairMensagemErro } from '../../../shared/utils/api-error';
import { focarPrimeiroCampo, focarPrimeiroInvalido } from '../../../shared/utils/form-focus';

/** Ordem da semana como o estúdio a lê, começando na segunda. */
const DIAS_SEMANA: DiaSemana[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY'
];

/**
 * Termos muito curtos trariam quase a base inteira; os mesmos números da busca
 * global, que resolve o mesmo problema na navbar.
 */
const TAMANHO_MINIMO_TERMO = 2;
const DEBOUNCE_MS = 300;
const TAMANHO_PAGINA = 8;

/** A API recusa faixa invertida ou de duração zero com `400`. */
function faixaCoerente(grupo: AbstractControl): ValidationErrors | null {
  const horaInicio = grupo.get('horaInicio')?.value;
  const horaFim = grupo.get('horaFim')?.value;
  if (horaInicio && horaFim && horaFim <= horaInicio) return { faixaInvertida: true };
  return null;
}

/**
 * Inscrição na lista de espera (issue #137).
 *
 * O paciente é escolhido por **busca**, e não por um `select` carregado de uma
 * vez: a base de pacientes não tem teto conhecido, e um `select` limitado ao
 * tamanho de uma página deixaria de fora — sem avisar — justamente quem não
 * coubesse nela. Só pacientes ativos aparecem, porque a API recusa a inscrição
 * de paciente inativo com `422`.
 *
 * Não há tela de edição: `dataEntrada` define a posição na fila e é do
 * servidor, e mudar o horário pedido é entrar na fila de outra faixa. Para
 * corrigir uma inscrição, remove-se e inscreve-se de novo — o que custa a
 * posição, e é por isso que o formulário mostra o resumo antes de salvar.
 */
@Component({
  selector: 'app-lista-espera-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './lista-espera-form.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './lista-espera-form.component.scss'
})
export class ListaEsperaFormComponent implements OnInit, AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ListaEsperaService);
  private readonly pacienteService = inject(PacienteService);
  private readonly router = inject(Router);
  // Anotado em vez de inferido: `inject(ElementRef<HTMLElement>)` devolve
  // `ElementRef<any>`, e `nativeElement` chega ao `querySelector` sem tipo.
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  form!: FormGroup;
  readonly busca = new FormControl('', { nonNullable: true });

  sugestoes: PacienteResponseDTO[] = [];
  pacienteSelecionado: PacienteResponseDTO | null = null;
  buscando = false;
  buscaFalhou = false;
  salvando = false;
  erro: string | null = null;

  readonly diasSemana = DIAS_SEMANA;
  readonly diaSemanaLabel = DIAS_SEMANA_LABEL;
  readonly observacaoMax = LISTA_ESPERA_OBSERVACAO_MAX;
  readonly listaId = 'lista-espera-sugestoes';

  ngOnInit(): void {
    this.form = this.fb.group({
      pacienteId: [null as number | null, Validators.required],
      diaSemana: ['', Validators.required],
      horaInicio: ['', Validators.required],
      horaFim: ['', Validators.required],
      observacao: ['', Validators.maxLength(LISTA_ESPERA_OBSERVACAO_MAX)]
    }, { validators: faixaCoerente });

    this.observarBusca();
  }

  ngAfterViewInit(): void {
    focarPrimeiroCampo(this.host);
  }

  /**
   * A falha da busca vira `buscaFalhou` em vez de faixa de erro: quem está
   * digitando um nome precisa saber que a lista está vazia por falha de rede, e
   * não porque o paciente não existe — mas o formulário em si continua válido.
   */
  private observarBusca(): void {
    this.busca.valueChanges
      .pipe(
        map(termo => termo.trim()),
        debounceTime(DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap(termo => {
          if (termo.length < TAMANHO_MINIMO_TERMO) {
            this.buscando = false;
            this.buscaFalhou = false;
            return of<PacienteResponseDTO[] | null>([]);
          }
          this.buscando = true;
          this.buscaFalhou = false;
          return this.pacienteService.listar(0, TAMANHO_PAGINA, { nome: termo, ativo: true }, 'nome')
            .pipe(
              map(pagina => pagina.content),
              catchError(() => of(null))
            );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(pacientes => {
        this.buscando = false;
        this.buscaFalhou = pacientes === null;
        this.sugestoes = pacientes ?? [];
      });
  }

  selecionarPaciente(paciente: PacienteResponseDTO): void {
    this.pacienteSelecionado = paciente;
    this.form.get('pacienteId')?.setValue(paciente.id);
    this.sugestoes = [];
    // A limpeza **emite**: silenciá-la deixaria `distinctUntilChanged` com
    // `"ana"` como último valor, e trocar de paciente digitando o mesmo nome de
    // novo não buscaria nada. O termo vazio não custa requisição (é curto
    // demais) e só reconfirma a lista de sugestões já esvaziada acima.
    this.busca.setValue('');
  }

  limparPaciente(): void {
    this.pacienteSelecionado = null;
    this.form.get('pacienteId')?.setValue(null);
  }

  salvar(): void {
    if (this.salvando) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Erro só de grupo (faixa invertida) não marca nenhum `input` como
      // inválido, e `focarPrimeiroInvalido` não tem o que focar.
      if (!focarPrimeiroInvalido(this.form, this.host)) this.revelarErroDeGrupo();
      return;
    }

    this.salvando = true;
    this.erro = null;

    const valor = this.form.getRawValue();
    const observacao = (valor.observacao ?? '').trim();
    const dto: ListaEsperaRequestDTO = {
      pacienteId: Number(valor.pacienteId),
      diaSemana: valor.diaSemana as DiaSemana,
      horaInicio: valor.horaInicio,
      horaFim: valor.horaFim,
      // A API normaliza vazio para nulo; mandar `""` gravaria uma observação em
      // branco que a listagem exibiria como se existisse.
      observacao: observacao === '' ? null : observacao
    };

    this.service.criar(dto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.router.navigate(['/lista-espera']),
        error: (err: HttpErrorResponse) => {
          // `409` é a duplicidade da própria API ("já está na lista de espera
          // para esse dia e faixa"), e a mensagem dela é mais específica do que
          // qualquer coisa que o formulário saberia dizer.
          this.erro = extrairMensagemErro(err, 'Erro ao inscrever na lista de espera.');
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

  /** O erro de faixa só aparece depois que as duas horas foram tocadas. */
  get faixaInvertida(): boolean {
    return this.form.hasError('faixaInvertida')
      && this.form.get('horaInicio')?.touched === true
      && this.form.get('horaFim')?.touched === true;
  }
}
