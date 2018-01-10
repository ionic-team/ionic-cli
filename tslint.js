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
    "no-implicit-dependencies": [true, "optional"],
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

    // TODO: look at these later
    // "newline-before-return": true,
    // "no-unsafe-any": true,
    // "prefer-method-signature": true,
    // "restrict-plus-operands": true,
    // "strict-type-predicates": true,
  }
};
