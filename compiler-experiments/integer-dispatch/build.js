import {cp,readFile,writeFile,readdir,rm,mkdir} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
export const here=dirname(fileURLToPath(import.meta.url));
export const variants=['base','methods','dispatch','both','comparisons'];
const sha=x=>createHash('sha256').update(x).digest('hex');
const clean=x=>Object.fromEntries(Object.entries(x).filter(([p])=>!p.split('/').includes('.DS_Store')));
async function inventory(folder,base=folder){
 const entries=[];for(const e of await readdir(folder,{withFileTypes:true})){
  if(e.name==='.DS_Store')continue;const p=resolve(folder,e.name);
  if(e.isDirectory())entries.push(...Object.entries(await inventory(p,base)));else if(e.isFile())entries.push([relative(base,p),sha(await readFile(p))]);
 }return Object.fromEntries(entries);
}
function replace(s,a,b){assert.ok(s.includes(a),`Missing patch anchor: ${a.slice(0,70)}`);return s.replace(a,b);}
export async function build(){
 const base=JSON.parse(await readFile(resolve(here,'../interpreter-overhead/tmp/build.json'),'utf8')),source=base.paths.literals;
 for(const [g,p]of [['core','packages/core/src'],['rix','rix/src'],['coreTests','packages/core/tests'],['plugins','rix/plugins'],['cliExamples','rix/examples/plugins']])
  assert.deepEqual(await inventory(resolve(base.sourceRoot,p)),clean(base.original[g]),`Production changed: ${g}; rebuild preceding experiments`);
 assert.deepEqual(await inventory(resolve(source.core,'src')),source.coreSource);assert.deepEqual(await inventory(resolve(source.rix,'src')),source.rixSource);
 const paths={};
 for(const variant of variants){
  const env=resolve(here,'tmp',variant);await rm(env,{recursive:true,force:true});await mkdir(dirname(env),{recursive:true});
  await cp(resolve(source.core,'../..'),env,{recursive:true,verbatimSymlinks:true});
  const core=resolve(env,'packages/core'),rix=resolve(env,'rix');
  if(['methods','both','comparisons'].includes(variant)){
   const p=resolve(rix,'src/runtime/methods.js');let s=await readFile(p,'utf8');
   s=replace(s,'export function resolveMethod(target, name, context = null) {',await readFile(resolve(here,'method-keys.txt'),'utf8')+'export function resolveMethod(target, name, context = null) {');
   s=replace(s,'const candidates = [...new Set([name, upperName, `__${name}`, `_${name}`, `__${upperName}`, `_${upperName}`])];','const candidates = experimentalMethodCandidates(name, upperName);');
   await writeFile(p,s);
  }
  if(['dispatch','both','comparisons'].includes(variant)){
   const p=resolve(rix,'src/eval/registry.js');let s=await readFile(p,'utf8');
   s=replace(s,'    _invokeSystemMultifunction(name, args, context, evaluate) {','    _invokeSystemMultifunction(name, args, context, evaluate, valueOnly = false) {');
   s=replace(s,'            return {\n                value: nativeFallback.impl(args, context, evaluate),','            const value = nativeFallback.impl(args, context, evaluate);\n            if (valueOnly) return value;\n            return {\n                value,');
   const start=s.indexOf('        const prioritized = candidates.filter('),end=s.indexOf('        if (!selected) return',start);assert.ok(start>0&&end>start);
   s=s.slice(0,start)+await readFile(resolve(here,'priority.txt'),'utf8')+'\n'+s.slice(end);
   s=replace(s,'        if (!selected) return { value: null, args, variant: null };','        if (!selected) return valueOnly ? null : { value: null, args, variant: null };');
   s=replace(s,'        return {\n            value: variant.impl(prepared.args, context, evaluate),','        const value = variant.impl(prepared.args, context, evaluate);\n        if (valueOnly) return value;\n        return {\n            value,');
   s=replace(s,'        if (valueOnly) return value;\n        return {\n            value,\n            args: prepared.args,',`        // Keep the second args read after impl, even without an envelope:
        // custom prepare results may expose an observable args getter.
        const resultArgs = prepared.args;
        if (valueOnly) return value;
        return {
            value,
            args: resultArgs,`);
   s=replace(s,'        return this._invokeSystemMultifunction(name, args, context, evaluate).value;',`        // Retain the old wrapper contract if a host overrides this hook.
        if (this._invokeSystemMultifunction !== experimentalOriginalInvoke) {
            return this._invokeSystemMultifunction(name, args, context, evaluate).value;
        }
        return this._invokeSystemMultifunction(name, args, context, evaluate, true);`);
   s+='\nconst experimentalOriginalInvoke = Registry.prototype._invokeSystemMultifunction;\n';
   await writeFile(p,s);
  }
  if(variant==='comparisons'){
   const p=resolve(rix,'src/eval/functions/comparison.js');let s=await readFile(p,'utf8');
   s=replace(s,'function relationDecision(a, b, operation) {',`const experimentalToRational = Integer.prototype.toRational;
const experimentalIntegerValueGetter = Object.getOwnPropertyDescriptor(Integer.prototype, 'value').get;
function relationDecision(a, b, operation) {
    // Runs INSIDE the existing comparison implementation, after registry
    // selection. Every custom variant/override still has its original chance.
    if (Object.getPrototypeOf(a ?? {}) === Integer.prototype && Object.getPrototypeOf(b ?? {}) === Integer.prototype &&
        !Object.hasOwn(a, 'value') && !Object.hasOwn(b, 'value') &&
        !Object.hasOwn(a, 'toRational') && !Object.hasOwn(b, 'toRational') &&
        Integer.prototype.toRational === experimentalToRational &&
        Object.getOwnPropertyDescriptor(Integer.prototype, 'value')?.get === experimentalIntegerValueGetter) {
        const x = a.value, y = b.value;
        switch (operation) {
        case 'eq': return x === y; case 'neq': return x !== y;
        case 'lt': return x < y; case 'gt': return x > y;
        case 'lte': return x <= y; case 'gte': return x >= y;
        }
    }`);
   await writeFile(p,s);
  }
  paths[variant]={core,rix,coreSource:await inventory(resolve(core,'src')),rixSource:await inventory(resolve(rix,'src'))};
 }
 for(const v of variants)assert.deepEqual(paths[v].coreSource,source.coreSource,'Core must remain byte-identical');
 const changes={base:'Prior copy/literal fixes, unchanged dispatch',methods:'Bounded cache of method-name spellings only; all resolution layers remain live',dispatch:'Value-only internal calls avoid result envelopes; no-priority selection avoids an array; all variant probes retained',both:'Method and dispatch changes',comparisons:'Both changes plus guarded plain-Integer comparison inside the existing fallback'};
 await writeFile(resolve(here,'tmp/build.json'),JSON.stringify({sourceRoot:base.sourceRoot,original:base.original,paths,changes},null,2)+'\n');
 await mkdir(resolve(here,'results'),{recursive:true});
 await writeFile(resolve(here,'results/build-provenance.json'),JSON.stringify({original:base.original,changes,variants:Object.fromEntries(Object.entries(paths).map(([v,p])=>[v,{coreSource:p.coreSource,rixSource:p.rixSource}]))},null,2)+'\n');
 console.log('Built five isolated interpreter variants, all with byte-identical fast core.');
}
if(process.argv[1]===fileURLToPath(import.meta.url))await build();
