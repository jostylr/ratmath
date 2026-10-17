import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createMarkedSession } from './runner.js';
import { rix, Integer, Rational, registry, systemContext } from '../runtime.js';
import { makePowerFixture } from '../whole-scripts/workloads.js';
import { powerBatch } from '../whole-scripts/optimized.js';

const normal = (source, context = new rix.Context()) => {
  let result;
  for (const node of rix.lower(rix.parse(rix.tokenize(source)))) result = rix.evaluate(node, context, registry, systemContext);
  return result;
};
const value = (v) => v?.type === 'sequence' ? v.values.map(value) : v === null ? null : v.toString();
const bindings = (f) => ({ bases: { type: 'sequence', values: f.integers }, exponent: f.exponentInteger, modulus: f.modulusInteger });
let differential = 0;
const compare = (source) => {
  const session = createMarkedSession();
  assert.deepEqual(value(session.load(source).run()), value(normal(source)));
  differential++;
  return session;
};

// Definition alone is cheap: argument and scope binding stay in RiX, while
// only the marked body is compiled when it is actually called.
const session = createMarkedSession(), context = new rix.Context();
session.load('## @bigint\nSquare(x)->x*x;').run({ context });
assert.equal(session.stats.compileAttempts, 0);
assert.equal(session.load('Square(3);').run({ context }).value, 9n);
assert.equal(session.load('Square(4);').run({ context }).value, 16n);
assert.equal(session.stats.builds, 1); assert.equal(session.stats.cacheHits, 1);
// An unsupported input is interpreted and leaves the working specialization.
assert.equal(session.load('Square(3/2);').run({ context }).toString(), '9/4');
assert.equal(session.load('Square(5);').run({ context }).value, 25n);
assert.equal(session.stats.builds, 1); assert.equal(session.stats.fallbacks, 1);
assert.equal(session.load('Square(-3);').run({ context }).value, 9n);
assert.equal(session.stats.builds, 2); // signed specialization, no coercion

// Resolve the current helper definitions on every call, including unmarked
// helpers and definitions coming from another program in the same session.
const helpers = createMarkedSession(), hc = new rix.Context();
helpers.load('Helper(x)->x+1; ## @bigint\nRun(x)->Helper(x);Run(2);').run({ context: hc });
assert.equal(helpers.stats.builds, 1);
assert.equal(helpers.load('Helper(x)->x+10;Run(2);').run({ context: hc }).value, 12n);
assert.equal(helpers.stats.builds, 2);
assert.equal(helpers.load('## @bigint\nRun(x)->Helper(x)*2;Run(2);').run({ context: hc }).value, 24n);
assert.equal(helpers.stats.builds, 3);
assert.equal(helpers.load('Helper(x)->x/2;Run(3);').run({ context: hc }).toString(), '3');
assert.equal(helpers.stats.compileFailures, 1);
helpers.load('Run(3);').run({ context: hc });
assert.equal(helpers.stats.compileFailures, 1); // rejected source is memoized
assert.equal(helpers.load('Helper(x)->x+1;Run(3);').run({ context: hc }).value, 8n);

// Arguments execute once before either path; rejected code executes effects
// exactly once, including repeat calls using its cached rejection.
const effects = compare('count:=0;Tick()->{;  @count+=1;2}; ## @bigint\nSquare(x)->x*x;Square(Tick());count;');
assert.equal(effects.stats.compiledCalls, 1);
const side = compare('count:=0; ## @bigint\nTouch(x)->{; @count+=1;x+@count};Touch(2);Touch(2);count;');
assert.equal(side.stats.compiledCalls, 0); assert.equal(side.stats.fallbacks, 2);
compare('## @bigint\nDivide(x)->x/2;Divide(3);');
compare('## @bigint\nLess(a,b)->a<b;[Less(1,2),Less(2,1)];');
compare('## @bigint\nSquare(x)->x*x;[1,2,3].Map(Square);');
compare('## @bigint\nDefault(x?=2,y)->x*x+y;Default(,3);');
compare('offset:=7; ## @bigint\nCaptured(x)->x+@offset;Captured(2);');
compare('Helper(x)->x+@offset;offset:=9; ## @bigint\nRun(x)->Helper(x);Run(2);');
compare('## @bigint\nRun(xs)->xs.Map((x)->x*x);Run([1,2/3]);');
compare('## @bigint\nRun(xs)->xs.Get(10);Run([1,2]);');
compare('## @bigint\nRun(xs)->xs.Last();Run([]);');
compare('## @bigint\nRun(x)->{; y:=2^x;x//y};Run(3);');
compare('## @bigint\nRun(xs)->{@ e=3,radix=2^e; e>1;e-=1;;xs.Get(1)//radix};Run([19]);');
compare('## @bigint\nSquare(x)->x*x; ## @bigint\nRun(x)->Square(x)+1;Run(3);');
compare('## @bigint\nRun()->2*3;Run();');
compare('## @bigint\nRun(xs)->xs.Map((x)->x);Run([2,2]);');
compare('## @bigint\nSquare(x)->x*x;.Poly(.Spec(Square))(3);');

