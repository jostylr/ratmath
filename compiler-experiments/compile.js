import { registry, Integer } from './runtime.js';

const methods = { ADD: 'add', SUB: 'subtract', MUL: 'multiply' };
const symbols = { ADD: '+', SUB: '-', MUL: '*' };

// Deliberately closed subset: no effects, division, powers, calls or lazy nodes.
// These experiments assume default numeric dispatch, no holes or reactive values.
export function compileExpression(node, mode = 'runtime') {
  if (!['runtime', 'hoisted', 'methods', 'bigint'].includes(mode)) throw new Error(`Unknown mode ${mode}`);
  const constants = [];
  function emit(n) {
    if (!n || typeof n !== 'object' || !Array.isArray(n.args)) throw new Error('Expected IR node');
    if (n.fn === 'LITERAL') {
      if (n.args.length !== 1 || !/^-?\d+$/.test(n.args[0])) throw new Error('Only integer literals supported');
      if (mode === 'runtime') return `registry.get("LITERAL").impl([${JSON.stringify(n.args[0])}], context)`;
      if (mode === 'bigint') return `${BigInt(n.args[0])}n`;
      const index = constants.push(new Integer(BigInt(n.args[0]))) - 1;
      return `constants[${index}]`;
    }
    if (n.fn === 'RETRIEVE') {
      if (n.args.length !== 1 || !['x', 'step'].includes(n.args[0])) throw new Error('Unsupported binding');
      return mode === 'runtime' || mode === 'hoisted'
        ? `registry.get("RETRIEVE").impl([${JSON.stringify(n.args[0])}], context)` : n.args[0];
    }
    if (!methods[n.fn] || n.args.length !== 2) throw new Error(`Unsupported IR: ${n.fn}`);
    const a = emit(n.args[0]), b = emit(n.args[1]);
    if (mode === 'methods') return `(${a}).${methods[n.fn]}(${b})`;
    if (mode === 'bigint') return `(${a} ${symbols[n.fn]} ${b})`;
    return `registry.get(${JSON.stringify(n.fn)}).impl([${a}, ${b}], context)`;
  }
  const source = `return ${emit(node)};`;
  // Names and literals are validated/quoted above. This is a local benchmark emitter.
  const fn = new Function('registry', 'constants', 'context', 'x', 'step', source);
  return { source, constants, run: (context, x, step) => fn(registry, constants, context, x, step) };
}
