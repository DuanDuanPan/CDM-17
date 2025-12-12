#!/usr/bin/env tsx
/**
 * Quick baseline for layout payload size and serialization cost with 1k nodes.
 * Usage: pnpm tsx tooling/scripts/perf-layout.ts
 */

const NODE_COUNT = 1000;

type Payload = {
  positions: Record<string, { x: number; y: number; folded: boolean }>;
  toggles: { snap: boolean; grid: boolean; guide: boolean; distance: boolean };
};

const payload: Payload = {
  positions: {},
  toggles: { snap: true, grid: true, guide: true, distance: false },
};

for (let i = 0; i < NODE_COUNT; i += 1) {
  payload.positions[`node-${i}`] = {
    x: Math.random() * 2000,
    y: Math.random() * 2000,
    folded: Math.random() > 0.7,
  };
}

console.time('serialize');
const json = JSON.stringify(payload);
console.timeEnd('serialize');

console.log('node-count', NODE_COUNT);
console.log('payload-bytes', Buffer.byteLength(json, 'utf8'));

console.time('parse');
const parsed = JSON.parse(json) as Payload;
console.timeEnd('parse');

console.log('sample-node', parsed.positions['node-10']);
