import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import vueParser from 'vue-eslint-parser';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tseslint.parser, sourceType: 'module' },
      globals: globals.browser,
    },
  },
  {
    // Tests enthalten absichtlich Angriffs-Payloads
    files: ['**/*.test.ts'],
    rules: { 'no-script-url': 'off' },
  },
  {
    files: ['**/*.ts', '**/*.vue', '**/*.js'],
    ignores: ['**/*.test.ts'],
    rules: {
      // Sicherheit: kein ungeprüftes HTML rendern (XSS)
      'vue/no-v-html': 'error',
      'vue/no-v-text-v-html-on-component': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'vue/multi-word-component-names': 'off',
      'vue/require-default-prop': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/html-indent': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/html-closing-bracket-newline': 'off',
    },
  },
);
