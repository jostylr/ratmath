import assert from 'node:assert/strict';
import { readFile,realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { here } from './build.js';
export { canonical } from '../integrated-core/load.js';
export async function load(variant='base') {
  const manifest=JSON.parse(await readFile(resolve(here,'tmp/build.json'),'utf8')),paths=manifest.paths[variant];
  assert.ok(paths,`Unknown variant ${variant}`);
  assert.equal(await realpath(createRequire(resolve(paths.rix,'package.json')).resolve('@ratmath/core')),resolve(paths.core,'index.js'));
  const core=await import(pathToFileURL(resolve(paths.core,'index.js')).href),rix=await import(pathToFileURL(resolve(paths.rix,'src/index.js')).href);
  const registry=rix.createDefaultRegistry(),system=rix.createDefaultSystemContext();
  const parse=source=>rix.lower(rix.parse(rix.tokenize(source)));
  const run=(ir,bindings={},context=new rix.Context())=>{
    for(const [name,value] of Object.entries(bindings)) context.set(name,value);
    let result;for(const node of ir) result=rix.evaluate(node,context,registry,system);return result;
  };
  const sequence=items=>{const s=registry.get('ARRAY').impl([],new rix.Context(),v=>v);s.values.push(...items);return s;};
  assert.ok(run(parse('1/3;')) instanceof core.Rational);
  return {variant,core,rix,registry,system,parse,run,sequence,paths};
}
