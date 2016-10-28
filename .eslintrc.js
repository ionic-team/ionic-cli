module.exports = {
  env: {
    node: true,
    commonjs: true
  },
  plugins: [
    'no-use-extend-native'
  ],
  extends: 'eslint:recommended',
  rules: {
    'no-use-extend-native/no-use-extend-native': 2,
    eqeqeq: [
      "error",
      "smart"
    ],
    indent: [
      'error',
      2
    ],
    'linebreak-style': [
      'error',
      'unix'
    ],
    'lines-around-comment': [
      'error',
      {
        beforeLineComment: true
      }
    ],
    'spaced-comment': [
      'error',
      'always'
    ],
    'new-parens': 'error',
    'newline-per-chained-call': [
      'error',
      {
        ignoreChainWithDepth: 3
      }
    ],
    quotes: [
      'error',
      'single',
      {
        avoidEscape: true
      }
    ],
    semi: [
      'error',
      'always'
    ],
    'semi-spacing': [
      'error',
      {
        before: false,
        after: true
      }
    ],
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
        properties: 'always'
      }
    ],
    "no-console": 0,
    "no-extra-semi": "error",
    "no-lonely-if": "error",
    "no-underscore-dangle": "error",
    "no-spaced-func": "error",
    "space-before-function-paren": [
      2,
      "never"
    ],
    'comma-style': [
      'error',
      'last'
    ],
    'comma-spacing': [
      'error',
      {
        before: false,
        after: true
      }
    ],
    'computed-property-spacing': [
      'error',
      'never'
    ],
    'func-style': [
      'error',
      'declaration',
      {
        allowArrowFunctions: true
      }
    ],
    'consistent-this': [
      'error',
      'self'
    ],
    'new-cap': [
      'error',
      {
        capIsNewExceptions: ['Q']
      }
    ],
    'no-console': 0,
    'array-bracket-spacing': [
      'error',
      'never'
    ],
    'object-curly-spacing': [
      'error',
      'always'
    ],
    'max-len': [
      'error',
      120,
      4,
      {
        ignoreUrls: true
      }
    ],
    'no-new-object': 'error',
    'quote-props': [
      'error',
      'as-needed'
    ],
    'block-spacing': 'error',
    'handle-callback-err': 'error',
    'no-new-require': 'error',
    'no-path-concat': 'error',
    'callback-return': 'error',
    'no-array-constructor': 'error',
    'no-useless-escape': 'error',
    'no-extra-semi': 'error',
    'no-lonely-if': 'error',
    'no-underscore-dangle': 'error',
    'no-spaced-func': 'error',
    'no-plusplus': 'error',
    'one-var-declaration-per-line': [
      'error',
      'always'
    ],
    'no-multiple-empty-lines': [
      'error',
      {
        max: 2
      }
    ],
    'guard-for-in': 'error',
    'keyword-spacing': [
      'error',
      {
        before: true,
        after: true
      }
    ],
    'space-before-function-paren': [
      2,
      'never'
    ],
    'space-before-blocks': [
      2,
      'always'
    ],
    'space-in-parens': [
      'error',
      'never'
    ],
    'space-infix-ops': 'error'
  }
};

