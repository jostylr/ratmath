import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Rational } from '../runtime.js';
import { loadNativeFile } from './source.js';
import { defineKernel, compileJsFused } from './plan.js';
import { createJsRunner, makeJob, valueKey } from './jobs.js';

const fixture = new URL('./examples/marked-functions.rix', import.meta.url);
const cold = process.argv.includes('--cold');
const compileOptions = cold ? { cacheDir: fileURLToPath(new URL(`./tmp/source-demo-${randomUUID()}/`, import.meta.url)) } : {};
const loadStart = performance.now();
const { Product, Transform } = await loadNativeFile(fixture, compileOptions);
const loadMs = performance.now() - loadStart;
const scalarStart = performance.now();
const product = await Product(new Rational(1n, 3n), new Rational(7n, 5n));
const scalarMs = performance.now() - scalarStart;
const transformed = await Transform(new Rational(1n, 3n));
assert.equal(valueKey(product), '7/15');
assert.equal(valueKey(transformed), '8/5');

// Compile the intensive loop explicitly, then measure only execution.
const matrixBuild = await Product.prepare('matrix-reduce');
const plan = defineKernel({ name: 'source-demo-reference', execution: 'native', numeric: 'exact-rational', pattern: 'matrix-reduce', expression: 'x*y' });
const job = makeJob(plan, 96, 160);
const js = createJsRunner(plan, job, compileJsFused(plan).run, true);
const expected = js();
const keys = expected.map(valueKey);
const digest = createHash('sha256').update(keys.join('\n')).digest('hex');
let beats = 0;
const timer = setInterval(() => beats++, 20);
try {
  assert.deepEqual((await Product.matrixReduce(job)).values.map(valueKey), keys);
  const native = [], javascript = [];
  for (let sample = 0; sample < 3; sample++) {
    const runNative = async () => {
      const result = await Product.matrixReduce(job);
      assert.deepEqual(result.values.map(valueKey), keys);
      native.push(result.metrics);
    };
    const runJs = () => {
      const started = performance.now();
      const values = js();
      const wallMs = performance.now() - started;
      assert.deepEqual(values.map(valueKey), keys);
      javascript.push(wallMs);
    };
    if (sample % 2) { runJs(); await runNative(); }
    else { await runNative(); runJs(); }
  }
  const median = (values) => [...values].sort((a, b) => a - b)[1];
  const files = ['source.js', 'source-demo.js', 'plan.js', 'host.js', 'jobs.js', 'worker.c.in', 'examples/marked-functions.rix'];
  const sourceHashes = Object.fromEntries(await Promise.all(files.map(async (file) => [file, createHash('sha256').update(await readFile(new URL(file, import.meta.url))).digest('hex')])));
  const report = {
    timestamp: new Date().toISOString(), runtime: process.versions.bun ? `Bun ${process.versions.bun}` : `Node ${process.versions.node}`,
    platform: process.platform, arch: process.arch, freshArtifactCache: cold, loadMs, scalarMs,
    scalarResults: { Product: valueKey(product), Transform: valueKey(transformed) },
    builds: { map: Product.native.build, matrixReduce: matrixBuild },
    job: { rows: job.rows, inner: job.inner, cols: job.cols, numeratorBits: 160, terms: 96 ** 3, outputs: keys.length },
    methodology: 'Deterministic fixture; precompiled variants; one warm execution each; three alternating-order samples; exact comparison of all outputs after each sample. Native wall includes encoding, subprocess, GMP, transfer and decoding. JS uses fused expression and LCM accumulator. Compilation and output validation excluded from samples. One process per runtime.',
    nativeSamples: native, jsSamplesMs: javascript, nativeMedianMs: median(native.map((m) => m.wallMs)), jsMedianMs: median(javascript),
    speedup: median(javascript) / median(native.map((m) => m.wallMs)), exactResultDigest: digest, hostTimerHeartbeats: beats, sourceHashes,
  };
  const runtime = process.versions.bun ? 'bun' : 'node';
  await mkdir(new URL('./results/', import.meta.url), { recursive: true });
  await writeFile(new URL(`./results/source-demo-${runtime}.json`, import.meta.url), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ runtime: report.runtime, scalarResults: report.scalarResults, matrix: report.job, nativeMedianMs: report.nativeMedianMs,
    jsMedianMs: report.jsMedianMs, speedup: report.speedup, exactResultDigest: digest, hostTimerHeartbeats: beats }, null, 2));
} finally { clearInterval(timer); }
