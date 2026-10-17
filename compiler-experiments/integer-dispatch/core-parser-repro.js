import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const build=JSON.parse(await readFile(new URL('./tmp/build.json',import.meta.url)));
const results=[];
for(const [name,path]of [['production',resolve(build.sourceRoot,'packages/core/index.js')],['experimental-base',resolve(build.paths.base.core,'index.js')]]){
 const core=await import(pathToFileURL(path).href);
 for(const input of ['-0.5','-.5','-0..1/2']){
  try{results.push({core:name,input,result:new core.Rational(input).toString()});}catch(e){results.push({core:name,input,error:e.name,message:e.message});}
 }
}
let bigintMinus;try{bigintMinus=String(BigInt('-'));}catch(e){bigintMinus={error:e.name,message:e.message};}
const runtime=process.versions.bun?'bun':'node';
const report={runtime,version:process.versions.bun||process.versions.node,source:'Copied tests/release-contracts.test.js negative-leading-decimal case',bigintMinus,results};
await writeFile(new URL(`./results/core-parser-${runtime}.json`,import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
