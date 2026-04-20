# Contexto do Projeto — Carlesso Pilates Frontend

## O que é este projeto

O **Carlesso Pilates Frontend** é uma aplicação web Angular desenvolvida para apoiar a gestão administrativa de um estúdio de pilates. O sistema centraliza o cadastro e controle de pacientes, servindo como ponto de partida para um sistema mais amplo de gestão do estúdio.

A aplicação consome uma API REST que roda localmente em `http://localhost:8080`, construída separadamente (backend Spring Boot, presumidamente).

---

## Estado Atual (Abril 2026)

O projeto está em fase inicial de desenvolvimento (**MVP**). Foram realizados dois commits:

1. Setup inicial do projeto Angular 19
2. Implementação do módulo de pacientes (listagem, formulário, detalhe)

A funcionalidade central de **gestão de pacientes** está operacional. Ainda não há autenticação, outros módulos ou configuração de ambiente.

---

## Decisões Técnicas

### Angular 19 com Standalone Components
Todos os componentes são standalone (sem NgModules), seguindo a arquitetura moderna do Angular. Isso reduz boilerplate e melhora o tree-shaking.

### Lazy Loading em todas as rotas
Cada componente de página é carregado sob demanda via `loadComponent()`, otimizando o bundle inicial.

### Reactive Forms
Formulários construídos com `FormBuilder` e `FormGroup` para controle granular de validação e estado.

### Soft Delete (Inativação)
O backend não remove pacientes fisicamente. A operação de "exclusão" chama `DELETE /pacientes/{id}` que inativa o registro. A listagem exibe apenas pacientes ativos.

### E-mail e CPF imutáveis após cadastro
Por regra de negócio, e-mail e CPF não podem ser alterados após a criação do paciente. O formulário de edição desabilita esses campos e usa `PacienteUpdateDTO` (sem esses campos) no PUT.

### URL da API hardcoded
Atualmente a URL `http://localhost:8080` está definida diretamente no `PacienteService`. A separação por `environment.ts` é um próximo passo planejado.

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
│           │  (HttpClient/RxJS) │            │
│           └─────────┬──────────┘            │
└─────────────────────┼───────────────────────┘
                      │ HTTP REST
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
- `GET /pacientes/{id}` → `PacienteResponseDTO`
- `POST /pacientes` (body: `PacienteRequestDTO`) → `PacienteResponseDTO`
- `PUT /pacientes/{id}` (body: `PacienteUpdateDTO`) → `PacienteResponseDTO`
- `DELETE /pacientes/{id}` → `204 No Content`

Erros são tratados no subscribe via callback de erro, exibindo mensagem genérica ao usuário.

---

## Como Rodar Localmente

### Pré-requisitos
- Node.js 18+
- Angular CLI (`npm install -g @angular/cli`)
- Backend rodando em `http://localhost:8080`

### Passos
```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm start

# Acessar em http://localhost:4200
```

---

## Informações do Repositório

- **Repositório:** `carlessopilatesfe`
- **Branch principal:** `main`
- **Branch atual de desenvolvimento:** `master`
- **Autor:** Fabio Carlesso
