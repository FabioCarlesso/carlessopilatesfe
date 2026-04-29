# Carlesso Pilates — Frontend

Interface web para gestão administrativa de um estúdio de pilates, desenvolvida em **Angular 19**.

## Visão Geral

A aplicação oferece CRUDs administrativos para pacientes e profissionais, fluxos de planos, pagamentos e aulas, além de relatórios administrativos. Consome uma API REST (Spring Boot) via proxy do Angular CLI.

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
| Estilos    | SCSS + Design Tokens          |
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
│   ├── services/                   # Integração com a API REST
│   ├── interceptors/               # HTTP interceptors (auth)
│   └── guards/                     # Route guards (auth)
├── pages/auth/login/               # Tela de login
├── pages/pacientes/
│   ├── paciente-list/              # Listagem paginada com filtros
│   ├── paciente-form/              # Cadastro e edição
│   └── paciente-detail/            # Visualização detalhada
├── pages/profissionais/            # CRUD de profissionais
├── pages/relatorios/               # Relatórios administrativos
└── shared/components/              # Componentes reutilizáveis
src/styles/
└── _tokens.scss                    # Tokens do Design System Carlesso
assets/                             # Referências estáticas do Design System
```

---

## Design System

Os arquivos de referência do Design System ficam em `assets/`, incluindo `Fundacao.html`, `Componentes.html`, `Marca.html`, `tokens.css` e os auxiliares React usados pelos protótipos. As páginas usam `DesignCanvas`, `DCSection`, `DCArtboard`, `BrowserWindow`, `Frame` e painel de tweaks próprios.

No Angular, os tokens foram migrados para `src/styles/_tokens.scss` e importados por `src/styles.scss`. O sistema usa `data-theme="light|dark"` e `data-density="default|compact|comfortable"` no `documentElement`, aplicado pelo `StylePreferencesService`.

Componentes globais como botões, inputs, cards, badges, tabelas, paginação, alertas e diálogos consomem tokens semânticos de cor, tipografia, raio, sombra e densidade.

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
- `src/app/core/services/relatorio.service.spec.ts`
- `src/app/pages/pacientes/paciente-list/paciente-list.component.spec.ts`
- `src/app/pages/pacientes/paciente-form/paciente-form.component.spec.ts`
- `src/app/pages/pacientes/paciente-detail/paciente-detail.component.spec.ts`
- `src/app/pages/profissionais/profissional-list/profissional-list.component.spec.ts`
- `src/app/pages/profissionais/profissional-form/profissional-form.component.spec.ts`
- `src/app/pages/profissionais/profissional-detail/profissional-detail.component.spec.ts`
- `src/app/pages/planos/plano-form/plano-form.component.spec.ts`
- `src/app/pages/planos/plano-list/plano-list.component.spec.ts`
- `src/app/pages/relatorios/relatorio-list/relatorio-list.component.spec.ts`
- `src/app/pages/relatorios/profissional-pagamento-relatorio/profissional-pagamento-relatorio.component.spec.ts`
- `src/app/pages/relatorios/nfse-relatorio/nfse-relatorio.component.spec.ts`
- `src/app/pages/auth/login/login.component.spec.ts`
- `src/app/core/services/auth.service.spec.ts`
- `src/app/core/services/style-preferences.service.spec.ts`
- `src/app/core/interceptors/auth.interceptor.spec.ts`
- `src/app/core/guards/auth.guard.spec.ts`

---

## Módulos implementados

| Módulo | Descrição |
|--------|-----------|
| **Pacientes** | CRUD completo com ativação/inativação, filtros por nome, e-mail, CPF, telefone e status, e paginação com tamanho configurável |
| **Profissionais** | CRUD completo com ativação/inativação, atualização via PUT e paginação com janela limitada, guarda de limites e sincronização dos metadados retornados pela API |
| **Planos** | Criação de planos (mensal/trimestral/anual) com frequência semanal, seleção de dias e labels centralizados no model |
| **Pagamentos** | Registro e confirmação de pagamentos; geração de aulas é automática no backend |
| **Aulas** | Visualização das aulas geradas com estado de carregamento inicial, e confirmação de presença com vínculo do profissional responsável |
| **Relatórios** | Seção administrativa com relatório de pagamento de profissional por período, relatório de emissão de NFSEs por competência e exportações PDF/XLSX/CSV |
| **Autenticação** | Login com JWT via `POST /api/auth/login`, guard de rotas, interceptor HTTP, logout e tratamento de `401` por token expirado |

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
| `/relatorios`           | Seção de relatórios                         |
| `/relatorios/pagamento-profissional` | Relatório de pagamento de profissional |
| `/relatorios/nfse` | Relatório de emissão de NFSEs |
| `/login` | Tela de autenticação (pública) |

Na listagem de pacientes, os filtros enviam os parâmetros `nome`, `email`, `cpf`, `telefone` e `ativo` para a API junto de `page`, `size` e `sort=nome`. O status padrão é **Ativos**. A paginação exibe o intervalo atual, total de pacientes, navegação por página, botões anterior/próxima e seletor de itens por página. Os metadados são lidos da estrutura aninhada `page.page.*` do Spring Boot 3.x, com fallback para o estado atual quando algum atributo está ausente, evitando `NaN` no resumo e seletor vazio. A ação da linha muda conforme o status: **Inativar** para pacientes ativos, **Ativar** para inativos. A tela de detalhe também exibe links de navegação para Planos, Pagamentos e Aulas do paciente.

A autenticação usa JWT armazenado em `localStorage`. O interceptor adiciona `Authorization: Bearer <token>` nas chamadas protegidas, ignora o endpoint público de login e, ao receber `401` fora do login, remove o token e redireciona para `/login`. Controle por perfil e tratamento dedicado de `403` ainda não foram implementados.

Na listagem de profissionais, a paginação server-side renderiza no máximo 5 botões de página por vez, evitando excesso de elementos no DOM em datasets grandes. A navegação ignora páginas negativas, fora do total retornado pela API ou iguais à página atual, evitando requisições desnecessárias ou fora dos limites. Após cada resposta, a tela sincroniza `currentPage` e `pageSize` com `page.number` e `page.size` retornados pela API, preservando o estado local como fallback quando algum metadado estiver ausente.
Quando o usuário inativa o último item de uma página e o total de páginas é reduzido (ex.: página 16 deixa de existir), a tela retorna automaticamente para a última página válida para evitar listagem vazia.

As rotas que recebem identificadores numéricos validam os parâmetros antes de chamar a API. Apenas inteiros positivos seguros são aceitos; URLs com identificadores ausentes, não numéricos ou em formato inválido exibem a mensagem **Identificador inválido.** e não disparam requisições com `NaN` no caminho.

| Caminho | Função |
|---------|--------|
| `/planos/paciente/:pacienteId` | Lista de planos do paciente |
| `/planos/novo/:pacienteId` | Criar novo plano |
| `/pagamentos/paciente/:pacienteId` | Lista de pagamentos |
| `/pagamentos/novo/:pacienteId` | Registrar novo pagamento |
| `/aulas/paciente/:pacienteId` | Lista de aulas geradas |
| `/aulas/pagamento/:pagamentoId` | Lista de aulas por pagamento |

As telas de planos reutilizam as constantes `TIPO_LABEL`, `FREQUENCIA_LABEL` e `DIAS_SEMANA_LABEL` exportadas por `src/app/core/models/plano.ts`, mantendo as opções e exibições alinhadas entre formulário, listagem e demais fluxos.

A tela de aulas carrega os profissionais ativos e exige a seleção do profissional antes de marcar uma aula pendente como realizada. Ao abrir a rota por pagamento, a tela exibe o estado de carregamento enquanto busca o pagamento inicial para resolver o paciente vinculado e então listar as aulas. A confirmação envia `PATCH /aulas/{id}/realizar?profissionalId={id}`; aulas já realizadas exibem o profissional vinculado quando retornado pela API.

O relatório de pagamento de profissional carrega os profissionais ativos para seleção, exige período inicial e final, valida que a data inicial não seja posterior à final e consulta `GET /profissionais/{id}/relatorio-pagamento?inicio=YYYY-MM-DD&fim=YYYY-MM-DD`. O resultado exibe totais consolidados, resumo por pagamento e detalhamento por aula realizada. A mesma tela exporta o relatório em PDF e Excel/XLSX pelos endpoints `GET /profissionais/{id}/relatorio-pagamento/pdf?inicio=YYYY-MM-DD&fim=YYYY-MM-DD` e `GET /profissionais/{id}/relatorio-pagamento/xlsx?inicio=YYYY-MM-DD&fim=YYYY-MM-DD`, tratando a resposta como `Blob`, usando o nome retornado em `Content-Disposition` quando disponível e bloqueando novos cliques enquanto o arquivo é gerado.

O relatório de emissão de NFSEs exige competência no formato `MM/AAAA`, permite filtrar por nota anterior emitida e consome o endpoint do backend `GET /api/relatorios/nfse?competencia=MM/AAAA`. Como o proxy local e o Nginx removem o primeiro prefixo `/api`, o serviço Angular chama `/api/api/relatorios/nfse` para preservar o `/api` esperado pelo backend. O resultado exibe nome, CPF/CNPJ, valor pago, competência, descrição do serviço, nota anterior emitida, data de pagamento e observações. A tela também exporta CSV e Excel/XLSX pelo mesmo endpoint com o parâmetro `formato=CSV` ou `formato=XLSX`.

---

## Proxy de desenvolvimento

O Angular CLI redireciona `/api/*` → `http://localhost:8080/*` via `proxy.conf.json`, eliminando problemas de CORS em ambiente local.

Em Docker, o proxy equivalente é feito pelo Nginx em `nginx/default.conf.template`, usando a variável `BACKEND_URL`.
