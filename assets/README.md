# Design System — Referências

Esta pasta contém os protótipos estáticos do Design System Carlesso.

**Atenção:** estes arquivos **não** fazem parte do build Angular — a pasta `assets/` não está listada em `angular.json` (apenas `public/` é copiada para o bundle).

Abra os arquivos `.html` diretamente no navegador (via `file://`) ou via servidor local para visualização.

## Arquivos

| Arquivo | Descrição |
|---|---|
| `Fundacao.html` | Cores, tipografia e voz |
| `Componentes.html` | Botões, inputs, tabelas, badges |
| `Marca.html` | Símbolo, lockup, padronagens |
| `Carlesso Admin.html` | Telas administrativas completas |
| `tokens.css` | Tokens CSS usados pelos protótipos |
| `design-canvas.jsx` | Componente de canvas de design |
| `browser-window.jsx` | Componente de janela de browser |
| `tweaks-panel.jsx` | Painel de ajuste de tema/densidade |
| `common.jsx` | Componentes de tela compartilhados |
| `screens.jsx` | Telas do sistema |

## Tokens no Angular

Os tokens do Design System para o Angular estão em `src/styles/_tokens.scss`.
Ao atualizar tokens, mantenha os dois arquivos em sincronia (`tokens.css` ↔ `_tokens.scss`).
