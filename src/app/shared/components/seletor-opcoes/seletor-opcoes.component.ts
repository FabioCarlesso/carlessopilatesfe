import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, forwardRef } from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  ValidationErrors,
  Validator
} from '@angular/forms';
import { CampoOpcoesAvaliacao, ResultadoTesteFuncional } from '../../../core/models/opcoes-avaliacao';
import { RESULTADO_TESTE_LABEL, TesteFuncionalEmEdicao } from '../../utils/opcoes-avaliacao';

export interface OpcaoVisivel {
  valor: string;
  rotulo: string;
  /** Aposentada no catálogo ou fora dele: só aparece porque o registro a tem. */
  antiga: boolean;
}

let proximoId = 0;

/**
 * Seletor de um campo do catálogo de opções (issue #306), como controle de
 * formulário reativo: checkboxes em chips para seleção múltipla, radios para a
 * única e, nos testes funcionais, cada teste marcado com o resultado.
 *
 * O valor é `string[]` (múltipla), `string | null` (única) ou
 * `{ teste, resultado }[]` (com resultado). Opção aposentada ou desconhecida só
 * aparece quando o registro já a tem, marcada e indicada como "opção antiga" — e
 * continua na tela depois de desmarcada, para poder voltar atrás.
 */
@Component({
  selector: 'app-seletor-opcoes',
  templateUrl: './seletor-opcoes.component.html',
  styleUrl: './seletor-opcoes.component.scss',
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SeletorOpcoesComponent), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => SeletorOpcoesComponent), multi: true }
  ]
})
export class SeletorOpcoesComponent implements ControlValueAccessor, Validator {
  @Input({ required: true }) campo!: CampoOpcoesAvaliacao;
  /** `id` do texto que descreve o grupo (ex.: o complemento), para o `aria-describedby`. */
  @Input() descricaoId: string | null = null;

  readonly uid = `seletor-opcoes-${++proximoId}`;
  readonly resultados: readonly ResultadoTesteFuncional[] = ['POSITIVO', 'NEGATIVO'];
  readonly resultadoLabel = RESULTADO_TESTE_LABEL;

  selecionados: string[] = [];
  unico: string | null = null;
  testes: TesteFuncionalEmEdicao[] = [];
  desabilitado = false;

  /** Valores que vieram do registro: opção antiga entre eles continua visível. */
  private doRegistro = new Set<string>();
  private onChange: (valor: unknown) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor(private cdr: ChangeDetectorRef) {}

  get modo(): 'unica' | 'multipla' | 'testes' {
    if (this.campo.comResultado) return 'testes';
    return this.campo.selecao === 'UNICA' ? 'unica' : 'multipla';
  }

  get opcoes(): OpcaoVisivel[] {
    const visiveis: OpcaoVisivel[] = this.campo.opcoes
      .filter(o => o.ativa || this.doRegistro.has(o.valor) || this.marcado(o.valor))
      .map(o => ({ valor: o.valor, rotulo: o.rotulo, antiga: !o.ativa }));
    const conhecidos = new Set(this.campo.opcoes.map(o => o.valor));
    for (const valor of this.doRegistro) {
      if (!conhecidos.has(valor)) visiveis.push({ valor, rotulo: valor, antiga: true });
    }
    return visiveis;
  }

  marcado(valor: string): boolean {
    switch (this.modo) {
      case 'unica': return this.unico === valor;
      case 'testes': return this.testes.some(t => t.teste === valor);
      default: return this.selecionados.includes(valor);
    }
  }

  resultadoDe(teste: string): ResultadoTesteFuncional | null {
    return this.testes.find(t => t.teste === teste)?.resultado ?? null;
  }

  writeValue(valor: unknown): void {
    this.unico = typeof valor === 'string' && valor !== '' ? valor : null;
    const itens = Array.isArray(valor) ? valor : [];
    this.selecionados = itens.filter((v): v is string => typeof v === 'string');
    this.testes = itens
      .filter((t): t is TesteFuncionalEmEdicao => !!t && typeof t === 'object' && typeof t.teste === 'string')
      .map(t => ({ teste: t.teste, resultado: t.resultado ?? null }));
    this.doRegistro = new Set([
      ...this.selecionados,
      ...this.testes.map(t => t.teste),
      ...(this.unico ? [this.unico] : [])
    ]);
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (valor: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(desabilitado: boolean): void {
    this.desabilitado = desabilitado;
    this.cdr.markForCheck();
  }

  /** Teste marcado sem resultado invalida o formulário: a API exige o resultado. */
  validate(control: AbstractControl): ValidationErrors | null {
    const valor: unknown = control.value;
    const pendente = Array.isArray(valor) && valor.some(t => !!t && typeof t === 'object' && !t.resultado);
    return pendente ? { resultadoPendente: true } : null;
  }

  escolherUnica(valor: string | null): void {
    this.unico = valor;
    this.emitir(valor);
  }

  alternar(valor: string): void {
    if (this.modo === 'testes') {
      this.testes = this.marcado(valor)
        ? this.testes.filter(t => t.teste !== valor)
        : [...this.testes, { teste: valor, resultado: null }];
      this.emitir(this.ordenar(this.testes, t => t.teste));
      return;
    }
    this.selecionados = this.marcado(valor)
      ? this.selecionados.filter(v => v !== valor)
      : [...this.selecionados, valor];
    this.selecionados = this.ordenar(this.selecionados, v => v);
    this.emitir(this.selecionados);
  }

  escolherResultado(teste: string, resultado: ResultadoTesteFuncional): void {
    this.testes = this.testes.map(t => (t.teste === teste ? { ...t, resultado } : t));
    this.emitir(this.ordenar(this.testes, t => t.teste));
  }

  tocar(): void {
    this.onTouched();
  }

  /** Na ordem do catálogo, com os valores desconhecidos no fim — o registro fica estável entre edições. */
  private ordenar<T>(itens: T[], chave: (item: T) => string): T[] {
    const ordem = new Map(this.opcoes.map((o, i) => [o.valor, i]));
    return [...itens].sort((a, b) => (ordem.get(chave(a)) ?? Infinity) - (ordem.get(chave(b)) ?? Infinity));
  }

  private emitir(valor: unknown): void {
    this.onChange(valor);
    this.onTouched();
  }
}
