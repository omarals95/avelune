// Regenerates TERMS.md and PRIVACY.md from app/src/legal.ts, so the app and the repository always say the same thing.
// Usage: node scripts/legal-docs.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';

const src = readFileSync(new URL('../app/src/legal.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const L = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

const doc = (title, intro, sections) => [
  `# ${title}`, '',
  `*Avelune · last updated ${L.TERMS_DATE} (version ${L.TERMS_VERSION})*`, '',
  intro, '',
  ...sections.flatMap((s) => [`## ${s.title}`, '', ...s.body.flatMap((p) => [p, ''])]),
  '---', '',
  'This text is generated from [`app/src/legal.ts`](app/src/legal.ts), the same source the app shows on first use and in Settings → About Avelune.', '',
].join('\n');

writeFileSync(new URL('../TERMS.md', import.meta.url), doc('Terms of use',
  'Avelune is a free, personal open-source project. By using it you agree to these terms. See also the [privacy policy](PRIVACY.md) and the [MIT License](LICENSE).', L.TERMS));
writeFileSync(new URL('../PRIVACY.md', import.meta.url), doc('Privacy policy',
  'Avelune is built so that your health data stays yours. See also the [terms of use](TERMS.md).', L.PRIVACY));
console.log('Wrote TERMS.md and PRIVACY.md');
