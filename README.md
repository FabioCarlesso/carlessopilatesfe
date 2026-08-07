# Carlesso Pilates — Frontend

Interface web para gestão administrativa de um estúdio de pilates, desenvolvida em **Angular 22**.

A aplicação oferece dashboard de indicadores, prontuário completo do paciente, CRUDs administrativos, fluxos de planos, pagamentos e aulas, além de relatórios. Consome uma API REST (Spring Boot) via proxy do Angular CLI.

## Stack

| Camada     | Tecnologia                    |
|------------|-------------------------------|
| Framework  | Angular 22.1 (standalone, control flow em bloco) |
| Linguagem  | TypeScript 6.0                |
| Estilos    | SCSS + Design Tokens          |
| Forms      | Reactive Forms                |
| HTTP       | HttpClient + proxy `/api/*`   |
| Testes     | Karma + Jasmine               |
| Container  | Docker + Nginx                |

## Pré-requisitos

- Node.js 22.22.3+ (ou 24.15.0+), conforme o `engines` do `package.json` — mesmo piso usado no build Docker e na CI
- Angular CLI: `npm install -g @angular/cli`
- Backend rodando em `http://localhost:8080`
- Docker e Docker Compose, para execução em container

## Instalação

```bash
npm install
npm start
```

A aplicação fica disponível em `http://localhost:4200`.

## Scripts

| Comando          | Descrição                                          |
|------------------|----------------------------------------------------|
| `npm start`      | Servidor de desenvolvimento em http://localhost:4200 |
| `npm test`       | Executa testes unitários (Karma + Jasmine)         |
| `npm run test:ci`| Testes em Chrome headless, sem watch, com cobertura (usado na CI) |
| `npm run lint`   | Análise estática com ESLint (angular-eslint) + `lint:tokens`  |
| `npm run lint:tokens` | Verifica que todo `var(--token)` de `src/` aponta para um token declarado |
| `npm run build`  | Build de produção em `dist/carlessopilatesfe`      |
| `npm run watch`  | Build contínuo em modo desenvolvimento             |

## Docker

```bash
# Backend local em http://localhost:8080
docker compose up --build
```

A aplicação fica disponível em `http://localhost:4200`. Para apontar para outro backend:

```bash
BACKEND_URL=http://api:8080 docker compose up --build
```

Detalhes de build sem Compose e do deploy na Vercel em [`docs/deploy.md`](docs/deploy.md).

## Documentação

| Arquivo | O que contém |
|---|---|
| [`docs/arquitetura.md`](docs/arquitetura.md) | Camadas, estrutura de pastas e proxy de desenvolvimento |
| [`docs/funcionalidades.md`](docs/funcionalidades.md) | Módulos e o comportamento de cada tela |
| [`docs/rotas.md`](docs/rotas.md) | Mapa completo de rotas e perfis exigidos |
| [`docs/design-system.md`](docs/design-system.md) | Tokens, nomenclatura, responsividade e tema |
| [`docs/desenvolvimento.md`](docs/desenvolvimento.md) | Testes, CI e CodeGraph |
| [`docs/deploy.md`](docs/deploy.md) | Docker/Nginx e Vercel |
| [`docs/context.md`](docs/context.md) | Histórico de decisões técnicas |
| [`CLAUDE.md`](CLAUDE.md) | Contexto de entrada para agentes de IA |

Antes de documentar uma mudança, veja em [`docs/README.md`](docs/README.md) qual arquivo é o dono do assunto.

## Licença

Este projeto é distribuído sob a licença MIT. Consulte o arquivo [`LICENSE`](LICENSE) para mais detalhes.
