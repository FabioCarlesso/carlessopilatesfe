# Desenvolvimento

Testes, integração contínua e ferramental de apoio. Para instalar e rodar o
projeto, veja o [README](../README.md).

## Testes

Os testes unitários cobrem os serviços, interceptors, guards, pipes, utilitários
e todos os componentes de página:

```bash
npm test
```

`npm run test:ci` roda em Chrome headless, sem watch, e grava o relatório de
cobertura em `coverage/` — é o mesmo comando executado pela CI.

Cada serviço, componente de página e utilitário tem seu `.spec.ts` ao lado do
arquivo que testa. Para listar os testes existentes:

```bash
find src -name '*.spec.ts'
```

## Integração Contínua (CI)

A cada `push` na `master` e a cada `pull_request`, o workflow
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) executa no GitHub Actions:

- **Lint** — `npm run lint`, que encadeia `ng lint` (ESLint + angular-eslint) e `lint:tokens` (nomes de custom property)
- **Testes unitários** — `npm run test:ci` em Chrome headless, publicando o relatório de cobertura como artifact
- **Build de produção** — `npm run build`, respeitando os *budgets* de bundle e publicando `dist/` como artifact
- **Build da imagem Docker** — em merges na `master`, valida o `Dockerfile` (sem publicar imagem)

Em `pull_request`, o build da imagem roda pelo workflow
[`docker-pr.yml`](../.github/workflows/docker-pr.yml), mas apenas quando a PR altera
algo que entra na imagem (`Dockerfile`, `nginx/`, `package.json`,
`package-lock.json`). Assim uma quebra no container aparece na PR, e não só
depois do merge, sem cobrar o build de PRs que mexem apenas no frontend.

As dependências npm e as GitHub Actions são atualizadas automaticamente via
[Dependabot](../.github/dependabot.yml).

## CodeGraph (contexto para agentes de IA)

O projeto é indexado pelo [CodeGraph](https://github.com/colbymchenry/codegraph), que mantém um grafo semântico do código (símbolos, chamadas e dependências) para que agentes de IA respondam perguntas de arquitetura em uma única consulta, em vez de explorar arquivo por arquivo.

A configuração é versionada e não exige instalação global:

- [`.mcp.json`](../.mcp.json) — registra o servidor MCP `codegraph` (via `npx`, versão fixada) para o Claude Code do projeto.
- [`codegraph.json`](../codegraph.json) — exclui do índice o que não é código da aplicação: `assets/` (protótipos HTML/JSX do Design System), `docs/`, `nginx/` e `public/`. O `.gitignore` já é respeitado por padrão, então `node_modules`, `dist` e `coverage` ficam de fora automaticamente.
- O índice é gravado em `.codegraph/` (ignorado pelo Git) e sincroniza sozinho a cada alteração de arquivo.

Para gerar o índice pela primeira vez após clonar o repositório:

```bash
npx @colbymchenry/codegraph init
```

Comandos úteis fora do agente:

```bash
npx @colbymchenry/codegraph status                       # estatísticas do índice
npx @colbymchenry/codegraph explore "fluxo de login"     # símbolos, código e call paths
npx @colbymchenry/codegraph impact AuthService           # o que é afetado ao alterar um símbolo
```

O CodeGraph é ferramenta de apoio ao desenvolvimento: não entra no bundle, no Docker nem na CI.

### Decisões de configuração

- **Servidor MCP versionado no repositório** (`.mcp.json`), e não em `~/.claude.json`, para que a configuração acompanhe o projeto e valha para toda a equipe.
- **Execução via `npx` com versão fixada** (`@colbymchenry/codegraph@1.4.1`), evitando exigir instalação global da CLI e mantendo o comportamento reprodutível entre máquinas.
- **Exclusões em `codegraph.json`**: `assets/` (protótipos HTML e auxiliares `.jsx` do Design System — React em um projeto Angular polui o grafo), `docs/` (documentação, não código da aplicação), `nginx/` e `public/`. O `.gitignore` já é respeitado nativamente, então `node_modules`, `dist`, `coverage` e `.angular/cache` não precisam ser listados.
- **Índice em `.codegraph/`**, adicionado ao `.gitignore` — é artefato local, regenerável por `npx @colbymchenry/codegraph init` e sincronizado automaticamente a cada alteração de arquivo.
