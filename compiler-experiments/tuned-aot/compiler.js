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

// Extended snapshot of ../bigint-aot/compiler.js for tuned algorithms.
// Keep the earlier compiler and its measured artifacts reproducible.
// This is a deliberately restricted compiler, not a replacement evaluator.
// Parse/lower real RiX; infer types from an explicit, guarded input contract.
// Generated modules have no RiX imports and no runtime operator dispatch.
export function compileBigInt(source, { peepholes = true, powerOfTwo = true, requireOddModulus = false } = {}) {
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
  const declare = (s, name, type, value = {}) => {
    const binding = { code: fresh(), type, shift: type.powerOfTwo && value.shift !== undefined ? fresh() : undefined, shiftInit: value.shift };
    s.bindings.set(name, binding); return binding;
  };
  const expect = (value, kind) => { if (value.type.kind !== kind) fail(`expected ${kind}, got ${value.type.kind}`); return value; };
  const merge = (a, b) => {
    if (a.kind !== b.kind) fail('branches must have the same type');
    if (a.kind === 'sequence') return { kind: 'sequence', element: merge(a.element, b.element) };
    if (a.kind !== 'integer') { if (!same(a, b)) fail('incompatible branches'); return a; }
    return integer(positive(a) && positive(b) ? 'positive' : nonnegative(a) && nonnegative(b) ? 'nonnegative' : 'any');
  };
  function call(name, values) {
    const definition = definitions.get(name);
    if (!definition || definition.names.length !== values.length) fail(`unsupported call or arity: ${name}`);
    const key = JSON.stringify([name, values.map((x) => x.type)]);
    const cached = compiled.get(key);
    if (cached?.active) fail('recursion unsupported');
    const argumentsCode = () => values.flatMap((x) => x.type.powerOfTwo ? [x.code, x.shift] : [x.code]).join(', ');
    if (cached) return { code: `${cached.code}(${argumentsCode()})`, type: cached.type };
    const entry = { code: fresh(), active: true }; compiled.set(key, entry);
    const env = scope();
    const bindings = definition.names.map((n, i) => {
      const binding = declare(env, n, values[i].type);
      if (binding.type.powerOfTwo) binding.shift = fresh();
      return binding;
    });
    const body = expression(definition.body, env, true);
    entry.type = body.type; entry.active = false;
    // A power-of-two parameter carries its known shift as an extra native
    // argument, avoiding repeated bit-length computation inside MontMul.
    if (body.type.powerOfTwo) fail('returning power-of-two facts unsupported');
    functions.push(`// RiX function ${JSON.stringify(name)}\nfunction ${entry.code}(${bindings.flatMap((b) => b.type.powerOfTwo ? [b.code, b.shift] : [b.code]).join(', ')}) {\n  return ${body.code};\n}`);
    return { code: `${entry.code}(${argumentsCode()})`, type: entry.type };
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
      const value = expression(rhs, env);
      if (!['integer', 'sequence'].includes(value.type.kind)) fail('unsupported binding type');
      const target = declare(env, name, value.type, value);
      return `${target.shiftInit !== undefined ? `let ${target.shift} = ${target.shiftInit};\n` : ''}let ${target.code} = ${value.code}; // ${JSON.stringify(name)}`;
    }
    if (!existing || n.fn === 'ASSIGN') fail('loop rebinding/new binding unsupported');
    if (n.fn === 'ASSIGN_COPY' && [...env.bindings.values()].filter((b) => b === existing).length > 1) fail('copy assignment would detach an alias');
    const value = expression(rhs, env);
    // Maintain loop invariants across ALL iterations; never reuse a sign fact
    // that a later assignment might invalidate on the next iteration.
    const compatible = (target, actual) => target.kind === actual.kind && (target.kind === 'sequence'
      ? compatible(target.element, actual.element)
      : target.kind === 'integer' && (!positive(target) || positive(actual)) && (!nonnegative(target) || nonnegative(actual)));
    if (!compatible(existing.type, value.type) || existing.type.powerOfTwo) fail('assignment weakens loop type/sign invariant');
    return `${existing.code} = ${value.code};`;
  }
  function expression(n, env, sharedFunctionScope = false) {
    n = unwrap(n);
    if (!n || !Array.isArray(n.args) || ++visited > 4096) fail('invalid/oversized IR');
    const a = n.args;
    if (n.fn === 'LITERAL') {
      if (a.length !== 1 || !/^\d+$/.test(a[0]) || a[0].length > 2500) fail('only bounded decimal integer literals supported');
      const value = BigInt(a[0]); return { code: `${value}n`, type: integer(value > 0n ? 'positive' : 'nonnegative') };
    }
    if (n.fn === 'RETRIEVE' || n.fn === 'OUTER_RETRIEVE') return lookup(env, a[0], n.fn === 'OUTER_RETRIEVE');
    if (n.fn === 'ARRAY') {
      if (!a.length) fail('seed empty sequences with an element of the intended type');
      const values = a.map((x) => expression(x, env)), element = values.map((x) => x.type).reduce(merge);
      if (!['integer', 'sequence'].includes(element.kind)) fail('unsupported sequence element');
      return { code: `[${values.map((x) => x.code).join(', ')}]`, type: { kind: 'sequence', element } };
    }
    if (n.fn === 'CALL') return call(a[0], a.slice(1).map((x) => expression(x, env)));
    if (n.fn === 'NEG') { const x = expect(expression(a[0], env), 'integer'); return { code: `(-${x.code})`, type: integer() }; }
    if (n.fn === 'POW') {
      if (a[0]?.fn !== 'LITERAL' || a[0].args[0] !== '2') fail('only bounded powers of two supported');
      const exponent = expect(expression(a[1], env), 'integer');
      if (!nonnegative(exponent.type)) fail('power-of-two exponent must be proven nonnegative');
      return { code: `pow2(${exponent.code})`, type: { ...integer('positive'), powerOfTwo: true }, shift: exponent.code };
    }
    if (symbols[n.fn] || ['MOD', 'INTDIV'].includes(n.fn)) {
      const x = expect(expression(a[0], env), 'integer'), y = expect(expression(a[1], env), 'integer');
      if (['GT', 'LT', 'GTE', 'LTE', 'EQ', 'NEQ'].includes(n.fn)) return { code: `(${x.code} ${symbols[n.fn]} ${y.code})`, type: boolean };
      if (n.fn === 'MOD') {
        if (powerOfTwo && y.type.powerOfTwo) return { code: `(${x.code} & (${y.code} - 1n))`, type: integer('nonnegative') };
        const simple = nonnegative(x.type) && positive(y.type);
        const parity = peepholes && simple && a[1].fn === 'LITERAL' && BigInt(a[1].args[0]) === 2n;
        return { code: parity ? `(${x.code} & 1n)` : simple ? `(${x.code} % ${y.code})` : `floorMod(${x.code}, ${y.code})`, type: integer('nonnegative') };
      }
      if (n.fn === 'INTDIV') {
        if (powerOfTwo && y.type.powerOfTwo) return { code: `(${x.code} >> ${y.shift})`, type: integer(nonnegative(x.type) ? 'nonnegative' : 'any') };
        const simple = nonnegative(x.type) && positive(y.type);
        const half = peepholes && simple && a[1].fn === 'LITERAL' && BigInt(a[1].args[0]) === 2n;
        return { code: half ? `(${x.code} >> 1n)` : simple ? `(${x.code} / ${y.code})` : `floorDiv(${x.code}, ${y.code})`, type: integer(simple ? 'nonnegative' : 'any') };
      }
      const provedDifference = n.fn === 'SUB' && env.differences?.has(JSON.stringify([x.code, y.code]));
      const nn = provedDifference || (n.fn !== 'SUB' && nonnegative(x.type) && nonnegative(y.type));
      const pos = nn && n.fn !== 'SUB' && (n.fn === 'MUL' ? positive(x.type) && positive(y.type) : positive(x.type) || positive(y.type));
      return { code: `(${x.code} ${symbols[n.fn]} ${y.code})`, type: integer(pos ? 'positive' : nn ? 'nonnegative' : 'any') };
    }
    if (n.fn === 'TERNARY') {
      if (a.length !== 4 || unwrap(a[3]).fn !== 'UNDECIDED') fail('explicit undecided branch unsupported');
      const test = expect(expression(a[0], env), 'boolean');
      let yesEnv = env;
      if (a[0].fn === 'GTE' && a[0].args.every((x) => x.fn === 'RETRIEVE')) {
        const left = expression(a[0].args[0], env), right = expression(a[0].args[1], env);
        yesEnv = { ...env, differences: new Set([...(env.differences || []), JSON.stringify([left.code, right.code])]) };
      }
      const yes = expression(a[1], yesEnv), no = expression(a[2], env);
      return { code: `(${test.code} ? ${yes.code} : ${no.code})`, type: merge(yes.type, no.type) };
    }
    if (n.fn === 'CALL_METHOD') {
      const receiver = expression(a[0], env), args = a.slice(2);
      if (a[1] === 'BITLENGTH' && !args.length) {
        expect(receiver, 'integer');
        return { code: `bitLength(${receiver.code})`, type: integer(positive(receiver.type) ? 'positive' : 'nonnegative') };
      }
      const values = expect(receiver, 'sequence');
      if (['MAP', 'REDUCE'].includes(a[1])) {
        const reducing = a[1] === 'REDUCE';
        if (args.length !== (reducing ? 2 : 1) || args[0]?.fn !== 'LAMBDA') fail('expected explicit sequence callback');
        const names = parameters(args[0].args[0]), child = scope(env);
        if (names.length !== (reducing ? 2 : 1)) fail('incorrect callback arity');
        const initial = reducing ? expect(expression(args[1], env), 'integer') : null;
        const bindings = names.map((name, i) => declare(child, name, reducing && i === 0 ? initial.type : values.type.element));
        const body = expect(expression(args[0].args[1], child, true), 'integer');
        if (reducing && !same(merge(initial.type, body.type), initial.type)) fail('reduce accumulator type invariant weakened');
        return { code: `${values.code}.${reducing ? 'reduce' : 'map'}((${bindings.map((b) => b.code).join(', ')}) => ${body.code}${reducing ? ', ' + initial.code : ''})`, type: reducing ? body.type : { kind: 'sequence', element: body.type } };
      }
      if (a[1] === 'LEN' && !args.length) return { code: `BigInt(${values.code}.length)`, type: integer('nonnegative') };
      if (a[1] === 'GET' && args.length === 1) return { code: `getAt(${values.code}, ${expect(expression(args[0], env), 'integer').code})`, type: values.type.element };
      if (a[1] === 'LAST' && !args.length) return { code: `last(${values.code})`, type: values.type.element };
      if (a[1] === 'REVERSE' && !args.length) return { code: `${values.code}.slice().reverse()`, type: values.type };
      if (a[1] === 'SLICE' && args.length === 1) return { code: `sliceFrom(${values.code}, ${expect(expression(args[0], env), 'integer').code})`, type: values.type };
      if (a[1] === 'PUSH' && args.length === 1) {
        const value = expression(args[0], env), element = merge(values.type.element, value.type);
        return { code: `append(${values.code}, ${value.code})`, type: { kind: 'sequence', element } };
      }
      fail(`unsupported sequence method ${a[1]}`);
    }
    if (n.fn === 'BLOCK') {
      const scoped = !a[0]?.fn, meta = scoped ? a[0] : { imports: [] }, parts = scoped ? a.slice(1) : a;
      if (!Array.isArray(meta?.imports) || Object.keys(meta).some((k) => k !== 'imports') || !parts.length || (sharedFunctionScope && meta.imports.length)) fail('unsupported block scope imports');
      const child = sharedFunctionScope ? env : scope(env), lines = [];
      for (const spec of meta.imports) {
        if (spec.mode !== 'copy' || child.bindings.has(spec.local)) fail('only unique copied imports supported');
        const value = lookup(env, spec.source), binding = declare(child, spec.local, value.type, value);
        if (binding.shiftInit !== undefined) lines.push(`let ${binding.shift} = ${binding.shiftInit};`);
        lines.push(`let ${binding.code} = ${value.code};`);
      }
      for (const statement of parts.slice(0, -1)) lines.push(statements(statement, child, true));
      const result = expression(parts.at(-1), child);
      lines.push(`return ${result.code};`);
      return { code: `(() => {\n${lines.flatMap((l) => l.split('\n')).map((l) => '    ' + l).join('\n')}\n  })()`, type: result.type, shift: result.shift };
    }
    if (n.fn === 'LOOP') {
      const scoped = !a[0]?.fn, meta = scoped ? a[0] : { imports: [] };
      const [init, cond, body, update, after] = scoped ? a.slice(1) : a;
      if ((scoped ? a.length !== 6 : a.length !== 5) || !Array.isArray(meta?.imports) || Object.keys(meta).some((k) => k !== 'imports') || unwrap(update)?.fn !== 'HOLE' || (sharedFunctionScope && meta.imports.length)) fail('unsupported loop scope/update');
      const child = sharedFunctionScope ? env : scope(env), lines = [];
      for (const spec of meta.imports) {
        if (spec.mode !== 'copy' || child.bindings.has(spec.local)) fail('only unique copied scope imports supported');
        const value = lookup(env, spec.source), binding = declare(child, spec.local, value.type, value);
        if (binding.shiftInit !== undefined) lines.push(`let ${binding.shift} = ${binding.shiftInit};`);
        lines.push(`let ${binding.code} = ${value.code}; // import ${JSON.stringify(spec.local)}`);
      }
      lines.push(statements(init, child, true));
      const condition = expect(expression(cond, child), 'boolean'), step = statements(body, child), result = expression(after, child);
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
  const moduleSource = `// Generated from RiX IR; source SHA256 ${hash}\n// Exact BigInt specialization; peepholes=${peepholes}. No interpreter calls.\nexport const sourceHash = ${JSON.stringify(hash)};\n\nexport function validateInputs(bases, exponent, modulus) {\n  if (!Array.isArray(bases) || !bases.length || bases.length > 4096 ||\n      Array.from(bases).some(b => typeof b !== 'bigint' || b < 0n || b.toString(2).length > 8192) ||\n      typeof exponent !== 'bigint' || exponent < 0n || exponent.toString(2).length > 4096 ||\n      typeof modulus !== 'bigint' || modulus < 1n || modulus.toString(2).length > 8192)\n    throw new RangeError('Nonnegative bounded BigInt bases/exponent and positive modulus required');\n}\nfunction pow2(e) { if (e < 0n || e > 16384n) throw new RangeError('Power-of-two exponent outside specialization budget'); return 1n << e; }\nfunction bitLength(n) { return n === 0n ? 0n : BigInt((n < 0n ? -n : n).toString(2).length); }\nfunction getAt(a, i) { const j = i < 0n ? BigInt(a.length) + i : i - 1n; if (j < 0n || j >= BigInt(a.length)) throw new RangeError('Specialization requires an in-range sequence read'); return a[Number(j)]; }\nfunction last(a) { if (!a.length) throw new RangeError('Specialization requires a nonempty Last receiver'); return a[a.length - 1]; }\nfunction sliceFrom(a, i) { const j = i < 0n ? BigInt(a.length) + i : i - 1n; return a.slice(Number(j < 0n ? 0n : j > BigInt(a.length) ? BigInt(a.length) : j)); }\nfunction append(a, value) { if (a.length >= 16384) throw new RangeError('Sequence specialization budget exceeded'); const copy = a.slice(); copy.push(value); return copy; }\nfunction floorDiv(a, b) {\n  const q = a / b, r = a % b;\n  return r !== 0n && ((a < 0n) !== (b < 0n)) ? q - 1n : q;\n}\nfunction floorMod(a, b) {\n  if (b <= 0n) throw new RangeError('Modulo requires a positive divisor');\n  const r = a % b; return r < 0n ? r + b : r;\n}\n\n${functions.join('\n\n')}\n\nexport function run(bases, exponent, modulus) {\n  validateInputs(bases, exponent, modulus);\n  ${requireOddModulus ? "if ((modulus & 1n) === 0n) throw new RangeError('Montgomery specialization requires an odd modulus');" : ''}\n  return ${result.code};\n}\n`;
  return { moduleSource, ir, sourceHash: hash, peepholes, specializations: compiled.size };
}

// The boundary preserves RiX's sequence and exact Integer representation.
// Conversion/boxing are timed in the main compiled-vs-interpreted comparison.
export function runIntegerSequence(module, fixture) {
  return { type: 'sequence', _ext: new Map([['_mutable', new Integer(1n)]]), values: module.run(fixture.integers.map((x) => {
    if (!(x instanceof Integer)) throw new TypeError('Expected RatMath Integer');
    return x.value;
  }), fixture.exponentInteger.value, fixture.modulusInteger.value).map((x) => new Integer(x)) };
}
