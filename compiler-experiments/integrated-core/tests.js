import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { here } from './build.js';
const build = JSON.parse(await readFile(resolve(here, 'tmp/build.json'), 'utf8'));
await mkdir(resolve(here, 'results'), { recursive: true });
const results = [];
const run = async (name, cwd, args) => {
  const start = performance.now(); let output = '';
  const exitCode = await new Promise((done, reject) => {
    const child = spawn('bun', ['test', ...args], { cwd, env: process.env });
    child.stdout.on('data', data => { output += data; }); child.stderr.on('data', data => { output += data; });
    child.on('error', reject); child.on('close', done);
  });
  await writeFile(resolve(here, `results/${name}.txt`), output);
  const passed = Number(output.match(/(\d+) pass\b/)?.[1] || 0), failed = Number(output.match(/(\d+) fail\b/)?.[1] || 0);
  const result = { name, command: ['bun', 'test', ...args], exitCode, passed, failed, wallMs: performance.now() - start, log: `${name}.txt` };
  results.push(result); console.log(JSON.stringify(result)); console.log(output.split('\n').slice(-8).join('\n'));
};
for (const variant of ['baseline', 'candidate']) await run(`core-${variant}`, build.paths[variant].core, ['./tests']);
// Focus on numeric evaluator behavior, using the copied suites unmodified.
for (const variant of ['baseline', 'candidate', 'candidate-wired']) await run(`rix-${variant}`, build.paths[variant].rix, ['./tests/eval/numeric-regressions.test.js', './tests/eval/identity-comparison.test.js', './tests/eval/certified-approximations.test.js', './tests/eval/range-arithmetic.test.js', './tests/eval/performance-numeric-adapters.test.js', './tests/eval/real-arithmetic-interoperability.test.js']);
await writeFile(resolve(here, 'results/tests.json'), JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2) + '\n');
if (results.some(r => r.exitCode !== 0)) process.exitCode = 1;
