import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { compileBigInt } from './compiler.js';

const source = await readFile(new URL('../whole-scripts/scripts/modular-powers.rix', import.meta.url), 'utf8');
await mkdir(new URL('./generated/', import.meta.url), { recursive: true });
for (const peepholes of [false, true]) {
  const { moduleSource, sourceHash } = compileBigInt(source, { peepholes });
  const target = new URL(`./generated/modular-powers${peepholes ? '-peepholes' : ''}.js`, import.meta.url);
  await writeFile(target, moduleSource);
  console.log(`${target.pathname} (RiX SHA256 ${sourceHash})`);
}
