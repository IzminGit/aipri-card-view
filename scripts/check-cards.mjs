#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const data = JSON.parse(await readFile(new URL('../cards.json', import.meta.url), 'utf8'));
let differs = false;

for (const set of data.sets) {
  const response = await fetch(set.sourcePage);
  if (!response.ok) throw new Error(`${set.label}: HTTP ${response.status}`);
  const html = await response.text();
  const official = [...html.matchAll(/data-term="([^"]*)" data-name="([^"]*)" data-img1="img\/[^/]+\/([^_]+)_O\.webp"/g)]
    .map(([, char, name, id]) => ({ id, name, char }));
  const local = new Map(set.cards.map(card => [card.id, card]));
  const officialIds = new Set(official.map(card => card.id));
  const missing = official.filter(card => !local.has(card.id));
  const extra = set.cards.filter(card => !officialIds.has(card.id));
  const changed = official.filter(card => local.has(card.id) &&
    (local.get(card.id).name !== card.name || local.get(card.id).char !== card.char));

  if (!missing.length && !extra.length && !changed.length) {
    console.log(`✓ ${set.label}: ${official.length}枚（同期済み）`);
    continue;
  }
  differs = true;
  console.log(`! ${set.label}`);
  if (missing.length) console.log('  追加候補:', missing.map(card => `${card.id} ${card.name}（${card.char}）`).join(', '));
  if (extra.length) console.log('  公式に見つからないカード:', extra.map(card => card.id).join(', '));
  if (changed.length) console.log('  名前・キャラクター差分:', changed.map(card => card.id).join(', '));
}

if (differs) process.exitCode = 1;
