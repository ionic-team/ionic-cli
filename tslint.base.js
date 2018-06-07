module.exports = {
  "extends": "tslint-ionic-rules",
  "rules": {
    "adjacent-overload-signatures": true,
    "array-type": [true, "array"],
    "arrow-parens": [true, "ban-single-arg-parens"],
    "arrow-return-shorthand": true,
    "deprecation": { "options": true, "severity": "warning" },
    "import-spacing": true,
    "interface-over-type-literal": true,
    "member-access": [true, "no-public"],
    "no-consecutive-blank-lines": true,
    "no-console": true,
    "no-irregular-whitespace": true,
    "no-multi-spaces": true,
    "no-null-keyword": true,
    "no-redundant-jsdoc": true,
    "no-reference": true,
    "no-return-await": true,
    "one-line": [true, "check-catch", "check-finally", "check-else"],
    "one-variable-per-declaration": true,
    "prefer-object-spread": true,
    "space-within-parens": 0,
    "trailing-comma": [true, { "multiline": { "objects": "always", "arrays": "always", "functions": "never", "typeLiterals": "always" }, "singleline": "never" }],

    // https://github.com/ionic-team/tslint-ionic-rules/commit/065e3e9937104f6ec03e594adf762002616353df
    "no-conditional-assignment": true,
    "no-unnecessary-type-assertion": true,
    "prefer-for-of": true,

    // TODO: https://github.com/palantir/tslint/issues/3375
    // "no-implicit-dependencies": [true, "optional"],

    // TODO: look at these later
    // "newline-before-return": true,
    // "no-unsafe-any": true,
    // "prefer-method-signature": true,
    // "restrict-plus-operands": true,
    // "strict-type-predicates": true,
  }
};
