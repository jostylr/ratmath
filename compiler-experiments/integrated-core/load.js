import assert from 'node:assert/strict';
import { readFile, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { here } from './build.js';
export const manifest = JSON.parse(await readFile(resolve(here, 'tmp/build.json'), 'utf8'));
export async function load(variant) {
  const paths = manifest.paths[variant];
  if (!paths) throw new Error(`Unknown package variant ${variant}`);
  const require = createRequire(resolve(paths.rix, 'package.json'));
  const resolved = await realpath(require.resolve('@ratmath/core'));
  assert.equal(resolved, resolve(paths.core, 'index.js'), 'RiX must resolve its local core, never production');
  const core = await import(pathToFileURL(resolved).href);
  const rix = await import(pathToFileURL(resolve(paths.rix, 'src/index.js')).href);
  const registry = rix.createDefaultRegistry(), system = rix.createDefaultSystemContext();
  const parse = source => rix.lower(rix.parse(rix.tokenize(source)));
  const run = (ir, bindings = {}, context = new rix.Context()) => {
    for (const [name, value] of Object.entries(bindings)) context.set(name, value);
    let result;
    for (const node of ir) result = rix.evaluate(node, context, registry, system);
    return result;
  };
  assert.ok(run(parse('1/3;')) instanceof core.Rational, 'Parser/evaluator and core must share a class identity');
  return { variant, core, rix, registry, system, parse, run, paths };
}
export function canonical(value) {
  if (value === null) return null;
  if (value?.type === 'sequence' || value?.type === 'tuple') return { type: value.type, values: value.values.map(canonical) };
  if (value?.isCertifiedApproximation) return { type: 'certified', enclosure: canonical(value.enclosure), text: value.toString() };
  if (value?.low && value?.high) return { type: value.constructor.name, low: canonical(value.low), high: canonical(value.high) };
  if (typeof value?.value === 'bigint') return { type: 'Integer', numerator: String(value.value), denominator: '1' };
  if (typeof value?.numerator === 'bigint') return { type: 'Rational', numerator: String(value.numerator), denominator: String(value.denominator) };
  if (value?.type === 'string') return { type: 'string', value: value.value };
  return String(value);
}
