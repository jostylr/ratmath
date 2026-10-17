import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Integer, Rational, RationalInterval, rix, registry } from '../runtime.js';
import { floorInteger, moduloInteger, remainderInteger, divmodInteger, currentFloor, currentModulo, arithmetic, parts } from './arithmetic.js';
import { gcd } from './reduced.js';
import { hornerCurrent, hornerFast, powerSumCurrent, polynomialBatch, preparePolynomial } from './polynomial.js';
import { createExploration } from './rix.js';
import { createMarkedSession } from '../marked-bigint/runner.js';
import { arithmeticFixtures, polynomialFixtures } from './fixtures.js';
import { Rational as Candidate } from './generated/candidate-rational.js';
import { Rational as Control } from './generated/baseline-rational.js';
const pair = x => x instanceof Integer ? [x.value, 1n] : [x.numerator, x.denominator];
const canonical = x => x?.type === 'sequence' ? x.values.map(canonical) : x instanceof RationalInterval ? [canonical(x.low), canonical(x.high)] : Array.isArray(x) ? x.map(canonical) : pair(x);
const check = (actual, expected) => { assert.deepEqual(canonical(actual), canonical(expected)); };
const clone = (C, x) => x instanceof Integer ? x : new C(x.numerator, x.denominator);
let scalar = 0;
for (const a of [-99n, -7n, -1n, 0n, 1n, 7n, 99n]) for (const b of [-11n, -2n, -1n, 1n, 2n, 11n]) {
  const aa = new Integer(a), bb = new Integer(b);
  check(floorInteger(aa, bb), currentFloor(aa, bb));
  check(floorInteger(aa, bb), registry.get('INTDIV').impl([aa, bb]));
  check(remainderInteger(aa, bb), aa.modulo(bb));
  if (b > 0n) { check(moduloInteger(aa, bb), currentModulo(aa, bb)); check(moduloInteger(aa, bb), registry.get('MOD').impl([aa, bb])); check(divmodInteger(aa, bb), [currentFloor(aa, bb), currentModulo(aa, bb)]); }
  scalar++;
}
for (const n of [floorInteger, moduloInteger, remainderInteger, divmodInteger]) assert.throws(() => n(new Integer(1n), new Integer(0n)));
assert.throws(() => moduloInteger(new Integer(1n), new Integer(-1n)), /positive/);
assert.equal(remainderInteger(new Integer(-7n), new Integer(3n)).value, -1n);
assert.equal(moduloInteger(new Integer(-7n), new Integer(3n)).value, 2n);
for (const a of [-7n, -1n, 0n, 1n, 7n]) for (const b of [1n, 2n, 3n, 10n]) for (const c of [-7n, -1n, 0n, 1n, 7n]) for (const d of [1n, 2n, 3n, 10n]) for (const op of ['add', 'subtract', 'multiply', 'divide']) {
  const aa = new Rational(a, b), bb = new Rational(c, d), ca = new Candidate(a, b), cb = new Candidate(c, d);
  if (op === 'divide' && c === 0n) { assert.throws(() => ca.divide(cb), /Division by zero/); assert.throws(() => arithmetic(op, aa, bb), /Division by zero/); continue; }
  const expected = aa[op](bb), candidate = ca[op](cb);
  check(candidate, expected); check(arithmetic(op, aa, bb), expected);
  assert.equal(gcd(candidate.numerator, candidate.denominator), 1n); assert.ok(candidate.denominator > 0n);
  assert.equal(candidate.toString(), expected.toString()); scalar++;
}
for (const f of arithmeticFixtures(12).filter(f => f.kind === 'rational')) for (const [a, b] of f.pairs) {
  const expected = a[f.op](b), candidate = a instanceof Integer ? expected : clone(Candidate, a)[f.op](clone(Candidate, b));
  check(arithmetic(f.op, a, b), expected);
  if (!(a instanceof Integer)) { check(candidate, expected); check(clone(Control, a)[f.op](clone(Control, b)), expected); }
  assert.equal(gcd(candidate.numerator, candidate.denominator), 1n); scalar++;
}
const sources = Object.fromEntries(await Promise.all(['horner', 'powers', 'offload', 'plan', 'descriptor', 'fraction-horner', 'fraction-horner-marked'].map(async name => [name, await readFile(new URL(`./scripts/${name}.rix`, import.meta.url), 'utf8')])));
const exploration = createExploration(), irs = Object.fromEntries(Object.entries(sources).map(([name, source]) => [name, exploration.parse(source)]));
let points = 0;
for (const f of polynomialFixtures()) {
  const expected = f.points.map(x => hornerCurrent(f.coefficients, x));
  check(f.points.map(x => hornerFast(f.coefficients, x)), expected);
  if (!f.skipPowers) check(f.points.map(x => powerSumCurrent(f.coefficients, x)), expected);
  check(polynomialBatch(f.coefficients, f.points), expected);
  const plan = preparePolynomial(f.coefficients); check(plan.map(f.points), expected);
  check(preparePolynomial(f.coefficients, { pruneLeadingZeros: true }).map(f.points), expected);
  for (const [name, ir] of Object.entries(irs)) {
    if (name === 'powers' && f.skipPowers) continue;
    if (name.startsWith('fraction-')) {
      if (!f.coefficients.every(x => x instanceof Integer) || !f.points.every(x => x instanceof Rational)) continue;
      if (name.endsWith('marked')) { const session = createMarkedSession(); check(session.load(sources[name]).run({ bindings: { coefficients: { type: 'sequence', values: f.coefficients }, points: { type: 'sequence', values: f.points } } }), expected); assert.ok(session.stats.builds > 0); assert.equal(session.stats.fallbacks, 0); continue; }
    }
    check(exploration.run(ir, f), expected);
  }
  check(exploration.run(irs.horner, f, exploration.fast), expected);
  if (f.coefficients.every(x => x instanceof Integer) && f.points.every(x => x instanceof Integer)) {
    const s = createMarkedSession(), program = s.load(sources.horner.replace('Run(coefficients,points) ->', '## @bigint\nRun(coefficients,points) ->'));
    check(program.run({ bindings: { coefficients: { type: 'sequence', values: f.coefficients }, points: { type: 'sequence', values: f.points } } }), expected);
    assert.equal(s.stats.builds, 1); assert.equal(s.stats.fallbacks, 0);
  }
  points += f.points.length;
}
for (const coefficients of [[], [new Integer(2n)], [new Rational(2n, 3n)], [new Integer(0n), new Integer(0n)]]) for (const x of [new Integer(0n), new Integer(-2n), new Rational(0n), new Rational(-3n, 7n)]) {
  const actual = preparePolynomial(coefficients).evaluate(x), expected = hornerCurrent(coefficients, x);
  check(actual, expected); assert.equal(actual.constructor, expected.constructor); points++;
}
// Interval fallback preserves Horner's actual operation order; expanded forms
// may produce a different enclosure and are not declared interchangeable.
const interval = new RationalInterval(new Rational(-2n), new Rational(3n));
const coefficients = [new Integer(1n), new Integer(2n), new Integer(1n)];
check(preparePolynomial(coefficients).evaluate(interval), hornerCurrent(coefficients, interval));
const mutated = exploration.parse('plan:=.preparePolynomial(coefficients);coefficients.Push!(99);plan.Evaluate(points);');
const f = { coefficients, points: [new Rational(2n, 3n)] };
const beforeMutation = f.points.map(x => hornerCurrent(coefficients, x));
check(exploration.run(mutated, f), beforeMutation);
console.log(`Verified ${scalar} scalar arithmetic cases and ${points} polynomial points; RiX algorithms/capabilities/plans/descriptors, compilation, snapshot canonicality, errors, types, and interval fallback.`);
