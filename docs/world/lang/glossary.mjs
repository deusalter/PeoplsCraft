#!/usr/bin/env node
// Writes ../glossary.md from ../names.json, roots.json and rules.json. No dependencies.
//
//   node glossary.mjs            write glossary.md
//   node glossary.mjs --check    exit non-zero if glossary.md is not what the script would write
//
// Nothing in glossary.md is written by hand. Change names.json, run
// `node derive.mjs --check ../names.json`, then run this.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (p) => JSON.parse(readFileSync(join(HERE, p), 'utf8'));
const DATA = read('../names.json');
const ROOTS = new Map(read('roots.json').roots.map((r) => [r.word, r]));
const RULES = read('rules.json');
const AFFIX = new Map();
for (const t of Object.values(RULES.tongues)) for (const a of t.affixes) AFFIX.set(a.word, a.makes);

const TONGUE = { plain: 'plain English', hearth: "householders' tongue", sand: 'sand-country tongue', cutters: "cutters' tongue" };
const KINDS = [
  ['label', 'Labels', 'The title, the attributes, the four ways of fighting and the chapters of the Guide.'],
  ['realm', 'The three places', 'The living ground and the two remains that the gates lead to.'],
  ['biome', 'The countries', 'The eighteen kinds of country. The names are shown only in the debug overlay today.'],
  ['structure', 'Old structures', 'None has a name in play today, except that the compass says altar. The names are for the compass and for later text.'],
  ['people', 'The peoples', 'For writers. Game text says these in English.'],
  ['boss', 'The eight great feeders', 'The names on the boss bars.'],
  ['host', 'The eight kinds of host', 'For writers. The game shows no name for a kind.'],
  ['creature', 'Creatures', 'Ordinary animals, feeders, the sand-country fighters, and what forms on a totem.'],
  ['townsperson', 'Townsfolk', 'Each name is stored twice in the source, once for the townsperson and once for the body, and the two entries are changed together.'],
  ['tier', 'The ten hardnesses', 'The tier words that go in front of a tool or a piece of armour.'],
  ['piece', 'Tool and armour words', 'The words that go after a tier word. The four set words are never shown.'],
  ['block', 'Blocks', ''],
  ['item', 'Items', ''],
  ['station', 'Stations', ''],
  ['modifier', 'Modifiers', 'A modifier goes in front of the name of a piece of gear.'],
  ['rarity', 'Rarities', ''],
  ['status', 'States of a body', ''],
  ['event', 'The three attacks', ''],
  ['text', 'Titles and lines at the great stones', 'The title under each boss bar is dropped. The other lines are sentences, and are given here so that the old ones are replaced with them.'],
  ['find', 'Old things to find', 'Proposed in the materials chapter. None has a key in the game yet.'],
];

const VOWEL = 'aāiīuūeo';
const isV = (c) => VOWEL.includes(c);
// Splits a word of a born tongue into syllables. ch and sh are one consonant each.
function syllables(word) {
  const units = [];
  const w = word.toLowerCase();
  for (let i = 0; i < w.length; i++) {
    const two = w.slice(i, i + 2);
    if (two === 'ch' || two === 'sh') { units.push(two); i++; } else units.push(w[i]);
  }
  const out = [];
  let cur = '';
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    cur += u;
    if (!isV(u)) continue;
    // consonants up to the next vowel: all but the last close this syllable
    let j = i + 1;
    while (j < units.length && !isV(units[j])) j++;
    const run = units.slice(i + 1, j);
    if (j === units.length) { cur += run.join(''); i = j; } else if (run.length > 1) { cur += run.slice(0, -1).join(''); i += run.length - 1; }
    out.push(cur);
    cur = '';
  }
  if (cur) out.push(cur);
  return out;
}
const hasLong = (s) => /[āīū]/.test(s);
const closed = (s) => !isV(s[s.length - 1]);
function stress(tongue, syl) {
  const last = syl.length - 1;
  if (tongue === 'hearth') {
    for (let i = last; i >= 0; i--) {
      if (hasLong(syl[i])) return i;
      if (closed(syl[i]) && i !== last) return i;
    }
    return 0;
  }
  for (let i = last; i >= 0; i--) if (hasLong(syl[i])) return i;
  for (let i = 0; i < last; i++) if (/[nm]$/.test(syl[i])) return i;
  return 0;
}
function say(tongue, name) {
  if (tongue !== 'hearth' && tongue !== 'sand') return '';
  const word = name.split(' ')[0];
  const syl = syllables(word);
  const at = stress(tongue, syl);
  return syl.map((s, i) => (i === at ? s.toUpperCase() : s)).join('-');
}

