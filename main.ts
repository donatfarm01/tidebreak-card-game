// main.ts — Tidebreak's hand-in program (Node 22, standard library only).
// Copies game/ and screenshots/ from this repository into the output
// directory and writes output/dossier.json with buildDossier from
// vendor/makefun-game.ts. It runs twice in the grader and must write the
// same bytes both times, so it removes what it wrote before copying again
// and writes nothing else.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const gameDir = join(outDir, 'game');
const shotsDir = join(outDir, 'screenshots');
const dossierPath = join(outDir, 'dossier.json');

// A fresh output every run: the same input writes the same bytes twice.
rmSync(gameDir, { recursive: true, force: true });
rmSync(shotsDir, { recursive: true, force: true });
rmSync(dossierPath, { force: true });
mkdirSync(outDir, { recursive: true });

cpSync(join(repoRoot, 'game'), gameDir, { recursive: true });
cpSync(join(repoRoot, 'screenshots'), shotsDir, { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(dossierPath, dossier);

console.log(`Tidebreak handed in: game/ + screenshots/ copied to ${outDir}, dossier.json ${dossier.length} bytes.`);
