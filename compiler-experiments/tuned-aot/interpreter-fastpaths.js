import { rix, Integer, registry, systemContext } from '../runtime.js';

// Experiment-only registry. Never mutate the shared/default registry or core.
// Exact plain Integers get direct BigInt operations; all other types retain the
// original implementation, including rational/interval and error behavior.
export function createIntegerFastRegistry({ countHits = false } = {}) {
  const optimized = rix.createDefaultRegistry();
  const hits = { modulo: 0, intdiv: 0, fallback: 0 };
  const exact = (x) => x instanceof Integer && Object.getPrototypeOf(x) === Integer.prototype;
  for (const name of ['MOD', 'INTDIV']) {
    const original = optimized.get(name);
    optimized.override(name, (args, context, evaluate) => {
      const [a, b] = args;
      if (args.length === 2 && exact(a) && exact(b) && (name === 'MOD' ? b.value > 0n : b.value !== 0n)) {
        const x = a.value, y = b.value, remainder = x % y;
        if (countHits) hits[name === 'MOD' ? 'modulo' : 'intdiv']++;
        if (name === 'MOD') return new Integer(remainder < 0n ? remainder + y : remainder);
        const quotient = x / y;
        return new Integer(remainder !== 0n && ((x < 0n) !== (y < 0n)) ? quotient - 1n : quotient);
      }
      if (countHits) hits.fallback++;
      return original.impl(args, context, evaluate);
    }, { pure: true });
  }
  return { registry: optimized, hits };
}

export function runInterpreted(ir, fixture, executionRegistry = registry) {
  const context = new rix.Context();
  context.set('bases', { type: 'sequence', values: fixture.integers });
  context.set('exponent', fixture.exponentInteger); context.set('modulus', fixture.modulusInteger);
  let result;
  for (const node of ir) result = rix.evaluate(node, context, executionRegistry, systemContext);
  return result;
}
