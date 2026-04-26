# Carlesso Pilates — Documentação do Frontend

## Visão Geral

**Projeto:** Carlesso Pilates Frontend  
**Versão:** 0.0.0  
**Tecnologia:** Angular 19 (SPA)  
**Propósito:** Interface web para gestão administrativa de um estúdio de pilates.
**Backend esperado:** API REST em `http://localhost:8080`

---

## Stack de Tecnologias

| Camada         | Tecnologia                              |
|----------------|-----------------------------------------|
| Framework      | Angular 19.2                            |
| Linguagem      | TypeScript 5.7                          |
| Estilos        | SCSS (Sass)                             |
| Forms          | Reactive Forms (@angular/forms)         |
| HTTP           | HttpClient (@angular/common/http)       |
| Roteamento     | Angular Router                          |
| Reatividade    | RxJS 7.8                                |
| Testes         | Karma + Jasmine                         |
| Build          | Angular CLI 19.2 / @angular-devkit      |
| Container      | Docker + Nginx                          |

---

## Módulos

| Módulo | Rotas | Funcionalidades |
|--------|-------|-----------------|
| Pacientes | `/pacientes`, `/pacientes/:id`, `/pacientes/novo`, `/pacientes/:id/editar` | CRUD completo, filtros de busca, paginação, ativar/inativar |
| Profissionais | `/profissionais`, `/profissionais/:id`, `/profissionais/novo`, `/profissionais/:id/editar` | CRUD completo, ativar/inativar, atualização via PUT, paginação com janela limitada e guarda de limites |
| Planos | `/planos/paciente/:pacienteId`, `/planos/novo/:pacienteId` | Listar, criar (com seleção de dias e validação de frequência), inativar |
| Pagamentos | `/pagamentos/paciente/:pacienteId`, `/pagamentos/novo/:pacienteId` | Listar, criar, confirmar pagamento |
| Aulas | `/aulas/paciente/:pacienteId`, `/aulas/pagamento/:pagamentoId` | Listar, confirmar presença |

---

## Estrutura de Pastas

```
carlessopilatesfe/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── models/
│   │   │   │   ├── paciente.ts          # DTOs e interfaces de pacientes
│   │   │   │   └── profissional.ts      # DTOs e interfaces de profissionais
│   │   │   └── services/
│   │   │       ├── paciente.service.ts  # Serviço de integração com a API de pacientes
│   │   │       └── profissional.service.ts # Serviço de integração com a API de profissionais
│   │   ├── pages/
│   │   │   ├── pacientes/
│   │   │   │   ├── paciente-list/       # Listagem paginada de pacientes
│   │   │   │   ├── paciente-form/       # Formulário de cadastro e edição
│   │   │   │   └── paciente-detail/     # Visualização detalhada
│   │   │   └── profissionais/           # CRUD de profissionais
│   │   ├── shared/
│   │   │   └── components/
│   │   │       └── confirmar-dialog/    # Componente de diálogo reutilizável
│   │   ├── app.component.*              # Componente raiz com navbar
│   │   ├── app.config.ts                # Configuração da aplicação
│   │   └── app.routes.ts                # Definição das rotas
│   ├── styles.scss                      # Estilos globais e variáveis CSS
│   ├── main.ts                          # Ponto de entrada (bootstrap)
│   └── index.html                       # HTML principal
├── docs/                                # Documentação do projeto
├── nginx/
│   └── default.conf.template            # Proxy /api e fallback da SPA em Docker
├── angular.json                         # Configuração do Angular CLI
├── Dockerfile                           # Build multi-stage e imagem Nginx
├── docker-compose.yml                   # Execução local em container
├── package.json                         # Dependências e scripts
└── tsconfig.json                        # Configuração do TypeScript
```

---

## Modelos de Dados

Arquivo: `src/app/core/models/paciente.ts`

### `EnderecoDTO`
```typescript
interface EnderecoDTO {
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}
```

### `PacienteResponseDTO`
Retorno da API ao listar/buscar pacientes.
```typescript
interface PacienteResponseDTO {
  id: number;
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  dataNascimento: string;
  endereco: EnderecoDTO | null;
  ativo: boolean;
}
```

### `PacienteRequestDTO`
Payload para criação de paciente.
```typescript
interface PacienteRequestDTO {
  nome: string;
  email: string;
  cpf: string;
  telefone?: string;
  dataNascimento?: string;
  endereco?: EnderecoDTO;
}
```

