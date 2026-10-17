import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createManagedKernel } from './managed.js';
import { makePowerFixture } from '../whole-scripts/workloads.js';
import { powerBatch } from '../whole-scripts/optimized.js';

const name = process.argv.includes('--window') || process.versions.bun ? 'window' : 'montgomery';
const source = await readFile(new URL(`./scripts/${name}.rix`, import.meta.url), 'utf8');
const kernel = createManagedKernel(source, { requireOddModulus: name === 'montgomery' });
const input = makePowerFixture({ count: 4, bits: 512, exponentBits: 256 });
for (const phase of ['first call (compile/import)', 'second call (cached)']) {
  const start = performance.now(), result = await kernel.run(input), ms = performance.now() - start;
  assert.deepEqual(result.values.map((n) => n.value), powerBatch(input.bases, input.exponent, input.modulus, 'binary'));
  console.log(`${phase}: ${ms.toFixed(3)} ms; ${result.values.length} exact Integer results`);
}
console.log(`${name} source; ${kernel.stats.builds} compile; ${kernel.stats.calls} calls through ordinary RiX .compiledPowers(...)`);
