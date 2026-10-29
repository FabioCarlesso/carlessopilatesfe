import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { DisponibilidadeProfissionalResponseDTO } from '../../../core/models/disponibilidade-profissional';
import { DIAS_SEMANA_LABEL, DiaSemana } from '../../../core/models/plano';
import { DisponibilidadeProfissionalService } from '../../../core/services/disponibilidade-profissional.service';
import { CarregandoComponent } from '../../../shared/components/carregando/carregando.component';
import { ConfirmarDialogComponent } from '../../../shared/components/confirmar-dialog/confirmar-dialog.component';
import {
  agruparPorDia,
  DiaDaGrade,
  DIAS_SEMANA_ORDEM,
  descreverFaixa,
  faixaSobreposta,
  mensagemErroDisponibilidade
} from '../../../shared/utils/disponibilidade';
import { normalizarHora } from '../../../shared/utils/hora';

/**
 * Aba "Disponibilidade" do detalhe do profissional (issue #134): a grade
 * semanal das faixas de atendimento, com cadastro, edição e exclusão.
 *
 * Mora no detalhe, que é `ADMIN`, e por isso a escrita — exclusiva de `ADMIN`
 * na API — não precisa de outro recorte de perfil aqui.
 *
 * As regras da faixa (início antes do fim, sem sobreposição no mesmo dia) são
 * da API; o formulário as antecipa para o erro aparecer no campo, e o `409` e o
 * `422` da API continuam tratados para o caso de a grade local estar velha.
 */
@Component({
  selector: 'app-profissional-disponibilidade',
  imports: [ReactiveFormsModule, CarregandoComponent, ConfirmarDialogComponent],
  templateUrl: './profissional-disponibilidade.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './profissional-disponibilidade.component.scss'
})
export class ProfissionalDisponibilidadeComponent implements OnInit {
  @Input({ required: true }) profissionalId!: number;
  /**
   * Profissional inativo não recebe nem altera faixas (`422` na API); a leitura
   * e a exclusão seguem liberadas, para limpar a grade de quem saiu.
   */
  @Input() ativo = true;

  faixas: DisponibilidadeProfissionalResponseDTO[] = [];
  grade: DiaDaGrade[] = agruparPorDia([]);
  loading = false;
  erroCarga: string | null = null;
  erroAcao: string | null = null;
  sucesso: string | null = null;
  salvando = false;
  /** Faixa aberta no formulário, ou `null` no cadastro de uma nova. */
  editando: DisponibilidadeProfissionalResponseDTO | null = null;
  /** Faixa aguardando a confirmação da exclusão. */
  aExcluir: DisponibilidadeProfissionalResponseDTO | null = null;
  excluindo = false;

  form!: FormGroup;

  readonly dias = DIAS_SEMANA_ORDEM;
  readonly diaLabel = DIAS_SEMANA_LABEL;
  readonly descrever = descreverFaixa;

  constructor(
    private fb: FormBuilder,
    private service: DisponibilidadeProfissionalService,
    private destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group(
      {
        diaSemana: ['' as DiaSemana | '', Validators.required],
        horaInicio: ['', Validators.required],
        horaFim: ['', Validators.required]
      },
      { validators: [faixaCoerente, this.semSobreposicao] }
    );
    this.carregar();
  }

