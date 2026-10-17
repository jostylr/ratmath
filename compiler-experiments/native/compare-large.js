import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { defineKernel, compileJsFused } from './plan.js';
import { makeJob, createJsRunner, valueKey } from './jobs.js';

const here = dirname(fileURLToPath(import.meta.url));
const path = process.argv[2] ? resolve(process.argv[2]) : resolve(here, 'results/demo-node.json');
const native = JSON.parse(await readFile(path, 'utf8'));
const plan = defineKernel(native.spec), fused = compileJsFused(plan);
createJsRunner(plan, makeJob(plan, 16, native.bits), fused.run, true)();
const job = makeJob(plan, native.size, native.bits);
console.log(`Checking all ${native.outputs} outputs with the fused JavaScript reference (${native.terms} terms).`);
const start = performance.now(), values = createJsRunner(plan, job, fused.run, true)(), wallMs = performance.now() - start;
const digest = createHash('sha256').update(values.map(valueKey).join('\n')).digest('hex');
assert.equal(values.length, native.outputs);
assert.equal(digest, native.outputSha256, 'Canonical exact output digest mismatch');
const report = { completedAt: new Date().toISOString(), versions: process.versions, size: native.size, bits: native.bits, terms: native.terms,
  outputs: values.length, jsFusedWallMs: wallMs, nativeWallMs: native.metrics.wallMs, nativeComputeMs: native.metrics.nativeComputeMs,
  nativeSpeedupVsJs: wallMs / native.metrics.wallMs, outputSha256: digest,
  validation: 'All canonical exact output strings matched the recorded native result by SHA-256. One large timing per backend, not a repeated benchmark.' };
await writeFile(path.replace('.json', '-js-comparison.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`All outputs match. Fused JS ${(wallMs / 1000).toFixed(3)} s versus native job ${(native.metrics.wallMs / 1000).toFixed(3)} s (${report.nativeSpeedupVsJs.toFixed(2)}×).`);
