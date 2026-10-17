import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { load, canonical } from './load.js';
import { load as loadOriginal } from '../integrated-core/load.js';
import { paths } from './paths.js';
import { fixtures, materialize } from './fixtures.js';
const env = await load(), original = await loadOriginal('baseline'), cases = await fixtures();
const programs = await paths(env), originalIR = original.parse(programs.source.horner);
const I = n => ({ kind: 'Integer', value: String(n) });
const R = (n,d) => ({ kind: 'Rational', numerator: String(n), denominator: String(d) });
const S = values => ({ kind: 'sequence', values });
const add = (name,cs,xs) => cases.push({ name, data: { coefficients: S(cs), points: S(xs) } });
add('empty', [], [I(0),R(1,3)]);
add('empty-points', [I(1)], []);
add('constant-integer', [I(-7)], [I(0),R(0,1),R(1,3)]);
add('zero-mixed', [R(0,1),I(0)], [I(0),R(0,1),R(2,3)]);
add('cancellation', [R(6,5),R(-12,5),R(6,5)], [I(1),R(1,1),R(-2,3)]);
let state = 0x4a39b70d;
const random = () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return state >>> 0; };
const number = () => random() % 3 ? I(BigInt(random()%101)-50n) : R(BigInt(random()%101)-50n, BigInt(random()%19)+1n);
for (let i=0;i<160;i++) add(`seeded-${i}`, Array.from({length:random()%18}, number), Array.from({length:1+random()%4}, number));
let checked = 0;
for (const f of cases) {
  const data = materialize(f.data, env.core), baseline = materialize(f.data, original.core);
  const expected = canonical(original.run(originalIR, baseline));
  const before = canonical(data.coefficients), beforePoints = canonical(data.points);
  for (const v of programs.variants(data)) {
    assert.deepEqual(canonical(v.run()), expected, `${f.name}: ${v.name}`); checked++;
  }
  assert.deepEqual(canonical(data.coefficients), before, 'coefficients not mutated');
  assert.deepEqual(canonical(data.points), beforePoints, 'points not mutated');
}
// A separate elementary exact oracle: sum coefficient * point^power using
// original core methods, rather than another Horner loop or reduced kernel.
for (const f of cases.filter(f => f.name.startsWith('seeded-')).slice(0,40)) {
  const a = materialize(f.data, original.core), b = materialize(f.data, env.core);
  for (let j=0;j<a.points.values.length;j++) {
    let total = new original.core.Rational(0n);
    const cs = a.coefficients.values, x = a.points.values[j];
    for (let i=0;i<cs.length;i++) {
      let term = new original.core.Rational(cs[i] instanceof original.core.Integer ? cs[i].value : cs[i].numerator,
        cs[i] instanceof original.core.Integer ? 1n : cs[i].denominator);
      for (let k=0;k<cs.length-i-1;k++) term = term.multiply(x);
      total = total.add(term);
    }
    const result = env.core.evaluatePolynomialFused(b.coefficients.values,b.points.values[j]);
    assert.equal(result instanceof env.core.Integer ? result.value : result.numerator, total.numerator);
    assert.equal(result instanceof env.core.Integer ? 1n : result.denominator, total.denominator);
  }
}
const { Integer, Rational, RationalInterval, evaluatePolynomial, evaluatePolynomialFused, evaluatePolynomialBatch } = env.core;
class DerivedRational extends Rational {}
class DerivedInteger extends Integer {}
const outcome = fn => { try { return { result:canonical(fn()) }; } catch(error) { return { error:error.constructor.name,message:error.message }; } };
for (const x of [new DerivedRational(2n,3n),new DerivedInteger(2n),new RationalInterval(new Rational(-1n,3n),new Rational(2n,3n))]) {
  const cs = [new Rational(1n,3n),new Integer(2n),new Integer(-1n)];
  assert.deepEqual(outcome(()=>evaluatePolynomialFused(cs,x)),outcome(()=>evaluatePolynomial(cs,x)));
  assert.equal(Rational._polynomialReduced(cs,x),undefined,'unsupported types bypass private kernel');
}
const shadowed = new Rational(1n,3n);
Object.defineProperty(shadowed,'numerator',{value:5n});
assert.equal(Rational._polynomialReduced([new Integer(1n)],shadowed),undefined);
assert.deepEqual(canonical(evaluatePolynomialFused([new Integer(1n)],shadowed)),canonical(evaluatePolynomial([new Integer(1n)],shadowed)));
assert.equal(Rational._polynomialReduced([{ numerator:1n,denominator:2n }],new Integer(1n)),undefined);
for (const evaluate of [evaluatePolynomial,evaluatePolynomialFused]) {
  assert.throws(()=>evaluate('bad',new Integer(1n)),TypeError);
  assert.throws(()=>evaluate([1],new Integer(1n)),TypeError);
  assert.throws(()=>evaluate([new Integer(1n)],0.5),TypeError);
  assert.throws(()=>evaluate([,],new Integer(1n)),TypeError);
  const result = evaluate([new Rational(-7n,9n),new Integer(2n)],new Rational(3n,5n));
  assert.ok(result instanceof Rational);
  assert.equal(result.toString(),'23/15');
  assert.deepEqual(canonical(JSON.parse(JSON.stringify(result),env.core.reviveCoreValue)),canonical(result));
}
assert.throws(()=>evaluatePolynomialBatch([1],[]),TypeError);
assert.throws(()=>evaluatePolynomialBatch([],null),TypeError);
assert.equal(env.run(env.parse('.polynomialBatchFused([1,2],[0,1]).Len();')).value,2n);
assert.equal(env.run(env.parse('.polynomialBatchFused([1,2],[0,1]).Get(2);')).value,3n);
const report = { timestamp:new Date().toISOString(),runtime:process.versions.bun?'bun':'node',cases:cases.length,
  pathComparisons:checked,paths:7,seed:'0x4a39b70d',independentPowerSumCases:40,
  checks:'Unchanged original-core RiX results/types, independent power-sum oracle, mutation, intervals, subclasses, shadowed fields, bad input rejection, local classes, formatting, JSON revival and RiX sequence methods',passed:true };
await writeFile(new URL(`./results/verification-${report.runtime}.json`,import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
