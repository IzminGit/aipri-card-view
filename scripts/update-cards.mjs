#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';

const fileUrl = new URL('../cards.json', import.meta.url);
const data = JSON.parse(await readFile(fileUrl, 'utf8'));
const rarityByLabel = new Map([
  ['スペシャルカード', 4],
  ['コレクショングミ', 3],
  ['ミルフィーカード', 3],
]);

let added = 0;
for (const set of data.sets) {
  const response = await fetch(set.sourcePage);
  if (!response.ok) throw new Error(`${set.label}: HTTP ${response.status}`);
  const html = await response.text();
  const official = [...html.matchAll(/data-term="([^"]*)" data-name="([^"]*)" data-img1="img\/[^/]+\/([^_]+)_O\.webp"/g)]
    .map(([, char, name, id]) => ({ id, name, char }));
  const localIds = new Set(set.cards.map(card => card.id));
  const missing = official.filter(card => !localIds.has(card.id));
  if (!missing.length) continue;

  const rarity = rarityByLabel.get(set.label) ?? set.cards[0]?.rarity ?? 3;
  set.cards = [
    ...missing.map(card => ({ ...card, rarity })),
    ...set.cards,
  ];
  added += missing.length;
  console.log(`${set.label}: ${missing.map(card => card.id).join(', ')}`);
}

if (!added) {
  console.log('追加カードはありません');
  process.exit(0);
}

data.updatedAt = '2026-07-31';
await writeFile(fileUrl, `${JSON.stringify(data, null, 2)}\n`);
console.log(`${added}枚を追加しました`);
