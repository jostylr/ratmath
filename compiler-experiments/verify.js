import assert from 'node:assert/strict';
import { buildWorkloads, canonical, guardedNumberPolynomial, fusedPolynomial, fixedDenominator } from './workloads.js';
import { compileExpression } from './compile.js';
import { compileI32 } from './wasm.js';
import { Integer, Rational, RationalInterval, parseIR } from './runtime.js';

let checked = 0;
for (const workload of buildWorkloads(256)) {
  for (const variant of workload.variants) {
    workload.verify(variant, variant.run());
    checked += 256;
  }
}
const node = parseIR('x*x + 2*x + 1');
const methods = compileExpression(node, 'methods');
const bigint = compileExpression(node, 'bigint');
for (const n of [-2049n, -2048n, -1n, 0n, 1n, 2047n, 2048n, 9007199254740993n, -(1n << 200n), 1n << 200n]) {
  const x = new Integer(n), expected = `${(n + 1n) ** 2n}/1`;
  assert.equal(canonical(methods.run(null, x)), expected);
  assert.equal(canonical(bigint.run(null, n)), expected);
  assert.equal(canonical(guardedNumberPolynomial(x)), expected);
}
assert.throws(() => guardedNumberPolynomial(new Rational(1n, 2n)), /Integer/);
for (const [a, b] of [[0n, 7n], [-1n, 1n], [-7n, 3n], [13n, -17n], [1n << 200n, (1n << 190n) + 1n]]) {
  const x = new Rational(a, b);
  const expected = canonical(x.add(Rational.one).multiply(x.add(Rational.one)));
  assert.equal(canonical(fusedPolynomial(x)), expected);
  assert.equal(canonical(fusedPolynomial(x, true)), expected);
}
assert.throws(() => fusedPolynomial(new RationalInterval(new Rational(-1n), new Rational(1n))), /Rational required/);
for (const [x, step] of [[new Rational(100n, 101n), new Rational(1n, 101n)], [new Rational(1n, 3n), new Rational(-1n, 3n)], [new Rational(1n, 3n), new Rational(1n, 7n)]]) {
  let expected = x;
  for (let i = 0; i < 32; i++) expected = expected.add(step);
  assert.equal(canonical(fixedDenominator(x, step, 32)), canonical(expected));
}
const interval = new RationalInterval(new Rational(-2n), new Rational(3n));
assert.equal(canonical(methods.run(null, interval)), '[-9/1,16/1]');
for (const mode of ['runtime', 'hoisted', 'methods', 'bigint']) {
  for (const source of ['x / 2', 'x^2', 'x + other', '1/2 + x', 'x := 2']) {
    assert.throws(() => compileExpression(parseIR(source), mode));
  }
}
assert.throws(() => compileExpression(node, 'unknown'));
assert.throws(() => compileI32(parseIR('x / 2')));
const wasm = compileI32(node, 8);
const numbers = [-2048, -1, 0, 1, 2047];
wasm.inputs.set(numbers);
assert.deepEqual(Array.from(wasm.batch(numbers.length)), numbers.map((x) => (x + 1) ** 2));
for (const x of numbers) assert.equal(wasm.kernel(x), (x + 1) ** 2);
assert.equal(wasm.batch(0).length, 0);
assert.throws(() => wasm.batch(9), /capacity/);
assert.throws(() => wasm.batch(-1), /capacity/);
wasm.inputs[0] = 17;
assert.equal(wasm.batch(1)[0], 324);
const alternate = parseIR('(x-2)*(x+3)');
for (const x of [-20, -1, 0, 17]) {
  assert.equal(compileI32(alternate).kernel(x), (x - 2) * (x + 3));
  assert.equal(compileExpression(alternate, 'bigint').run(null, BigInt(x)), BigInt((x - 2) * (x + 3)));
}
console.log(`Verified ${checked} workload outputs plus arithmetic boundaries, result types, specialization fallbacks, interval semantics, subset rejection and Wasm batch bounds.`);
