module.exports = {
    extends: ["airbnb-base"],
    env: {
        browser: false,
        node: true,
        mocha: true,
        es6: true,
    },
    parserOptions: {
        ecmaVersion: 6,
    },
    rules: {
        "quote-props": "off",
        "linebreak-style": "off",
        "max-len": "off",
        "no-underscore-dangle": "off",
        "strict": "off",
        "padded-blocks": "off",
        "global-require": "off",
        "consistent-return": "off",
        "guard-for-in": "off",
        "no-restricted-syntax": "off",
        "curly": ["error", "multi-line"],
        "no-confusing-arrow": "off",
        "indent": ["error", 4, { "SwitchCase": 1 }],
        "quotes": ["error", "double", { "avoidEscape": true }],
        "arrow-body-style": ["off", "as-needed", { "requireReturnForObjectLiteral": true }],
        "comma-dangle": ["error", {
            "arrays": "always-multiline",
            "objects": "always-multiline",
            "imports": "always-multiline",
            "exports": "always-multiline",
            "functions": "never",
        }],
        "prefer-destructuring": "off",
        "implicit-arrow-linebreak": "off",
        "function-paren-newline": "off",
        "camelcase": "off",
        "object-curly-newline": "off",
        "import/order": "off",
        "import/no-extraneous-dependencies": "off", // to require sinon without dependencies in each repo
        "no-else-return": "off",
        "no-case-declarations": "off",
        "no-plusplus": "off",
        "class-methods-use-this": "off",
        "default-case": "off",
    },
};
