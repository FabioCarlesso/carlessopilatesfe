# Carlesso Pilates — Frontend

Interface web para gestão administrativa de um estúdio de pilates, desenvolvida em **Angular 19**.

## Visão Geral

A aplicação oferece um CRUD completo de pacientes com listagem paginada, formulário de cadastro/edição e visualização detalhada. Consome uma API REST (Spring Boot) via proxy do Angular CLI.

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
│   ├── models/paciente.ts          # DTOs e interfaces
│   └── services/paciente.service.ts # Integração com a API REST
├── pages/pacientes/
│   ├── paciente-list/              # Listagem paginada
│   ├── paciente-form/              # Cadastro e edição
│   └── paciente-detail/            # Visualização detalhada
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
- `src/app/pages/pacientes/paciente-list/paciente-list.component.spec.ts`
- `src/app/pages/pacientes/paciente-form/paciente-form.component.spec.ts`
- `src/app/pages/pacientes/paciente-detail/paciente-detail.component.spec.ts`

---

## Módulos implementados

| Módulo | Descrição |
|--------|-----------|
| **Pacientes** | CRUD completo com ativação/inativação |
| **Planos** | Criação de planos (mensal/trimestral/anual) com frequência semanal e seleção de dias |
| **Pagamentos** | Registro e confirmação de pagamentos; geração de aulas é automática no backend |
| **Aulas** | Visualização das aulas geradas e confirmação de presença |

---

## Rotas

| Caminho                 | Função                                      |
|-------------------------|---------------------------------------------|
| `/`                     | Redireciona para `/pacientes`               |
| `/pacientes`            | Lista de pacientes ativos (paginada)        |
| `/pacientes/novo`       | Formulário de cadastro                      |
| `/pacientes/:id`        | Detalhes do paciente (ativo ou inativo)     |
| `/pacientes/:id/editar` | Formulário de edição                        |

Na tela de detalhe, o botão de ação muda conforme o status: **Inativar** para pacientes ativos, **Ativar** para inativos. A tela de detalhe também exibe links de navegação para Planos, Pagamentos e Aulas do paciente.

| Caminho | Função |
|---------|--------|
| `/pacientes/:id/planos` | Lista de planos do paciente |
| `/pacientes/:id/planos/novo` | Criar novo plano |
| `/pacientes/:id/pagamentos` | Lista de pagamentos |
| `/pacientes/:id/pagamentos/novo` | Registrar novo pagamento |
| `/pacientes/:id/aulas` | Lista de aulas geradas |

---

## Proxy de desenvolvimento

O Angular CLI redireciona `/api/*` → `http://localhost:8080/*` via `proxy.conf.json`, eliminando problemas de CORS em ambiente local.

Em Docker, o proxy equivalente é feito pelo Nginx em `nginx/default.conf.template`, usando a variável `BACKEND_URL`.
