import { FormControl } from '@angular/forms';
import {
  CamposOpcoesAnamnese,
  CamposOpcoesReavaliacao,
  CampoOpcoesAvaliacao,
  CatalogoOpcoesAvaliacao,
  DefinicaoCampoOpcoes,
  ResultadoTesteFuncional
} from '../../core/models/opcoes-avaliacao';

/**
 * Regras puras das opções pré-definidas (issue #306): os controles que cada
 * formulário ganha, o trecho do DTO que eles geram, o resumo de um registro com
 * os rótulos do catálogo e o comparativo entre dois registros.
 */

/** Teste marcado no formulário; o resultado fica `null` até ser escolhido. */
export interface TesteFuncionalEmEdicao {
  teste: string;
  resultado: ResultadoTesteFuncional | null;
}

export const RESULTADO_TESTE_LABEL: Record<ResultadoTesteFuncional, string> = {
  POSITIVO: 'Positivo',
  NEGATIVO: 'Negativo'
};

type Registro = object | null | undefined;

function ler(registro: Registro, campo: string): unknown {
  return registro ? (registro as Record<string, unknown>)[campo] : undefined;
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor : null;
}

function lista(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((v): v is string => typeof v === 'string') : [];
}

function testes(valor: unknown): TesteFuncionalEmEdicao[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .filter((t): t is TesteFuncionalEmEdicao => !!t && typeof t === 'object' && typeof t.teste === 'string')
    .map(t => ({ teste: t.teste, resultado: t.resultado ?? null }));
}

function valorInicial(def: DefinicaoCampoOpcoes, registro: Registro): string | string[] | TesteFuncionalEmEdicao[] | null {
  const valor = ler(registro, def.campo);
  switch (def.tipo) {
    case 'unica': return texto(valor);
    case 'testes': return testes(valor);
    default: return lista(valor);
  }
}

/** Controles dos campos estruturados e dos complementos, para somar ao `fb.group` do formulário. */
export function controlesOpcoes(defs: readonly DefinicaoCampoOpcoes[]): Record<string, FormControl> {
  const controles: Record<string, FormControl> = {};
  for (const def of defs) {
    controles[def.campo] = new FormControl(valorInicial(def, null));
    controles[def.complemento] = new FormControl('');
  }
  return controles;
}

/**
 * Valores para o `patchValue` a partir do registro da API. Registro antigo, sem
 * os campos, volta com listas vazias e seleção nula — e abre normalmente.
 */
export function valoresFormularioOpcoes(
  defs: readonly DefinicaoCampoOpcoes[],
  registro: Registro
): Record<string, unknown> {
  const valores: Record<string, unknown> = {};
  for (const def of defs) {
    valores[def.campo] = valorInicial(def, registro);
    valores[def.complemento] = texto(ler(registro, def.complemento)) ?? '';
  }
  return valores;
}

/**
 * Trecho do DTO de criação/edição. O `PUT` da API é parcial (`null` mantém): por
 * isso, na edição, a seleção única vazia e o complemento apagado vão como `""`, e
 * as listas vão sempre (lista vazia limpa).
 */
export function dtoOpcoes(
  defs: readonly DefinicaoCampoOpcoes[],
  valor: Record<string, unknown>,
  criando: boolean
): CamposOpcoesAnamnese & CamposOpcoesReavaliacao {
  const vazio = criando ? null : '';
  const dto: Record<string, unknown> = {};
  for (const def of defs) {
    const atual = valor[def.campo];
    if (def.tipo === 'unica') {
      dto[def.campo] = texto(atual) ?? vazio;
    } else if (def.tipo === 'testes') {
      dto[def.campo] = testes(atual).filter(t => t.resultado !== null);
    } else {
      dto[def.campo] = lista(atual);
    }
    const complemento = texto(valor[def.complemento]);
    dto[def.complemento] = complemento ? complemento.trim() : vazio;
  }
  return dto as CamposOpcoesAnamnese & CamposOpcoesReavaliacao;
}

export function campoDoCatalogo(
  catalogo: CatalogoOpcoesAvaliacao | null | undefined,
  campo: string
): CampoOpcoesAvaliacao | null {
  return catalogo?.campos.find(c => c.campo === campo) ?? null;
}

/** Rótulo do catálogo; valor fora dele aparece como veio, para não sumir. */
export function rotuloOpcao(campo: CampoOpcoesAvaliacao | null, valor: string): string {
  return campo?.opcoes.find(o => o.valor === valor)?.rotulo ?? valor;
}

/** Opção que não é mais oferecida: aposentada no catálogo ou fora dele. */
export function opcaoAntiga(campo: CampoOpcoesAvaliacao | null, valor: string): boolean {
  if (!campo) return false;
  const opcao = campo.opcoes.find(o => o.valor === valor);
  return !opcao || !opcao.ativa;
}

export interface ValorResumoOpcoes {
  valor: string;
  rotulo: string;
  antiga: boolean;
  /** Só nos testes funcionais. */
  resultado?: string;
}

export interface ItemResumoOpcoes {
  campo: string;
  rotulo: string;
  valores: ValorResumoOpcoes[];
  complemento: string | null;
}

function valoresSelecionados(def: DefinicaoCampoOpcoes, registro: Registro): { valor: string; resultado?: ResultadoTesteFuncional | null }[] {
  const valor = valorInicial(def, registro);
  if (def.tipo === 'testes') return (valor as TesteFuncionalEmEdicao[]).map(t => ({ valor: t.teste, resultado: t.resultado }));
  if (def.tipo === 'unica') return valor ? [{ valor: valor as string }] : [];
  return (valor as string[]).map(v => ({ valor: v }));
}

