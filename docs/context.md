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

A funcionalidade central de **gestão de pacientes** está operacional, incluindo filtros de busca, paginação server-side com tamanho de página configurável na listagem e cobertura de testes unitários para o serviço e todos os componentes de página. A tela inicial `/` apresenta um dashboard protegido por autenticação com resumo consolidado de pacientes, profissionais, pagamentos e aulas do mês atual, consumindo o endpoint único `GET /dashboard/resumo`. A listagem de profissionais também usa paginação server-side, limita os botões visíveis a uma janela de 5 páginas, bloqueia navegação para páginas inválidas ou repetidas, sincroniza `currentPage` e `pageSize` com os metadados da API e recua automaticamente para a última página válida quando a página atual deixa de existir após inativação. As telas de planos reutilizam as constantes `TIPO_LABEL`, `FREQUENCIA_LABEL` e `DIAS_SEMANA_LABEL` exportadas por `src/app/core/models/plano.ts`, evitando duplicação de labels entre formulário, listagem e demais fluxos. A tela de aulas permite marcar uma aula como realizada somente após selecionar o profissional responsável, enviando esse vínculo para o backend, e exibe carregamento também enquanto resolve o pagamento inicial na rota de aulas por pagamento. A seção de relatórios já possui consulta de pagamento de profissional por período, com seleção de profissional ativo, validação de datas, resumo por pagamento, detalhamento por aula realizada e exportação em PDF/XLSX, além do relatório fiscal de emissão de NFSEs por competência com exportação CSV/XLSX. A aplicação agora pode ser executada em container Docker. A autenticação via JWT está implementada: tela de login, guard de rotas, interceptor HTTP, logout e redirecionamento para login quando uma chamada autenticada retorna `401`. O estilo global do Angular consome tokens do Design System Carlesso em `src/styles/_tokens.scss`, com estratégia de tema e densidade centralizada pelo `StylePreferencesService`.

---

## Decisões Técnicas

### Angular 19 com Standalone Components
Todos os componentes são standalone (sem NgModules), seguindo a arquitetura moderna do Angular. Isso reduz boilerplate e melhora o tree-shaking.

### Design System por tokens
Os protótipos do Design System foram preservados em `assets/` para consulta e validação visual. O frontend Angular importa os tokens por `src/styles/_tokens.scss`, mantendo nomes semânticos para cores, tipografia, espaçamento, raios, sombras e densidade. A camada de componentes deve preferir esses tokens a valores hexadecimais ou medidas avulsas.

### Tema e densidade
Tema e densidade são parametrizados por atributos no elemento raiz: `data-theme` alterna as paletas clara e escura, enquanto `data-density` ajusta `--row-h`, `--input-h`, `--btn-h`, `--btn-h-sm` e `--gutter`. O `StylePreferencesService` aplica os defaults e oferece métodos para evoluir futuros controles de preferência.

### Lazy Loading em todas as rotas
Cada componente de página é carregado sob demanda via `loadComponent()`, otimizando o bundle inicial.

### Reactive Forms
Formulários construídos com `FormBuilder` e `FormGroup` para controle granular de validação e estado.

### Soft Delete (Inativação e Reativação)
O backend não remove pacientes fisicamente. Inativação usa `PATCH /pacientes/{id}/inativar` e reativação usa `PATCH /pacientes/{id}/ativar`. A listagem exibe apenas pacientes ativos; o detalhe exibe qualquer status e oferece o botão correto (Ativar ou Inativar) conforme o estado atual do paciente.

### CPF imutável após cadastro
Por regra de negócio, o CPF não pode ser alterado após o cadastro. O formulário de edição desabilita apenas o campo CPF. O e-mail pode ser atualizado via `PUT /pacientes/{id}` e é incluído no `PacienteUpdateDTO`.

### Atualização de profissionais via PUT
O cadastro de profissionais segue o contrato do backend para atualização via `PUT /profissionais/{id}` com `ProfissionalUpdateDTO`. Ativação e inativação continuam usando endpoints específicos com `PATCH`.

### Confirmação de aulas com profissional
A confirmação de presença em aulas usa `PATCH /aulas/{id}/realizar?profissionalId={id}`. O frontend carrega profissionais ativos via `GET /profissionais?page=0&size=100&sort=nome`, exige seleção antes de confirmar e exibe o profissional retornado em aulas já realizadas.

### Relatório de pagamento de profissional
O relatório usa `GET /profissionais/{id}/relatorio-pagamento?inicio=YYYY-MM-DD&fim=YYYY-MM-DD`. A tela valida seleção de profissional, datas obrigatórias e impede consulta quando a data inicial é posterior à final. O retorno usa o contrato estruturado da API com `profissional`, `periodo`, `resumo`, `pagamentos`, `aulas` e `geradoEm`, consolidando total de aulas, total devido, agrupamento por pagamento e detalhamento por aula.

