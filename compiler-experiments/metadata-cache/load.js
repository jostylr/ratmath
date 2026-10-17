import assert from 'node:assert/strict';
import { readFile,realpath } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
export const here=dirname(fileURLToPath(import.meta.url));
export const manifest=JSON.parse(await readFile(resolve(here,'tmp/build.json')));
export async function load(variant='cached') {
 const paths=manifest.paths[variant];assert.ok(paths,'Unknown variant');
 assert.equal(await realpath(createRequire(resolve(paths.rix,'package.json')).resolve('@ratmath/core')),resolve(paths.core,'index.js'));
 const core=await import(pathToFileURL(resolve(paths.core,'index.js')));
 const rix=await import(pathToFileURL(resolve(paths.rix,'src/index-node.js')));
 const cache=variant==='cached'?await import(pathToFileURL(resolve(paths.rix,'src/runtime/experimental-plugin-metadata.js'))):null;
 const makeSession=()=>({context:new rix.Context(),registry:rix.createDefaultRegistry(),systemContext:rix.createDefaultSystemContext()});
 const run=(source,session)=>rix.parseAndEvaluate(source,session);
 return {core,rix,cache,paths,makeSession,run};
}
