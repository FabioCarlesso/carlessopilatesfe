/**
 * Valida que todo `var(--token)` de `src/` aponta para uma custom property que
 * existe de fato.
 *
 * Motivação (issue #213): `var(--inexistente)` sem fallback torna a declaração
 * inválida no momento da computação (CSS Variables 1, §3.2) — a propriedade cai
 * para o valor herdado ou inicial. Não há erro de build, aviso de lint nem falha
 * de teste: quatro telas do prontuário renderizaram por meses com fundo
 * transparente, borda em `currentColor` e cantos retos sem que nada sinalizasse.
 *
 * O nome é validado mesmo quando há fallback (`var(--x, 1rem)`). O fallback
 * evita o sintoma visual, mas congela um literal do tema claro e faz o estilo
 * escapar do `[data-theme="dark"]` — foi exatamente o que escondeu os badges de
 * `/admin/usuarios` e os espaçamentos de `/perfil/alterar-senha`.
 *
 * Um nome é válido se estiver declarado em `src/styles/_tokens.scss` (os tokens
 * do Design System) ou no próprio arquivo que o usa (variável local de
 * componente, como `--serie-cor` no gráfico de evoluções).
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const DIR_FONTE = join(RAIZ, 'src');
const ARQUIVO_TOKENS = join(DIR_FONTE, 'styles', '_tokens.scss');
const EXTENSOES = ['.scss', '.css', '.html', '.ts'];

/** `var(--nome` — captura o nome e o que vem logo depois, para saber se há fallback. */
const USO = /var\(\s*(--[\w-]+)\s*([,)])/g;
/** `--nome:` em posição de declaração (início de linha, após `{` ou após `;`). */
const DECLARACAO = /(?:^|[;{])\s*(--[\w-]+)\s*:/gm;

function listarArquivos(dir) {
  return readdirSync(dir).flatMap(nome => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      return listarArquivos(caminho);
    }
    return EXTENSOES.some(ext => nome.endsWith(ext)) ? [caminho] : [];
  });
}

function nomesDeclarados(conteudo) {
  return new Set(Array.from(conteudo.matchAll(DECLARACAO), ([, nome]) => nome));
}

const tokensGlobais = nomesDeclarados(readFileSync(ARQUIVO_TOKENS, 'utf8'));
if (tokensGlobais.size === 0) {
  console.error(`Nenhum token encontrado em ${relative(RAIZ, ARQUIVO_TOKENS)} — verificação abortada.`);
  process.exit(1);
}

const violacoes = [];

for (const caminho of listarArquivos(DIR_FONTE)) {
  const conteudo = readFileSync(caminho, 'utf8');
  if (!conteudo.includes('var(--')) {
    continue;
  }

  const locais = nomesDeclarados(conteudo);
  const linhas = conteudo.split('\n');

  linhas.forEach((linha, indice) => {
    for (const [, nome, separador] of linha.matchAll(USO)) {
      if (tokensGlobais.has(nome) || locais.has(nome)) {
        continue;
      }
      violacoes.push({
        arquivo: relative(RAIZ, caminho),
        linha: indice + 1,
        nome,
        comFallback: separador === ','
      });
    }
  });
}

if (violacoes.length > 0) {
  console.error(`\n✗ ${violacoes.length} uso(s) de token CSS inexistente em src/:\n`);
  for (const { arquivo, linha, nome, comFallback } of violacoes) {
    const efeito = comFallback
      ? 'usa o fallback literal e ignora o tema escuro'
      : 'declaração inválida: a propriedade cai para o valor herdado/inicial';
    console.error(`  ${arquivo}:${linha}  ${nome}  — ${efeito}`);
  }
  console.error(
    '\nUse um token declarado em src/styles/_tokens.scss'
    + ' (--bg-* para superfície, --sp-* para espaçamento, --r-* para raio)'
    + ' ou declare a variável no próprio componente.\n'
  );
  process.exit(1);
}

console.log(`✓ Todos os var(--token) de src/ apontam para tokens declarados (${tokensGlobais.size} tokens no Design System).`);
