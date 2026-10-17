import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import { Rational, Integer } from '../runtime.js';
import { emitGmp } from './plan.js';

const execute = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const byteLimit = 64 * 1024 * 1024;

export function validateJob(plan, job) {
  if (!job || !Array.isArray(job.left) || !Array.isArray(job.right)) throw new TypeError('left/right must be arrays');
  const { rows, inner, cols } = job;
  if (![rows, inner, cols].every((n) => Number.isSafeInteger(n) && n > 0)) throw new RangeError('Positive integer dimensions required');
  if (plan.spec.pattern === 'matrix-reduce') {
    if ([rows, inner, cols].some((n) => n > 512) || rows * inner * cols > 50_000_000) throw new RangeError('Matrix exceeds job budget');
    if (job.left.length !== rows * inner || job.right.length !== inner * cols) throw new RangeError('Matrix input length mismatch');
  } else if (rows > 2_000_000 || inner !== 1 || cols !== 1 || job.left.length !== rows || job.right.length !== rows) {
    throw new RangeError('Pair shape/input mismatch');
  }
  for (const value of [...job.left, ...job.right]) {
    if (!(value instanceof Rational) && !(value instanceof Integer)) throw new TypeError('Exact RatMath Rational/Integer inputs required');
  }
  return plan.spec.pattern === 'matrix-reduce' ? rows * cols : plan.spec.pattern === 'map' ? rows : 1;
}

export async function compileNativeKernel(plan, { cacheDir = resolve(here, 'tmp'), compiler = process.env.CC || 'clang' } = {}) {
  const started = performance.now();
  const [clang, gmp, cflags, libs] = await Promise.all([
    execute(compiler, ['--version']), execute('pkg-config', ['--modversion', 'gmp']),
    execute('pkg-config', ['--cflags', 'gmp']), execute('pkg-config', ['--libs', 'gmp']),
  ]);
  const generated = emitGmp(plan), template = await readFile(resolve(here, 'worker.c.in'), 'utf8');
  const source = template.replaceAll('@MATRIX@', plan.spec.pattern === 'matrix-reduce' ? '1' : '0')
    .replaceAll('@MAP@', plan.spec.pattern === 'map' ? '1' : '0')
    .replaceAll('@INIT@', generated.init).replaceAll('@BODY@', generated.body).replaceAll('@CLEAR@', generated.clear);
  const flags = ['-O3', '-std=c11', '-Wall', '-Wextra', '-Werror', ...cflags.stdout.trim().split(/\s+/).filter(Boolean)];
  const linkFlags = libs.stdout.trim().split(/\s+/).filter(Boolean);
  const environment = { compiler, compilerVersion: clang.stdout.trim(), gmpVersion: gmp.stdout.trim(), flags, linkFlags, platform: process.platform, arch: process.arch };
  const key = sha(source + JSON.stringify(environment));
  const dir = resolve(cacheDir, key), binary = resolve(dir, 'kernel'), cfile = resolve(dir, 'kernel.c');
  await mkdir(dir, { recursive: true });
  let cached = false;
  try {
    const metadata = JSON.parse(await readFile(resolve(dir, 'build.json'), 'utf8'));
    cached = metadata.key === key && metadata.binaryHash === sha(await readFile(binary));
  } catch { /* A missing/invalid build is compiled below. */ }
  if (!cached) {
    await writeFile(cfile, source);
    const temporary = resolve(dir, `kernel-${randomUUID()}`);
    try {
      await execute(compiler, [...flags, cfile, ...linkFlags, '-o', temporary], { timeout: 30_000, maxBuffer: 1024 * 1024 });
      await rename(temporary, binary);
      await writeFile(resolve(dir, 'build.json'), JSON.stringify({ key, binaryHash: sha(await readFile(binary)), environment }, null, 2));
    } catch (error) { throw new Error(`Native compilation failed: ${error.stderr || error.message}`, { cause: error }); }
  }
  const build = { key, cached, prepareMs: performance.now() - started, sourceHash: sha(source), environment, binary };
  return { plan, source, build, async run(job, { timeoutMs = 120_000, signal } = {}) {
    const wallStart = performance.now();
    const expectedCount = validateJob(plan, job);
    const validateMs = performance.now() - wallStart;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) throw new RangeError('Positive timeout required');
    if (signal?.aborted) throw new Error('Native job aborted');
    const serializeStart = performance.now();
    const encode = (value) => value instanceof Integer ? `${value.value}/1` : `${value.numerator}/${value.denominator}`;
    const input = `RIXNATIVE1\n${job.rows} ${job.inner} ${job.cols}\n` + job.left.map(encode).join('\n') + '\n' + job.right.map(encode).join('\n') + '\n';
    if (Buffer.byteLength(input) > byteLimit) throw new RangeError('Input exceeds 64 MiB transfer budget');
    const serializeMs = performance.now() - serializeStart;
    const transferStart = performance.now();
    const stdout = await new Promise((accept, reject) => {
      const child = spawn(binary, [], { stdio: ['pipe', 'pipe', 'pipe'] });
      const chunks = [], errors = [];
      let outputBytes = 0, failure = null;
      const stop = (message) => { failure ||= new Error(message); child.kill('SIGKILL'); };
      const timer = setTimeout(() => stop(`Native job timed out after ${timeoutMs} ms`), timeoutMs);
      const abort = () => stop('Native job aborted');
      signal?.addEventListener('abort', abort, { once: true });
      child.stdout.on('data', (chunk) => { outputBytes += chunk.length; if (outputBytes > byteLimit) stop('Output exceeds 64 MiB transfer budget'); else chunks.push(chunk); });
      child.stderr.on('data', (chunk) => { if (errors.reduce((n, b) => n + b.length, 0) < 65536) errors.push(chunk); });
      child.stdin.on('error', (error) => { if (error.code !== 'EPIPE') failure ||= error; });
      child.once('error', (error) => { failure ||= error; });
      child.once('close', (code, terminationSignal) => {
        clearTimeout(timer); signal?.removeEventListener('abort', abort);
        if (failure) reject(failure);
        else if (code !== 0) reject(new Error(`Native kernel failed (${code ?? terminationSignal}): ${Buffer.concat(errors).toString().trim()}`));
        else accept(Buffer.concat(chunks).toString());
      });
      child.stdin.end(input);
    });
    const transferMs = performance.now() - transferStart;
    const parseStart = performance.now(), lines = stdout.trimEnd().split('\n');
    const match = /^RIXRESULT1 (\d+) (\d+) (\d+) (\d+)$/.exec(lines.shift());
    if (!match || Number(match[1]) !== expectedCount || lines.length !== expectedCount) throw new Error('Invalid native result header/count');
    const values = lines.map((line) => {
      if (!/^-?\d+(?:\/[1-9]\d*)?$/.test(line)) throw new Error('Invalid native fraction');
      const [n, d = '1'] = line.split('/');
      return new Rational(BigInt(n), BigInt(d));
    });
    const deserializeMs = performance.now() - parseStart;
    return { values, metrics: { wallMs: performance.now() - wallStart, validateMs, serializeMs, transferMs, deserializeMs,
      nativeParseMs: Number(match[2]) / 1e6, nativeComputeMs: Number(match[3]) / 1e6, nativeFormatMs: Number(match[4]) / 1e6, inputBytes: Buffer.byteLength(input), outputBytes: Buffer.byteLength(stdout) } };
  }};
}
