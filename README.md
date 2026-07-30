# Carlesso Pilates — Frontend

Interface web para gestão administrativa de um estúdio de pilates, desenvolvida em **Angular 19**.

## Visão Geral

A aplicação oferece dashboard inicial de indicadores, CRUDs administrativos para pacientes e profissionais, fluxos de planos, pagamentos e aulas, além de relatórios administrativos. Consome uma API REST (Spring Boot) via proxy do Angular CLI.

**Documentação detalhada:** [`docs/documentacao.md`](docs/documentacao.md)  
**Documentação visual em HTML:** [`docs/documentacao.html`](docs/documentacao.html)

**Contexto e decisões técnicas:** [`docs/context.md`](docs/context.md)

---

## Pré-requisitos

- Node.js 22+ (mesma versão usada no build Docker e na CI)
- Angular CLI: `npm install -g @angular/cli`
- Backend rodando em `http://localhost:8080`
- Docker e Docker Compose, para execução em container

---

## Instalação

```bash
npm install
```

---

## Scripts

| Comando          | Descrição                                          |
|------------------|----------------------------------------------------|
| `npm start`      | Servidor de desenvolvimento em http://localhost:4200 |
| `npm test`       | Executa testes unitários (Karma + Jasmine)         |
| `npm run test:ci`| Testes em Chrome headless, sem watch, com cobertura (usado na CI) |
| `npm run lint`   | Análise estática com ESLint (angular-eslint) + `lint:tokens`  |
| `npm run lint:tokens` | Verifica que todo `var(--token)` de `src/` aponta para um token declarado |
| `npm run build`  | Build de produção em `dist/carlessopilatesfe`      |
| `npm run watch`  | Build contínuo em modo desenvolvimento             |

---

## CodeGraph (contexto para agentes de IA)

