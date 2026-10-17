import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { Integer } from '../runtime.js';
import { arithmeticFixtures } from './fixtures.js';
import { floorInteger, moduloInteger, remainderInteger, divmodInteger, currentFloor, currentModulo, arithmetic } from './arithmetic.js';
import { Rational as Candidate } from './generated/candidate-rational.js';
import { Rational as Control } from './generated/baseline-rational.js';
import { measure } from './measure.js';
const runtime = process.versions.bun ? 'bun' : 'node', quick = process.argv.includes('--quick');
const rounds = quick ? 3 : 7, warmups = quick ? 1 : 2, count = quick ? 16 : 64;
const canonical = x => Array.isArray(x) ? x.map(canonical) : x instanceof Integer ? [x.value, 1n] : [x.numerator, x.denominator];
const cloned = (C, x) => x instanceof Integer ? x : new C(x.numerator, x.denominator);
let fixtures = arithmeticFixtures(count);
if (quick) fixtures = fixtures.filter(f => !f.name.endsWith('2048-exact') && (f.name.includes('-32-') || f.name.endsWith('-64')));
const groups = fixtures.map(f => {
  let variants;
  if (f.kind === 'integer') {
    const current = { floor: currentFloor, modulo: currentModulo, remainder: (a, b) => a.modulo(b), divmod: (a, b) => [currentFloor(a, b), currentModulo(a, b)] }[f.op];
    const fast = { floor: floorInteger, modulo: moduloInteger, remainder: remainderInteger, divmod: divmodInteger }[f.op];
    variants = [['current core composition', () => f.pairs.map(([a, b]) => current(a, b))], ['direct BigInt, core outputs', () => f.pairs.map(([a, b]) => fast(a, b))]];
  } else {
    const candidate = f.pairs.map(([a, b]) => [cloned(Candidate, a), cloned(Candidate, b)]), control = f.pairs.map(([a, b]) => [cloned(Control, a), cloned(Control, b)]);
    variants = [
      ['current core methods', () => f.pairs.map(([a, b]) => a[f.op](b))],
      ['fast pair + public constructor', () => f.pairs.map(([a, b]) => arithmetic(f.op, a, b))],
    ];
    if (f.pairs.every(([a]) => !(a instanceof Integer))) variants.push(
      ['snapshot control', () => control.map(([a, b]) => a[f.op](b))],
      ['snapshot private reduced factory', () => candidate.map(([a, b]) => a[f.op](b))],
    );
  }
  variants = variants.map(([name, run]) => ({ name, run }));
  const expected = canonical(variants[0].run());
  return { name: f.name, metadata: { kind: f.kind, operation: f.op, count }, variants,
    check: result => assert.deepEqual(canonical(result), expected) };
});
console.log(`${runtime}: ${groups.length} workloads, ${count} varying pairs/batch, ${rounds} rounds, target 15ms/sample`);
const results = await measure(groups, { rounds, warmups });
const hash = x => createHash('sha256').update(x).digest('hex');
const provenance = Object.fromEntries(await Promise.all(['arithmetic.js', 'reduced.js', 'fixtures.js', 'measure.js', 'bench.js', 'emit.js', 'generated/baseline-rational.js', 'generated/candidate-rational.js', 'generated/snapshot.json'].map(async p => [p, hash(await readFile(new URL(p, import.meta.url)))])));
const fixtureDigest = hash(JSON.stringify(fixtures.map(f => [f.name, f.pairs.map(canonical)]), (_, v) => typeof v === 'bigint' ? String(v) : v));
const report = { timestamp: new Date().toISOString(), runtime, versions: process.versions, machine: { cpu: os.cpus()[0].model, arch: os.arch(), platform: os.platform(), release: os.release() },
  methodology: { rounds, warmups, count, calibrationTargetMs: 15, order: 'rotate within workload', timed: 'all arithmetic and result objects, loop/array boundary; each reported value is ms per complete varying-input batch', excluded: 'fixtures/snapshot input construction, parsing, imports, runtime initialization, verification', verified: 'all batch outputs after every calibration/warmup/timed sample', snapshot: 'distinct experiment classes with public API and canonical fields; control is unchanged core snapshot; not drop-in production values', semantics: 'floor/modulo compared with equivalent current core compositions; remainder separately compares existing Integer.modulo semantics' }, fixtureDigest, provenance, results };
const lines = ['# Core arithmetic candidates — ' + runtime, '', `${count} pairs/batch, ${rounds} rounds, ${warmups} warmups; calibrated repeats, rotated path order. All outputs checked outside timing.`, '', '| Workload | Current ms | Public helper speedup | Snapshot control ms | Private factory speedup vs control |', '|---|---:|---:|---:|---:|', ...results.map(g => {
  const [a, b, c, d] = g.variants;
  return `| ${g.name} | ${a.medianMs.toFixed(5)} | ${(a.medianMs / b.medianMs).toFixed(2)}× | ${c ? c.medianMs.toFixed(5) : '—'} | ${c ? (c.medianMs / d.medianMs).toFixed(2) + '×' : '—'} |`;
}), '', 'Speedups below 1 indicate a regression. The public helper still normalizes its final production Rational; the private candidate can skip proven redundant normalization inside an isolated class copy. Floor/modulo and remainder retain their distinct signed semantics.', ''];
await mkdir(new URL('./results/', import.meta.url), { recursive: true });
const suffix = runtime + (quick ? '-quick' : '');
await writeFile(new URL(`./results/arithmetic-${suffix}.json`, import.meta.url), JSON.stringify(report, null, 2) + '\n');
await writeFile(new URL(`./results/arithmetic-${suffix}.md`, import.meta.url), lines.join('\n'));
console.log(lines.join('\n'));
