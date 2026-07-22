// @ts-check
const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

module.exports = tseslint.config(
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "app",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          // "attribute" habilita componentes aplicados a elementos nativos que
          // exigem a tag correta (ex.: cabecalho ordenavel `th[app-sortable]`,
          // issue #151), preservando a semantica da tabela e o `aria-sort` no th.
          type: ["element", "attribute"],
          prefix: "app",
          style: "kebab-case",
        },
      ],
      // Permite o padrao idiomatico de "omitir campos" via rest siblings
      // (ex.: `const { id, ...campos } = objeto;`) e variaveis/argumentos
      // intencionalmente ignorados prefixados com "_".
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          ignoreRestSiblings: true,
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // Testes: mocks e stubs usam `any` e funcoes vazias de forma legitima.
    files: ["**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-function": "off",
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {
      // Mantem a regra, mas permite o idioma `x != null` (cobre null e undefined).
      "@angular-eslint/template/eqeqeq": [
        "error",
        { allowNullOrUndefined: true },
      ],
    },
  }
);
