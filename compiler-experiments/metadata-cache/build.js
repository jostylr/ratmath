import assert from 'node:assert/strict';
import { cp,readFile,writeFile,readdir,rm,mkdir,symlink } from 'node:fs/promises';
import { resolve,dirname,relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
export const here=dirname(fileURLToPath(import.meta.url));
export const root=process.env.RATMATH_ROOT||resolve(here,'../..');
export async function inventory(dir,base=dir) {
 const output={};
 for(const e of await readdir(dir,{withFileTypes:true})) {
  if(e.name==='.DS_Store')continue;
  const p=resolve(dir,e.name);
  if(e.isDirectory())Object.assign(output,await inventory(p,base));
  else if(e.isFile())output[relative(base,p)]=createHash('sha256').update(await readFile(p)).digest('hex');
 }
 return output;
}
const original={core:await inventory(resolve(root,'packages/core/src')),rix:await inventory(resolve(root,'rix/src')),plugins:await inventory(resolve(root,'rix/plugins'))};
const paths={};
for(const variant of ['baseline','cached']) {
 const env=resolve(here,'tmp',variant),core=resolve(env,'packages/core'),rix=resolve(env,'rix');
 await rm(env,{recursive:true,force:true}); await mkdir(core,{recursive:true});await mkdir(rix,{recursive:true});
 for(const f of ['src','tests','index.js','index.d.ts','package.json'])await cp(resolve(root,'packages/core',f),resolve(core,f),{recursive:true});
 for(const f of ['src','tests','plugins','examples','bin','package.json'])await cp(resolve(root,'rix',f),resolve(rix,f),{recursive:true});
 await mkdir(resolve(env,'node_modules/@ratmath'),{recursive:true});await symlink('../../packages/core',resolve(env,'node_modules/@ratmath/core'));
 for(const e of await readdir(resolve(root,'node_modules'),{withFileTypes:true}))if(!['@ratmath','.bin'].includes(e.name))await symlink(resolve(root,'node_modules',e.name),resolve(env,'node_modules',e.name));
 // Production now uses the promoted cache. Reconstruct only the uncached
 // catalog call in each isolated control before applying the historical
 // experimental helper. Keep every other current production source unchanged.
 const catalogPath=resolve(rix,'src/runtime/plugin-catalog.js');
 let catalogSource=await readFile(catalogPath,'utf8');
 const promotedImport='import { cachedPluginOperatorDefinitions } from "./plugin-operator-cache.js";\n';
 if(catalogSource.includes(promotedImport)) {
  catalogSource=catalogSource.replace(promotedImport,'');
  const importAnchor='import {\n    mergeOperatorDefinitions,';
  assert.ok(catalogSource.includes(importAnchor),'Promoted cache import changed');
  catalogSource=catalogSource.replace(importAnchor,'import {\n    extractOperatorDeclarationsFromSource,\n    mergeOperatorDefinitions,');
  const call=`cachedPluginOperatorDefinitions(source, {
                label: sourcePath,
                owner: { pluginId: metadata.id, mount: metadata.mount || null },
            })`;
  assert.equal(catalogSource.split(call).length,2,'Promoted cache call changed');
  catalogSource=catalogSource.replace(call,`Array.from(extractOperatorDeclarationsFromSource(source, {
                label: sourcePath,
                owner: { pluginId: metadata.id, mount: metadata.mount || null },
            }).values())`);
  await writeFile(catalogPath,catalogSource);
 }
 if(variant==='cached') {
  const path=resolve(rix,'src/runtime/plugin-catalog.js');let source=await readFile(path,'utf8');
  const anchor=`Array.from(extractOperatorDeclarationsFromSource(source, {
                label: sourcePath,
                owner: { pluginId: metadata.id, mount: metadata.mount || null },
            }).values())`;
  assert.equal(source.split(anchor).length,2,'Plugin cache insertion anchor changed');
  source=`import { cachedPluginOperatorDefinitions } from "./experimental-plugin-metadata.js";\n`+source.replace(anchor,`cachedPluginOperatorDefinitions(source, {
                label: sourcePath,
                owner: { pluginId: metadata.id, mount: metadata.mount || null },
            })`);
  await writeFile(path,source);await cp(resolve(here,'cache-template.js'),resolve(rix,'src/runtime/experimental-plugin-metadata.js'));
 }
 paths[variant]={env,core,rix,coreSource:await inventory(resolve(core,'src')),rixSource:await inventory(resolve(rix,'src'))};
 assert.deepEqual(paths[variant].coreSource,original.core);
}
for(const [group,path] of [['core','packages/core/src'],['rix','rix/src'],['plugins','rix/plugins']])assert.deepEqual(await inventory(resolve(root,path)),original[group],'Production changed during build');
await mkdir(resolve(here,'results'),{recursive:true});
const report={timestamp:new Date().toISOString(),sourceRoot:root,original,paths};
await writeFile(resolve(here,'tmp/build.json'),JSON.stringify(report,null,2)+'\n');
await writeFile(resolve(here,'results/build-provenance.json'),JSON.stringify(report,null,2)+'\n');
console.log('Built isolated baseline/cached environments; production unchanged.');
