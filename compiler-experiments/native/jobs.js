import { Rational, Integer, rix, registry, systemContext, parseIR } from '../runtime.js';
import { validateJob } from './host.js';
import { compileJsCore, compileJsFused, expressionText } from './plan.js';

export function gcd(a, b) {
  if (a < 0n) a = -a;
  while (b !== 0n) { const next = a % b; a = b; b = next; }
  return a;
}
// Canonical addition using an LCM-sized denominator, with no result object per term.
export function addParts(an, ad, bn, bd) {
  const common = gcd(ad, bd);
  const numerator = an * (bd / common) + bn * (ad / common);
  const reduction = gcd(numerator, common);
  return [numerator / reduction, (ad / common) * (bd / reduction)];
}
export function makeJob(plan, size, bits = 160) {
  if (!Number.isInteger(bits) || bits < 8 || bits > 512) throw new RangeError('Fixture bits 8..512');
  let state = 0x12345678;
  const primeDenominators = [101n, 103n, 107n, 109n, 113n];
  const draw = () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    const value = state >>> 0;
    const numerator = ((1n << BigInt(bits - 1)) + (BigInt(value) & ((1n << BigInt(Math.min(bits - 2, 32))) - 1n))) * ((value & 1) ? -1n : 1n);
    return new Rational(numerator, primeDenominators[value % primeDenominators.length]);
  };
  const matrix = plan.spec.pattern === 'matrix-reduce', count = matrix ? size * size : size;
  const job = { rows: size, inner: matrix ? size : 1, cols: matrix ? size : 1,
    left: Array.from({ length: count }, draw), right: Array.from({ length: count }, draw) };
  validateJob(plan, job);
  return job;
}

export function runJs(plan, job, { fused = false } = {}) {
  validateJob(plan, job);
  const kernel = (fused ? compileJsFused : compileJsCore)(plan);
  return createJsRunner(plan, job, kernel.run, fused)();
}
export function createJsRunner(plan, job, kernel, fused = false) {
  const matrix = plan.spec.pattern === 'matrix-reduce';
  const reduce = (row, col) => {
    let value = Rational.zero, n = 0n, d = 1n;
    const count = matrix ? job.inner : job.rows;
    for (let k = 0; k < count; k++) {
      const term = kernel(job.left[matrix ? row * job.inner + k : k], job.right[matrix ? k * job.cols + col : k]);
      if (fused) [n, d] = addParts(n, d, term.numerator, term.denominator);
      else value = value.add(term);
    }
    return fused ? new Rational(n, d) : value;
  };
  return () => {
    if (plan.spec.pattern === 'map') return job.left.map((x, i) => kernel(x, job.right[i]));
    if (!matrix) return [reduce(0, 0)];
    const outputs = new Array(job.rows * job.cols);
    for (let i = 0; i < job.rows; i++) for (let j = 0; j < job.cols; j++) outputs[i * job.cols + j] = reduce(i, j);
    return outputs;
  };
}

// Actual RiX function call, scope imports, indexing and LOOP control inside each dot/reduction.
export function createRixRunner(plan, job) {
  if (plan.spec.pattern === 'map') throw new TypeError('createRixRunner supports reduction patterns only');
  const context = new rix.Context();
  const source = `NativeReference(left,right,n) -> {@ <left,right,n> k=1,total=0; k<=n;
    x := left[k], y := right[k], total += ${expressionText(plan)}; k+=1; total };`;
  rix.parseAndEvaluate(source, { context, registry, systemContext });
  const matrix = plan.spec.pattern === 'matrix-reduce';
  const leftRows = matrix ? Array.from({ length: job.rows }, (_, i) => job.left.slice(i * job.inner, (i + 1) * job.inner)) : [job.left];
  const rightColumns = matrix ? Array.from({ length: job.cols }, (_, j) => Array.from({ length: job.inner }, (_, k) => job.right[k * job.cols + j])) : [job.right];
  const sequences = (arrays) => arrays.map((values) => ({ type: 'sequence', values }));
  const rows = sequences(leftRows), cols = sequences(rightColumns);
  context.set('left', rows[0]); context.set('right', cols[0]); context.set('n', new Integer(BigInt(matrix ? job.inner : job.rows)));
  const call = parseIR('NativeReference(left,right,n)');
  return { source, run: () => {
    const outputs = [];
    for (const row of rows) for (const col of cols) {
      context.globalScope.get('left').value = row;
      context.globalScope.get('right').value = col;
      outputs.push(rix.evaluate(call, context, registry, systemContext));
    }
    return outputs;
  }};
}
export const valueKey = (value) => value instanceof Integer ? `${value.value}/1` : `${value.numerator}/${value.denominator}`;
