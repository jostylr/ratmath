import { createHash } from 'node:crypto';
import { rix, Integer } from '../runtime.js';

const integer = (sign = 'any') => ({ kind: 'integer', sign });
const boolean = { kind: 'boolean' };
const sequence = { kind: 'sequence', element: integer('nonnegative') };
const positive = (t) => t.sign === 'positive';
const nonnegative = (t) => positive(t) || t.sign === 'nonnegative';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const unwrap = (n) => n?.fn === 'DEFER' ? n.args[0] : n;
const symbols = { ADD: '+', SUB: '-', MUL: '*', GT: '>', LT: '<', GTE: '>=', LTE: '<=', EQ: '===', NEQ: '!==' };
const fail = (message) => { throw new Error(`BigInt AOT: ${message}`); };

// This is a deliberately restricted compiler, not a replacement evaluator.
// Parse/lower real RiX; infer types from an explicit, guarded input contract.
// Generated modules have no RiX imports and no runtime operator dispatch.
export function compileBigInt(source, { peepholes = false } = {}) {
  if (typeof source !== 'string' || Buffer.byteLength(source) > 128 * 1024) fail('source must be <=128 KiB');
  const ir = rix.lower(rix.parse(rix.tokenize(source)));
  const nodes = ir.filter((n) => n.fn !== 'NOP');
  if (!nodes.length || nodes.slice(0, -1).some((n) => n.fn !== 'FUNCDEF')) fail('expected function definitions followed by one expression');
  let serial = 0, visited = 0;
  const fresh = () => `v${serial++}`;
  const definitions = new Map(), compiled = new Map(), functions = [];
  const parameters = (p) => {
    if (!p || !Array.isArray(p.positional) || p.positional.some((x) => typeof x.name !== 'string' || x.holeDefault !== null) ||
        ['keyword', 'conditionals', 'prep'].some((k) => p[k]?.length) || p.prepStrict || Object.keys(p.metadata || {}).length) fail('only plain positional parameters supported');
    const names = p.positional.map((x) => x.name);
    if (new Set(names).size !== names.length) fail('duplicate parameters');
    return names;
  };
  for (const n of nodes.slice(0, -1)) {
    const [name, params, body] = n.args;
    if (definitions.has(name)) fail('overloads/redefinitions unsupported');
    definitions.set(name, { name, names: parameters(params), body });
  }
  const scope = (parent = null) => ({ parent, bindings: new Map() });
  const lookup = (s, name, outer = false) => {
    if (outer) { s = s.parent; while (s && !s.bindings.has(name)) s = s.parent; }
    const value = s?.bindings.get(name);
    if (!value) fail(`unbound ${outer ? 'outer ' : ''}binding ${name}`);
    return value;
  };
  const declare = (s, name, type) => {
    const binding = { code: fresh(), type }; s.bindings.set(name, binding); return binding;
  };
  const expect = (value, kind) => { if (value.type.kind !== kind) fail(`expected ${kind}, got ${value.type.kind}`); return value; };
  const merge = (a, b) => {
    if (a.kind !== b.kind) fail('branches must have the same type');
    if (a.kind !== 'integer') { if (!same(a, b)) fail('incompatible branches'); return a; }
    return integer(positive(a) && positive(b) ? 'positive' : nonnegative(a) && nonnegative(b) ? 'nonnegative' : 'any');
  };
  function call(name, values) {
    const definition = definitions.get(name);
    if (!definition || definition.names.length !== values.length) fail(`unsupported call or arity: ${name}`);
    const key = JSON.stringify([name, values.map((x) => x.type)]);
    const cached = compiled.get(key);
    if (cached?.active) fail('recursion unsupported');
    if (cached) return { code: `${cached.code}(${values.map((x) => x.code).join(', ')})`, type: cached.type };
    const entry = { code: fresh(), active: true }; compiled.set(key, entry);
    const env = scope();
    const bindings = definition.names.map((n, i) => declare(env, n, values[i].type));
    const body = expression(definition.body, env);
    entry.type = body.type; entry.active = false;
    functions.push(`// RiX function ${JSON.stringify(name)}\nfunction ${entry.code}(${bindings.map((b) => b.code).join(', ')}) {\n  return ${body.code};\n}`);
    return { code: `${entry.code}(${values.map((x) => x.code).join(', ')})`, type: entry.type };
  }
  function statements(n, env, initialization = false) {
    n = unwrap(n);
    if (n.fn === 'HOLE') return '';
    if (n.fn === 'SEQ') return n.args.map((x) => statements(x, env, initialization)).join('\n');
    if (!['ASSIGN', 'ASSIGN_COPY', 'ASSIGN_UPDATE'].includes(n.fn)) fail(`unsupported loop statement ${n.fn}`);
    const [name, rhs] = n.args;
    if (typeof name !== 'string') fail('dynamic assignment unsupported');
    const existing = env.bindings.get(name);
    if (initialization) {
      if (existing) fail('initialization rebind unsupported');
      if (n.fn === 'ASSIGN' && rhs.fn === 'RETRIEVE') {
        // '=' aliases a Cell in RiX. Share its generated local variable.
        env.bindings.set(name, lookup(env, rhs.args[0])); return `// ${JSON.stringify(name)} aliases ${JSON.stringify(rhs.args[0])}`;
      }
      if (n.fn === 'ASSIGN_UPDATE' || rhs.fn === 'OUTER_RETRIEVE') fail('outer/initial update unsupported');
      const value = expect(expression(rhs, env), 'integer');
      const target = declare(env, name, value.type);
      return `let ${target.code} = ${value.code}; // ${JSON.stringify(name)}`;
    }
    if (!existing || n.fn === 'ASSIGN') fail('loop rebinding/new binding unsupported');
    if (n.fn === 'ASSIGN_COPY' && [...env.bindings.values()].filter((b) => b === existing).length > 1) fail('copy assignment would detach an alias');
    const value = expect(expression(rhs, env), 'integer');
    // Maintain loop invariants across ALL iterations; never reuse a sign fact
    // that a later assignment might invalidate on the next iteration.
    if (existing.type.kind !== 'integer' || (positive(existing.type) && !positive(value.type)) ||
        (nonnegative(existing.type) && !nonnegative(value.type))) fail('assignment weakens loop type/sign invariant');
    return `${existing.code} = ${value.code};`;
  }
  function expression(n, env) {
    n = unwrap(n);
    if (!n || !Array.isArray(n.args) || ++visited > 4096) fail('invalid/oversized IR');
    const a = n.args;
    if (n.fn === 'LITERAL') {
      if (a.length !== 1 || !/^\d+$/.test(a[0]) || a[0].length > 2500) fail('only bounded decimal integer literals supported');
      const value = BigInt(a[0]); return { code: `${value}n`, type: integer(value > 0n ? 'positive' : 'nonnegative') };
    }
    if (n.fn === 'RETRIEVE' || n.fn === 'OUTER_RETRIEVE') return lookup(env, a[0], n.fn === 'OUTER_RETRIEVE');
    if (n.fn === 'CALL') return call(a[0], a.slice(1).map((x) => expression(x, env)));
    if (n.fn === 'NEG') { const x = expect(expression(a[0], env), 'integer'); return { code: `(-${x.code})`, type: integer() }; }
    if (symbols[n.fn] || ['MOD', 'INTDIV'].includes(n.fn)) {
      const x = expect(expression(a[0], env), 'integer'), y = expect(expression(a[1], env), 'integer');
      if (['GT', 'LT', 'GTE', 'LTE', 'EQ', 'NEQ'].includes(n.fn)) return { code: `(${x.code} ${symbols[n.fn]} ${y.code})`, type: boolean };
      if (n.fn === 'MOD') {
        const simple = nonnegative(x.type) && positive(y.type);
        const parity = peepholes && simple && a[1].fn === 'LITERAL' && BigInt(a[1].args[0]) === 2n;
        return { code: parity ? `(${x.code} & 1n)` : simple ? `(${x.code} % ${y.code})` : `floorMod(${x.code}, ${y.code})`, type: integer('nonnegative') };
      }
      if (n.fn === 'INTDIV') {
        const simple = nonnegative(x.type) && positive(y.type);
        const half = peepholes && simple && a[1].fn === 'LITERAL' && BigInt(a[1].args[0]) === 2n;
        return { code: half ? `(${x.code} >> 1n)` : simple ? `(${x.code} / ${y.code})` : `floorDiv(${x.code}, ${y.code})`, type: integer(simple ? 'nonnegative' : 'any') };
      }
      const nn = n.fn !== 'SUB' && nonnegative(x.type) && nonnegative(y.type);
      const pos = nn && (n.fn === 'MUL' ? positive(x.type) && positive(y.type) : positive(x.type) || positive(y.type));
      return { code: `(${x.code} ${symbols[n.fn]} ${y.code})`, type: integer(pos ? 'positive' : nn ? 'nonnegative' : 'any') };
    }
    if (n.fn === 'TERNARY') {
      if (a.length !== 4 || unwrap(a[3]).fn !== 'UNDECIDED') fail('explicit undecided branch unsupported');
      const test = expect(expression(a[0], env), 'boolean'), yes = expression(a[1], env), no = expression(a[2], env);
      return { code: `(${test.code} ? ${yes.code} : ${no.code})`, type: merge(yes.type, no.type) };
    }
    if (n.fn === 'CALL_METHOD') {
      if (a.length !== 3 || a[1] !== 'MAP' || a[2]?.fn !== 'LAMBDA') fail('only sequence.Map(lambda) supported');
      const values = expect(expression(a[0], env), 'sequence'), names = parameters(a[2].args[0]);
      if (names.length !== 1) fail('Map lambda needs one parameter');
      const child = scope(env), binding = declare(child, names[0], values.type.element), body = expression(a[2].args[1], child);
      expect(body, 'integer');
      return { code: `${values.code}.map((${binding.code}) => ${body.code})`, type: { kind: 'sequence', element: body.type } };
    }
    if (n.fn === 'LOOP') {
      const [meta, init, cond, body, update, after] = a;
      if (a.length !== 6 || !Array.isArray(meta?.imports) || Object.keys(meta).some((k) => k !== 'imports') || unwrap(update)?.fn !== 'HOLE') fail('only scoped five-slot loops with empty update supported');
      const child = scope(env), lines = [];
      for (const spec of meta.imports) {
        if (spec.mode !== 'copy' || child.bindings.has(spec.local)) fail('only unique copied scope imports supported');
        const value = lookup(env, spec.source), binding = declare(child, spec.local, value.type);
        lines.push(`let ${binding.code} = ${value.code}; // import ${JSON.stringify(spec.local)}`);
      }
      lines.push(statements(init, child, true));
      const condition = expect(expression(cond, child), 'boolean'), step = statements(body, child), result = expect(expression(after, child), 'integer');
      const counter = fresh();
      lines.push(`let ${counter} = 0;`, `while (${condition.code}) {`, `  if (${counter}++ >= 10000) throw new Error('Loop exceeded max iteration count: 10000');`, ...step.split('\n').map((l) => '  ' + l), '}', `return ${result.code};`);
      return { code: `(() => {\n${lines.flatMap((l) => l.split('\n')).map((l) => '    ' + l).join('\n')}\n  })()`, type: result.type };
    }
    fail(`unsupported IR ${n.fn}`);
  }
  const env = scope();
  // Explicit contract, independent of the names/parameters of RiX functions.
  const inputs = [['bases', sequence], ['exponent', integer('nonnegative')], ['modulus', integer('positive')]];
  inputs.forEach(([name, type]) => env.bindings.set(name, { code: name, type }));
  const result = expression(nodes.at(-1), env); expect(result, 'sequence');
  if (new Set([...compiled.keys()].map((k) => JSON.parse(k)[0])).size !== definitions.size) fail('unused definitions unsupported');
  const hash = createHash('sha256').update(source).digest('hex');
  const moduleSource = `// Generated from RiX IR; source SHA256 ${hash}\n// Exact BigInt specialization; peepholes=${peepholes}. No interpreter calls.\nexport const sourceHash = ${JSON.stringify(hash)};\n\nexport function validateInputs(bases, exponent, modulus) {\n  if (!Array.isArray(bases) || !bases.length || bases.length > 4096 ||\n      Array.from(bases).some(b => typeof b !== 'bigint' || b < 0n || b.toString(2).length > 8192) ||\n      typeof exponent !== 'bigint' || exponent < 0n || exponent.toString(2).length > 4096 ||\n      typeof modulus !== 'bigint' || modulus < 1n || modulus.toString(2).length > 8192)\n    throw new RangeError('Nonnegative bounded BigInt bases/exponent and positive modulus required');\n}\nfunction floorDiv(a, b) {\n  const q = a / b, r = a % b;\n  return r !== 0n && ((a < 0n) !== (b < 0n)) ? q - 1n : q;\n}\nfunction floorMod(a, b) {\n  if (b <= 0n) throw new RangeError('Modulo requires a positive divisor');\n  const r = a % b; return r < 0n ? r + b : r;\n}\n\n${functions.join('\n\n')}\n\nexport function run(bases, exponent, modulus) {\n  validateInputs(bases, exponent, modulus);\n  return ${result.code};\n}\n`;
  return { moduleSource, ir, sourceHash: hash, peepholes, specializations: compiled.size };
}

// The boundary preserves RiX's sequence and exact Integer representation.
// Conversion/boxing are timed in the main compiled-vs-interpreted comparison.
export function runIntegerSequence(module, fixture) {
  return { type: 'sequence', values: module.run(fixture.integers.map((x) => {
    if (!(x instanceof Integer)) throw new TypeError('Expected RatMath Integer');
    return x.value;
  }), fixture.exponentInteger.value, fixture.modulusInteger.value).map((x) => new Integer(x)) };
}
