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
      // Desligada na migracao para o Angular 22 (issue #208). O v22 tornou o
      // OnPush o padrao, e a migration `change-detection-eager` do proprio
      // Angular marcou 35 componentes com `ChangeDetectionStrategy.Eager` para
      // preservar o comportamento que eles ja tinham — e entao o "recommended"
      // do angular-eslint 22 passa a acusar exatamente essas 35 marcacoes.
      // Adotar OnPush nao e mudanca de estilo: sem `markForCheck()` nos
      // callbacks assincronos a tela para de atualizar, e a falha nao aparece
      // no build nem nos testes (os specs chamam `detectChanges()`). Foi por
      // isso que a issue #25 converteu so cinco listagens, uma a uma. O resto
      // merece o mesmo cuidado, em issue separada.
      "@angular-eslint/prefer-on-push-component-change-detection": "off",
      // Desligada na migracao para o Angular 20 (issue #208), que a trouxe
      // habilitada pelo "recommended" do angular-eslint v20: 188 ocorrencias
      // em 51 arquivos. Converter para inject() nao e so estilo — o construtor
      // fica vazio, e tres specs (aula-list, pagamento-list, plano-list)
      // instanciam o componente direto com `new Component(dep, ...)` para
      // cobrir caminhos de rota invalida. Migrar exige reescrever esses testes,
      // trabalho que nao cabe numa troca de versao. Tratar em issue separada.
      "@angular-eslint/prefer-inject": "off",
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
