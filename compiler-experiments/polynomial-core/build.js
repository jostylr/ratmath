import { cp, readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
export const here = dirname(fileURLToPath(import.meta.url));
const sha = value => createHash('sha256').update(value).digest('hex');
async function inventory(folder, base = folder) {
  const entries = [];
  for (const item of await readdir(folder, { withFileTypes: true })) {
    if (item.name === '.DS_Store') continue;
    const path = resolve(folder, item.name);
    if (item.isDirectory()) entries.push(...Object.entries(await inventory(path, base)));
    else if (item.isFile()) entries.push([relative(base, path), sha(await readFile(path))]);
  }
  return Object.fromEntries(entries);
}
export async function build() {
  // Reuse a fingerprinted fast-core build, then make our own independent tree.
  const base = JSON.parse(await readFile(resolve(here, '../integrated-core/tmp/build.json'), 'utf8'));
  for (const [group, dir] of [['core','packages/core/src'], ['rix','rix/src'], ['plugins','rix/plugins'], ['coreTests','packages/core/tests']]) {
    const now = await inventory(resolve(base.sourceRoot, dir));
    const expected = Object.fromEntries(Object.entries(base.original[group]).filter(([p]) => !p.split('/').includes('.DS_Store')));
    assert.deepEqual(now, expected, `Stale integrated-core build (${group}); rebuild it first`);
  }
  for (const [key,dir] of [['coreSource','core'],['rixSource','rix']]) {
    const expected = Object.fromEntries(Object.entries(base.paths.candidate[key]).filter(([p])=>!p.split('/').includes('.DS_Store')));
    assert.deepEqual(await inventory(resolve(base.paths.candidate[dir],'src')),expected,`Altered candidate copy (${dir}); rebuild integrated-core first`);
  }
  const env = resolve(here, 'tmp/combined');
  await rm(env, { recursive: true, force: true });
  await mkdir(dirname(env), { recursive: true });
  await cp(dirname(dirname(base.paths.candidate.core)), env, { recursive: true, verbatimSymlinks: true });
  const core = resolve(env, 'packages/core'), rix = resolve(env, 'rix');
  const originalRational = await readFile(resolve(core, 'src/rational.js'), 'utf8');
  const method = await readFile(resolve(here, 'rational-method.txt'), 'utf8');
  if (!originalRational.includes('  static _canUseReduced(value) {')) throw new Error('Private factory anchor changed');
  await writeFile(resolve(core, 'src/rational.js'), originalRational.replace('  static _canUseReduced(value) {', method + '\n  static _canUseReduced(value) {'));
  await cp(resolve(here, 'polynomial.js'), resolve(core, 'src/experimental-polynomial.js'));
  const entry = resolve(core, 'index.js');
  await writeFile(entry, await readFile(entry, 'utf8') + "\nexport { evaluatePolynomial, evaluatePolynomialFused, evaluatePolynomialBatch } from './src/experimental-polynomial.js';\n");
  const manifest = { sourceRoot: base.sourceRoot, core, rix, original: base.original, baseFastCore: base.paths.candidate.coreSource,
    coreSource: await inventory(resolve(core, 'src')), rixSource: await inventory(resolve(rix, 'src')), entryHash: sha(await readFile(entry)),
    changes: 'Copied candidate core + combined Horner operations; copied RiX source unchanged; explicit experimental registry adapter only' };
  await writeFile(resolve(here, 'tmp/build.json'), JSON.stringify(manifest, null, 2) + '\n');
  await mkdir(resolve(here, 'results'), { recursive: true });
  const { sourceRoot, core: unusedCore, rix: unusedRiX, ...provenance } = manifest;
  await writeFile(resolve(here, 'results/build-provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
  console.log('Built combined polynomial operations in an independent experimental core copy.');
  return manifest;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await build();
