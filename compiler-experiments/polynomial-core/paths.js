import { readFile } from 'node:fs/promises';
export async function paths(env) {
  const files = { horner: '../integrated-core/scripts/horner.rix', scalar: './scripts/scalar.rix',
    fused: './scripts/scalar-fused.rix', batch: './scripts/batch.rix', batchFused: './scripts/batch-fused.rix' };
  const source = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([k,p]) => [k, await readFile(new URL(p, import.meta.url), 'utf8')])));
  const ir = Object.fromEntries(Object.entries(source).map(([k,s]) => [k, env.parse(s)]));
  return { source, ir, variants: data => {
    const cs = data.coefficients.values, xs = data.points.values;
    return [
      { name: 'RiX Horner, fast core', run: () => env.run(ir.horner, data) },
      { name: 'JS Horner, same methods', run: () => env.sequence(xs.map(x => env.core.evaluatePolynomial(cs, x))) },
      { name: 'RiX combined per point', run: () => env.run(ir.scalar, data) },
      { name: 'RiX fused per point', run: () => env.run(ir.fused, data) },
      { name: 'RiX combined batch', run: () => env.run(ir.batch, data) },
      { name: 'RiX fused batch', run: () => env.run(ir.batchFused, data) },
      { name: 'JS fused batch', run: () => env.sequence(env.core.evaluatePolynomialBatch(cs, xs, { fused: true })) },
    ];
  } };
}
