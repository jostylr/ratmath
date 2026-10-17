import assert from 'node:assert/strict';
import { rix, Integer, Rational, RationalInterval, registry, systemContext, parseIR } from './runtime.js';
import { compileExpression } from './compile.js';
import { compileI32 } from './wasm.js';

export function canonical(value) {
  if (value instanceof Integer) return `${value.value}/1`;
  if (value instanceof Rational) return `${value.numerator}/${value.denominator}`;
  if (value instanceof RationalInterval) return `[${canonical(value.low)},${canonical(value.high)}]`;
  if (typeof value === 'bigint') return `${value}/1`;
  if (typeof value === 'number' && Number.isSafeInteger(value)) return `${BigInt(value)}/1`;
  throw new Error(`Unexpected result: ${value}`);
}

// Range is chosen so every intermediate in x*x + 2*x + 1 fits signed i32.
export function guardedNumberPolynomial(x) {
  if (!(x instanceof Integer)) throw new TypeError('Integer required');
  if (x.value < -2048n || x.value > 2047n) return x.multiply(x).add(new Integer(2n).multiply(x)).add(Integer.one);
  const n = Number(x.value);
  return new Integer(BigInt(n * n + 2 * n + 1));
}

export function fusedPolynomial(x, algebraic = false) {
  if (!(x instanceof Rational)) throw new TypeError('Rational required');
  const a = x.numerator, b = x.denominator;
  return new Rational(algebraic ? (a + b) * (a + b) : a * a + 2n * a * b + b * b, b * b);
}

export function fixedDenominator(x, step, terms) {
  if (!(x instanceof Rational) || !(step instanceof Rational) || x.denominator !== step.denominator) {
    let result = x;
    for (let i = 0; i < terms; i++) result = result.add(step);
    return result;
  }
  // Keep the known denominator even when an intermediate would reduce to an integer.
  let numerator = x.numerator;
  for (let i = 0; i < terms; i++) numerator += step.numerator;
  return new Rational(numerator, x.denominator);
}

