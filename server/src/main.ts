import { resolve } from 'node:path';
import { buildApp } from './app.js';
import { openDb } from './db.js';

const db = openDb(process.env.DB_PATH ?? resolve('data/avelune.db'));
const app = buildApp({
  db,
  allowRegistration: process.env.ALLOW_REGISTRATION !== 'false',
  webRoot: process.env.WEB_ROOT ?? resolve('../app/dist'),
});
const port = Number(process.env.PORT ?? 8787);
app.listen({ port, host: process.env.HOST ?? '0.0.0.0' }).then(() => console.log(`Avelune server listening on :${port}`));
