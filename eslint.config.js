// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // web/ (site Next.js) a sa propre configuration ESLint.
    ignores: ["dist/*", "web/*"],
  }
]);
