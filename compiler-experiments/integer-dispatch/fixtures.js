import {fixtures as polynomials,materialize} from '../polynomial-core/fixtures.js';
export {materialize};
const I=n=>({kind:'Integer',value:String(n)}),S=values=>({kind:'sequence',values});
const accumulate=`Run(n) -> {@ i=0-0,r=0-0; i<n; r:=r+3*i-1,i+=1; ;r}; Run(count);`;
const sum=`Run(values,passes) -> {@ j=0-0,r=0-0; j<passes;
  r:=r+{@ i=1,s=0-0; i<=@values.Len(); s:=s+@values.Get(i),i+=1; ;s},j+=1;
  ;r}; Run(values,passes);`;
const compare=`Run(n) -> {@ i=0-0,r=0-0; i<n; r:=r+(i<=n ?:1 ?_0),i+=1; ;r}; Run(count);`;
export async function fixtures(quick=false){
 const p=await polynomials(quick);
 const values=S(Array.from({length:quick?32:128},(_,i)=>I(BigInt((i*7919)%100003-50000))));
 return [p.find(f=>f.name==='integer-horner'),
  {name:'integer-accumulator',source:accumulate,data:{count:I(quick?128:1024)},dimensions:{iterations:quick?128:1024}},
  {name:'integer-comparisons',source:compare,data:{count:I(quick?128:1024)},dimensions:{iterations:quick?128:1024}},
  {name:'len-get-sum',source:sum,data:{values,passes:I(4)},dimensions:{values:values.values.length,passes:4}},
  {name:'custom-Get-sum',source:sum,data:{values,passes:I(4)},custom:'method',dimensions:{values:values.values.length,passes:4}},
  {name:'custom-ADD-accumulator',source:accumulate,data:{count:I(quick?128:1024)},custom:'operator',dimensions:{limit:quick?128:1024,arithmetic:'ADD has a custom +1 offset, including index increments'}},
  p.find(f=>f.name==='rational-horner'),p.find(f=>f.name==='interval-horner'),p.find(f=>f.name==='larger-rational-horner')];
}
export function prepare(env,f){
 const bindings=materialize(f.data,env.core);
 if(f.custom==='method')bindings.values._ext.set('GET',{type:'method_builtin',name:'Get',impl:([self,i])=>new env.core.Integer(self.values[Number(i.value)-1].value+1n)});
 if(f.custom==='operator')env.registry.installVariant('ADD',{name:'ExperimentalOffsetADD',priority:25,prep:args=>args.length===2&&args.every(v=>v instanceof env.core.Integer),impl:([a,b])=>new env.core.Integer(a.value+b.value+1n)});
 const ir=env.parse(f.source);
 return ()=>env.run(ir,bindings);
}