/** Opções selecionadas e complementos do registro, com os rótulos do catálogo; omite os campos vazios. */
export function resumirOpcoes(
  catalogo: CatalogoOpcoesAvaliacao | null,
  defs: readonly DefinicaoCampoOpcoes[],
  registro: Registro
): ItemResumoOpcoes[] {
  const itens: ItemResumoOpcoes[] = [];
  for (const def of defs) {
    const campo = campoDoCatalogo(catalogo, def.campo);
    const valores = valoresSelecionados(def, registro).map(sel => ({
      valor: sel.valor,
      rotulo: rotuloOpcao(campo, sel.valor),
      antiga: opcaoAntiga(campo, sel.valor),
      ...(sel.resultado ? { resultado: RESULTADO_TESTE_LABEL[sel.resultado] } : {})
    }));
    const complemento = texto(ler(registro, def.complemento));
    if (valores.length || complemento) {
      itens.push({ campo: def.campo, rotulo: campo?.rotulo ?? def.campo, valores, complemento });
    }
  }
  return itens;
}

export interface MudancaResultado {
  teste: string;
  de: string;
  para: string;
}

export interface MudancaOpcoes {
  campo: string;
  rotulo: string;
  incluidos: string[];
  removidos: string[];
  /** Seleção única que mudou; `null` vira "Não informado". */
  valorAlterado: { de: string; para: string } | null;
  resultadosAlterados: MudancaResultado[];
}

export interface ComparativoOpcoes {
  /** Campos com alguma seleção em pelo menos um dos dois registros. */
  comparados: number;
  mudancas: MudancaOpcoes[];
}

export const NAO_INFORMADO = 'Não informado';

/**
 * O que mudou nas opções do registro `atual` em relação ao `anterior`: itens
 * incluídos e removidos, troca de seleção única e troca de resultado de teste.
 * Campo que um dos registros não traz (API anterior à #248, ou a avaliação, que
 * não tem regiões de dor) fica de fora; campo vazio nos dois também.
 */
export function compararOpcoes(
  catalogo: CatalogoOpcoesAvaliacao | null,
  defs: readonly DefinicaoCampoOpcoes[],
  anterior: Registro,
  atual: Registro
): ComparativoOpcoes {
  let comparados = 0;
  const mudancas: MudancaOpcoes[] = [];

  for (const def of defs) {
    if (ler(anterior, def.campo) === undefined || ler(atual, def.campo) === undefined) continue;
    const antes = valoresSelecionados(def, anterior);
    const depois = valoresSelecionados(def, atual);
    if (!antes.length && !depois.length) continue;
    comparados++;

    const campo = campoDoCatalogo(catalogo, def.campo);
    const rotulo = (valor: string) => rotuloOpcao(campo, valor);
    const comResultado = (sel: { valor: string; resultado?: ResultadoTesteFuncional | null }) =>
      sel.resultado ? `${rotulo(sel.valor)} (${RESULTADO_TESTE_LABEL[sel.resultado].toLowerCase()})` : rotulo(sel.valor);
    const mudanca: MudancaOpcoes = {
      campo: def.campo,
      rotulo: campo?.rotulo ?? def.campo,
      incluidos: [],
      removidos: [],
      valorAlterado: null,
      resultadosAlterados: []
    };

    if (def.tipo === 'unica') {
      const de = antes[0]?.valor ?? null;
      const para = depois[0]?.valor ?? null;
      if (de !== para) {
        mudanca.valorAlterado = { de: de ? rotulo(de) : NAO_INFORMADO, para: para ? rotulo(para) : NAO_INFORMADO };
      }
    } else {
      const porValor = (sels: typeof antes) => new Map(sels.map(s => [s.valor, s]));
      const mapaAntes = porValor(antes);
      const mapaDepois = porValor(depois);
      mudanca.incluidos = depois.filter(s => !mapaAntes.has(s.valor)).map(comResultado);
      mudanca.removidos = antes.filter(s => !mapaDepois.has(s.valor)).map(comResultado);
      for (const sel of depois) {
        const anteriorSel = mapaAntes.get(sel.valor);
        if (anteriorSel?.resultado && sel.resultado && anteriorSel.resultado !== sel.resultado) {
          mudanca.resultadosAlterados.push({
            teste: rotulo(sel.valor),
            de: RESULTADO_TESTE_LABEL[anteriorSel.resultado],
            para: RESULTADO_TESTE_LABEL[sel.resultado]
          });
        }
      }
    }

    if (mudanca.incluidos.length || mudanca.removidos.length || mudanca.valorAlterado || mudanca.resultadosAlterados.length) {
      mudancas.push(mudanca);
    }
  }

  return { comparados, mudancas };
}


/** Frase da mudança para a tela: "incluído: Lombar; removido: Cervical". */
export function descreverMudanca(mudanca: MudancaOpcoes): string {
  const partes: string[] = [];
  if (mudanca.valorAlterado) partes.push(`de ${mudanca.valorAlterado.de} para ${mudanca.valorAlterado.para}`);
  if (mudanca.incluidos.length) partes.push(`incluído: ${mudanca.incluidos.join(', ')}`);
  if (mudanca.removidos.length) partes.push(`removido: ${mudanca.removidos.join(', ')}`);
  for (const r of mudanca.resultadosAlterados) partes.push(`${r.teste}: de ${r.de} para ${r.para}`);
  return partes.join('; ');
}
