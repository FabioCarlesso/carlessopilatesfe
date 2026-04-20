# Carlesso Pilates — Documentação do Frontend

## Visão Geral

**Projeto:** Carlesso Pilates Frontend  
**Versão:** 0.0.0  
**Tecnologia:** Angular 19 (SPA)  
**Propósito:** Interface web para gestão de pacientes de um estúdio de pilates.  
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

---

## Estrutura de Pastas

```
carlessopilatesfe/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── models/
│   │   │   │   └── paciente.ts          # DTOs e interfaces de dados
│   │   │   └── services/
│   │   │       └── paciente.service.ts  # Serviço de integração com a API
│   │   ├── pages/
│   │   │   └── pacientes/
│   │   │       ├── paciente-list/       # Listagem paginada de pacientes
│   │   │       ├── paciente-form/       # Formulário de cadastro e edição
│   │   │       └── paciente-detail/     # Visualização detalhada
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
├── angular.json                         # Configuração do Angular CLI
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
Payload para atualização (email e CPF são imutáveis).
```typescript
interface PacienteUpdateDTO {
  nome?: string;
  telefone?: string;
  dataNascimento?: string;
  endereco?: EnderecoDTO;
}
```

### `Page<T>`
Wrapper de resposta paginada da API.
```typescript
interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
```

---

## Serviços

### `PacienteService`
Arquivo: `src/app/core/services/paciente.service.ts`  
Injetável em toda a aplicação (`providedIn: 'root'`).

**URL base:** `http://localhost:8080/pacientes`

| Método            | Endpoint HTTP               | Descrição                        |
|-------------------|-----------------------------|----------------------------------|
| `listar(page, size)` | `GET /pacientes?page&size&sort=nome` | Lista pacientes paginados  |
| `buscar(id)`      | `GET /pacientes/{id}`       | Busca paciente por ID            |
| `cadastrar(dto)`  | `POST /pacientes`           | Cria novo paciente               |
| `atualizar(id, dto)` | `PUT /pacientes/{id}`    | Atualiza dados do paciente       |
| `inativar(id)`    | `DELETE /pacientes/{id}`    | Inativa paciente (soft delete)   |

---

## Rotas

Arquivo: `src/app/app.routes.ts`  
Todos os componentes são carregados com **lazy loading** via `loadComponent()`.

| Caminho                  | Componente              | Função                         |
|--------------------------|-------------------------|--------------------------------|
| `/`                      | —                       | Redireciona para `/pacientes`  |
| `/pacientes`             | `PacienteListComponent` | Lista de pacientes             |
| `/pacientes/novo`        | `PacienteFormComponent` | Formulário de cadastro         |
| `/pacientes/:id`         | `PacienteDetailComponent` | Detalhes do paciente         |
| `/pacientes/:id/editar`  | `PacienteFormComponent` | Formulário de edição           |

---

## Componentes

### `AppComponent`
- Navbar com link para "Pacientes"
- `<router-outlet>` para renderização das páginas

### `PacienteListComponent`
- Tabela paginada de pacientes ativos
- Colunas: Nome, E-mail, CPF, Telefone, Ações
- Ações: Ver, Editar, Inativar
- Diálogo de confirmação inline para inativação
- Tratamento de erros e estado de carregamento

### `PacienteFormComponent`
- Modo duplo: cadastro e edição
- Reactive Form com seções: Dados Pessoais e Endereço
- Validações: campos obrigatórios, formato de e-mail, mínimo de 3 caracteres no nome
- Em modo edição: e-mail e CPF desabilitados (read-only)
- Feedback de erros em tempo real

### `PacienteDetailComponent`
- Exibição completa dos dados do paciente
- Badge de status: Ativo (verde) / Inativo (vermelho)
- Ações: Editar, Inativar, Voltar
- Diálogo de confirmação para inativação

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

## Testes Unitários

Framework: **Karma + Jasmine**  
Comando: `npm test`

### Arquivos de teste

| Arquivo | Cobertura |
|---------|-----------|
| `app/app.component.spec.ts` | Renderização da navbar e router-outlet |
| `app/core/services/paciente.service.spec.ts` | Todos os métodos HTTP (listar, buscar, cadastrar, atualizar, inativar) |
| `app/pages/pacientes/paciente-list/paciente-list.component.spec.ts` | Carregamento, paginação, inativação, estados de erro |
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
- Paginação server-side
- Validação de formulários
- Feedback de erros e loading
- Integração com API REST
- Design responsivo
- Testes unitários (serviço e todos os componentes de página)

### Não implementado / Próximos passos
- Autenticação e autorização
- Módulos adicionais: aulas, agendamentos, financeiro
- Variável de ambiente para URL da API (atualmente hardcoded via proxy)
- Componente `ConfirmarDialog` integrado
- Testes E2E
- Busca e filtros na listagem
- Animações e transições
