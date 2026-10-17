import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { core, root } from '../runtime.js';
export const { BaseSystem } = core;
export const { toExactBigInt } = await import(pathToFileURL(resolve(root, 'packages/core/src/bigint.js')).href);
