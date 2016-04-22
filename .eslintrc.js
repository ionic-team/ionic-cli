module.exports = {
  "env": {
    "browser": true,
    "commonjs": true
  },
  "extends": "eslint:recommended",
  "rules": {
    "indent": [
      "error",
      2
    ],
    "linebreak-style": [
      "error",
      "unix"
    ],
    "quotes": [
      "error",
      "single"
    ],
    "semi": [
      "error",
      "always"
    ],
    "brace-style": [
      "error",
      "1tbs",
      {
        "allowSingleLine": true
      }
    ],
    "camelcase": [
      "error",
      {
        "properties": "always"
      }
    ],
    "comma-style": [
      "error",
      "last"
    ],
    "consistent-this": [
      "error",
      "self"
    ],
    "new-cap": [
      "error"
    ],
    "no-extra-semi": "error",
    "no-lonely-if": "error",
    "no-underscore-dangle": "error",
    "no-spaced-func": "error",
    "space-before-function-paren": [
      2,
      "never"
    ],
    "keyword-spacing": [
      "error",
      {
        "before": true,
        "after": true
      }
    ],
    "space-before-blocks": [
      2,
      "always"
    ]
  }
};

