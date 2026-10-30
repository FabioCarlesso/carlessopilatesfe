import { PAPEIS, UserRole } from '../../core/models/auth';

/** O que um atalho faz ao ser completado. */
export type AcaoAtalho =
  | { tipo: 'navegar'; rota: string }
  | { tipo: 'buscar' }
  | { tipo: 'ajuda' };

export type GrupoAtalho = 'Geral' | 'Navegação' | 'Cadastro';

export interface AtalhoTeclado {
  /**
   * Teclas na ordem em que são pressionadas. Cada item é um token de
   * `tokenDaTecla`: uma tecla sem modificador (`g`, `/`, `?`) ou a combinação
   * `Ctrl+K`. Dois itens formam uma sequência (`g` e depois `p`).
   */
  teclas: readonly string[];
  descricao: string;
  grupo: GrupoAtalho;
  acao: AcaoAtalho;
  /**
   * Grupo de papéis que libera o atalho — o **mesmo** `PAPEIS` do `roleGuard`
   * da rota de destino, para o atalho nunca levar a um `/403`. Ausente quando
   * basta estar autenticado.
   */
  papeis?: readonly UserRole[];
  /** Funciona mesmo com o foco num campo de texto (só combinações que não digitam). */
  funcionaEmCampo?: boolean;
}

/** Tempo máximo entre as teclas de uma sequência como `g p`. */
export const TEMPO_SEQUENCIA_MS = 1500;

export const TOKEN_CTRL_K = 'Ctrl+K';

export const ATALHOS: readonly AtalhoTeclado[] = [
  { teclas: [TOKEN_CTRL_K], descricao: 'Focar a busca (Cmd+K no Mac)', grupo: 'Geral', acao: { tipo: 'buscar' }, funcionaEmCampo: true },
  { teclas: ['/'], descricao: 'Focar a busca', grupo: 'Geral', acao: { tipo: 'buscar' } },
  { teclas: ['?'], descricao: 'Mostrar esta lista de atalhos', grupo: 'Geral', acao: { tipo: 'ajuda' } },
  { teclas: ['g', 'd'], descricao: 'Ir para o início (dashboard)', grupo: 'Navegação', acao: { tipo: 'navegar', rota: '/inicio' } },
  { teclas: ['g', 'a'], descricao: 'Ir para a agenda', grupo: 'Navegação', acao: { tipo: 'navegar', rota: '/agenda' }, papeis: PAPEIS.agenda },
  { teclas: ['g', 'e'], descricao: 'Ir para a lista de espera', grupo: 'Navegação', acao: { tipo: 'navegar', rota: '/lista-espera' }, papeis: PAPEIS.agenda },
  { teclas: ['g', 'p'], descricao: 'Ir para pacientes', grupo: 'Navegação', acao: { tipo: 'navegar', rota: '/pacientes' }, papeis: PAPEIS.equipe },
  { teclas: ['g', 'f'], descricao: 'Ir para profissionais', grupo: 'Navegação', acao: { tipo: 'navegar', rota: '/profissionais' }, papeis: PAPEIS.admin },
  { teclas: ['g', 'r'], descricao: 'Ir para relatórios', grupo: 'Navegação', acao: { tipo: 'navegar', rota: '/relatorios' }, papeis: PAPEIS.fiscal },
  { teclas: ['g', 'm'], descricao: 'Ir para a administração', grupo: 'Navegação', acao: { tipo: 'navegar', rota: '/admin' }, papeis: PAPEIS.admin },
  { teclas: ['n', 'p'], descricao: 'Novo paciente', grupo: 'Cadastro', acao: { tipo: 'navegar', rota: '/pacientes/novo' }, papeis: PAPEIS.equipe },
  { teclas: ['n', 'e'], descricao: 'Nova inscrição na lista de espera', grupo: 'Cadastro', acao: { tipo: 'navegar', rota: '/lista-espera/nova' }, papeis: PAPEIS.agenda }
];

const TECLAS_MODIFICADORAS = new Set(['Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'CapsLock']);

type TeclaPressionada = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>;

/** Verdadeiro para o keydown de uma tecla modificadora sozinha (o Shift antes do `?`). */
export function ehTeclaModificadora(evento: Pick<KeyboardEvent, 'key'>): boolean {
  return TECLAS_MODIFICADORAS.has(evento.key);
}

/**
 * Converte o keydown no token comparado com `AtalhoTeclado.teclas`, ou `null`
 * quando a combinação não é prevista. `Ctrl`/`Cmd`+`K` é a única com
 * modificador; `Alt` (e o `AltGr`, que o Windows reporta como `Ctrl+Alt`)
 * nunca vale. O `Shift` só é aceito em símbolos — `?` exige Shift na maioria
 * dos layouts —, nunca em letras: `Shift+G` não é `g`. Letras são comparadas
 * em minúsculas para o Caps Lock não desligar os atalhos.
 */
export function tokenDaTecla(evento: TeclaPressionada): string | null {
  const { key, ctrlKey, metaKey, altKey, shiftKey } = evento;
  if (!key || altKey) return null;

  if (ctrlKey || metaKey) {
    return !shiftKey && key.toLowerCase() === 'k' ? TOKEN_CTRL_K : null;
  }

  if (key.length !== 1) return null;

  const ehLetra = key.toLowerCase() !== key.toUpperCase();
  if (ehLetra) {
    return shiftKey ? null : key.toLowerCase();
  }
  return key;
}

/** Atalhos que o usuário pode usar, segundo `temPapel` (o `AuthService.hasAnyRole`). */
export function atalhosPermitidos(
  atalhos: readonly AtalhoTeclado[],
  temPapel: (papeis: readonly UserRole[]) => boolean
): AtalhoTeclado[] {
  return atalhos.filter(atalho => !atalho.papeis || temPapel(atalho.papeis));
}

export type ResultadoSequencia =
  | { tipo: 'completo'; atalho: AtalhoTeclado }
  | { tipo: 'parcial' }
  | { tipo: 'nenhum' };

/** Compara a sequência digitada até agora com os atalhos disponíveis. */
export function resolverSequencia(sequencia: readonly string[], atalhos: readonly AtalhoTeclado[]): ResultadoSequencia {
  const comPrefixo = atalhos.filter(
    atalho => atalho.teclas.length >= sequencia.length && sequencia.every((tecla, i) => atalho.teclas[i] === tecla)
  );
  const completo = comPrefixo.find(atalho => atalho.teclas.length === sequencia.length);
  if (completo) return { tipo: 'completo', atalho: completo };
  return comPrefixo.length > 0 ? { tipo: 'parcial' } : { tipo: 'nenhum' };
}
