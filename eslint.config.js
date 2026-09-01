import vue from 'eslint-plugin-vue'

export default [
  {
    ignores: ['.eslintrc.cjs', 'dist/**', 'node_modules/**']
  },
  ...vue.configs['flat/essential'],
  {
    files: ['**/*.{js,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        document: 'readonly',
        window: 'readonly',
        navigator: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        crypto: 'readonly',
        describe: 'readonly',
        expect: 'readonly',
        it: 'readonly'
      }
    },
    rules: {
      'vue/multi-word-component-names': 'off'
    }
  }
]
