import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'android', '**/*.backup', 'coverage']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    settings: {
      react: { version: 'detect' },
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
      // Härtere Hook-Regeln: jede Verletzung ist ein Fehler, nicht nur eine Warnung.
      'react-hooks/rules-of-hooks': 'error',
      // Diese drei sind Hinweise der React-Team-Rules, die eine Refactor-Runde
      // brauchen; wir behalten sie als warn, damit sie im Dev-Log sichtbar
      // bleiben, aber die Lint-Pipeline nicht blockieren.
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/immutability': 'warn',
      // Sicherheits-/Qualitäts-Basics
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-var': 'error',
      'prefer-const': 'warn',
      // React: der neue JSX-Transform braucht kein React-Import in Scope
      'react/react-in-jsx-scope': 'off',
      // prop-types sind überzogen für dieses Projekt (keine Typen-Infrastruktur)
      'react/prop-types': 'off',
      // Minor: erlaubt <div>{text}</div> ohne Entitäten-Escaping-Pflicht
      'react/no-unescaped-entities': 'off',
    },
  },
  // Tests dürfen Vitest-Globals nutzen und entspanntere Regeln
  {
    files: ['**/__tests__/**/*.{js,jsx}', '**/*.test.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-unused-vars': 'off',
    },
  },
])
