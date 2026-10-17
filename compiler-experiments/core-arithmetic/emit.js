import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { root } from '../runtime.js';
export async function emitSnapshots() {
  const original = await readFile(resolve(root, 'packages/core/src/rational.js'), 'utf8');
  const baseline = original.replace('"./base-system.js"', '"../support.js"').replace('"./bigint.js"', '"../support.js"');
  let candidate = baseline;
  const helpers = `
  // Experiment-only private constructor. Every caller proves coprimality.
  static #fromReduced(n, d) {
    if (n === 0n) d = 1n;
    if (d < 0n) { n = -n; d = -d; }
    const value = new Rational(0n, 1n);
    value.#numerator = n;
    value.#denominator = d;
    value.#isNegative = n < 0n;
    return value;
  }
  #arithmeticFast(op, other) {
    const [n, d] = reduced(op, this.#numerator, this.#denominator,
      other.constructor.name === 'Integer' ? other.value : other.numerator,
      other.constructor.name === 'Integer' ? 1n : other.denominator);
    return Rational.#fromReduced(n, d);
  }
`;
  candidate = "import { reduced } from '../reduced.js';\n" + candidate.replace('  #normalize() {', helpers + '\n  #normalize() {');
  for (const op of ['add', 'subtract', 'multiply', 'divide']) {
    const anchor = `  ${op}(other) {`;
    const start = candidate.indexOf(anchor), end = candidate.indexOf('\n  /**', start + anchor.length);
    if (start < 0 || end < 0) throw new Error(`Snapshot patch failed: ${op}`);
    const old = candidate.slice(start, end);
    // Preserve the original fallback branches for intervals/certified values.
    const inserted = `${anchor}\n    if (other instanceof Rational || other?.constructor?.name === 'Integer') return this.#arithmeticFast('${op}', other);`;
    candidate = candidate.slice(0, start) + old.replace(anchor, inserted) + candidate.slice(end);
  }
  const folder = new URL('./generated/', import.meta.url);
  await mkdir(folder, { recursive: true });
  await writeFile(new URL('baseline-rational.js', folder), baseline);
  await writeFile(new URL('candidate-rational.js', folder), candidate);
  const hash = s => createHash('sha256').update(s).digest('hex');
  const metadata = { source: 'packages/core/src/rational.js', originalHash: hash(original), baselineHash: hash(baseline), candidateHash: hash(candidate),
    changes: ['Imports redirected to experiment support', 'Candidate overrides four arithmetic methods for Integer/Rational pairs', 'Private fromReduced factory allocates a zero Rational and sets proven canonical fields; lazy caches start empty'],
    warning: 'Snapshot classes are distinct from production Rational. These are prototypes for changes inside core, not drop-in objects for the current core API.' };
  await writeFile(new URL('snapshot.json', folder), JSON.stringify(metadata, null, 2) + '\n');
  return metadata;
}
if (process.argv[1]?.endsWith('/emit.js')) console.log(await emitSnapshots());
