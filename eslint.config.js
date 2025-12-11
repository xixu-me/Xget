import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import jsdoc from 'eslint-plugin-jsdoc';

export default [
  js.configs.recommended,
  jsdoc.configs['flat/recommended'],
  {
    files: ['src/**/*.js', 'test/**/*.js', 'adapters/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Cloudflare Workers globals
        addEventListener: 'readonly',
        caches: 'readonly',
        crypto: 'readonly',
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        console: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        ReadableStream: 'readonly',
        WritableStream: 'readonly',
        TransformStream: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        performance: 'readonly',
        globalThis: 'readonly',
        process: 'readonly',

        // Vitest globals
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly'
      }
    },
    settings: {
      jsdoc: {
        mode: 'typescript',
        tagNamePreference: {
          returns: 'returns'
        }
      }
    },
    rules: {
      // JSDoc rules overrides
      'jsdoc/require-description': 'warn',
      'jsdoc/require-returns': 'off', // Often redundant if return type is void or obvious
      'jsdoc/require-param-description': 'off', // Names are often self-explanatory
      'jsdoc/no-undefined-types': [
        'warn',
        {
          definedTypes: [
            'ExecutionContext',
            'Cache',
            'RequestInit',
            'Request',
            'Response',
            'Headers',
            'URL',
            'URLSearchParams',
            'AbortController',
            'AbortSignal',
            'ReadableStream',
            'WritableStream',
            'TransformStream',
            'TextEncoder',
            'TextDecoder'
          ]
        }
      ],

      // Code quality rules
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_'
        }
      ],
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error']
        }
      ],
      'no-debugger': 'error',
      'no-alert': 'error',

      // Best practices
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-self-compare': 'error',
      'no-sequences': 'error',
      'no-throw-literal': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unused-expressions': 'error',
      'no-useless-call': 'error',
      'no-useless-concat': 'error',
      'no-useless-return': 'error',
      'prefer-promise-reject-errors': 'error',
      radix: 'error',
      yoda: 'error',

      // Variables
      'no-delete-var': 'error',
      'no-label-var': 'error',
      'no-restricted-globals': 'error',
      'no-shadow': 'error',
      'no-shadow-restricted-names': 'error',
      'no-undef': 'error',
      'no-undef-init': 'error',
      'no-use-before-define': [
        'error',
        {
          functions: false,
          classes: true,
          variables: true
        }
      ],

      // Stylistic issues
      'array-bracket-spacing': ['error', 'never'],
      'block-spacing': ['error', 'always'],
      'brace-style': [
        'error',
        '1tbs',
        {
          allowSingleLine: true
        }
      ],
      camelcase: [
        'error',
        {
          properties: 'never'
        }
      ],
      'comma-dangle': ['error', 'never'],
      'comma-spacing': [
        'error',
        {
          before: false,
          after: true
        }
      ],
      'comma-style': ['error', 'last'],
      'computed-property-spacing': ['error', 'never'],
      'eol-last': ['error', 'always'],
      'func-call-spacing': ['error', 'never'],
      indent: [
        'error',
        2,
        {
          SwitchCase: 1
        }
      ],
      'key-spacing': [
        'error',
        {
          beforeColon: false,
          afterColon: true
        }
      ],
      'keyword-spacing': [
        'error',
        {
          before: true,
          after: true
        }
      ],
      'linebreak-style': ['error', 'unix'],
      'no-multiple-empty-lines': [
        'error',
        {
          max: 2,
          maxEOF: 1
        }
      ],
      'no-trailing-spaces': 'error',
      'object-curly-spacing': ['error', 'always'],
      quotes: [
        'error',
        'single',
        {
          avoidEscape: true
        }
      ],
      semi: ['error', 'always'],
      'semi-spacing': [
        'error',
        {
          before: false,
          after: true
        }
      ],
      'space-before-blocks': ['error', 'always'],
      'space-before-function-paren': [
        'error',
        {
          anonymous: 'always',
          named: 'never',
          asyncArrow: 'always'
        }
      ],
      'space-in-parens': ['error', 'never'],
      'space-infix-ops': 'error',
      'space-unary-ops': [
        'error',
        {
          words: true,
          nonwords: false
        }
      ],

      // ES6+ rules
      'arrow-spacing': [
        'error',
        {
          before: true,
          after: true
        }
      ],
      'constructor-super': 'error',
      'no-class-assign': 'error',
      'no-const-assign': 'error',
      'no-dupe-class-members': 'error',
      'no-duplicate-imports': 'error',
      'no-new-symbol': 'error',
      'no-this-before-super': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-constructor': 'error',
      'no-useless-rename': 'error',
      'no-var': 'error',
      'object-shorthand': ['error', 'always'],
      'prefer-arrow-callback': 'error',
      'prefer-const': 'error',
      'prefer-destructuring': [
        'error',
        {
          array: true,
          object: true
        },
        {
          enforceForRenamedProperties: false
        }
      ],
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'prefer-template': 'error',
      'rest-spread-spacing': ['error', 'never'],
      'template-curly-spacing': ['error', 'never']
    }
  },
  prettierConfig, // Disable formatting rules that conflict with Prettier
  {
    files: ['test/**/*.js'],
    rules: {
      // Relax some rules for test files
      'no-console': 'off',
      'no-unused-expressions': 'off'
    }
  }
];
