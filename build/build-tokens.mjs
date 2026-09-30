// Uso: node design_system/build/build-tokens.mjs
// Lee tokens/*.tokens.json, resuelve alias {a.b.c} y genera build/tokens.css, tokens.ts y tokens.resolved.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (f) => JSON.parse(readFileSync(join(root, 'tokens', f), 'utf8'));

const global = load('global.tokens.json');
const semantic = load('semantic.tokens.json');
const component = load('component.tokens.json');

function flatten(node, path = [], out = {}) {
  for (const [k, v] of Object.entries(node)) {
    if (k.startsWith('$')) continue;
    if (v && typeof v === 'object' && '$value' in v) out[[...path, k].join('.')] = v.$value;
    else if (v && typeof v === 'object') flatten(v, [...path, k], out);
  }
  return out;
}

const gFlat = flatten(global);
const sharedFlat = flatten(semantic.shared);
const compFlat = flatten(component);

function resolve(flat) {
  const cache = {};
  const walk = (key, stack = []) => {
    if (key in cache) return cache[key];
    if (stack.includes(key)) throw new Error(`Alias circular: ${[...stack, key].join(' -> ')}`);
    const raw = flat[key];
    if (raw === undefined) throw new Error(`Token inexistente: ${key} (usado por ${stack.at(-1)})`);
    const val =
      typeof raw === 'string'
        ? raw.replace(/\{([^}]+)\}/g, (_, ref) => String(walk(ref, [...stack, key])))
        : raw;
    return (cache[key] = val);
  };
  for (const k of Object.keys(flat)) walk(k);
  return cache;
}

const themes = {};
for (const name of ['dark', 'light']) {
  const flat = { ...gFlat, ...sharedFlat, ...flatten(semantic[name]), ...compFlat };
  themes[name] = resolve(flat);
}

const cssName = (k) => `--sotto-${k.replaceAll('.', '-')}`;
const block = (sel, entries) =>
  `${sel} {\n${entries.map(([k, v]) => `  ${cssName(k)}: ${v};`).join('\n')}\n}\n`;

const globalEntries = Object.keys(gFlat).map((k) => [k, themes.dark[k]]);
const themeEntries = (t) => Object.entries(themes[t]).filter(([k]) => !(k in gFlat));

const css =
  '/* GENERADO por build-tokens.mjs — no editar a mano. */\n' +
  block(':root', globalEntries) +
  block(':root,\n[data-theme="dark"]', themeEntries('dark')) +
  block('[data-theme="light"]', themeEntries('light'));

function nest(flat) {
  const out = {};
  for (const [k, v] of Object.entries(flat)) {
    const parts = k.split('.');
    let o = out;
    parts.slice(0, -1).forEach((p) => (o = o[p] ??= {}));
    o[parts.at(-1)] = v;
  }
  return out;
}

const resolved = { dark: nest(themes.dark), light: nest(themes.light) };
const ts =
  '// GENERADO por build-tokens.mjs — no editar a mano.\n' +
  `export const tokens = ${JSON.stringify(resolved, null, 2)} as const;\n` +
  'export type ThemeName = keyof typeof tokens;\n' +
  'export type Tokens = (typeof tokens)[ThemeName];\n';

writeFileSync(join(root, 'build', 'tokens.css'), css);
writeFileSync(join(root, 'build', 'tokens.ts'), ts);
writeFileSync(join(root, 'build', 'tokens.resolved.json'), JSON.stringify(resolved, null, 2));
console.log(
  `OK · ${globalEntries.length} globales, ${themeEntries('dark').length} semánticos+componente por tema`,
);
