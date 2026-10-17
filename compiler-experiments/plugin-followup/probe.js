// Opportunity probe: public plugins still run their current RiX implementations.
import assert from 'node:assert/strict';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve,dirname } from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));
const root=process.env.RATMATH_ROOT||resolve(here,'../..');
const variant=process.argv.includes('--fast')?'experimental':'production';
let rixRoot=resolve(root,'rix'),coreRoot=resolve(root,'packages/core');
if(variant==='experimental') {
 const manifest=JSON.parse(await readFile(resolve(root,'compiler-experiments/integer-dispatch/tmp/build.json')));
 ({rix:rixRoot,core:coreRoot}=manifest.paths.comparisons);
}
const rix=await import(pathToFileURL(resolve(rixRoot,'src/index-node.js')));
const {Integer,Rational}=await import(pathToFileURL(resolve(coreRoot,'index.js')));
const options={context:new rix.Context(),registry:rix.createDefaultRegistry(),systemContext:rix.createDefaultSystemContext()};
const start=performance.now();
rix.parseAndEvaluate(`.Plugin.Load("poly"); .Plugin.Load("stats");
coeff := [${Array.from({length:20},(_,i)=>i+1).join(',')}];
P := .poly(coeff.Reverse());
F := .poly([${Array.from({length:8},(_,i)=>`${i+1}/${i+3}`).join(',')}]);
values := [${Array.from({length:64},(_,i)=>`${i+1}/7`).join(',')}];`,options);
const loadMs=performance.now()-start;
const asc=Array.from({length:20},(_,i)=>new Integer(i+1));
const descR=Array.from({length:8},(_,i)=>new Rational(i+1,i+3));
const desc=[...asc].reverse(); const canonicalDesc=desc.map(n=>new Rational(n));
const two=new Integer(2),twoR=new Rational(2),pointR=new Rational(7,5);
const values=Array.from({length:64},(_,i)=>new Rational(i+1,7));
function horner(c,x,zero){let a=zero;for(const value of c)a=a.multiply(x).add(value);return a;}
const fixtures=[
 {name:'poly internal Horner, degree 19 Integer',source:'PolyEvaluateAscending(coeff, 2);',js:()=>horner(desc,two,new Integer(0)),repetitions:20},
 {name:'poly public callable, degree 19 exact',source:'P(2);',js:()=>horner(canonicalDesc,twoR,new Rational(0)),repetitions:20},
 {name:'poly public callable, degree 7 Rational',source:'F(7/5);',js:()=>horner(descR,pointR,new Rational(0)),repetitions:20},
 {name:'stats public Mean, 64 Rationals',source:'.stats.Mean(values);',js:()=>{let sum=new Rational(0);for(const value of values)sum=sum.add(value);return sum.divide(new Rational(values.length));},repetitions:10},
];
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
const results=[];
for(const f of fixtures){
 const [ir]=rix.lower(rix.parse(f.source));
 const run=()=>rix.evaluate(ir,options.context,options.registry,options.systemContext);
 const expected=f.js().toString(); assert.equal(run().toString(),expected);
 const expectedClass=run().constructor.name; assert.equal(f.js().constructor.name,expectedClass);
 // Warm each path with the same batch structure used for timing.
 const measure=(fn,n)=>{const output=[];const t=performance.now();for(let i=0;i<n;i++)output.push(fn());const elapsed=performance.now()-t;for(const value of output){assert.equal(value.toString(),expected);assert.equal(value.constructor.name,expectedClass);}return elapsed/n;};
 for(let i=0;i<3;i++){measure(run,f.repetitions);measure(f.js,1000);}
 const samples={rix:[],js:[]};
 for(let i=0;i<9;i++)for(const path of i%2?['js','rix']:['rix','js'])samples[path].push(measure(path==='rix'?run:f.js,path==='rix'?f.repetitions:1000));
 const row={name:f.name,source:f.source,expected,expectedClass,repetitions:{rix:f.repetitions,js:1000},samplesMs:samples,rixMs:median(samples.rix),jsMs:median(samples.js)};
 row.opportunityRatio=row.rixMs/row.jsMs;results.push(row);console.log(JSON.stringify(row));
}
const fingerprints={};for(const f of ['src/rational.js','src/integer.js'])fingerprints[`core/${f}`]=createHash('sha256').update(await readFile(resolve(coreRoot,f))).digest('hex');
for(const f of ['plugins/poly/poly.plugin.rix','plugins/stats/stats.plugin.rix','src/runtime/cell.js','src/runtime/methods.js','src/eval/registry.js'])fingerprints[`rix/${f}`]=createHash('sha256').update(await readFile(resolve(rixRoot,f))).digest('hex');
await mkdir(resolve(here,'results'),{recursive:true});
await writeFile(resolve(here,`results/plugins-${variant}-${process.versions.bun?'bun':'node'}.json`),JSON.stringify({timestamp:new Date().toISOString(),variant,runtime:process.versions,loadMs,fingerprints,methodology:'3 warmup batches, 9 alternating measurement rounds; parsing/loading excluded; every value checked outside timer. Direct JS omits RiX dispatch/captures/budgets/metadata; opportunity ratio only.',results},null,2)+'\n');