A exportação usa os endpoints `GET /profissionais/{id}/relatorio-pagamento/pdf?inicio=YYYY-MM-DD&fim=YYYY-MM-DD` e `GET /profissionais/{id}/relatorio-pagamento/xlsx?inicio=YYYY-MM-DD&fim=YYYY-MM-DD`. O frontend solicita a resposta como `Blob`, observa os headers HTTP, usa o nome retornado em `Content-Disposition` quando disponível e bloqueia os botões de exportação durante a geração do arquivo.

### Relatório de emissão de NFSEs
O relatório usa o endpoint do backend `GET /api/relatorios/nfse?competencia=MM/AAAA`, com filtro opcional `notaAnteriorEmitida=true|false`. Como o proxy de desenvolvimento e o Nginx removem o primeiro prefixo `/api` das chamadas do frontend, o `RelatorioService` chama `/api/api/relatorios/nfse` para encaminhar ao backend como `/api/relatorios/nfse`. A tela exige competência no formato `MM/AAAA`, valida mês entre `01` e `12`, exibe total de registros, soma de valores pagos e lista os campos `nome`, `cpfCnpj`, `valorPago`, `competencia`, `descricaoServico`, `notaAnteriorEmitida`, `dataPagamento` e `observacoes`.

A exportação usa o mesmo endpoint com `formato=CSV` ou `formato=XLSX`. O frontend trata a resposta como `Blob`, preserva o nome de arquivo retornado em `Content-Disposition` quando disponível e aplica fallback `relatorio-nfse-MM-AAAA.csv|xlsx`.

### Dashboard inicial
O dashboard inicial usa `GET /api/dashboard/resumo`, que o proxy local e o Nginx encaminham para `GET /dashboard/resumo` no backend. A tela exibe os indicadores principais em cards: pacientes ativos, profissionais ativos, receita confirmada do mês e aulas do mês atual. Também detalha pagamentos pendentes, pagos e vencidos, além de mostrar a proporção de aulas realizadas versus agendadas no mês corrente.

O retorno esperado segue o contrato `DashboardResumoDTO`, com grupos `pacientes`, `profissionais`, `pagamentos`, `aulas` e o timestamp `geradoEm`. O componente trata carregamento e falha de consulta com mensagens dedicadas, sem tentar reconstruir os indicadores por múltiplas chamadas de listagem.

### Autenticação JWT
O frontend implementa autenticação stateless via JWT consumindo `POST /api/auth/login`. O token é armazenado em `localStorage` pela `AuthService`. O `authInterceptor` (functional interceptor) injeta o header `Authorization: Bearer <token>` em todas as requisições, exceto no próprio endpoint de login. Quando uma requisição autenticada retorna `401`, o interceptor executa logout, remove o token e redireciona para `/login`, cobrindo o fluxo de token expirado retornado pelo Spring Security. O `authGuard` (functional guard) protege todas as rotas autenticadas e redireciona para `/login` quando não há token. O `AppComponent` exibe a navbar e o botão **Sair** apenas quando o usuário está autenticado. O logout remove o token e redireciona para `/login`. Controle de acesso por perfil e tela dedicada para `403` ainda são pendências futuras.

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
| Autenticação   | Controle de acesso por perfil e tela dedicada para `403` |
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
- `GET /profissionais?page=0&size=10&sort=nome` → `Page<ProfissionalResponseDTO>`
- `GET /profissionais/{id}` → `ProfissionalResponseDTO`
- `POST /profissionais` (body: `ProfissionalRequestDTO`) → `ProfissionalResponseDTO`
- `PUT /profissionais/{id}` (body: `ProfissionalUpdateDTO`) → `ProfissionalResponseDTO`
- `PATCH /profissionais/{id}/ativar` → `204 No Content`
- `PATCH /profissionais/{id}/inativar` → `204 No Content`
- `GET /profissionais/{id}/relatorio-pagamento?inicio=YYYY-MM-DD&fim=YYYY-MM-DD` → `ProfissionalPagamentoRelatorioDTO`
- `GET /profissionais/{id}/relatorio-pagamento/pdf?inicio=YYYY-MM-DD&fim=YYYY-MM-DD` → `application/pdf` com `Content-Disposition: attachment`
- `GET /profissionais/{id}/relatorio-pagamento/xlsx?inicio=YYYY-MM-DD&fim=YYYY-MM-DD` → `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` com `Content-Disposition: attachment`
- `GET /api/relatorios/nfse?competencia=MM/AAAA` → `RelatorioNfseResponseDTO[]`
- `GET /api/relatorios/nfse?competencia=MM/AAAA&notaAnteriorEmitida=false` → `RelatorioNfseResponseDTO[]`
- `GET /api/relatorios/nfse?competencia=MM/AAAA&formato=CSV` → `text/csv` com `Content-Disposition: attachment`
- `GET /api/relatorios/nfse?competencia=MM/AAAA&formato=XLSX` → `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` com `Content-Disposition: attachment`
- `GET /dashboard/resumo` → `DashboardResumoDTO`

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
