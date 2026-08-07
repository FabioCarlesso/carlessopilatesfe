# Arquitetura

SPA Angular com componentes standalone, organizada em três camadas dentro de
`src/app`.

## Camadas

| Camada | Responsabilidade |
|---|---|
| `core/` | Integração com a API e regras de acesso: `models/` (DTOs e interfaces), `services/` (um serviço por recurso REST), `interceptors/` (token e tratamento de `403`) e `guards/` (`authGuard` e `roleGuard`). |
| `pages/` | Uma pasta por área funcional, com um componente por tela. Componentes de página orquestram serviços do `core` e não falam com a API diretamente. |
| `shared/` | Reuso entre páginas: `components/` (componentes de UI), `services/` (utilitários injetáveis), `pipes/` e `utils/` (funções puras, sem dependência do DOM e com cobertura própria). |

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
│   │   │   ├── interceptors/       # HTTP interceptors (auth e 403)
│   │   │   └── guards/             # Route guards (auth e role)
│   │   ├── pages/
│   │   │   ├── admin/              # Hub administrativo e gestão de usuários
│   │   │   ├── aulas/              # Aulas geradas e confirmação de presença
│   │   │   ├── auth/               # Login, recuperação de senha e tela 403
│   │   │   ├── dashboard/          # Tela inicial com indicadores
│   │   │   ├── pacientes/          # CRUD e prontuário completo do paciente
│   │   │   ├── pagamentos/         # Registro e confirmação de pagamentos
│   │   │   ├── perfil/             # Troca de senha do usuário autenticado
│   │   │   ├── planos/             # Planos do paciente
│   │   │   ├── profissionais/      # CRUD de profissionais
│   │   │   └── relatorios/         # Relatórios administrativos
│   │   └── shared/
│   │       ├── components/         # Componentes reutilizáveis
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

## Proxy de desenvolvimento

O Angular CLI redireciona `/api/*` → `http://localhost:8080/*` via `proxy.conf.json`, eliminando problemas de CORS em ambiente local.

Em Docker, o proxy equivalente é feito pelo Nginx em `nginx/default.conf.template`, usando a variável `BACKEND_URL`.
