import { rix, Integer, registry, systemContext } from '../runtime.js';
import { preparePolynomial, polynomialBatch } from './polynomial.js';
import { createFastRegistry } from './arithmetic.js';
export const sequence = values => ({ type: 'sequence', values, _ext: new Map([['_mutable', new Integer(1n)]]) });
const values = x => { if (x?.type !== 'sequence' || !Array.isArray(x.values)) throw new TypeError('RiX sequence required'); return x.values; };
export function createExploration() {
  const capabilities = systemContext.copy();
  capabilities.registerHost('polynomial', { impl: ([coefficients, points]) => sequence(polynomialBatch(values(coefficients), values(points))), pure: true });
  capabilities.registerHost('polynomialOne', { impl: ([coefficients, x]) => preparePolynomial(values(coefficients)).evaluate(x), pure: true });
  capabilities.registerHost('preparePolynomial', { impl: ([coefficients]) => {
    const plan = preparePolynomial(values(coefficients));
    return { type: 'map', entries: new Map([['degree', new Integer(BigInt(plan.descriptor.degree))], ['method', { type: 'string', value: plan.descriptor.method }]]),
      _ext: new Map([['EVALUATE', { type: 'method_builtin', name: 'Evaluate', impl: ([, points]) => sequence(plan.map(values(points))) }]]) };
  }, pure: true });
  capabilities.registerHost('compute', { impl: ([request]) => {
    if (request?.type !== 'map' || !(request.entries instanceof Map) || request.entries.get('operation')?.value !== 'polynomial') throw new TypeError('Polynomial operation descriptor required');
    return sequence(polynomialBatch(values(request.entries.get('coefficients')), values(request.entries.get('points'))));
  }, pure: true });
  capabilities.freeze();
  const fast = createFastRegistry();
  const parse = source => rix.lower(rix.parse(rix.tokenize(source)));
  const run = (ir, { coefficients, points }, executionRegistry = registry, context = new rix.Context()) => {
    context.set('coefficients', sequence(coefficients)); context.set('points', sequence(points));
    let result;
    for (const node of ir) result = rix.evaluate(node, context, executionRegistry, capabilities);
    return result;
  };
  return { parse, run, fast, capabilities };
}
