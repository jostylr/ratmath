import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createExactSession} from './engine.js';
const e=await createExactSession(),{Integer,Rational}=e.core;
const canonical=value=>value?.type==='sequence'?value.values.map(canonical):value?.type==='map'?Object.fromEntries([...value.entries].map(([k,v])=>[k,canonical(v)])):{type:value.constructor.name,value:value.toString()};
let checks=0;
const check=fn=>{fn();checks++;};
const equal=(a,b)=>check(()=>assert.deepEqual(canonical(a),canonical(b)));
e.run('values := [1,2,3]; step := (a,b)->a+b;');
equal(e.run('.exactLoop.Fold(values,0,step);'),e.run('values.Reduce(step,0);'));
const builds=e.stats.compiles;e.run('.exactLoop.Fold(values,0,step);');check(()=>assert.equal(e.stats.compiles,builds));check(()=>assert.ok(e.stats.cacheHits>0));
equal(e.run('.exactLoop.Fold([],2/3,(a,b)->a+b);'),new Rational(2,3));
for(let n=0;n<32;n++) {
 const count=n%8+1,cs=Array.from({length:count},(_,j)=>`${((n+3)*(j+7))%17-8}/${j%5+2}`).join(',');
 e.run(`cs := [${cs}]; point := ${(n%9)-4}/5;`);
 equal(e.run('.exactLoop.Fold(cs,0,(a,c,x)->a*x+c,[point]);'),e.run('cs.Reduce((a,c)->a*@point+c,0);'));
 equal(e.run('.exactLoop.PolynomialBatch(cs,[point]);').values[0],e.run('cs.Reduce((a,c)->a*@point+c,0);'));
}
check(()=>assert.throws(()=>e.run('.exactLoop.Fold(cs,0,(a,c)->a*point+c);'),/capture/));
let effects=0;e.systemContext.registerHost('tick',{impl:([a,b])=>{effects++;return a.add(b);}});
e.run('effectful := (a,b)->.tick(a,b);');
check(()=>assert.throws(()=>e.run('.exactLoop.Fold(values,0,effectful);'),/unsupported/));check(()=>assert.equal(effects,0));
equal(e.run('.exactLoop.TryFold(values,0,effectful);'),new Integer(6));check(()=>assert.equal(effects,3));
const before=e.stats.interpretedFolds;
e.registry.override('ADD',([a,b])=>new Integer(a.value+b.value+1n));
equal(e.run('.exactLoop.TryFold(values,0,step);'),new Integer(9));check(()=>assert.equal(e.stats.interpretedFolds,before+1));
// Explicit Fold still declares core arithmetic, even with a custom RiX ADD.
equal(e.run('.exactLoop.Fold(values,0,step);'),new Integer(6));e.registry.restore('ADD');
equal(e.run('.exactLoop.TryFold(values,0,step);'),new Integer(6));
let probes=0;
e.registry.installVariant('ADD',{name:'Offset',priority:50,prep:args=>{probes++;return args.every(x=>x instanceof Integer);},impl:([a,b])=>new Integer(a.value+b.value+2n)});
equal(e.run('.exactLoop.TryFold(values,0,step);'),new Integer(12));check(()=>assert.equal(probes,3));
e.registry.get('ADD').variants.splice(e.registry.get('ADD').variants.findIndex(v=>v.name==='Offset'),1);
let methodEffects=0;const methodValue=new Integer(-2);
methodValue._ext=new Map([['ABS',{type:'method_builtin',name:'Abs',impl:()=>{methodEffects++;return new Integer(7);}}]]);
e.context.set('methodvalues',e.array([methodValue]));
check(()=>assert.throws(()=>e.run('.exactLoop.Fold(methodValues,0,(a,b)->a+b.Abs());'),/plain exact/));check(()=>assert.equal(methodEffects,0));
equal(e.run('.exactLoop.TryFold(methodValues,0,(a,b)->a+b.Abs());'),new Integer(7));check(()=>assert.equal(methodEffects,1));
const body=e.context.get('step').body;body.fn='SUB';
equal(e.run('.exactLoop.Fold(values,0,step);'),new Integer(-6));body.fn='ADD';
// Metadata and subclasses decline the strict numeric specialization.
const decorated=new Integer(2);decorated._ext=new Map();e.context.set('decorated',e.array([decorated]));
check(()=>assert.throws(()=>e.run('.exactLoop.Fold(decorated,0,step);'),/plain exact/));
equal(e.run('.exactLoop.TryFold(decorated,0,step);'),new Integer(2));
class Derived extends Integer{}e.context.set('derived',e.array([new Derived(2)]));
check(()=>assert.throws(()=>e.run('.exactLoop.Fold(derived,0,step);'),/plain exact/));
let accesses=0;const accessor=e.array([]);Object.defineProperty(accessor.values,'0',{get(){accesses++;return new Integer(1);},configurable:true});
e.context.set('accessor',accessor);check(()=>assert.throws(()=>e.run('.exactLoop.Fold(accessor,0,step);'),/data elements/));check(()=>assert.equal(accesses,0));
// Active evaluation budgets cannot silently disappear inside a native loop.
e.context.setEnv('__evaluation_budget__',{maxSteps:10000,maxTimeMs:null,deadline:null,signal:null,steps:0});
check(()=>assert.throws(()=>e.kernel.fold(e.context.get('values'),new Integer(0),e.context.get('step'),null,e.context),/budget/));
const budgetFallback=e.stats.interpretedFolds;e.run('.exactLoop.TryFold(values,0,step);');check(()=>assert.equal(e.stats.interpretedFolds,budgetFallback+1));
e.context.env.delete('__evaluation_budget__');
e.context.setEnv('__trace_context__',{active:true});check(()=>assert.throws(()=>e.kernel.fold(e.context.get('values'),new Integer(0),e.context.get('step'),null,e.context),/tracing/));e.context.env.delete('__trace_context__');
const proto=Object.getOwnPropertyDescriptor(Integer.prototype,'add');Integer.prototype.add=function(other){return proto.value.call(this,other);};
try{check(()=>assert.throws(()=>e.run('.exactLoop.Fold(values,0,step);'),/prototype changed/));}finally{Object.defineProperty(Integer.prototype,'add',proto);}
const limited=await createExactSession({maxElements:4,maxBits:8,maxWork:8,maxCacheEntries:1});
check(()=>assert.throws(()=>limited.run('.exactLoop.Fold([1,2,3,4,5],0,(a,b)->a+b);'),/element budget/));
check(()=>assert.throws(()=>limited.run('.exactLoop.Fold([1,2,3,4],0,(a,b)->a+b*2+1);'),/operation budget/));
check(()=>assert.throws(()=>limited.run('.exactLoop.TryFold([4,4],4,(a,b)->a*a+b);'),/bit budget/));check(()=>assert.equal(limited.stats.interpretedFolds,0));
check(()=>assert.throws(()=>limited.run('.exactLoop.TryFold([0],1,(a,b)->a/b);'),/zero/i));check(()=>assert.equal(limited.stats.interpretedFolds,0));
limited.run('.exactLoop.Fold([1],0,(a,b)->a+b);');limited.run('.exactLoop.Fold([1],0,(a,b)->a-b);');check(()=>assert.ok(limited.stats.evictions>0));
check(()=>assert.throws(()=>e.run('.exactLoop.TryFold(values,0,step,1);'),/Array/));
// Mutable arrays are resnapshotted, never kept in the compilation cache.
e.run('mutable := [1,2];');equal(e.run('.exactLoop.Fold(mutable,0,step);'),new Integer(3));e.context.get('mutable').values.push(new Integer(3));equal(e.run('.exactLoop.Fold(mutable,0,step);'),new Integer(6));
e.run('.Plugin.Load("poly"); .Plugin.Load("stats"); offset := 1; P := {#x# x^2+offset}.P(); points := [0,1,2];');
equal(e.run('.exactLoop.PolynomialBatch(.exactLoop.Snapshot(P.Coefficients()),points);'),e.run('points.Map((x)->P.Evaluate(x));'));
const canonicalTypes=e.run('.exactLoop.PolynomialBatch(.exactLoop.Snapshot(P.Coefficients()),points);').values.map(v=>v.constructor.name);
const liveTypes=e.run('points.Map((x)->P(x));').values.map(v=>v.constructor.name);
check(()=>assert.notDeepEqual(canonicalTypes,liveTypes));
check(()=>assert.deepEqual(e.run('.exactLoop.PolynomialBatch(.exactLoop.Snapshot(P.Coefficients()),points);').values.map(v=>v.toString()),e.run('points.Map((x)->P(x));').values.map(v=>v.toString())));
e.run('offset ~= 7;');equal(e.run('.exactLoop.PolynomialBatch(.exactLoop.Snapshot(P.Coefficients()),points);'),e.run('points.Map((x)->P.Evaluate(x));'));
for(const values of ['[1,2,3]','[1/3,-2/5,7/11]','[5]']) {
 e.run(`data := ${values};`);
 equal(e.run('.exactLoop.Mean(data);'),e.run('.stats.Mean(data);'));
 equal(e.run('.exactLoop.Moments(data);'),e.run('{= count=data.Len(),mean=.stats.Mean(data),variance=.stats.Variance(data)};'));
}
check(()=>assert.throws(()=>e.run('.exactLoop.Mean([]);'),/at least one/i));
check(()=>assert.throws(()=>e.run('.exactLoop.Fold([1],0,(a,b)->a+[b]);'),/unsupported/));
const report={timestamp:new Date().toISOString(),runtime:process.versions,checks,stats:e.stats,passed:true};
await writeFile(new URL(`./results/verification-${process.versions.bun?'bun':'node'}.json`,import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({checks,stats:e.stats,passed:true}));