const esc = (s) => String(s ?? '').replace(/\|/g, '\\|');
const flat = (from) => (from ?? []).flatMap((x) => (Array.isArray(x) ? x : typeof x === 'string' ? [x] : []));
function rootLine(from) {
  const parts = [];
  for (const w of flat(from)) {
    const bare = w.replace(/^-|-$/g, '');
    const r = ROOTS.get(bare);
    if (r) parts.push(`*${w}*, ${r.gloss} (${r.ref})${r.note ? `. Note: ${r.note}` : ''}`);
    else if (AFFIX.has(w)) parts.push(`*${w}*, an ending: ${AFFIX.get(w)}`);
    else parts.push(`*${w}*`);
  }
  const english = (from ?? []).filter((x) => x && typeof x === 'object' && !Array.isArray(x)).map((x) => x.plain);
  if (english.length) parts.push(`with English ${english.map((x) => `"${x}"`).join(' and ')}`);
  return parts.join('; ');
}
const sentence = (s) => (s && !/[.!?]$/.test(s) ? s + '.' : s);
function otherLine(o) {
  const roots = o.from ? ` From ${rootLine(o.from)}.` : '';
  const hand = o.byHand ? ' Cut by hand, not derived.' : '';
  return `- **${o.name}** (${TONGUE[o.tongue]}): ${sentence(o.meaning)}${roots}${hand}`;
}
function block(e) {
  const lines = [];
  const shown = e.name === '' ? '(none)' : e.name;
  const tags = [TONGUE[e.tongue], `key \`${e.key}\``];
  if (e.old && e.old !== e.name) tags.push(`was ${/^\(/.test(e.old) ? e.old : `"${e.old}"`}`);
  else if (e.old === e.name) tags.push('unchanged');
  if (e.shown === false) tags.push('not shown in play');
  if (e.same) tags.push(`the same thing as \`${e.same.split(':').slice(1).join(':')}\``);
  lines.push(`#### ${shown}`);
  lines.push('');
  lines.push(tags.join(' · '));
  lines.push('');
  const pron = say(e.tongue, e.name);
  lines.push(`- Meaning: ${sentence(e.meaning)}${pron ? ` Said ${pron}.` : ''}`);
  if (e.from) lines.push(`- Roots: ${rootLine(e.from)}.`);
  lines.push(e.tongue === 'plain' ? `- Why: ${e.why}` : `- Named by ${e.namer}. ${e.why}`);
  if (e.other?.length) {
    lines.push('- Other names for it:');
    for (const o of e.other) lines.push('  ' + otherLine(o));
  }
  if (e.personal) {
    const p = e.personal;
    lines.push(`- A personal name, not shown in play: **${p.name}** (${TONGUE[p.tongue]}), ${p.meaning}, from ${rootLine(p.from)}. ${p.why}`);
  }
  lines.push('');
  return lines.join('\n');
}
function plainTable(list) {
  const rows = ['| Name | Key | Old name | Meaning | Why |', '| --- | --- | --- | --- | --- |'];
  for (const e of list) rows.push(`| ${e.name === '' ? '(none)' : esc(e.name)} | \`${esc(e.key)}\` | ${e.old === e.name ? 'unchanged' : esc(e.old)} | ${esc(e.meaning)} | ${esc(e.why)} |`);
  return rows.join('\n') + '\n';
}

