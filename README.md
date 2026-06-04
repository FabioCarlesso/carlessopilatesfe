# Carlesso Pilates — Frontend

Interface web para gestão administrativa de um estúdio de pilates, desenvolvida em **Angular 19**.

## Visão Geral

A aplicação oferece dashboard inicial de indicadores, CRUDs administrativos para pacientes e profissionais, fluxos de planos, pagamentos e aulas, além de relatórios administrativos. Consome uma API REST (Spring Boot) via proxy do Angular CLI.

**Documentação detalhada:** [`docs/documentacao.md`](docs/documentacao.md)  
**Documentação visual em HTML:** [`docs/documentacao.html`](docs/documentacao.html)

**Contexto e decisões técnicas:** [`docs/context.md`](docs/context.md)

---

## Pré-requisitos

- Node.js 18+
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

| Comando         | Descrição                                          |
|-----------------|----------------------------------------------------|
| `npm start`     | Servidor de desenvolvimento em http://localhost:4200 |
| `npm test`      | Executa testes unitários (Karma + Jasmine)         |
| `npm run build` | Build de produção em `dist/carlessopilatesfe`      |
| `npm run watch` | Build contínuo em modo desenvolvimento             |

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
│   ├── interceptors/               # HTTP interceptors (auth)
│   └── guards/                     # Route guards (auth e role)
├── pages/dashboard/                # Tela inicial com indicadores consolidados
├── pages/auth/login/               # Tela de login
├── pages/auth/forbidden/           # Tela 403 de acesso negado
├── pages/pacientes/
│   ├── paciente-list/              # Listagem paginada com filtros
│   ├── paciente-form/              # Cadastro e edição
│   ├── paciente-detail/            # Visualização detalhada
│   ├── paciente-anamnese/          # Cadastro e edição da anamnese
│   ├── paciente-avaliacao-fisioterapeutica/ # Cadastro e edição da avaliação fisioterapêutica
│   ├── paciente-sessao-list/       # Listagem de sessões de pilates/fisioterapia
│   ├── paciente-sessao-form/       # Cadastro e edição de sessão
│   ├── paciente-evolucao-sessao/   # Cadastro e edição da evolução clínica da sessão
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
└── shared/components/              # Componentes reutilizáveis
src/styles/
└── _tokens.scss                    # Tokens do Design System Carlesso
assets/                             # Referências estáticas do Design System
```

---

## Design System

Os arquivos de referência do Design System ficam em `assets/`, incluindo `Fundacao.html`, `Componentes.html`, `Marca.html`, `tokens.css` e os auxiliares React usados pelos protótipos. As páginas usam `DesignCanvas`, `DCSection`, `DCArtboard`, `BrowserWindow`, `Frame` e painel de tweaks próprios.

No Angular, os tokens foram migrados para `src/styles/_tokens.scss` e importados por `src/styles.scss`. O sistema usa `data-theme="light|dark"` e `data-density="default|compact|comfortable"` no `documentElement`, aplicado pelo `StylePreferencesService`.

Componentes globais como botões, inputs, cards, badges, tabelas, paginação, alertas e diálogos consomem tokens semânticos de cor, tipografia, raio, sombra e densidade.

### Tema claro/escuro

O `StylePreferencesService` persiste a preferência de tema e densidade em `localStorage` (chave `carlesso.style-preferences`). No primeiro acesso, sem preferência salva, o tema inicial segue `prefers-color-scheme` do sistema operacional; depois disso a escolha do usuário tem prioridade e permanece após recarregar a página ou reabrir o sistema no mesmo navegador. A navbar e a tela de login expõem o botão **Tema claro/Tema escuro**, permitindo alternar o tema via `StylePreferencesService.toggleTheme()` antes ou depois da autenticação, com `aria-label` e `aria-pressed` para acessibilidade. O dark mode é definido inteiramente pelos tokens em `[data-theme="dark"]` — ao ajustar tokens, mantenha `src/styles/_tokens.scss` e `assets/tokens.css` em sincronia.

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
- `src/app/pages/pacientes/paciente-plano-tratamento-list/paciente-plano-tratamento-list.component.spec.ts`
- `src/app/pages/pacientes/paciente-plano-tratamento-form/paciente-plano-tratamento-form.component.spec.ts`
- `src/app/pages/pacientes/paciente-reavaliacao-list/paciente-reavaliacao-list.component.spec.ts`
- `src/app/pages/pacientes/paciente-reavaliacao-form/paciente-reavaliacao-form.component.spec.ts`
- `src/app/pages/pacientes/paciente-avaliacao-fisioterapeutica/paciente-avaliacao-fisioterapeutica.component.spec.ts`
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
- `src/app/pages/auth/login/login.component.spec.ts`
- `src/app/core/services/auth.service.spec.ts`
- `src/app/core/services/style-preferences.service.spec.ts`
- `src/app/core/interceptors/auth.interceptor.spec.ts`
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
| **Pacientes** | CRUD completo com ativação/inativação, filtros por nome, e-mail, CPF, telefone e status, paginação com tamanho configurável, anamnese clínica, avaliação fisioterapêutica, planos de tratamento, sessões de pilates/fisioterapia, evolução clínica da sessão e reavaliações periódicas |
| **Profissionais** | CRUD completo com ativação/inativação, atualização via PUT e paginação com janela limitada, guarda de limites e sincronização dos metadados retornados pela API; acesso restrito a `ADMIN` |
| **Planos** | Criação de planos (mensal/trimestral/anual) com frequência semanal, seleção de dias e labels centralizados no model |
| **Pagamentos** | Registro e confirmação de pagamentos; geração de aulas é automática no backend |
| **Aulas** | Visualização das aulas geradas com estado de carregamento inicial, e confirmação de presença com vínculo do profissional responsável |
| **Relatórios** | Seção administrativa restrita a `ADMIN`, com relatório de pagamento de profissional por período, relatório de emissão de NFSEs por competência e exportações PDF/XLSX/CSV |
| **Administração** | Seção administrativa restrita a `ADMIN` em `/admin`, com hub inicial e listagem de usuários em `/admin/usuarios` (paginação server-side, criar/editar/inativar/reativar/excluir com confirmação) |
| **Autenticação e Autorização** | Login com JWT via `POST /api/auth/login`, armazenamento centralizado do token e do usuário logado, helpers de perfil, `authGuard`, `roleGuard`, rota `/403`, interceptor HTTP, logout e tratamento de `401` por token expirado |
| **Troca de senha** | Tela `/perfil/alterar-senha` acessível ao usuário autenticado, com validação local (obrigatoriedade, mínimo de 8 caracteres, confirmação coincidente, nova ≠ atual), toggle de visibilidade por campo, integração com `PUT /api/users/me/senha` e limpeza de sessão com redirecionamento para `/login` após sucesso |

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
| `/pacientes/:pacienteId/sessoes` | Lista de sessões de pilates/fisioterapia do paciente |
| `/pacientes/:pacienteId/sessoes/nova` | Cadastro de sessão |
| `/pacientes/:pacienteId/sessoes/:id/editar` | Edição de sessão |
| `/pacientes/:pacienteId/sessoes/:sessaoId/evolucao` | Cadastro e edição da evolução clínica da sessão |
| `/pacientes/:pacienteId/plano-tratamento` | Lista de planos de tratamento do paciente |
| `/pacientes/:pacienteId/plano-tratamento/novo` | Cadastro de plano de tratamento |
| `/pacientes/:pacienteId/plano-tratamento/:id/editar` | Edição de plano de tratamento |
| `/pacientes/:pacienteId/reavaliacoes` | Lista de reavaliações do paciente |
| `/pacientes/:pacienteId/reavaliacoes/nova` | Cadastro de reavaliação |
| `/pacientes/:pacienteId/reavaliacoes/:id/editar` | Edição de reavaliação |
| `/pacientes/:pacienteId/nfse-emitidas` | Lista de NFSEs emitidas do paciente, com destaque para a última |
| `/pacientes/:pacienteId/nfse-emitidas/nova` | Registro/atualização de NFSE emitida |
| `/pacientes/:id`        | Detalhes do paciente (ativo ou inativo)     |
| `/profissionais`        | Lista de profissionais ativos (paginada, `ADMIN`) |
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
| `/403` | Tela de acesso negado |

Na listagem de pacientes, os filtros enviam os parâmetros `nome`, `email`, `cpf`, `telefone` e `ativo` para a API junto de `page`, `size` e `sort=nome`. O status padrão é **Ativos**. A paginação exibe o intervalo atual, total de pacientes, navegação por página, botões anterior/próxima e seletor de itens por página. Os metadados são lidos da estrutura aninhada `page.page.*` do Spring Boot 3.x, com fallback para o estado atual quando algum atributo está ausente, evitando `NaN` no resumo e seletor vazio. A ação da linha muda conforme o status: **Inativar** para pacientes ativos, **Ativar** para inativos. A tela de detalhe também exibe links de navegação para Planos, Pagamentos, Aulas, Anamnese, Avaliação Fisioterapêutica, Sessões, Plano de Tratamento, Reavaliações e NFSEs Emitidas do paciente.

A tela de anamnese do paciente fica em `/pacientes/:pacienteId/anamnese`, valida o identificador numérico antes de chamar a API, carrega a identificação do paciente por `GET /api/pacientes/{id}` e consulta a anamnese existente por `GET /api/anamneses/paciente/{pacienteId}`. Quando a API retorna `404` para a anamnese, o formulário permanece em modo de cadastro e envia `POST /api/anamneses` com `pacienteId`. Quando já existe registro, a tela preenche o formulário e salva alterações via `PUT /api/anamneses/{id}`. Os campos `queixaPrincipal` e `objetivos` são obrigatórios e rejeitam valores apenas com espaços.

A tela de avaliação fisioterapêutica do paciente fica em `/pacientes/:pacienteId/avaliacao-fisioterapeutica`, valida o identificador numérico antes de chamar a API, carrega a identificação do paciente por `GET /api/pacientes/{id}` e consulta as avaliações por `GET /api/avaliacoes-fisioterapeuticas/paciente/{pacienteId}`. O backend retorna uma lista ordenada por data da avaliação e ID em ordem decrescente; a tela edita a avaliação mais recente quando a lista possui itens e permanece em modo de cadastro quando a lista vem vazia. O cadastro envia `POST /api/avaliacoes-fisioterapeuticas` com `pacienteId`; a edição usa `PUT /api/avaliacoes-fisioterapeuticas/{id}`. Os campos `dataAvaliacao`, `queixaFuncional`, `escalaDor` e `diagnosticoFisioterapeutico` são obrigatórios, com `escalaDor` entre 0 e 10 e textos obrigatórios rejeitando valores apenas com espaços.

A tela de sessões do paciente fica em `/pacientes/:pacienteId/sessoes`, valida o identificador numérico antes de chamar a API, carrega a identificação do paciente por `GET /api/pacientes/{id}` e lista as sessões por `GET /api/sessoes/paciente/{pacienteId}`. O cadastro usa `POST /api/sessoes` com `pacienteId`; a edição usa `GET /api/sessoes/{id}` e `PUT /api/sessoes/{id}`, validando que a sessão retornada pertence ao paciente da rota antes de exibir o formulário. A listagem permite marcar sessões agendadas como realizadas por `PATCH /api/sessoes/{id}/realizar` e cancelar sessões agendadas por `PATCH /api/sessoes/{id}/cancelar`, com confirmação antes da ação. Os campos de tela `dataHora`, `tipo` e `duracao` são obrigatórios; o `SessaoService` traduz esses campos para o contrato da API (`data`, `horario` e `duracaoMinutos`) e converte a resposta de volta para `dataHora` e `duracao` usados pela UI. A duração deve ficar entre 1 e 480 minutos, e o ID opcional do profissional deve ser um inteiro positivo.

A tela de evolução da sessão fica em `/pacientes/:pacienteId/sessoes/:sessaoId/evolucao`, valida os identificadores numéricos, carrega paciente e sessão, confirma que a sessão pertence ao paciente da rota e só então consulta `GET /api/evolucoes-sessao/sessao/{sessaoId}`. Retorno `404` nessa consulta mantém o formulário em modo de cadastro. O cadastro envia `POST /api/evolucoes-sessao` com `sessaoId` e `dataHoraRegistro`; a edição usa `PUT /api/evolucoes-sessao/{id}`. A evolução registra exercícios, equipamentos, cargas/molas, dor antes, dor depois, resposta do paciente, intercorrências, orientações e observações do fisioterapeuta. `dataHoraRegistro` é obrigatório; `dorAntes` e `dorDepois` devem ficar entre 0 e 10 quando informados.

A tela de reavaliações do paciente fica em `/pacientes/:pacienteId/reavaliacoes`, valida o identificador numérico antes de chamar a API, carrega a identificação do paciente por `GET /api/pacientes/{id}` e lista as reavaliações por `GET /api/reavaliacoes/paciente/{pacienteId}`. O cadastro usa `POST /api/reavaliacoes` com `pacienteId`; a edição usa `GET /api/reavaliacoes/{id}` e `PUT /api/reavaliacoes/{id}`, validando que a reavaliação retornada pertence ao paciente da rota antes de exibir o formulário. O único campo obrigatório é `dataReavaliacao`; os demais campos — `comparativoAvaliacaoAnterior`, `evolucaoDor`, `evolucaoForca`, `evolucaoMobilidade`, `evolucaoFuncional`, `objetivosAlcancados`, `pontosAtencao`, `ajustesPlanoTratamento` e `observacoesGerais` — são opcionais.

A tela de NFSEs emitidas do paciente fica em `/pacientes/:pacienteId/nfse-emitidas`, valida o identificador numérico antes de chamar a API, carrega a identificação do paciente por `GET /api/pacientes/{id}` e lista as notas por `GET /api/nfse-emitidas/paciente/{pacienteId}`. As notas são ordenadas por data de emissão decrescente, com destaque para a última NFSE emitida e estado vazio explícito para pacientes sem registro. O cadastro/atualização fica em `/pacientes/:pacienteId/nfse-emitidas/nova` e usa `POST /api/nfse-emitidas` com `pacienteId`, `competencia` (formato `MM/AAAA`) e `dataEmissao` obrigatórios e `numeroNota` (máx. 60), `valor` (≥ 0) e `observacoes` opcionais. Como o proxy local e o Nginx removem o primeiro prefixo `/api`, o `NfseEmitidaService` chama `/api/api/nfse-emitidas` para preservar o `/api` esperado pelo backend, seguindo o mesmo padrão do relatório de NFSEs. Esse dado persistido alimenta o campo "nota anterior emitida" do relatório fiscal de emissão de NFSEs.

A tela de planos de tratamento do paciente fica em `/pacientes/:pacienteId/plano-tratamento`, valida o identificador numérico antes de chamar a API, carrega a identificação do paciente por `GET /api/pacientes/{id}` e lista os planos por `GET /api/planos-tratamento/paciente/{pacienteId}`. O cadastro usa `POST /api/planos-tratamento` com `pacienteId`; a edição usa `GET /api/planos-tratamento/{id}` e `PUT /api/planos-tratamento/{id}`, validando que o plano retornado pertence ao paciente da rota antes de exibir o formulário. A listagem permite encerrar ou suspender planos por `PATCH /api/planos-tratamento/{id}/encerrar` e `PATCH /api/planos-tratamento/{id}/suspender`, com confirmação antes da ação. Os campos `dataInicio`, `objetivosTerapeuticos`, `frequenciaSemanal`, `condutasPropostas` e `exerciciosIndicados` são obrigatórios; a frequência deve ficar entre 1 e 7 e textos obrigatórios rejeitam valores apenas com espaços.

A seção administrativa fica em `/admin`, exige autenticação e perfil `ADMIN` via `roleGuard(['ADMIN'])` e serve como hub inicial para a gestão de usuários e demais configurações administrativas. A partir do hub o administrador acessa a listagem de usuários em `/admin/usuarios`, que consome `GET /api/users` com paginação server-side e exibe nome, e-mail, perfil e status (Ativo/Inativo) em formato tabular. O cabeçalho oferece **+ Novo Usuário** (rota `/admin/usuarios/novo`), que abre um formulário reativo para nome, e-mail, senha obrigatória e perfil carregado de `GET /api/users/roles`; cada linha tem **Editar** (rota `/admin/usuarios/:id/editar`), que carrega `GET /api/users/{id}` e permite alterar nome, e-mail, perfil e opcionalmente a senha, **Inativar** ou **Reativar** (`PATCH /api/users/{id}/inativar` ou `PATCH /api/users/{id}/ativar` conforme o campo `active`) e **Excluir** (`DELETE /api/users/{id}`). O formulário salva com `POST /api/users` no cadastro e `PUT /api/users/{id}` na edição, retornando à listagem após sucesso. Toda ação destrutiva exige confirmação em diálogo modal antes do disparo da requisição, e os botões de inativar/excluir ficam desabilitados para o próprio usuário logado para alinhamento com as regras do backend. A tela exibe estados de carregamento, erro e lista vazia, e recua para a página anterior válida quando o último item de uma página é removido. O link **Administração** aparece na navbar somente quando o usuário logado tem perfil `ADMIN`.

A troca de senha do usuário autenticado fica em `/perfil/alterar-senha`, exige autenticação via `authGuard` e usa um formulário reativo com os campos `senhaAtual`, `novaSenha` e `confirmacaoNovaSenha`. As validações locais cobrem obrigatoriedade, tamanho mínimo de 8 caracteres na nova senha, confirmação coincidente e impedimento de reutilização da senha atual. Cada campo possui toggle de visibilidade (mostrar/ocultar) com `aria-pressed` e `aria-label`. O submit chama `UsuarioAdminService.alterarSenha`, que envia `PUT /api/users/me/senha` com o payload `{ senhaAtual, novaSenha, confirmacaoNovaSenha }`. Erros com código/campo explícito de `senhaAtual` exibem a mensagem específica "Senha atual incorreta." junto ao campo; `401`/`403` sem esse sinal exibem mensagem de autorização/sessão; `400` propaga a mensagem do backend quando disponível; demais erros caem em mensagem genérica. Após sucesso, o componente exibe confirmação, limpa o formulário, chama `AuthService.clearSession()` e redireciona para `/login` para relogin com a nova senha. A navbar exibe o link **Alterar senha** para todo usuário autenticado.

A autenticação consome `POST /api/auth/login`, cujo retorno esperado contém `accessToken`, `tokenType` e o objeto `user` com `id`, `name`, `email`, `role` e `active` opcional. O `AuthService` armazena o JWT na chave `accessToken` e o usuário logado na chave `currentUser` do `localStorage`, remove ambos no logout e expõe `getCurrentUser()`, `getCurrentUserRole()`, `isAdmin()` e `hasRole(role)` para consultas centralizadas. O interceptor adiciona `Authorization: Bearer <token>` nas chamadas protegidas, ignora o endpoint público de login e só executa logout (removendo token/usuário e redirecionando para `/login`) quando a resposta `401` indica explicitamente token inválido ou expirado — via `WWW-Authenticate: Bearer error="invalid_token" | "expired_token"` ou corpo com `code` em `{TOKEN_EXPIRED, INVALID_TOKEN, TOKEN_INVALID}`. Demais `401` (rota inexistente, falha pontual do backend) são propagados ao componente sem derrubar a sessão. O `roleGuard` protege rotas por perfil, redireciona sessões inválidas para `/login`, direciona usuários autenticados sem permissão para `/403` e restringe `profissionais` e `relatorios` a `ADMIN`.

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
