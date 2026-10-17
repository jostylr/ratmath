import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { rix, Rational } from '../runtime.js';
import { defineKernel, expressionText } from './plan.js';
import { compileNativeKernel, validateJob } from './host.js';

const operators = new Set(['ADD', 'SUB', 'MUL', 'DIV', 'NEG']);
const markerStart = /^@native\b/;

// Use RiX's tokenizer/AST/IR: marker-like text in strings and nested functions
// cannot become a top-level native declaration by textual substitution.
export function inspectNativeSource(source) {
  if (typeof source !== 'string' || Buffer.byteLength(source) > 128 * 1024) throw new TypeError('RiX source required (maximum 128 KiB)');
  const tokens = rix.tokenize(source);
  const ast = rix.parse(tokens);
  const definitions = ast.filter((n) => n.type === 'Statement' && ['FunctionDefinition', 'FunctionVariantDefinition'].includes(n.expression.type));
  const declarations = [];
  const seen = new Set();
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.kind !== 'comment' || !markerStart.test(token.value.trim())) continue;
    const start = token.pos[1] - 2;
    const prefix = source.slice(source.lastIndexOf('\n', start - 1) + 1, start);
    if (!token.original.trim().startsWith('##') || /[\r\n]/.test(token.original.trim()) || prefix.trim() || token.value.trim() !== '@native exact-rational') {
      throw new SyntaxError('Native marker must be a standalone line: ## @native exact-rational');
    }
    const next = tokens[i + 1];
    const declaration = definitions.find((n) => n.pos[1] === next?.pos[1]);
    if (!declaration || declaration.expression.type !== 'FunctionDefinition' || !/^[\s]*$/.test(source.slice(token.pos[2], next.pos[1]))) {
      throw new SyntaxError('Native marker must immediately precede a top-level function definition');
    }
    const def = declaration.expression;
    const name = source.slice(def.name.pos[1], def.name.pos[2]);
    const canonicalName = def.name.name;
    if (!/^[A-Z][A-Za-z0-9_]{0,56}$/.test(name)) throw new TypeError('Native functions require an ASCII system function name (maximum 57 characters)');
    if (seen.has(canonicalName) || definitions.filter((n) => n.expression.name.name === canonicalName).length !== 1) {
      throw new TypeError(`Duplicate/overloaded native function: ${name}`);
    }
    seen.add(canonicalName);
    const { positional, keyword, conditionals, metadata } = def.parameters;
    if (![1, 2].includes(positional.length) || positional.some((p) => !/^[a-z][a-zA-Z0-9_]*$/.test(p.name) || p.defaultValue != null || Object.keys(p).some((k) => !['name', 'defaultValue'].includes(k))) ||
        new Set(positional.map((p) => p.name)).size !== positional.length || keyword.length || conditionals.length || Object.keys(metadata).length || def.prep || def.prepStrict || def.variantName || (def.prepUndecided && def.prepUndecided !== 'stop')) {
      throw new TypeError(`${name}: native functions require one or two plain positional parameters, without defaults, preparation or conditions`);
    }
    const params = positional.map((p) => p.name);
    const body = rix.lower([declaration])[0].args[2];
    let visited = 0;
    function remap(node) {
      if (++visited > 64) throw new RangeError(`${name}: expression exceeds 64-node budget`);
      if (node.fn === 'RETRIEVE') {
        const index = params.indexOf(node.args[0]);
        if (node.args.length !== 1 || index === -1) throw new TypeError(`${name}: captured/unknown identifier ${node.args[0]}`);
        return { fn: 'RETRIEVE', args: [index === 0 ? 'x' : 'y'] };
      }
      if (node.fn === 'LITERAL') return { fn: node.fn, args: [...node.args] };
      if (!operators.has(node.fn) || node.args.length !== (node.fn === 'NEG' ? 1 : 2)) throw new TypeError(`${name}: native subset does not support ${node.fn}`);
      return { fn: node.fn, args: node.args.map(remap) };
    }
    const expression = expressionText({ node: remap(body) });
    // This second validation enforces literal size, expression length and domain.
    const plan = defineKernel({ name: `source-${canonicalName.toLowerCase().replaceAll('_', '-')}`, execution: 'native', numeric: 'exact-rational', pattern: 'map', expression });
    declarations.push(Object.freeze({ name, canonicalName, parameters: Object.freeze(params), expression: plan.spec.expression,
      line: source.slice(0, def.pos[1]).split('\n').length }));
    if (declarations.length > 32) throw new RangeError('Maximum 32 marked functions per source');
  }
  if (!declarations.length) throw new SyntaxError('No marked native functions found');
  return Object.freeze(declarations);
}