### `PacienteUpdateDTO`
Payload para atualização (somente CPF é imutável; e-mail pode ser alterado).
```typescript
interface PacienteUpdateDTO {
  nome?: string;
  email?: string;
  telefone?: string;
  dataNascimento?: string;
  endereco?: EnderecoDTO;
}
```

### `PageMetadata`
Metadados de paginação retornados aninhados pelo Spring Boot 3.x.
```typescript
interface PageMetadata {
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
```

### `Page<T>`
Wrapper de resposta paginada da API. Os metadados ficam em `page.page` (estrutura aninhada do Spring Boot 3.x). O componente que consome essa resposta aplica fallback para os campos `number`, `size`, `totalPages` e `totalElements` para preservar o estado anterior caso o backend omita algum atributo, evitando exibição de `NaN` no resumo e seletor vazio na listagem de pacientes.
```typescript
interface Page<T> {
  content: T[];
  page: PageMetadata;
}
```

Arquivo: `src/app/core/models/profissional.ts`

### `ProfissionalResponseDTO`
Retorno da API ao listar/buscar profissionais.
```typescript
interface ProfissionalResponseDTO {
  id: number;
  nome: string;
  email: string;
  cpf: string;
  telefone: string | null;
  tipoContrato: 'CLT' | 'PJ' | 'AUTONOMO';
  percentualPagamentoAula: number;
  dataInicio: string;
  ativo: boolean;
}
```

### `ProfissionalRequestDTO`
Payload para criação de profissional.
```typescript
interface ProfissionalRequestDTO {
  nome: string;
  email: string;
  cpf: string;
  telefone?: string;
  tipoContrato: 'CLT' | 'PJ' | 'AUTONOMO';
  percentualPagamentoAula: number;
  dataInicio: string;
}
```

### `ProfissionalUpdateDTO`
Payload para atualização de profissionais via `PUT /profissionais/{id}`.
```typescript
interface ProfissionalUpdateDTO {
  nome?: string;
  email?: string;
  telefone?: string;
  tipoContrato?: 'CLT' | 'PJ' | 'AUTONOMO';
  percentualPagamentoAula?: number;
  dataInicio?: string;
}
```

---

## Serviços

### `PacienteService`
Arquivo: `src/app/core/services/paciente.service.ts`  
Injetável em toda a aplicação (`providedIn: 'root'`).

**URL base no frontend:** `/api/pacientes`

Em desenvolvimento local, o Angular CLI redireciona `/api` para `http://localhost:8080` via `proxy.conf.json`. Em Docker, o Nginx redireciona `/api` para o valor de `BACKEND_URL`.

| Método            | Endpoint HTTP               | Descrição                        |
|-------------------|-----------------------------|----------------------------------|
| `listar(page, size, filtro)` | `GET /pacientes?page&size&sort=nome&nome&email&cpf&telefone&ativo` | Lista pacientes paginados com filtros opcionais |
| `buscar(id)`      | `GET /pacientes/{id}`       | Busca paciente por ID            |
| `cadastrar(dto)`  | `POST /pacientes`           | Cria novo paciente               |
| `atualizar(id, dto)` | `PUT /pacientes/{id}`    | Atualiza dados do paciente (e-mail incluso, CPF é imutável) |
| `ativar(id)`      | `PATCH /pacientes/{id}/ativar` | Reativa paciente inativo      |
| `inativar(id)`    | `PATCH /pacientes/{id}/inativar` | Inativa paciente (soft delete) |

### `ProfissionalService`
Arquivo: `src/app/core/services/profissional.service.ts`
Injetável em toda a aplicação (`providedIn: 'root'`).

**URL base no frontend:** `/api/profissionais`

| Método            | Endpoint HTTP               | Descrição                        |
|-------------------|-----------------------------|----------------------------------|
| `listar(page, size)` | `GET /profissionais?page&size&sort=nome` | Lista profissionais ativos paginados |
| `buscar(id)`      | `GET /profissionais/{id}`       | Busca profissional por ID        |
| `cadastrar(dto)`  | `POST /profissionais`           | Cria novo profissional           |
| `atualizar(id, dto)` | `PUT /profissionais/{id}`    | Atualiza dados do profissional   |
| `ativar(id)`      | `PATCH /profissionais/{id}/ativar` | Reativa profissional inativo  |
| `inativar(id)`    | `PATCH /profissionais/{id}/inativar` | Inativa profissional          |

