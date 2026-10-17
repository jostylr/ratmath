import assert from 'node:assert/strict';
import { compileBigInt, runIntegerSequence } from './compiler.js';
import { powerSource, makePowerFixture } from '../whole-scripts/workloads.js';
import { powerBatch } from '../whole-scripts/optimized.js';
import { rix, Integer, registry, systemContext } from '../runtime.js';

const load = async (source, options) => {
  const compiled = compileBigInt(source, options);
  return import(`data:text/javascript;base64,${Buffer.from(compiled.moduleSource).toString('base64')}`);
};
const fixture = (bases, exponent, modulus) => ({ bases, exponent, modulus,
  integers: bases.map((n) => new Integer(n)), exponentInteger: new Integer(exponent), modulusInteger: new Integer(modulus) });
function interpreted(source, input) {
  const context = new rix.Context();
  context.set('bases', { type: 'sequence', values: input.integers });
  context.set('exponent', input.exponentInteger); context.set('modulus', input.modulusInteger);
  let result;
  for (const node of rix.lower(rix.parse(rix.tokenize(source)))) result = rix.evaluate(node, context, registry, systemContext);
  return result.values.map((n) => { assert.ok(n instanceof Integer); return n.value; });
}
let outputs = 0, sourceComparisons = 0;
const modules = [await load(powerSource), await load(powerSource, { peepholes: true })];
const cases = [];
for (const m of [1n, 2n, 16n, 97n, 1009n]) for (const e of [0n, 1n, 2n, 17n, 64n]) cases.push(fixture([0n, 1n, 2n, m, m + 3n], e, m));
for (const bits of [64, 256, 2048]) cases.push(makePowerFixture({ count: 3, bits, exponentBits: 96, seed: bits }));
for (const input of cases) {
  const expected = interpreted(powerSource, input);
  assert.deepEqual(powerBatch(input.bases, input.exponent, input.modulus, 'binary'), expected);
  for (const module of modules) {
    assert.deepEqual(module.run(input.bases, input.exponent, input.modulus), expected);
    const sequence = runIntegerSequence(module, input);
    assert.equal(sequence.type, 'sequence');
    assert.deepEqual(sequence.values.map((n) => { assert.ok(n instanceof Integer); return n.value; }), expected);
  }
  outputs += expected.length;
}
// Differential source mutations prove we emit the actual IR, rather than
// recognize the fixture and substitute a handwritten modular-power function.
const variants = [
  powerSource.replaceAll('Power', 'Raise').replaceAll('Run', 'Batch').replaceAll('base', 'item').replaceAll('exponent', 'steps').replaceAll('modulus', 'divisor')
    .replace('Batch(items,steps,divisor);', 'Batch(bases,exponent,modulus);'),
  powerSource.replace('r=1%modulus', 'r=3%modulus'),
  powerSource.replace('r*b%modulus', '(r+b)%modulus'),
  powerSource.replace('; r }', '; r+((0-base)//2) }'),
  powerSource.replace('; r }', '; r+((0-base)%modulus) }'),
  powerSource.replace('; r }', '; r+(base//(0-2)) }'),
  // e=exponent aliases the copied import; updating e must update exponent too.
  powerSource.replace('; r }', '; r+exponent }'),
  powerSource.replace('e>0', 'e>=1').replace('e%2==1', 'e%2!=0'),
  powerSource.replace('e>0', '0<e').replace('e%2==1', 'e%2<=0'),
];
const small = fixture([0n, 1n, 3n, 8n, 19n], 17n, 97n);
for (const source of variants) for (const peepholes of [false, true]) {
  const module = await load(source, { peepholes });
  assert.deepEqual(module.run(small.bases, small.exponent, small.modulus), interpreted(source, small));
  sourceComparisons++; outputs += small.bases.length;
}
const rejected = [
  powerSource.replace('r*b%modulus', 'Mystery(r)'),
  powerSource.replace('r*b%modulus', 'r/b'),
  powerSource.replace('e //= 2', 'e := 0-e'), // invalidates a nonnegative loop invariant
  powerSource.replace('e //= 2', 'e := e//2'), // would detach its imported alias
  powerSource.replace('e>0', 'e'), // RiX zero is truthy; JS zero is not
  powerSource.replace('e //= 2', 'e=2'),
  powerSource.replace('(base)->Power', '(base=1)->Power'),
  powerSource.replace('<base,exponent,modulus>', '<base,exponent,modulus> z=@base,'),
  powerSource.replace('Power(base,@exponent,@modulus)', 'Power(base,exponent,@modulus)'),
  powerSource.replace('Power(base,@exponent,@modulus)', 'Run(base,@exponent,@modulus)'),
];
for (const source of rejected) assert.throws(() => compileBigInt(source));
for (const module of modules) {
  for (const args of [[[], 1n, 97n], [[-1n], 1n, 97n], [[1n], -1n, 97n], [[1n], 1n, 0n],
    [[1], 1n, 97n], [Array(2), 1n, 97n], [[1n << 8192n], 1n, 97n], [[1n], 1n << 4096n, 97n]]) assert.throws(() => module.run(...args), RangeError);
  const infinite = await load(powerSource.replace('e //= 2', 'e //= 1'));
  assert.throws(() => infinite.run([2n], 1n, 97n), /max iteration count/);
}
assert.throws(() => compileBigInt('x'.repeat(128 * 1024 + 1)), /128 KiB/);
console.log(JSON.stringify({ outputs, sourceComparisons, rejectedSources: rejected.length, variants: 2, status: 'passed' }));
