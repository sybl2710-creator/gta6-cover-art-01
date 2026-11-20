import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = path.dirname(path.resolve(process.argv[1]));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

mkdirSync(outDir, { recursive: true });

for (const dir of ['app', 'screenshots']) {
  cpSync(path.join(repoRoot, dir), path.join(outDir, dir), { recursive: true });
}

const dossier = buildDossier(outDir, caps);
writeFileSync(path.join(outDir, 'dossier.json'), dossier);
