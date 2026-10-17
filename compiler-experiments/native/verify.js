import assert from 'node:assert/strict';
import { Rational, Integer, RationalInterval } from '../runtime.js';
import { defineKernel, compileJsCore, compileJsFused } from './plan.js';
import { compileNativeKernel, validateJob } from './host.js';
import { runJs, makeJob, valueKey, createRixRunner, addParts } from './jobs.js';

const spec = (expression, pattern = 'map-reduce') => ({ name: 'verification', execution: 'native', numeric: 'exact-rational', pattern, expression });
let checks = 0;
for (const expression of ['x*y', '(x*x+2*x+1)/(x*x+1)+y', '-x+y', 'x/(y+1)', '123456789012345678901234567890*x-y', '1']) {
  const plan = defineKernel(spec(expression));
  const kernel = await compileNativeKernel(plan);
  const job = makeJob(plan, 11, 64);
  const expected = runJs(plan, job).map(valueKey);
  assert.deepEqual(runJs(plan, job, { fused: true }).map(valueKey), expected);
  assert.deepEqual(createRixRunner(plan, job).run().map(valueKey), expected);
  assert.deepEqual((await kernel.run(job)).values.map(valueKey), expected);
  assert.equal((await compileNativeKernel(plan)).build.cached, true);
  checks += expected.length * 3;
}
for (const dimensions of [[1, 1, 1], [2, 3, 4], [4, 2, 1]]) {
  const plan = defineKernel(spec('x*y', 'matrix-reduce'));
  const [rows, inner, cols] = dimensions;
  const job = { rows, inner, cols,
    left: Array.from({ length: rows * inner }, (_, i) => new Rational(BigInt(i - 4), BigInt(i % 3 + 1))),
    right: Array.from({ length: inner * cols }, (_, i) => new Rational(BigInt(i - 7), BigInt(i % 4 + 1))) };
  const expected = runJs(plan, job).map(valueKey);
  assert.deepEqual(runJs(plan, job, { fused: true }).map(valueKey), expected);
  assert.deepEqual(createRixRunner(plan, job).run().map(valueKey), expected);
  assert.deepEqual((await (await compileNativeKernel(plan)).run(job)).values.map(valueKey), expected);
  checks += expected.length * 3;
}
for (let a = -17; a <= 17; a++) for (let b = 1; b <= 7; b++) {
  const x = new Rational(BigInt(a), BigInt(b)), y = new Rational(BigInt(a + 3), BigInt(8 - b));
  const [n, d] = addParts(x.numerator, x.denominator, y.numerator, y.denominator);
  assert.equal(`${n}/${d}`, valueKey(x.add(y))); checks++;
}
for (const expression of ['x^2', 'x:=1', 'Other(x)', 'x+unknown', 'x; y', 'x ? 1 ?: 2']) assert.throws(() => defineKernel(spec(expression)));
assert.throws(() => defineKernel({ ...spec('x'), execution: 'auto' }));
assert.throws(() => defineKernel({ ...spec('x'), name: 'bad;name' }));
assert.throws(() => defineKernel({ ...spec('x'), code: 'anything' }));
const plan = defineKernel(spec('x/y'));
const kernel = await compileNativeKernel(plan);
const zeroJob = { rows: 1, inner: 1, cols: 1, left: [new Rational(1n)], right: [Rational.zero] };
assert.throws(() => compileJsFused(plan).run(zeroJob.left[0], zeroJob.right[0]), /zero/);
await assert.rejects(kernel.run(zeroJob), /Division by zero/);
for (const expression of ['x', 'x+y', '-x']) {
  const p = defineKernel(spec(expression));
  const a = new Integer(9007199254740993n), b = new Integer(-3n);
  assert.equal(valueKey(compileJsCore(p).run(a, b)), valueKey(compileJsFused(p).run(a, b)));
}
assert.throws(() => validateJob(plan, { ...zeroJob, left: [new RationalInterval(Rational.zero, Rational.one)] }), /Exact/);
assert.throws(() => validateJob(plan, { ...zeroJob, rows: 2 }), /shape/);
assert.throws(() => validateJob(defineKernel(spec('x*y', 'matrix-reduce')), { ...zeroJob, rows: 513 }), /budget/);
await assert.rejects(kernel.run(zeroJob, { timeoutMs: 0 }), /timeout/);
const aborted = new AbortController(); aborted.abort();
await assert.rejects(kernel.run(zeroJob, { signal: aborted.signal }), /aborted/);
// Exercise the worker's own parser independently of JS validation.
const { spawn } = await import('node:child_process');
async function malformed(input) {
  return await new Promise((accept) => {
    const child = spawn(kernel.build.binary, [], { stdio: ['pipe', 'ignore', 'ignore'] });
    child.stdin.on('error', () => {}); child.stdin.end(input); child.on('close', accept);
  });
}
assert.equal(await malformed('RIXNATIVE1\n1 1 1\n1/0\n1/1\n'), 2);
assert.equal(await malformed('RIXNATIVE1\n1 1 1\n1/1\n'), 2);
assert.equal(await malformed('OTHER\n'), 2);
assert.equal(await malformed('RIXNATIVE1\n1 1 1\n1/1\n1/1\ntrailing\n'), 2);
const matrixPlan = defineKernel(spec('x*y', 'matrix-reduce'));
const matrixKernel = await compileNativeKernel(matrixPlan), bigJob = makeJob(matrixPlan, 128);
await assert.rejects(matrixKernel.run(bigJob, { timeoutMs: 1 }), /timed out/);
const active = new AbortController();
const pending = matrixKernel.run(bigJob, { signal: active.signal });
setTimeout(() => active.abort(), 10);
await assert.rejects(pending, /aborted/);
console.log(`Verified ${checks} exact comparisons plus rectangular matrices, native parser errors, cache reuse, integer promotion, domain checks, subset rejection, timeout and active cancellation.`);
