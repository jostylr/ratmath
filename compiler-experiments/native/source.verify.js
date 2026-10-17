import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Rational, Integer, RationalInterval, rix, registry, systemContext, parseIR } from '../runtime.js';
import { inspectNativeSource, loadNativeFunctions, loadNativeFile } from './source.js';
import { makeJob, runJs, valueKey } from './jobs.js';
import { defineKernel } from './plan.js';

const fixture = new URL('./examples/marked-functions.rix', import.meta.url);
const source = await readFile(fixture, 'utf8');
assert.deepEqual(inspectNativeSource(source).map((d) => [d.name, d.parameters]), [['Product', ['a', 'b']], ['Transform', ['t']]]);
const functions = await loadNativeFile(fixture);
assert.deepEqual(Object.keys(functions), ['Product', 'Transform']);
assert(Object.isFrozen(functions) && Object.isFrozen(functions.Product));
const context = new rix.Context();
rix.parseAndEvaluate(source, { context, registry, systemContext });
const callProduct = parseIR('Product(a,b)'), callTransform = parseIR('Transform(a)');
context.set('a', Rational.zero); context.set('b', Rational.zero);
let comparisons = 0;
const xs = [], ys = [];
for (let i = -8; i <= 8; i++) {
  const a = new Rational((1n << 180n) * BigInt(i), BigInt(Math.abs(i) + 1));
  const b = i % 2 ? new Integer(BigInt(i - 3)) : new Rational(BigInt(i + 1), 7n);
  xs.push(a); ys.push(b);
  context.globalScope.get('a').value = a; context.globalScope.get('b').value = b;
  assert.equal(valueKey(await functions.Product(a, b)), valueKey(rix.evaluate(callProduct, context, registry, systemContext)));
  assert.equal(valueKey(await functions.Transform(a)), valueKey(rix.evaluate(callTransform, context, registry, systemContext)));
  comparisons += 2;
}
assert.deepEqual((await functions.Product.map(xs, ys)).values.map(valueKey), xs.map((x, i) => valueKey(x.multiply(ys[i]))));
assert.deepEqual((await functions.Transform.map(xs)).values.map(valueKey), await Promise.all(xs.map(async (x) => valueKey(await functions.Transform(x)))));
comparisons += xs.length * 2;
assert.equal(valueKey((await functions.Product.reduce(xs, ys)).values[0]), valueKey(xs.reduce((sum, x, i) => sum.add(x.multiply(ys[i])), Rational.zero)));
const transformPlan = defineKernel({ name: 'reference', execution: 'native', numeric: 'exact-rational', pattern: 'map-reduce', expression: '(x*x+2*x+1)/(x*x+1)' });
assert.deepEqual((await functions.Transform.reduce(xs)).values.map(valueKey), runJs(transformPlan, { rows: xs.length, inner: 1, cols: 1, left: xs, right: xs }).map(valueKey));
comparisons += 2;
const matrix = { rows: 2, inner: 3, cols: 4, left: xs.slice(0, 6), right: ys.slice(0, 12) };
const matrixPlan = defineKernel({ ...transformPlan.spec, pattern: 'matrix-reduce', expression: 'x*y' });
assert.deepEqual((await functions.Product.matrixReduce(matrix)).values.map(valueKey), runJs(matrixPlan, matrix).map(valueKey));
comparisons += 8;
const changed = await loadNativeFunctions('## @native exact-rational\nProduct(a,b) -> a+b;');
assert.notEqual(changed.Product.native.build.key, functions.Product.native.build.key);
assert.equal(valueKey(await changed.Product(new Integer(2n), new Integer(3n))), '5/1');
const reloaded = await loadNativeFile(fixture);
assert.equal(reloaded.Product.native.build.cached, true);
assert.equal(reloaded.Product.native.build.key, functions.Product.native.build.key);
assert.equal((await functions.Product.prepare()).key, functions.Product.native.build.key);
await assert.rejects(functions.Product.prepare('arbitrary'), /Unsupported/);
await assert.rejects(functions.Transform.prepare('matrix-reduce'), /binary/);
// Blank lines, indentation, CRLF and explanatory comments above the marker work.
assert.equal(inspectNativeSource('## explanation\r\n  ## @native exact-rational\r\n\r\n  Spaced(a) -> -a;')[0].name, 'Spaced');
// Parameter remapping must handle swapped x/y names by binding, not replacement.
const swapped = await loadNativeFunctions('## @native exact-rational\nSwap(y,x) -> y-x;');
assert.equal(valueKey(await swapped.Swap(new Integer(10n), new Integer(3n))), '7/1');
const constant = await loadNativeFunctions('## @native exact-rational\nConstant(a) -> 42;');
assert.deepEqual((await constant.Constant.map(xs)).values.map(valueKey), xs.map(() => '42/1'));
comparisons += xs.length + 2;

