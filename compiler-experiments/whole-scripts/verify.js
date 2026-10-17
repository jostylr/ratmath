import assert from 'node:assert/strict';
import { Integer } from '../runtime.js';
import { buildAddon } from './build.js';
import { binaryPower, powerBatch, scoreBigInt, scoreNumber, processJobs } from './optimized.js';
import { makePowerFixture, runPowerRix, makeAsyncFixture, createHost, runAsyncRix, integerKeys } from './workloads.js';

const { addon, build } = await buildAddon();
let powers = 0, scores = 0, workflows = 0;
const algorithms = ['binary', ...Array.from({ length: 6 }, (_, i) => `window-${i + 1}`), ...Array.from({ length: 5 }, (_, i) => `montgomery-${i + 1}`)];
for (const modulus of [1n, 3n, 17n, 101n, 65537n, (1n << 127n) - 1n]) {
  for (const exponent of [0n, 1n, 2n, 13n, 256n, 511n]) {
    const bases = [0n, 1n, 2n, modulus - 1n, modulus + 1n, (1n << 180n) + 3n];
    const expected = bases.map((b) => binaryPower(b, exponent, modulus));
    assert.deepEqual(addon.powerBatch(bases, exponent, modulus), expected);
    assert.deepEqual(addon.binaryBatch(bases, exponent, modulus), expected);
    for (const algorithm of algorithms) assert.deepEqual(powerBatch(bases, exponent, modulus, algorithm), expected, algorithm);
    const fixture = { integers: bases.map((b) => new Integer(b)), exponentInteger: new Integer(exponent), modulusInteger: new Integer(modulus) };
    assert.deepEqual(integerKeys(runPowerRix(fixture)), expected.map(String));
    powers += bases.length;
  }
}
for (const [bits, exponentBits] of [[256, 64], [1024, 256], [2048, 1024], [4096, 256]]) {
  const fixture = makePowerFixture({ count: 3, bits, exponentBits });
  const expected = powerBatch(fixture.bases, fixture.exponent, fixture.modulus, 'binary');
  for (const algorithm of algorithms) assert.deepEqual(powerBatch(fixture.bases, fixture.exponent, fixture.modulus, algorithm), expected);
  assert.deepEqual(addon.powerBatch(fixture.bases, fixture.exponent, fixture.modulus), expected);
  assert.deepEqual(addon.binaryBatch(fixture.bases, fixture.exponent, fixture.modulus), expected);
  assert.deepEqual(integerKeys(runPowerRix(fixture)), expected.map(String));
  powers += expected.length;
}
assert.deepEqual(addon.powerBatch([2n, 3n], 0n, 2n), [1n, 1n]);
assert.deepEqual(powerBatch([2n, 3n], 20n, 100n, 'window-4'), addon.powerBatch([2n, 3n], 20n, 100n));
for (const value of [0n, 1n, 2n, 0x7fffffffn, 0xffffffffn]) for (const bias of [0n, 1n, 0x80000000n, 0xffffffffn]) {
  assert.equal(scoreNumber(value, bias), scoreBigInt(value, bias));
  assert.equal(addon.score(value, bias), scoreBigInt(value, bias)); scores++;
}
let state = 0x76543210;
for (let i = 0; i < 1000; i++) {
  state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
  const a = BigInt(state >>> 0); state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
  const b = BigInt(state >>> 0);
  assert.equal(scoreNumber(a, b), scoreBigInt(a, b));
  assert.equal(addon.score(a, b), scoreBigInt(a, b)); scores++;
}
const fixture = makeAsyncFixture({ count: 7 });
for (const delayMs of [0, 1]) {
  const expectedHost = createHost(fixture, { delayMs });
  const expected = await processJobs(fixture.jobs, fixture.bias, expectedHost, scoreBigInt);
  const runners = [
    (host) => runAsyncRix(fixture, host),
    (host) => processJobs(fixture.jobs, fixture.bias, host, scoreNumber),
    (host) => processJobs(fixture.jobs, fixture.bias, host, addon.score),
    (host) => addon.runWorkflow(fixture.jobs, fixture.bias.value, host.fetch, host.publish, Integer),
  ];
  for (const run of runners) {
    const host = createHost(fixture, { delayMs });
    assert.deepEqual(integerKeys(await run(host)), integerKeys(expected));
    assert.deepEqual(host.trace, expectedHost.trace);
    assert.equal(host.stats().fetches, fixture.count);
    workflows++;
    for (const failure of [{ failAt: 2 }, { publishFailAt: 2 }]) {
      const failingHost = createHost(fixture, failure);
      await assert.rejects(run(failingHost), /Fixture (fetch|publish) failed/);
      assert.equal(failingHost.stats().fetches, 3);
      assert.equal(failingHost.stats().published, 2);
    }
  }
}
for (const [bases, exponent, modulus] of [[[], 1n, 3n], [[1n], -1n, 3n], [[1n], 1n, 0n], [[-1n], 1n, 3n], [[1], 1n, 3n], [[1n << 8192n], 1n, 3n], [[1n], 1n << 4096n, 3n]]) {
  assert.throws(() => addon.powerBatch(bases, exponent, modulus));
  assert.throws(() => powerBatch(bases, exponent, modulus));
}
for (const value of [-1n, 0x100000000n, 1]) assert.throws(() => addon.score(value, 0n));
assert.throws(() => addon.runWorkflow([], 0n, async () => null, () => null, Integer));
assert.throws(() => addon.runWorkflow(fixture.jobs, 0n, null, () => null, Integer));
await assert.rejects(addon.runWorkflow(fixture.jobs, 0n, () => { throw new Error('synchronous fetch failure'); }, () => null, Integer), /synchronous fetch/);
await assert.rejects(addon.runWorkflow(fixture.jobs, 0n, () => new Integer(3n), () => null, Integer), /must return a Promise/);
await assert.rejects(addon.runWorkflow(fixture.jobs, 0n, async () => new Integer(-1n), () => null, Integer), /Unsigned/);
// Complete many independent state machines, including interleaved activations,
// to exercise lifetime/cleanup beyond a single successful or rejected Promise.
for (let i = 0; i < 25; i++) {
  const first = createHost(fixture), second = createHost(fixture);
  const [a, b] = await Promise.all([
    addon.runWorkflow(fixture.jobs, fixture.bias.value, first.fetch, first.publish, Integer),
    addon.runWorkflow(fixture.jobs, fixture.bias.value, second.fetch, second.publish, Integer),
  ]);
  assert.deepEqual(integerKeys(a), integerKeys(b)); assert.deepEqual(first.trace, second.trace);
}
assert.equal((await buildAddon()).build.cached, true);
console.log(JSON.stringify({ powers, algorithms: algorithms.length, scores, workflows, guardChecks: 'passed', hostFailureOrdering: 'passed', cachedBuild: true, buildKey: build.key }));
