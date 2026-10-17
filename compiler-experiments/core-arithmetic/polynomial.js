import { Integer, Rational } from '../runtime.js';
import { plain, parts, arithmetic } from './arithmetic.js';
import { gcd } from './reduced.js';
export function hornerCurrent(coefficients, x) {
  let result = new Integer(0n);
  for (const coefficient of coefficients) result = result.multiply(x).add(coefficient);
  return result;
}
export function hornerFast(coefficients, x) {
  let result = new Integer(0n);
  for (const coefficient of coefficients) result = arithmetic('add', arithmetic('multiply', result, x), coefficient);
  return result;
}
export function powerSumCurrent(coefficients, x) {
  let result = new Integer(0n);
  for (let i = 0; i < coefficients.length; i++) {
    let power = new Integer(1n);
    for (let j = 0; j < coefficients.length - i - 1; j++) power = power.multiply(x);
    result = result.add(coefficients[i].multiply(power));
  }
  return result;
}
export function preparePolynomial(coefficients, { pruneLeadingZeros = false } = {}) {
  if (!Array.isArray(coefficients)) throw new TypeError('Coefficient array required');
  const saved = coefficients.slice(), eligible = saved.every(plain);
  let common = 1n, numerators = [];
  if (eligible) {
    for (const c of saved) { const [, d] = parts(c); common = common / gcd(common, d) * d; }
    numerators = saved.map(c => { const [n, d] = parts(c); return n * (common / d); });
  }
  if (pruneLeadingZeros && eligible) {
    while (numerators.length > 1 && numerators[0] === 0n) numerators.shift();
  }
  const rationalCoefficients = saved.some(c => c instanceof Rational);
  const descriptor = Object.freeze({ operation: 'polynomial', coefficientOrder: 'descending', degree: saved.length - 1,
    method: pruneLeadingZeros ? 'horner-prune-leading-zeros' : 'horner', arithmetic: 'exact', backend: eligible ? 'BigInt common-denominator kernel' : 'RatMath methods',
    coefficientNumerators: Object.freeze(numerators.map(String)), coefficientDenominator: String(common) });
  const evaluate = (x, diagnostics) => {
    if (!saved.length) return new Integer(0n);
    if (!eligible || !plain(x)) return hornerCurrent(saved, x);
    const [a, b] = parts(x);
    let n = numerators[0], d = 1n, peak = 0;
    for (let i = 1; i < numerators.length; i++) {
      d *= b;
      n = n * a + numerators[i] * d;
      if (diagnostics) peak = Math.max(peak, (n < 0n ? -n : n).toString(2).length, d.toString(2).length);
    }
    d *= common;
    if (diagnostics) { diagnostics.peakBits = peak; diagnostics.finalUnreducedBits = Math.max((n < 0n ? -n : n).toString(2).length, d.toString(2).length); }
    return x instanceof Rational || rationalCoefficients ? new Rational(n, d) : new Integer(n);
  };
  return Object.freeze({ descriptor, evaluate, map: points => points.map(x => evaluate(x)) });
}
export const polynomialBatch = (coefficients, points) => preparePolynomial(coefficients).map(points);
