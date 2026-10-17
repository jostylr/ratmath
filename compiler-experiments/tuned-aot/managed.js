import { createHash } from 'node:crypto';
import { compileBigInt, runIntegerSequence } from './compiler.js';
import { rix, Integer, registry, systemContext } from '../runtime.js';

// A local host capability called from ordinary RiX. Compilation/import happen
// lazily on the first call; later calls reuse the source/options-specific module.
// This avoids modifying the production evaluator or redefining its arithmetic.
export function createManagedKernel(source, options = {}) {
  options = Object.freeze({ ...options });
  const capabilities = systemContext.copy();
  let pending;
  const stats = { builds: 0, calls: 0, compileMs: 0, importMs: 0 };
  const getModule = () => pending ||= (async () => {
    const start = performance.now(), compiled = compileBigInt(source, options);
    stats.compileMs = performance.now() - start; stats.builds++;
    const importing = performance.now();
    const module = await import(`data:text/javascript;base64,${Buffer.from(compiled.moduleSource).toString('base64')}`);
    stats.importMs = performance.now() - importing;
    return module;
  })();
  capabilities.registerHost('compiledPowers', {
    impl: async ([bases, exponent, modulus]) => {
      if (bases?.type !== 'sequence' || !Array.isArray(bases.values) || !(exponent instanceof Integer) || !(modulus instanceof Integer)) throw new TypeError('Expected Integer sequence, exponent and modulus');
      stats.calls++;
      return runIntegerSequence(await getModule(), { integers: bases.values, exponentInteger: exponent, modulusInteger: modulus });
    },
  });
  capabilities.freeze();
  const ir = rix.lower(rix.parse(rix.tokenize('Compute(bases,exponent,modulus) -> .compiledPowers(bases,exponent,modulus); Compute(bases,exponent,modulus);')));
  return { sourceHash: createHash('sha256').update(source).digest('hex'), stats,
    async run(fixture) {
      const context = new rix.Context();
      context.set('bases', { type: 'sequence', values: fixture.integers });
      context.set('exponent', fixture.exponentInteger); context.set('modulus', fixture.modulusInteger);
      let result;
      for (const node of ir) result = await rix.evaluateAsync(node, context, registry, capabilities);
      return result;
    } };
}
