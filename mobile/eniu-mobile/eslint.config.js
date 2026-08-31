// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Los `.cjs` son herramientas que corren en Node, no en el dispositivo:
    // usan `require`, `__dirname` y `module`, que no existen en la app.
    files: ["**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { __dirname: "readonly", module: "writable", require: "readonly", process: "readonly", console: "readonly" },
    },
  },
]);
