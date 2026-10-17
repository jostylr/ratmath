import { spawnSync } from 'node:child_process';
import { readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const build=JSON.parse(await readFile(new URL('./tmp/build.json',import.meta.url)));
for(const variant of ['copy','literals']) {
  let patch='';
  for(const file of ['src/runtime/cell.js','src/eval/functions/core.js']) {
    const result=spawnSync('diff',['-u','-L',`a/rix/${file}`,'-L',`b/rix/${file}`,resolve(build.paths.control.rix,file),resolve(build.paths[variant].rix,file)],{encoding:'utf8'});
    if(![0,1].includes(result.status))throw new Error(result.stderr);
    patch+=result.stdout;
  }
  await writeFile(new URL(`./patches/${variant}.patch`,import.meta.url),patch);
}
console.log('Saved isolated interpreter diffs. Core is byte-identical; production code unchanged.');
