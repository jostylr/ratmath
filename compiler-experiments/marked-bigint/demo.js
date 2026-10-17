import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createMarkedSession } from './runner.js';
import { makePowerFixture } from '../whole-scripts/workloads.js';
import { powerBatch } from '../whole-scripts/optimized.js';

const session = createMarkedSession(), runtime = process.versions.bun ? 'bun' : 'node';
const algorithm = runtime === 'bun' ? 'window' : 'montgomery';
const source = await readFile(new URL(`./scripts/${algorithm}.rix`, import.meta.url), 'utf8');
const fixture = makePowerFixture({ count: 4, bits: 512, exponentBits: 256 });
const bindings = { bases: { type: 'sequence', values: fixture.integers }, exponent: fixture.exponentInteger, modulus: fixture.modulusInteger };
const program = session.load(source), expected = powerBatch(fixture.bases, fixture.exponent, fixture.modulus, 'binary');
for (const name of ['first use', 'cached use']) {
  const start = performance.now(), result = program.run({ bindings }), elapsed = performance.now() - start;
  assert.deepEqual(result.values.map(x => x.value), expected);
  console.log(`${algorithm}: ${name} ${elapsed.toFixed(3)} ms; builds=${session.stats.builds}, hits=${session.stats.cacheHits}`);
}
const fallback = session.load('## @bigint\nSquare(x)->x*x;Square(3/2);').run();
assert.equal(fallback.toString(), '9/4');
console.log(`Rational input: ${fallback}; interpretation fallback=${session.stats.fallbacks}`);
await mkdir(new URL('./generated/', import.meta.url), { recursive: true });
await writeFile(new URL(`./generated/${algorithm}-kernel.js`, import.meta.url), `export const run = (() => {\n${session.inspectCache().find(x => x.status === 'compiled').moduleSource}})();\n`);
console.log(JSON.stringify(session.stats, null, 2));
