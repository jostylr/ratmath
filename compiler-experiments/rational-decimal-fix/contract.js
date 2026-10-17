import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const {Rational}=await import(pathToFileURL(resolve(process.argv[2],'index.js')));
const before=process.argv.includes('--expect-bug');
if(before) {
  assert.throws(()=>new Rational('-.5'));
  console.log(JSON.stringify({runtime:process.versions.bun?`Bun ${process.versions.bun}`:`Node ${process.versions.node}`,bugReproduced:true}));
} else {
  let cases=0;
  for(let width=1;width<=16;width++) for(const digits of ['0','1','5','9','12','500','999']) for(const sign of ['','-']) {
    const tail=digits.padStart(width,'0');
    const actual=new Rational(`${sign}.${tail}`),expected=new Rational(`${sign}0.${tail}`);
    assert.equal(actual.numerator,expected.numerator); assert.equal(actual.denominator,expected.denominator); cases++;
  }
  assert.equal(new Rational('  -.50  ').toString(),'-1/2');
  for(const input of ['-','-.','--.5','-+.5','-.5x','-.5.1','-. 5','- .5']) assert.throws(()=>new Rational(input));
  console.log(JSON.stringify({runtime:process.versions.bun?`Bun ${process.versions.bun}`:`Node ${process.versions.node}`,cases,malformed:8,passed:true}));
}
