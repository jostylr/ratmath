import { cp,readFile,writeFile,mkdir,readdir,rm } from 'node:fs/promises';
import { dirname,resolve,relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
export const here=dirname(fileURLToPath(import.meta.url));
export const variants=['control','copy','literals'];
const sha=x=>createHash('sha256').update(x).digest('hex');
const clean=x=>Object.fromEntries(Object.entries(x).filter(([p])=>!p.split('/').includes('.DS_Store')));
async function inventory(folder,base=folder) {
  const entries=[];
  for(const item of await readdir(folder,{withFileTypes:true})) {
    if(item.name==='.DS_Store') continue;
    const p=resolve(folder,item.name);
    if(item.isDirectory()) entries.push(...Object.entries(await inventory(p,base)));
    else if(item.isFile()) entries.push([relative(base,p),sha(await readFile(p))]);
  }
  return Object.fromEntries(entries);
}
function replace(source,from,to) {
  assert.ok(source.includes(from),`Patch anchor missing: ${from.slice(0,90)}`);
  return source.replace(from,to);
}
async function instrument(env) {
  await cp(resolve(here,'probes.js'),resolve(env,'experiment-probes.js'));
  const patch=async(p,edits)=>{
    let s=await readFile(resolve(env,p),'utf8');
    for(const [a,b] of edits) s=replace(s,a,a+'\n'+b);
    const probePath=relative(dirname(resolve(env,p)),resolve(env,'experiment-probes.js'));
    await writeFile(resolve(env,p),`import * as __probe from '${probePath}';\n`+s);
  };
  await patch('packages/core/src/rational.js',[
    ['  constructor(numerator, denominator = 1n) {',"    __probe.inc('core.Rational.constructor');"],
    ['  #normalize() {',"    __probe.inc('core.Rational.normalize');"],
    ['  #gcd(a, b) {',"    __probe.inc('core.Rational.gcd');"]]);
  await patch('packages/core/src/experimental-reduced.js',[["export function gcd(a, b) {","  __probe.inc('core.reduced.gcd');"]]);
  await patch('packages/core/src/number-parser.js',[["export function parseNumber(input) {","  __probe.inc('core.parseNumber');"]]);
  await patch('rix/src/runtime/cell.js',[
    ['export function shallowCopyValue(value) {',"    __probe.copy('shallow',value);"],
    ['export function deepCopyValue(value, memo = new WeakMap()) {',"    __probe.copy('deep',value);"]]);
  await patch('rix/src/eval/evaluator.js',[
    ['export function evaluate(irNode, context, registry, systemContext) {',"    __probe.inc('evaluate.'+(irNode?.fn||'value'));" ]]);
  await patch('rix/src/eval/registry.js',[
    ['    _prepareVariant(variant, args, context, evaluate) {',"        __probe.inc('variant.prep');"],
    ['    _invokeSystemMultifunction(name, args, context, evaluate) {',"        __probe.inc('dispatch.'+name);"]]);
  await patch('rix/src/runtime/methods.js',[
    ['export function resolveMethod(target, name, context = null) {',"    __probe.inc('method.'+name);"]]);
  await patch('rix/src/eval/functions/core.js',[
    ['function parseLiteral(str) {',"    __probe.inc('literal.parse');"]]);
}
export async function build() {
  const base=JSON.parse(await readFile(resolve(here,'../polynomial-core/tmp/build.json'),'utf8'));
  for(const [group,dir] of [['core','packages/core/src'],['rix','rix/src'],['plugins','rix/plugins'],['coreTests','packages/core/tests']])
    assert.deepEqual(await inventory(resolve(base.sourceRoot,dir)),clean(base.original[group]),`Rebuild earlier core experiments: ${group} changed`);
  assert.deepEqual(await inventory(resolve(base.core,'src')),base.coreSource,'Polynomial core copy changed');
  assert.deepEqual(await inventory(resolve(base.rix,'src')),base.rixSource,'Polynomial RiX copy changed');
  const paths={};
  for(const variant of [...variants,'counts-control','counts-literals']) {
    const mode=variant.replace('counts-',''),env=resolve(here,'tmp',variant);
    await rm(env,{recursive:true,force:true});await mkdir(dirname(env),{recursive:true});
    await cp(dirname(dirname(base.core)),env,{recursive:true,verbatimSymlinks:true});
    const core=resolve(env,'packages/core'),rix=resolve(env,'rix');
    // The CLI's built-in installers import this example even during `rix test`.
    await cp(resolve(base.sourceRoot,'rix/examples/plugins'),resolve(rix,'examples/plugins'),{recursive:true});
    if(mode!=='control') {
      const p=resolve(rix,'src/runtime/cell.js');let s=await readFile(p,'utf8');
      // Both shallow/deep scalar and interval-endpoint copies preserve freshness.
      s=s.replaceAll('new Rational(value.numerator, value.denominator)','experimentalCopyRational(value)')
        .replaceAll('new Rational(value.start.numerator, value.start.denominator)','experimentalCopyRational(value.start)')
        .replaceAll('new Rational(value.end.numerator, value.end.denominator)','experimentalCopyRational(value.end)');
      s=replace(s,'export function shallowCopyValue(value) {',await readFile(resolve(here,'copy-helper.txt'),'utf8')+'export function shallowCopyValue(value) {');
      await writeFile(p,s);
    }
    if(mode==='literals') {
      const p=resolve(rix,'src/eval/functions/core.js');let s=await readFile(p,'utf8');
      s=replace(s,'    if (typeof str !== "string") return str;',`    if (typeof str !== "string") return str;
    // Decimal digits need no general parser. Always allocate a fresh Integer.
    if (/^[0-9]+$/.test(str)) return new Integer(BigInt(str));`);
      await writeFile(p,s);
    }
    if(variant.startsWith('counts-')) await instrument(env);
    paths[variant]={core,rix,coreSource:await inventory(resolve(core,'src')),rixSource:await inventory(resolve(rix,'src'))};
  }
  for(const v of variants)assert.deepEqual(paths[v].coreSource,paths.control.coreSource,'Every timed variant must use identical core code');
  const original={...base.original,cliExamples:await inventory(resolve(base.sourceRoot,'rix/examples/plugins'))};
  const report={sourceRoot:base.sourceRoot,original,paths,changes:{control:'Unchanged interpreter, same polynomial/fast core',copy:'Fresh canonical Rational copy constructor, guarded; no core changes',literals:'Copy fix + direct decimal-digit Integer literal parsing; fresh values',counts:'Separate instrumented copies; excluded from performance measurements'}};
  await writeFile(resolve(here,'tmp/build.json'),JSON.stringify(report,null,2)+'\n');
  await mkdir(resolve(here,'results'),{recursive:true});
  await writeFile(resolve(here,'results/build-provenance.json'),JSON.stringify({original,changes:report.changes,variants:Object.fromEntries(Object.entries(paths).map(([v,p])=>[v,{coreSource:p.coreSource,rixSource:p.rixSource}]))},null,2)+'\n');
  console.log('Built three uninstrumented interpreter variants plus two count-only diagnostic copies. Production code unchanged.');
}
if(process.argv[1]===fileURLToPath(import.meta.url)) await build();
