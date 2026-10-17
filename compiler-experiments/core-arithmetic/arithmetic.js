import { Integer, Rational, rix } from '../runtime.js';
import { reduced } from './reduced.js';
export const plain = x => (x instanceof Integer || x instanceof Rational) &&
  Object.getPrototypeOf(x) === (x instanceof Integer ? Integer.prototype : Rational.prototype) &&
  Object.getOwnPropertyNames(x).every(k => k === '_ext' && x._ext === undefined) && !Object.getOwnPropertySymbols(x).length;
export const parts = x => x instanceof Integer ? [x.value, 1n] : [x.numerator, x.denominator];
export function currentFloor(a, b) {
  const quotient = a.divide(b), [n, d] = parts(quotient), q = n / d;
  return new Integer(n % d !== 0n && n < 0n ? q - 1n : q);
}
export function currentModulo(a, b) {
  if (b.value <= 0n) throw new Error('Modulo divisor must be positive');
  return a.subtract(b.multiply(currentFloor(a, b)));
}
export function floorInteger(a, b) {
  if (b.value === 0n) throw new Error('Division by zero');
  const x = a.value, y = b.value, q = x / y;
  return new Integer(x % y !== 0n && (x < 0n) !== (y < 0n) ? q - 1n : q);
}
export function moduloInteger(a, b) {
  if (b.value <= 0n) throw new Error('Modulo divisor must be positive');
  const r = a.value % b.value;
  return new Integer(r < 0n ? r + b.value : r);
}
export function remainderInteger(a, b) {
  if (b.value === 0n) throw new Error('Modulo by zero');
  return new Integer(a.value % b.value);
}
export function divmodInteger(a, b) {
  if (b.value <= 0n) throw new Error('Division with remainder divisor must be positive');
  const x = a.value, y = b.value, q = x / y, r = x % y;
  return [new Integer(r < 0n ? q - 1n : q), new Integer(r < 0n ? r + y : r)];
}
// Actual production objects, so the last constructor still performs a GCD.
export function arithmetic(op, a, b) {
  if (!plain(a) || !plain(b) || (a instanceof Integer && b instanceof Integer)) return a[op](b);
  const [n, d] = reduced(op, ...parts(a), ...parts(b));
  return new Rational(n, d);
}
export function createFastRegistry() {
  const registry = rix.createDefaultRegistry();
  const operations = { ADD: 'add', SUB: 'subtract', MUL: 'multiply', DIV: 'divide' };
  for (const [name, op] of Object.entries(operations)) {
    const original = registry.get(name).impl;
    registry.override(name, (args, context, evaluate) => args.length === 2 && args.every(plain)
      ? arithmetic(op, ...args) : original(args, context, evaluate), { pure: true });
  }
  for (const [name, candidate] of [['INTDIV', floorInteger], ['MOD', moduloInteger]]) {
    const original = registry.get(name).impl;
    registry.override(name, (args, context, evaluate) => args.length === 2 && args.every(x => plain(x) && x instanceof Integer)
      ? candidate(...args) : original(args, context, evaluate), { pure: true });
  }
  return registry;
}
