import { readFile, writeFile, mkdir, access, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const hash = (value) => createHash('sha256').update(value).digest('hex');
const require = createRequire(import.meta.url);

export async function buildAddon({ cacheDir = resolve(here, 'tmp'), compiler = process.env.CC || 'clang' } = {}) {
  const started = performance.now();
  const [node, clang, gmp, cflags, libs] = await Promise.all([
    execute('node', ['-p', 'process.execPath']), execute(compiler, ['--version']), execute('pkg-config', ['--modversion', 'gmp']),
    execute('pkg-config', ['--cflags', 'gmp']), execute('pkg-config', ['--libs', 'gmp']),
  ]);
  const include = process.env.NODE_INCLUDE || resolve(dirname(node.stdout.trim()), '../include/node');
  await access(resolve(include, 'node_api.h'));
  const source = await readFile(resolve(here, 'addon.c'));
  const headers = await Promise.all(['node_api.h', 'js_native_api.h', 'node_api_types.h', 'js_native_api_types.h'].map(async (name) => [name, hash(await readFile(resolve(include, name)))]));
  const flags = ['-O3', '-std=c11', '-Wall', '-Wextra', '-Werror', '-shared', '-fPIC', `-I${include}`,
    ...(process.platform === 'darwin' ? ['-undefined', 'dynamic_lookup'] : []),
    ...cflags.stdout.trim().split(/\s+/).filter(Boolean)];
  const linkFlags = libs.stdout.trim().split(/\s+/).filter(Boolean);
  const environment = { compiler, compilerVersion: clang.stdout.trim(), gmpVersion: gmp.stdout.trim(), nodeHeaders: Object.fromEntries(headers), flags, linkFlags, platform: process.platform, arch: process.arch };
  const key = hash(Buffer.concat([source, Buffer.from(JSON.stringify(environment))]));
  const dir = resolve(cacheDir, key), binary = resolve(dir, 'whole-scripts.node');
  await mkdir(dir, { recursive: true });
  let cached = false;
  try {
    const metadata = JSON.parse(await readFile(resolve(dir, 'build.json'), 'utf8'));
    cached = metadata.key === key && metadata.binaryHash === hash(await readFile(binary));
  } catch { /* Build a missing/invalid artifact below. */ }
  if (!cached) {
    const temporary = resolve(dir, `${randomUUID()}.node`);
    await execute(compiler, [...flags, resolve(here, 'addon.c'), ...linkFlags, '-o', temporary], { timeout: 30_000, maxBuffer: 1024 * 1024 });
    await rename(temporary, binary);
    await writeFile(resolve(dir, 'build.json'), JSON.stringify({ key, binaryHash: hash(await readFile(binary)), environment }, null, 2) + '\n');
  }
  const addon = require(binary);
  return { addon, build: { key, cached, prepareMs: performance.now() - started, binary, binaryHash: hash(await readFile(binary)), sourceHash: hash(source), environment } };
}
