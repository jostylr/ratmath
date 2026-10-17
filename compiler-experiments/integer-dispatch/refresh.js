import { spawn } from 'node:child_process';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'..');
await mkdir(resolve(here,'results/refresh'),{recursive:true});
const summaries=[];
for(const [folder,stem] of [['integrated-core','ordinary'],['polynomial-core','polynomial'],['interpreter-overhead','overhead']]) {
  for(const runtime of ['bun','node']) {
    const files=['json','md'].map(ext=>resolve(root,folder,`results/${stem}-${runtime}.${ext}`));
    const originals=await Promise.all(files.map(p=>readFile(p)));
    let output='';const start=performance.now();let exitCode;
    try {
      exitCode=await new Promise((done,reject)=>{
        const child=spawn(runtime,[resolve(root,folder,'bench.js')],{cwd:root,env:process.env});
        child.stdout.on('data',d=>{output+=d;});child.stderr.on('data',d=>{output+=d;});child.on('error',reject);child.on('close',done);
      });
      await writeFile(resolve(here,`results/refresh/${folder}-${runtime}.txt`),output);
      if(exitCode!==0)throw new Error(`${folder}/${runtime} failed: ${output.slice(-4000)}`);
      for(let i=0;i<files.length;i++)await writeFile(resolve(here,`results/refresh/${folder}-${runtime}.${['json','md'][i]}`),await readFile(files[i]));
      const report=JSON.parse(await readFile(files[0],'utf8'));
      summaries.push({folder,runtime,versions:{bun:report.versions.bun||null,node:report.versions.node},wallMs:performance.now()-start,groups:report.results.length});
      console.log(JSON.stringify(summaries.at(-1)));
    } finally {
      for(let i=0;i<files.length;i++)await writeFile(files[i],originals[i]);
    }
  }
}
await writeFile(resolve(here,'results/refresh/summary.json'),JSON.stringify({timestamp:new Date().toISOString(),method:'Original harnesses/inputs, sequential runtime processes, historical reports restored byte-for-byte',runs:summaries},null,2)+'\n');
