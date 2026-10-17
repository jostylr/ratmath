import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createExactSession} from './engine.js';
const e=await createExactSession(),{Integer,Rational}=e.core;
const scripts=await readFile(new URL('./scripts/kernels.rix',import.meta.url),'utf8');
const start=performance.now();
e.run(`.Plugin.Load("poly"); .Plugin.Load("stats");
${scripts}
Horner(coefficients,x) -> {@ r=0-0,i=1;
 i<=coefficients.Len(); r:=r*x+coefficients.Get(i),i+=1; ;r};
cs := [${Array.from({length:20},(_,i)=>`${i+1}/${i%5+1}`).join(',')}];
point := 7/5;
points := [${Array.from({length:32},(_,i)=>`${i-16}/7`).join(',')}];
P := .poly(cs);
values := [${Array.from({length:128},(_,i)=>`${(i*17)%101-50}/7`).join(',')}];
step := (a,c,x)->a*x+c;
`);
const setupMs=performance.now()-start;
const cs=e.context.get('cs').values,point=e.context.get('point'),points=e.context.get('points').values,values=e.context.get('values').values;
function horner(cs,x){let a=new Integer(0);for(const c of cs)a=a.multiply(x).add(c);return a;}
function mean(xs){let a=new Rational(0);for(const x of xs)a=a.add(x);return a.divide(new Integer(xs.length));}
function moments(xs){const average=mean(xs);let sum=new Rational(0);for(const x of xs){const delta=x.subtract(average);sum=sum.add(delta.pow(2));}return {type:'map',entries:new Map([['count',new Integer(xs.length)],['mean',average],['variance',sum.divide(new Integer(xs.length))]])};}
const fixtures=[
 {name:'Horner scalar, 20 Rational coefficients',paths:{'RiX loop':'Horner(cs,point);','compiled RiX fold':'HornerKernel(cs,point);'},direct:()=>horner(cs,point),repetitions:20},
 {name:'Polynomial public Evaluate, 32 points',paths:{'RiX plugin':'points.Map((x)->P.Evaluate(x));','explicit batch':'PolynomialSamples(P,points);'},direct:()=>e.array(points.map(x=>horner(cs,x))),repetitions:2},
 {name:'Statistics Mean, 128 Rationals',paths:{'RiX plugin':'.stats.Mean(values);','explicit mean':'MeanKernel(values);'},direct:()=>mean(values),repetitions:10},
 {name:'Statistics mean and population variance, 128 Rationals',paths:{'RiX plugin':'{= count=values.Len(),mean=.stats.Mean(values),variance=.stats.Variance(values)};','explicit moments':'MomentsKernel(values);'},direct:()=>moments(values),repetitions:5},
];
const canonical=v=>v?.type==='sequence'?v.values.map(canonical):v?.type==='map'?Object.fromEntries([...v.entries].map(([k,x])=>[k,canonical(x)])):{type:v.constructor.name,value:v.toString()};
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
const results=[];
for(const f of fixtures){
 const paths=Object.entries(f.paths).map(([name,source])=>({name,source,run:(()=>{const ir=e.parse(source);return()=>e.evaluate(ir);})()}));
 paths.push({name:'handwritten JS, core methods',run:f.direct});
 const expected=canonical(f.direct());
 for(const p of paths)assert.deepEqual(canonical(p.run()),expected);
 const first={};for(const p of paths){const t=performance.now(),value=p.run();first[p.name]=performance.now()-t;assert.deepEqual(canonical(value),expected);}
 function measure(p,n){const output=[];const t=performance.now();for(let i=0;i<n;i++)output.push(p.run());const elapsed=performance.now()-t;for(const value of output)assert.deepEqual(canonical(value),expected);return elapsed/n;}
 const samples=Object.fromEntries(paths.map(p=>[p.name,[]]));
 for(let w=0;w<3;w++)for(const p of paths)measure(p,p===paths.at(-1)?100:f.repetitions);
 for(let round=0;round<9;round++)for(let j=0;j<paths.length;j++){const p=paths[(round+j)%paths.length];samples[p.name].push(measure(p,p===paths.at(-1)?100:f.repetitions));}
 const medians=Object.fromEntries(paths.map(p=>[p.name,median(samples[p.name])]));
 const row={name:f.name,source:f.paths,dimensions:{coefficients:cs.length,points:points.length,values:values.length},firstCallAfterValidationMs:first,samplesMs:samples,medianMs:medians,expectedDigest:createHash('sha256').update(JSON.stringify(expected)).digest('hex'),speedup:medians[paths[0].name]/medians[paths[1].name]};
 results.push(row);console.log(JSON.stringify({name:row.name,medianMs:medians,speedup:row.speedup}));
}
const compilation=e.inspect();
await writeFile(new URL(`./results/generated-${process.versions.bun?'bun':'node'}.json`,import.meta.url),JSON.stringify(compilation,null,2)+'\n');
await writeFile(new URL(`./results/loops-${process.versions.bun?'bun':'node'}.json`,import.meta.url),JSON.stringify({timestamp:new Date().toISOString(),runtime:process.versions,setupMs,methodology:'3 warmups, 9 rotating-order rounds; same production arithmetic in every path; every exact value and class checked outside timers; full snapshot and guards included for compiled/batch paths; loading and parsing excluded; direct JS is an unguarded reference.',stats:e.stats,results},null,2)+'\n');
