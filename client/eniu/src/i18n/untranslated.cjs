/**
 * Encuentra el texto de cara al usuario que se quedó sin traducir.
 *
 * Recorre el código con el AST y señala las cadenas que una persona lee pero
 * que no pasan por `t()`. Es la red que evita el descuido habitual: se añade
 * una pantalla nueva en español y nadie nota que en inglés sale a medias.
 *
 * `src/i18n/i18n.test.js` lo ejecuta; también sirve suelto:
 *   node src/i18n/untranslated.cjs
 */
const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");

const SRC = path.resolve(__dirname, "..");

// Lo que se exige es que exista traducción, no que la llamada a `t()` esté en
// el mismo sitio que el texto. Algunas constantes de módulo guardan el español
// como clave a propósito —traducirlas donde se declaran las congelaría en el
// idioma de arranque— y se resuelven con `t(label)` al pintar.
const CATALOG = new Set(Object.keys(require("./en.json")));

const SELF_NAMED_LANGUAGES = new Set(["Español", "English"]);

// Atributos cuyo valor lee una persona.
const TEXT_ATTRS = new Set([
  "placeholder", "title", "alt", "label", "aria-label", "aria-description",
  "aria-placeholder", "aria-roledescription", "help", "emptyText", "caption",
  "description", "legend", "hint", "tooltip", "reason",
]);

