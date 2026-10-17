import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {load,canonical} from './load.js';
import {variants} from './build.js';
import {fixtures,prepare} from './fixtures.js';
let comparisons=0;
for(const f of await fixtures()){
 let expected;
 for(const v of variants){const env=await load(v),value=canonical(prepare(env,f)());if(expected===undefined)expected=value;else assert.deepEqual(value,expected,`${v}/${f.name}`);comparisons++;}
}
const snapshots=[];
for(const v of variants){
 const env=await load(v),{Integer,Rational}=env.core,ctx=new env.rix.Context();
 const {resolveMethod,getBuiltinProto}=await import(pathToFileURL(resolve(env.paths.rix,'src/runtime/methods.js')).href);
 const invoke=(target,name)=>{const fn=resolveMethod(target,name,ctx);return fn.impl([target],ctx,x=>x);};
 const method=(value)=>({type:'method_builtin',name:'Len',impl:()=>new Integer(BigInt(value))});
 const values=env.sequence([new Integer(1n),new Integer(2n)]);
 assert.equal(invoke(values,'Len').value,2n); // warm the name cache
 values._ext.set('Len',method(9));assert.equal(invoke(values,'Len').value,9n);
 values._ext.set('LEN',method(8));assert.equal(invoke(values,'Len').value,9n,'original spelling has precedence');
 values._ext.delete('Len');assert.equal(invoke(values,'Len').value,8n);
 values._ext.delete('LEN');values._ext.set('__LEN',method(7));assert.equal(invoke(values,'Len').value,7n);
 values._ext.delete('__LEN');assert.equal(invoke(values,'Len').value,2n);
 const proto=getBuiltinProto(values),old=proto.entries.get('LEN');
 try{proto.entries.set('LEN',method(6));assert.equal(invoke(values,'Len').value,6n);}finally{if(old===undefined)proto.entries.delete('LEN');else proto.entries.set('LEN',old);}
 values._ext.set('_proto',null);assert.throws(()=>invoke(values,'Len'),/Method not found/);values._ext.delete('_proto');
 values._ext.set('__proto',{type:'map',entries:new Map([['traits',{type:'map',entries:new Map([['LEN',method(5)]])}]])});
 values._ext.get('__proto').entries.set('type',{type:'map',entries:new Map([['LEN',method(4)]])});
 assert.equal(invoke(values,'Len').value,5n,'traits precede type proto');
 values._ext.get('__proto').entries.delete('traits');assert.equal(invoke(values,'Len').value,4n,'live type proto change');values._ext.delete('__proto');
 const sys=env.rix.createDefaultSystemContext({frozen:false});ctx.setEnv('__system_context__',sys);
 sys.registerMethod('Array','Len',method(4));assert.equal(invoke(values,'Len').value,4n);
 sys._methodExtensions.get('array').get('LEN').callable=method(3);assert.equal(invoke(values,'Len').value,3n,'live extension mutation');
 sys._methodExtensions.get('array').delete('LEN');assert.equal(invoke(values,'Len').value,2n);
 for(let i=0;i<300;i++){values._ext.set(`METHOD${i}`,method(i));assert.equal(invoke(values,`METHOD${i}`).value,BigInt(i));}
 assert.equal(invoke(values,'Len').value,2n,'bounded name-cache eviction');
 // Non-string coercion must retain the original number and order of calls.
 const nameEvents=[],name={toString(){nameEvents.push('coerce');return 'Len';}};
 assert.equal(invoke(values,name).value,2n);
 const registry=env.registry,events=[];
 const args=[new Integer(1n),new Integer(2n)],evaluate=x=>x;
 registry.override('ADD',()=>new Integer(77n));assert.equal(registry.call('ADD',args,ctx,evaluate).value,77n);registry.restore('ADD');
 assert.equal(registry.call('ADD',args,ctx,evaluate).value,3n);
 registry.installVariant('ADD',{name:'ProbeA',priority:11,prep(){events.push('A');return true;},impl:()=>new Integer(51n)});
 registry.installVariant('ADD',{name:'ProbeB',priority:12,prepare(a){events.push('B');return {args:[new Integer(7n),...a.slice(1)]};},impl:([a])=>a});
 assert.equal(registry.call('ADD',args,ctx,evaluate).value,7n);assert.deepEqual(events,['A','B'],'all probes run in order');
 const trace={active:true,log:[],currentDepth:1};ctx.setEnv('__trace_context__',trace);ctx.setEnv('traceSystemVariants',true);
 const details=registry.invokeWithVariant('ADD',args,ctx,evaluate);
 assert.equal(details.variant.name,'ProbeB');assert.equal(details.args[0].value,7n);assert.equal(details.value.value,7n);assert.equal(trace.log.at(-1).variantName,'ProbeB');
 registry.installVariant('ADD',{name:'Tie',priority:12,prep:()=>true,impl:()=>new Integer(0n)});
 assert.throws(()=>registry.call('ADD',args,ctx,evaluate),/Ambiguous ADD variants/);
 const hookRegistry=env.rix.createDefaultRegistry();hookRegistry._invokeSystemMultifunction=()=>({value:new Integer(88n)});
 assert.equal(hookRegistry.call('ADD',args,ctx,evaluate).value,88n,'host dispatch hook retains result envelope');
 const pr=env.rix.createDefaultRegistry(),priorityEvents=[];
 pr.installVariant('ADD',{name:'Dynamic',prep(){priorityEvents.push('prep1');return true;},impl:()=>new Integer(40n)});
 const dynamic=pr.get('ADD').variants.find(x=>x.name==='Dynamic');
 Object.defineProperty(dynamic,'priority',{get(){priorityEvents.push('priority');return 50;},configurable:true});
 pr.installVariant('ADD',{name:'Later',prep(){priorityEvents.push('prep2');return false;},impl:()=>null});
 assert.equal(pr.call('ADD',args,ctx,evaluate).value,40n);
 assert.deepEqual(priorityEvents,['prep1','prep2','priority','priority','priority'],'priority getter order/count preserved');
 const preempt=env.rix.createDefaultRegistry(),fall=preempt.get('ADD').variants.find(x=>x.nativeFallback);
 fall.preempt=()=>true;fall.impl=()=>new Integer(91n);assert.equal(preempt.call('ADD',args,ctx,evaluate).value,91n);
 preempt.get('ADD').variants=[];assert.equal(preempt.call('ADD',args,ctx,evaluate),null);
 const argRegistry=env.rix.createDefaultRegistry(),argReads=[];
 argRegistry.installVariant('ADD',{name:'ArgsGetter',priority:100,prepare(){return {get args(){argReads.push(argReads.length+1);return args;}};},impl:()=>new Integer(41n)});
 assert.equal(argRegistry.call('ADD',args,ctx,evaluate).value,41n);
 assert.deepEqual(argReads,[1,2,3],'custom normalized-args getter reads are preserved');
 const exprEnv=await load(v);
 const outcomes=[];
 for(const a of [-100n,-1n,0n,1n,100n,1n<<100n])for(const b of [-1n,0n,1n,1n<<100n])for(const op of ['<','<=','>','>=','==','!=']){
  const c=new exprEnv.rix.Context();c.set('a',new exprEnv.core.Integer(a));c.set('b',new exprEnv.core.Integer(b));outcomes.push(canonical(exprEnv.run(exprEnv.parse(`a ${op} b;`),{},c)));
 }
 const x=new exprEnv.core.Integer(2n);x.toRational=()=>new exprEnv.core.Rational(100n);
 const c=new exprEnv.rix.Context();c.set('x',x);const converted=exprEnv.run(exprEnv.parse('x<=5;'),{},c);assert.equal(converted,null,'own conversion keeps original relation semantics');outcomes.push(canonical(converted));
 const shadowedInteger=new exprEnv.core.Integer(2n);Object.defineProperty(shadowedInteger,'value',{value:100n});c.set('y',shadowedInteger);
 const shadowedResult=exprEnv.run(exprEnv.parse('y<=5;'),{},c);assert.equal(shadowedResult.value,1n,'shadowed value uses original conversion');outcomes.push(canonical(shadowedResult));
 const comparisonIR=exprEnv.parse('1<=2;');assert.equal(exprEnv.run(comparisonIR).value,1n);
 exprEnv.registry.override('LTE',()=>new Integer(76n));assert.equal(exprEnv.run(comparisonIR).value,76n);exprEnv.registry.restore('LTE');
 exprEnv.registry.installVariant('LTE',{name:'CustomIntegerLTE',priority:100,prep:()=>true,impl:()=>new Integer(75n)});
 assert.equal(exprEnv.run(comparisonIR).value,75n,'custom comparison precedes primitive fast path');
 const custom=exprEnv.rix.parseAndEvaluate('##OPS##\n:none :additive SumOp :<o+>: :infix\n##OPS##\nSumOp(a,b)->a+b+1; 20 :<o+>: 21;');
 assert.equal(custom.value,42n);
 const asyncC=new exprEnv.rix.Context();let asyncResult;
 for(const ir of exprEnv.parse('[1,2,3].Map((x)->x*2).Reduce((a,b)->a+b,0);'))asyncResult=await exprEnv.rix.evaluateAsync(ir,asyncC,exprEnv.registry,exprEnv.system);
 assert.equal(asyncResult.value,12n);
 snapshots.push({v,nameEvents,outcomes});
}
for(const s of snapshots.slice(1)){assert.deepEqual(s.nameEvents,snapshots[0].nameEvents);assert.deepEqual(s.outcomes,snapshots[0].outcomes,s.v);}
const report={timestamp:new Date().toISOString(),runtime:process.versions.bun?'bun':'node',versions:process.versions,variants,workloadEvaluations:comparisons,integerRelationCases:144,passed:true,
 checks:'Live instance/trait/type/builtin/system method mutations and cache eviction; exact non-string coercion; registry override/restore, all probes, normalized args, priority getters/ties, trace, native preemption, host hooks, empty dispatch, comparison fallback, source custom operators and async methods'};
await writeFile(new URL(`./results/verification-${report.runtime}.json`,import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