function guide() {
  const E = new Map(DATA.names.map((e) => [`${e.kind}:${e.key}`, e]));
  const first = ['realm:dim:0', 'biome:plains', 'biome:forest', 'block:grass', 'block:cobble', 'piece:pickaxe', 'station:forge1', 'creature:woolback', 'creature:gelcap', 'creature:thornling', 'creature:gloomshade', 'creature:cave_skitter', 'creature:stonegnawer', 'block:guest_bed', 'townsperson:wayfinder', 'townsperson:smith', 'tier:lumenite', 'boss:b_colossus', 'block:altar1', 'event:moon'];
  const what = {
    'realm:dim:0': 'the world a player comes up on', 'biome:plains': 'open grass with a lone oak here and there', 'biome:forest': 'old oak wood', 'block:grass': 'the top piece of green ground',
    'block:cobble': 'what a pick brings out of stone', 'piece:pickaxe': 'the tool word, as in Wooden Pick', 'station:forge1': 'the first fire', 'creature:woolback': 'the flock animal, gone wild',
    'creature:gelcap': 'a lump of red-skinned jelly that hops', 'creature:thornling': 'a walking body of bramble', 'creature:gloomshade': 'the commonest thing in the dark', 'creature:cave_skitter': 'a small eight-legged crawler in caves',
    'creature:stonegnawer': 'a plated crawler that grinds at rock', 'block:guest_bed': 'the bed that houses a townsperson', 'townsperson:wayfinder': 'the first townsperson to come', 'townsperson:smith': 'the townsperson who comes to an anvil',
    'tier:lumenite': 'the gem of the deep rock, and the fourth hardness', 'boss:b_colossus': 'the first of the eight great feeders', 'block:altar1': 'the great stone where the first is baited', 'event:moon': 'the night the moon is dark',
  };
  const rows = ['| Name | Said | What it is | Register | Meaning |', '| --- | --- | --- | --- | --- |'];
  for (const k of first) {
    const e = E.get(k);
    if (!e) throw new Error('the guide names a key that is gone: ' + k);
    rows.push(`| ${e.name} | ${say(e.tongue, e.name) || 'as English'} | ${what[k]} | ${TONGUE[e.tongue]} | ${esc(e.meaning)} |`);
  }
  const n = (t) => DATA.names.filter((e) => e.tongue === t && e.shown !== false && e.name !== '').length;
  return `# Glossary

Every display name in the game, with its meaning, its roots, who named the thing and why, what other peoples call it, the old name and the internal key. This file is written by \`lang/glossary.mjs\` from \`names.json\` and is never edited by hand. \`languages.md\` gives the rules behind the names, and \`names-apply.md\` says where each one goes in the source.

## A one-page guide

**Plain English.** All game text is English, and an ordinary thing has its ordinary name: turf, rubble, oak, torch, pick. A thing has a name in a tongue only where some people on the ground had a reason to name it and no plain word is true of it. ${n('plain')} of the names shown in play are plain English.

**The householders' tongue.** The speech of the born who hold hearths: what the old trade speech became in their mouths over many generations. It names the countries, the kinds of feeder and the eight great ones, the trades of the townsfolk, and the metals found only on this ground. It is heard in doubled consonants, an h between vowels and clipped ends, and ${n('hearth')} names shown in play are in it or begin with a word of it.

**The sand-country tongue.** The sister speech of the people of the sand, who walked away from the hearths. It names their country, their fighters and their token, and it has its own forms of words both peoples share. It is heard in long vowels, sh, z and b, and every word of it ends in a vowel. ${n('sand')} names shown in play are in it.

**The cutters' tongue.** Sanskrit proper, the speech of the cutting trade on every world. It is written with every mark. ${n('cutters') ? `${n('cutters')} names shown in play are in it.` : 'No name shown in play is in it, because each thing it could name here has a plain word, and its words in this file are for the glossary.'}

**Saying the born tongues.** Every letter is sounded. a as in *about*, ā as in *father*; i as in *bit*, ī as in *machine*; u as in *put*, ū as in *rule*; e as in *they*; o as in *go*. g is always hard, ch is as in *church*, sh as in *ship*. A doubled consonant is held for twice the time, as the k is in *bookcase*. An h is sounded wherever it is written. Below, each name of a born tongue is followed by its syllables, with the stressed one in capitals.

**Letters.** The names shown in play use these letters outside plain English: ${[...DATA.letters].join(' ')}. Names that are not shown use these as well: ${[...DATA.lettersNotShown].join(' ') || 'none'}.

**The twenty names a player meets first.**

${rows.join('\n')}
`;
}

function generated() {
  const g = DATA.generated;
  const tiers = ['| Tier key | Tier word | Register |', '| --- | --- | --- |', ...g.tiers.map((t) => `| \`${t.key}\` | ${t.word} | ${TONGUE[t.tongue]} |`)];
  const tools = g.tools.map((p) => p.word).join(', ');
  const armour = g.armour.map((a) => `${a.style}: ${a.pieces.map((p) => p.word).join(', ')}`).join('; ');
  const count = g.tiers.length * g.tools.length + (g.tiers.length - g.tiers.findIndex((t) => t.key === g.armourFrom)) * g.armour.reduce((n, a) => n + a.pieces.length, 0);
  return `### Names the game puts together

${g.rule}

The rule: \`${g.join}\`. It makes ${count} names, and none is longer than 18 characters. The prompt for a tool that is too soft reads: ${g.prompt}

${tiers.join('\n')}

Tool words: ${tools}. Armour words by the way of fighting, ${armour}. Weapon words: ${g.weapons.join(', ')}.
`;
}

function build() {
  const parts = [guide()];
  for (const [kind, title, lead] of KINDS) {
    const list = DATA.names.filter((e) => e.kind === kind);
    if (list.length === 0) continue;
    parts.push(`## ${title}\n`);
    if (lead) parts.push(lead + '\n');
    if (kind === 'tier') parts.push(generated());
    const full = list.filter((e) => e.tongue !== 'plain' || e.other?.length || e.personal);
    const plain = list.filter((e) => !(e.tongue !== 'plain' || e.other?.length || e.personal));
    if (full.length) {
      if (plain.length) parts.push(`### Names in a tongue, and names other peoples say differently\n`);
      for (const e of full) parts.push(block(e));
    }
    if (plain.length) {
      if (full.length) parts.push(`### Plain English\n`);
      parts.push(plainTable(plain));
    }
  }
  const unknown = DATA.names.filter((e) => !KINDS.some(([k]) => k === e.kind));
  if (unknown.length) throw new Error('names.json has a kind the glossary does not know: ' + unknown[0].kind);
  return parts.join('\n').replace(/\n{3,}/g, '\n\n');
}

const text = build();
const target = join(HERE, '../glossary.md');
if (process.argv.includes('--check')) {
  let now = '';
  try { now = readFileSync(target, 'utf8'); } catch { /* missing */ }
  if (now !== text) { console.log('glossary.md is out of date: run node lang/glossary.mjs'); process.exit(1); }
  console.log('glossary.md is up to date');
} else {
  writeFileSync(target, text);
  console.log(`glossary.md written: ${DATA.names.length} entries`);
}
