# Carlesso Pilates — Frontend

SPA Angular 22 (standalone, control flow em bloco) para gestão de um estúdio de
pilates. Consome uma API REST Spring Boot através do proxy `/api/*`.

## Comandos

| Comando | Quando usar |
|---|---|
| `npm start` | Servidor de desenvolvimento em http://localhost:4200 |
| `npm test` | Testes unitários com watch |
| `npm run test:ci` | Testes em Chrome headless com cobertura — o mesmo da CI |
| `npm run lint` | `ng lint` + `lint:tokens`; roda no job de lint da CI |
| `npm run build` | Build de produção, respeitando os budgets de bundle |

Antes de abrir PR, rode `npm run lint`, `npm run test:ci` e `npm run build` — são
exatamente os três jobs da CI.

## Arquitetura

`src/app` tem três camadas: `core/` (models, services da API, interceptors,
guards), `pages/` (uma pasta por área, um componente por tela) e `shared/`
(components, pipes, services e utils). Componentes de página orquestram serviços
do `core` e nunca chamam a API diretamente. Lógica sem dependência do DOM vive em
`shared/utils/` com cobertura própria.

Detalhes em [`docs/arquitetura.md`](docs/arquitetura.md).

## Estilos: use apenas tokens existentes

A nomenclatura é `--bg-*` (superfície), `--text-*` (texto), `--border-*` (borda),
`--sp-*` (espaçamento) e `--r-*` (raio). Nomes comuns de outros design systems
(`--surface`, `--space-md`, `--radius-lg`, `--c-primary`) **não existem aqui** e
um token inexistente não quebra build, lint nem teste — apenas some da tela. Por
isso `npm run lint:tokens` valida todo `var(--token)` de `src/`.

As demais armadilhas (não sobrescrever o interior de componentes globais no SCSS
da página, `background-color:` em vez da shorthand `background:`) estão em
[`docs/design-system.md`](docs/design-system.md). Leia antes de mexer em CSS.

## Onde documentar cada mudança

O `README.md` chegou a 441 linhas porque toda feature nova acrescentava um
parágrafo a ele. Não volte a fazer isso. Cada assunto tem um dono:

| Se você mudou… | Documente em |
|---|---|
| Comportamento de tela, endpoint, validação, tratamento de erro | `docs/funcionalidades.md` |
| Uma rota (nova, removida ou com perfil diferente) | `docs/rotas.md` |
| Estrutura de pastas, camadas ou proxy | `docs/arquitetura.md` |
| Token, regra de estilo, responsividade ou tema | `docs/design-system.md` |
| Pipeline de CI, testes ou ferramental | `docs/desenvolvimento.md` |
| Docker, Nginx ou Vercel | `docs/deploy.md` |
| Uma decisão técnica e o porquê dela | `docs/context.md` |
| **Como instalar ou rodar o projeto** | `README.md` — e só nesse caso |

Não mantenha à mão listas que o repositório já responde: árvores de pastas
componente a componente e listas de arquivos `.spec.ts` nascem desatualizadas e
foram removidas de propósito.