export async function loadNativeFunctions(source, compileOptions = {}) {
  // Validate every declaration before starting any compiler process.
  const declarations = inspectNativeSource(source);
  compileOptions = { ...compileOptions };
  const exports = Object.create(null);
  const sourceHash = createHash('sha256').update(source).digest('hex');
  for (const declaration of declarations) {
    const kernels = new Map();
    const compile = (pattern) => {
      if (!kernels.has(pattern)) {
        const plan = defineKernel({ name: `source-${declaration.canonicalName.toLowerCase().replaceAll('_', '-')}`, execution: 'native', numeric: 'exact-rational', pattern, expression: declaration.expression });
        const pending = compileNativeKernel(plan, compileOptions);
        kernels.set(pattern, pending);
        // Failed lazy builds may be retried after correcting the local toolchain.
        pending.catch(() => { if (kernels.get(pattern) === pending) kernels.delete(pattern); });
      }
      return kernels.get(pattern);
    };
    const initial = await compile('map');
    const arity = declaration.parameters.length;
    const job = (left, right) => {
      if (!Array.isArray(left)) throw new TypeError('Input must be an array');
      if (arity === 1) {
        if (right !== undefined) throw new TypeError('Unary native function takes one input array');
        right = Array(left.length).fill(Rational.zero);
      } else if (!Array.isArray(right)) throw new TypeError('Binary native function takes two input arrays');
      return { rows: left.length, inner: 1, cols: 1, left, right };
    };
    const callable = async (...args) => {
      if (args.length !== arity) throw new TypeError(`${declaration.name} requires ${arity} arguments`);
      const result = await initial.run(job([args[0]], arity === 2 ? [args[1]] : undefined));
      return result.values[0];
    };
    Object.assign(callable, {
      native: Object.freeze({ ...declaration, sourceHash, build: Object.freeze(initial.build) }),
      prepare: async (pattern = 'map') => {
        if (!['map', 'map-reduce', 'matrix-reduce'].includes(pattern)) throw new TypeError('Unsupported native batch pattern');
        if (pattern === 'matrix-reduce' && arity !== 2) throw new TypeError('Matrix reduction requires a binary function');
        return Object.freeze((await compile(pattern)).build);
      },
      // All batch methods return {values, metrics}; each uses a single child job.
      map: async (left, right, options) => initial.run(job(left, right), options),
      reduce: async (left, right, options) => {
        const input = job(left, right);
        // Validate before requesting a lazy compiler build.
        validateJob(initial.plan, input);
        return (await compile('map-reduce')).run(input, options);
      },
      matrixReduce: async (input, options) => {
        if (arity !== 2) throw new TypeError('Matrix reduction requires a binary function');
        const plan = defineKernel({ ...initial.plan.spec, pattern: 'matrix-reduce' });
        validateJob(plan, input);
        return (await compile('matrix-reduce')).run(input, options);
      },
    });
    exports[declaration.name] = Object.freeze(callable);
  }
  return Object.freeze(exports);
}

export async function loadNativeFile(path, compileOptions) {
  return loadNativeFunctions(await readFile(path, 'utf8'), compileOptions);
}
