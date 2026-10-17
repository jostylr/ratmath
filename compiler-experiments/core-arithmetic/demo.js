import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Integer, Rational, rix } from '../runtime.js';
import { createExploration } from './rix.js';
import { createMarkedSession } from '../marked-bigint/runner.js';
import { preparePolynomial } from './polynomial.js';
const exploration = createExploration();
const fixture = { coefficients: [new Integer(1n), new Integer(-2n), new Integer(3n)], points: [new Rational(-2n), new Rational(1n, 2n), new Rational(3n, 7n)] };
const expected = preparePolynomial(fixture.coefficients).map(fixture.points).map(x => x.toString());
for (const name of ['horner', 'fraction-horner', 'offload', 'plan', 'descriptor']) {
  const source = await readFile(new URL(`./scripts/${name}.rix`, import.meta.url), 'utf8');
  const result = exploration.run(exploration.parse(source), fixture).values.map(x => x.toString());
  assert.deepEqual(result, expected); console.log(`${name}: ${result.join(', ')}`);
}
const source = await readFile(new URL('./scripts/fraction-horner-marked.rix', import.meta.url), 'utf8');
const session = createMarkedSession(), program = session.load(source);
for (let i = 0; i < 2; i++) assert.deepEqual(program.run({ bindings: { coefficients: { type: 'sequence', values: fixture.coefficients }, points: { type: 'sequence', values: fixture.points } } }).values.map(x => x.toString()), expected);
console.log('The RiX Integer-pair algorithm compiles independently of the polynomial host helper:', session.stats);
console.log('Inspectable computation plan:', preparePolynomial(fixture.coefficients).descriptor);
// A prepared plan remains usable in a persistent RiX exploration context.
const context = new rix.Context();
exploration.run(exploration.parse('plan:=.preparePolynomial(coefficients);'), fixture, undefined, context);
const twice = exploration.run(exploration.parse('plan.Evaluate(points);'), fixture, undefined, context);
assert.deepEqual(twice.values.map(x => x.toString()), expected);
