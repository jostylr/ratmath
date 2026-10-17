import { spawn } from 'node:child_process';
import { readFile,writeFile } from 'node:fs/promises';
const build = JSON.parse(await readFile(new URL('./tmp/build.json',import.meta.url)));
const run = async (name,command,args,cwd) => {
  let output=''; const start=performance.now();
  const exitCode = await new Promise((done,reject)=> {
    const child=spawn(command,args,{cwd,env:process.env});
    child.stdout.on('data',x=>{output+=x;}); child.stderr.on('data',x=>{output+=x;});
    child.on('error',reject); child.on('close',done);
  });
  await writeFile(new URL(`./results/${name}.txt`,import.meta.url),output);
  console.log(output.split('\n').slice(-9).join('\n'));
  const summary = args[0] === 'test'
    ? {passed:Number(output.match(/(\d+) pass\b/)?.[1]||0),failed:Number(output.match(/(\d+) fail\b/)?.[1]||0)}
    : (exitCode===0 ? JSON.parse(output) : {verificationPassed:false});
  return {name,command:[command,...args],exitCode,wallMs:performance.now()-start,...summary};
};
const results=[];
results.push(await run('core-combined','bun',['test','./tests'],build.core));
for (const runtime of ['bun','node']) results.push(await run(`verification-${runtime}`,runtime,[new URL('./verify.js',import.meta.url).pathname],process.cwd()));
await writeFile(new URL('./results/tests.json',import.meta.url),JSON.stringify({timestamp:new Date().toISOString(),results},null,2)+'\n');
if(results.some(x=>x.exitCode!==0)) process.exitCode=1;
