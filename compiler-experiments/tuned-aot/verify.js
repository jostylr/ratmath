import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compileBigInt, runIntegerSequence } from './compiler.js';
import { createIntegerFastRegistry, runInterpreted } from './interpreter-fastpaths.js';
import { createManagedKernel } from './managed.js';
import { makePowerFixture, powerIR } from '../whole-scripts/workloads.js';
import { buildAddon } from '../whole-scripts/build.js';
import { powerBatch } from '../whole-scripts/optimized.js';
import { rix, Integer, Rational, registry, systemContext } from '../runtime.js';

const sources = Object.fromEntries(await Promise.all(['window', 'montgomery'].map(async (name) => [name, await readFile(new URL(`./scripts/${name}.rix`, import.meta.url), 'utf8')])));
const load = async (source, options) => {
  const compiled = compileBigInt(source, options);
  return import(`data:text/javascript;base64,${Buffer.from(compiled.moduleSource).toString('base64')}`);
};
const modules = { window: await load(sources.window), montgomery: await load(sources.montgomery, { requireOddModulus: true }),
  generalMontgomery: await load(sources.montgomery, { powerOfTwo: false, requireOddModulus: true }) };
const irs = Object.fromEntries(Object.entries(sources).map(([name, source]) => [name, rix.lower(rix.parse(rix.tokenize(source)))]));
const { addon } = await buildAddon();
const fast = createIntegerFastRegistry({ countHits: true });
const fixture = (bases, exponent, modulus) => ({ bases, exponent, modulus, integers: bases.map((n) => new Integer(n)), exponentInteger: new Integer(exponent), modulusInteger: new Integer(modulus) });
const keys = (result) => { assert.equal(result.type, 'sequence'); return result.values.map((x) => { assert.ok(x instanceof Integer); return x.value; }); };
let outputs = 0, differentialCases = 0;
const cases = [];
for (const modulus of [1n, 2n, 16n, 97n, 1009n]) for (const exponent of [0n, 1n, 2n, 17n, 64n, 127n, 128n]) cases.push(fixture([0n, 1n, 2n, modulus, modulus + 3n], exponent, modulus));
for (const bits of [64, 256, 2048]) cases.push(makePowerFixture({ count: 3, bits, exponentBits: 96, seed: bits }));
for (const input of cases) {
  const expected = powerBatch(input.bases, input.exponent, input.modulus, 'binary');
  assert.deepEqual(addon.powerBatch(input.bases, input.exponent, input.modulus), expected);
  for (const name of ['window', 'montgomery']) {
    if (name === 'montgomery' && !(input.modulus & 1n)) { assert.throws(() => modules[name].run(input.bases, input.exponent, input.modulus), /odd modulus/); continue; }
    assert.deepEqual(keys(runInterpreted(irs[name], input)), expected);
    assert.deepEqual(keys(runInterpreted(irs[name], input, fast.registry)), expected);
    assert.deepEqual(keys(runIntegerSequence(modules[name], input)), expected);
    assert.deepEqual(powerBatch(input.bases, input.exponent, input.modulus, name === 'window' ? 'window-6' : 'montgomery-5'), expected);
    if (name === 'montgomery') assert.deepEqual(modules.generalMontgomery.run(input.bases, input.exponent, input.modulus), expected);
    differentialCases++;
  }
  outputs += expected.length;
}
// Guarded interpreter arithmetic: signed floor division/modulo, rational
// fallback and original zero/negative-divisor error behavior.
for (const name of ['MOD', 'INTDIV']) for (const a of [-19n, -3n, 0n, 3n, 19n]) for (const b of [-5n, -1n, 1n, 5n]) {
  const args = [new Integer(a), new Integer(b)];
  if (name === 'MOD' && b < 0n) { assert.throws(() => fast.registry.get(name).impl(args), /positive/); continue; }
  assert.equal(fast.registry.get(name).impl(args).value, registry.get(name).impl(args).value);
}
for (const name of ['MOD', 'INTDIV']) {
  const args = [new Rational(-7n, 3n), new Rational(5n, 2n)];
  assert.equal(fast.registry.get(name).impl(args).toString(), registry.get(name).impl(args).toString());
  assert.throws(() => fast.registry.get(name).impl([new Integer(1n), new Integer(0n)]));
}
assert.ok(fast.hits.modulo > 0 && fast.hits.intdiv > 0 && fast.hits.fallback > 0);
assert.deepEqual(keys(runInterpreted(powerIR, cases[20], fast.registry)), keys(runInterpreted(powerIR, cases[20])));
const probe = cases.at(-2);
let mutations = 0;
for (const [name, source] of Object.entries(sources)) for (const variant of [
  source.replace(name === 'window' ? 'width:=6' : 'width:=5', 'width:=3'),
  source.replaceAll('Run', 'Batch').replaceAll('OddPowers', 'Table'),
]) {
  const module = await load(variant, { requireOddModulus: name === 'montgomery' });
  assert.deepEqual(module.run(probe.bases, probe.exponent, probe.modulus), keys(runInterpreted(rix.lower(rix.parse(rix.tokenize(variant))), probe)));
  mutations++;
}
// A frozen radix fact must retain its original shift if the source variable
// that produced it is subsequently updated in the same loop.
const shiftSnapshot = 'Run(bases,exponent,modulus) -> bases.Map((base)->{@ i=1,radix=2^i; i<4; i+=1; ; base//radix }); Run(bases,exponent,modulus);';
const shiftModule = await load(shiftSnapshot);
assert.deepEqual(shiftModule.run([19n, 20n], 1n, 97n), [9n, 10n]);
for (const n of [-19n, -4n, -1n, 0n, 1n, 19n]) {
  const signed = `Run(bases,exponent,modulus) -> bases.Map((base)->(${n < 0n ? '0-' + -n : n})//(2^2)); Run(bases,exponent,modulus);`;
  const module = await load(signed);
  assert.deepEqual(module.run([0n], 0n, 97n), keys(runInterpreted(rix.lower(rix.parse(rix.tokenize(signed))), fixture([0n], 0n, 97n))));
}
for (const source of [sources.window.replace('bits.Push(e%2)', 'bits.Push!(e%2)'), sources.window.replace('r*r%modulus', 'Unknown(r)'),
  sources.window.replace('i+=1', 'i:=0-i'), sources.window.replace('Bits(exponent) -> {@', 'Bits(exponent) -> {@ <exponent>')]) assert.throws(() => compileBigInt(source));