export function buildWorkloads(count = 256) {
  const poly = 'x*x + 2*x + 1';
  const terms = 32;
  const sum = 'x' + ' + step'.repeat(terms);
  const definitions = [
    { name: 'integer-small', kind: 'integer', source: poly,
      input: (i) => new Integer(BigInt((i * 17) % 4096 - 2048)), bounded: true },
    { name: 'integer-160bit', kind: 'integer', source: poly,
      input: (i) => new Integer((1n << 159n) + BigInt(i * 17 + 1)) },
    { name: 'rational-small', kind: 'rational', source: poly,
      input: (i) => new Rational(BigInt(i % 127 - 63), BigInt(i % 97 + 2)) },
    { name: 'rational-128bit', kind: 'rational', source: poly,
      input: (i) => new Rational((1n << 127n) + BigInt(i * 17 + 1), (1n << 126n) + BigInt(i * 31 + 3)) },
    { name: 'rational-add32', kind: 'sum', source: sum, terms,
      input: (i) => new Rational(BigInt(i % 100 + 1), 101n), step: new Rational(1n, 101n) },
    { name: 'interval-polynomial', kind: 'interval', source: poly,
      input: (i) => new RationalInterval(new Rational(BigInt(i % 19 - 10), 7n), new Rational(BigInt(i % 19 + 3), 7n)) },
  ];
  return definitions.map((def) => {
    const inputs = Array.from({ length: count }, (_, i) => def.input(i));
    const parseStart = performance.now();
    const node = parseIR(def.source);
    const parseLowerMs = performance.now() - parseStart;
    const context = new rix.Context();
    context.set('x', inputs[0]);
    context.set('step', def.step || Integer.zero);
    context.setEnv('__registry__', registry);
    const xCell = context.globalScope.get('x');
    const two = def.kind === 'rational' ? new Rational(2n) : new Integer(2n);
    const one = def.kind === 'rational' ? Rational.one : Integer.one;
    const hand = def.kind === 'sum'
      ? (x) => { for (let i = 0; i < terms; i++) x = x.add(def.step); return x; }
      : (x) => x.multiply(x).add(two.multiply(x)).add(one);
    const expected = inputs.map((x) => {
      if (def.kind === 'integer') return canonical(new Integer((x.value + 1n) ** 2n));
      if (def.kind === 'rational') return canonical(new Rational((x.numerator + x.denominator) ** 2n, x.denominator ** 2n));
      if (def.kind === 'sum') return canonical(new Rational(x.numerator + BigInt(terms), 101n));
      return canonical(hand(x)); // Interval reference keeps the exact operation order.
    });
    const expectedTypes = inputs.map((x) => hand(x).constructor);
    const variants = [];
    function add(name, kernel, domain = 'boxed exact', bind = false) {
      variants.push({ name, domain, run: () => {
        const out = new Array(count);
        for (let i = 0; i < count; i++) {
          if (bind) xCell.value = inputs[i];
          out[i] = kernel(inputs[i], i);
        }
        return out;
      }});
    }
    add('interpreted IR', () => rix.evaluate(node, context, registry, systemContext), 'boxed exact', true);
    const generated = {};
    const setup = { parseLowerMs };
    for (const [mode, name] of [['runtime', 'JS runtime translation (recreated)'], ['hoisted', 'JS runtime + hoisted literals'], ['methods', 'JS direct methods']]) {
      const start = performance.now();
      const compiled = compileExpression(node, mode);
      setup[mode + 'CompileMs'] = performance.now() - start;
      generated[mode] = { source: compiled.source, constants: compiled.constants.map(canonical) };
      add(name, (x) => compiled.run(context, x, def.step), 'boxed exact', mode !== 'methods');
    }
    add('hand JS RatMath', hand);
    if (def.kind === 'integer') {
      const compiled = compileExpression(node, 'bigint');
      generated.bigint = { source: compiled.source };
      add('JS specialized BigInt boxed', (x) => new Integer(compiled.run(null, x.value)));
      const raw = inputs.map((x) => x.value);
      add('JS specialized BigInt raw', (_x, i) => compiled.run(null, raw[i]), 'raw exact integer');
      if (def.bounded) {
        add('JS guarded Number boxed', guardedNumberPolynomial);
        const numbers = inputs.map((x) => Number(x.value));
        add('hand JS Number raw', (_x, i) => { const x = numbers[i]; return x * x + 2 * x + 1; }, 'bounded raw exact integer');
        const typedInputs = new Int32Array(numbers), typedOutputs = new Int32Array(count);
        variants.push({ name: 'hand JS i32 batch raw', domain: 'bounded raw exact integer', run: () => {
          for (let i = 0; i < count; i++) {
            const x = typedInputs[i];
            typedOutputs[i] = x * x + 2 * x + 1;
          }
          return typedOutputs.slice();
        }});
        const wasmStart = performance.now();
        const wasm = compileI32(node, count);
        setup.wasmCompileInstantiateMs = performance.now() - wasmStart;
        wasm.inputs.set(numbers);
        add('Wasm i32 scalar boxed', (x) => new Integer(BigInt(wasm.kernel(Number(x.value)))));
        add('Wasm i32 scalar raw', (_x, i) => wasm.kernel(numbers[i]), 'bounded raw exact integer');
        variants.push({ name: 'Wasm i32 batch raw', domain: 'bounded raw exact integer', run: () => wasm.batch(count) });
        generated.wasmHex = Buffer.from(wasm.bytes).toString('hex');
      }
    }
    if (def.kind === 'rational') {
      add('JS fused rational one normalization', (x) => fusedPolynomial(x));
      add('JS algebraic rational (x+1)^2', (x) => fusedPolynomial(x, true));
    }
    if (def.kind === 'sum') add('JS fixed denominator one normalization', (x) => fixedDenominator(x, def.step, terms));
    function verify(variant, values) {
      assert.equal(values.length, count, `${def.name}: ${variant.name} length`);
      for (let i = 0; i < count; i++) {
        assert.equal(canonical(values[i]), expected[i], `${def.name}: ${variant.name}, input ${i}`);
        if (variant.domain === 'boxed exact') assert.equal(values[i].constructor, expectedTypes[i], `${variant.name} result type`);
      }
    }
    return { ...def, inputs, node, setup, generated, variants, verify };
  });
}
