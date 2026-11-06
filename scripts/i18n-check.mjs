// Lists English strings passed to t()/tn()/tr()/trn() that have no Arabic translation,
// and Arabic plural entries whose form count is wrong. Usage: node scripts/i18n-check.mjs [--quiet]
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dirs = ['app/src', 'packages/core/src'];
const files = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!p.includes(path.join('i18n', 'ar'))) walk(p); } else if (/\.tsx?$/.test(e.name)) files.push(p); } };
dirs.forEach((d) => walk(path.join(root, d)));

const keys = new Map(); // key -> {file, plural}
const nonLiteral = [];
for (const f of files) {
  const sf = ts.createSourceFile(f, fs.readFileSync(f, 'utf8'), ts.ScriptTarget.Latest, true);
  const visit = (n) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && (f.includes(path.join('packages', 'core')) ? ['tr', 'trn', 'trc'] : ['t', 'tn', 'tc', 'tr', 'trn', 'trc']).includes(n.expression.text)) {
      const isPlural = n.expression.text === 'tn' || n.expression.text === 'trn';
      const isCtx = n.expression.text === 'tc' || n.expression.text === 'trc';
      const arg = n.arguments[isPlural || isCtx ? 1 : 0];
      const ctx = isCtx && n.arguments[0] && ts.isStringLiteral(n.arguments[0]) ? n.arguments[0].text + '::' : '';
      if (arg && (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg))) {
        const key = ctx + arg.text;
        if (!keys.has(key)) keys.set(key, { file: path.relative(root, f), plural: isPlural });
      } else if (arg) nonLiteral.push(`${path.relative(root, f)}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}  ${n.getText().slice(0, 80)}`);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}

// Load the Arabic dictionaries by transpiling them.
const dict = {};
const arDir = path.join(root, 'app/src/i18n/ar');
for (const f of fs.readdirSync(arDir).filter((x) => x !== 'index.ts' && x.endsWith('.ts'))) {
  const js = ts.transpileModule(fs.readFileSync(path.join(arDir, f), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const m = { exports: {} };
  new Function('module', 'exports', 'require', js)(m, m.exports, () => ({}));
  for (const v of Object.values(m.exports)) if (v && typeof v === 'object') Object.assign(dict, v);
}

const missing = [...keys].filter(([k]) => !(k in dict));
const badPlural = [...keys].filter(([k, v]) => v.plural && k in dict && dict[k].split('|').length !== 6);
const placeholders = [...keys].filter(([k]) => k in dict).filter(([k]) => {
  const want = new Set(k.replace(/^.*::/, '').match(/\{\w+\}/g) ?? []);
  const forms = dict[k].split('|');
  return forms.some((f) => [...(f.match(/\{\w+\}/g) ?? [])].some((p) => !want.has(p) && p !== '{n}'));
});
const byFile = {};
for (const [k, v] of missing) (byFile[v.file] ??= []).push(k);
if (!process.argv.includes('--quiet')) for (const [f, ks] of Object.entries(byFile)) { console.log(`\n${f}`); ks.forEach((k) => console.log('  ' + JSON.stringify(k))); }
if (nonLiteral.length) { console.log('\nNot a string literal (cannot be checked):'); nonLiteral.forEach((x) => console.log('  ' + x)); }
if (badPlural.length) { console.log('\nArabic plural entries need 6 forms (zero|one|two|few|many|other):'); badPlural.forEach(([k]) => console.log('  ' + JSON.stringify(k))); }
if (placeholders.length) { console.log('\nTranslations using a placeholder the English text does not have:'); placeholders.forEach(([k]) => console.log('  ' + JSON.stringify(k))); }
console.log(`\n${keys.size} strings, ${missing.length} missing Arabic, ${badPlural.length} bad plurals, ${placeholders.length} bad placeholders, ${nonLiteral.length} non-literal calls`);
process.exit(missing.length || badPlural.length || placeholders.length ? 1 : 0);
