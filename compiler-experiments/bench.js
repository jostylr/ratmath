import { writeFileSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { root } from './runtime.js';
import { buildWorkloads } from './workloads.js';

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--quick') continue;
  if (args[i] === '--output' && args[i + 1]) { i++; continue; }
  throw new Error(`Unknown/missing argument: ${args[i]}`);
}
const quick = args.includes('--quick');
const runtime = process.versions.bun ? 'bun' : 'node';
const here = dirname(fileURLToPath(import.meta.url));
const outputIndex = args.indexOf('--output');
const output = outputIndex >= 0 ? resolve(args[outputIndex + 1]) : resolve(here, `results/latest-${runtime}.json`);
const config = { count: quick ? 32 : 256, rounds: quick ? 3 : 9, warmupMs: quick ? 10 : 50, targetSampleMs: quick ? 5 : 20, maxRepetitions: 262144 };
let sink;
function timed(variant, repetitions) {
  let result;
  const start = performance.now();
  for (let i = 0; i < repetitions; i++) {
    result = variant.run();
    // Consume every batch; retain an input-dependent output from each iteration.
    sink = result[i % result.length];
  }
  return { elapsed: performance.now() - start, result };
}
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const git = (path, ...args) => {
  try { return execFileSync('git', ['-C', path, ...args], { encoding: 'utf8' }).trim(); }
  catch { return 'unavailable'; }
};
function sourceHash() {
  const hash = createHash('sha256');
  let files = 0;
  function visit(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && /\.(js|rix)$/.test(entry.name)) {
        hash.update(relative(root, path)); hash.update('\0'); hash.update(readFileSync(path)); hash.update('\0'); files++;
      }
    }
  }
  for (const dir of ['rix/src', 'rix/plugins', 'packages/core/src']) visit(resolve(root, dir));
  return { sha256: hash.digest('hex'), files, paths: ['rix/src', 'rix/plugins', 'packages/core/src'], extensions: ['.js', '.rix'] };
}
const startedAt = new Date().toISOString();
const workloads = buildWorkloads(config.count);
const results = [];
for (const workload of workloads) {
  console.log(`Running ${workload.name} (${workload.variants.length} variants)`);
  for (const variant of workload.variants) {
    workload.verify(variant, variant.run());
    const warmStart = performance.now();
    do { variant.run(); } while (performance.now() - warmStart < config.warmupMs);
    let repetitions = 1, elapsed = 0;
    do {
      const sample = timed(variant, repetitions);
      elapsed = sample.elapsed;
      workload.verify(variant, sample.result);
      if (elapsed >= config.targetSampleMs || repetitions >= config.maxRepetitions) break;
      repetitions *= 2;
    } while (true);
    variant.repetitions = repetitions;
    variant.samples = [];
  }
  for (let round = 0; round < config.rounds; round++) {
    // Rotate order per round; setup, parsing, verification and I/O are outside timing.
    for (let offset = 0; offset < workload.variants.length; offset++) {
      const variant = workload.variants[(round + offset) % workload.variants.length];
      const sample = timed(variant, variant.repetitions);
      variant.samples.push(sample.elapsed / variant.repetitions);
      workload.verify(variant, sample.result);
    }
  }
  const baseline = median(workload.variants[0].samples);
  results.push({ workload: workload.name, source: workload.source, kind: workload.kind, setup: workload.setup,
    variants: workload.variants.map((variant) => ({ name: variant.name, domain: variant.domain, repetitions: variant.repetitions,
      samplesMsPerBatch: variant.samples, medianMsPerBatch: median(variant.samples), minMsPerBatch: Math.min(...variant.samples),
      maxMsPerBatch: Math.max(...variant.samples), speedupVsInterpreter: baseline / median(variant.samples) })) });
}
const report = {
  schemaVersion: 1, startedAt, completedAt: new Date().toISOString(), config,
  environment: { runtime, versions: process.versions, platform: process.platform, arch: process.arch,
    osRelease: os.release(), cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length,
    command: [process.execPath, ...process.argv.slice(1)], root },
  provenance: { rootHead: git(root, 'rev-parse', 'HEAD'), rootStatus: git(root, 'status', '--short'),
    rixHead: git(resolve(root, 'rix'), 'rev-parse', 'HEAD'), rixStatus: git(resolve(root, 'rix'), 'status', '--short'),
    coreHead: git(resolve(root, 'packages/core'), 'rev-parse', 'HEAD'), coreStatus: git(resolve(root, 'packages/core'), 'status', '--short'),
    sourceHash: sourceHash(), experimentHash: Object.fromEntries(['runtime.js', 'compile.js', 'wasm.js', 'workloads.js', 'bench.js', 'verify.js'].map((name) =>
      [name, createHash('sha256').update(readFileSync(resolve(here, name))).digest('hex')])),
    currentCompiler: 'Removed by user; runtime translation is a recreated experiment, not previous compiler output.' },
  results,
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
const table = ['# Benchmark results', '', `Runtime: ${runtime} ${process.versions.bun || process.versions.node}; ${report.environment.cpu}; ${config.count} values/batch; ${config.rounds} samples.`, '',
  '| Workload | Variant | Median ms/batch | Min–max | Speedup vs IR |', '|---|---|---:|---:|---:|'];
for (const row of results) for (const variant of row.variants) table.push(`| ${row.workload} | ${variant.name} | ${variant.medianMsPerBatch.toFixed(4)} | ${variant.minMsPerBatch.toFixed(4)}–${variant.maxMsPerBatch.toFixed(4)} | ${variant.speedupVsInterpreter.toFixed(2)}× |`);
writeFileSync(output.replace(/\.json$/, '') + '.md', table.join('\n') + '\n');
mkdirSync(resolve(here, 'generated'), { recursive: true });
writeFileSync(resolve(here, 'generated/snapshot.json'), JSON.stringify(workloads.map((w) => ({ workload: w.name, source: w.source, ir: w.node, generated: w.generated })), null, 2) + '\n');
console.log(`Saved ${output}; all sampled results verified. Observable sink type: ${typeof sink}`);