// Signed division/modulo and zero truthiness are semantic, not JS coercions.
for (const a of [-19, -1, 0, 1, 19]) for (const b of [-5, -1, 1, 5]) {
  compare(`## @bigint\nRun(a,b)->a//b;Run(${a},${b});`);
  if (b > 0) compare(`## @bigint\nRun(a,b)->a%b;Run(${a},${b});`);
}
compare('## @bigint\nRun(x)->x ?:7 ?_8;Run(0);'); // interpreter, 0 is truthy
const errorSession = createMarkedSession();
for (const op of ['//', '%']) {
  const source = `## @bigint\nRun(a,b)->a${op}b;Run(3,0);`;
  let expected; try { normal(source); } catch (e) { expected = e.message; }
  assert.throws(() => errorSession.load(source).run(), e => e.message === expected);
}
assert.equal(errorSession.stats.guardFallbacks, 2);
const indexSession = createMarkedSession(), ic = new rix.Context();
indexSession.load('## @bigint\nRun(xs,i)->xs.Get(i)+1;').run({ context: ic });
assert.equal(indexSession.load('Run([3],1);').run({ context: ic }).value, 4n);
let expectedIndexError;
try { normal('Run(xs,i)->xs.Get(i)+1;Run([3],2);'); } catch (e) { expectedIndexError = e.message; }
assert.throws(() => indexSession.load('Run([3],2);').run({ context: ic }), e => e.message === expectedIndexError);
assert.equal(indexSession.stats.guardFallbacks, 1);
assert.equal(indexSession.load('Run([3],1);').run({ context: ic }).value, 4n);
assert.equal(indexSession.stats.builds, 1);

// Returning a parameter sequence must preserve its identity and metadata.
for (const body of ['xs', '{; ys:=xs;ys}', '[xs,xs]']) {
  const s = createMarkedSession(), xs = { type: 'sequence', values: [new Integer(2n)] };
  const result = s.load(`## @bigint\nIdentity(xs)->${body};Identity(xs);`).run({ bindings: { xs } });
  if (body === '{; ys:=xs;ys}') { assert.notEqual(result, xs); assert.equal(result.values[0], xs.values[0]); }
  else if (body === 'xs') assert.equal(result, xs);
  else { assert.notEqual(result.values[0], xs); assert.notEqual(result.values[0].values[0], xs.values[0]); assert.equal(result.values[0].values[0].value, xs.values[0].value); }
  if (body === '[xs,xs]') assert.notEqual(result.values[1], result.values[0]);
  assert.equal(s.stats.compiledCalls, 0);
}
const aliased = createMarkedSession().load('## @bigint\nRun(x)->{; a:=[x];[a,a]};Run(2);').run();
assert.notEqual(aliased.values[0], aliased.values[1]);
const mutable = createMarkedSession().load('## @bigint\nRun(x)->[x,x+1];a:=Run(2);a.Push!(9);a;').run();
assert.deepEqual(value(mutable), ['2', '3', '9']);
assert.equal(mutable._ext.get('_type').value, 'array');
assert.equal(mutable._ext.get('_proto').type, 'map');

// Decorated/subclass arithmetic values retain their interpreter behavior.
const decorated = new Integer(2n); decorated._ext = new Map([['label', 'probe']]);
const ds = createMarkedSession();
ds.load('## @bigint\nSquare(x)->x*x;Square(x);').run({ bindings: { x: decorated } });
assert.equal(ds.stats.builds, 0); assert.equal(ds.stats.fallbacks, 1);
const huge = new Integer(1n << 8192n), budget = createMarkedSession();
assert.equal(budget.load('## @bigint\nSquare(x)->x*x;Square(x);').run({ bindings: { x: huge } }).value, huge.value * huge.value);
assert.equal(budget.stats.builds, 0);
const rationals = createMarkedSession();
assert.equal(rationals.load('## @bigint\nSquare(x)->x*x;Square(x);').run({ bindings: { x: new Rational(5n, 2n) } }).toString(), '25/4');

