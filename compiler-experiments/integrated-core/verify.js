import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { load, canonical } from './load.js';
import { here } from './build.js';
const environments = await Promise.all(['baseline', 'candidate', 'candidate-wired'].map(load));
assert.notEqual(environments[0].core.Rational, environments[1].core.Rational);
const gcd = (a, b) => { a = a < 0n ? -a : a; while (b) { const r = a % b; a = b; b = r; } return a; };
let checked = 0;
const expressions = [];
for (const a of [-19, -1, 0, 1, 19]) for (const b of [-5, -1, 1, 5]) {
  expressions.push(`(${a})//(${b});`);
  if (b > 0) expressions.push(`(${a})%${b};`);
}
for (const a of [-7, 0, 7]) for (const b of [1, 2, 3, 10]) for (const c of [-7, 0, 7]) for (const d of [1, 2, 3, 10]) for (const op of ['+', '-', '*', '/']) {
  if (op === '/' && c === 0) continue;
  expressions.push(`(${a}/${b})${op}(${c}/${d});`);
}
expressions.push('x:=1/3;[x+2,2+x,x-2,2-x,x*2,2*x,x/2,2/x];',
 'x:=1/3;[x+x,x-x,x*x,x/x];', '.DivMod(-7,3);', '.DivMod(7,3);', 'x:=1/3; y:=x; y+=2;[x,y];',
 '(-2:3)*(1:2);', '(1:3)+(1/2);', '(1:3)*(2/3);',
 'x:=23.456?789;x+1/3;', 'x:=1/7;[x.Numerator(),x.Denominator(),x.ToString()];');
for (const source of expressions) {
  const expected = canonical(environments[0].run(environments[0].parse(source)));
  for (const env of environments.slice(1)) assert.deepEqual(canonical(env.run(env.parse(source))), expected, `${env.variant}: ${source}`);
  checked++;
}
for (const source of ['1//0;', '1%0;', '1%(-2);', '1/0;', '.DivMod(1,0);', '.DivMod(1,-2);']) {
  const errors = environments.map(env => { try { env.run(env.parse(source)); } catch (e) { return e.message; } });
  assert.ok(errors[0]); assert.equal(errors[1], errors[0]); assert.equal(errors[2], errors[0]); checked++;
}
for (const env of environments.slice(1)) {
  const { Integer, Rational, RationalInterval, TypePromotion, CertifiedApproximation } = env.core;
  for (const [a, b] of [[-7n, 3n], [7n, -3n], [-7n, -3n], [0n, 3n]]) {
    const q = new Integer(a).floorDivide(new Integer(b));
    assert.equal(q.value, a / b - (a % b !== 0n && (a < 0n) !== (b < 0n) ? 1n : 0n));
  }
  const [quotient, remainder] = new Integer(-7n).divmod(new Integer(3n));
  assert.equal(quotient.value, -3n); assert.equal(remainder.value, 2n);
  assert.throws(() => new Integer(1n).divmod(new Integer(0n)), /positive/);
  const scalar = new Rational(1n, 3n).add(new Integer(2n));
  assert.ok(scalar instanceof Rational); assert.ok(env.core.isRational(scalar));
  assert.equal(scalar.toRepeatingDecimal(), '2.#3'); assert.equal(scalar.toString(), '7/3');
  assert.equal(gcd(scalar.numerator, scalar.denominator), 1n);
  const interval = new RationalInterval(scalar, scalar.add(new Rational(1n)));
  assert.ok(interval.low instanceof Rational); assert.ok(interval.add(new Integer(1n)).low instanceof Rational);
  assert.equal(TypePromotion.add(new Integer(2n), new Rational(1n, 3n)).toString(), '7/3');
  assert.ok(JSON.parse(JSON.stringify(scalar), env.core.reviveCoreValue) instanceof Rational);
  // Subclasses and shadowed fields retain the original public-getter route.
  class Different extends Rational { get numerator() { return 5n; } get denominator() { return 7n; } }
  assert.equal(new Rational(1n, 3n).add(new Different(1n, 3n)).toString(), '22/21');
  const fake = { constructor: { name: 'Integer' }, value: 2 };
  assert.equal(new Rational(1n, 3n).add(fake).toString(), '7/3');
  assert.throws(() => Rational._integerLeft('add', fake, scalar), /Plain/);
  // Existing exact divide and signed remainder are deliberately unchanged.
  assert.equal(new Integer(7n).divide(new Integer(2n)).toString(), '7/2');
  assert.equal(new Integer(-7n).modulo(new Integer(3n)).value, -1n);
}
for (const env of environments) {
  const source = await readFile(resolve(here, 'scripts/horner.rix'), 'utf8');
  const { Integer, Rational } = env.core;
  const result = env.run(env.parse(source), { coefficients: { type: 'sequence', values: [new Integer(1n), new Integer(2n), new Integer(1n)] }, points: { type: 'sequence', values: [new Rational(-2n), new Rational(1n, 2n)] } });
  assert.deepEqual(result.values.map(x => x.toString()), ['1', '9/4']);
  assert.ok(result.values.every(x => x instanceof Rational));
}
console.log(`Verified ${checked} ordinary RiX expressions/errors across three isolated environments, plus class identity, interval/type promotion/serialization/formatting, guarded fallbacks and unchanged Integer semantics.`);