---

## Rotas

Arquivo: `src/app/app.routes.ts`  
Todos os componentes são carregados com **lazy loading** via `loadComponent()`.

Os parâmetros numéricos das rotas são validados antes de qualquer chamada à API. Apenas inteiros positivos seguros são aceitos; identificadores ausentes, não numéricos ou em formato inválido exibem **Identificador inválido.** e interrompem o carregamento da tela.

| Caminho                  | Componente              | Função                         |
|--------------------------|-------------------------|--------------------------------|
| `/`                      | —                       | Redireciona para `/pacientes`  |
| `/pacientes`             | `PacienteListComponent` | Lista de pacientes             |
| `/pacientes/novo`        | `PacienteFormComponent` | Formulário de cadastro         |
| `/pacientes/:id`         | `PacienteDetailComponent` | Detalhes do paciente         |
| `/pacientes/:id/editar`  | `PacienteFormComponent` | Formulário de edição           |
| `/profissionais`         | `ProfissionalListComponent` | Lista de profissionais      |
| `/profissionais/novo`    | `ProfissionalFormComponent` | Formulário de cadastro      |
| `/profissionais/:id`     | `ProfissionalDetailComponent` | Detalhes do profissional  |
| `/profissionais/:id/editar` | `ProfissionalFormComponent` | Formulário de edição     |

---

## Componentes

### `AppComponent`
- Navbar com link para "Pacientes"
- `<router-outlet>` para renderização das páginas

### `PacienteListComponent`
- Tabela paginada de pacientes
- Filtros por nome, e-mail, CPF, telefone e status (ativos/inativos)
- Resumo do intervalo exibido e total de pacientes retornados pela API
- Seletor de itens por página com opções 5, 10, 20 e 50
- Navegação por página com botões anterior/próxima e janela de até 5 páginas visíveis
- Colunas: Nome, E-mail, CPF, Telefone, Status, Ações
- Ações: Ver, Editar, Inativar para ativos e Ativar para inativos
- Diálogo de confirmação inline para ativação e inativação
- Tratamento de erros e estado de carregamento

### `PacienteFormComponent`
- Modo duplo: cadastro e edição
- Reactive Form com seções: Dados Pessoais e Endereço
- Validações: campos obrigatórios, formato de e-mail, mínimo de 3 caracteres no nome
- Em modo edição: apenas CPF é desabilitado (e-mail pode ser atualizado)
- Feedback de erros em tempo real

### `PacienteDetailComponent`
- Exibição completa dos dados do paciente
- Badge de status: Ativo (verde) / Inativo (vermelho)
- Ações: Editar, Voltar; **Inativar** (se ativo) ou **Ativar** (se inativo)
- Diálogos de confirmação para ativação e inativação

### `ProfissionalListComponent`
- Tabela paginada de profissionais ativos
- Navegação por página com janela de até 5 páginas visíveis para evitar excesso de botões no DOM
- Guarda de limites na navegação, ignorando páginas negativas, fora do total retornado ou iguais à página atual
- Colunas: Nome, E-mail, Contrato, % por Aula, Ações
- Ações: Ver, Editar e Inativar
- Diálogo de confirmação inline para inativação
- Tratamento de erros e estado de carregamento

### `ConfirmarDialogComponent` _(shared)_
- Componente gerado, ainda não integrado (diálogos implementados inline nos componentes)

---

## Design System

Arquivo: `src/styles.scss`

### Variáveis CSS (Custom Properties)

```scss
--primary:      #6c63ff   /* Roxo principal */
--primary-dark: #574fd6
--secondary:    #4caf50   /* Verde */
--danger:       #e53935   /* Vermelho */
--text:         #333
--text-light:   #666
--border:       #ddd
--bg:           #f5f5f5
--white:        #fff
--radius:       6px
```

### Elementos Estilizados Globalmente
- Navbar
- Botões: primary, secondary, danger, outline
- Tabela com cabeçalho roxo e hover
- Formulários com seções e validação visual
- Cards de detalhe em grid
- Diálogos com overlay
- Paginação

---

## Scripts Disponíveis

