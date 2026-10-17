import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { here } from './build.js';
let state = 0x7f42b139;
const random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return state >>> 0; };
const bits = size => { let n = 0n; for (let i = 0; i < size; i += 32) n = (n << 32n) | BigInt(random()); return (n & ((1n << BigInt(size)) - 1n)) | (1n << BigInt(size - 1)) | 1n; };
const I = n => ({ kind: 'Integer', value: String(n) });
const R = (n, d = 1n) => ({ kind: 'Rational', numerator: String(n), denominator: String(d) });
const S = values => ({ kind: 'sequence', values });
export function materialize(data, core) {
  if (data.kind === 'Integer') return new core.Integer(BigInt(data.value));
  if (data.kind === 'Rational') return new core.Rational(BigInt(data.numerator), BigInt(data.denominator));
  if (data.kind === 'interval') return new core.RationalInterval(materialize(data.low, core), materialize(data.high, core));
  if (data.kind === 'sequence') return { type: 'sequence', values: data.values.map(x => materialize(x, core)), _ext: new Map([['_mutable', new core.Integer(1n)]]) };
  return Object.fromEntries(Object.entries(data).map(([name, value]) => [name, materialize(value, core)]));
}
export async function workloads(quick = false) {
  state = 0x7f42b139;
  const sources = Object.fromEntries(await Promise.all(['horner', 'mixed-loop', 'division', 'modulo', 'modular-powers'].map(async name => [name, await readFile(resolve(here, `scripts/${name}.rix`), 'utf8')])));
  const fixtures = [];
  const poly = (name, degree, count, size, rational, rationalCoefficients = false, zero = false) => {
    const coefficients = Array.from({ length: degree + 1 }, (_, i) => rationalCoefficients ? R(BigInt(i % 13 - 6), BigInt([3, 5, 7][i % 3])) : I(zero ? 0n : BigInt(i % 13 - 6)));
    const points = Array.from({ length: count }, (_, i) => rational ? R((i % 2 ? -1n : 1n) * bits(size), bits(size)) : I((i % 2 ? -1n : 1n) * bits(size)));
    fixtures.push({ name, source: sources.horner, data: { coefficients: S(coefficients), points: S(points) }, dimensions: { degree, count, pointBits: size, rational, rationalCoefficients } });
  };
  poly('integer-horner', 32, quick ? 4 : 32, 32, false);
  poly('rational-horner', 16, quick ? 4 : 16, 64, true);
  poly('rational-coefficients-horner', 16, quick ? 4 : 16, 64, true, true);
  poly('larger-rational-horner', quick ? 12 : 32, quick ? 2 : 8, 128, true);
  poly('zero-rational-horner', 128, 4, 128, true, false, true);
  fixtures.push({ name: 'interval-horner', source: sources.horner,
    data: { coefficients: S(Array.from({ length: 9 }, (_, i) => I(BigInt(i % 5 - 2)))), points: S(Array.from({ length: 8 }, (_, i) => ({ kind: 'interval', low: R(BigInt(i - 4), 7n), high: R(BigInt(i + 3), 7n) }))) }, dimensions: { degree: 8, count: 8, interval: true } });
  for (const size of [256, 1024]) fixtures.push({ name: `mixed-rational-loop-${size}`, source: sources['mixed-loop'],
    data: { count: I(quick ? 16n : 128n), points: S(Array.from({ length: quick ? 2 : 8 }, (_, i) => R((i % 2 ? -1n : 1n) * bits(size), 1n << BigInt(size)))) }, dimensions: { count: quick ? 2 : 8, iterations: quick ? 16 : 128, denominatorBits: size + 1 } });
  for (const operation of ['division', 'modulo']) for (const exact of [false, true]) {
    const divisor = bits(1024), count = quick ? 16 : 128;
    fixtures.push({ name: `integer-${operation}-${exact ? 'exact' : 'inexact'}`, source: sources[operation], data: { divisor: I(divisor), values: S(Array.from({ length: count }, (_, i) => {
      const n = exact ? bits(1024) * divisor : bits(2048); return I(i % 2 ? -n : n);
    })) }, dimensions: { count, numeratorBits: 2048, divisorBits: 1024, exact } });
  }
  const modulus = bits(quick ? 256 : 1024);
  fixtures.push({ name: 'binary-modular-powers', source: sources['modular-powers'], data: { bases: S(Array.from({ length: quick ? 2 : 6 }, () => I(bits(quick ? 256 : 1024)))), exponent: I(bits(quick ? 96 : 512)), modulus: I(modulus) }, dimensions: { count: quick ? 2 : 6, modulusBits: quick ? 256 : 1024, exponentBits: quick ? 96 : 512 } });
  return fixtures;
}