const limits = createMarkedSession(), lc = new rix.Context(); lc.setEnv('defaultLoopMax', 2);
assert.throws(() => limits.load('## @bigint\nRun(x)->{@ i=0;i<x;i+=1;;i};Run(3);').run({ context: lc }), /max iteration count: 2/);
assert.equal(limits.stats.builds, 0);
const off = createMarkedSession(), oc = new rix.Context(); oc.setEnv('symbolicAutoSpec', 'off');
assert.equal(off.load('## @bigint\nSquare(x)->x*x;.Poly(.Spec(Square))(3);').run({ context: oc }).value, 9n);
assert.equal(off.stats.builds, 0);
const bounded = createMarkedSession({ maxCacheEntries: 1 });
bounded.load('## @bigint\nSquare(x)->x*x;Square(2);Square(-2);Square(2);').run();
assert.equal(bounded.stats.builds, 3); assert.equal(bounded.stats.evictions, 2);
bounded.clearCache(); assert.equal(bounded.inspectCache().length, 0);
assert.throws(() => createMarkedSession().load('## @bigint\nx:=2;'), /immediately precede/);
assert.deepEqual(createMarkedSession().load('text:="## @bigint";Square(x)->x*x;Square(2);').markers, []);

const source = await readFile(new URL('./scripts/window.rix', import.meta.url), 'utf8');
const powers = createMarkedSession(), program = powers.load(source);
let powerOutputs = 0;
for (const modulus of [1n, 2n, 16n, 97n, 1009n]) for (const exponent of [0n, 1n, 17n, 128n]) {
  const bases = [0n, 1n, 2n, modulus, modulus + 3n];
  const fixture = { integers: bases.map(n => new Integer(n)), exponentInteger: new Integer(exponent), modulusInteger: new Integer(modulus) };
  const expected = powerBatch(bases, exponent, modulus, 'binary');
  assert.deepEqual(program.run({ bindings: bindings(fixture) }).values.map(v => v.value), expected);
  powerOutputs += bases.length;
}
for (const bits of [64, 256, 2048]) {
  const fixture = makePowerFixture({ count: 3, bits, exponentBits: 96, seed: bits });
  assert.deepEqual(program.run({ bindings: bindings(fixture) }).values.map(v => v.value), powerBatch(fixture.bases, fixture.exponent, fixture.modulus, 'binary'));
  powerOutputs += fixture.count;
}
assert.equal(powers.stats.fallbacks, 0);
assert.ok(powers.stats.cacheHits > 0);
const montSource = await readFile(new URL('./scripts/montgomery.rix', import.meta.url), 'utf8');
const mont = createMarkedSession(), montProgram = mont.load(montSource);
for (const bits of [64, 256, 2048]) {
  const f = makePowerFixture({ count: 3, bits, exponentBits: 96, seed: bits });
  assert.deepEqual(montProgram.run({ bindings: bindings(f) }).values.map(v => v.value), powerBatch(f.bases, f.exponent, f.modulus, 'binary'));
  powerOutputs += f.count;
}
assert.equal(mont.stats.builds, 1); assert.equal(mont.stats.fallbacks, 0);
// Source changes, rather than a hard-coded modular-power implementation, drive
// compilation. Exercise changed width and function/helper names.
for (const variant of [source.replace('width:=6', 'width:=3'), source.replaceAll('Run', 'Batch').replaceAll('OddPowers', 'Table')]) {
  const f = makePowerFixture({ count: 3, bits: 128, exponentBits: 64 });
  const s = createMarkedSession();
  assert.deepEqual(s.load(variant).run({ bindings: bindings(f) }).values.map(v => v.value), powerBatch(f.bases, f.exponent, f.modulus, 'binary'));
  assert.equal(s.stats.builds, 1); assert.equal(s.stats.fallbacks, 0);
}
console.log(`Verified ${differential} differential semantic cases, ${powerOutputs} reference powers, two source mutations, lazy caching, invalidation, rejection caching, guards, identity, and effects.`);
