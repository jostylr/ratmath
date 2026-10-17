import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { Integer, rix } from '../runtime.js';
import { polynomialFixtures } from './fixtures.js';
import { hornerCurrent, hornerFast, powerSumCurrent, polynomialBatch, preparePolynomial } from './polynomial.js';
import { createExploration, sequence } from './rix.js';
import { createMarkedSession } from '../marked-bigint/runner.js';
import { Rational as Candidate } from './generated/candidate-rational.js';
import { Rational as Control } from './generated/baseline-rational.js';
import { measure } from './measure.js';
const runtime = process.versions.bun ? 'bun' : 'node', quick = process.argv.includes('--quick');
const rounds = quick ? 3 : 7, warmups = quick ? 1 : 2;
const exploration = createExploration();
const names = ['horner', 'powers', 'offload', 'plan', 'descriptor', 'fraction-horner', 'fraction-horner-marked'];
const sources = Object.fromEntries(await Promise.all(names.map(async name => [name, await readFile(new URL(`./scripts/${name}.rix`, import.meta.url), 'utf8')])));
const irs = Object.fromEntries(Object.entries(sources).map(([name, source]) => [name, exploration.parse(source)]));
const canonical = x => x?.type === 'sequence' ? x.values.map(canonical) : Array.isArray(x) ? x.map(canonical) : x instanceof Integer ? [x.value, 1n] : [x.numerator, x.denominator];
const clone = (C, x) => x instanceof Integer ? x : new C(x.numerator, x.denominator);
let fixtures = polynomialFixtures();
if (quick) fixtures = fixtures.slice(0, 2).map(f => ({ ...f, points: f.points.slice(0, 4) }));
const groups = [], setup = [];
for (const f of fixtures) {
  const expected = canonical(f.points.map(x => hornerCurrent(f.coefficients, x)));
  const variants = [
    ['JS power sum, core methods', () => f.points.map(x => powerSumCurrent(f.coefficients, x))],
    ['RiX power sum', () => exploration.run(irs.powers, f)],
    ['JS Horner, core methods', () => f.points.map(x => hornerCurrent(f.coefficients, x))],
    ['RiX Horner', () => exploration.run(irs.horner, f)],
    ['JS Horner, public fast paths', () => f.points.map(x => hornerFast(f.coefficients, x))],
    ['RiX Horner, public fast paths', () => exploration.run(irs.horner, f, exploration.fast)],
  ];
  if (f.skipPowers) variants.splice(0, 2);
  if (f.points.some(x => !(x instanceof Integer))) {
    for (const [label, C] of [['snapshot control Horner', Control], ['snapshot candidate Horner', Candidate]]) {
      const cs = f.coefficients.map(c => clone(C, c)), xs = f.points.map(x => clone(C, x));
      variants.push([label, () => xs.map(x => { let r = new C(0n); for (const c of cs) r = r.multiply(x).add(c); return r; })]);
    }
  }
  const planStart = performance.now(), plan = preparePolynomial(f.coefficients), planPrepareMs = performance.now() - planStart;
  const context = new rix.Context(); exploration.run(irs.plan, f, undefined, context);
  const cachedIR = exploration.parse('plan.Evaluate(points);');
  variants.push(
    ['JS fused batch, prepare included', () => polynomialBatch(f.coefficients, f.points)],
    ['JS fused batch, cached plan', () => plan.map(f.points)],
    ['RiX offload each point', () => exploration.run(exploration.parseCacheScalar, f)],
    ['RiX one batch capability', () => exploration.run(irs.offload, f)],
    ['RiX prepare plan + evaluate', () => exploration.run(irs.plan, f)],
    ['RiX cached plan evaluate', () => exploration.run(cachedIR, f, undefined, context)],
    ['RiX operation descriptor', () => exploration.run(irs.descriptor, f)],
  );
  const bindings = { coefficients: sequence(f.coefficients), points: sequence(f.points) };
  const cold = {};
  if (f.coefficients.every(x => x instanceof Integer)) {
    const source = f.points.every(x => x instanceof Integer) ? sources.horner.replace('Run(coefficients,points) ->', '## @bigint\nRun(coefficients,points) ->') : sources['fraction-horner-marked'];
    const session = createMarkedSession(), program = session.load(source), first = performance.now();
    assert.deepEqual(canonical(program.run({ bindings })), expected);
    cold.markedFirstMs = performance.now() - first; cold.markedFirstStats = { ...session.stats };
    variants.push([f.points.every(x => x instanceof Integer) ? 'RiX marked BigInt Horner' : 'RiX marked Integer-pair Horner', () => program.run({ bindings })]);
    cold.session = session;
    if (!f.points.every(x => x instanceof Integer)) variants.push(['RiX Integer-pair Horner', () => exploration.run(irs['fraction-horner'], f)]);
  }
  if (f.skipPowers) { const zeroPlan = preparePolynomial(f.coefficients, { pruneLeadingZeros: true }); variants.push(['JS cached plan, prune leading zeros', () => zeroPlan.map(f.points)]); }
  const growth = {};
  let selected = f.points[0];
  for (const x of f.points) { const diagnostic = {}; plan.evaluate(x, diagnostic); if ((diagnostic.finalUnreducedBits || 0) >= (growth.finalUnreducedBits || 0)) { Object.assign(growth, diagnostic); selected = x; } }
  const final = plan.evaluate(selected);
  setup.push({ name: f.name, planPrepareMs, descriptor: plan.descriptor, growth: { ...growth, reducedBits: final instanceof Integer ? (final.value < 0n ? -final.value : final.value).toString(2).length : Math.max((final.numerator < 0n ? -final.numerator : final.numerator).toString(2).length, final.denominator.toString(2).length) }, cold });
  groups.push({ name: f.name, metadata: { degree: f.coefficients.length - 1, points: f.points.length, coefficientTypes: f.coefficients.map(x => x.constructor.name), pointTypes: f.points.map(x => x.constructor.name) },
    variants: variants.map(([name, run]) => ({ name, run })), check: result => assert.deepEqual(canonical(result), expected) });
}
exploration.parseCacheScalar = exploration.parse('points.Map((x)->.polynomialOne(@coefficients,x));');
console.log(`${runtime}: ${groups.length} polynomial workloads; ${rounds} rounds`);
const results = await measure(groups, { rounds, warmups });
for (const s of setup) {
  if (s.cold.session) { s.cold.finalStats = { ...s.cold.session.stats }; delete s.cold.session; assert.equal(s.cold.finalStats.fallbacks, 0); }
}
const hash = x => createHash('sha256').update(x).digest('hex');
const files = ['polynomial.js', 'arithmetic.js', 'reduced.js', 'fixtures.js', 'rix.js', 'measure.js', 'combo-bench.js', '../marked-bigint/runner.js', '../marked-bigint/compiler.js', ...names.map(n => `scripts/${n}.rix`)];
const provenance = Object.fromEntries(await Promise.all(files.map(async p => [p, hash(await readFile(new URL(p, import.meta.url)))])));
const fixtureDigest = hash(JSON.stringify(fixtures.map(f => [f.name, f.coefficients.map(canonical), f.points.map(canonical)]), (_, v) => typeof v === 'bigint' ? String(v) : v));
const report = { timestamp: new Date().toISOString(), runtime, versions: process.versions, machine: { cpu: os.cpus()[0].model, arch: os.arch(), platform: os.platform(), release: os.release() }, methodology: { rounds, warmups, targetMs: 15, order: 'rotated within workload', timed: 'full output batch, scalar/method/capability boundaries and result allocations; fresh contexts except deliberately cached RiX plan', excluded: 'parsing/lowering, fixtures, snapshot construction/imports, runtime init, compilation; cached-plan preparation separately excluded and reported', check: 'every calibration/warmup/timed sample outside timing', coefficientOrder: 'descending', snapshot: 'distinct Rational class copies; compare numeric values, not class identity', interval: 'not benchmarked; exact point arithmetic, interval Horner fallback verified separately' }, fixtureDigest, provenance, setup, results };
const lines = ['# Combined polynomial operations — ' + runtime, '', `${rounds} measured rounds, ${warmups} warmups. Each row is ms per complete point batch.`, ''];
for (const g of results) {
  const baseline = g.variants.find(v => v.name === 'JS Horner, core methods').medianMs;
  lines.push(`## ${g.name}`, '', `Degree ${g.metadata.degree}, ${g.metadata.points} points.`, '', '| Path | Median ms | Speedup vs JS core Horner |', '|---|---:|---:|',
    ...g.variants.map(v => `| ${v.name} | ${v.medianMs.toFixed(4)} | ${(baseline / v.medianMs).toFixed(2)}× |`), '');
}
lines.push('The power-sum/Horner comparison changes the algorithm. Integer-pair Horner is written in RiX and normalizes once at the end; its marked version compiles only that numeric function, while RiX retains point traversal and boundary division. Fused host batches also reduce the boundary count. Cached-plan preparation is excluded only from rows explicitly labeled cached. Snapshots return candidate-class values; other paths return current core/RiX values.', '');
const suffix = runtime + (quick ? '-quick' : '');
await mkdir(new URL('./results/', import.meta.url), { recursive: true });
await writeFile(new URL(`./results/polynomial-${suffix}.json`, import.meta.url), JSON.stringify(report, null, 2) + '\n');
await writeFile(new URL(`./results/polynomial-${suffix}.md`, import.meta.url), lines.join('\n'));
console.log(lines.join('\n'));
