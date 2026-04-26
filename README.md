# Carlesso Pilates — Frontend

Interface web para gestão administrativa de um estúdio de pilates, desenvolvida em **Angular 19**.

## Visão Geral

A aplicação oferece CRUDs administrativos para pacientes e profissionais, além de fluxos de planos, pagamentos e aulas. Consome uma API REST (Spring Boot) via proxy do Angular CLI.

**Documentação detalhada:** [`docs/documentacao.md`](docs/documentacao.md)  
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
| Framework  | Angular 19.2 (standalone)     |
| Linguagem  | TypeScript 5.7                |
| Estilos    | SCSS                          |
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
│   └── services/                   # Integração com a API REST
├── pages/pacientes/
│   ├── paciente-list/              # Listagem paginada com filtros
│   ├── paciente-form/              # Cadastro e edição
│   └── paciente-detail/            # Visualização detalhada
├── pages/profissionais/            # CRUD de profissionais
└── shared/components/              # Componentes reutilizáveis
```

---

## Testes

Os testes unitários cobrem o serviço e todos os componentes de página:

```bash
npm test
```

Arquivos de teste:
- `src/app/app.component.spec.ts`
- `src/app/core/services/paciente.service.spec.ts`
- `src/app/core/services/profissional.service.spec.ts`
- `src/app/pages/pacientes/paciente-list/paciente-list.component.spec.ts`
- `src/app/pages/pacientes/paciente-form/paciente-form.component.spec.ts`
- `src/app/pages/pacientes/paciente-detail/paciente-detail.component.spec.ts`
- `src/app/pages/profissionais/profissional-list/profissional-list.component.spec.ts`
- `src/app/pages/profissionais/profissional-form/profissional-form.component.spec.ts`
- `src/app/pages/profissionais/profissional-detail/profissional-detail.component.spec.ts`

---

## Módulos implementados

| Módulo | Descrição |
|--------|-----------|
| **Pacientes** | CRUD completo com ativação/inativação, filtros por nome, e-mail, CPF, telefone e status, e paginação com tamanho configurável |
| **Profissionais** | CRUD completo com ativação/inativação, atualização via PUT e paginação com janela limitada de páginas |
| **Planos** | Criação de planos (mensal/trimestral/anual) com frequência semanal e seleção de dias |
| **Pagamentos** | Registro e confirmação de pagamentos; geração de aulas é automática no backend |
| **Aulas** | Visualização das aulas geradas e confirmação de presença |

---

## Rotas

| Caminho                 | Função                                      |
|-------------------------|---------------------------------------------|
| `/`                     | Redireciona para `/pacientes`               |
| `/pacientes`            | Lista de pacientes com filtros e paginação  |
| `/pacientes/novo`       | Formulário de cadastro                      |
| `/pacientes/:id`        | Detalhes do paciente (ativo ou inativo)     |
| `/pacientes/:id/editar` | Formulário de edição                        |
| `/profissionais`        | Lista de profissionais ativos (paginada)    |
| `/profissionais/novo`   | Formulário de cadastro de profissional      |
| `/profissionais/:id`    | Detalhes do profissional                    |
| `/profissionais/:id/editar` | Formulário de edição de profissional    |

Na listagem de pacientes, os filtros enviam os parâmetros `nome`, `email`, `cpf`, `telefone` e `ativo` para a API junto de `page`, `size` e `sort=nome`. O status padrão é **Ativos**. A paginação exibe o intervalo atual, total de pacientes, navegação por página, botões anterior/próxima e seletor de itens por página. A ação da linha muda conforme o status: **Inativar** para pacientes ativos, **Ativar** para inativos. A tela de detalhe também exibe links de navegação para Planos, Pagamentos e Aulas do paciente.

Na listagem de profissionais, a paginação server-side renderiza no máximo 5 botões de página por vez, evitando excesso de elementos no DOM em datasets grandes.

As rotas que recebem identificadores numéricos validam os parâmetros antes de chamar a API. URLs com identificadores ausentes ou não numéricos exibem a mensagem **Identificador inválido.** e não disparam requisições com `NaN` no caminho.

| Caminho | Função |
|---------|--------|
| `/planos/paciente/:pacienteId` | Lista de planos do paciente |
| `/planos/novo/:pacienteId` | Criar novo plano |
| `/pagamentos/paciente/:pacienteId` | Lista de pagamentos |
| `/pagamentos/novo/:pacienteId` | Registrar novo pagamento |
| `/aulas/paciente/:pacienteId` | Lista de aulas geradas |
| `/aulas/pagamento/:pagamentoId` | Lista de aulas por pagamento |

---

## Proxy de desenvolvimento

O Angular CLI redireciona `/api/*` → `http://localhost:8080/*` via `proxy.conf.json`, eliminando problemas de CORS em ambiente local.

Em Docker, o proxy equivalente é feito pelo Nginx em `nginx/default.conf.template`, usando a variável `BACKEND_URL`.
