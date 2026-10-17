import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { compileBigInt } from './compiler.js';

export async function emitModules() {
  const outputs = {};
  await mkdir(new URL('./generated/', import.meta.url), { recursive: true });
  for (const name of ['window', 'montgomery']) {
    const source = await readFile(new URL(`./scripts/${name}.rix`, import.meta.url), 'utf8');
    const start = performance.now(), compiled = compileBigInt(source, { requireOddModulus: name === 'montgomery' });
    const compileMs = performance.now() - start;
    const target = new URL(`./generated/${name}.js`, import.meta.url);
    await writeFile(target, compiled.moduleSource);
    const importStart = performance.now(), module = await import(target.href + `?hash=${compiled.sourceHash}`);
    outputs[name] = { source, ...compiled, module, compileMs, importMs: performance.now() - importStart };
  }
  return outputs;
}

if (process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url) {
  const modules = await emitModules();
  for (const [name, result] of Object.entries(modules)) console.log(`${name}: ${result.sourceHash}; ${result.compileMs.toFixed(3)} ms compilation including parsing`);
}
