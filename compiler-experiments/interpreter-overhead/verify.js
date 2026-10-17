import assert from 'node:assert/strict';
import { readFile,writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { load,canonical } from './load.js';
import { variants } from './build.js';
import { fixtures,materialize } from '../polynomial-core/fixtures.js';
const envs=await Promise.all(variants.map(load));
const source=await readFile(new URL('../integrated-core/scripts/horner.rix',import.meta.url),'utf8');
const cases=await fixtures();
const S=values=>({kind:'sequence',values}),I=n=>({kind:'Integer',value:String(n)}),R=(n,d)=>({kind:'Rational',numerator:String(n),denominator:String(d)});
let state=0x1b745c29;
const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return state>>>0;};
const number=()=>random()%3?I(BigInt(random()%101)-50n):R(BigInt(random()%101)-50n,BigInt(random()%19)+1n);
for(let i=0;i<160;i++)cases.push({name:`random-${i}`,data:{coefficients:S(Array.from({length:random()%18},number)),points:S(Array.from({length:1+random()%4},number))}});
let comparisons=0;
for(const f of cases) {
  let expected;
  for(const env of envs) {
    const data=materialize(f.data,env.core),before=canonical(data.coefficients);
    const value=canonical(env.run(env.parse(source),data));
    if(expected===undefined)expected=value;else assert.deepEqual(value,expected,`${env.variant}: ${f.name}`);
    assert.deepEqual(canonical(data.coefficients),before);comparisons++;
  }
}
const expressions=[
  'a:=1/3; b:=a; b.tag=2; [a.tag,b.tag,a===b];',
  'a:=1/3; a.tag=[1,2]; b::=a; b.tag.Push!(3); [a.tag,b.tag,a===b];',
  'a:=1/3; b=a; a~=2/5; [a,b,a===b];',
  'a:=1/3; b:=a; a~=2/5; [a,b,a===b];',
  'a:=1/3; a.__units=:m; b:=a; [a.__units,b.__units];',
  'a:=1/3; a.lock=1; a~=2/3;',
  'a:=[1/3,[2/5]]; b::=a; b[2].Push!(3/7); [a,b];',
  'F(x) -> {; y:=x; y+1/3 }; F(2/5);',
  'F(n) -> {@ i=1,r=0-0; i<=n; r:=r+1/3,i+=1; ;r}; F(12);',
  'F(x) ?!- [x>0 ?_> -1] -> x+1/3; [F(0),F(2)];',
  'x:=1/3:2/3; y::=x; [x,y,x===y];',
  '.Trace("copy",1,["a"],()->{; a:=1/3; b:=a; b+1; });',
  '1/3 + 2/5;', '0:1 + 2/3;', '0.12?3;', '1 + _;',
];
const outcome=(env,expr)=>{try{return {value:canonical(env.run(env.parse(expr)))};}catch(e){return {error:e.name,message:e.message};}};
for(const expr of expressions) {
  const expected=outcome(envs[0],expr);
  for(const env of envs.slice(1)){assert.deepEqual(outcome(env,expr),expected,`${env.variant}: ${expr}`);comparisons++;}
}
const literalStrings=['0','1','0001','42','1234567890123456789012345678901234567890','1_000','0.125','.125','1/3','5..2/3','0.#3','0xFF','0b101','1:2','0.12?3','1_^3','1e3','foo','','-17',42,null];
for(const str of literalStrings) {
  const call=env=>{try{return {value:canonical(env.registry.get('LITERAL').impl([str]))};}catch(e){return {error:e.name,message:e.message};}};
  const expected=call(envs[0]);
  for(const env of envs.slice(1)){assert.deepEqual(call(env),expected,`${env.variant}: literal ${str}`);comparisons++;}
}
for(const env of envs) {
  const {Rational,Integer}=env.core;
  const cell=await import(pathToFileURL(resolve(env.paths.rix,'src/runtime/cell.js')).href);
  const capture=await import(pathToFileURL(resolve(env.paths.rix,'src/runtime/constructor-capture.js')).href);
  for(const [n,d] of [[0n,1n],[-7n,3n],[1n,1n],[123456789n,1073741824n]]) {
    const original=new Rational(n,d);original.toDecimal(10);
    const inner={type:'sequence',values:[new Integer(1n)]};original._ext=new Map([['tag',inner],['__units',{type:'string',value:'m'}]]);
    const shallow=capture.captureResolvedValue(original,'copy'),deep=capture.captureResolvedValue(original,'deep_copy');
    for(const copied of [shallow,deep]) {
      assert.notEqual(copied,original);assert.notEqual(copied._ext,original._ext);
      assert.deepEqual(canonical(copied),canonical(original));assert.equal(copied.toDecimal(10),original.toDecimal(10));
      assert.deepEqual(canonical(JSON.parse(JSON.stringify(copied),env.core.reviveCoreValue)),canonical(original));
    }
    assert.equal(shallow._ext.get('tag'),inner);assert.notEqual(deep._ext.get('tag'),inner);
    deep._ext.get('tag').values.push(new Integer(2n));assert.equal(inner.values.length,1);
  }
  class SubRational extends Rational { get numerator(){return 10n;} get denominator(){return 100n;} }
  const shadowed=new Rational(2n,3n);Object.defineProperty(shadowed,'numerator',{value:10n});Object.defineProperty(shadowed,'denominator',{value:100n});
  for(const v of [new SubRational(2n,3n),shadowed]) for(const copy of [cell.shallowCopyValue,cell.deepCopyValue]) {
    assert.deepEqual(canonical(copy(v)),{type:'Rational',numerator:'1',denominator:'10'},'guarded fallback retains normalization');
  }
  const descriptor=Object.getOwnPropertyDescriptor(Rational.prototype,'numerator');
  try {
    Object.defineProperty(Rational.prototype,'numerator',{...descriptor,get(){return descriptor.get.call(this)*3n;}});
    const v=new Rational(2n,3n),copied=cell.shallowCopyValue(v);
    assert.equal(copied.numerator,6n);assert.equal(copied.denominator,1n,'changed prototype accessor uses general normalized constructor');
  } finally {Object.defineProperty(Rational.prototype,'numerator',descriptor);}
  const ir=env.parse('123;'),a=env.run(ir),b=env.run(ir);
  assert.notEqual(a,b);a._ext=new Map([['tag',new Integer(7n)]]);assert.equal(b._ext,undefined);
  const budget=await import(pathToFileURL(resolve(env.paths.rix,'src/runtime/evaluation-budget.js')).href);
  const ctx=new env.rix.Context();ctx.setEnv(budget.EVALUATION_BUDGET_ENV,budget.createEvaluationBudget({maxSteps:5}));
  assert.throws(()=>env.run(env.parse('{@ i=0; i<100; i+=1; ;i};'),{},ctx),/step limit/);
  const saved=env.registry.get('ADD');env.registry.override('ADD',()=>new Integer(77n));
  assert.equal(env.run(env.parse('1+2;')).value,77n,'operator overrides remain live');env.registry.functions.set('ADD',saved);
  // Async calls still traverse the normal promise-aware evaluator.
  const asyncContext=new env.rix.Context();let asyncValue;
  for(const node of env.parse('x:=1/3; y::=x; y+2/3;'))asyncValue=await env.rix.evaluateAsync(node,asyncContext,env.registry,env.system);
  assert.deepEqual(canonical(asyncValue),{type:'Rational',numerator:'1',denominator:'1'});
}
const report={timestamp:new Date().toISOString(),runtime:process.versions.bun?'bun':'node',polynomialCases:cases.length,variants,comparisons,
  checks:'Exact types/values, input mutation, fresh copy identity, shallow/deep metadata and aliases, intervals, subclasses/field/prototype overrides, formatting/JSON, fresh literals and parser fallback, trace, loop budgets, live registry overrides and async evaluation',passed:true};
await writeFile(new URL(`./results/verification-${report.runtime}.json`,import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