  carregar(): void {
    this.loading = true;
    this.erroCarga = null;
    this.service.listar(this.profissionalId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: faixas => {
          this.definirFaixas(faixas);
          this.loading = false;
        },
        error: () => {
          this.erroCarga = 'Erro ao carregar a disponibilidade do profissional.';
          this.loading = false;
        }
      });
  }

  editar(faixa: DisponibilidadeProfissionalResponseDTO): void {
    this.editando = faixa;
    this.erroAcao = null;
    this.sucesso = null;
    this.form.reset({
      diaSemana: faixa.diaSemana,
      horaInicio: normalizarHora(faixa.horaInicio) ?? '',
      horaFim: normalizarHora(faixa.horaFim) ?? ''
    });
  }

  cancelarEdicao(): void {
    this.editando = null;
    this.erroAcao = null;
    this.form.reset({ diaSemana: '', horaInicio: '', horaFim: '' });
  }

  salvar(): void {
    if (!this.ativo || this.salvando) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const valor = this.form.getRawValue();
    const editando = this.editando;
    const dto = {
      diaSemana: valor.diaSemana as DiaSemana,
      horaInicio: valor.horaInicio as string,
      horaFim: valor.horaFim as string
    };

    this.salvando = true;
    this.erroAcao = null;
    this.sucesso = null;

    const requisicao = editando
      ? this.service.atualizar(editando.id, { ...dto, version: editando.version })
      : this.service.criar(this.profissionalId, dto);

    requisicao.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: salva => {
        this.definirFaixas([...this.faixas.filter(f => f.id !== salva.id), salva]);
        this.sucesso = editando ? 'Faixa atualizada.' : 'Faixa cadastrada.';
        this.salvando = false;
        this.editando = null;
        this.form.reset({ diaSemana: '', horaInicio: '', horaFim: '' });
      },
      error: (err: unknown) => {
        this.erroAcao = mensagemErroDisponibilidade(err, 'Erro ao salvar a faixa.');
        this.salvando = false;
      }
    });
  }

  confirmarExclusao(faixa: DisponibilidadeProfissionalResponseDTO): void {
    this.aExcluir = faixa;
    this.erroAcao = null;
    this.sucesso = null;
  }

  excluir(): void {
    const faixa = this.aExcluir;
    if (!faixa || this.excluindo) return;

    this.excluindo = true;
    this.service.excluir(faixa.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.definirFaixas(this.faixas.filter(f => f.id !== faixa.id));
          if (this.editando?.id === faixa.id) this.cancelarEdicao();
          this.sucesso = 'Faixa excluída.';
          this.excluindo = false;
          this.aExcluir = null;
        },
        error: (err: unknown) => {
          this.erroAcao = mensagemErroDisponibilidade(err, 'Erro ao excluir a faixa.');
          this.excluindo = false;
          this.aExcluir = null;
        }
      });
  }

  /** Faixa do mesmo dia que a do formulário cruza, para nomeá-la na mensagem de erro. */
  get faixaConflitante(): DisponibilidadeProfissionalResponseDTO | null {
    return this.form.hasError('sobreposicao') ? faixaSobreposta(this.faixas, this.form.getRawValue(), this.editando?.id ?? null) : null;
  }

  campoInvalido(nome: string): boolean {
    const controle = this.form.get(nome);
    return !!controle && controle.invalid && controle.touched;
  }

  /** Erro de grupo (faixa invertida ou sobreposta) só depois de mexer nas horas. */
  get mostrarErroDeFaixa(): boolean {
    const tocado = !!(this.form.get('horaInicio')?.touched || this.form.get('horaFim')?.touched);
    return tocado && (this.form.hasError('faixaInvertida') || this.form.hasError('sobreposicao'));
  }

  private definirFaixas(faixas: DisponibilidadeProfissionalResponseDTO[]): void {
    this.faixas = faixas;
    this.grade = agruparPorDia(faixas);
    // A sobreposição depende da lista: revalida o que estiver no formulário.
    this.form.updateValueAndValidity();
  }

  /** Arrow function para enxergar `faixas` e `editando` ao rodar como validador do grupo. */
  private readonly semSobreposicao = (grupo: AbstractControl): ValidationErrors | null => {
    const faixas = this.faixas ?? [];
    return faixaSobreposta(faixas, grupo.getRawValue(), this.editando?.id ?? null) ? { sobreposicao: true } : null;
  };
}

/** A API recusa início igual ou posterior ao fim com `422`; a faixa não atravessa a meia-noite. */
function faixaCoerente(grupo: AbstractControl): ValidationErrors | null {
  const { horaInicio, horaFim } = grupo.getRawValue() as { horaInicio: string; horaFim: string };
  return horaInicio && horaFim && horaFim <= horaInicio ? { faixaInvertida: true } : null;
}
