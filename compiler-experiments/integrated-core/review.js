import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { here } from './build.js';
const run = promisify(execFile);
const manifest = JSON.parse(await readFile(resolve(here, 'tmp/build.json'), 'utf8'));
const diff = async (a, b, label) => {
  try { await access(a); } catch { a = '/dev/null'; }
  try { const { stdout } = await run('diff', ['-u', '-L', `a/${label}`, '-L', `b/${label}`, a, b]); return stdout; }
  catch (error) { if (error.code === 1) return error.stdout; throw error; }
};
let core = '';
for (const file of ['integer.js', 'rational.js', 'experimental-reduced.js']) core += await diff(resolve(manifest.paths.baseline.core, 'src', file), resolve(manifest.paths.candidate.core, 'src', file), `packages/core/src/${file}`);
const rix = await diff(resolve(manifest.paths.baseline.rix, 'src/eval/functions/arithmetic.js'), resolve(manifest.paths['candidate-wired'].rix, 'src/eval/functions/arithmetic.js'), 'rix/src/eval/functions/arithmetic.js');
await mkdir(resolve(here, 'patches'), { recursive: true });
await writeFile(resolve(here, 'patches/candidate-core.patch'), core);
await writeFile(resolve(here, 'patches/integer-wiring.patch'), rix);
console.log('Saved review-only diffs of the copied core and optional copied RiX wiring. No patches applied.');
