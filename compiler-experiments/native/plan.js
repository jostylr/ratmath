import { parseIR, Rational, Integer } from '../runtime.js';

const deepFreeze = (value) => { if (value && typeof value === 'object') { for (const child of Object.values(value)) deepFreeze(child); Object.freeze(value); } return value; };
const asRational = (value) => value instanceof Integer ? new Rational(value.value) : value;

const ops = { ADD: ['add', 'mpq_add', '+'], SUB: ['subtract', 'mpq_sub', '-'], MUL: ['multiply', 'mpq_mul', '*'], DIV: ['divide', 'mpq_div', '/'] };

export function defineKernel(spec) {
  const keys = ['name', 'execution', 'numeric', 'pattern', 'expression'];
  if (!spec || Object.keys(spec).some((key) => !keys.includes(key))) throw new TypeError('Unknown kernel field');
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(spec.name || '')) throw new TypeError('Invalid kernel name');
  if (spec.execution !== 'native' || spec.numeric !== 'exact-rational') throw new TypeError('Explicit native execution and exact-rational numeric contract required');
  if (!['map', 'map-reduce', 'matrix-reduce'].includes(spec.pattern)) throw new TypeError('Unsupported kernel pattern');
  if (typeof spec.expression !== 'string' || spec.expression.length > 4096) throw new TypeError('Expression required (maximum 4096 characters)');
  const node = parseIR(spec.expression), instructions = [], constants = [];
  let visited = 0;
  function visit(n) {
    if (++visited > 64) throw new RangeError('Expression exceeds 64-node budget');
    if (n.fn === 'RETRIEVE' && n.args.length === 1 && ['x', 'y'].includes(n.args[0])) return { kind: 'input', name: n.args[0] };
    if (n.fn === 'LITERAL' && n.args.length === 1 && /^\d{1,1024}$/.test(n.args[0])) {
      return { kind: 'constant', index: constants.push(BigInt(n.args[0]).toString()) - 1 };
    }
    if (n.fn === 'NEG' && n.args.length === 1) {
      const a = visit(n.args[0]);
      return { kind: 'temporary', index: instructions.push({ op: 'NEG', a }) - 1 };
    }
    if (!ops[n.fn] || n.args.length !== 2) throw new TypeError(`Native subset does not support ${n.fn}`);
    const a = visit(n.args[0]), b = visit(n.args[1]);
    return { kind: 'temporary', index: instructions.push({ op: n.fn, a, b }) - 1 };
  }
  const result = visit(node);
  return deepFreeze({ spec: { ...spec }, node, instructions, constants, result });
}

const ref = (v) => v.kind === 'input' ? v.name : v.kind === 'constant' ? `c${v.index}` : `t${v.index}`;

export function emitGmp(plan) {
  const init = [], clear = [], body = [];
  for (const [i, value] of plan.constants.entries()) {
    init.push(`mpq_t c${i}; mpq_init(c${i}); mpq_set_str(c${i}, "${value}", 10);`);
    clear.push(`mpq_clear(c${i});`);
  }
  for (const [i, item] of plan.instructions.entries()) {
    init.push(`mpq_t t${i}; mpq_init(t${i});`);
    clear.push(`mpq_clear(t${i});`);
    if (item.op === 'DIV') body.push(`if (mpq_sgn(${ref(item.b)}) == 0) { fprintf(stderr, "Division by zero\\n"); return 4; }`);
    body.push(item.op === 'NEG' ? `mpq_neg(t${i}, ${ref(item.a)});`
      : `${ops[item.op][1]}(t${i}, ${ref(item.a)}, ${ref(item.b)});`);
  }
  body.push(plan.spec.pattern === 'map' ? `mpq_set(acc, ${ref(plan.result)});` : `mpq_add(acc, acc, ${ref(plan.result)});`);
  return { init: init.join('\n'), clear: clear.join('\n'), body: body.join('\n') };
}

export function compileJsCore(plan) {
  const constants = plan.constants.map((n) => new Rational(BigInt(n)));
  const lines = plan.instructions.map((item, i) => item.op === 'NEG'
    ? `const t${i} = ${ref(item.a)}.negate();`
    : `const t${i} = ${ref(item.a)}.${ops[item.op][0]}(${ref(item.b)});`);
  const source = `${constants.map((_, i) => `const c${i}=constants[${i}];`).join('\n')}\n${lines.join('\n')}\nreturn ${ref(plan.result)};`;
  const fn = new Function('x', 'y', 'constants', source);
  return { source, run: (x, y) => fn(asRational(x), asRational(y), constants) };
}

// Fuse a small expression into BigInt numerator/denominator temporaries, reduce at the output.
// Each DIV retains its original domain check before any cancellation/reduction.
export function compileJsFused(plan) {
  const part = (v, p) => v.kind === 'input' ? `${v.name}.${p === 'n' ? 'numerator' : 'denominator'}`
    : v.kind === 'constant' ? (p === 'n' ? `${plan.constants[v.index]}n` : '1n') : `t${v.index}${p}`;
  const lines = [];
  for (const [i, item] of plan.instructions.entries()) {
    const an = part(item.a, 'n'), ad = part(item.a, 'd');
    if (item.op === 'NEG') { lines.push(`const t${i}n = -(${an}), t${i}d = ${ad};`); continue; }
    const bn = part(item.b, 'n'), bd = part(item.b, 'd');
    if (item.op === 'DIV') {
      lines.push(`if (${bn} === 0n) throw new RangeError('Division by zero');`);
      lines.push(`const t${i}n = (${an})*(${bd}), t${i}d = (${ad})*(${bn});`);
    } else if (item.op === 'MUL') lines.push(`const t${i}n = (${an})*(${bn}), t${i}d = (${ad})*(${bd});`);
    else lines.push(`const t${i}n = (${an})*(${bd}) ${ops[item.op][2]} (${bn})*(${ad}), t${i}d = (${ad})*(${bd});`);
  }
  const source = `${lines.join('\n')}\nreturn new Rational(${part(plan.result, 'n')}, ${part(plan.result, 'd')});`;
  const fn = new Function('x', 'y', 'Rational', source);
  return { source, run: (x, y) => fn(asRational(x), asRational(y), Rational) };
}

export function expressionText(plan) {
  function emit(n) {
    if (n.fn === 'RETRIEVE' || n.fn === 'LITERAL') return n.args[0];
    if (n.fn === 'NEG') return `(-${emit(n.args[0])})`;
    return `(${emit(n.args[0])} ${ops[n.fn][2]} ${emit(n.args[1])})`;
  }
  return emit(plan.node);
}
