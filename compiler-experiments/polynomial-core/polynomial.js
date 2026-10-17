import { Integer } from './integer.js';
import { Rational } from './rational.js';
import { RationalInterval } from './rational-interval.js';
import { isPlainInteger } from './experimental-reduced.js';

// Descending coefficients: [a,b,c] means a*x^2 + b*x + c.
// Explicit arithmetic API: it does not consult RiX operator/method extensions.
function validate(coefficients, x) {
  if (!Array.isArray(coefficients)) throw new TypeError('Coefficients must be an array');
  const numeric = v => v instanceof Integer || v instanceof Rational || v instanceof RationalInterval;
  if (!numeric(x)) throw new TypeError('Polynomial point must be Integer, Rational or RationalInterval');
  for (const c of coefficients) if (!numeric(c)) throw new TypeError('Polynomial coefficients must be Integer, Rational or RationalInterval');
}

export function evaluatePolynomial(coefficients, x) {
  validate(coefficients, x);
  let r = new Integer(0n);
  for (const c of coefficients) r = r.multiply(x).add(c);
  return r;
}

export function evaluatePolynomialFused(coefficients, x) {
  validate(coefficients, x);
  if (!coefficients.length) return new Integer(0n);
  if (isPlainInteger(x) && coefficients.every(isPlainInteger)) {
    let r = 0n;
    for (const c of coefficients) r = r * x.value + c.value;
    return new Integer(r);
  }
  // Only actual plain canonical core values may enter the private-field path.
  // No arbitrary numerator/denominator pair is accepted by the factory.
  const result = Rational._polynomialReduced(coefficients, x);
  return result === undefined ? evaluatePolynomial(coefficients, x) : result;
}

export function evaluatePolynomialBatch(coefficients, points, { fused = false } = {}) {
  if (!Array.isArray(points)) throw new TypeError('Polynomial points must be an array');
  // Validate all arguments even for an empty point batch; no cross-call caching.
  validate(coefficients, new Integer(0n));
  const evaluate = fused ? evaluatePolynomialFused : evaluatePolynomial;
  return points.map(x => evaluate(coefficients, x));
}
