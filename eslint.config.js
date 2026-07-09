const nextPlugin = require("@next/eslint-plugin-next");
const tsPlugin = require("@typescript-eslint/eslint-plugin");

module.exports = [
  {
    plugins: {
      "@next/next": nextPlugin,
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...nextPlugin.configs["core-web-vitals"].rules,
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    ignores: [".next/*", "node_modules/*", "data/*"],
  },
];