for (const invalid of [
  'F(a,b) -> a*b;',
  '## @native\nF(a) -> a;',
  '## @native floating\nF(a) -> a;',
  '## @native exact-rational',
  '## @native exact-rational\na := 3;',
  '## @native exact-rational\n## another comment\nF(a) -> a;',
  '## @native exact-rational\n## @native exact-rational\nF(a) -> a;',
  'a := 1; ## @native exact-rational\nF(a) -> a;',
  '## @native exact-rational\nF() -> 1;',
  '## @native exact-rational\nF(a,b,c) -> a;',
  '## @native exact-rational\nF(a,a) -> a;',
  '## @native exact-rational\nF(a=2) -> a;',
  '## @native exact-rational\nF(a) -> a+global;',
  '## @native exact-rational\nF(a) -> Other(a);',
  '## @native exact-rational\nF(a) -> a^2;',
  '## @native exact-rational\nF(a) -> a:=1;',
  '## @native exact-rational\nF(a) -> {a+1; a+2};',
  '## @native exact-rational\nF(a) -> a;\nF(a,b) -> a+b;',
  'Outer(a) -> {\n## @native exact-rational\nInner(b) -> b; a};',
  '/* @native exact-rational */\nF(a) -> a;',
]) assert.throws(() => inspectNativeSource(invalid), undefined, invalid);
const markerInString = 'label := "## @native exact-rational";\nF(a) -> a;';
assert.throws(() => inspectNativeSource(markerInString), /No marked/);
await assert.rejects(loadNativeFunctions('## @native exact-rational\nGood(a) -> a;\n## @native exact-rational\nBad(a) -> Other(a);', { compiler: '/nonexistent/compiler' }), /native subset/);
assert.throws(() => inspectNativeSource('## @native exact-rational\nF(a) -> '+Array(66).fill('a').join('+')+';'), /budget/);
assert.throws(() => inspectNativeSource(' '.repeat(128 * 1024 + 1)), /128 KiB/);
assert.throws(() => inspectNativeSource(Array.from({ length: 33 }, (_, i) => `## @native exact-rational\nF${i}(a) -> a;`).join('\n')), /Maximum 32/);
// Non-native top-level code is parsed, never evaluated by the loader.
const withTopLevel = await loadNativeFunctions('a:=1/0;\n## @native exact-rational\nF(t) -> t+1;');
assert.equal(valueKey(await withTopLevel.F(new Integer(2n))), '3/1');
await assert.rejects(functions.Product(Rational.one), /2 arguments/);
await assert.rejects(functions.Transform(Rational.one, Rational.one), /1 arguments/);
await assert.rejects(functions.Product(1, 2), /Exact/);
await assert.rejects(functions.Product(new RationalInterval(Rational.zero, Rational.one), Rational.one), /Exact/);
await assert.rejects(functions.Product.map([], []), /dimensions/);
await assert.rejects(functions.Product.map(xs, ys.slice(1)), /mismatch/);
await assert.rejects(functions.Transform.matrixReduce(matrix), /binary/);
await assert.rejects(functions.Transform.map(xs, ys), /Unary/);
const { Divide } = await loadNativeFunctions('## @native exact-rational\nDivide(a,b) -> a/b;');
await assert.rejects(Divide(Rational.one, Rational.zero), /Division by zero/);
await assert.rejects(Divide.map([Rational.one], [Rational.zero]), /Division by zero/);
const aborted = new AbortController(); aborted.abort();
await assert.rejects(functions.Product.map(xs, ys, { signal: aborted.signal }), /aborted/);
await assert.rejects(functions.Product.map(xs, ys, { timeoutMs: 0 }), /timeout/);
// Exercise cancellation while a larger source-marked job is already running.
const bigJob = makeJob(matrixPlan, 128);
const active = new AbortController();
const pending = functions.Product.matrixReduce(bigJob, { signal: active.signal });
setTimeout(() => active.abort(), 10);
await assert.rejects(pending, /aborted/);
console.log(`Verified ${comparisons} exact source-marked outputs against RiX/RatMath, scalar/map/reduce/matrix calls, cache invalidation/reuse, marker placement, purity rejection, numeric guards, division errors and cancellation.`);
