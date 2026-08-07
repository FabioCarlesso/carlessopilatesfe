# Documentação — Carlesso Pilates Frontend

| Arquivo | O que contém |
|---|---|
| [`arquitetura.md`](arquitetura.md) | Camadas `core`/`pages`/`shared`, estrutura de pastas e proxy de desenvolvimento |
| [`funcionalidades.md`](funcionalidades.md) | Módulos implementados e o comportamento de cada tela: endpoints, validações e tratamento de erro |
| [`rotas.md`](rotas.md) | Mapa completo de rotas e perfis exigidos |
| [`design-system.md`](design-system.md) | Tokens, nomenclatura, `lint:tokens`, responsividade e tema claro/escuro |
| [`desenvolvimento.md`](desenvolvimento.md) | Testes, integração contínua e CodeGraph |
| [`deploy.md`](deploy.md) | Docker/Nginx e Vercel |
| [`context.md`](context.md) | Histórico de decisões técnicas e evolução do projeto |
| [`../CLAUDE.md`](../CLAUDE.md) | Contexto de entrada para agentes de IA: comandos, camadas e regra dos tokens |

Para instalar e rodar o projeto, veja o [README](../README.md).

## Onde documentar cada mudança

O `README.md` já foi um arquivo de 441 linhas porque toda feature nova acrescentava
um parágrafo a ele. Para não repetir isso, cada tipo de informação tem um dono:

| Se você mudou… | Documente em |
|---|---|
| Comportamento de uma tela, endpoint consumido, validação, tratamento de erro | `docs/funcionalidades.md` |
| Uma rota (nova, removida ou com perfil diferente) | `docs/rotas.md` |
| Estrutura de pastas, camadas ou proxy | `docs/arquitetura.md` |
| Token, regra de estilo, responsividade ou tema | `docs/design-system.md` |
| Pipeline de CI, testes ou ferramental | `docs/desenvolvimento.md` |
| Docker, Nginx ou Vercel | `docs/deploy.md` |
| Uma decisão técnica e o porquê dela | `docs/context.md` |
| **Como instalar ou rodar o projeto** | `README.md` — e só nesse caso |

Regra prática: se a informação não ajuda alguém a colocar o projeto no ar nos
primeiros cinco minutos, ela não pertence ao `README.md`.

> Esta tabela é espelhada em [`../CLAUDE.md`](../CLAUDE.md), que é o arquivo
> carregado por agentes de IA e precisa ser autossuficiente. Ao mudar o dono de um
> assunto ou acrescentar um arquivo a `docs/`, **atualize as duas cópias**.