for (const module of Object.values(modules)) {
  for (const args of [[[], 1n, 97n], [[-1n], 1n, 97n], [[1n], -1n, 97n], [[1n], 1n, 0n], [[1], 1n, 97n], [Array(1), 1n, 97n]]) assert.throws(() => module.run(...args));
}
const managed = createManagedKernel(sources.window);
const first = await managed.run(probe), again = await managed.run(probe);
assert.deepEqual(keys(first), keys(again)); assert.equal(managed.stats.builds, 1); assert.equal(managed.stats.calls, 2);
assert.equal(first._ext.get('_mutable').value, 1n);
const context = new rix.Context(); context.set('result', first);
rix.parseAndEvaluate('result.Push!(5);', { context, registry, systemContext });
assert.equal(first.values.at(-1).value, 5n);
const managedMont = createManagedKernel(sources.montgomery, { requireOddModulus: true });
assert.deepEqual(keys(await managedMont.run(probe)), powerBatch(probe.bases, probe.exponent, probe.modulus, 'binary'));
await assert.rejects(managedMont.run(fixture([2n], 17n, 16n)), /odd modulus/);
console.log(JSON.stringify({ outputs, differentialCases, mutations, interpreterHits: fast.hits, managedBuilds: managed.stats.builds, status: 'passed' }));
