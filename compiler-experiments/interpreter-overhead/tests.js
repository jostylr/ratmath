import { spawn } from 'node:child_process';
import { readFile,writeFile } from 'node:fs/promises';
const build=JSON.parse(await readFile(new URL('./tmp/build.json',import.meta.url)));
const files=['cells','constructor-capture','collection-value-semantics','identity-comparison','number-notation','numeric-regressions','function-return','shared-scope','range-arithmetic','diagnostics','async-safety','performance-numeric-adapters','type-system'];
const results=[];
async function run(name,args,cwd) {
  let output='';const start=performance.now();
  const exitCode=await new Promise((done,reject)=>{
    const child=spawn('bun',['test',...args],{cwd,env:process.env});
    child.stdout.on('data',x=>{output+=x;});child.stderr.on('data',x=>{output+=x;});child.on('error',reject);child.on('close',done);
  });
  await writeFile(new URL(`./results/${name}.txt`,import.meta.url),output);
  const r={name,command:['bun','test',...args],exitCode,passed:Number(output.match(/(\d+) pass\b/)?.[1]||0),failed:Number(output.match(/(\d+) fail\b/)?.[1]||0),wallMs:performance.now()-start};
  results.push(r);console.log(JSON.stringify(r));console.log(output.split('\n').slice(exitCode===0?-7:-40).join('\n'));
}
// Core source is identical in every variant. Run its unchanged full suite once.
await run('core-unchanged',['./tests'],build.paths.literals.core);
for(const variant of ['control','copy','literals'])await run(`rix-${variant}`,files.map(f=>`./tests/eval/${f}.test.js`),build.paths[variant].rix);
await writeFile(new URL('./results/tests.json',import.meta.url),JSON.stringify({timestamp:new Date().toISOString(),core:'Byte-identical in all environments',focusedRiXFiles:files,results},null,2)+'\n');
if(results.some(r=>r.exitCode!==0))process.exitCode=1;
