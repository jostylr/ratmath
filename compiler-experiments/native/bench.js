import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
import os from 'node:os';
import { defineKernel, compileJsCore, compileJsFused } from './plan.js';
import { compileNativeKernel } from './host.js';
import { makeJob, createJsRunner, createRixRunner, valueKey } from './jobs.js';

const here = dirname(fileURLToPath(import.meta.url));
const quick = process.argv.includes('--quick');
if (process.argv.slice(2).some((arg) => arg !== '--quick')) throw new Error('Only --quick is supported');
const runtime = process.versions.bun ? 'bun' : 'node';
const config = { rounds: quick ? 2 : 3, bits: 160, matrixSizes: quick ? [4, 12] : [4, 12, 32, 96], reductionSizes: quick ? [16, 256] : [16, 256, 4096, 65536] };
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const startedAt = new Date().toISOString(), results = [], builds = [];
// A new build directory makes the cold compilation cost measurable, without deleting prior caches.
const cacheDir = resolve(here, 'tmp', `bench-${randomUUID()}`);
await mkdir(resolve(here, 'generated'), { recursive: true });
for (const file of ['exact-matrix', 'fused-reduction']) {
  const spec = JSON.parse(await readFile(resolve(here, 'kernels', file + '.json'), 'utf8'));
  const plan = defineKernel(spec), kernel = await compileNativeKernel(plan, { cacheDir });
  const cache = await compileNativeKernel(plan, { cacheDir });
  assert.equal(cache.build.cached, true);
  builds.push({ name: file, cold: kernel.build, cachedPrepareMs: cache.build.prepareMs });
  const core = compileJsCore(plan), fused = compileJsFused(plan);
  await writeFile(resolve(here, 'generated', file + '.c'), kernel.source);
  await writeFile(resolve(here, 'generated', file + '-js.json'), JSON.stringify({ spec, ir: plan.node, core: core.source, fused: fused.source }, null, 2) + '\n');
  const sizes = file === 'exact-matrix' ? config.matrixSizes : config.reductionSizes;
  for (const size of sizes) {
    console.log(`${runtime}: ${file}, size ${size}`);
    const job = makeJob(plan, size, config.bits);
    const jsCore = createJsRunner(plan, job, core.run), jsFused = createJsRunner(plan, job, fused.run, true);
    const expected = jsCore().map(valueKey);
    const variants = [
      { name: 'JS RatMath direct', run: () => ({ values: jsCore() }) },
      { name: 'JS fused + denominator-aware sum', run: () => ({ values: jsFused() }) },
      { name: 'Native GMP whole job', run: () => kernel.run(job) },
    ];
    if ((file === 'exact-matrix' && size <= 12) || (file !== 'exact-matrix' && size <= 256)) {
      const interpreted = createRixRunner(plan, job);
      await writeFile(resolve(here, 'generated', file + '-reference.rix'), interpreted.source + '\n');
      variants.unshift({ name: 'RiX function + actual loop', run: () => ({ values: interpreted.run() }) });
    }
    for (const variant of variants) {
      assert.deepEqual((await variant.run()).values.map(valueKey), expected);
      variant.samples = [];
    }
    for (let round = 0; round < config.rounds; round++) {
      for (let offset = 0; offset < variants.length; offset++) {
        const variant = variants[(round + offset) % variants.length];
        const start = performance.now(), value = await variant.run(), wallMs = performance.now() - start;
        assert.deepEqual(value.values.map(valueKey), expected);
        variant.samples.push({ wallMs, metrics: value.metrics });
      }
    }
    const summaries = variants.map((v) => ({ name: v.name, samples: v.samples, medianWallMs: median(v.samples.map((s) => s.wallMs)),
      minWallMs: Math.min(...v.samples.map((s) => s.wallMs)), maxWallMs: Math.max(...v.samples.map((s) => s.wallMs)),
      medianNativeComputeMs: v.name.startsWith('Native') ? median(v.samples.map((s) => s.metrics.nativeComputeMs)) : undefined }));
    const fastestJs = Math.min(...summaries.filter((v) => v.name.startsWith('JS')).map((v) => v.medianWallMs));
    const native = summaries.find((v) => v.name.startsWith('Native'));
    const savedPerJobMs = fastestJs - native.medianWallMs;
    results.push({ kernel: file, size, bits: config.bits, outputs: expected.length,
      terms: file === 'exact-matrix' ? size ** 3 : size, nativeSpeedupVsBestJs: fastestJs / native.medianWallMs,
      coldCompileBreakEvenJobs: savedPerJobMs > 0 ? Math.ceil(kernel.build.prepareMs / savedPerJobMs) : null,
      referenceSha256: createHash('sha256').update(expected.join('\n')).digest('hex'), variants: summaries });
  }
}
const sourceFiles = ['plan.js', 'host.js', 'jobs.js', 'worker.c.in', 'verify.js', 'bench.js'];
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = createHash('sha256').update(await readFile(resolve(here, file))).digest('hex');
const report = { startedAt, completedAt: new Date().toISOString(), config,
  environment: { runtime, versions: process.versions, platform: process.platform, arch: process.arch, cpu: os.cpus()[0]?.model, osRelease: os.release() },
  sourceHashes, builds, results };
await mkdir(resolve(here, 'results'), { recursive: true });
const output = resolve(here, 'results', `native-${runtime}${quick ? '-quick' : ''}.json`);
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
const table = ['# Native kernel measurements', '', `${runtime} ${process.versions.bun || process.versions.node}; ${report.environment.cpu}; ${config.rounds} samples/variant. Native wall time includes process startup, input validation, encoding, transfer and RatMath result reconstruction. Build/input generation excluded.`, '',
  '| Kernel | Size | Variant | Median wall ms | Min–max ms | Native compute ms |', '|---|---:|---|---:|---:|---:|'];
for (const row of results) for (const variant of row.variants) table.push(`| ${row.kernel} | ${row.size} | ${variant.name} | ${variant.medianWallMs.toFixed(3)} | ${variant.minWallMs.toFixed(3)}–${variant.maxWallMs.toFixed(3)} | ${variant.medianNativeComputeMs?.toFixed(3) || '—'} |`);
await writeFile(output.replace('.json', '.md'), table.join('\n') + '\n');
console.log(`Saved ${output}; all outputs verified against JS RatMath, with RiX loop comparisons at smaller sizes.`);
