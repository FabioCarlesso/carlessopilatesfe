# Arquitetura

SPA Angular com componentes standalone, organizada em três camadas dentro de
`src/app`.

## Camadas

| Camada | Responsabilidade |
|---|---|
| `core/` | Integração com a API e regras de acesso: `models/` (DTOs e interfaces), `services/` (um serviço por recurso REST), `validators/` (`ValidatorFn` reutilizáveis de formulário), `interceptors/` (token, renovação de sessão e tratamento de `403`) e `guards/` (`authGuard` e `roleGuard`). |
| `pages/` | Uma pasta por área funcional, com um componente por tela. Componentes de página orquestram serviços do `core` e não falam com a API diretamente. |
| `shared/` | Reuso entre páginas: `components/` (componentes de UI), `directives/` (diretivas de atributo, como a máscara de entrada), `services/` (utilitários injetáveis), `pipes/` e `utils/` (funções puras, sem dependência do DOM e com cobertura própria). |

Lógica que não depende do DOM — aritmética de datas, conversão de coordenadas,
cálculo de métricas, extração de mensagem de erro — vive em `shared/utils/` para
ser testada isoladamente do componente que a consome.

## Estrutura de pastas

```
.
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── models/             # DTOs e interfaces
│   │   │   ├── services/           # Integração com a API REST
│   │   │   ├── validators/         # ValidatorFn reutilizáveis de formulário
│   │   │   ├── interceptors/       # HTTP interceptors (auth e 403)
│   │   │   └── guards/             # Route guards (auth e role)
│   │   ├── pages/
│   │   │   ├── admin/              # Hub administrativo, usuários e bloqueios de agenda
│   │   │   ├── agenda/             # Agenda geral do estúdio (todos os pacientes)
│   │   │   ├── aulas/              # Aulas geradas e confirmação de presença
│   │   │   ├── auth/               # Login, recuperação de senha e tela 403
│   │   │   ├── dashboard/          # Tela inicial com indicadores
│   │   │   ├── financeiro/         # Gestão de inadimplência e contatos de cobrança
│   │   │   ├── lista-espera/       # Fila de interessados por dia da semana e horário
│   │   │   ├── pacientes/          # CRUD e prontuário completo do paciente
│   │   │   ├── pagamentos/         # Registro e confirmação de pagamentos
│   │   │   ├── perfil/             # Troca de senha do usuário autenticado
│   │   │   ├── planos/             # Planos do paciente
│   │   │   ├── profissionais/      # CRUD de profissionais
│   │   │   └── relatorios/         # Relatórios administrativos
│   │   └── shared/
│   │       ├── components/         # Componentes reutilizáveis
│   │       ├── directives/         # Diretivas de atributo (máscara de entrada)
│   │       ├── pipes/              # Pipes de formatação
│   │       ├── services/           # Serviços utilitários injetáveis
│   │       └── utils/              # Funções utilitárias puras
│   ├── styles/
│   │   └── _tokens.scss            # Tokens do Design System Carlesso
│   ├── testing/                    # Helpers compartilhados pelos specs
│   └── styles.scss
├── assets/                         # Referências estáticas do Design System
├── nginx/                          # Template de configuração do Nginx (Docker)
├── public/                         # Arquivos servidos como estão
└── scripts/
    └── lint-tokens.mjs             # Validação dos var(--token) de src/
```

A pasta `pages/pacientes/` concentra o prontuário e é, de longe, a maior:
listagem, cadastro, detalhe, anamnese, avaliação fisioterapêutica, avaliação
postural, sessões, evoluções, calendário, planos de tratamento, reavaliações e
NFSEs emitidas. O detalhe de cada uma está em
[`funcionalidades.md`](funcionalidades.md).

## Atalhos de teclado

Atalhos globais passam por um único ouvinte: o `AtalhosTecladoService`
(`shared/services`), instanciado pelo `AppComponent`, escuta o `keydown` do
documento. Componentes não registram `document:keydown` para atalhos próprios:
quando o atalho mexe num componente (o foco da busca global), o serviço expõe
um evento (`focoBusca$`) e o componente dono do elemento o executa. O catálogo
e as regras puras ficam em `shared/utils/atalhos-teclado.ts`. Para acrescentar
um atalho, inclua-o em `ATALHOS` com o mesmo grupo de `PAPEIS` da rota; o
comportamento está em [`funcionalidades.md`](funcionalidades.md#atalhos-de-teclado).

## Sessão e interceptors HTTP

`app.config.ts` registra, nesta ordem, o `authInterceptor` e o
`forbiddenInterceptor`. O fluxo de uma requisição protegida é:

1. O `authInterceptor` anexa `Authorization: Bearer <accessToken>`. Os endpoints
   `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password` e
   `/auth/reset-password` passam direto, sem header e sem renovação.
2. Em `401`, ele pede um token novo ao `AuthService.refresh()`, que chama
   `POST /auth/refresh` e grava o novo par (`accessToken` + `refreshToken`). O
   refresh é **single-flight**: enquanto um está em andamento, os outros `401`
   recebem o resultado dele. Se o token guardado já mudou desde que a requisição
   saiu, o novo é reaproveitado sem outro refresh.
3. A requisição é repetida uma única vez com o token novo, chamando direto o
   próximo handler; um novo `401` nela sobe para a tela.
4. Se o refresh for recusado (`400`/`401`) ou não houver refresh token,
   `AuthService.logout()` limpa a sessão e leva para `/login`. Falhas
   transitórias (rede, `5xx`) só propagam o erro.
5. O `forbiddenInterceptor` trata `403`, que nunca dispara refresh.

O `logout()` dispara `POST /auth/logout` sem esperar a resposta: a sessão local é
limpa mesmo que a chamada falhe. O porquê de cada escolha está em
[`context.md`](context.md#autenticação-jwt).

## Proxy de desenvolvimento

O Angular CLI redireciona `/api/*` → `http://localhost:8080/*` via `proxy.conf.json`, eliminando problemas de CORS em ambiente local.

Em Docker, o proxy equivalente é feito pelo Nginx em `nginx/default.conf.template`, usando a variável `BACKEND_URL`.