// Clases de Tailwind, selectores, pilas tipográficas y cabeceras HTTP: se
// parecen a texto, pero nadie las lee.
const NOT_TEXT =
  /\b(bg|text|border|px|py|pt|pb|pl|pr|mt|mb|ml|mr|w|h|min-h|max-h|gap|rounded|flex|grid|inline-flex|cursor|overflow|shrink|opacity|ring|z|inset|space-y|space-x|object|accent|justify|items|absolute|relative|fixed|sticky|block|hidden|truncate|whitespace)-|hover:|focus:|disabled:|lg:|sm:|md:|:not\(|\[tabindex|sans-serif|serif$|^Bearer |^application\/|^image\/|^var\(--/;

// Palabras del español que delatan texto de interfaz. Se exige una de ellas o
// un acento, para no marcar identificadores en inglés que no son visibles.
const SPANISH =
  /[áéíóúñ¿¡Á-Ú]|\b(el|la|los|las|un|una|de|que|tu|tus|su|para|con|sin|ya|no|se|y|o|al|del|más|menos|este|esta|estos|cada|todo|todos|puedes|debe|hay|son|es|está|tiene|crea|crear|editar|guardar|eliminar|cancelar|agregar|nombre|correo|precio|menú|menu|negocio|producto|categoría|plan|cuenta|sesión|imagen|foto|perfil|seguridad|alta|media|ligera|equilibrada)\b/i;

function walkFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else if (/\.jsx?$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(full);
  }
  return out;
}

function looksLikeUiText(value) {
  const text = value.trim();
  // Con traduccion disponible ya esta cubierto, se envuelva aqui o al pintar.
  if (CATALOG.has(text)) return false;
  // Cada idioma se nombra en su propio idioma en el selector: quien busca
  // "English" no deberia tener que reconocer "Ingles" escrito en espanol.
  if (SELF_NAMED_LANGUAGES.has(text)) return false;
  // Identificadores en kebab o snake case ("no-business", "plan_limit"): son
  // claves internas, no algo que alguien lea. Una palabra suelta capitalizada
  // sí puede ser interfaz ("Activa", "Cancelada"), así que no se descarta.
  if (/^[a-z0-9]+([-_][a-z0-9]+)+$/.test(text)) return false;
  if (text.length < 3 || text.length > 400) return false;
  if (!/[a-zA-ZáéíóúñÁÉÍÓÚÑ]/.test(text)) return false;
  if (NOT_TEXT.test(text)) return false;
  if (/^[#./]|^https?:|^[a-z0-9_]+$|^[A-Z0-9_]+$/.test(text)) return false;
  // Identificadores camelCase o rutas de módulo.
  if (/^[a-z]+([A-Z][a-z]*)+$/.test(text)) return false;
  return SPANISH.test(text);
}

/**
 * Texto de una plantilla `\`...${x}...\`` con los huecos marcados.
 *
 * Estas se colaron durante la traduccion: el verificador solo miraba literales
 * normales y texto JSX, asi que frases enteras armadas con una variable en
 * medio pasaron desapercibidas y se quedaron en espanol.
 */
function templateText(node) {
  return node.quasis.map((quasi) => quasi.value.cooked ?? "").join("{}");
}

/** Cadenas que ya son argumento de `t()` o `i18n.t()`. */
function translatedNodes(ast) {
  const wrapped = new Set();
  const visit = (node) => {
    if (!node || typeof node.type !== "string") return;
    if (node.type === "CallExpression") {
      const callee = node.callee;
      const name =
        callee.type === "Identifier"
          ? callee.name
          : callee.type === "MemberExpression"
            ? callee.property?.name
            : null;
      if (name === "t") {
        for (const arg of node.arguments) wrapped.add(arg);
      }
    }
    // Los `new Error(...)` de este codigo avisan a quien programa de un uso
    // indebido ("useAuth debe utilizarse dentro de AuthProvider") y nunca
    // llegan a una pantalla: al usuario se le habla por `message` en la
    // respuesta de la API.
    if (node.type === "NewExpression" && node.callee?.name === "Error") {
      for (const arg of node.arguments) wrapped.add(arg);
    }
    for (const key of Object.keys(node)) {
      if (key === "loc" || key.endsWith("Comments")) continue;
      const child = node[key];
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child.type === "string") visit(child);
    }
  };
  visit(ast.program);
  return wrapped;
}

function findUntranslated() {
  const findings = [];

  for (const file of walkFiles(SRC)) {
    if (file.includes(`${path.sep}i18n${path.sep}`)) continue;
    const code = fs.readFileSync(file, "utf8");
    let ast;
    try {
      ast = parser.parse(code, { sourceType: "module", plugins: ["jsx"] });
    } catch {
      continue;
    }

    const wrapped = translatedNodes(ast);
    const rel = path.relative(SRC, file).replace(/\\/g, "/");

    const visit = (node, parent) => {
      if (!node || typeof node.type !== "string") return;

      if (node.type === "JSXText" && looksLikeUiText(node.value)) {
        findings.push({ file: rel, line: node.loc.start.line, text: node.value.trim() });
      }

      if (
        node.type === "JSXAttribute" &&
        node.value?.type === "StringLiteral" &&
        TEXT_ATTRS.has(node.name.name) &&
        looksLikeUiText(node.value.value)
      ) {
        findings.push({ file: rel, line: node.loc.start.line, text: node.value.value });
      }

      if (
        node.type === "StringLiteral" &&
        !wrapped.has(node) &&
        parent?.type !== "ImportDeclaration" &&
        parent?.type !== "JSXAttribute" &&
        !(parent?.type === "ObjectProperty" && parent.key === node && !parent.computed) &&
        looksLikeUiText(node.value)
      ) {
        findings.push({ file: rel, line: node.loc.start.line, text: node.value });
      }

      if (
        node.type === "TemplateLiteral" &&
        !wrapped.has(node) &&
        parent?.type !== "TaggedTemplateExpression" &&
        looksLikeUiText(templateText(node).replace(/\{\}/g, " "))
      ) {
        findings.push({ file: rel, line: node.loc.start.line, text: templateText(node) });
      }
      for (const key of Object.keys(node)) {
        if (key === "loc" || key.endsWith("Comments")) continue;
        const child = node[key];
        if (Array.isArray(child)) child.forEach((c) => visit(c, node));
        else if (child && typeof child.type === "string") visit(child, node);
      }
    };

    visit(ast.program, null);
  }

  return findings;
}

module.exports = { findUntranslated };

if (require.main === module) {
  const findings = findUntranslated();
  for (const item of findings) {
    console.log(`${item.file}:${item.line}  ${JSON.stringify(item.text)}`);
  }
  console.log(`\n${findings.length} textos sin traducir`);
}
