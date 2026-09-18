#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';

const fileUrl = new URL('../cards.json', import.meta.url);
const data = JSON.parse(await readFile(fileUrl, 'utf8'));
const sourceDir = process.env.AIPRI_CARD_SOURCE_DIR;
const sets = [
  ['1だん', 'oa1', 3],
  ['2だん', 'oa2', 3],
  ['3だん', 'oa3', 3],
  ['4だん', 'oa4', 3],
  ['スペシャルアイプリカード', 'special', 4],
  ['スペシャルカードパック', 'spcardpack', 4],
  ['アイプリカード♪コレクショングミ', 'gumi', 3],
  ['ミルフィーカード', 'millefeui', 3],
].map(([label, page, defaultRarity]) => ({
  label,
  sourcePage: `https://aipri.jp/card/${page}.html`,
  base: `https://aipri.jp/card/img/${page}/`,
  page,
  defaultRarity,
}));

async function getHtml(set) {
  if (sourceDir) return readFile(`${sourceDir}/${set.page}.html`, 'utf8');
  const response = await fetch(set.sourcePage);
  if (!response.ok) throw new Error(`${set.label}: HTTP ${response.status}`);
  return response.text();
}

function parseCards(html, defaultRarity) {
  return html.split(/<section\b/).flatMap(section => {
    const rarity = Number(section.match(/id="rarity-star([234])"/)?.[1] ?? defaultRarity);
    return [...section.matchAll(/data-term="([^"]*)" data-name="([^"]*)" data-img1="img\/[^/]+\/([^_]+)_O\.webp"/g)]
      .map(([, char, name, id]) => ({ id, name, char, rarity }));
  });
}

data.sets = await Promise.all(sets.map(async set => ({
  label: set.label,
  sourcePage: set.sourcePage,
  base: set.base,
  cards: parseCards(await getHtml(set), set.defaultRarity),
})));
data.updatedAt = new Date().toISOString().slice(0, 10);
await writeFile(fileUrl, `${JSON.stringify(data, null, 2)}\n`);
console.log(data.sets.map(set => `${set.label}: ${set.cards.length}枚`).join('\n'));
