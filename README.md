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

## Stack

| Camada     | Tecnologia                    |
|------------|-------------------------------|
| Framework  | Angular 19.2 (standalone)     |
| Linguagem  | TypeScript 5.7                |
| Estilos    | SCSS                          |
| Forms      | Reactive Forms                |
| HTTP       | HttpClient + proxy `/api/*`   |
| Testes     | Karma + Jasmine               |

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

## Rotas

| Caminho                 | Função                                      |
|-------------------------|---------------------------------------------|
| `/`                     | Redireciona para `/pacientes`               |
| `/pacientes`            | Lista de pacientes ativos (paginada)        |
| `/pacientes/novo`       | Formulário de cadastro                      |
| `/pacientes/:id`        | Detalhes do paciente (ativo ou inativo)     |
| `/pacientes/:id/editar` | Formulário de edição                        |

Na tela de detalhe, o botão de ação muda conforme o status: **Inativar** para pacientes ativos, **Ativar** para inativos.

---

## Proxy de desenvolvimento

O Angular CLI redireciona `/api/*` → `http://localhost:8080/*` via `proxy.conf.json`, eliminando problemas de CORS em ambiente local.
