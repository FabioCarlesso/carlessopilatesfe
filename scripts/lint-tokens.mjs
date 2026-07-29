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
 * do Design System) ou em qualquer arquivo da **mesma pasta** de quem o usa. O
 * escopo é a pasta, e não o arquivo, porque um componente é uma pasta neste
 * projeto: `--serie-cor` é declarado no `.scss` do gráfico de evoluções e nada
 * impede que uma variável local seja declarada no `.scss` e consumida por um
 * `[style.--x]` no `.html` irmão.
 *
 * Limites conhecidos: um `var()` montado por concatenação em tempo de execução
 * (`` `var(--${nome})` ``) não é analisável estaticamente e passa sem conferência.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const DIR_FONTE = join(RAIZ, 'src');
const ARQUIVO_TOKENS = join(DIR_FONTE, 'styles', '_tokens.scss');
const EXTENSOES = ['.scss', '.css', '.html', '.ts'];

/**
 * `var(--nome` com ou sem fallback. Aplicado ao arquivo inteiro, e não linha a
 * linha, para pegar também o `var(` quebrado em várias linhas — que era
 * exatamente o formato capaz de escapar da versão anterior desta verificação.
 */
const USO = /var\(\s*(--[\w-]+)\s*([,)])/g;
/**
 * `--nome:` em posição de declaração. Além de início de linha, `;` e `{`, aceita
 * `"` e `'` para reconhecer a primeira propriedade de um `style="--x: 4px"`.
 */
const DECLARACAO = /(?:^|[;{"'])\s*(--[\w-]+)\s*:/gm;

/**
 * Troca comentários por espaços, preservando offsets e quebras de linha para os
 * números de linha continuarem válidos.
 *
 * Sem isso a verificação erra nas duas direções: uma custom property escrita
 * dentro de um bloco `/* *\/` era lida como declaração e **whitelistava** o nome,
 * e uma menção a `var(--x)` em comentário era acusada como uso.
 *
 * Em SCSS/CSS/TS a varredura é caractere a caractere porque `//` também aparece
 * dentro de string — o data URI de `--select-chevron` traz
 * `http://www.w3.org/2000/svg` — e um regex ingênuo cortaria o valor no meio. As
 * strings ficam intactas: em `.ts` há uso legítimo de `var()` dentro delas. Em
 * HTML só existe `<!-- -->`, e ali não se rastreia string alguma: apóstrofo de
 * texto corrido (`aria-label`, conteúdo) engoliria o resto do arquivo.
 */
function semComentarios(conteudo, caminho) {
  if (caminho.endsWith('.html')) {
    return conteudo.replace(/<!--[\s\S]*?-->/g, trecho => trecho.replace(/[^\n]/g, ' '));
  }

  // `split('')` e não `[...conteudo]`: o spread itera por *code point* e junta o
  // par surrogate de um emoji num só elemento, enquanto o laço abaixo indexa por
  // *code unit* (`conteudo[i]`). Um único caractere fora do BMP desalinharia as
  // duas indexações e o `saida[i] = ' '` passaria a apagar a posição errada —
  // comendo o `v` de um `var(` colado a um comentário e deixando o uso passar.
  const saida = conteudo.split('');
  let estado = 'codigo';
  let aspa = '';

  for (let i = 0; i < conteudo.length; i++) {
    const atual = conteudo[i];
    const proximo = conteudo[i + 1];

    if (estado === 'codigo') {
      if (atual === '"' || atual === "'" || atual === '`') {
        estado = 'string';
        aspa = atual;
      } else if (atual === '/' && proximo === '*') {
        estado = 'bloco';
        saida[i] = saida[i + 1] = ' ';
        i++;
      } else if (atual === '/' && proximo === '/') {
        estado = 'linha';
        saida[i] = saida[i + 1] = ' ';
        i++;
      }
    } else if (estado === 'string') {
      if (atual === '\\') {
        i++;
      } else if (atual === aspa) {
        estado = 'codigo';
      }
    } else if (estado === 'bloco') {
      if (atual === '*' && proximo === '/') {
        saida[i] = saida[i + 1] = ' ';
        i++;
        estado = 'codigo';
      } else if (atual !== '\n') {
        saida[i] = ' ';
      }
    } else if (atual === '\n') {
      estado = 'codigo';
    } else {
      saida[i] = ' ';
    }
  }

  return saida.join('');
}

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
  return Array.from(conteudo.matchAll(DECLARACAO), ([, nome]) => nome);
}

const linhaDo = (conteudo, offset) => conteudo.slice(0, offset).split('\n').length;

const tokensGlobais = new Set(
  nomesDeclarados(semComentarios(readFileSync(ARQUIVO_TOKENS, 'utf8'), ARQUIVO_TOKENS))
);
if (tokensGlobais.size === 0) {
  console.error(`Nenhum token encontrado em ${relative(RAIZ, ARQUIVO_TOKENS)} — verificação abortada.`);
  process.exit(1);
}

// Uma passada só para limpar os comentários e juntar as declarações por pasta;
// a conferência dos usos vem depois, já com o escopo local completo.
const arquivos = listarArquivos(DIR_FONTE).map(caminho => ({
  caminho,
  conteudo: semComentarios(readFileSync(caminho, 'utf8'), caminho)
}));

const declaradosNaPasta = new Map();
for (const { caminho, conteudo } of arquivos) {
  const pasta = dirname(caminho);
  const nomes = declaradosNaPasta.get(pasta) ?? new Set();
  for (const nome of nomesDeclarados(conteudo)) {
    nomes.add(nome);
  }
  declaradosNaPasta.set(pasta, nomes);
}

const violacoes = [];

for (const { caminho, conteudo } of arquivos) {
  if (!conteudo.includes('var(')) {
    continue;
  }

  const locais = declaradosNaPasta.get(dirname(caminho));

  for (const achado of conteudo.matchAll(USO)) {
    const [, nome, separador] = achado;
    if (tokensGlobais.has(nome) || locais.has(nome)) {
      continue;
    }
    violacoes.push({
      arquivo: relative(RAIZ, caminho),
      linha: linhaDo(conteudo, achado.index),
      nome,
      comFallback: separador === ','
    });
  }
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
    + ' ou declare a variável na pasta do próprio componente.\n'
  );
  process.exit(1);
}

console.log(`✓ Todos os var(--token) de src/ apontam para tokens declarados (${tokensGlobais.size} tokens no Design System).`);
