import { Integer, Rational } from '../runtime.js';
let state = 0x46a3fd21;
const random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return state >>> 0; };
export function bits(size) {
  let n = 0n;
  for (let i = 0; i < size; i += 32) n = (n << 32n) | BigInt(random());
  return (n & ((1n << BigInt(size)) - 1n)) | (1n << BigInt(size - 1)) | 1n;
}
export function arithmeticFixtures(count = 64) {
  const fixtures = [];
  for (const size of [32, 256, 2048]) for (const exact of [false, true]) {
    const pairs = Array.from({ length: count }, (_, i) => {
      const b = bits(Math.max(8, size >> 1));
      const a = exact ? bits(size >> 1) * b : bits(size);
      return [new Integer(i % 2 ? -a : a), new Integer(b)];
    });
    for (const op of ['floor', 'modulo', 'remainder', 'divmod']) fixtures.push({ name: `integer-${op}-${size}-${exact ? 'exact' : 'inexact'}`, kind: 'integer', op, pairs });
  }
  for (const size of [64, 256, 1024]) {
    const p = 1n << BigInt(size);
    const make = (name, op, builder) => fixtures.push({ name: `${name}-${size}`, kind: 'rational', op,
      pairs: Array.from({ length: count }, (_, i) => builder(i, bits(size))) });
    make('mixed-add', 'add', (i, n) => [new Rational(i % 2 ? -n : n, p), new Integer(BigInt(i + 2))]);
    make('mixed-subtract', 'subtract', (i, n) => [new Rational(i % 2 ? -n : n, p), new Integer(BigInt(i + 2))]);
    make('integer-left-add', 'add', (i, n) => [new Integer(BigInt(i + 2)), new Rational(i % 2 ? -n : n, p)]);
    make('mixed-multiply', 'multiply', (i, n) => [new Rational(n, p), new Integer(1n << BigInt(i % 12 + 1))]);
    make('mixed-divide', 'divide', (i, n) => [new Rational(n, p), new Integer(i % 2 ? -n : n)]);
    make('equal-denominator-add', 'add', (i, n) => [new Rational(n, p), new Rational(n + BigInt(2 * i + 2), p)]);
    make('equal-denominator-subtract', 'subtract', (i, n) => [new Rational(n, p), new Rational(n + BigInt(2 * i + 2), p)]);
    make('shared-denominator-add', 'add', (i, n) => [new Rational(n, p * 3n), new Rational(n + 2n, p * 5n)]);
    make('unrelated-add', 'add', (i, n) => [new Rational(n, bits(size)), new Rational(bits(size), bits(size))]);
    make('cancel-multiply', 'multiply', (i, n) => [new Rational((p + 1n) * BigInt(2 * i + 3), p), new Rational(p / 2n, (p + 1n) * BigInt(2 * i + 5))]);
    make('unrelated-multiply', 'multiply', (i, n) => [new Rational(n, bits(size)), new Rational(bits(size), bits(size))]);
    make('cancel-divide', 'divide', (i, n) => [new Rational(n, p), new Rational(n, p * 3n)]);
  }
  return fixtures;
}
export function polynomialFixtures() {
  return [
    { name: 'integer-degree32', coefficients: Array.from({ length: 33 }, (_, i) => new Integer(BigInt((i * 7) % 13 - 6))), points: Array.from({ length: 32 }, (_, i) => new Integer((i % 2 ? -1n : 1n) * bits(32))) },
    { name: 'rational-degree16', coefficients: Array.from({ length: 17 }, (_, i) => new Integer(BigInt((i * 7) % 13 - 6))), points: Array.from({ length: 16 }, (_, i) => new Rational((i % 2 ? -1n : 1n) * bits(64), bits(64))) },
    { name: 'rational-coefficients-degree16', coefficients: Array.from({ length: 17 }, (_, i) => new Rational(BigInt((i * 7) % 13 - 6), BigInt([3, 5, 7][i % 3]))), points: Array.from({ length: 16 }, (_, i) => new Rational((i % 2 ? -1n : 1n) * bits(64), bits(64))) },
    { name: 'zero-polynomial-degree128', skipPowers: true, coefficients: Array.from({ length: 129 }, () => new Integer(0n)), points: Array.from({ length: 4 }, () => new Rational(bits(128), bits(128))) },
    { name: 'cancellation-degree32', coefficients: Array.from({ length: 33 }, (_, i) => new Integer(BigInt(i % 2 ? -1 : 1))), points: [new Rational(1n), new Rational(-1n), new Rational(0n), new Rational(1n, 2n)] },
  ];
}
