// Builds the submission bundle for Vice Pop Studio. It copies the offline
// app and its screenshots into an output directory, then asks the make.fun
// helper to inspect that output and write dossier.json beside it.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR || '/output';

mkdirSync(out, { recursive: true });
cpSync(join(root, 'app'), join(out, 'app'), { recursive: true });

const shotsOut = join(out, 'screenshots');
mkdirSync(shotsOut, { recursive: true });
const shotsIn = join(root, 'screenshots');
if (existsSync(shotsIn)) {
  cpSync(shotsIn, shotsOut, { recursive: true });
}

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});

writeFileSync(
  join(out, 'dossier.json'),
  typeof dossier === 'string' ? dossier : JSON.stringify(dossier, null, 2) + '\n',
);

console.log(`Vice Pop Studio built into ${out} (app, screenshots, dossier.json).`);
