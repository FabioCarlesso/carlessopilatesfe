# Contexto do Projeto — Carlesso Pilates Frontend

## O que é este projeto

O **Carlesso Pilates Frontend** é uma aplicação web Angular desenvolvida para apoiar a gestão administrativa de um estúdio de pilates. O sistema centraliza o cadastro e controle de pacientes, servindo como ponto de partida para um sistema mais amplo de gestão do estúdio.

A aplicação consome uma API REST que roda localmente em `http://localhost:8080`, construída separadamente (backend Spring Boot, presumidamente). Durante o desenvolvimento, todas as chamadas passam por um proxy do Angular CLI (`/api/*` → `localhost:8080/*`) para contornar restrições de CORS.

---

## Estado Atual (Abril 2026)

O projeto está em fase inicial de desenvolvimento (**MVP**). Commits realizados:

1. Setup inicial do projeto Angular 19
2. Implementação do módulo de pacientes (listagem, formulário, detalhe)
3. Adição da pasta `/docs` com documentação do projeto
4. Correção de CORS via proxy do Angular CLI
5. Implementação de testes unitários e atualização da documentação
6. Alinhamento com API v2: PATCH ativar/inativar, e-mail mutável no PUT
7. Implementação dos módulos de Planos, Pagamentos e Aulas
8. Dockerização do frontend com build Angular multi-stage e Nginx
9. Correção da atualização de profissionais para `PUT /profissionais/{id}`
10. Implementação de filtros na listagem de pacientes por nome, e-mail, CPF, telefone e status
11. Implementação de paginação completa na consulta de pacientes, com resumo de registros, tamanho de página configurável e navegação anterior/próxima
12. Correção da paginação de profissionais para renderizar uma janela máxima de 5 botões de página
13. Validação de parâmetros numéricos de rota para evitar chamadas à API com `NaN`
14. Correção da paginação de pacientes contra resposta aninhada do Spring Boot 3.x (`page.page.*`), com fallback nos metadados para evitar `NaN` no resumo e seletor de tamanho de página em branco
15. Correção da navegação de páginas na listagem de profissionais para ignorar páginas negativas, fora do total retornado ou iguais à página atual
16. Implementação da confirmação de aula realizada com seleção e vínculo do profissional responsável
17. Criação da seção de relatórios e do relatório de pagamento de profissional por período
18. Adição da exportação do relatório de pagamento de profissional em PDF e Excel/XLSX
19. Implementação de autenticação JWT: tela de login, AuthService, AuthInterceptor, AuthGuard, logout na navbar e redirecionamento para login em `401` por token expirado
20. Implementação do relatório de emissão de NFSEs por competência, com filtro de nota anterior emitida e exportação CSV/XLSX
21. Correção da listagem de profissionais para voltar automaticamente à última página válida após inativar o último item de uma página removida pela nova paginação
22. Parametrização visual a partir do Design System Carlesso: inclusão dos protótipos em `assets/`, migração dos tokens para `src/styles/_tokens.scss`, suporte a tema claro/escuro via `data-theme` e densidade via `data-density`
23. Correção da listagem de profissionais para sincronizar `currentPage` e `pageSize` com os metadados retornados pela API (`page.number` e `page.size`)
24. Correção do formulário de planos para reutilizar as constantes de labels exportadas pelo model de planos
25. Correção da listagem de aulas por pagamento para exibir estado de carregamento já durante a busca inicial do pagamento
26. Implementação do dashboard inicial com indicadores consolidados de pacientes, profissionais, pagamentos e aulas
27. Refactor: substituição do `CommonModule` por imports individuais (`NgIf`, `NgFor`, `NgClass`, `DatePipe`, `CurrencyPipe`) em todos os componentes standalone
28. Refactor: reorganização da ordem das rotas em `app.routes.ts` — `pacientes/:id` reagrupada junto às demais rotas de pacientes (após `pacientes/:id/editar`), com adição de testes unitários para verificar o agrupamento e a precedência das rotas estáticas
29. Implementação da tela de Anamnese do paciente, com formulário reativo vinculado a `/pacientes/:pacienteId/anamnese`, criação/edição via `AnamneseService` e link de acesso no detalhe do paciente
30. Implementação da tela de Avaliação Fisioterapêutica do paciente, com formulário reativo vinculado a `/pacientes/:pacienteId/avaliacao-fisioterapeutica`, criação/edição via `AvaliacaoFisioterapeuticaService` e link de acesso no detalhe do paciente
31. Implementação do módulo de Plano de Tratamento do paciente, com listagem por paciente, formulário de criação/edição, ações de encerrar/suspender com confirmação e link de acesso no detalhe do paciente
32. Implementação do módulo de Sessões de Pilates/Fisioterapia do paciente, com listagem por paciente, formulário de criação/edição, ações de realizar/cancelar com confirmação e link de acesso no detalhe do paciente
33. Implementação do módulo de Evolução de Sessão no prontuário do paciente, com formulário de criação/edição vinculado a cada sessão por `/pacientes/:pacienteId/sessoes/:sessaoId/evolucao`, botão de acesso na listagem de sessões e integração com `EvolucaoSessaoService`
34. Implementação do módulo de Reavaliações do paciente, com listagem por paciente, formulário de criação/edição e link de acesso no detalhe do paciente, integrado com `ReavaliacaoService`
35. Ajuste do `AuthService` para armazenar os dados do usuário retornados no login (`id`, `name`, `email`, `role`, `active`) em `localStorage` via chave `currentUser`, com métodos `getCurrentUser()`, `getCurrentUserRole()`, `isAdmin()` e `hasRole()` para recuperação centralizada e limpeza automática no logout
36. Implementação do guard de autorização por role: `roleGuard` (factory function) em `core/guards/role.guard.ts` que bloqueia o acesso com base no perfil do usuário logado; usuário não autenticado ou com sessão local inválida é redirecionado para `/login`, usuário autenticado sem o perfil exigido é redirecionado para `/403`. A tela `ForbiddenComponent` exibe código 403, mensagem orientativa e duas ações: link primário **Ir para o início** (`/`) e botão secundário **Voltar** (`Location.back()` com fallback para `/` quando não há histórico do navegador). As rotas de `profissionais` e `relatorios` passam a exigir perfil `ADMIN`, e os links administrativos da navbar/dashboard são exibidos apenas para administradores
37. Implementação da seção administrativa do frontend em `pages/admin/`: rota base `/admin` com `AdminHomeComponent` (hub) e rotas para gestão de usuários (`/admin/usuarios`, `/admin/usuarios/novo`, `/admin/usuarios/:id/editar`), todas protegidas por `roleGuard(['ADMIN'])`. Link **Administração** adicionado à navbar, exibido apenas para `ADMIN`. Componentes seguem o padrão standalone do projeto e cobrem testes unitários para renderização, listagem, formulário reativo de criação/edição de usuário e validação do parâmetro de rota
38. Criação do `UsuarioAdminService` em `core/services/usuario-admin.service.ts` com métodos tipados para consumir os endpoints administrativos de usuários (`GET /api/users`, `GET /api/users/{id}`, `GET /api/users/me`, `POST /api/users`, `PUT /api/users/{id}`, `DELETE /api/users/{id}`, `PATCH /api/users/{id}/ativar`, `PATCH /api/users/{id}/inativar`, `GET /api/users/roles`). Models definidos em `core/models/usuario-admin.ts` (`UsuarioAdminResponseDTO`, `UsuarioAdminCreateRequestDTO`, `UsuarioAdminUpdateRequestDTO`, `RoleOption`, `ROLE_OPTIONS`, `UsuarioAdminPage`) reutilizando `UserRole` de `auth.ts` e `Page<T>` de `paciente.ts`. Cobertura de 11 testes unitários validando cada chamada HTTP esperada
39. Implementação da listagem administrativa de usuários em `/admin/usuarios` (`UsuarioListComponent`): consome `UsuarioAdminService.listar` com paginação server-side e janela de até 5 botões visíveis, exibe tabela com nome, e-mail, perfil (`ROLE_OPTIONS` como label) e status (Ativo/Inativo) e oferece estados de carregamento, erro e lista vazia. Cabeçalho da tela traz botão **+ Novo Usuário** ligando para `/admin/usuarios/novo` e cada linha expõe ações **Editar** (rota `/admin/usuarios/:id/editar`), **Inativar** ou **Reativar** (conforme `active`) e **Excluir**. Toda ação destrutiva (inativar, reativar, excluir) é confirmada em diálogo modal antes do disparo da requisição, e os botões de inativar/excluir são desativados para o próprio usuário logado, alinhados às regras do backend. A listagem recua automaticamente para a página anterior quando o último item da página atual é removido
40. Implementação do formulário administrativo de usuários em `/admin/usuarios/novo` e `/admin/usuarios/:id/editar` (`UsuarioFormComponent`): usa Reactive Forms com campos `name`, `email`, `password` e `role`, valida nome mínimo, e-mail, senha obrigatória no cadastro e opcional na edição, carrega opções de perfil por `GET /api/users/roles` com fallback para `ROLE_OPTIONS`, busca dados para edição com `GET /api/users/{id}`, salva com `POST /api/users` ou `PUT /api/users/{id}` e retorna para `/admin/usuarios` após sucesso. A tela mantém estados de carregamento, erro, salvamento e identificador inválido, seguindo os estilos globais de formulário e botões.
41. Correção do `authInterceptor` para evitar logout indevido em respostas `401` que não indicam token inválido/expirado. A partir desta mudança o interceptor só dispara `authService.logout()` quando há sessão ativa e a resposta `401` traz indicação explícita de credencial inválida — ou via cabeçalho `WWW-Authenticate: Bearer error="invalid_token" | "expired_token"`, ou via corpo com `code` em `{TOKEN_EXPIRED, INVALID_TOKEN, TOKEN_INVALID}`. Demais `401` (rota inexistente, falha pontual do backend) são propagados ao componente, preservando a sessão do usuário, enquanto o fluxo de token expirado real continua redirecionando para `/login`.
42. Implementação do dark mode com base nos tokens do Design System: o `StylePreferencesService` passa a persistir a preferência de tema e densidade em `localStorage` (chave `carlesso.style-preferences`), carregar a preferência salva no startup e, na ausência dela, usar `prefers-color-scheme` como fallback — sem persistir o valor resolvido pelo fallback, para que a preferência do sistema continue valendo até o usuário escolher explicitamente. O serviço ganha o método `toggleTheme()`, e `setTheme`/`setDensity`/`apply` passam a gravar em `localStorage`. A navbar do `AppComponent` ganha o botão **Tema claro/Tema escuro** (`.btn-tema`), com `aria-label` e `aria-pressed`, que alterna o tema pela interface. O dark mode reutiliza integralmente os tokens já definidos em `[data-theme="dark"]` (`src/styles/_tokens.scss` e `assets/tokens.css`), sem paleta paralela.
43. Implementação da troca de senha do usuário autenticado (`AlterarSenhaComponent`) em `/perfil/alterar-senha`, protegida por `authGuard`: formulário reativo com `senhaAtual`, `novaSenha` e `confirmacaoNovaSenha`, validação local de obrigatoriedade, tamanho mínimo de 8 caracteres na nova senha, confirmação coincidente, nova senha diferente da atual e toggle de visibilidade por campo (`aria-pressed`/`aria-label`). O submit chama `UsuarioAdminService.alterarSenha` (`PUT /api/users/me/senha`); erros com código/campo explícito de `senhaAtual` mapeiam para "Senha atual incorreta." junto ao campo, `401`/`403` sem esse sinal exibem mensagem de autorização/sessão, `400` propaga a mensagem do backend quando disponível, e demais erros caem em mensagem genérica. Após sucesso, a tela exibe confirmação, limpa o formulário, chama `AuthService.clearSession()` e redireciona para `/login`. A navbar exibe o link **Alterar senha** para todo usuário autenticado. Cobertura inclui teste de service (`PUT /api/users/me/senha` com payload esperado) e testes de componente (validações, toggle, sucesso/erros, double-submit).
44. Implementação do consumo da persistência de NFSE emitida por paciente (backend issue #38). Novos models `NotaFiscalEmitidaRequestDTO`/`NotaFiscalEmitidaResponseDTO` em `core/models/nfse-emitida.ts` e o `NfseEmitidaService` (`core/services/nfse-emitida.service.ts`) com `listarPorPaciente` (`GET /api/api/nfse-emitidas/paciente/{pacienteId}`) e `salvar` (`POST /api/api/nfse-emitidas`) — o duplo prefixo `/api/api` segue o mesmo padrão do `RelatorioService`, pois o backend expõe o recurso em `/api/nfse-emitidas` e o proxy/Nginx remove o primeiro `/api`. A tela `/pacientes/:pacienteId/nfse-emitidas` (`PacienteNfseEmitidaListComponent`) lista as notas do paciente ordenadas por data de emissão decrescente, destaca a última NFSE emitida, trata estados de carregamento/erro e exibe estado vazio para pacientes sem nota. As telas `/pacientes/:pacienteId/nfse-emitidas/nova` e `/pacientes/:pacienteId/nfse-emitidas/:id/editar` (`PacienteNfseEmitidaFormComponent`) registram/atualizam uma NFSE com `competencia` (obrigatória, formato `MM/AAAA`) e `dataEmissao` (obrigatória) e os opcionais `numeroNota` (máx. 60), `valor` (≥ 0) e `observacoes`, sanitizando campos vazios para `null` antes do `POST`; o modo de edição pré-preenche a nota localizada na listagem do paciente. A tela de detalhe do paciente ganhou o card **NFSEs Emitidas**. As mensagens de erro são derivadas do corpo do backend via `extrairMensagemErro` (`shared/utils/api-error.ts`). O relatório fiscal de emissão de NFSEs passa a refletir o campo `notaAnteriorEmitida` com base no dado persistido pelo backend, mantendo o contrato e o fluxo atuais da tela inalterados. Cobertura inclui teste do utilitário de erro, do service (`GET`/`POST` com payloads esperados), de listagem (ordenação com desempate por `id`, última nota, estado vazio, erros, identificador inválido) e de formulário (validações, sanitização, modo de edição, navegação e erros).
45. Performance (issue #25): adoção de `ChangeDetectionStrategy.OnPush` nos componentes de listagem `PacienteListComponent`, `ProfissionalListComponent`, `PlanoListComponent`, `PagamentoListComponent` e `AulaListComponent`, alinhando-os ao padrão já usado no `DashboardComponent`. Com a estratégia padrão (`Default`) o Angular roda change detection em todos os componentes a cada evento do browser; com `OnPush` o componente só é verificado quando uma referência de `@Input` muda, quando emite um evento ou quando é marcado explicitamente. Cada componente passou a injetar `ChangeDetectorRef` e a chamar `cdr.markForCheck()` ao final de cada atualização assíncrona de estado (callbacks `next`/`error` das assinaturas de `carregar`, `inativar`, `ativar`, `confirmarPagar`, `realizar`, `carregarProfissionais` e resolução do pagamento na rota de aulas), garantindo que a UI continue refletindo o estado após chamadas à API. Como complemento direto do `OnPush`, as tabelas de cada listagem ganharam `trackBy` (`trackByPaciente`, `trackByProfissional`, `trackByPlano`, `trackByPagamento`, `trackByAula`, todas por `id`), evitando que o Angular destrua e recrie todas as `<tr>` a cada recarga — já que `carregar()` reatribui o array de itens com uma nova referência. As assinaturas HTTP passaram a usar `takeUntilDestroyed(this.destroyRef)`, espelhando integralmente o padrão do `DashboardComponent`. Cobertura adicional valida que cada listagem usa `OnPush` (via o helper de teste `isOnPush`, em `src/testing/onpush.ts`, que isola num único ponto o acesso à API interna `ɵcmp`) e que `markForCheck` é disparado após o carregamento da lista.

46. Correção de UI (issue #90): impedir a quebra de linha dos textos de status `ATIVO`/`INATIVO` (e demais badges) em listagens onde o nome ou campos próximos ocupam mais de uma linha. As células de tabela usam `overflow-wrap: anywhere`, o que permitia que rótulos curtos como `Inativo` quebrassem em colunas estreitas. A correção adiciona `white-space: nowrap` à regra base compartilhada de badges (`.badge`, `.badge-status`, `.status-badge` em `src/styles.scss`), cobrindo as listagens de planos, pagamentos, aulas, sessões e planos de tratamento e as telas de detalhe de pacientes e profissionais (a listagem de profissionais não exibe status), e também às regras de status com escopo de componente (`.status-badge` em `paciente-list.component.scss` e `.status` em `usuario-list.component.scss`). O ajuste é puramente de CSS, preserva o comportamento responsivo das telas e mantém os nomes longos livres para quebrar linha sem afetar o status. Como o `src/styles.scss` global não é carregado no TestBed, a cobertura de teste recai sobre as regras com escopo de componente: testes adicionais validam via `getComputedStyle` que os elementos de status de `PacienteListComponent` e `UsuarioListComponent` usam `white-space: nowrap`.

47. Implementação dos filtros de busca na listagem de profissionais (issue #6): a tela `/profissionais` (`ProfissionalListComponent`) ganhou um formulário de filtros por **Nome**, **E-mail**, **Contrato** (`CLT`/`PJ`/`AUTONOMO`), **% por Aula** (`percentualPagamentoAula`) e **Status** (Todos/Ativos/Inativos), espelhando o padrão já adotado na listagem de pacientes. O `ProfissionalService.listar` passou a aceitar um terceiro parâmetro opcional `filtro: ProfissionalFiltro`, anexando como query params apenas os valores preenchidos (ignora `undefined`, `null` e string vazia), mantendo `page`, `size` e `sort=nome`. O componente monta o filtro a partir do estado de UI (`montarFiltro`): `nome`/`email` são enviados com `trim`, `tipoContrato` e `percentualPagamentoAula` só são incluídos quando informados (percentual convertido com `Number`/`Number.isFinite`) e `ativo` é derivado do status (`ativos`→`true`, `inativos`→`false`, `todos`→omitido). As ações **Buscar** (volta para a página 0) e **Limpar** (restaura os filtros padrão e recarrega) seguem o comportamento da tela de pacientes, e a paginação preserva o filtro ativo porque `carregar()` reaplica `montarFiltro()`. Cobertura adicional valida o envio/omissão dos params no service e a montagem do filtro, reset de página e limpeza no componente.

48. Atualização da identidade da aba do navegador (issue #92): o título em `src/index.html` deixou de exibir o valor padrão do Angular `Carlessopilatesfe` e passou a ser **Carlesso Pilates**, alinhado à marca usada na navbar (`AppComponent`) e na tela de login. O favicon padrão do Angular (`public/favicon.ico`) foi removido e substituído por `public/favicon.svg`, um monograma **CP** em SVG com fundo navy (`--c-tempestade #141f2d`), letras na cor creme (`--c-cloud-dancer #f0ede8`) e fonte serifada do Design System (`Italiana`), seguindo a paleta de `src/styles/_tokens.scss`. O `<link rel="icon">` passou a apontar para `favicon.svg` com `type="image/svg+xml"`. Como `public/` é a pasta de assets configurada em `angular.json`, o novo ícone é empacotado automaticamente no build local/produção.

49. Implementação do fluxo público de recuperação de senha via e-mail (issue #101), contraparte frontend dos endpoints `POST /auth/forgot-password` e `POST /auth/reset-password` do backend (issue carlessopilatesapi#83). Novos DTOs em `core/models/auth.ts` (`ForgotPasswordRequestDTO`, `ResetPasswordRequestDTO`) e métodos em `AuthService` (`forgotPassword(email)` → `POST /api/auth/forgot-password`; `resetPassword(dto)` → `POST /api/auth/reset-password`). Nova tela `/esqueci-senha` (`ForgotPasswordComponent`), standalone, com formulário reativo de `email` (mesma validação do login) que sempre exibe a mesma mensagem genérica de sucesso — sem diferenciar e-mail existente de inexistente, pois o backend retorna `200` por design contra enumeração de usuários — e trata `429` com mensagem de excesso de tentativas. Nova tela `/resetar-senha` (`ResetPasswordComponent`), standalone, que lê o `token` da query string e usa formulário reativo com `novaSenha` (mín. 8 caracteres) e `confirmacaoNovaSenha` (validador de grupo `naoConfere`), toggle de visibilidade por campo, tratamento de token ausente/inválido/expirado/já utilizado (`404`, `410` ou corpo com `code`/`field` de token) com ação **Solicitar novo e-mail** apontando para `/esqueci-senha`, propagação da mensagem do backend em `400` (política de senha) e `429`; após sucesso limpa o formulário e redireciona para `/login?redefinicao=sucesso`. A tela de login (`LoginComponent`) ganhou o link **Esqueci minha senha** e passa a exibir a mensagem de confirmação quando `redefinicao=sucesso` está na query string. Ambas as rotas são públicas (sem `authGuard`), seguindo o padrão de lazy-loading (`loadComponent`); como o usuário não está autenticado, o `authInterceptor` não anexa `Authorization` nem interfere no tratamento de erro dessas chamadas. Cobertura inclui testes de service (`POST` dos dois endpoints com payloads esperados), testes de componente das duas telas novas (validações, mensagens, cenários de erro, double-submit), testes de rotas públicas em `app.routes.spec.ts` e testes do link/banner no `login.component.spec.ts`.

50. Feedback de sucesso unificado (issue #139): a classe `.alert-success` passou a ser estilizada globalmente em `src/styles.scss` dentro do bloco `.alert` (tokens `--c-success`/`--c-success-bg`, mesmo padrão de `-danger`/`-warning`), e as 8 duplicações do estilo nos SCSS de componentes do prontuário (anamnese, avaliação fisioterapêutica, evolução de sessão, sessões lista/formulário, planos de tratamento lista/formulário e reavaliação) foram removidas — com isso a mensagem de sucesso da tela **Alterar senha**, que usava a classe sem estilo, passou a ter o destaque correto. Todas as ocorrências de `.alert-success` nos templates ganharam `role="status"`, garantindo anúncio a leitores de tela. As ações de escrita que recarregavam a lista em silêncio passaram a exibir confirmação de sucesso com dismissão automática após 4 segundos, seguindo o padrão já existente em `PacienteSessaoListComponent` (campo `sucesso` + `successTimer` limpo em `ngOnDestroy`; nos componentes `OnPush`, o callback do timer chama `cdr.markForCheck()`): ativar/inativar paciente (`PacienteListComponent`), inativar plano (`PlanoListComponent`), confirmar pagamento (`PagamentoListComponent`), marcar aula como realizada (`AulaListComponent`) e inativar/reativar/excluir usuário (`UsuarioListComponent`). Cobertura adicional valida, em cada componente, que a mensagem é exibida após a ação bem-sucedida, é renderizada com `role="status"` e desaparece após o timeout.

51. Implementação do diálogo de confirmação compartilhado (issue #140). O `ConfirmarDialogComponent` (`shared/components/confirmar-dialog`), até então um stub gerado, passou a concentrar todos os diálogos de confirmação da aplicação: expõe os inputs `titulo`, `mensagem`, `textoConfirmar`, `textoCancelar`, `variante` (`primaria`/`secundaria`/`perigo`, mapeadas para `btn-primary`/`btn-secondary`/`btn-danger`), `processando`, `confirmarDesabilitado` e `fecharAoClicarFora`, os outputs `confirmar` e `cancelar`, e um `<ng-content>` para conteúdo projetado quando a mensagem não é um texto simples (ex.: nome em negrito nas telas de detalhe e o formulário de data no diálogo de pagamento). A acessibilidade ficou centralizada no componente: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` apontando para o título gerado com id único, foco inicial no botão de confirmação (ou no primeiro elemento focável quando ele começa desabilitado, como no diálogo de pagamento), focus trap em Tab/Shift+Tab, fechamento por Esc e devolução do foco ao elemento disparador no `ngOnDestroy`. Enquanto `processando` está ativo, os botões de confirmar e cancelar ficam desabilitados e Esc não fecha o diálogo, evitando duplo disparo da ação — e **todas** as telas que confirmam ações mantêm um estado de ação em andamento (`acaoEmAndamento`/`acaoEmAndamentoId`) que é bindado nesse input e também protege o método de execução com early return, de modo que um duplo clique não dispara duas requisições. O `aria-describedby` aponta para o corpo do diálogo (mensagem ou conteúdo projetado) e, enquanto aberto, o componente aplica a classe `dialog-aberto` no `body` para travar o scroll do conteúdo de fundo. O fechamento por clique no overlay é o padrão (`fecharAoClicarFora` = `true`), desligado apenas no diálogo de pagamento, onde há formulário preenchido e o clique acidental fora causaria perda de dados. Os 12 diálogos inline duplicados em 9 templates (`paciente-list`, `paciente-detail`, `profissional-list`, `profissional-detail`, `plano-list`, `pagamento-list`, `usuario-list`, `paciente-sessao-list` e `paciente-plano-tratamento-list`) foram migrados para o componente, junto com o markup, os estilos locais de `.dialog`/`.dialog-title` e a plumbing manual de foco (`ngAfterViewChecked` + `previousFocusedElement`) que existia em `paciente-sessao-list` e `paciente-plano-tratamento-list`, e o `@HostListener('document:keydown.escape')` de `usuario-list`.
52. Confirmação e acessibilidade ao marcar aula como realizada (issue #141). O `AulaListComponent` (`/aulas/paciente/:pacienteId` e `/aulas/pagamento/:pagamentoId`) passou a exibir o `ConfirmarDialogComponent` compartilhado antes do `PATCH /aulas/{id}/realizar`, mostrando a data da aula e o profissional selecionado — antes a ação era executada imediatamente, sem confirmação, apesar de vincular o profissional sem desfazer na UI. O fluxo foi dividido em `solicitarRealizar` (valida e abre o diálogo), `confirmarRealizar` (dispara a chamada) e `cancelarConfirmacao`, com o estado `acaoEmAndamento` bindado no input `processando` para bloquear duplo disparo. Ao acionar o botão sem escolher profissional, o `select` da linha é destacado (`is-invalid`/`aria-invalid`) com mensagem `invalid-feedback`, em vez de nada acontecer. Quando não há profissionais ativos, um `field-hint` ("Cadastre um profissional ativo para confirmar aulas") explica o botão desabilitado. Cada `select` ganhou `aria-label` descritivo com a data da aula. Cobertura de componente valida a abertura/cancelamento do diálogo, a renderização de data e profissional, o destaque do select sem seleção, o hint com botão desabilitado e o `aria-label` do select.

A funcionalidade central de **gestão de pacientes** está operacional, incluindo filtros de busca, paginação server-side com tamanho de página configurável na listagem, anamnese clínica, avaliação fisioterapêutica, planos de tratamento, sessões de pilates/fisioterapia, evolução de sessão e reavaliações periódicas vinculados ao paciente, e cobertura de testes unitários para o serviço e todos os componentes de página. A tela inicial `/` apresenta um dashboard protegido por autenticação com resumo consolidado de pacientes, profissionais, pagamentos e aulas do mês atual, consumindo o endpoint único `GET /dashboard/resumo`. A listagem de profissionais oferece filtros de busca por nome, e-mail, tipo de contrato, percentual por aula e status (ativos/inativos/todos), também usa paginação server-side, limita os botões visíveis a uma janela de 5 páginas, bloqueia navegação para páginas inválidas ou repetidas, sincroniza `currentPage` e `pageSize` com os metadados da API e recua automaticamente para a última página válida quando a página atual deixa de existir após inativação. As telas de planos reutilizam as constantes `TIPO_LABEL`, `FREQUENCIA_LABEL` e `DIAS_SEMANA_LABEL` exportadas por `src/app/core/models/plano.ts`, evitando duplicação de labels entre formulário, listagem e demais fluxos. A tela de aulas permite marcar uma aula como realizada somente após selecionar o profissional responsável, enviando esse vínculo para o backend, e exibe carregamento também enquanto resolve o pagamento inicial na rota de aulas por pagamento. A seção de relatórios já possui consulta de pagamento de profissional por período, com seleção de profissional ativo, validação de datas, resumo por pagamento, detalhamento por aula realizada e exportação em PDF/XLSX, além do relatório fiscal de emissão de NFSEs por competência com exportação CSV/XLSX. A seção administrativa em `/admin` está disponível como hub inicial protegido por `roleGuard(['ADMIN'])`, e a listagem `/admin/usuarios` já consome o `UsuarioAdminService` com paginação server-side, exibe nome, e-mail, perfil e status, oferece criar/editar/inativar/reativar/excluir com confirmação antes de ações destrutivas e bloqueia o usuário logado de inativar ou excluir a própria conta. O `UsuarioAdminService` fornece a camada de serviço tipada para os endpoints `/api/users`, cobrindo listagem paginada, busca por ID, busca do perfil próprio, criação, atualização, exclusão, ativação, inativação e consulta de roles disponíveis. A aplicação agora pode ser executada em container Docker. A autenticação via JWT está implementada com tela de login, guard de rotas, interceptor HTTP, logout explícito e redirecionamento para `/login` apenas quando uma resposta `401` indica token inválido ou expirado; demais `401` são propagados ao componente. O estilo global do Angular consome tokens do Design System Carlesso em `src/styles/_tokens.scss`, com estratégia de tema e densidade centralizada pelo `StylePreferencesService`. O dark mode está disponível para o usuário final: a navbar oferece um botão de alternância entre tema claro e escuro, a preferência é persistida em `localStorage` e o tema inicial considera a preferência salva, com `prefers-color-scheme` como fallback. Os componentes de listagem (`PacienteListComponent`, `ProfissionalListComponent`, `PlanoListComponent`, `PagamentoListComponent` e `AulaListComponent`), assim como o `DashboardComponent`, usam `ChangeDetectionStrategy.OnPush` e disparam `cdr.markForCheck()` após cada atualização assíncrona de estado, reduzindo verificações de change detection desnecessárias.

---

## Decisões Técnicas

### Angular 19 com Standalone Components
Todos os componentes são standalone (sem NgModules), seguindo a arquitetura moderna do Angular. Isso reduz boilerplate e melhora o tree-shaking. Os imports de cada componente usam apenas as diretivas e pipes necessários (`NgIf`, `NgFor`, `NgClass`, `DatePipe`, `CurrencyPipe` etc.), evitando a importação completa do `CommonModule` e favorecendo o tree-shaking.

### Design System por tokens
Os protótipos do Design System foram preservados em `assets/` para consulta e validação visual. O frontend Angular importa os tokens por `src/styles/_tokens.scss`, mantendo nomes semânticos para cores, tipografia, espaçamento, raios, sombras e densidade. A camada de componentes deve preferir esses tokens a valores hexadecimais ou medidas avulsas.

### Tema e densidade
Tema e densidade são parametrizados por atributos no elemento raiz: `data-theme` alterna as paletas clara e escura, enquanto `data-density` ajusta `--row-h`, `--input-h`, `--btn-h`, `--btn-h-sm` e `--gutter`. O `StylePreferencesService` (`core/services/style-preferences.service.ts`) centraliza a resolução, aplicação e persistência dessas preferências.

No startup, o serviço resolve a preferência inicial nesta ordem: (1) preferência salva em `localStorage` na chave `carlesso.style-preferences`; (2) na ausência de preferência salva, o tema segue `prefers-color-scheme` do sistema operacional via `matchMedia`, com densidade `default`. O valor resolvido pelo fallback é apenas aplicado ao DOM, **não** é persistido — assim a preferência do sistema continua valendo até o usuário escolher explicitamente um tema. Os métodos `setTheme`, `setDensity`, `apply` e `toggleTheme` gravam a preferência resultante em `localStorage`; falhas de acesso ao storage (modo privado, quota) são silenciadas e a preferência permanece apenas em memória.

O dark mode em si é definido inteiramente pelos tokens em `[data-theme="dark"]` (`src/styles/_tokens.scss`, espelhado em `assets/tokens.css`), que sobrescrevem superfícies (`--bg-*`), texto (`--text-*`), bordas (`--border-*`), sombras e fundos funcionais. Não há paleta paralela nem cores hardcoded específicas de tema na camada de componentes.

### Controle de tema na interface
A navbar do `AppComponent` expõe o botão **Tema claro/Tema escuro** (`.btn-tema`), agrupado com o botão **Sair** em `.navbar-actions`. A tela de login também expõe o mesmo controle visual por meio de `.login-theme-toggle`, permitindo alternar o tema antes da autenticação. Ambos chamam `StylePreferencesService.toggleTheme()` e expõem `aria-pressed` (estado do tema escuro) e `aria-label` descritivo da ação. A navbar continua aparecendo apenas quando o usuário está autenticado; a tela de login respeita e também pode alterar o tema persistido ou resolvido por `prefers-color-scheme`.

### Lazy Loading em todas as rotas
Cada componente de página é carregado sob demanda via `loadComponent()`, otimizando o bundle inicial.

### Reactive Forms
Formulários construídos com `FormBuilder` e `FormGroup` para controle granular de validação e estado.

### Soft Delete (Inativação e Reativação)
O backend não remove pacientes fisicamente. Inativação usa `PATCH /pacientes/{id}/inativar` e reativação usa `PATCH /pacientes/{id}/ativar`. A listagem exibe apenas pacientes ativos; o detalhe exibe qualquer status e oferece o botão correto (Ativar ou Inativar) conforme o estado atual do paciente.

### CPF imutável após cadastro
Por regra de negócio, o CPF não pode ser alterado após o cadastro. O formulário de edição desabilita apenas o campo CPF. O e-mail pode ser atualizado via `PUT /pacientes/{id}` e é incluído no `PacienteUpdateDTO`.

### Anamnese do paciente
A tela `/pacientes/:pacienteId/anamnese` usa Reactive Forms para criar ou editar a anamnese principal do paciente. O componente valida o parâmetro `pacienteId` com `parseRouteNumberParam`, carrega a identificação do paciente por `PacienteService.buscar` e tenta carregar a anamnese via `GET /api/anamneses/paciente/{pacienteId}`. Retorno `404` nessa consulta indica ausência de anamnese e mantém o formulário em modo de cadastro. O salvamento usa `POST /api/anamneses` quando ainda não há registro e `PUT /api/anamneses/{id}` quando a anamnese já existe. Os campos `queixaPrincipal` e `objetivos` são obrigatórios e rejeitam conteúdo somente com espaços, refletindo o contrato `@NotBlank` do backend.

### Avaliação Fisioterapêutica do paciente
A tela `/pacientes/:pacienteId/avaliacao-fisioterapeutica` usa Reactive Forms para criar ou editar a avaliação fisioterapêutica do paciente. O componente valida o parâmetro `pacienteId` com `parseRouteNumberParam`, carrega a identificação do paciente por `PacienteService.buscar` e lista as avaliações via `GET /api/avaliacoes-fisioterapeuticas/paciente/{pacienteId}`. O backend retorna uma lista ordenada por `dataAvaliacao` e ID em ordem decrescente; a tela edita a avaliação mais recente quando há itens e mantém o formulário em modo de cadastro quando a lista vem vazia. O salvamento usa `POST /api/avaliacoes-fisioterapeuticas` com `pacienteId` quando ainda não há registro carregado e `PUT /api/avaliacoes-fisioterapeuticas/{id}` quando já existe. Os campos `dataAvaliacao`, `queixaFuncional`, `escalaDor` e `diagnosticoFisioterapeutico` são obrigatórios; `queixaFuncional` e `diagnosticoFisioterapeutico` rejeitam conteúdo somente com espaços, e `escalaDor` deve ficar entre 0 e 10. Demais campos — `avaliacaoPostural`, `mobilidadeArticular`, `forcaMuscular`, `flexibilidade`, `equilibrio`, `coordenacaoMotora`, `padraoRespiratorio`, `testesFuncionaisRealizados` e `observacoesGerais` — são opcionais.

### Sessões de Pilates/Fisioterapia do paciente
A tela `/pacientes/:pacienteId/sessoes` lista as sessões de pilates ou fisioterapia vinculadas ao paciente. O componente valida `pacienteId` com `parseRouteNumberParam`, carrega a identificação do paciente por `PacienteService.buscar` e consulta as sessões por `GET /api/sessoes/paciente/{pacienteId}`. A rota `/pacientes/:pacienteId/sessoes/nova` cria uma sessão por `POST /api/sessoes` com `pacienteId`; a rota `/pacientes/:pacienteId/sessoes/:id/editar` carrega a sessão por `GET /api/sessoes/{id}`, valida que `sessao.pacienteId` corresponde ao paciente da rota e salva alterações via `PUT /api/sessoes/{id}`. A listagem permite marcar sessões agendadas como realizadas por `PATCH /api/sessoes/{id}/realizar` e cancelar sessões agendadas por `PATCH /api/sessoes/{id}/cancelar`, sempre com confirmação antes da chamada. Os campos de UI `dataHora`, `tipo` e `duracao` são obrigatórios; o serviço converte `dataHora` em `data` e `horario`, envia `duracao` como `duracaoMinutos` e normaliza a resposta da API de volta para o modelo usado pelos componentes. `duracao` deve ficar entre 1 e 480 minutos. O tipo pode ser `PILATES` ou `FISIOTERAPIA`. O status é exibido como `AGENDADA`, `REALIZADA` ou `CANCELADA` com labels centralizados em `SESSAO_STATUS_LABEL`.

### Evolução de Sessão do paciente
A tela `/pacientes/:pacienteId/sessoes/:sessaoId/evolucao` permite registrar e editar a evolução clínica de uma sessão específica de pilates ou fisioterapia. O componente valida `pacienteId` e `sessaoId` com `parseRouteNumberParam`, carrega o paciente por `PacienteService.buscar`, carrega a sessão por `SessaoService.buscar` e só consulta a evolução depois de validar que `sessao.pacienteId` corresponde ao paciente da rota. A evolução é carregada por `GET /api/evolucoes-sessao/sessao/{sessaoId}`; retorno `404` nessa consulta indica ausência de evolução e mantém o formulário em modo de cadastro. O salvamento usa `POST /api/evolucoes-sessao` com `sessaoId` quando ainda não há registro e `PUT /api/evolucoes-sessao/{id}` quando já existe. O campo `dataHoraRegistro` é obrigatório. Os campos `exerciciosRealizados`, `equipamentosUtilizados`, `cargasMolas`, `respostaPaciente`, `intercorrencias`, `orientacoes` e `observacoesFisioterapeuta` são opcionais. `dorAntes` e `dorDepois`, quando informados, devem ficar entre 0 e 10. A listagem de sessões exibe um botão **Evolução** para cada sessão, navegando para a rota de evolução correspondente.

### Plano de Tratamento do paciente
A tela `/pacientes/:pacienteId/plano-tratamento` lista os planos de tratamento vinculados ao paciente. O componente valida `pacienteId` com `parseRouteNumberParam`, carrega a identificação do paciente por `PacienteService.buscar` e consulta os planos por `GET /api/planos-tratamento/paciente/{pacienteId}`. A rota `/pacientes/:pacienteId/plano-tratamento/novo` cria um plano por `POST /api/planos-tratamento` com `pacienteId`; a rota `/pacientes/:pacienteId/plano-tratamento/:id/editar` carrega o plano por `GET /api/planos-tratamento/{id}`, valida que `plano.pacienteId` corresponde ao paciente da rota e salva alterações via `PUT /api/planos-tratamento/{id}`. A listagem permite suspender planos ativos por `PATCH /api/planos-tratamento/{id}/suspender` e encerrar planos ativos ou suspensos por `PATCH /api/planos-tratamento/{id}/encerrar`, sempre com confirmação antes da chamada. Os campos `dataInicio`, `objetivosTerapeuticos`, `frequenciaSemanal`, `condutasPropostas` e `exerciciosIndicados` são obrigatórios; os textos obrigatórios rejeitam valores somente com espaços e `frequenciaSemanal` deve ficar entre 1 e 7. O status é exibido como `ATIVO`, `ENCERRADO` ou `SUSPENSO` com labels centralizados em `PLANO_TRATAMENTO_STATUS_LABEL`.

### Reavaliações do paciente
A tela `/pacientes/:pacienteId/reavaliacoes` lista as reavaliações periódicas vinculadas ao paciente. O componente valida `pacienteId` com `parseRouteNumberParam`, carrega a identificação do paciente por `PacienteService.buscar` e consulta as reavaliações por `GET /api/reavaliacoes/paciente/{pacienteId}`. A rota `/pacientes/:pacienteId/reavaliacoes/nova` cria uma reavaliação por `POST /api/reavaliacoes` com `pacienteId`; a rota `/pacientes/:pacienteId/reavaliacoes/:id/editar` carrega a reavaliação por `GET /api/reavaliacoes/{id}`, valida que `reavaliacao.pacienteId` corresponde ao paciente da rota e salva alterações via `PUT /api/reavaliacoes/{id}`. O único campo obrigatório é `dataReavaliacao`; os demais — `comparativoAvaliacaoAnterior`, `evolucaoDor`, `evolucaoForca`, `evolucaoMobilidade`, `evolucaoFuncional`, `objetivosAlcancados`, `pontosAtencao`, `ajustesPlanoTratamento` e `observacoesGerais` — são opcionais. Após criação bem-sucedida o formulário navega para a listagem; após atualização exibe mensagem de sucesso e permanece na tela.

### NFSEs emitidas do paciente
A tela `/pacientes/:pacienteId/nfse-emitidas` (`PacienteNfseEmitidaListComponent`) lista as NFSEs emitidas persistidas para o paciente. O componente valida `pacienteId` com `parseRouteNumberParam`, carrega a identificação do paciente por `PacienteService.buscar` e consulta as notas por `GET /api/api/nfse-emitidas/paciente/{pacienteId}`. As notas são ordenadas por `dataEmissao` decrescente e a getter `ultimaNota` expõe a NFSE mais recente, exibida em destaque no topo da listagem. Pacientes sem nota registrada veem um estado vazio explícito, e falhas de carregamento exibem mensagem amigável.

As rotas `/pacientes/:pacienteId/nfse-emitidas/nova` e `/pacientes/:pacienteId/nfse-emitidas/:id/editar` (`PacienteNfseEmitidaFormComponent`) registram ou atualizam a NFSE emitida via `POST /api/api/nfse-emitidas` (o backend faz upsert por paciente/competência). Os campos obrigatórios são `competencia` (formato `MM/AAAA`, mês entre `01` e `12`) e `dataEmissao`; os opcionais `numeroNota` (máx. 60 caracteres), `valor` (≥ 0) e `observacoes` são sanitizados — strings vazias viram `null` e o valor é convertido com `Number.isFinite` para número ou `null`. Como o backend não expõe busca de NFSE por ID, o modo de edição localiza a nota pela listagem do paciente (`listarPorPaciente`), validando que o `id` pertence ao paciente da rota e pré-preenchendo o formulário (estado vazio/“não encontrada” tratado). Após sucesso o formulário navega para a listagem. Cada card da listagem oferece a ação **Editar**. O `NfseEmitidaService` usa o prefixo `/api/api/nfse-emitidas` pelo mesmo motivo do `RelatorioService`: o backend expõe o recurso em `/api/nfse-emitidas` e o proxy de desenvolvimento e o Nginx removem o primeiro prefixo `/api`. A tela de detalhe do paciente oferece o card **NFSEs Emitidas** para acesso rápido.

O tratamento de erro de ambas as telas usa o utilitário `extrairMensagemErro` (`shared/utils/api-error.ts`), que respeita o contrato de erro do backend: `401`/`403` exibem mensagem de sessão/autorização, `429` exibe mensagem de excesso de requisições, e demais status (`400`/`409`/`422`) usam `message`/`error`/`detail` do corpo ou a junção das mensagens de erro por campo, caindo numa mensagem genérica quando não há texto aproveitável.

### Atualização de profissionais via PUT
O cadastro de profissionais segue o contrato do backend para atualização via `PUT /profissionais/{id}` com `ProfissionalUpdateDTO`. Ativação e inativação continuam usando endpoints específicos com `PATCH`.

### Confirmação de aulas com profissional
A confirmação de presença em aulas usa `PATCH /aulas/{id}/realizar?profissionalId={id}`. O frontend carrega profissionais ativos via `GET /profissionais?page=0&size=100&sort=nome`, exige seleção antes de confirmar e exibe o profissional retornado em aulas já realizadas. Antes do `PATCH`, o `AulaListComponent` abre o `ConfirmarDialogComponent` compartilhado exibindo a data e o profissional selecionado, protegendo o vínculo (que não tem desfazer na UI) contra cliques acidentais, e mantém o estado `acaoEmAndamento` bindado no input `processando` para evitar duplo disparo. Se o usuário aciona **Marcar como Realizada** sem escolher profissional, o `select` da linha é destacado com `is-invalid`/`aria-invalid` e uma mensagem `invalid-feedback` em vez de a ação falhar em silêncio. Quando não há profissionais ativos, além de o botão ficar desabilitado, um `field-hint` orienta "Cadastre um profissional ativo para confirmar aulas". Cada `select` de profissional recebe `aria-label` descritivo com a data da aula ("Profissional responsável pela aula de {data}").

### Relatório de pagamento de profissional
O relatório usa `GET /profissionais/{id}/relatorio-pagamento?inicio=YYYY-MM-DD&fim=YYYY-MM-DD`. A tela valida seleção de profissional, datas obrigatórias e impede consulta quando a data inicial é posterior à final. O retorno usa o contrato estruturado da API com `profissional`, `periodo`, `resumo`, `pagamentos`, `aulas` e `geradoEm`, consolidando total de aulas, total devido, agrupamento por pagamento e detalhamento por aula.

A exportação usa os endpoints `GET /profissionais/{id}/relatorio-pagamento/pdf?inicio=YYYY-MM-DD&fim=YYYY-MM-DD` e `GET /profissionais/{id}/relatorio-pagamento/xlsx?inicio=YYYY-MM-DD&fim=YYYY-MM-DD`. O frontend solicita a resposta como `Blob`, observa os headers HTTP, usa o nome retornado em `Content-Disposition` quando disponível e bloqueia os botões de exportação durante a geração do arquivo.

### Relatório de emissão de NFSEs
O relatório usa o endpoint do backend `GET /api/relatorios/nfse?competencia=MM/AAAA`, com filtro opcional `notaAnteriorEmitida=true|false`. Como o proxy de desenvolvimento e o Nginx removem o primeiro prefixo `/api` das chamadas do frontend, o `RelatorioService` chama `/api/api/relatorios/nfse` para encaminhar ao backend como `/api/relatorios/nfse`. A tela exige competência no formato `MM/AAAA`, valida mês entre `01` e `12`, exibe total de registros, soma de valores pagos e lista os campos `nome`, `cpfCnpj`, `valorPago`, `competencia`, `descricaoServico`, `notaAnteriorEmitida`, `dataPagamento` e `observacoes`. A partir da issue de backend #38, o campo `notaAnteriorEmitida` reflete a NFSE emitida persistida do paciente (ver **NFSEs emitidas do paciente**) em vez de uma inferência por pagamento anterior; o contrato do `RelatorioNfseResponseDTO` e o fluxo da tela permanecem inalterados.

A exportação usa o mesmo endpoint com `formato=CSV` ou `formato=XLSX`. O frontend trata a resposta como `Blob`, preserva o nome de arquivo retornado em `Content-Disposition` quando disponível e aplica fallback `relatorio-nfse-MM-AAAA.csv|xlsx`.

### Dashboard inicial
O dashboard inicial usa `GET /api/dashboard/resumo`, que o proxy local e o Nginx encaminham para `GET /dashboard/resumo` no backend. A tela exibe os indicadores principais em cards: pacientes ativos, profissionais ativos, receita confirmada do mês e aulas do mês atual. Também detalha pagamentos pendentes, pagos e vencidos, além de mostrar a proporção de aulas realizadas versus agendadas no mês corrente.

O retorno esperado segue o contrato `DashboardResumoDTO`, com grupos `pacientes`, `profissionais`, `pagamentos`, `aulas` e o timestamp `geradoEm`. O componente trata carregamento e falha de consulta com mensagens dedicadas, sem tentar reconstruir os indicadores por múltiplas chamadas de listagem.

### Seção administrativa
A seção administrativa fica em `pages/admin/` e é acessada por `/admin`, protegida por `roleGuard(['ADMIN'])`. O `AdminHomeComponent` serve como hub inicial e expõe links para os fluxos administrativos disponíveis. As rotas de usuários (`/admin/usuarios`, `/admin/usuarios/novo`, `/admin/usuarios/:id/editar`) também exigem `ADMIN`. A navbar exibe o link **Administração** apenas para usuários com perfil `ADMIN`. O `UsuarioFormComponent` valida o parâmetro `id` da rota com `parseRouteNumberParam` para alternar entre os modos de cadastro e edição e exibir **Identificador inválido.** quando o parâmetro não é um inteiro positivo seguro.

### Listagem administrativa de usuários
A tela `/admin/usuarios` (`UsuarioListComponent`) consome `UsuarioAdminService.listar` com paginação server-side, sincroniza `currentPage` e `pageSize` com os metadados de `Page<UsuarioAdminResponseDTO>` e renderiza no máximo 5 botões de página simultâneos (mesmo padrão da listagem de profissionais). A tabela exibe nome, e-mail, perfil (renderizado pelo label de `ROLE_OPTIONS`) e status (`Ativo`/`Inativo`/`—` quando o campo `active` não vier preenchido). O cabeçalho traz o botão **+ Novo Usuário** que navega para `/admin/usuarios/novo`; cada linha tem **Editar** (rota `/admin/usuarios/:id/editar`), **Inativar** ou **Reativar** (escolhido conforme o campo `active`, chamando `PATCH /api/users/{id}/inativar` ou `PATCH /api/users/{id}/ativar`) e **Excluir** (`DELETE /api/users/{id}`). Toda ação destrutiva (inativar, reativar, excluir) abre um diálogo de confirmação antes do disparo da requisição. Os botões de inativar/excluir ficam desabilitados para o próprio usuário logado (consultado via `AuthService.getCurrentUser()`), refletindo as regras de segurança do backend. A tela trata loading, mensagem de erro e estado vazio. Após inativar, reativar ou excluir o último item de uma página, o componente recua automaticamente para a página anterior válida.

### Service de usuários administrativos
O `UsuarioAdminService` centraliza todas as chamadas HTTP para `/api/users`. Os models em `core/models/usuario-admin.ts` definem `UsuarioAdminResponseDTO`, `UsuarioAdminCreateRequestDTO`, `UsuarioAdminUpdateRequestDTO`, `RoleOption` e `ROLE_OPTIONS`. O tipo `UserRole` é reutilizado de `auth.ts`; o tipo `Page<T>` é reutilizado de `paciente.ts`. O service segue o padrão dos demais services do projeto: `@Injectable({ providedIn: 'root' })`, injeção de `HttpClient`, URLs relativas `/api/*` e métodos em português (`listar`, `buscar`, `buscarPerfil`, `cadastrar`, `atualizar`, `excluir`, `ativar`, `inativar`, `listarRoles`, `alterarSenha`). O método `alterarSenha(dto: AlterarSenhaRequestDTO)` envia `PUT /api/users/me/senha` com o payload `{ senhaAtual, novaSenha, confirmacaoNovaSenha }` e é usado pelo `AlterarSenhaComponent`.

### Troca de senha do usuário autenticado
A tela `/perfil/alterar-senha` (`AlterarSenhaComponent`) permite que o usuário logado altere a própria senha. O componente é standalone, importa apenas `ReactiveFormsModule` e `RouterLink` e usa Reactive Forms com três controles obrigatórios: `senhaAtual`, `novaSenha` (mínimo de 8 caracteres) e `confirmacaoNovaSenha`. Dois validadores de grupo garantem que (1) `confirmacaoNovaSenha` coincida com `novaSenha` (erro `naoConfere`) e (2) `novaSenha` seja diferente de `senhaAtual` (erro `igualAtual`). Cada campo de senha tem um botão de toggle de visibilidade com `aria-pressed` e `aria-label` que alterna o `type` entre `password` e `text` sem afetar o valor do controle. O submit chama `UsuarioAdminService.alterarSenha`; respostas com código/campo explícito de `senhaAtual` exibem "Senha atual incorreta." e marcam o controle `senhaAtual` com erro `incorreta`; `401`/`403` sem esse sinal exibem mensagem de autorização/sessão; `400` propaga `err.error.message` quando disponível ou cai em "Dados inválidos para troca de senha."; outros erros usam "Erro ao alterar a senha. Tente novamente.". Após sucesso, o componente exibe mensagem de confirmação, limpa o formulário, chama `AuthService.clearSession()` e redireciona para `/login` (com um pequeno atraso para o usuário visualizar a mensagem). A flag `salvando` evita disparos duplicados. O link **Alterar senha** aparece na navbar (`AppComponent`) para todo usuário autenticado, ao lado dos botões de tema e de logout; em telas estreitas, as ações da navbar quebram linha para evitar overflow.

### Autorização por role
O `roleGuard` é uma factory function que recebe um array de `UserRole` permitidos e retorna um `CanActivateFn`. Ele verifica primeiro se o usuário está autenticado (token em `localStorage`); caso contrário redireciona para `/login`. Em seguida valida o role do usuário logado; quando o token existe mas `currentUser` está ausente ou inválido, a sessão local é limpa e o usuário volta para `/login`. Usuário autenticado sem o perfil exigido é redirecionado para `/403`. A tela `/403` (`ForbiddenComponent`) exibe código 403, mensagem orientativa e duas ações: link primário **Ir para o início** (`/`) e botão secundário **Voltar** que usa `Location.back()` quando há histórico do navegador (`window.history.length > 1`) e cai para `/` caso contrário, evitando que o usuário saia da SPA em deep links. Não acessa nenhum serviço externo. As rotas de `profissionais` e `relatorios` exigem `ADMIN`; as demais rotas continuam protegidas apenas pelo `authGuard`. Os links da navbar para `Profissionais` e `Relatórios`, além da ação de relatórios no dashboard, aparecem apenas para usuários administradores.

### Autenticação JWT
O frontend implementa autenticação stateless via JWT consumindo `POST /api/auth/login`. O retorno esperado contém `accessToken`, `tokenType` e o objeto `user` com os campos `id`, `name`, `email`, `role` e `active` opcional. O token é armazenado em `localStorage` pela `AuthService` sob a chave `accessToken`. Além do token, o `AuthService` armazena o objeto do usuário logado como JSON na chave `currentUser`. O método `getCurrentUser()` recupera esses dados tipados como `AuthenticatedUser`; retorna `null` quando não há sessão, o JSON armazenado está corrompido ou o formato não contém os campos obrigatórios. Os métodos `getCurrentUserRole()`, `isAdmin()` e `hasRole(role)` centralizam consultas de perfil. O `authInterceptor` (functional interceptor) injeta o header `Authorization: Bearer <token>` em todas as requisições, exceto no próprio endpoint de login. O interceptor só executa logout quando a resposta `401` indica explicitamente que o token é inválido ou expirou — via cabeçalho `WWW-Authenticate: Bearer error="invalid_token"` (ou `expired_token`) ou via corpo com `code` em `{TOKEN_EXPIRED, INVALID_TOKEN, TOKEN_INVALID}` — e somente quando há sessão ativa. Demais respostas `401` (por exemplo, rota inexistente que o Spring Security devolve como `401`, ou falhas pontuais do backend) são propagadas ao componente, que decide como exibir o erro, sem derrubar a sessão do usuário. O `authGuard` (functional guard) protege todas as rotas autenticadas e redireciona para `/login` quando não há token. O `AppComponent` exibe a navbar e o botão **Sair** apenas quando o usuário está autenticado, e exibe links administrativos apenas para `ADMIN`. O logout remove o token e os dados do usuário e redireciona para `/login`. O controle de acesso por perfil está implementado via `roleGuard` e a tela `/403` está disponível.

### Proxy de desenvolvimento para CORS
O browser bloqueia requisições cross-origin de `localhost:4200` para `localhost:8080`. A solução adotada foi o proxy do Angular CLI: `proxy.conf.json` redireciona `/api/*` para `http://localhost:8080/*` no lado do servidor, eliminando o problema de CORS em desenvolvimento. O `PacienteService` usa a URL relativa `/api/pacientes`.

### Docker com Nginx
A imagem Docker usa build multi-stage: `node:22-alpine` instala dependências e executa `npm run build`; `nginx:1.27-alpine` serve o conteúdo de `dist/carlessopilatesfe/browser`.

O Nginx mantém o mesmo contrato de URL relativa do frontend:

- `/` serve a SPA com fallback para `index.html`
- `/api/*` é redirecionado para `${BACKEND_URL}/*`

O valor padrão de `BACKEND_URL` é `http://host.docker.internal:8080`, adequado para backend rodando na máquina host durante desenvolvimento local com Docker Compose. Em ambientes integrados, a variável deve apontar para o serviço real da API.

A configuração por `environment.ts` ainda não é necessária porque o frontend continua usando URLs relativas e o alvo da API é resolvido no proxy.

---

## Arquitetura da Aplicação

```
┌─────────────────────────────────────────────┐
│              Angular SPA (porta 4200)        │
│                                             │
│  ┌─────────┐   ┌──────────┐  ┌──────────┐  │
│  │  List   │   │   Form   │  │  Detail  │  │
│  │Component│   │Component │  │Component │  │
│  └────┬────┘   └────┬─────┘  └────┬─────┘  │
│       │             │              │        │
│       └─────────────┼──────────────┘        │
│                     │                       │
│           ┌─────────▼──────────┐            │
│           │  PacienteService   │            │
│           │  GET /api/pacientes │            │
│           └─────────┬──────────┘            │
│                     │                       │
│        ┌────────────▼───────────┐           │
│        │  Angular CLI Proxy     │           │
│        │  /api/* → :8080/*      │           │
│        └────────────┬───────────┘           │
└─────────────────────┼───────────────────────┘
                      │ HTTP (sem CORS)
              ┌───────▼────────┐
              │  Backend API   │
              │ localhost:8080  │
              └────────────────┘
```

---

## Módulos Futuros Previstos

| Módulo         | Descrição                                     |
|----------------|-----------------------------------------------|
| Autorização    | Refinamento de controle de acesso por perfil em novas rotas |
| Administração  | CRUD de usuários, atribuição de perfis e demais configurações administrativas |
| Aulas          | Cadastro de modalidades e horários            |
| Agendamentos   | Vínculo paciente ↔ aula ↔ data/hora           |
| Frequência     | Controle de presença por sessão               |
| Financeiro     | Planos, pagamentos e cobranças                |
| Relatórios     | Relatório de pagamento de profissional por período com exportação PDF/XLSX; relatório de emissão de NFSEs por competência com exportação CSV/XLSX; futuras métricas avançadas do estúdio |

---

## Convenções de Nomenclatura

| Item             | Convenção                            | Exemplo                        |
|------------------|--------------------------------------|--------------------------------|
| Componentes      | PascalCase + sufixo `Component`      | `PacienteFormComponent`        |
| Serviços         | PascalCase + sufixo `Service`        | `PacienteService`              |
| Interfaces/DTOs  | PascalCase + sufixo `DTO`            | `PacienteRequestDTO`           |
| Arquivos         | kebab-case                           | `paciente-form.component.ts`   |
| Variáveis        | camelCase                            | `pacienteId`, `totalPages`     |
| CSS Variables    | kebab-case com prefixo `--`          | `--primary`, `--text-light`    |
| Métodos          | verbos em português (camelCase)      | `carregar()`, `inativar()`     |

---

## Relacionamento com o Backend

A API segue o padrão REST. O frontend espera os seguintes contratos:

- `GET /pacientes?page=0&size=10&sort=nome` → `Page<PacienteResponseDTO>`
- `GET /pacientes?page=0&size=10&sort=nome&nome=&email=&cpf=&telefone=&ativo=true` → `Page<PacienteResponseDTO>`
- `GET /pacientes/{id}` → `PacienteResponseDTO`
- `POST /pacientes` (body: `PacienteRequestDTO`) → `PacienteResponseDTO`
- `PUT /pacientes/{id}` (body: `PacienteUpdateDTO`) → `PacienteResponseDTO`
- `PATCH /pacientes/{id}/inativar` → `204 No Content`
- `PATCH /pacientes/{id}/ativar` → `204 No Content`
- `POST /anamneses` (body: `AnamneseRequestDTO`) → `AnamneseResponseDTO`
- `GET /anamneses/{id}` → `AnamneseResponseDTO`
- `GET /anamneses/paciente/{pacienteId}` → `AnamneseResponseDTO`
- `PUT /anamneses/{id}` (body: `AnamneseUpdateDTO`) → `AnamneseResponseDTO`
- `POST /avaliacoes-fisioterapeuticas` (body: `AvaliacaoFisioterapeuticaRequestDTO`) → `AvaliacaoFisioterapeuticaResponseDTO`
- `GET /avaliacoes-fisioterapeuticas/paciente/{pacienteId}` → `AvaliacaoFisioterapeuticaResponseDTO[]`
- `PUT /avaliacoes-fisioterapeuticas/{id}` (body: `AvaliacaoFisioterapeuticaUpdateDTO`) → `AvaliacaoFisioterapeuticaResponseDTO`
- `GET /planos-tratamento/paciente/{pacienteId}` → `PlanoTratamentoResponseDTO[]`
- `GET /planos-tratamento/{id}` → `PlanoTratamentoResponseDTO`
- `POST /planos-tratamento` (body: `PlanoTratamentoRequestDTO`) → `PlanoTratamentoResponseDTO`
- `PUT /planos-tratamento/{id}` (body: `PlanoTratamentoUpdateDTO`) → `PlanoTratamentoResponseDTO`
- `PATCH /planos-tratamento/{id}/encerrar` → `PlanoTratamentoResponseDTO`
- `PATCH /planos-tratamento/{id}/suspender` → `PlanoTratamentoResponseDTO`
- `GET /sessoes/paciente/{pacienteId}` → `SessaoResponseDTO[]`
- `GET /sessoes/{id}` → `SessaoResponseDTO`
- `POST /sessoes` (body: `SessaoRequestDTO`) → `SessaoResponseDTO`
- `PUT /sessoes/{id}` (body: `SessaoUpdateDTO`) → `SessaoResponseDTO`
- `PATCH /sessoes/{id}/realizar` → `SessaoResponseDTO`
- `PATCH /sessoes/{id}/cancelar` → `SessaoResponseDTO`
- `GET /evolucoes-sessao/sessao/{sessaoId}` → `EvolucaoSessaoResponseDTO`
- `POST /evolucoes-sessao` (body: `EvolucaoSessaoRequestDTO`) → `EvolucaoSessaoResponseDTO`
- `PUT /evolucoes-sessao/{id}` (body: `EvolucaoSessaoUpdateDTO`) → `EvolucaoSessaoResponseDTO`
- `GET /reavaliacoes/paciente/{pacienteId}` → `ReavaliacaoResponseDTO[]`
- `GET /reavaliacoes/{id}` → `ReavaliacaoResponseDTO`
- `POST /reavaliacoes` (body: `ReavaliacaoRequestDTO`) → `ReavaliacaoResponseDTO`
- `PUT /reavaliacoes/{id}` (body: `ReavaliacaoUpdateDTO`) → `ReavaliacaoResponseDTO`
- `GET /profissionais?page=0&size=10&sort=nome` → `Page<ProfissionalResponseDTO>`
- `GET /profissionais?page=0&size=10&sort=nome&nome=&email=&tipoContrato=&percentualPagamentoAula=&ativo=true` → `Page<ProfissionalResponseDTO>`
- `GET /profissionais/{id}` → `ProfissionalResponseDTO`
- `POST /profissionais` (body: `ProfissionalRequestDTO`) → `ProfissionalResponseDTO`
- `PUT /profissionais/{id}` (body: `ProfissionalUpdateDTO`) → `ProfissionalResponseDTO`
- `PATCH /profissionais/{id}/ativar` → `204 No Content`
- `PATCH /profissionais/{id}/inativar` → `204 No Content`
- `GET /profissionais/{id}/relatorio-pagamento?inicio=YYYY-MM-DD&fim=YYYY-MM-DD` → `ProfissionalPagamentoRelatorioDTO`
- `GET /profissionais/{id}/relatorio-pagamento/pdf?inicio=YYYY-MM-DD&fim=YYYY-MM-DD` → `application/pdf` com `Content-Disposition: attachment`
- `GET /profissionais/{id}/relatorio-pagamento/xlsx?inicio=YYYY-MM-DD&fim=YYYY-MM-DD` → `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` com `Content-Disposition: attachment`
- `GET /api/nfse-emitidas/paciente/{pacienteId}` → `NotaFiscalEmitidaResponseDTO[]` (frontend chama `/api/api/nfse-emitidas/paciente/{pacienteId}`)
- `POST /api/nfse-emitidas` (body: `NotaFiscalEmitidaRequestDTO`) → `NotaFiscalEmitidaResponseDTO` (frontend chama `/api/api/nfse-emitidas`)
- `GET /api/relatorios/nfse?competencia=MM/AAAA` → `RelatorioNfseResponseDTO[]`
- `GET /api/relatorios/nfse?competencia=MM/AAAA&notaAnteriorEmitida=false` → `RelatorioNfseResponseDTO[]`
- `GET /api/relatorios/nfse?competencia=MM/AAAA&formato=CSV` → `text/csv` com `Content-Disposition: attachment`
- `GET /api/relatorios/nfse?competencia=MM/AAAA&formato=XLSX` → `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` com `Content-Disposition: attachment`
- `GET /dashboard/resumo` → `DashboardResumoDTO`
- `PUT /api/users/me/senha` (body: `AlterarSenhaRequestDTO` com `senhaAtual`, `novaSenha`, `confirmacaoNovaSenha`) → `204 No Content`

Erros são tratados no subscribe via callback de erro, exibindo mensagem genérica ao usuário.

Rotas com parâmetros numéricos, como `id`, `pacienteId` e `pagamentoId`, usam validação explícita antes de acionar serviços. Apenas inteiros positivos seguros são aceitos. Quando o parâmetro está ausente ou em formato inválido, a tela exibe **Identificador inválido.** e interrompe o carregamento para não gerar URLs de API contendo `NaN`.

---

## Como Rodar Localmente

### Pré-requisitos
- Node.js 18+
- Angular CLI (`npm install -g @angular/cli`)
- Backend rodando em `http://localhost:8080`
- Docker e Docker Compose, para execução em container

### Passos
```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm start

# Acessar em http://localhost:4200
```

### Docker
```bash
# Backend local em http://localhost:8080
docker compose up --build

# Acessar em http://localhost:4200
```

Para outro backend:
```bash
BACKEND_URL=http://api:8080 docker compose up --build
```

---

## Informações do Repositório

- **Repositório:** `carlessopilatesfe`
- **Branch principal:** `master`
- **Autor:** Fabio Carlesso
