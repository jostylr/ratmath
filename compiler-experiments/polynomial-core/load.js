import assert from 'node:assert/strict';
import { readFile, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { here } from './build.js';
export { canonical } from '../integrated-core/load.js';
export async function load() {
  const paths = JSON.parse(await readFile(resolve(here, 'tmp/build.json'), 'utf8'));
  const require = createRequire(resolve(paths.rix, 'package.json'));
  assert.equal(await realpath(require.resolve('@ratmath/core')), resolve(paths.core, 'index.js'));
  const core = await import(pathToFileURL(resolve(paths.core, 'index.js')).href);
  const rix = await import(pathToFileURL(resolve(paths.rix, 'src/index.js')).href);
  const registry = rix.createDefaultRegistry(), system = rix.createDefaultSystemContext().copy();
  const values = v => {
    if (v?.type !== 'sequence' || !Array.isArray(v.values)) throw new TypeError('RiX sequence required');
    return v.values;
  };
  // Use RiX's own array constructor so batches retain normal sequence methods.
  const sequence = items => {
    const result = registry.get('ARRAY').impl([], new rix.Context(), v => v);
    result.values.push(...items);
    return result;
  };
  for (const [name, fused] of [['polynomialOne', false], ['polynomialFused', true]]) {
    system.registerHost(name, { pure: true, impl: ([cs, x]) =>
      (fused ? core.evaluatePolynomialFused : core.evaluatePolynomial)(values(cs), x) });
  }
  for (const [name, fused] of [['polynomialBatch', false], ['polynomialBatchFused', true]]) {
    system.registerHost(name, { pure: true, impl: ([cs, xs]) =>
      sequence(core.evaluatePolynomialBatch(values(cs), values(xs), { fused })) });
  }
  system.freeze();
  const parse = source => rix.lower(rix.parse(rix.tokenize(source)));
  const run = (ir, bindings = {}, context = new rix.Context()) => {
    for (const [name, value] of Object.entries(bindings)) context.set(name, value);
    let result;
    for (const node of ir) result = rix.evaluate(node, context, registry, system);
    return result;
  };
  assert.ok(run(parse('1/3;')) instanceof core.Rational);
  return { core, rix, paths, registry, system, sequence, parse, run };
}
