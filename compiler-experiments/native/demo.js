import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { defineKernel } from './plan.js';
import { compileNativeKernel } from './host.js';
import { makeJob, valueKey } from './jobs.js';
import { checkMatrixProjections } from './projection.js';

const here = dirname(fileURLToPath(import.meta.url));
let size = 256, bits = 256;
for (let i = 2; i < process.argv.length; i += 2) {
  const flag = process.argv[i], value = Number(process.argv[i + 1]);
  if (!Number.isSafeInteger(value) || !['--size', '--bits'].includes(flag)) throw new Error('Usage: demo.js [--size N] [--bits N]');
  if (flag === '--size') size = value; else bits = value;
}
if (size < 1 || size > 368) throw new RangeError('Demo size 1..368 (50 million term budget)');
const spec = JSON.parse(await readFile(resolve(here, 'kernels/exact-matrix.json'), 'utf8'));
const plan = defineKernel(spec);
console.log(`Preparing ${size}×${size} matrices with ${bits}-bit numerators; ${(size ** 3).toLocaleString()} exact multiply/add terms.`);
const prepareStart = performance.now(), kernel = await compileNativeKernel(plan);
const job = makeJob(plan, size, bits), inputGenerationAndPrepareMs = performance.now() - prepareStart;
let heartbeats = 0;
const heartbeat = setInterval(() => { heartbeats++; console.log(`JavaScript host remains responsive (heartbeat ${heartbeats} while the native job runs).`); }, 1000);
const controller = new AbortController();
const interrupt = () => controller.abort();
process.once('SIGINT', interrupt);
let result;
try { result = await kernel.run(job, { timeoutMs: 120_000, signal: controller.signal }); }
finally { clearInterval(heartbeat); process.removeListener('SIGINT', interrupt); }
const projectionStart = performance.now(), projections = checkMatrixProjections(job, result.values);
const projectionMs = performance.now() - projectionStart;
const report = {
  completedAt: new Date().toISOString(), environment: { versions: process.versions, cpu: os.cpus()[0]?.model, platform: process.platform, arch: process.arch }, spec, size, bits, terms: size ** 3, outputs: result.values.length,
  build: kernel.build, inputGenerationAndPrepareMs, metrics: result.metrics, hostHeartbeats: heartbeats,
  verification: { method: 'two deterministic modular matrix projections (diagnostic checks, not full exact comparison)', projections, projectionMs },
  outputSha256: createHash('sha256').update(result.values.map(valueKey).join('\n')).digest('hex'),
  firstOutput: valueKey(result.values[0]), lastOutput: valueKey(result.values.at(-1)),
};
const runtime = process.versions.bun ? 'bun' : 'node';
await mkdir(resolve(here, 'results'), { recursive: true });
await writeFile(resolve(here, 'results', `demo-${runtime}.json`), JSON.stringify(report, null, 2) + '\n');
console.log(`Native compute ${(result.metrics.nativeComputeMs / 1000).toFixed(3)} s; whole job ${(result.metrics.wallMs / 1000).toFixed(3)} s; ${report.outputs} exact Rational outputs. Both modular checks passed.`);
console.log('JavaScript owns the job, inputs and result objects. The compiled native process performs the entire cubic computation.');
