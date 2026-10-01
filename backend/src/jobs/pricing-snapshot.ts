#!/usr/bin/env node
/** Запуск на сервере: cd backend && node dist/jobs/pricing-snapshot.js */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildPricingSnapshot } from '../pricing-snapshot.js';

async function main(): Promise<void> {
  const snap = await buildPricingSnapshot(true);
  const json = JSON.stringify(snap, null, 2);
  const out = resolve(process.cwd(), 'data/pricing-snapshot.json');
  writeFileSync(out, json, 'utf8');
  console.log(json);
  console.error(`\n[saved] ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
