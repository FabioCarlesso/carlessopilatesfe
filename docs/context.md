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

A funcionalidade central de **gestão de pacientes** está operacional, incluindo filtros de busca, paginação server-side com tamanho de página configurável na listagem e cobertura de testes unitários para o serviço e todos os componentes de página. A listagem de profissionais também usa paginação server-side e limita os botões visíveis a uma janela de 5 páginas para evitar excesso de elementos no DOM. A aplicação agora pode ser executada em container Docker. Ainda não há autenticação.

---

## Decisões Técnicas

### Angular 19 com Standalone Components
Todos os componentes são standalone (sem NgModules), seguindo a arquitetura moderna do Angular. Isso reduz boilerplate e melhora o tree-shaking.

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
| Autenticação   | Login com JWT, controle de acesso por perfil  |
| Aulas          | Cadastro de modalidades e horários            |
| Agendamentos   | Vínculo paciente ↔ aula ↔ data/hora           |
| Frequência     | Controle de presença por sessão               |
| Financeiro     | Planos, pagamentos e cobranças                |
| Relatórios     | Dashboard com métricas do estúdio             |

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

Erros são tratados no subscribe via callback de erro, exibindo mensagem genérica ao usuário.

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