```bash
npm start        # Servidor de desenvolvimento em http://localhost:4200
npm run build    # Build de produção em dist/carlessopilatesfe
npm run watch    # Build contínuo em modo desenvolvimento
npm test         # Execução dos testes unitários (Karma/Jasmine)
```

---

## Configuração de Build

| Ambiente    | Source Maps | Otimização | Output hashing |
|-------------|-------------|------------|----------------|
| Desenvolvimento | Sim     | Não        | Não            |
| Produção    | Não         | Sim        | Sim            |

**Budget de produção:**
- Initial bundle: máx. 500 KB
- Componente: máx. 4 KB

---

## Docker

O Dockerfile usa duas etapas:

| Etapa | Imagem | Responsabilidade |
|-------|--------|------------------|
| `build` | `node:22-alpine` | Instalar dependências com `npm ci` e gerar `dist/carlessopilatesfe/browser` |
| runtime | `nginx:1.27-alpine` | Servir a SPA e redirecionar `/api/*` para o backend |

### Execução com Compose

```bash
docker compose up --build
```

A aplicação fica disponível em `http://localhost:4200`. Por padrão, `BACKEND_URL` aponta para `http://host.docker.internal:8080`.

### Configurar backend

```bash
BACKEND_URL=http://api:8080 docker compose up --build
```

### Execução com Docker

```bash
docker build -t carlessopilatesfe .
docker run --rm -p 4200:80 \
  -e BACKEND_URL=http://host.docker.internal:8080 \
  --add-host=host.docker.internal:host-gateway \
  carlessopilatesfe
```

---

## Testes Unitários

Framework: **Karma + Jasmine**  
Comando: `npm test`

### Arquivos de teste

| Arquivo | Cobertura |
|---------|-----------|
| `app/app.component.spec.ts` | Renderização da navbar e router-outlet |
| `app/core/services/paciente.service.spec.ts` | Todos os métodos HTTP e parâmetros de filtro em `listar` |
| `app/core/services/profissional.service.spec.ts` | Métodos HTTP de profissionais, incluindo atualização via PUT |
| `app/pages/pacientes/paciente-list/paciente-list.component.spec.ts` | Carregamento, filtros, paginação, troca de tamanho de página, inativação, estados de erro |
| `app/pages/profissionais/profissional-list/profissional-list.component.spec.ts` | Carregamento, inativação, estados de erro e janela limitada de páginas visíveis |
| `app/pages/pacientes/paciente-form/paciente-form.component.spec.ts` | Modo criação e edição, validações, navegação, erros |
| `app/pages/pacientes/paciente-detail/paciente-detail.component.spec.ts` | Carregamento, inativação, estados de erro |

### Estratégia de mocking

- **Serviço HTTP:** `HttpClientTestingModule` + `HttpTestingController` nos testes de serviço
- **PacienteService nos componentes:** `jasmine.createSpyObj` com retorno via `of()` ou `throwError()`
- **Router:** `RouterTestingModule` + `spyOn(router, 'navigate')`
- **ActivatedRoute:** objeto literal com `snapshot.paramMap.get()`

---

## Status do Projeto

### Implementado
- CRUD completo de pacientes
- Filtros na listagem de pacientes por nome, e-mail, CPF, telefone e status
- Paginação da consulta de pacientes com resumo, navegação anterior/próxima, janela de páginas e tamanho de página configurável
- CRUD completo de profissionais com atualização via PUT
- Paginação server-side em pacientes e profissionais, com janela limitada de páginas visíveis e bloqueio de navegação fora dos limites
- Validação de formulários
- Feedback de erros e loading
- Integração com API REST (contratos alinhados com backend v2)
- Design responsivo
- Ativação e inativação de pacientes via PATCH
- E-mail mutável na edição (somente CPF é imutável)
- Módulo Planos: listagem, criação com seleção de dias e validação de frequência
- Módulo Pagamentos: listagem, criação e confirmação de pagamento (PAGO)
- Módulo Aulas: listagem e confirmação de presença
- Navegação contextual na tela de detalhe do paciente (Planos / Pagamentos / Aulas)
- Dockerfile, Docker Compose e Nginx para execução do frontend em container
- Testes unitários (serviço e todos os componentes de página)

### Não implementado / Próximos passos
- Autenticação e autorização
- Configuração avançada de ambientes Angular, caso seja necessária no futuro
- Componente `ConfirmarDialog` integrado
- Testes E2E
- Busca e filtros nas demais listagens
- Animações e transições