O projeto é indexado pelo [CodeGraph](https://github.com/colbymchenry/codegraph), que mantém um grafo semântico do código (símbolos, chamadas e dependências) para que agentes de IA respondam perguntas de arquitetura em uma única consulta, em vez de explorar arquivo por arquivo.

A configuração é versionada e não exige instalação global:

- [`.mcp.json`](.mcp.json) — registra o servidor MCP `codegraph` (via `npx`, versão fixada) para o Claude Code do projeto.
- [`codegraph.json`](codegraph.json) — exclui do índice o que não é código da aplicação: `assets/` (protótipos HTML/JSX do Design System), `docs/documentacao.html`, `nginx/` e `public/`. O `.gitignore` já é respeitado por padrão, então `node_modules`, `dist` e `coverage` ficam de fora automaticamente.
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

---

## Integração Contínua (CI)

A cada `push` na `master` e a cada `pull_request`, o workflow
[`.github/workflows/ci.yml`](.github/workflows/ci.yml) executa no GitHub Actions:

- **Lint** — `npm run lint`, que encadeia `ng lint` (ESLint + angular-eslint) e `lint:tokens` (nomes de custom property)
- **Testes unitários** — `npm run test:ci` em Chrome headless, publicando o relatório de cobertura como artifact
- **Build de produção** — `npm run build`, respeitando os *budgets* de bundle e publicando `dist/` como artifact
- **Build da imagem Docker** — apenas em merges na `master`, valida o `Dockerfile` (sem publicar imagem)

As dependências npm e as GitHub Actions são atualizadas automaticamente via
[Dependabot](.github/dependabot.yml).

---

## Docker

A imagem Docker compila a aplicação Angular e serve os arquivos estáticos com Nginx. O Nginx também redireciona `/api/*` para o backend configurado por `BACKEND_URL`.

```bash
# Backend local em http://localhost:8080
docker compose up --build
```

A aplicação fica disponível em `http://localhost:4200`.

Para apontar para outro backend:

```bash
BACKEND_URL=http://api:8080 docker compose up --build
```

Também é possível construir e executar sem Compose:

```bash
docker build -t carlessopilatesfe .
docker run --rm -p 4200:80 \
  -e BACKEND_URL=http://host.docker.internal:8080 \
  --add-host=host.docker.internal:host-gateway \
  carlessopilatesfe
```

---

## Deploy (Vercel)

Em produção a aplicação é hospedada na **Vercel** (`carlessopilatesfe.vercel.app`). Como a Vercel não tem o proxy do Angular CLI nem o Nginx do Docker, o roteamento de API é feito pelo [`vercel.json`](vercel.json), que replica o comportamento do `proxy.conf.json`:

- Requisições para `/api/*` são reescritas para o backend público no Railway, **removendo o prefixo `/api`** (mesmo efeito do `pathRewrite: { "^/api": "" }` do proxy de dev e do `proxy_pass ${BACKEND_URL}/` do Nginx).
- O destino é a URL pública do Railway (`https://carlessopilatesapi-production.up.railway.app`), acessada via HTTPS na 443 — a porta interna do container (8080) é resolvida pelo próprio Railway e **não** entra na URL.

> Rewrites do `vercel.json` não interpolam variáveis de ambiente, portanto a URL do backend é fixa no arquivo. Se o domínio do Railway mudar, o `vercel.json` precisa ser atualizado e é necessário um novo commit/deploy. Lembre-se de manter a URL da Vercel na variável `CORS_ALLOWED_ORIGINS` do backend.

---

## Stack

| Camada     | Tecnologia                    |
|------------|-------------------------------|
| Framework  | Angular 19.2 (standalone, imports individuais) |
| Linguagem  | TypeScript 5.7                |
| Estilos    | SCSS + Design Tokens          |
| Forms      | Reactive Forms                |
| HTTP       | HttpClient + proxy `/api/*`   |
| Testes     | Karma + Jasmine               |
| Container  | Docker + Nginx                |

---

## Estrutura

```
src/app/
├── core/
│   ├── models/                     # DTOs e interfaces
│   ├── services/                   # Integração com a API REST
│   ├── interceptors/               # HTTP interceptors (auth e 403)
│   └── guards/                     # Route guards (auth e role)
├── pages/dashboard/                # Tela inicial com indicadores consolidados
├── pages/auth/login/               # Tela de login
├── pages/auth/forgot-password/     # Tela "Esqueci minha senha"
├── pages/auth/reset-password/      # Tela de redefinição de senha via token
├── pages/auth/forbidden/           # Tela 403 de acesso negado
├── pages/pacientes/
│   ├── paciente-list/              # Listagem paginada com filtros
│   ├── paciente-form/              # Cadastro e edição
│   ├── paciente-detail/            # Visualização detalhada
│   ├── paciente-anamnese/          # Cadastro e edição da anamnese
│   ├── paciente-avaliacao-fisioterapeutica/ # Cadastro e edição da avaliação fisioterapêutica
│   ├── paciente-avaliacao-postural-list/ # Listagem das análises posturais (aba Postural)
│   ├── paciente-avaliacao-postural-form/ # Nova análise postural: vista e upload de foto
│   ├── paciente-avaliacao-postural-editor/ # Editor de marcação e resultados da análise postural
│   ├── paciente-sessao-list/       # Listagem de sessões de pilates/fisioterapia
│   ├── paciente-sessao-form/       # Cadastro e edição de sessão
│   ├── paciente-evolucao-sessao/   # Cadastro e edição da evolução clínica da sessão
│   ├── paciente-evolucao-list/     # Histórico de evoluções do paciente em linha do tempo
│   ├── paciente-plano-tratamento-list/ # Listagem de planos de tratamento
│   ├── paciente-plano-tratamento-form/ # Cadastro e edição de plano de tratamento
│   ├── paciente-reavaliacao-list/  # Listagem de reavaliações do paciente
│   └── paciente-reavaliacao-form/  # Cadastro e edição de reavaliação
├── pages/profissionais/            # CRUD de profissionais
├── pages/relatorios/               # Relatórios administrativos
├── pages/admin/
│   ├── admin-home/                 # Hub da seção administrativa
│   └── usuarios/
│       ├── usuario-list/           # Listagem de usuários
│       └── usuario-form/           # Cadastro/edição de usuários
├── shared/components/               # Componentes reutilizáveis
├── shared/services/                 # Serviços utilitários injetáveis (ex.: compressão de imagem)
└── shared/utils/                    # Funções utilitárias puras
src/styles/
└── _tokens.scss                    # Tokens do Design System Carlesso
assets/                             # Referências estáticas do Design System
```

---

## Design System

Os arquivos de referência do Design System ficam em `assets/`, incluindo `Fundacao.html`, `Componentes.html`, `Marca.html`, `tokens.css` e os auxiliares React usados pelos protótipos. As páginas usam `DesignCanvas`, `DCSection`, `DCArtboard`, `BrowserWindow`, `Frame` e painel de tweaks próprios.

No Angular, os tokens foram migrados para `src/styles/_tokens.scss` e importados por `src/styles.scss`. O sistema usa `data-theme="light|dark"` e `data-density="default|compact|comfortable"` no `documentElement`, aplicado pelo `StylePreferencesService`.

A nomenclatura é **`--bg-*` para superfície, `--text-*` para texto, `--border-*` para borda, `--sp-*` para espaçamento e `--r-*` para raio** — nomes comuns de outros design systems (`--surface`, `--space-md`, `--radius-lg`, `--c-primary`) não existem aqui. Escrever um nome inexistente não quebra build, lint nem teste: `var(--inexistente)` sem fallback torna a declaração inválida no momento da computação e a propriedade cai para o valor herdado ou inicial (fundo transparente, `currentColor`, raio `0`), enquanto `var(--inexistente, 1rem)` renderiza pelo literal e escapa do tema escuro. Foi assim que quatro telas do prontuário e os badges de `/admin/usuarios` ficaram meses fora do padrão (issue #213). Por isso `npm run lint:tokens` (`scripts/lint-tokens.mjs`), encadeado em `npm run lint` e portanto executado tanto localmente quanto no job de lint da CI, valida que todo `var(--token)` de `src/` aponta para um token de `_tokens.scss` ou para uma variável declarada na **pasta** de quem o usa — o escopo é a pasta porque um componente é uma pasta aqui, e uma variável local pode nascer no `.scss` e ser consumida por um `[style.--x]` no `.html` irmão. O nome é conferido inclusive quando há fallback, e comentários são descartados antes da análise: sem isso, uma custom property escrita dentro de um bloco `/* */` passaria a valer como declaração e uma menção a `var(--x)` em comentário seria acusada como uso.

Componentes globais como botões, inputs, cards, badges, tabelas, paginação, alertas e diálogos consomem tokens semânticos de cor, tipografia, raio, sombra e densidade.

Ao ajustar um componente global dentro do SCSS de uma página, mexa apenas em como ele se **posiciona** no layout: `margin` (com os tokens `--sp-*`) e, quando a página precisar, `width` — é assim que `forbidden` e `aula-list` deixam os botões com largura total no mobile. Não sobrescreva as propriedades que montam o interior do componente — `display`, `padding`, `min-height`, `line-height` —, porque o SCSS da página ganha o atributo `[_ngcontent-*]` do encapsulamento emulado e vence o estilo global em especificidade. O `.btn`, por exemplo, é um `inline-flex` que centraliza o rótulo por `align-items`/`justify-content` e não tem padding vertical: trocar o `display` por `inline-block` desliga o contexto flex e joga o texto para o topo da borda (issue #199).

Pela mesma razão, em elemento que depende de `background-image` herdado do estilo global use `background-color:` e nunca a shorthand `background:` — a shorthand redefine *todas* as propriedades de fundo, e o `background-image` não declarado volta a `none`. Foi o que apagou a seta dos selects nos filtros das listagens e no `.form-control-sm` de `aula-list` (issue #200). Quando um campo precisa de um fundo desenhado, o desenho mora num token (`--select-chevron`) com uma versão por tema, porque a cor fica dentro do data URI do SVG e `url()` não interpola `var()`. E todo SVG usado como `background-image` precisa de `background-size` explícito: sem tamanho intrínseco declarado, o CSS o escala por *contain* até a altura do elemento.

### Responsividade

O layout é pensado também para uso em tablet na recepção. A navbar colapsa num menu (botão ☰) em telas `≤1024px`, cobrindo a faixa de tablet (retrato e paisagem) em que os links e ações não caberiam na barra — o breakpoint tem fonte única em `shared/utils/breakpoints.ts` (`DESKTOP_MIN_WIDTH`/`MEDIA_QUERY_COMPACTO`), consumida pelo `AppComponent`, que fecha o menu ao voltar para o desktop, pelo `MenuContaComponent`, que alterna entre dropdown e lista plana, e espelhada no media query de `styles.scss`. Acima desse limite a barra nunca quebra: marca, navegação e menu de conta são `flex: none` com `white-space: nowrap`, e a busca global é o único elemento elástico (`flex: 0 1 260px`, `min-width: 160px`), de modo que a pressão de espaço estreita o campo em vez de empilhar a barra em duas linhas (issue #219). O conteúdo da navbar fica num `.navbar-inner` que repete o `max-width: 1120px` e o padding do `.container`, alinhando marca e ações às mesmas colunas do conteúdo das páginas enquanto só a faixa de fundo sangra de ponta a ponta. As tabelas rolam horizontalmente dentro do contêiner (`.table-responsive`/`.table-wrap`) sem gerar scroll da página — e esse contêiner sinaliza o transbordo com sombras nas bordas, feitas de quatro camadas de `background-image`: duas tampas opacas com `background-attachment: local`, que rolam junto com a tabela, sobre duas sombras presas ao contêiner (`scroll`); sem transbordo as tampas cobrem as sombras e nada aparece, e por isso a tabela dentro do contêiner não pode ter fundo próprio (issue #164). Tabelas largas podem congelar a coluna que identifica a linha com a classe utilitária `.table-sticky-first-col` (usada nos relatórios) e anunciar o scroll com um `.table-scroll-hint`, visível apenas em `≤768px`. O separador da coluna congelada é um pseudo-elemento, não `border-right` nem `box-shadow` da célula: em tabela com `border-collapse: collapse` a borda pertence à tabela — o WebKit não a repinta na posição sticky — e o Chromium não pinta box-shadow de célula colapsada. Todo contêiner de tabela é `tabindex="0"` + `role="region"` com `aria-label`, para o teclado alcançar o scroll horizontal (WCAG 2.1.1) — em `aula-list` os atributos são condicionais, porque em `≤640px` a tabela vira cards e deixa de rolar. O anel de foco aqui é `outline` sólido em `--text-brand`, e não o `--shadow-focus` do resto da aplicação: com 18% de alfa ele rende 1,32:1 sobre `--bg-app`, longe dos 3:1 da WCAG 2.4.11 — aceitável num botão, que já se distingue sozinho, não num alvo que só existe para o teclado. Além disso, os formulários passam de múltiplas colunas para uma coluna em `≤768px`, e botões de ação de linha e paginação usam alvo de toque de `≥44px` em `≤1024px`. Em `≤768px` a paginação das listagens (pacientes, profissionais e usuários) passa a um formato compacto de uma única linha — **Anterior / Página X de N / Próxima** —, ocultando a janela de páginas numeradas (mantida no desktop `≥769px`) para evitar quebra em várias linhas no mobile. Tema e densidade são preservados em todas as larguras.

### Tema claro/escuro

O `StylePreferencesService` persiste a preferência de tema e densidade em `localStorage` (chave `carlesso.style-preferences`). No primeiro acesso, sem preferência salva, o tema inicial segue `prefers-color-scheme` do sistema operacional; depois disso a escolha do usuário tem prioridade e permanece após recarregar a página ou reabrir o sistema no mesmo navegador. O menu de conta da navbar e a tela de login expõem o controle **Tema claro/Tema escuro**, permitindo alternar o tema via `StylePreferencesService.toggleTheme()` antes ou depois da autenticação, com `aria-label` e `aria-pressed` para acessibilidade. O dark mode é definido inteiramente pelos tokens em `[data-theme="dark"]` — ao ajustar tokens, mantenha `src/styles/_tokens.scss` e `assets/tokens.css` em sincronia.

---

## Licença

Este projeto é distribuído sob a licença MIT. Consulte o arquivo [`LICENSE`](LICENSE) para mais detalhes.

---

## Testes

Os testes unitários cobrem o serviço e todos os componentes de página:

```bash
npm test
```

Arquivos de teste:
- `src/app/app.routes.spec.ts`
- `src/app/app.component.spec.ts`
- `src/app/core/services/avaliacao-fisioterapeutica.service.spec.ts`
- `src/app/core/services/avaliacao-postural.service.spec.ts`
- `src/app/core/services/dashboard.service.spec.ts`
- `src/app/core/services/paciente.service.spec.ts`
- `src/app/core/services/plano-tratamento.service.spec.ts`
- `src/app/core/services/profissional.service.spec.ts`
- `src/app/core/services/relatorio.service.spec.ts`
- `src/app/core/services/sessao.service.spec.ts`
- `src/app/core/services/evolucao-sessao.service.spec.ts`
- `src/app/core/services/reavaliacao.service.spec.ts`
- `src/app/pages/pacientes/paciente-list/paciente-list.component.spec.ts`
- `src/app/pages/pacientes/paciente-form/paciente-form.component.spec.ts`
- `src/app/pages/pacientes/paciente-detail/paciente-detail.component.spec.ts`
- `src/app/pages/pacientes/paciente-sessao-list/paciente-sessao-list.component.spec.ts`
- `src/app/pages/pacientes/paciente-sessao-form/paciente-sessao-form.component.spec.ts`
- `src/app/pages/pacientes/paciente-evolucao-sessao/paciente-evolucao-sessao.component.spec.ts`
- `src/app/pages/pacientes/paciente-evolucao-list/paciente-evolucao-list.component.spec.ts`
- `src/app/pages/pacientes/paciente-plano-tratamento-list/paciente-plano-tratamento-list.component.spec.ts`
- `src/app/pages/pacientes/paciente-plano-tratamento-form/paciente-plano-tratamento-form.component.spec.ts`
- `src/app/pages/pacientes/paciente-reavaliacao-list/paciente-reavaliacao-list.component.spec.ts`
- `src/app/pages/pacientes/paciente-reavaliacao-form/paciente-reavaliacao-form.component.spec.ts`
- `src/app/pages/pacientes/paciente-avaliacao-fisioterapeutica/paciente-avaliacao-fisioterapeutica.component.spec.ts`
- `src/app/pages/pacientes/paciente-avaliacao-postural-list/paciente-avaliacao-postural-list.component.spec.ts`
- `src/app/pages/pacientes/paciente-avaliacao-postural-form/paciente-avaliacao-postural-form.component.spec.ts`
- `src/app/pages/pacientes/paciente-avaliacao-postural-editor/paciente-avaliacao-postural-editor.component.spec.ts`
- `src/app/shared/components/simetrografo-editor/simetrografo-editor.component.spec.ts`
- `src/app/shared/components/painel-medidas-posturais/painel-medidas-posturais.component.spec.ts`
- `src/app/shared/utils/simetrografo.spec.ts`
- `src/app/shared/utils/metricas-posturais.spec.ts`
- `src/app/pages/profissionais/profissional-list/profissional-list.component.spec.ts`
- `src/app/pages/profissionais/profissional-form/profissional-form.component.spec.ts`
- `src/app/pages/profissionais/profissional-detail/profissional-detail.component.spec.ts`
- `src/app/pages/planos/plano-form/plano-form.component.spec.ts`
- `src/app/pages/planos/plano-list/plano-list.component.spec.ts`
- `src/app/pages/relatorios/relatorio-list/relatorio-list.component.spec.ts`
- `src/app/pages/relatorios/profissional-pagamento-relatorio/profissional-pagamento-relatorio.component.spec.ts`
- `src/app/pages/relatorios/nfse-relatorio/nfse-relatorio.component.spec.ts`
- `src/app/pages/pacientes/paciente-nfse-emitida-list/paciente-nfse-emitida-list.component.spec.ts`
- `src/app/pages/pacientes/paciente-nfse-emitida-form/paciente-nfse-emitida-form.component.spec.ts`
- `src/app/core/services/nfse-emitida.service.spec.ts`
- `src/app/shared/components/busca-global/busca-global.component.spec.ts`
- `src/app/shared/components/breadcrumb/breadcrumb.component.spec.ts`
- `src/app/shared/utils/api-error.spec.ts`
- `src/app/shared/utils/image-compressor.spec.ts`
- `src/app/shared/services/image-compressor.service.spec.ts`
- `src/app/pages/auth/login/login.component.spec.ts`
- `src/app/pages/auth/forgot-password/forgot-password.component.spec.ts`
- `src/app/pages/auth/reset-password/reset-password.component.spec.ts`
- `src/app/core/services/auth.service.spec.ts`
- `src/app/core/services/style-preferences.service.spec.ts`
- `src/app/core/interceptors/auth.interceptor.spec.ts`
- `src/app/core/interceptors/forbidden.interceptor.spec.ts`
- `src/app/core/services/notificacao.service.spec.ts`
- `src/app/core/guards/auth.guard.spec.ts`
- `src/app/pages/dashboard/dashboard/dashboard.component.spec.ts`
- `src/app/pages/admin/admin-home/admin-home.component.spec.ts`
- `src/app/pages/admin/usuarios/usuario-list/usuario-list.component.spec.ts`
- `src/app/pages/admin/usuarios/usuario-form/usuario-form.component.spec.ts`
- `src/app/pages/perfil/alterar-senha/alterar-senha.component.spec.ts`

---

## Módulos implementados

| Módulo | Descrição |
|--------|-----------|
| **Dashboard** | Tela inicial com resumo consolidado de pacientes, profissionais, pagamentos e aulas do mês atual |
| **Pacientes** | CRUD completo com ativação/inativação, filtros por nome, e-mail, CPF, telefone e status, paginação com tamanho configurável, anamnese clínica, avaliação fisioterapêutica (com aba Postural do Simetrógrafo Virtual: nova análise por vista com upload de foto comprimida e editor de marcação com grade, linha de prumo, marcação guiada, zoom e desfazer), planos de tratamento, sessões de pilates/fisioterapia, evolução clínica da sessão, histórico de evoluções em linha do tempo e reavaliações periódicas |
| **Profissionais** | CRUD completo com ativação/inativação, atualização via PUT, filtros por nome, e-mail, contrato, % por aula e status, e paginação com janela limitada, guarda de limites e sincronização dos metadados retornados pela API; acesso restrito a `ADMIN` |
| **Planos** | Criação de planos (mensal/trimestral/anual) com frequência semanal, seleção de dias e labels centralizados no model |
| **Pagamentos** | Registro e confirmação de pagamentos; geração de aulas é automática no backend |
| **Aulas** | Visualização das aulas geradas com estado de carregamento inicial, e confirmação de presença com vínculo do profissional responsável |
| **Relatórios** | Seção administrativa restrita a `ADMIN`, com relatório de pagamento de profissional por período, relatório de emissão de NFSEs por competência e exportações PDF/XLSX/CSV |
| **Administração** | Seção administrativa restrita a `ADMIN` em `/admin`, com hub inicial e listagem de usuários em `/admin/usuarios` (paginação server-side, criar/editar/inativar/reativar/excluir com confirmação) |
| **Autenticação e Autorização** | Login com JWT via `POST /api/auth/login`, armazenamento centralizado do token e do usuário logado, helpers de perfil, identificação do usuário autenticado na navbar, `authGuard`, `roleGuard`, rota `/403`, interceptors HTTP, logout, tratamento de `401` por token expirado e tratamento global de `403` da API |
| **Busca global** | Campo de busca na navbar (atalhos `/` e `Ctrl`/`Cmd`+`K`) que consulta pacientes por nome ou CPF e, para `ADMIN`, também profissionais por nome, com dropdown navegável por teclado |
| **Troca de senha** | Tela `/perfil/alterar-senha` acessível ao usuário autenticado, com validação local (obrigatoriedade, mínimo de 8 caracteres, confirmação coincidente, nova ≠ atual), toggle de visibilidade por campo, integração com `PUT /api/users/me/senha` e limpeza de sessão com redirecionamento para `/login` após sucesso |
| **Recuperação de senha** | Fluxo público de "Esqueci minha senha" para usuários não autenticados: tela `/esqueci-senha` (solicitação por e-mail com `POST /api/auth/forgot-password` e mensagem genérica única para não expor a existência do e-mail) e tela `/resetar-senha` (redefinição com token da query string via `POST /api/auth/reset-password`, mesmas validações de senha da troca de senha, tratamento de token inválido/expirado/já utilizado e redirecionamento para `/login` após sucesso) |

---

## Rotas

| Caminho                 | Função                                      |
|-------------------------|---------------------------------------------|
| `/`                     | Dashboard inicial com indicadores do sistema |
| `/pacientes`            | Lista de pacientes com filtros e paginação  |
| `/pacientes/novo`       | Formulário de cadastro                      |
| `/pacientes/:id/editar` | Formulário de edição                        |
| `/pacientes/:pacienteId/anamnese` | Cadastro e edição da anamnese do paciente |
| `/pacientes/:pacienteId/avaliacao-fisioterapeutica` | Cadastro e edição da avaliação fisioterapêutica do paciente |
| `/pacientes/:pacienteId/avaliacao-fisioterapeutica/postural` | Listagem das análises posturais da avaliação fisioterapêutica do paciente |
| `/pacientes/:pacienteId/avaliacao-fisioterapeutica/postural/nova` | Nova análise postural: seleção de vista e upload de foto comprimida |
| `/pacientes/:pacienteId/avaliacao-fisioterapeutica/postural/:id/marcar` | Editor de marcação postural (grade, prumo, marcação guiada e zoom) e resultados: medidas calculadas, observações e conclusão |
| `/pacientes/:pacienteId/sessoes` | Lista de sessões de pilates/fisioterapia do paciente |
| `/pacientes/:pacienteId/sessoes/nova` | Cadastro de sessão |
| `/pacientes/:pacienteId/sessoes/:id/editar` | Edição de sessão |
| `/pacientes/:pacienteId/sessoes/:sessaoId/evolucao` | Cadastro e edição da evolução clínica da sessão |
| `/pacientes/:pacienteId/evolucoes` | Histórico de evoluções do paciente em linha do tempo, com gráfico de dor e filtros de período/tipo (somente leitura) |
| `/pacientes/:pacienteId/plano-tratamento` | Lista de planos de tratamento do paciente |
| `/pacientes/:pacienteId/plano-tratamento/novo` | Cadastro de plano de tratamento |
| `/pacientes/:pacienteId/plano-tratamento/:id/editar` | Edição de plano de tratamento |
| `/pacientes/:pacienteId/reavaliacoes` | Lista de reavaliações do paciente |
| `/pacientes/:pacienteId/reavaliacoes/nova` | Cadastro de reavaliação |
| `/pacientes/:pacienteId/reavaliacoes/:id/editar` | Edição de reavaliação |
| `/pacientes/:pacienteId/nfse-emitidas` | Lista de NFSEs emitidas do paciente, com destaque para a última |
| `/pacientes/:pacienteId/nfse-emitidas/nova` | Registro de NFSE emitida |
| `/pacientes/:pacienteId/nfse-emitidas/:id/editar` | Edição de NFSE emitida |
| `/pacientes/:id`        | Detalhes do paciente (ativo ou inativo)     |
| `/profissionais`        | Lista de profissionais com filtros e paginação (`ADMIN`) |
| `/profissionais/novo`   | Formulário de cadastro de profissional (`ADMIN`) |
| `/profissionais/:id`    | Detalhes do profissional (`ADMIN`)         |
| `/profissionais/:id/editar` | Formulário de edição de profissional (`ADMIN`) |
| `/relatorios`           | Seção de relatórios (`ADMIN`)              |
| `/relatorios/pagamento-profissional` | Relatório de pagamento de profissional (`ADMIN`) |
| `/relatorios/nfse` | Relatório de emissão de NFSEs (`ADMIN`) |
| `/admin` | Hub da seção administrativa (`ADMIN`) |
| `/admin/usuarios` | Listagem administrativa de usuários (`ADMIN`) |
| `/admin/usuarios/novo` | Cadastro de usuário (`ADMIN`) |
| `/admin/usuarios/:id/editar` | Edição de usuário (`ADMIN`) |
| `/perfil/alterar-senha` | Troca de senha do usuário autenticado |
| `/login` | Tela de autenticação (pública) |
| `/esqueci-senha` | Solicitação de recuperação de senha por e-mail (pública) |
| `/resetar-senha` | Redefinição de senha a partir do token recebido por e-mail (pública) |
| `/403` | Tela de acesso negado |

Na listagem de pacientes, os filtros enviam os parâmetros `nome`, `email`, `cpf`, `telefone` e `ativo` para a API junto de `page`, `size` e `sort=nome`. O status padrão é **Ativos**. A paginação exibe o intervalo atual, total de pacientes, navegação por página, botões anterior/próxima e seletor de itens por página. Os metadados são lidos da estrutura aninhada `page.page.*` do Spring Boot 3.x, com fallback para o estado atual quando algum atributo está ausente, evitando `NaN` no resumo e seletor vazio. A ação da linha muda conforme o status: **Inativar** para pacientes ativos, **Ativar** para inativos. A tela de detalhe também exibe links de navegação para Planos, Pagamentos, Aulas, Anamnese, Avaliação Fisioterapêutica, Sessões, Histórico de Evoluções, Plano de Tratamento, Reavaliações e NFSEs Emitidas do paciente.

A tela de anamnese do paciente fica em `/pacientes/:pacienteId/anamnese`, valida o identificador numérico antes de chamar a API, carrega a identificação do paciente por `GET /api/pacientes/{id}` e consulta a anamnese existente por `GET /api/anamneses/paciente/{pacienteId}`. Quando a API retorna `404` para a anamnese, o formulário permanece em modo de cadastro e envia `POST /api/anamneses` com `pacienteId`. Quando já existe registro, a tela preenche o formulário e salva alterações via `PUT /api/anamneses/{id}`. Os campos `queixaPrincipal` e `objetivos` são obrigatórios e rejeitam valores apenas com espaços.

A tela de avaliação fisioterapêutica do paciente fica em `/pacientes/:pacienteId/avaliacao-fisioterapeutica`, valida o identificador numérico antes de chamar a API, carrega a identificação do paciente por `GET /api/pacientes/{id}` e consulta as avaliações por `GET /api/avaliacoes-fisioterapeuticas/paciente/{pacienteId}`. O backend retorna uma lista ordenada por data da avaliação e ID em ordem decrescente; a tela edita a avaliação mais recente quando a lista possui itens e permanece em modo de cadastro quando a lista vem vazia. O cadastro envia `POST /api/avaliacoes-fisioterapeuticas` com `pacienteId`; a edição usa `PUT /api/avaliacoes-fisioterapeuticas/{id}`. Os campos `dataAvaliacao`, `queixaFuncional`, `escalaDor` e `diagnosticoFisioterapeutico` são obrigatórios, com `escalaDor` entre 0 e 10 e textos obrigatórios rejeitando valores apenas com espaços.

A aba **Postural** ("Simetrógrafo Virtual") fica em `/pacientes/:pacienteId/avaliacao-fisioterapeutica/postural`, dentro do fluxo da avaliação fisioterapêutica do paciente (não é um cadastro separado). A listagem (`PacienteAvaliacaoPosturalListComponent`) resolve a avaliação fisioterapêutica mais recente do paciente e lista as análises posturais existentes (`GET /api/avaliacoes-posturais/avaliacao-fisioterapeutica/{avaliacaoId}`) com vista, status e data; cada análise com foto oferece **Ver foto**, que baixa a imagem como `Blob` autenticado e exibe via `URL.createObjectURL` — a foto nunca é referenciada por `<img src>` direto para a API. Toda análise oferece **Cancelar análise** (`PATCH /api/avaliacoes-posturais/{id}/cancelar`, com confirmação em `ConfirmarDialogComponent`), que libera a vista para uma nova análise — o caminho de recuperação para uma análise `RASCUNHO` cujo upload de foto falhou e ficaria presa sem essa ação. Em `/postural/nova` (`PacienteAvaliacaoPosturalFormComponent`), a fisioterapeuta escolhe a vista (Frente, Costas, Lado direito ou Lado esquerdo; vistas com análise ativa aparecem desabilitadas com "Já existe análise" — regra de 1 análise por vista, com `409` tratado defensivamente) e envia a foto por arraste, seleção de arquivo ou câmera (`accept="image/*" capture="environment"`). A foto é comprimida no navegador antes do upload (redimensionada a ~1080px no maior lado, JPEG qualidade 0,85, bem abaixo do limite de 2 MB da API) pelo utilitário `shared/utils/image-compressor.ts`, chamado através do `ImageCompressorService` injetável. O botão **Continuar** cria a análise (`POST /api/avaliacoes-posturais`) e envia a foto (`PUT /api/avaliacoes-posturais/{id}/foto`, multipart), retornando à listagem `/postural` em caso de sucesso; falha em qualquer etapa mantém a tela com a mensagem do backend, preservando a análise já criada para reenviar apenas a foto (com um novo arquivo, se necessário — **Remover foto** permanece habilitado) na tentativa seguinte, sem recriá-la. Cada análise com foto abre o **editor de marcação** (Tela 2) em `/pacientes/:pacienteId/avaliacao-fisioterapeutica/postural/:id/marcar` (`PacienteAvaliacaoPosturalEditorComponent`), pela ação **Marcar pontos** (ou **Ver marcação**, quando concluída). A página carrega a análise (`GET /api/avaliacoes-posturais/{id}`) e a foto como `Blob` autenticado, e hospeda o `SimetrografoEditorComponent` (`shared/components/simetrografo-editor/`), reutilizável pela futura tela de resultados. O editor sobrepõe à foto uma **grade quadriculada** com espaçamento ajustável (4 a 24 divisões, quadrados de lado igual nos dois eixos) e a **linha de prumo** vermelha tracejada, arrastável pela alça na base da imagem — restringir o arraste à alça evita que a linha, que cruza a foto inteira, capture toques destinados à marcação. A **marcação é guiada**: o painel lateral mostra o checklist da vista (10 pontos em pares esquerdo/direito na frente/costas; 5 pontos nas laterais) com marcados, próximo e pendentes, e a instrução do ponto atual ("Toque no quadril direito (EIAS) na foto"); um toque na foto marca o ponto indicado, arrastar um ponto já marcado o corrige e **Desfazer** reverte a última ação (marcação, arraste ou ajuste do prumo) por uma pilha de snapshots. Há **zoom** de 1× a 6× pelos botões ou por pinça, com pan por arraste — o gesto vira pan (e não marcação) a partir de 6px de deslocamento, e o deslocamento é limitado para a foto nunca sair da área visível. A foto é dimensionada para caber inteira na dobra (`max-height` descontando o cabeçalho e a barra de ferramentas): como o viewport consome os gestos de toque (`touch-action: none`) para tratar pan e pinça, uma foto que ultrapassasse a tela deixaria partes dela — como a alça do prumo, na base — inalcançáveis em tablet. Zoom e pan são aplicados por `transform` CSS no palco, de modo que o `getBoundingClientRect()` da imagem já os embute e as coordenadas normalizadas permanecem corretas em qualquer aproximação. **Salvar rascunho** faz `PUT /api/avaliacoes-posturais/{id}` com os landmarks parciais, `linhaPrumoX` e `proporcaoImagem` (largura/altura naturais, de que a API precisa para calcular os ângulos) — coordenadas sempre normalizadas de 0 a 1 relativas à imagem natural e arredondadas a 4 casas; as métricas nunca são enviadas, pois a API as recalcula a cada salvamento. Reabrir um rascunho restaura pontos e prumo e retoma do próximo ponto pendente. Análises `CONCLUIDA` abrem em **modo somente leitura**: sem marcar, arrastar, refazer, alça de prumo ou salvar, mantendo apenas zoom, pan e os toggles de grade/prumo. A lógica pura (conversão tela ↔ normalizado, sequência guiada, pilha de desfazer, montagem do payload) fica isolada do DOM em `shared/utils/simetrografo.ts`, com cobertura própria. A mesma página entrega os **resultados da análise** (Tela 3): sobre a foto, cada par de pontos marcados ganha uma **linha de referência** azul, e no painel lateral o `PainelMedidasPosturaisComponent` (`shared/components/painel-medidas-posturais/`) mostra as cinco medidas — inclinação da cabeça, desnível de ombros, quadril e joelhos (em graus, com a direção "dir./esq. baixo") e desvio do prumo —, com pares ainda não marcados exibidos como `—`. Corrigir um ponto recalcula número e linha na hora: a prévia é calculada no cliente por `shared/utils/metricas-posturais.ts`, que **espelha a trigonometria de `MetricasPosturaisCalculator` do backend** (reescala o Δx pela proporção da foto antes do `atan2`, normaliza o ângulo para (-90, 90] e arredonda meio-para-cima nas mesmas escalas). Assim que a marcação é salva, o painel passa a exibir as `metricas` devolvidas pela API, que são a fonte da verdade — o rótulo do painel indica se os números são prévia ou já confirmados. Valores a partir de **2°** aparecem em vermelho e abaixo disso em verde, pelo limiar único `LIMIAR_ASSIMETRIA_GRAUS` (ainda pendente de validação clínica, por isso isolado em constante); as cores vêm dos tokens `--c-danger-text`/`--c-success-text`, criados para uso sobre superfícies elevadas porque `--c-danger`/`--c-success` também servem de fundo (`.btn-danger`) e não podem ser clareadas no tema escuro. O desvio do prumo só aparece em **centímetros** quando a análise tem calibração; sem ela, apenas o valor relativo. O campo **Observações clínicas** é salvo junto com a marcação — sempre como texto, inclusive vazio, porque a API ignora campos nulos e um `null` deixaria a observação anterior gravada depois de apagada na tela. **Concluir análise** só habilita com todos os pontos obrigatórios da vista marcados; faz o `PUT` da marcação atual e então `PATCH /api/avaliacoes-posturais/{id}/concluir`, de modo que o prontuário registre exatamente o que estava na tela — um `422` do backend (pontos incompletos ou sem foto) é exibido via `extrairMensagemErro`, e o sucesso muda o status para `CONCLUIDA`, deixando a tela somente leitura.

A tela de sessões do paciente fica em `/pacientes/:pacienteId/sessoes`, valida o identificador numérico antes de chamar a API, carrega a identificação do paciente por `GET /api/pacientes/{id}` e lista as sessões por `GET /api/sessoes/paciente/{pacienteId}`. O cadastro usa `POST /api/sessoes` com `pacienteId`; a edição usa `GET /api/sessoes/{id}` e `PUT /api/sessoes/{id}`, validando que a sessão retornada pertence ao paciente da rota antes de exibir o formulário. A listagem permite marcar sessões agendadas como realizadas por `PATCH /api/sessoes/{id}/realizar` e cancelar sessões agendadas por `PATCH /api/sessoes/{id}/cancelar`, com confirmação antes da ação. Sessões agendadas também oferecem a ação rápida **Reagendar**, que abre um diálogo com a nova data/hora (obrigatória e futura, pré-preenchida com o horário atual da sessão e com `min` no seletor nativo; quando a sessão está atrasada, o campo já abre com a mensagem de validação visível em vez de apenas desabilitar a confirmação) e envia apenas `dataHora` em `PUT /api/sessoes/{id}`, atualizando a linha da listagem com a resposta da API sem recarregar a lista inteira; erros da API são exibidos com a mensagem devolvida pelo backend (via `extrairMensagemErro`) e mantêm a sessão original. Os campos de tela `dataHora`, `tipo` e `duracao` são obrigatórios; o `SessaoService` traduz esses campos para o contrato da API (`data`, `horario` e `duracaoMinutos`) e converte a resposta de volta para `dataHora` e `duracao` usados pela UI. A duração deve ficar entre 1 e 480 minutos, e o ID opcional do profissional deve ser um inteiro positivo.

A tela de evolução da sessão fica em `/pacientes/:pacienteId/sessoes/:sessaoId/evolucao`, valida os identificadores numéricos, carrega paciente e sessão, confirma que a sessão pertence ao paciente da rota e só então consulta `GET /api/evolucoes-sessao/sessao/{sessaoId}`. Retorno `404` nessa consulta mantém o formulário em modo de cadastro. O cadastro envia `POST /api/evolucoes-sessao` com `sessaoId` e `dataHoraRegistro`; a edição usa `PUT /api/evolucoes-sessao/{id}`. A evolução registra observações do fisioterapeuta, exercícios, equipamentos, cargas/molas, dor antes, dor depois, resposta do paciente, intercorrências e orientações. **Observações do fisioterapeuta** é o primeiro campo depois da data/hora do registro, por ser o mais usado no atendimento, e fica visível sem rolagem ao abrir a tela. `dataHoraRegistro` é obrigatório; `dorAntes` e `dorDepois` devem ficar entre 0 e 10 quando informados.

O **histórico de evoluções** do paciente fica em `/pacientes/:pacienteId/evolucoes` e é a segunda forma de leitura das evoluções: uma linha do tempo somente leitura que reúne todas elas numa única página, sem exigir abrir uma sessão por vez. A tela valida o identificador numérico, carrega a identificação do paciente por `GET /api/pacientes/{id}` e então faz um `forkJoin` de `GET /api/sessoes/paciente/{pacienteId}` e `GET /api/evolucoes-sessao/paciente/{pacienteId}`, cruzando as duas listas no cliente por `sessaoId` — as duas chamadas existem porque o DTO de evolução não traz data/tipo/profissional da sessão, e desnormalizá-lo faria a tela perder de vista as sessões **sem** evolução. A ordem é decrescente por data/hora da sessão. Entram na linha do tempo as sessões com evolução, as sessões `REALIZADA` ainda sem evolução (marcadas como **Sem evolução registrada**, com link para registrar) e, defensivamente, evoluções cuja sessão não veio na listagem. Cada card mostra data/hora, tipo, profissional e a variação `dorAntes → dorDepois` com indicação de melhora/piora; **Observações do fisioterapeuta** aparece sem nenhuma interação (é o campo mais consultado, e o texto preserva as quebras de linha vindas da API) e os demais campos ficam atrás de expandir/recolher, com **Expandir tudo**/**Recolher tudo** no topo da lista. Nenhum `POST`/`PUT` sai desta tela: `/pacientes/:pacienteId/sessoes/:sessaoId/evolucao` continua sendo a única forma de cadastrar e editar evolução, alcançável pelo link **Editar evolução** de cada card. O acesso está no detalhe do paciente e no cabeçalho da listagem de sessões. No topo, uma barra de filtros de data inicial, data final e tipo de sessão recorta o histórico **no cliente**, sobre a coleção já carregada: nenhuma requisição é disparada ao alterar ou limpar filtros, e o recorte vale ao mesmo tempo para a linha do tempo e para o gráfico de evolução da dor exibido acima dela. Data final anterior à inicial exibe erro e não aplica o período; um recorte sem resultados exibe estado vazio com a ação **Limpar filtros**.

> Os cards das listagens de reavaliações, sessões, NFSEs e planos de tratamento usavam `--surface`, `--c-primary` e `--radius-lg`, que **não existem** em `src/styles/_tokens.scss`: o fundo não era pintado, a borda de destaque caía para `currentColor` (uma faixa creme de 4px no tema escuro) e o raio para `0`. Corrigido na issue #213 — todos usam agora `--bg-elev` para a superfície elevada, `--text-brand` para o destaque (é o único token de marca com versão própria no tema escuro) e `--r-lg` para o raio, com guard de `getComputedStyle` nos specs e `npm run lint:tokens` barrando nomes inexistentes na CI. Use os mesmos nomes em card novo.

A tela de reavaliações do paciente fica em `/pacientes/:pacienteId/reavaliacoes`, valida o identificador numérico antes de chamar a API, carrega a identificação do paciente por `GET /api/pacientes/{id}` e lista as reavaliações por `GET /api/reavaliacoes/paciente/{pacienteId}`. O cadastro usa `POST /api/reavaliacoes` com `pacienteId`; a edição usa `GET /api/reavaliacoes/{id}` e `PUT /api/reavaliacoes/{id}`, validando que a reavaliação retornada pertence ao paciente da rota antes de exibir o formulário. O único campo obrigatório é `dataReavaliacao`; os demais campos — `comparativoAvaliacaoAnterior`, `evolucaoDor`, `evolucaoForca`, `evolucaoMobilidade`, `evolucaoFuncional`, `objetivosAlcancados`, `pontosAtencao`, `ajustesPlanoTratamento` e `observacoesGerais` — são opcionais.

A tela de NFSEs emitidas do paciente fica em `/pacientes/:pacienteId/nfse-emitidas`, valida o identificador numérico antes de chamar a API, carrega a identificação do paciente por `GET /api/pacientes/{id}` e lista as notas por `GET /api/nfse-emitidas/paciente/{pacienteId}`. As notas são ordenadas por data de emissão decrescente (com desempate por `id`), com destaque para a última NFSE emitida e estado vazio explícito para pacientes sem registro. O cadastro fica em `/pacientes/:pacienteId/nfse-emitidas/nova` e a edição em `/pacientes/:pacienteId/nfse-emitidas/:id/editar` (cada card da listagem tem ação **Editar**); ambos usam `POST /api/nfse-emitidas` (upsert por paciente/competência) com `pacienteId`, `competencia` (formato `MM/AAAA`) e `dataEmissao` obrigatórios e `numeroNota` (máx. 60), `valor` (≥ 0) e `observacoes` opcionais. Como o backend não expõe busca por ID, o modo de edição localiza a nota na listagem do paciente e pré-preenche o formulário. Como o proxy local e o Nginx removem o primeiro prefixo `/api`, o `NfseEmitidaService` chama `/api/api/nfse-emitidas` para preservar o `/api` esperado pelo backend, seguindo o mesmo padrão do relatório de NFSEs. As mensagens de erro são derivadas do corpo da resposta do backend pelo utilitário `extrairMensagemErro`. Esse dado persistido alimenta o campo "nota anterior emitida" do relatório fiscal de emissão de NFSEs.

A tela de planos de tratamento do paciente fica em `/pacientes/:pacienteId/plano-tratamento`, valida o identificador numérico antes de chamar a API, carrega a identificação do paciente por `GET /api/pacientes/{id}` e lista os planos por `GET /api/planos-tratamento/paciente/{pacienteId}`. O cadastro usa `POST /api/planos-tratamento` com `pacienteId`; a edição usa `GET /api/planos-tratamento/{id}` e `PUT /api/planos-tratamento/{id}`, validando que o plano retornado pertence ao paciente da rota antes de exibir o formulário. A listagem permite encerrar ou suspender planos por `PATCH /api/planos-tratamento/{id}/encerrar` e `PATCH /api/planos-tratamento/{id}/suspender`, com confirmação antes da ação. Os campos `dataInicio`, `objetivosTerapeuticos`, `frequenciaSemanal`, `condutasPropostas` e `exerciciosIndicados` são obrigatórios; a frequência deve ficar entre 1 e 7 e textos obrigatórios rejeitam valores apenas com espaços.

A seção administrativa fica em `/admin`, exige autenticação e perfil `ADMIN` via `roleGuard(['ADMIN'])` e serve como hub inicial para a gestão de usuários e demais configurações administrativas. A partir do hub o administrador acessa a listagem de usuários em `/admin/usuarios`, que consome `GET /api/users` com paginação server-side e exibe nome, e-mail, perfil e status (Ativo/Inativo) em formato tabular. O cabeçalho oferece **+ Novo Usuário** (rota `/admin/usuarios/novo`), que abre um formulário reativo para nome, e-mail, senha obrigatória e perfil carregado de `GET /api/users/roles`; cada linha tem **Editar** (rota `/admin/usuarios/:id/editar`), que carrega `GET /api/users/{id}` e permite alterar nome, e-mail, perfil e opcionalmente a senha, **Inativar** ou **Reativar** (`PATCH /api/users/{id}/inativar` ou `PATCH /api/users/{id}/ativar` conforme o campo `active`) e **Excluir** (`DELETE /api/users/{id}`). O formulário salva com `POST /api/users` no cadastro e `PUT /api/users/{id}` na edição, retornando à listagem após sucesso. Toda ação destrutiva exige confirmação em diálogo modal antes do disparo da requisição, e os botões de inativar/excluir ficam desabilitados para o próprio usuário logado para alinhamento com as regras do backend. A tela exibe estados de carregamento, erro e lista vazia, e recua para a página anterior válida quando o último item de uma página é removido. O link **Administração** aparece na navbar somente quando o usuário logado tem perfil `ADMIN`.

A troca de senha do usuário autenticado fica em `/perfil/alterar-senha`, exige autenticação via `authGuard` e usa um formulário reativo com os campos `senhaAtual`, `novaSenha` e `confirmacaoNovaSenha`. As validações locais cobrem obrigatoriedade, tamanho mínimo de 8 caracteres na nova senha, confirmação coincidente e impedimento de reutilização da senha atual. Cada campo possui toggle de visibilidade (mostrar/ocultar) com `aria-pressed` e `aria-label`. O submit chama `UsuarioAdminService.alterarSenha`, que envia `PUT /api/users/me/senha` com o payload `{ senhaAtual, novaSenha, confirmacaoNovaSenha }`. Erros com código/campo explícito de `senhaAtual` exibem a mensagem específica "Senha atual incorreta." junto ao campo; `401`/`403` sem esse sinal exibem mensagem de autorização/sessão; `400` propaga a mensagem do backend quando disponível; demais erros caem em mensagem genérica. Após sucesso, o componente exibe confirmação, limpa o formulário, chama `AuthService.clearSession()` e redireciona para `/login` para relogin com a nova senha. O link **Alterar senha** fica no menu de conta da navbar, disponível para todo usuário autenticado.

A recuperação de senha para usuários não autenticados é composta por duas telas públicas (sem `authGuard`). A tela **"Esqueci minha senha"** fica em `/esqueci-senha`, é acessível pelo link **Esqueci minha senha** na tela de login e usa um formulário reativo com o campo `email` (mesma validação de e-mail do login). O submit chama `AuthService.forgotPassword(email)`, que envia `POST /api/auth/forgot-password` com `{ email }`. Por design do backend (que sempre retorna `200` para evitar enumeração de usuários), a UI exibe **sempre** a mesma mensagem genérica de sucesso — "Se o e-mail existir em nossa base, você receberá instruções para redefinir sua senha." — independentemente de o e-mail existir; uma resposta `429` exibe mensagem de excesso de tentativas e demais erros caem em mensagem neutra. A tela **"Redefinir senha"** fica em `/resetar-senha`, lê o `token` da query string (ex.: `/resetar-senha?token=...`, alinhado ao `app.email.reset-password-url` do backend) e usa um formulário reativo com `novaSenha` (mínimo de 8 caracteres) e `confirmacaoNovaSenha` (confirmação coincidente), com toggle de visibilidade por campo. O submit chama `AuthService.resetPassword({ token, novaSenha, confirmacaoNovaSenha })`, que envia `POST /api/auth/reset-password`. Token ausente na URL, ou respostas de token inválido/expirado/já utilizado (`404`, `410` ou corpo com `code`/`field` de token), colocam a tela em estado de erro com a ação **Solicitar novo e-mail** apontando para `/esqueci-senha`; `400` com mensagem do backend (ex.: política de senha) é propagado ao usuário e `429` exibe mensagem de excesso de tentativas. Após sucesso, o formulário é limpo e o usuário é redirecionado para `/login?redefinicao=sucesso`, onde a tela de login exibe a confirmação "Senha redefinida com sucesso. Faça login com a nova senha.". Este fluxo depende dos endpoints `POST /api/auth/forgot-password` e `POST /api/auth/reset-password` do backend. Como esses endpoints são públicos e o usuário não está autenticado, o interceptor não anexa `Authorization` nem interfere no tratamento de erro dessas chamadas.

A busca global fica na navbar (`BuscaGlobalComponent`, em `shared/components/busca-global`) e está disponível para todo usuário autenticado. O campo aceita foco por atalho — `/` (quando o foco não está em outro campo de texto) e `Ctrl`/`Cmd`+`K` — e, a partir de 2 caracteres, consulta com debounce de 300 ms os endpoints já existentes com `size=5`: `GET /api/pacientes?nome=` quando o termo tem letras e `GET /api/pacientes?cpf=` quando o termo tem apenas dígitos e pontuação de máscara. O termo é enviado **como digitado**: o filtro `cpf` da API é um `LIKE` sobre o valor gravado, e o cadastro guarda o CPF exatamente como foi preenchido (com ou sem máscara), então normalizar para só dígitos faria `12345678901` deixar de casar com um `123.456.789-01` salvo. Busca parcial de CPF funciona. Para usuários `ADMIN`, a busca também consulta `GET /api/profissionais?nome=`; para os demais perfis essa requisição não é disparada, evitando o `403` do backend. Como nenhum dos filtros envia `ativo`, a API devolve apenas registros ativos — mesmo padrão das listagens. O dropdown de resultados identifica cada item como **Paciente** ou **Profissional**, é navegável por teclado (setas ↑/↓ com `aria-activedescendant`, Enter para abrir o detalhe em `/pacientes/:id` ou `/profissionais/:id`, Esc para fechar) e distingue os estados "Buscando...", "Nenhum resultado encontrado." e falha de rede ("Não foi possível buscar agora."), anunciados por uma live region `aria-live="polite"` fixa no DOM.

A autenticação consome `POST /api/auth/login`, cujo retorno esperado contém `accessToken`, `tokenType` e o objeto `user` com `id`, `name`, `email`, `role` e `active` opcional. O `AuthService` armazena o JWT na chave `accessToken` e o usuário logado na chave `currentUser` do `localStorage`, remove ambos no logout e expõe `getCurrentUser()`, `getCurrentUserRole()`, `isAdmin()` e `hasRole(role)` para consultas centralizadas. O interceptor adiciona `Authorization: Bearer <token>` nas chamadas protegidas, ignora o endpoint público de login e só executa logout (removendo token/usuário e redirecionando para `/login`) quando a resposta `401` indica explicitamente token inválido ou expirado — via `WWW-Authenticate: Bearer error="invalid_token" | "expired_token"` ou corpo com `code` em `{TOKEN_EXPIRED, INVALID_TOKEN, TOKEN_INVALID}`. Demais `401` (rota inexistente, falha pontual do backend) são propagados ao componente sem derrubar a sessão. O `roleGuard` protege rotas por perfil, redireciona sessões inválidas para `/login`, direciona usuários autenticados sem permissão para `/403` e restringe `profissionais` e `relatorios` a `ADMIN`.

A navbar identifica o usuário autenticado num **menu de conta** (`MenuContaComponent`, em `shared/components/menu-conta`), à direita da busca global, em todas as telas protegidas. O gatilho traz um avatar com as iniciais (primeira letra do primeiro e do último nome), o **primeiro nome** e um chevron; o painel abre com o nome completo, o e-mail e o perfil, seguidos de **Alterar senha**, da alternância de tema e de **Sair**. Só o primeiro nome aparece na barra porque exibir o nome inteiro era o que obrigava a truncá-lo com reticências e ainda espremia a navegação (issue #219); entre 1025px e 1199px o nome sai do gatilho e ficam apenas avatar e chevron, com `aria-label="Conta de <nome>"` preservando a identificação. O rótulo do perfil vem do `ROLE_LABEL` exportado por `src/app/core/models/usuario-admin.ts` — derivado de `ROLE_OPTIONS` e compartilhado com a listagem administrativa de usuários, para não haver duas fontes de verdade para "Administrador"/"Usuário". O valor é resolvido uma vez na inicialização do componente e a cada navegação concluída (login e logout sempre navegam), e não na interpolação do template, porque `getCurrentUser()` faz `JSON.parse` + validação a cada chamada e o template reavalia a cada ciclo de detecção de mudanças. Quando há token mas o `currentUser` está ausente ou corrompido no `localStorage`, o menu renderiza normalmente e apenas omite a identificação. O painel é navegável por teclado (setas circulares, `Home`/`End`, `Esc` fechando e devolvendo o foco ao gatilho, `Tab` dispensando) e fecha ao clicar fora; não há focus trap, porque é menu e não diálogo modal. O `Esc` para a propagação de propósito: sem isso ele fecharia junto o painel colapsado da navbar no mobile. Em `≤1024px` o menu vira **lista plana** dentro do painel colapsado, sem gatilho — dropdown ali seria menu dentro de menu —, e nesse modo os atributos `aria-haspopup`/`aria-expanded`/`role="menu"` saem, já que sem gatilho não há o que anunciar como menu; a troca é feita em TypeScript via `matchMedia` justamente porque atributo não se altera por media query. As cores do gatilho são **literais** (`#f0ede8`), e não `--c-cloud-dancer`: esse token é re-tematizado em `[data-theme="dark"]` (`#f0ede8` → `#0e1620`) e sobre o fundo fixo `--c-horizonte` da navbar renderia 2,16:1 no tema escuro, contra 7,20:1 da literal nos dois temas — é a mesma razão pela qual os links do menu usam cores literais. O painel flutuante fica sobre `--bg-elev` e usa tokens normalmente. O `currentUser` é gravado apenas no login, então uma alteração do próprio nome via `/admin` só aparece no login seguinte.

As respostas `403` da API (usuário autenticado, sem permissão para o recurso) são tratadas pelo `forbiddenInterceptor`, registrado após o `authInterceptor` em `app.config.ts`. Ele **nunca** derruba a sessão — token e `currentUser` permanecem no `localStorage` — e só age quando há sessão ativa: nos fluxos públicos (login, "esqueci minha senha", "redefinir senha") um `403` não significa "sem permissão", e sim "sem login", então o erro é propagado para a própria tela tratar, sem banner nem redirecionamento. Um `403` em requisição `GET` (carregamento dos dados de uma tela) leva o usuário para `/403`; um `403` em qualquer outro método (ação pontual, como salvar ou excluir) exibe a mensagem padrão "Acesso negado: você não tem permissão para realizar esta ação." no banner global do `AppComponent`, mantendo o usuário na tela. O banner é alimentado pelo `NotificacaoService` (`core/services/notificacao.service.ts`) e é limpo automaticamente a cada navegação concluída. Telas que já exibem a própria mensagem de `403` (NFSE emitida por paciente e alteração de senha) marcam suas requisições com o `HttpContextToken` `TRATA_403_LOCALMENTE` — `new HttpContext().set(TRATA_403_LOCALMENTE, true)` —, o que desliga o tratamento global para aquela chamada e evita mensagem duplicada ou redirecionamento indesejado.

O dashboard inicial consome `GET /api/dashboard/resumo`, encaminhado pelo proxy para `GET /dashboard/resumo` no backend. A resposta consolida pacientes ativos/inativos, profissionais ativos/inativos, pagamentos pendentes/pagos/vencidos, receita confirmada do mês atual, aulas realizadas/agendadas no mês e o timestamp `geradoEm`. A tela exibe estados de carregamento e erro sem disparar chamadas adicionais para compor os indicadores.

Na listagem de profissionais, a paginação server-side renderiza no máximo 5 botões de página por vez, evitando excesso de elementos no DOM em datasets grandes. A navegação ignora páginas negativas, fora do total retornado pela API ou iguais à página atual, evitando requisições desnecessárias ou fora dos limites. Após cada resposta, a tela sincroniza `currentPage` e `pageSize` com `page.number` e `page.size` retornados pela API, preservando o estado local como fallback quando algum metadado estiver ausente.
Quando o usuário inativa o último item de uma página e o total de páginas é reduzido (ex.: página 16 deixa de existir), a tela retorna automaticamente para a última página válida para evitar listagem vazia.

As rotas que recebem identificadores numéricos validam os parâmetros antes de chamar a API. Apenas inteiros positivos seguros são aceitos; URLs com identificadores ausentes, não numéricos ou em formato inválido exibem a mensagem **Identificador inválido.** e não disparam requisições com `NaN` no caminho.

| Caminho | Função |
|---------|--------|
| `/planos/paciente/:pacienteId` | Lista de planos do paciente |
| `/planos/novo/:pacienteId` | Criar novo plano |
| `/pagamentos/paciente/:pacienteId` | Lista de pagamentos |
| `/pagamentos/novo/:pacienteId` | Registrar novo pagamento |
| `/aulas/paciente/:pacienteId` | Lista de aulas geradas |
| `/aulas/pagamento/:pagamentoId` | Lista de aulas por pagamento |

As telas de planos reutilizam as constantes `TIPO_LABEL`, `FREQUENCIA_LABEL` e `DIAS_SEMANA_LABEL` exportadas por `src/app/core/models/plano.ts`, mantendo as opções e exibições alinhadas entre formulário, listagem e demais fluxos.

A tela de aulas carrega os profissionais ativos e exige a seleção do profissional antes de marcar uma aula pendente como realizada. Ao abrir a rota por pagamento, a tela exibe o estado de carregamento enquanto busca o pagamento inicial para resolver o paciente vinculado e então listar as aulas. A confirmação envia `PATCH /aulas/{id}/realizar?profissionalId={id}`; aulas já realizadas exibem o profissional vinculado quando retornado pela API.

O relatório de pagamento de profissional carrega os profissionais ativos para seleção, exige período inicial e final, valida que a data inicial não seja posterior à final e consulta `GET /profissionais/{id}/relatorio-pagamento?inicio=YYYY-MM-DD&fim=YYYY-MM-DD`. O resultado exibe totais consolidados, resumo por pagamento e detalhamento por aula realizada. A mesma tela exporta o relatório em PDF e Excel/XLSX pelos endpoints `GET /profissionais/{id}/relatorio-pagamento/pdf?inicio=YYYY-MM-DD&fim=YYYY-MM-DD` e `GET /profissionais/{id}/relatorio-pagamento/xlsx?inicio=YYYY-MM-DD&fim=YYYY-MM-DD`, tratando a resposta como `Blob`, usando o nome retornado em `Content-Disposition` quando disponível e bloqueando novos cliques enquanto o arquivo é gerado.

O relatório de emissão de NFSEs exige competência no formato `MM/AAAA`, permite filtrar por nota anterior emitida e consome o endpoint do backend `GET /api/relatorios/nfse?competencia=MM/AAAA`. Como o proxy local e o Nginx removem o primeiro prefixo `/api`, o serviço Angular chama `/api/api/relatorios/nfse` para preservar o `/api` esperado pelo backend. O resultado exibe nome, CPF/CNPJ, valor pago, competência, descrição do serviço, nota anterior emitida, data de pagamento e observações. A tela também exporta CSV e Excel/XLSX pelo mesmo endpoint com o parâmetro `formato=CSV` ou `formato=XLSX`.

---

## Proxy de desenvolvimento

O Angular CLI redireciona `/api/*` → `http://localhost:8080/*` via `proxy.conf.json`, eliminando problemas de CORS em ambiente local.

Em Docker, o proxy equivalente é feito pelo Nginx em `nginx/default.conf.template`, usando a variável `BACKEND_URL`.
