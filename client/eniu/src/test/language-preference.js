// Fija el idioma de las pruebas antes de que se cargue i18n.
//
// Vive en su propio módulo porque los `import` de ESM se elevan: escrito
// dentro de `setup.js` junto al resto, esto correría *después* de importar
// i18n y no serviría. Como módulo aparte, importarlo primero garantiza el
// orden.
//
// Hace falta porque jsdom dice hablar inglés, y los tests que recargan
// módulos (`vi.resetModules()`) construyen una instancia nueva de i18n cuyo
// único rastro de preferencia es esto.
localStorage.setItem("eniu_language", "es");
