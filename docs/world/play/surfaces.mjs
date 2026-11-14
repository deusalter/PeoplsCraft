#!/usr/bin/env node
// surfaces.mjs: reads the game's source and writes text/_surfaces.json.
//
// A surface is a place where the game shows a sentence, or a phrase longer than a name. An entry is one
// string (or one list of strings) that a writer has to supply. Its id is "<surface>:<key>".
//
//   node docs/world/play/surfaces.mjs            write text/_surfaces.json and print the counts
//   node docs/world/play/surfaces.mjs --check    build it, compare with the file on disk, exit 1 if it differs
//   node docs/world/play/surfaces.mjs --root <dir> --check    the same against another copy of the game
//
// Three kinds of entry are made here.
//   1. Entries for every key in src/data (items, blocks, creatures, townsfolk, tasks, countries, places,
//      hardnesses, modifiers, grades, states, attributes). The keys are read from the source. A key that
//      ends with no entry stops the script.
//   2. Entries for sentences that are literals in the code (toasts, banners, prompts, menus, errors). Each is
//      listed below with the file it is in and the text it has now. A literal that is no longer in its file
//      stops the script: the source moved, and the list has to follow it. A literal written in several places records each in `at`.
//      A literal the multiplayer job has put on main and this tree lacks is read from main with git and marked `branch: "main"`.
//   3. Entries that have no text in the game yet: the sites, found things, codex subjects, townsfolk
//      situations and task lines that plan.md adds. Their keys are the constants in the PLANNED section.
//
// No dependencies. Node 18 or later.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// --root <dir> reads another copy of the game (a test plants a fault in a copy and expects this script to stop).
const rootArg = process.argv.indexOf('--root');
const ROOT = rootArg > 0 ? path.resolve(process.argv[rootArg + 1]) : path.resolve(HERE, '../../..');
const OUT = path.join(HERE, 'text', '_surfaces.json');
const problems = [];
const fail = (msg) => { problems.push(msg); };

const cache = new Map();
function src(rel) {
  if (!cache.has(rel)) {
    const p = path.join(ROOT, rel);
    if (!fs.existsSync(p)) { fail(`missing source file ${rel}`); cache.set(rel, ''); }
    else cache.set(rel, fs.readFileSync(p, 'utf8'));
  }
  return cache.get(rel);
}
const lineAt = (text, index) => { let n = 1; for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) n++; return n; };

/** Decode one JS string literal ('..', "..", `..`), or return null when the text is not exactly one. */
function lit(s) {
  s = s.trim();
  const q = s[0];
  if ((q !== "'" && q !== '"' && q !== '`') || s[s.length - 1] !== q || s.length < 2) return null;
  let out = '';
  for (let i = 1; i < s.length - 1; i++) {
    const c = s[i];
    if (c === q) return null;
    if (c === '\\') { const d = s[++i]; out += d === 'n' ? '\n' : d === 't' ? '\t' : d; } else out += c;
  }
  return out;
}
/** Split the arguments of a call. `open` is the index of its '('. Returns the argument texts and the index after ')'. */
function args(text, open) {
  const out = []; let depth = 0, start = open + 1, i = open, q = '';
  for (; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = ''; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') { depth--; if (depth === 0) { out.push(text.slice(start, i)); break; } }
    else if (c === ',' && depth === 1) { out.push(text.slice(start, i)); start = i + 1; }
  }
  return { list: out.map((a) => a.trim()), end: i + 1 };
}
/** Every string literal in a stretch of source, in order. */
function lits(text) {
  const out = []; const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g; let m;
  while ((m = re.exec(text))) out.push(lit(m[0]));
  return out;
}
const STR = `('(?:[^'\\\\\\n]|\\\\.)*'|"(?:[^"\\\\\\n]|\\\\.)*")`;

// ====================================================================================================
// 1. The data tables
// ====================================================================================================
const F_ITEMS = 'src/data/items.ts', F_BLOCKS = 'src/data/blocks.ts', F_MOBS = 'src/data/mobs.ts', F_NPCS = 'src/data/npcs.ts',
  F_QUESTS = 'src/data/quests.ts', F_BIOMES = 'src/data/biomes.ts', F_DIMS = 'src/data/dims.ts', F_STATS = 'src/sim/stats.ts',
  F_RECIPES = 'src/data/recipes.ts', F_LOOT = 'src/data/loot.ts';

// ---- blocks ----
const blocks = [];   // { key, name, desc, line, use }
{
  const t = src(F_BLOCKS), a = t.indexOf('const INIT: BlockInit[] = ['), b = t.indexOf('\n];', a);
  if (a < 0 || b < 0) fail(`${F_BLOCKS}: the INIT table was not found`);
  else {
    const body = t.slice(a, b), base = lineAt(t, a);
    body.split('\n').forEach((ln, i) => {
      if (/^\s*\/\//.test(ln)) return;
      const line = base + i, found = [];
      let m;
      const helper = new RegExp(`\\b(?:rock|wood|leaf|plant|ore)\\('(\\w+)', ${STR}`, 'g');
      while ((m = helper.exec(ln))) found.push([m.index, m[1], lit(m[2])]);
      const obj = new RegExp(`key: '(\\w+)', name: ${STR}`, 'g');
      while ((m = obj.exec(ln))) found.push([m.index, m[1], lit(m[2])]);
      const flow = /\bflow\((\d)\)/g;
      while ((m = flow.exec(ln))) found.push([m.index, 'water' + m[1], 'Water']);
      const altar = new RegExp(`\\baltar\\((\\d), ${STR}`, 'g');
      while ((m = altar.exec(ln))) found.push([m.index, 'altar' + m[1], lit(m[2])]);
      if (!found.length) { if (/\S/.test(ln) && !/^const INIT/.test(ln)) fail(`${F_BLOCKS}:${line}: a line of the block table was not understood: ${ln.trim().slice(0, 70)}`); return; }
      found.sort((x, y) => x[0] - y[0]);
      const d = new RegExp(`desc: ${STR}`).exec(ln), u = /use: '(\w+)'/.exec(ln);
      for (const f of found) blocks.push({ key: f[1], name: f[2], desc: found.length === 1 && d ? lit(d[1]) : '', line, use: found.length === 1 && u ? u[1] : '' });
    });
  }
}
const blockKeys = new Set(blocks.map((b) => b.key));

// ---- items ----
const tiers = [];    // { key, name, line }
const items = [];    // { key, name, desc, line, cls }   cls: one of the classes sorted into writers below
const modifiers = [], rarities = [];
{
  const t = src(F_ITEMS); let m;
  const tr = /\{ key: '(\w+)', name: '([^']+)', mat:/g;
  while ((m = tr.exec(t))) tiers.push({ key: m[1], name: m[2], line: lineAt(t, m.index) });
  if (tiers.length < 10) fail(`${F_ITEMS}: expected ten hardnesses in TIERS, found ${tiers.length}`);
  const mr = /\{ key: '(\w+)', name: '([^']+)', stats:/g;
  while ((m = mr.exec(t))) modifiers.push({ key: m[1], name: m[2], line: lineAt(t, m.index) });
  const ra = /export const RARITY = \[([\s\S]*?)\];/.exec(t);
  if (!ra) fail(`${F_ITEMS}: RARITY was not found`);
  else { const rr = /name: '([^']+)'/g; let i = 0; while ((m = rr.exec(ra[1]))) rarities.push({ key: String(i++), name: m[1], line: lineAt(t, ra.index + ra[0].indexOf(ra[1]) + m.index) }); }

  // hand-written items: calls of mat / add / summon / acc that start a line
  const call = /^(mat|add|summon|acc)\(/gm;
  while ((m = call.exec(t))) {
    const fn = m[1], a = args(t, m.index + fn.length), ki = fn === 'summon' ? 1 : 0, key = lit(a.list[ki] ?? ''), name = lit(a.list[ki + 1] ?? '');
    const line = lineAt(t, m.index);
    if (key === null || name === null) { fail(`${F_ITEMS}:${line}: an item call was not understood`); continue; }
    let desc = '', cls = '';
    if (fn === 'mat') { desc = lit(a.list[6] ?? '') ?? ''; cls = 'material'; }
    else if (fn === 'summon') { desc = lit(a.list[7] ?? '') ?? ''; cls = 'bait'; }
    else if (fn === 'acc') { desc = lit(a.list[7] ?? '') ?? ''; cls = 'trinket'; }
    else {
      const o = a.list[3] ?? '', d = new RegExp(`desc: ${STR}`).exec(o);
      desc = d ? lit(d[1]) : '';
      cls = /weapon:/.test(o) ? 'weapon' : /ammoDmg:/.test(o) ? 'ammo' : /use: '(door|gate\d)'/.test(o) ? 'placed' : /food:|heal:|restoreMana:|buff:|use: 'recall'/.test(o) ? 'food' : '';
      if (!cls) { fail(`${F_ITEMS}:${line}: item '${key}' is of no class this script knows (tool, weapon, armour, ammunition, material, food, trinket, bait, placed)`); continue; }
    }
    items.push({ key, name, desc, line, cls });
  }
  // generated gear: the patterns the generator uses must still be in the source
  const need = (frag, what) => { const i = t.indexOf(frag); if (i < 0) fail(`${F_ITEMS}: the generator for ${what} changed (looked for ${frag})`); return i < 0 ? 0 : lineAt(t, i); };
  const lTool = need('add(`${t.key}_${suffix}`', 'tools'), lSword = need('add(`${t.key}_sword`', 'swords'), lBow = need('add(`${t.key}_bow`', 'bows'),
    lStaff = need('add(`${t.key}_staff`', 'staves'), lTotem = need('add(`${t.key}_totem`', 'totems'), lArm = need('add(`${t.key}_${st}_${slot}`', 'armour'),
    lHide = need('add(`hide_${slot}`', 'the hide pieces');
  need('if (ti >= 2) {', 'the first tier that has staves, totems and armour');
  const tool = /const TOOL[^=]*= \[(.*)\];/.exec(t), suffixes = tool ? [...tool[1].matchAll(/\['(\w+)', '\w+', '(\w+)'/g)].map((x) => [x[1], x[2]]) : [];
  if (suffixes.length !== 3) fail(`${F_ITEMS}: expected three tools in TOOL, found ${suffixes.length}`);
  const styles = [...t.matchAll(/^  (\w+): \{ set: '\w+', pieces: \['(\w+)', '(\w+)', '(\w+)'\]/gm)].map((x) => ({ key: x[1], pieces: [x[2], x[3], x[4]] }));
  if (styles.length !== 4) fail(`${F_ITEMS}: expected four ways of fighting in STYLE_INFO, found ${styles.length}`);
  const tierNames = [...t.matchAll(/names: \['([^']*)', '([^']*)', '([^']*)', '([^']*)'\]/g)];
  tiers.forEach((tier, ti) => {
    const nm = tierNames[ti] ?? [];
    for (const [suf, word] of suffixes) items.push({ key: `${tier.key}_${suf}`, name: `${tier.name} ${word}`, desc: '', line: lTool, cls: 'tool', tier: tier.key });
    items.push({ key: `${tier.key}_sword`, name: nm[1] ?? '', desc: '', line: lSword, cls: 'weapon', tier: tier.key });
    items.push({ key: `${tier.key}_bow`, name: nm[2] ?? '', desc: '', line: lBow, cls: 'weapon', tier: tier.key });
    if (ti >= 2) {
      items.push({ key: `${tier.key}_staff`, name: nm[3] ?? '', desc: '', line: lStaff, cls: 'weapon', tier: tier.key });
      items.push({ key: `${tier.key}_totem`, name: nm[4] ?? '', desc: 'Summons a minion that fights for you.', line: lTotem, cls: 'weapon', tier: tier.key });
      for (const st of styles) st.pieces.forEach((piece, slot) => items.push({ key: `${tier.key}_${st.key}_${slot}`, name: `${tier.name} ${piece}`, desc: '', line: lArm, cls: 'armour', tier: tier.key }));
    }
  });
  ['Cap', 'Vest', 'Trousers'].forEach((p, slot) => items.push({ key: `hide_${slot}`, name: `Hide ${p}`, desc: '', line: lHide, cls: 'armour' }));
}
const hidden = new Set();
{
  const t = src(F_ITEMS), h = /const HIDDEN = new Set\(\[(.*?)\]\)/.exec(t);
  if (!h) fail(`${F_ITEMS}: HIDDEN was not found`); else for (const k of lits(h[1])) hidden.add(k);
}
const itemKeys = new Set(items.map((i) => i.key));

// ---- creatures ----
const mobs = [];     // { key, name, act, hostile, line }   act: the source's way of acting for the creature
const bosses = [];   // { key, name, n, intro, introLine, says: [{ text, line }] }
{
  const t = src(F_MOBS); let m;
  const row = /^\s*\{ key: '(\w+)', name: '([^']+)', hp:.*?\bai: '(\w+)', hostile: (true|false)/gm;
  while ((m = row.exec(t))) mobs.push({ key: m[1], name: m[2], act: m[3], hostile: m[4] === 'true', line: lineAt(t, m.index) });
  for (const [re, act] of [[/\bminion\('(\w+)', '([^']+)'/g, 'minion'], [/\bnpc\('(\w+)', '([^']+)'/g, 'npc']]) while ((m = re.exec(t))) mobs.push({ key: m[1], name: m[2], act, hostile: false, line: lineAt(t, m.index) });
  const br = /\bboss\('(\w+)', '([^']+)'/g, starts = [];
  while ((m = br.exec(t))) starts.push([m.index, m[1], m[2]]);
  starts.forEach((s, i) => {
    const end = i + 1 < starts.length ? starts[i + 1][0] : t.indexOf('\n);', s[0]), body = t.slice(s[0], end);
    const n = /\bn: (\d)/.exec(body), intro = new RegExp(`intro: ${STR}`).exec(body), says = [];
    const sr = new RegExp(`say: ${STR}`, 'g'); let q;
    while ((q = sr.exec(body))) says.push({ text: lit(q[1]), line: lineAt(t, s[0] + q.index) });
    if (!n || !intro) { fail(`${F_MOBS}: the script of ${s[1]} was not understood`); return; }
    bosses.push({ key: s[1], name: s[2], n: +n[1], intro: lit(intro[1]), introLine: lineAt(t, s[0] + intro.index), says });
    mobs.push({ key: s[1], name: s[2], act: 'boss', hostile: true, line: lineAt(t, s[0]) });
  });
  if (bosses.length !== 8) fail(`${F_MOBS}: expected eight great feeders, found ${bosses.length}`);
}

// ---- townsfolk ----
const npcs = [];     // { key, mob, name, why, lines, line, need }
{
  const t = src(F_NPCS), re = new RegExp(`\\{ key: '(\\w+)', mob: '(\\w+)', name: '([^']+)', need: (\\{[^}]*\\}), why: ${STR},\\s*\\n\\s*lines: \\[(.*)\\],\\s*\\n`, 'g'); let m;
  while ((m = re.exec(t))) npcs.push({ key: m[1], mob: m[2], name: m[3], need: m[4], why: lit(m[5]), lines: lits(m[6]), line: lineAt(t, m.index) });
  if (npcs.length !== 8) fail(`${F_NPCS}: expected eight townsfolk, found ${npcs.length}`);
}

// ---- tasks of the Guide ----
const quests = [];   // { key, chapter, title, hint, line }
{
  const t = src(F_QUESTS), re = new RegExp(`\\{ key: '(\\w+)', chapter: ([^,]+), title: ${STR}, hint: ${STR}`, 'g'); let m;
  while ((m = re.exec(t))) quests.push({ key: m[1], chapter: m[2].trim(), title: lit(m[3]), hint: lit(m[4]), line: lineAt(t, m.index) });
  if (quests.length < 40) fail(`${F_QUESTS}: expected the tasks of the Guide, found ${quests.length}`);
}

// ---- countries, places, states, attributes ----
const biomes = [...src(F_BIOMES).matchAll(/\bb\('(\w+)', '([^']+)'/g)].map((m) => ({ key: m[1], name: m[2], line: lineAt(src(F_BIOMES), m.index) }));
if (biomes.length !== 18) fail(`${F_BIOMES}: expected eighteen countries, found ${biomes.length}`);
const dims = [...src(F_DIMS).matchAll(/\{ name: '([^']+)', hasSky/g)].map((m, i) => ({ key: String(i), name: m[1], line: lineAt(src(F_DIMS), m.index) }));
if (dims.length !== 3) fail(`${F_DIMS}: expected three places, found ${dims.length}`);
const attrs = [], buffs = [];
{
  const t = src(F_STATS), a = /export const ATTR_DESC[^{]*\{([\s\S]*?)\n\};/.exec(t), b = /export const BUFFS\b[^=]*=\s*\{([\s\S]*?)\n\};/.exec(t);
  if (!a) fail(`${F_STATS}: ATTR_DESC was not found`); else for (const m of a[1].matchAll(new RegExp(`(\\w+): ${STR}`, 'g'))) attrs.push({ key: m[1], desc: lit(m[2]), line: lineAt(t, a.index + a[0].indexOf(a[1]) + m.index) });
  if (!b) fail(`${F_STATS}: BUFFS was not found`); else for (const m of b[1].matchAll(/(\w+): \{ name: '([^']+)'/g)) buffs.push({ key: m[1], name: m[2], line: lineAt(t, b.index + b[0].indexOf(b[1]) + m.index) });
}
const stations = [...(/STATION_NAMES[^{]*\{([^}]*)\}/.exec(src(F_RECIPES))?.[1] ?? '').matchAll(/(\w+): '([^']+)'/g)].map((m) => ({ key: m[1], name: m[2] }));
const lootTables = [...src(F_LOOT).matchAll(/^\s+(\w+): \{ rolls:/gm)].map((m) => m[1]);

// ====================================================================================================
// Surfaces: what each is, who speaks there (plan.md H), how long a line may be, and whose assignment it is
// ====================================================================================================
// voice: label | sight | note | born | sand.   lines: [fewest, most] when an entry is a list of lines.
const SURFACES = {
  // ---- items-a ----
  'gear.desc':    { about: 'Tooltip line of a tool, weapon, piece of armour or arrow', voice: 'note', limit: 120, assign: 'items-a' },
  'mod.desc':     { about: 'Tooltip line for a modifier on a piece: what it is a fact about (6.10)', voice: 'note', limit: 90, assign: 'items-a' },
  // ---- items-b ----
  'item.desc':    { about: 'Tooltip line of a material, food, tonic, trinket, bait or placed thing', voice: 'note', limit: 120, assign: 'items-b' },
  'block.desc':   { about: 'Tooltip line of a block, shown on its item', voice: 'note', limit: 120, assign: 'items-b' },
  'rarity.desc':  { about: 'Tooltip line for a grade: what it is a fact about (6.10)', voice: 'note', limit: 90, assign: 'items-b' },
  // ---- creatures ----
  'beast.sight':  { about: 'Bestiary, first sight: what it looks like and when it is about (8.9)', voice: 'born', limit: 200, assign: 'creatures' },
  'beast.kill':   { about: 'Bestiary, first kill: what was inside it', voice: 'note', limit: 200, assign: 'creatures' },
  'beast.habit':  { about: 'Bestiary, many kills: its habit (chapter 7)', voice: 'note', limit: 200, assign: 'creatures' },
  'beast.once':   { about: 'Bestiary, one thing seen once: a fact that shows a cause, with where it was seen', voice: 'note', limit: 200, assign: 'creatures' },
  'eight.sight':  { about: 'The eight, first calling: what came up at the stone', voice: 'note', limit: 220, assign: 'creatures' },
  'eight.kill':   { about: 'The eight, first kill: what was inside it and what its remains do', voice: 'note', limit: 220, assign: 'creatures' },
  'eight.loss':   { about: 'The eight, after the first kill: what the crew saw change on the ground (4.12)', voice: 'note', limit: 220, assign: 'creatures' },
  'eight.habit':  { about: 'The eight, third kill of the kind: that another answers, and how it fights', voice: 'note', limit: 220, assign: 'creatures' },
  'eight.once':   { about: 'The eight, one thing seen once', voice: 'note', limit: 220, assign: 'creatures' },
  'eight.said':   { about: 'The eight: what householders say the animal is (4.11)', voice: 'born', limit: 160, assign: 'creatures' },
  'eight.intro':  { about: 'Banner under the name when a great feeder comes up', voice: 'sight', limit: 80, assign: 'creatures' },
  'eight.phase':  { about: 'Toast when a great feeder changes what it does', voice: 'sight', limit: 80, assign: 'creatures' },
  'eight.line':   { about: 'Lines about a great feeder that take its name: {name}', voice: 'sight', limit: 60, assign: 'creatures' },
  // ---- people ----
  'folk.why':     { about: 'What moves a townsperson in, shown on a ready bed as "<name>: <line>"', voice: 'note', limit: 70, assign: 'people' },
  'folk.meet':    { about: 'Townsperson, the first time anyone of the crew trades with them', voice: 'born', limit: 110, assign: 'people' },
  'folk.housed':  { about: 'Townsperson, ordinary lines when trade opens', voice: 'born', limit: 110, lines: [4, 6], assign: 'people' },
  'folk.stage':   { about: 'Townsperson, the first trade after a first kill of the eight; key is <who>.<n>', voice: 'born', limit: 110, lines: [1, 2], assign: 'people' },
  'folk.night':   { about: 'Townsperson, when trade opens at night with the hand on the stone', voice: 'born', limit: 110, lines: [2, 3], assign: 'people' },
  'folk.dark':    { about: 'Townsperson, on the dark night', voice: 'born', limit: 110, lines: [1, 2], assign: 'people' },
  'folk.attack':  { about: 'Townsperson, while packs or a march are at the walls', voice: 'born', limit: 110, lines: [2, 3], assign: 'people' },
  'folk.idle':    { about: 'Townsperson, said unasked when a peopl stands near and does not trade', voice: 'born', limit: 60, lines: [2, 4], assign: 'people' },
  'folk.buy':     { about: 'Townsperson, when the peopl buys', voice: 'born', limit: 70, lines: [1, 2], assign: 'people' },
  'folk.sell':    { about: 'Townsperson, when the peopl sells', voice: 'born', limit: 70, lines: [1, 2], assign: 'people' },
  'folk.short':   { about: 'Townsperson, when the peopl has too little to pay', voice: 'born', limit: 70, assign: 'people' },
  'folk.leave':   { about: 'Townsperson, on the morning the bed is broken', voice: 'born', limit: 90, assign: 'people' },
  'folk.extra':   { about: 'Lines one townsperson has and the others lack', voice: 'born', limit: 110, assign: 'people' },
  'walker.say':   { about: 'A householder on the road, met in a village at dusk', voice: 'born', limit: 110, lines: [1, 6], assign: 'people' },
  'fire.say':     { about: 'Sand-country people at their fire', voice: 'sand', limit: 110, lines: [2, 4], assign: 'people' },
  'march.say':    { about: 'Sand-country fighters on a march, shown over the head', voice: 'sand', limit: 60, lines: [3, 5], assign: 'people' },
  // ---- system ----
  'task.title':   { about: 'Journal task title', voice: 'label', limit: 34, assign: 'system' },
  'task.how':     { about: 'Journal task: how it is done and what completes it', voice: 'label', limit: 160, assign: 'system' },
  'task.said':    { about: 'Journal task from the first room on: the householders\' telling of it, what to do and what it opens', voice: 'born', limit: 130, assign: 'system' },
  'banner':       { about: 'Banner title in the middle of the screen', voice: 'sight', limit: 40, assign: 'system' },
  'banner.sub':   { about: 'Small line under a banner title', voice: 'sight', limit: 60, assign: 'system' },
  'toast':        { about: 'Toast at the lower left', voice: 'label', limit: 90, assign: 'system' },
  'bed':          { about: 'Answer of a bed or a room when it is checked', voice: 'label', limit: 90, assign: 'system' },
  'fall':         { about: 'Lines on the screen at a fall', voice: 'sight', limit: 60, assign: 'system' },
  'realm':        { about: 'Lines on crossing between the three places, and on loading', voice: 'sight', limit: 60, assign: 'system' },
  'country.enter': { about: 'One line the first time the crew stands in a kind of country, under its name', voice: 'sight', limit: 70, assign: 'system' },
  'prompt':       { about: 'Prompt under the crosshair', voice: 'label', limit: 48, assign: 'system' },
  'hud':          { about: 'Short words on the HUD', voice: 'label', limit: 40, assign: 'system' },
  'win':          { about: 'Titles, buttons and hints in the windows', voice: 'label', limit: 150, assign: 'system' },
  'tip':          { about: 'Lines the tooltip writes from numbers', voice: 'label', limit: 70, assign: 'system' },
  'tag.name':     { about: 'Name of a kind of ingredient, which fills {tag} in "Any {tag}"', voice: 'label', limit: 20, assign: 'system' },
  'stat':         { about: 'Name of a bonus, as "+8% <name>"', voice: 'label', limit: 26, assign: 'system' },
  'attr.desc':    { about: 'What an attribute point gives', voice: 'label', limit: 80, assign: 'system' },
  'state.desc':   { about: 'What a state of the body is, under its name in the list of states', voice: 'note', limit: 70, assign: 'system' },
  'menu':         { about: 'Title screen, pause screen and settings', voice: 'label', limit: 90, assign: 'system' },
  'key':          { about: 'What a control does, in the list of controls', voice: 'label', limit: 28, assign: 'system' },
  'error':        { about: 'What a player is told when a connection, a save or a world fails', voice: 'label', limit: 100, assign: 'system' },
  'cmd':          { about: 'Answers of the command line', voice: 'label', limit: 110, assign: 'system' },
  // ---- sites ----
  'site.sight':   { about: 'One line the first time the crew comes on a kind of site', voice: 'sight', limit: 90, assign: 'sites' },
  'codex.seen':   { about: 'Codex: what the crew saw there, or what the thing is in the hand', voice: 'note', limit: 220, assign: 'sites' },
  'codex.read':   { about: 'Codex: what a crew can work out from it, said as a guess', voice: 'note', limit: 220, assign: 'sites' },
  'codex.born':   { about: 'Codex: what householders say of it', voice: 'born', limit: 220, assign: 'sites' },
  'codex.sand':   { about: 'Codex: what the sand-country people say of it, as far as the Deserter tells it', voice: 'sand', limit: 220, assign: 'sites' },
};

const entries = new Map();
const covered = new Set();   // "kind:key" for every key of src/data that some entry needs
function add(surface, key, o = {}) {
  const s = SURFACES[surface];
  if (!s) { fail(`surface '${surface}' is not in SURFACES`); return; }
  const id = `${surface}:${key}`;
  if (entries.has(id)) { fail(`entry ${id} is made twice`); return; }
  const e = { surface, key, needs: o.needs ?? [], file: o.file ?? null, line: o.line ?? null, now: o.now ?? '', voice: o.voice ?? s.voice, limit: o.limit ?? s.limit, assign: s.assign };
  const lines = o.lines ?? s.lines;
  if (lines) e.lines = lines;
  const slots = o.slots ?? [...new Set(e.now.match(/\{[a-z_]+\}/g) ?? [])];
  if (slots.length) e.slots = slots;
  if (o.note) e.note = o.note;
  if (o.planned) e.planned = true;
  if (o.empty) e.empty = true;
  if (o.must) e.must = o.must;
  if (o.at) e.at = o.at;
  if (o.branch) e.branch = o.branch;
  entries.set(id, e);
  for (const n of e.needs) covered.add(n);
}

// ====================================================================================================
// 3. PLANNED: keys that plan.md adds and the game does not have yet
// ====================================================================================================
// New blocks (plan.md A). The names shown are proposals for names.json, which is where a name is fixed.
const PLANNED_BLOCKS = [
  ['salt_crust', 'the white floor of a clean salt pan at the shore (3.2 beach)'],
  ['snow_prints', 'a print in snow; a run of them begins in clean snow (3.2 tundra)'],
  ['ash_glass', 'the floor under a sand-country fire; a token is a piece of it (5.3)'],
  ['great_fire', 'the one fire of a sand-country place, burning day and night (3.2 desert)'],
  ['charred_planks', 'a hearth floor burned black in some villages of the dry grass (3.2 savanna)'],
  ['rough_block', 'a block cut free in a quarry and dressed on one face only (3.2 crags)'],
  ['ward_core', 'a ward core cut on another world, found under an old hearthstone (6.11)'],
  ['cairn_base', 'the dressed stone of the base under the eighth kind of stone; it looks broken once boss:8 is set (4.10)'],
];
// New items (plan.md A and G).
const PLANNED_ITEMS = [
  ['cutter_saw', 'gear.desc', 'a two-handled steel saw from another world, found at the bottom of a shaft sunk to the floor (6.11)'],
  ['pot_crystal', 'item.desc', 'a single crystal in the shape of the inside of a jar: a store where the salt failed and nothing found the lees (6.11)'],
];
// Sites: the thirteen structures the generator builds, and the ones plan.md A adds.
const SITES_BUILT = ['village', 'ruin', 'dungeon', 'cache1', 'cache2', 'arena1', 'arena2', 'arena3', 'arena4', 'arena5', 'arena6', 'arena7', 'arena8'];
const SITES_NEW = ['crossing', 'pan', 'fold', 'lone_tree', 'prints', 'fire_ring', 'burned_hearths', 'tree_floor', 'quarry', 'column', 'lamp_row', 'stump', 'shaft', 'hearth'];
// Codex subjects other than creatures and the eight (plan.md D): key and the steps each has.
const SBR = ['seen', 'read'], SBRB = ['seen', 'read', 'born'], ALL4 = ['seen', 'read', 'born', 'sand'];
const CODEX = [
  // the three places
  ['place:0', SBRB], ['place:1', SBRB], ['place:2', SBR],
  // sites
  ['site:village', SBRB], ['site:ruin', ALL4], ['site:dungeon', ALL4], ['site:cache1', SBR], ['site:cache2', SBR],
  ['site:arena1', ALL4], ['site:arena2', ALL4], ['site:arena3', SBR], ['site:arena4', SBR], ['site:arena5', SBR], ['site:arena6', SBR], ['site:arena7', SBRB], ['site:arena8', ALL4],
  ['site:crossing', SBR], ['site:pan', SBR], ['site:fold', SBR], ['site:lone_tree', SBR], ['site:prints', SBR], ['site:fire_ring', ALL4], ['site:burned_hearths', ['seen', 'born', 'sand']],
  ['site:tree_floor', SBR], ['site:quarry', SBR], ['site:column', SBR], ['site:lamp_row', SBR], ['site:stump', SBR], ['site:shaft', SBR], ['site:hearth', SBRB],
  // matter that is no hardness
  ['matter:gold', SBR], ['matter:lees', ALL4], ['matter:crystal', ALL4], ['matter:salt', SBR], ['matter:remains', ALL4], ['matter:great_remains', ALL4],
  // the peoples
  ['people:householders', ['seen', 'read', 'sand']], ['people:sand', SBRB], ['people:peopls', ['read', 'born', 'sand']],
  // old things
  ['old:cutter_saw', SBR], ['old:ward_core', SBR], ['old:pot_crystal', SBR], ['old:made_bait', ALL4], ['old:old_bed', SBRB], ['old:recall_stone', SBRB], ['old:token', ['seen', 'read', 'sand']],
  // the ground: what a crew knows of how this ground works (1.10)
  ['ground:floor', SBR], ['ground:set', SBR], ['ground:way', ALL4], ['ground:light', SBR], ['ground:moon', SBRB], ['ground:ward', ALL4], ['ground:hosts', ALL4], ['ground:mouth', SBRB],
];
// Hardnesses that householders dispute (6.2): these have a born step.
const MATERIAL_BORN = new Set(['lumenite', 'cinder', 'umbrite']);
// The first stage of the eight each townsperson can speak of: the one after the kill that brought them, or 1.
const STAGE_FROM = { wayfinder: 1, provisioner: 1, smith: 1, apothecary: 2, tinker: 2, runescribe: 1, beastcaller: 4, deserter: 3 };
// Tasks that are the cutter's own trade and need no telling (1.6 The Guide): everything before the first room.
const FIRST_TOLD = 'house';
// Creatures no householder has watched from a hearth (hollow, islands, sealed stores, beside the eight): their first sight is a crew's note.
const SIGHT_BY_CREW = new Set(['stonegnawer', 'cave_skitter', 'rustbound', 'sporeling', 'mycelid_knight', 'umbral_moth', 'glowmaw', 'rift_ray', 'shardling', 'aether_wisp', 'sproutling', 'dune_mite',
  'm_thornling', 'm_wisp', 'm_brazier', 'm_shade', 'm_mycelid', 'm_zephyr', 'm_shardling', 'm_moon', 'm_cairn']);

// ====================================================================================================
// Entries from the data tables
// ====================================================================================================
// ---- blocks: one entry for each block a player can hold or look up; states of one block share an entry ----
const BLOCK_STATE = { furnace_lit: 'furnace', berry_bush_empty: 'berry_bush', hollow_portal: 'hollow_frame', rift_portal: 'rift_frame' };
for (let n = 1; n <= 7; n++) BLOCK_STATE['water' + n] = 'water';
// A state plan.md adds (C, row 17). It shares the entry of its block once the block table has it.
const PLANNED_STATES = { guest_bed_held: 'guest_bed' };
for (const [k, v] of Object.entries(PLANNED_STATES)) if (blockKeys.has(k)) BLOCK_STATE[k] = v;
const DOORS = ['door_x', 'door_z', 'door_x_open', 'door_z_open'];
const NEVER_SHOWN = new Map([['block:air', 'air is never named or described']]);
for (const b of blocks) {
  if (b.key === 'air' || BLOCK_STATE[b.key] || DOORS.includes(b.key)) continue;
  const needs = ['block:' + b.key, ...Object.entries(BLOCK_STATE).filter(([, v]) => v === b.key).map(([k]) => 'block:' + k)];
  if (!hidden.has(b.key)) needs.push('item:' + b.key);
  const st = stations.find((s) => s.key === b.use || (s.key === 'tinker' && b.key === 'tinker_bench'));
  if (st) needs.push('station:' + st.key);
  add('block.desc', b.key, { needs, file: F_BLOCKS, line: b.line, now: b.desc });
}
for (const [k, why] of PLANNED_BLOCKS) add('block.desc', k, { planned: true, note: why });
for (const k of Object.keys(BLOCK_STATE)) if (!blockKeys.has(k)) fail(`${F_BLOCKS}: the block state '${k}' this script folds into another block is gone`);
for (const k of DOORS) if (!blockKeys.has(k)) fail(`${F_BLOCKS}: the door block '${k}' is gone`);

// ---- items ----
for (const it of items) {
  const surface = it.cls === 'tool' || it.cls === 'weapon' || it.cls === 'armour' || it.cls === 'ammo' ? 'gear.desc' : 'item.desc';
  const needs = ['item:' + it.key];
  if (it.key === 'door') for (const d of DOORS) needs.push('block:' + d);
  add(surface, it.key, { needs, file: F_ITEMS, line: it.line, now: it.desc, note: it.tier ? `made by the generator; hardness ${it.tier}` : undefined });
}
for (const [k, surface, why] of PLANNED_ITEMS) add(surface, k, { planned: true, note: why });
if (!stations.some((s) => s.key === 'hand')) fail(`${F_RECIPES}: the station 'hand' is gone`);
for (const m of modifiers) add('mod.desc', m.key, { needs: ['mod:' + m.key], file: F_ITEMS, line: m.line });
for (const r of rarities) add('rarity.desc', r.key, { needs: ['rarity:' + r.key], file: F_ITEMS, line: r.line, note: `the grade shown as ${r.name}` });

// ---- creatures ----
const npcMobs = new Set(npcs.map((n) => n.mob));
for (const m of mobs) {
  if (m.act === 'boss') continue;
  if (m.act === 'npc') { if (!npcMobs.has(m.key)) fail(`${F_MOBS}:${m.line}: the townsperson body '${m.key}' belongs to nobody in ${F_NPCS}`); continue; }
  if (!['passive', 'fish', 'melee', 'ranged', 'hopper', 'flyer', 'minion'].includes(m.act)) { fail(`${F_MOBS}:${m.line}: creature '${m.key}' has a way of acting ('${m.act}') this script does not know`); continue; }
  const needs = ['mob:' + m.key];
  add('beast.sight', m.key, { needs, file: F_MOBS, line: m.line, voice: SIGHT_BY_CREW.has(m.key) ? 'note' : 'born' });
  for (const step of ['kill', 'habit', 'once']) add('beast.' + step, m.key, { needs, file: F_MOBS, line: m.line });
}
for (const b of bosses) {
  const needs = ['mob:' + b.key, 'boss:' + b.n];
  for (const step of ['sight', 'kill', 'loss', 'habit', 'once', 'said']) add('eight.' + step, b.key, { needs, file: F_MOBS, line: b.introLine });
  add('eight.intro', b.key, { needs, file: F_MOBS, line: b.introLine, now: b.intro });
  b.says.forEach((s, i) => add('eight.phase', `${b.key}.${i + 1}`, { needs, file: F_MOBS, line: s.line, now: s.text }));
}

// ---- townsfolk ----
for (const n of npcs) {
  const needs = ['npc:' + n.key, 'mob:' + n.mob], voice = n.key === 'deserter' ? 'sand' : undefined;   // the Deserter is a sand-country man (5.5)
  add('folk.why', n.key, { needs, file: F_NPCS, line: n.line, now: n.why, note: `the game's condition: need ${n.need}` });
  add('folk.meet', n.key, { needs, voice, planned: true, must: ['peopl'], note: 'the townsperson calls the player peopl to the face (1.5, 8.10)' });
  add('folk.housed', n.key, { needs, voice, file: F_NPCS, line: n.line + 1, now: n.lines.join(' | ') });
  const from = STAGE_FROM[n.key];
  if (!from) { fail(`${F_NPCS}:${n.line}: townsperson '${n.key}' has no first stage in STAGE_FROM`); continue; }
  for (let s = from; s <= 8; s++) add('folk.stage', `${n.key}.${s}`, { needs: [...needs, 'boss:' + s], voice, planned: true });
  for (const sit of ['night', 'dark', 'attack', 'idle', 'buy', 'sell', 'short', 'leave']) add('folk.' + sit, n.key, { needs, voice, planned: true });
}
add('folk.extra', 'wayfinder.moon_tonight', { needs: ['npc:wayfinder', 'event:moon'], file: 'src/ui/windows.ts', ...find('src/ui/windows.ts', 'Amāvassa is tonight. The Chandasāvak carry the slivers.') });
add('folk.extra', 'wayfinder.moon_in', { needs: ['npc:wayfinder', 'event:moon'], file: 'src/ui/windows.ts', ...find('src/ui/windows.ts', 'Amāvassa is in ${moon} night', 'Amāvassa is in {n} night(s).'), note: 'two forms are needed: one night, and {n} nights' });
add('folk.extra', 'wayfinder.moon_in_one', { needs: ['npc:wayfinder', 'event:moon'], planned: true, note: 'the form for one night' });
add('folk.extra', 'wayfinder.next', { needs: ['npc:wayfinder'], file: 'src/ui/windows.ts', ...find('src/ui/windows.ts', "'Next: '", 'Next: {said}'), limit: 20, note: 'what comes before the telling of the next task; {said} is the task.said line, and the text may be {said} alone' });
add('folk.extra', 'deserter.burrower', { needs: ['npc:deserter', 'boss:2'], voice: 'sand', planned: true, note: 'said once: what was in the body of the burrower when the crew boiled it down (4.4)' });
add('walker.say', 'dusk', { planned: true, lines: [4, 6] });
add('walker.say', 'dark', { planned: true, lines: [1, 2], needs: ['event:moon'] });
add('walker.say', 'raid', { planned: true, lines: [1, 2], needs: ['event:raid'] });
for (const k of ['before', 'after', 'night', 'struck', 'fuel']) add('fire.say', k, { planned: true, note: { before: 'by day, before boss:2 is set', after: 'by day, once boss:2 is set', night: 'at night inside the light', struck: 'when a peopl strikes one of them or breaks a piece of the place', fuel: 'when a peopl sets timber or coal down inside the ring' }[k] });
add('march.say', 'march', { planned: true, needs: ['event:ashen'] });
add('march.say', 'beaten', { planned: true, needs: ['event:ashen'], lines: [2, 3] });

// ---- tasks ----
{
  let told = false;
  for (const q of quests) {
    if (q.key === FIRST_TOLD) told = true;
    const needs = ['quest:' + q.key];
    add('task.title', q.key, { needs, file: F_QUESTS, line: q.line, now: q.title });
    add('task.how', q.key, { needs, file: F_QUESTS, line: q.line, now: q.hint });
    if (told) add('task.said', q.key, { needs, planned: true });
  }
  if (!told) fail(`${F_QUESTS}: the task '${FIRST_TOLD}', where the householders' telling begins, is gone`);
}

// ---- countries, places, hardnesses, states, attributes ----
for (const b of biomes) {
  const needs = ['biome:' + b.key];
  add('country.enter', b.key, { needs, file: F_BIOMES, line: b.line, planned: true });
  add('codex.seen', 'country:' + b.key, { needs, planned: true });
  add('codex.read', 'country:' + b.key, { needs, planned: true });
}
for (const t of tiers) {
  const needs = ['tier:' + t.key];
  add('codex.seen', 'material:' + t.key, { needs, file: F_ITEMS, line: t.line, planned: true });
  add('codex.read', 'material:' + t.key, { needs, planned: true });
  if (MATERIAL_BORN.has(t.key)) add('codex.born', 'material:' + t.key, { needs, planned: true });
}
for (const a of attrs) add('attr.desc', a.key, { needs: ['attr:' + a.key], file: F_STATS, line: a.line, now: a.desc });
for (const b of buffs) add('state.desc', b.key, { needs: ['buff:' + b.key], file: F_STATS, line: b.line, planned: true });
for (const s of SITES_BUILT) add('site.sight', s, { needs: ['site:' + s], planned: true });
for (const s of SITES_NEW) add('site.sight', s, { needs: ['site:' + s], planned: true });
for (const [key, steps] of CODEX) {
  const needs = [];
  const m = /^place:(\d)$/.exec(key);
  if (m) needs.push('dim:' + m[1]);
  for (const st of steps) add('codex.' + st, key, { needs, planned: true });
}

// ====================================================================================================
// 2. Sentences that are literals in the code
// ====================================================================================================
/** Every index of `form` in `t`. */
function allAt(t, form) { const out = []; for (let i = t.indexOf(form); i >= 0; i = t.indexOf(form, i + form.length)) out.push(i); return out; }
/** The first form of a needle (quoted three ways, then bare) that occurs in `t`, or null. */
function formIn(t, needle) { return [`'${needle.replace(/'/g, "\\'")}'`, `"${needle}"`, '`' + needle + '`', needle].find((f) => t.includes(f)) ?? null; }
/**
 * Find a literal in a file. Returns { line, now, at }. `now` defaults to the text looked for. `line` is the first line it is on;
 * `at` lists every place it is written, as "file:line", in this file and in each of `alsoIn`, when there is more than one. The loader
 * replaces the literal at every place `at` lists (plan.md J step 4). `alsoAt` gives [file, needle] pairs: the same words written by
 * other code in another form, each place of which is added to `at`.
 */
function find(file, needle, now, alsoIn = [], alsoAt = []) {
  const t = src(file), form = formIn(t, needle);
  if (!form) { fail(`${file}: the text "${needle}" is no longer there`); return { line: null, now: now ?? needle }; }
  const at = allAt(t, form).map((i) => `${file}:${lineAt(t, i)}`);
  for (const f of alsoIn) {
    // a copy the multiplayer job has put on main and this tree lacks is listed with "(main)" after it
    let u = src(f), g = formIn(u, needle), tag = '';
    if (!g) { const m = mainSrc(f); g = m === null ? null : formIn(m, needle); if (g) { u = m; tag = ' (main)'; } }
    if (!g) { fail(`${f}: the text "${needle}" is no longer there`); continue; }
    for (const i of allAt(u, g)) at.push(`${f}:${lineAt(u, i)}${tag}`);
  }
  // the same words written by other code, in another form (a concatenation where the first place has a template, or the like)
  for (const [f, n] of alsoAt) {
    const u = src(f), g = formIn(u, n);
    if (!g) { fail(`${f}: the text "${n}" is no longer there`); continue; }
    for (const i of allAt(u, g)) at.push(`${f}:${lineAt(u, i)}`);
  }
  return { line: lineAt(t, t.indexOf(form)), now: now ?? needle, ...(at.length > 1 ? { at } : {}) };
}
/** One literal sentence: surface, key, file, the text to look for, and what to record as the present text when it differs. */
function L(surface, key, file, needle, o = {}) {
  add(surface, key, { file, ...find(file, needle, o.now, o.alsoIn, o.alsoAt), needs: o.needs, voice: o.voice, limit: o.limit, lines: o.lines, note: o.note, empty: o.empty, slots: o.slots });
}
/**
 * A literal the multiplayer job has put on `main` and this tree does not have yet. When the text is in this tree's file it is an
 * ordinary literal. Otherwise it is looked for in `main` (git show main:<file>), and the entry records where it is there, with
 * `branch: "main"`. After the merge every such entry is an ordinary one, and surfaces.mjs is run again (plan.md J step 2).
 */
let mainGit = null;
function mainSrc(file) {
  mainGit ??= new Map();
  if (!mainGit.has(file)) {
    let t = null;
    try { t = execFileSync('git', ['-C', HERE, 'show', `main:${file}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { t = null; }
    mainGit.set(file, t);
  }
  return mainGit.get(file);
}
function LM(surface, key, file, needle, o = {}) {
  if (formIn(src(file), needle)) { L(surface, key, file, needle, o); return; }
  const t = mainSrc(file);
  if (t === null) { fail(`${file}: the text "${needle}" is not in this tree, and main could not be read with git`); return; }
  const form = formIn(t, needle);
  if (!form) { fail(`${file}: the text "${needle}" is in neither this tree nor main`); return; }
  const at = allAt(t, form).map((i) => `${file}:${lineAt(t, i)}`);
  add(surface, key, { file, line: lineAt(t, t.indexOf(form)), ...(at.length > 1 ? { at } : {}), now: o.now ?? needle, needs: o.needs, voice: o.voice, limit: o.limit, slots: o.slots,
    branch: 'main', note: o.note });
}
const G = 'src/game.ts', ACT = 'src/sim/actions.ts', EV = 'src/sim/events.ts', TRV = 'src/sim/travel.ts', NPC = 'src/sim/npcs.ts', PLY = 'src/sim/player.ts',
  GATE = 'src/sim/gates.ts', OPS = 'src/sim/invops.ts', CMB = 'src/client/combat.ts', WIN = 'src/ui/windows.ts', MENU = 'src/ui/menus.ts', HUD = 'src/ui/hud.ts',
  QV = 'src/ui/questView.ts', HOST = 'src/net/host.ts', MAIN = 'src/main.ts', IDB = 'src/storage/idb.ts', CH = 'src/sim/cheats.ts', INVC = 'src/client/invclient.ts',
  SRC = 'src/data/sources.ts', RULES = 'src/sim/rules.ts', SIM = 'src/sim/sim.ts', WORKER = 'src/net/worker-client.ts';

// ---- the three attacks ----
L('banner', 'raid.start', EV, 'A raid gathers in the dark', { needs: ['event:raid'] });
L('banner.sub', 'raid.start', EV, 'Hold until dawn or break them', { needs: ['event:raid'] });
L('banner', 'ashen.start', EV, 'A march from the sand country', { needs: ['event:ashen'] });
L('banner.sub', 'ashen.start', EV, 'Beat them off before dusk', { needs: ['event:ashen'] });
L('banner', 'moon.start', EV, "'Amāvassa', 'The moon is dark tonight'", { now: 'Amāvassa', needs: ['event:moon'], note: 'the name of the night, from names.json' });
L('banner.sub', 'moon.start', EV, 'The moon is dark tonight', { needs: ['event:moon'] });
L('banner', 'moon.end', EV, 'The moon sets', { needs: ['event:moon'] });
L('banner', 'raid.won', EV, 'The raid is broken', { needs: ['event:raid'] });
L('banner', 'ashen.won', EV, 'The march is beaten off', { needs: ['event:ashen'] });
L('banner.sub', 'event.won', EV, '`+${coins} coins`', { now: '+{n} coins' });
L('banner', 'raid.lost', EV, 'Dawn scatters the raid', { needs: ['event:raid'] });
L('banner', 'ashen.lost', EV, 'The march turns for home', { needs: ['event:ashen'] });
L('hud', 'event.raid', INVC, 'Night raid  ${ev.k} / ${ev.g}', { now: 'Night raid  {k} / {g}', needs: ['event:raid'], note: 'plan D.2: {k} counts feeders only; a sand-country fighter killed in a raid adds nothing to it' });
L('hud', 'event.ashen', INVC, 'Sand March  ${ev.k} / ${ev.g}', { now: 'Sand March  {k} / {g}', slots: [], needs: ['event:ashen'],
  note: 'plan D.2: the line shows no count, since the count is of sand-country people killed (rule 12); it is the name of the march alone' });
L('hud', 'event.moon', INVC, "case 'moon': return 'Amāvassa'", { now: 'Amāvassa', needs: ['event:moon'] });
// ---- the eight ----
L('eight.line', 'withdraws', 'src/sim/boss.ts', '${m.def.name} withdraws.', { now: '{name} withdraws.' });
L('eight.line', 'fallen', 'src/sim/loot.ts', '${d.name} has fallen', { now: '{name} has fallen' });
L('eight.line', 'fallen.sub', 'src/sim/loot.ts', 'Check the guide for what this unlocks');
L('eight.line', 'night_only', ACT, 'Kuranga comes up only at night.', { needs: ['boss:7'] });
L('eight.line', 'altar_waits', ACT, 'The altar waits for ${article(name)} ${name}.', { now: 'The altar waits for {a} {item}.' });
add('eight.line', 'dawn_down', { needs: ['boss:7'], planned: true, now: '', slots: ['{name}'], note: 'plan C: the strongest of the deep kind goes back down at dawn' });
// ---- banners of the crew ----
L('banner', 'moved_in', NPC, '${n.name} has moved in', { now: '{name} has moved in' });
L('banner', 'level', PLY, 'Level ${st.level}', { now: 'Level {n}', voice: 'label' });
L('banner.sub', 'level', PLY, '+2 attribute points · press E to spend', { voice: 'label' });
L('banner', 'morning', ACT, "'Morning'", { now: 'Morning' });
L('banner.sub', 'morning', ACT, 'You wake rested');
L('banner.sub', 'first', TRV, 'Click to look around · E for inventory · G for the guide', { voice: 'label', note: 'under the name of the world, the first time a player stands on the ground over the mouth' });
// ---- toasts ----
L('toast', 'task_done', 'src/sim/quests.ts', 'Guide: ${q.title} ✔  (+${xp} xp)', { now: 'Guide: {title} ✔  (+{xp} xp)', note: 'the tick is not in the font' });
L('toast', 'folk_leaves', NPC, '${d.name} has nowhere to stay and leaves.', { now: '{name} has nowhere to stay and leaves.' });
L('toast', 'gate_dark', GATE, 'The gate goes dark.', { voice: 'sight' });
L('toast', 'gate_ground', GATE, 'Place the gate on the ground.');
L('toast', 'gate_space', GATE, 'The gate needs a clear space 4 wide and 5 tall.');
L('toast', 'pack_full', PLY, 'Inventory full');
L('toast', 'no_room', OPS, 'No room in your pack');
L('toast', 'worn_twice', OPS, 'Already wearing one: a second adds nothing', { alsoIn: [RULES] });
L('toast', 'recipe_here', OPS, 'That recipe cannot be laid out here');
L('toast', 'not_enough', OPS, "'Not enough '", { now: 'Not enough {thing}' });
L('toast', 'last_footing', PLY, 'You are back on the last footing.', { voice: 'sight' });
L('toast', 'coins', ACT, '`+${coins} coins`', { now: '+{n} coins' });
L('toast', 'bed_place', ACT, 'A bedroll marks your place only on the living ground.');
L('toast', 'no_rest', ACT, 'You cannot rest with enemies near.');
L('toast', 'bed_set', ACT, 'Spawn point set.');
L('toast', 'folk_ground', ACT, 'Townsfolk settle only on the living ground.', { alsoIn: [NPC] });
L('toast', 'bed_gone', TRV, 'Your bedroll is gone. Returned to the world spawn.');
LM('toast', 'bed_lost', PLY, 'Your bedroll is gone.', { note: 'tickSleep, once a second: the block of a bed the player has set is no longer a bed. The player stays where they are; toast:bed_gone is the line when they are sent to the spawn' });
LM('toast', 'bait_returned', 'src/sim/boss.ts', 'The offering is returned to you.', { note: 'refund(): a fight ended unfinished and the bait goes back to the player who laid it, into the pack, or into the mail when the pack is full' });
L('toast', 'no_land', TRV, 'No land within reach. Build outward from the gate.');
L('toast', 'restarted', G, 'Server restarted');
L('toast', 'use_at_altar', CMB, 'Use this at its altar. The guide points the way.');
L('toast', 'stone_warm', CMB, 'The stone is still warm.', { voice: 'sight' });
L('toast', 'no_arrows', CMB, 'No arrows');
L('toast', 'no_arm', CMB, 'Not enough mana');
L('toast', 'no_salves', CMB, 'No salves');
L('toast', 'full_health', CMB, 'Already at full health');
L('toast', 'salve_wait', CMB, 'Salves need ${Math.ceil(st.salveCd)}s more', { now: 'Salves need {n}s more' });
L('toast', 'made_at', WIN, "'Made at the '", { now: 'Made at the {station}' });
L('toast', 'made_n', WIN, 'Made ${q.n} ${item(r.out).name}', { now: 'Made {n} {item}' });
L('toast', 'sell_again', WIN, "'Shift-click again to sell '", { now: 'Shift-click again to sell {item}' });
L('toast', 'sold', OPS, 'Sold ${itemName(t)}', { now: 'Sold {item} x{n} for {coins} coins', slots: ['{item}', '{n}', '{coins}'], voice: 'label', limit: 90,
  note: 'a stack sold at a shop. Today the code writes the count after the name with " x" and writes no count for one, the join tip:needs_n also has; the line puts {n} where the count is read, and for one the code fills {n} {item} with the name alone' });
L('toast', 'pickup', HUD, '+${n} ${name}  (${total})', { now: '+{n} {item}  ({total})' });
L('toast', 'no_burn', RULES, 'That does not burn', { note: 'a refusal shown as a toast when a thing that is no fuel is put under a furnace (src/sim/invops.ts)' });
L('toast', 'no_smelt', RULES, 'That cannot be smelted', { note: 'a refusal shown as a toast when a thing no furnace works is put in one' });
L('toast', 'needs_forge', RULES, "'Needs a '", { now: 'Needs a {forge}', note: '{forge} is the name of the furnace that works the ore' });
L('toast', 'needs_hotter', RULES, 'hotter forge', { now: 'Needs a hotter forge', note: 'the same refusal when no furnace of the table works the ore' });
add('toast', 'codex_new', { planned: true, slots: ['{subject}'], note: 'plan D: a step of the codex has opened; {subject} is the name of the subject' });
// ---- beds and rooms ----
L('bed', 'not_enclosed_big', NPC, 'The room is not enclosed (or is larger than 32 blocks across).');
L('bed', 'not_enclosed', NPC, 'The room is not enclosed.');
L('bed', 'too_small', NPC, 'The room is too small.');
L('bed', 'no_door', NPC, 'The room needs a door.');
L('bed', 'no_light', NPC, 'The room needs a light source.');
L('bed', 'lives_here', NPC, '.name} lives here.', { now: '{name} lives here.' });
L('bed', 'ready', NPC, "'This room is ready. '", { now: 'This room is ready. ' });
L('bed', 'soon', NPC, 'Someone will arrive shortly.');
L('bed', 'all_housed', NPC, 'Everyone has a home.');
// ---- a fall ----
L('fall', 'title', MENU, 'YOU FELL');
L('fall', 'rise', MENU, 'Rise again');
L('fall', 'lost', MENU, ' · ${lost} coins lost', { now: ' · {n} coins lost' });
L('fall', 'cause.fall', G, 'The ground was farther than it looked');
L('fall', 'cause.lava', G, 'Lava does not negotiate');
L('fall', 'cause.void', G, 'There was nothing under you');
L('fall', 'cause.hunger', G, "'Starved'", { now: 'Starved' });
L('fall', 'cause.slain', G, 'Slain by ${c}', { now: 'Slain by {name}' });
L('fall', 'cause.shot', 'src/sim/projectiles.ts', "'a projectile'", { now: 'Slain by a projectile', note: 'the cause a projectile that strikes a player sends (src/sim/projectiles.ts), which the fall screen writes into fall:cause.slain today (src/game.ts:302); the loader writes this whole line in place of that one when the cause is this literal' });
L('fall', 'cause.none', G, 'You did not get back up', { note: 'shown when a player joins already down; no text may write an arrival\'s death (8.11)' });
L('fall', 'at', G, '  ·  at ${m.at[1]}, ${m.at[2]}, ${m.at[3]}', { now: '  ·  at {x}, {y}, {z}', voice: 'label' });
// ---- the three places ----
L('realm', 'enter.1', TRV, 'No sky here. Bring light.', { needs: ['dim:1'] });
L('realm', 'enter.2', TRV, 'Mind the edges', { needs: ['dim:2'] });
L('realm', 'cross.home', TRV, 'Returning to the living ground', { needs: ['dim:0'] });
L('realm', 'cross.out', TRV, 'Crossing to ${DIM_NAMES[to]}', { now: 'Crossing to {place}' });
L('realm', 'returning', TRV, "'Returning'", { now: 'Returning' });
L('realm', 'raising', G, 'Raising the land');
L('realm', 'compass.in', QV, 'In ${DIM_NAMES[dim]}', { now: 'In {place}', voice: 'label' });
L('realm', 'compass.here', QV, 'You are here', { voice: 'label' });
L('realm', 'compass.altar', QV, 'Nearest altar: ${Math.round(d)} m ${dir}', { now: 'Nearest altar: {n} m {direction}  ({x}, {z})', voice: 'label' });
// the eight directions that fill {direction} of realm:compass.altar, in the order of the list in questView.ts
for (const [k, now] of [['e', 'east'], ['se', 'south-east'], ['s', 'south'], ['sw', 'south-west'], ['w', 'west'], ['nw', 'north-west'], ['n', 'north'], ['ne', 'north-east']])
  L('realm', 'dir.' + k, QV, "['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east']", { now, voice: 'label', limit: 12, note: 'the direction of the nearest stone, put into {direction} of realm:compass.altar' });
// the three places as they stand inside a sentence: DIM_NAMES, which fills {place} of realm:compass.in and realm:cross.out
for (const [n, now] of [[0, 'the living ground'], [1, 'the hollow'], [2, 'the islands']])
  L('realm', 'place.' + n, 'src/core/constants.ts', "['the living ground', 'the hollow', 'the islands']", { now, needs: ['dim:' + n], voice: 'label', limit: 24,
    note: 'the name of the place from names.json, with its article in lower case, as it stands inside a sentence; it fills {place} of realm:compass.in (src/ui/questView.ts) and realm:cross.out (src/sim/travel.ts)' });
// ---- prompts ----
L('prompt', 'offer', G, 'Right-click: offer the ${it.name}', { now: 'Right-click: offer the {item}' });
L('prompt', 'needs_bait', G, 'Needs ${article(it.name)} ${it.name}', { now: 'Needs {a} {item}' });
L('prompt', 'trade', G, 'Right-click: trade with ${r.m.def.name}', { now: 'Right-click: trade with {name}' });
L('prompt', 'night_only', G, 'Answers only at night', { needs: ['boss:7'] });
L('prompt', 'bed', G, 'Right-click: rest / set spawn');
L('prompt', 'room', G, 'Right-click: check this room');
L('prompt', 'berries', G, 'Right-click: pick berries');
L('prompt', 'open', G, 'Right-click: open');
L('prompt', 'needs_pick', G, 'Needs ${article(tier)} ${tier} pick or better', { now: 'Needs {a} {tier} pick or better' });
L('prompt', 'take_control', G, 'Click to take control');
L('prompt', 'resume', MENU, 'Click to resume');
// ---- HUD ----
L('hud', 'no_arrows', HUD, '  ·  no arrows', { now: '  ·  no arrows' });
L('hud', 'hungry', HUD, 'HUNGRY ${foodI} / 20', { now: 'HUNGRY {n} / 20' });
L('hud', 'saved', HUD, "'Saved'", { now: 'Saved' });
L('hud', 'coins', HUD, '${inv.coins} coins', { now: '{n} coins', alsoAt: [[WIN, "inv.coins + ' coins'"]], note: 'the coins on the HUD, and the same words at the head of the inventory window' });
L('hud', 'level', HUD, 'Lv ${st.level}', { now: 'Lv {n}' });
L('hud', 'dodged', PLY, "'Dodged'", { now: 'Dodged', note: 'a word that floats up over a player when a blow does no harm' });
L('hud', 'coords', HUD, 'X ${x}  Y ${y}  Z ${z}  ·  ${Math.floor(min / 60)}', { now: 'X {x}  Y {y}  Z {z}  ·  {h}:{mm}', voice: 'label',
  note: 'the line of position and time of day under the compass; {h} is the hour and {mm} the minutes in two digits. The font has no middle dot: the code writes the line as the text gives it' });
L('hud', 'dist.m', HUD, "' m'", { now: '{n} m', limit: 16, note: 'the distance under the compass marker, below 1000; {n} is a whole number' });
L('hud', 'dist.km', HUD, "' km'", { now: '{n} km', limit: 24, note: 'the distance under the compass marker from 1000 on; {n} is the distance in thousands, with one decimal' });
// the eight points of the compass strip, in the order of COMPASS_NAMES (every other one is drawn small)
for (const [k, now] of [['n', 'N'], ['ne', 'NE'], ['e', 'E'], ['se', 'SE'], ['s', 'S'], ['sw', 'SW'], ['w', 'W'], ['nw', 'NW']])
  L('hud', 'compass.' + k, HUD, "['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']", { now, limit: 3, note: 'a point of the compass strip at the top of the screen; one to three letters' });
{
  // the words of the buff line under each active state: STAT_WORDS in the HUD, joined by buffLine() after a number
  const t = src(HUD), a = /const STAT_WORDS[^{]*\{([^}]*)\}/.exec(t);
  if (!a) fail(`${HUD}: STAT_WORDS was not found`);
  else for (const m of a[1].matchAll(/(\w+): '([^']+)'/g)) add('hud', 'buff.' + m[1], { file: HUD, line: lineAt(t, a.index + a[0].indexOf(a[1]) + m.index), now: m[2], limit: 24,
    note: 'the word after a number in the line under an active state on the HUD, as "+6 defense"; the same thing as the bonus of the same key in a tooltip (stat:*), in as few words' });
  if (![...entries.keys()].some((k) => k.startsWith('hud:buff.'))) fail(`${HUD}: no words were read from STAT_WORDS`);
}
// ---- windows ----
for (const [k, text] of [['equipment', 'Equipment'], ['book', 'Recipe book'], ['guide', 'Guide'], ['can_make', 'Can make'], ['none_match', 'Nothing here matches'], ['chest', 'Chest'], ['smelting', 'Smelting'],
  ['inventory', 'Inventory'], ['buy_back', 'Buy back'], ['for_sale', 'For sale'], ['buy', 'Buy'], ['take_all', 'Take all'], ['back_crafting', 'Back to crafting']]) L('win', k, WIN, `'${text}'`, { now: text, limit: 24 });
{
  // the recipe book's category chips: BOOK_CATS in the inventory window, in order
  const t = src(WIN), a = /const BOOK_CATS = \[(.*?)\];/.exec(t), keys = ['all', 'tools', 'weapons', 'armour', 'trinkets', 'blocks', 'other'];
  if (!a) fail(`${WIN}: BOOK_CATS was not found`);
  else {
    const cats = lits(a[1]);
    if (cats.length !== keys.length) fail(`${WIN}: BOOK_CATS has ${cats.length} categories; this script names ${keys.length}`);
    cats.forEach((c, i) => add('win', 'cat.' + (keys[i] ?? i), { file: WIN, line: lineAt(t, a.index), now: c, limit: 12, note: 'a category chip of the recipe book' }));
  }
}
// the labels under the armour slots; the same three words fill {slot} of tip:slot_empty
for (const [k, now] of [['head', 'Head'], ['body', 'Body'], ['legs', 'Legs']]) L('win', 'slot.' + k, WIN, "['Head', 'Body', 'Legs']", { now, limit: 10, note: 'the label under an armour slot, and the word put into {slot} of tip:slot_empty' });
L('win', 'slot.trinket', WIN, "'acc', 'Trinket'", { now: 'Trinket', limit: 10, note: 'the label under each of the five trinket slots' });
L('win', 'crafting', WIN, "'Crafting'", { now: 'Crafting', limit: 24, note: 'the title of the middle column when no station is open; with a station open the title is the station\'s name' });
L('win', 'search', WIN, "placeholder = 'Search'", { now: 'Search', limit: 14 });
L('win', 'book.here', WIN, 'What you can make here', { limit: 60 });
L('win', 'book.browse', WIN, "'Browse what the '", { now: 'Browse what the {station} makes', limit: 60 });
L('win', 'book.keys', WIN, 'Click: lay out · Right-click: craft one · Shift-click: craft all', { limit: 80 });
L('win', 'chest.take_tip', WIN, 'Move everything into your pack', { limit: 60 });
L('win', 'chest.stack_tip', WIN, 'Move stacks the chest already holds out of your backpack (not the hotbar)', { limit: 90 });
L('win', 'chest.sort_tip', WIN, 'Merge stacks and sort the chest', { limit: 60 });
L('win', 'pack.sort_tip', WIN, 'Merge stacks and sort the backpack (the hotbar stays as it is)', { limit: 80 });
L('win', 'forge.heat', WIN, 'Heat: fuel left in the fire', { limit: 50 });
L('win', 'forge.smelts', WIN, "'Smelts: '", { now: 'Smelts: {list}', limit: 16 });
L('win', 'shop.hint', WIN, 'Shift-click an item in your pack to sell the stack. Sold items can be bought back until you leave. Shift-click Buy for up to 10.');
L('win', 'shop.coins', WIN, 'Your coins: <b>${inv.coins}</b>', { now: 'Your coins: {n}', limit: 30 });
L('win', 'shop.price_coins', WIN, "cur === 'coins' ? 'c' : 'tokens'", { now: '{n} c', limit: 16, note: 'the price on a row of a shop that is paid in coins; {n} is the price' });
L('win', 'shop.price_tokens', WIN, "cur === 'coins' ? 'c' : 'tokens'", { now: '{n} tokens', limit: 16, note: 'the price on a row of a shop that is paid in tokens; {n} is the price' });
L('win', 'pack.keys', WIN, 'Shift-click: move · Right-click: half · Double-click: gather · 1-9: to hotbar · Q: drop', { limit: 100 });
L('win', 'back_to', WIN, "'Back to '", { now: 'Back to {window}', limit: 30 });
L('win', 'stats.level', WIN, 'Level ${st.level} · ${st.xp}/${st.xpNeeded()} xp', { now: 'Level {n} · {xp}/{need} xp', limit: 40 });
for (const [k, text] of [['defense', 'Defense'], ['critical', 'Critical'], ['speed', 'Speed'], ['minions', 'Minions']]) L('win', 'stats.' + k, WIN, `>${text}<`, { now: text, limit: 16 });
L('win', 'stats.attributes', WIN, '>Attributes$', { now: 'Attributes', limit: 16 });
L('win', 'stats.to_spend', WIN, '${st.points} to spend', { now: '{n} to spend', limit: 20, note: 'follows win:stats.attributes in the same heading while points are unspent; today the code joins the two with a middle dot, and the loader joins them with a comma and a space' });
L('win', 'shop.tokens', WIN, '${esc(item(tok).name)}: <b>${inv.count(tok)}</b>', { now: '{item}: {n}', slots: ['{item}', '{n}'], limit: 40,
  note: 'follows the name of a townsperson who sells for tokens, in the shop heading: the token and how many the pack holds. Today the code joins it with a middle dot; the loader joins it with a comma and a space' });
// buttons and slot labels written once each in the windows
L('win', 'stash', WIN, "'Stash'", { limit: 10, note: 'the chest button whose tooltip is win:chest.stack_tip' });
L('win', 'sort', WIN, "'Sort'", { limit: 10, note: 'the button in the chest and in the pack whose tooltips are win:chest.sort_tip and win:pack.sort_tip' });
L('win', 'slot.ore', WIN, "'Ore'", { limit: 10, note: 'the label under the furnace slot that takes what is smelted' });
L('win', 'slot.fuel', WIN, "'Fuel'", { limit: 10, note: 'the label under the furnace slot that takes fuel' });
L('win', 'forge', WIN, "'Forge'", { limit: 24, note: 'the title of the furnace window when the block under it has no name; with a name the title is that name' });
// plan D: the codex window. Its title is a name and comes from names.json; these are its headings and its empty state.
for (const [k, why] of [['codex.none', 'shown in the codex before anything is known'], ['codex.sight', 'heading of a bestiary step: first sight'], ['codex.kill', 'heading: first kill'],
  ['codex.habit', 'heading: many kills'], ['codex.once', 'heading: one thing seen once'], ['codex.loss', 'heading: after the first kill of one of the eight'], ['codex.said', 'heading: what householders say one of the eight is'],
  ['codex.seen', 'heading: what the crew saw'], ['codex.read', 'heading: what the crew makes of it'], ['codex.born', 'heading: what householders say'], ['codex.sand', 'heading: what the Deserter says'],
  ['codex.closed', 'stands in place of a step that has not opened'], ['journal.said', 'heading over the householders\' telling of a task']]) add('win', k, { planned: true, limit: 40, note: 'plan D: ' + why });
// ---- tooltip lines made from numbers ----
for (const [k, needle, now] of [
  ['slot_empty', ' slot is empty', '{slot} slot is empty'], ['set_completes', 'Completes set: ', 'Completes set: {bonus}'], ['set_breaks', 'Breaks set: ', 'Breaks set: {bonus}'],
  ['cmp_damage', "${dd} damage</div>", '{n} damage'], ['cmp_dps', "${dp} damage per second</div>", '{n} damage per second'], ['worn', 'Already worn: a second one adds nothing', null],
  ['no_difference', 'No difference', null], ['compared', 'Compared with ${esc(itemName(other))}', 'Compared with {name}'], ['sell_stack', 'sell stack for ${sellPrice(s.k) * s.n} coins', 'Shift-click: sell stack for {n} coins'], ['to_chest', "'move to chest'", 'Shift-click: move to chest'],
  ['to_forge', "'load into forge'", 'Shift-click: load into forge'], ['equip', "'equip'", 'Shift-click: equip'], ['to_pack', "'move to backpack'", 'Shift-click: move to backpack'],
  ['to_hotbar', "'move to hotbar'", 'Shift-click: move to hotbar'], ['take', "'take'", 'Shift-click: take'], ['take_half', 'Right-click: take half', null],
  ['damage', "damage${wpn.minion ? ' per hit' : ''}", '{n} {style} damage'], ['rate', 'attacks per second · ${dps} damage per second', '{rate} attacks per second · {dps} damage per second'],
  ['uses_arm', 'Uses ${wpn.mana} mana', 'Uses {n} mana'], ['uses_arrows', 'Uses arrows', null], ['mining', 'Mining power ${d.tool.power} · speed ${d.tool.speed}', 'Mining power {power} · speed {speed}'],
  ['arrow_damage', '+${d.ammoDmg} arrow damage', '+{n} arrow damage'], ['set', 'Set (${n}/3): ${b.text}', 'Set ({n}/3): {bonus}'], ['food', 'Restores ${d.food} hunger', 'Restores {n} hunger'],
  ['heal', 'Restores ${d.heal} health', 'Restores {n} health'], ['arm', 'Restores ${d.restoreMana} mana', 'Restores {n} mana'], ['fuel', 'Fuel: burns ${d.fuel}s', 'Fuel: burns {n}s'],
  ['light', 'Gives off light', null], ['sells_for', 'Sells for ${sellPrice(s.k)} coins', 'Sells for {n} coins'], ['craft_anywhere', 'Craft anywhere', null], ['made_at', "'Made at: '", 'Made at: {station}'],
  ['makes', 'Makes up to ${most * r.n}', 'Makes up to {n}'],
]) L('tip', k, WIN, needle, { now: now ?? needle, needs: k === 'craft_anywhere' ? ['station:hand'] : undefined,
  note: k === 'damage' ? '{style} is the way of fighting in lower case; for a totem the code adds " per hit"' : k === 'slot_empty' ? '{slot} is the text of win:slot.head, win:slot.body or win:slot.legs' : undefined });
for (const [k, needle, now] of [['kind', '${RARITY[r].name} · ${kind}', '{grade} · {kind}']]) L('tip', k, WIN, needle, { now });
// the kind of a thing, put into {kind} above
for (const [k, needle, now] of [['kind.weapon', "' weapon'", '{style} weapon'], ['kind.tool', "'Tool'", 'Tool'], ['kind.armour', "d.armor ? 'Armour'", 'Armour'], ['kind.trinket', "d.acc ? 'Trinket'", 'Trinket'],
  ['kind.food', "'Food'", 'Food'], ['kind.block', "'Block'", 'Block'], ['kind.usable', "'Usable'", 'Usable'], ['kind.material', "'Material'", 'Material']])
  L('tip', k, WIN, needle, { now, limit: 24, note: k === 'kind.weapon' ? 'the kind of a weapon; {style} is the way of fighting' : 'the kind of a thing, put into {kind} of tip:kind' });
L('tip', 'sells_each', WIN, 'for the stack)', { now: 'each ({total} for the stack)', note: 'follows tip:sells_for, with a space, when the stack holds more than one' });
L('tip', 'need_more', WIN, 'Need ${cost - have} more', { now: 'Need {n} more', slots: ['{n}'], voice: 'label', limit: 70, note: 'the shop tooltip when the pack holds too little to pay; the code adds it after the price line' });
L('tip', 'needs_n', WIN, '${n} × ${esc(name)}', { now: '{n} x {item} ({have})', note: 'one ingredient of a recipe and how many the pack holds; the multiplication sign is not in the font' });
// where a thing comes from (src/data/sources.ts), under the description of a material and under a missing ingredient. Two are joined in code.
for (const [k, needle, now, note] of [['src.smelt', "'Smelt '", 'Smelt {item}', '{item} is what goes into the furnace'], ['src.hand', 'Craft by hand', null, null],
  ['src.station', "'Craft at the '", 'Craft at the {station}', null], ['src.mine', "'Mine '", 'Mine {block}', '{block} is the block that drops it'],
  ['src.dropped', "'Dropped by '", 'Dropped by {name}', '{name} is a creature'], ['src.dropped_great', "(mb.boss ? 'the ' : '')", 'Dropped by the {name}', '{name} is one of the eight'],
  ['src.sold', "'Sold by the '", 'Sold by the {name}', '{name} is a townsperson'], ['src.chests', 'Found in chests', null, null], ['src.world', 'Found in the world', null, null],
  ['src.any', "'Any '", 'Any {tag}', '{tag} is a kind of ingredient, filled from tag.name:<tag>; the same words head an ingredient line of the recipe tooltip of src/ui/windows.ts, also listed in at']])
  L('tip', k, SRC, needle, { now: now ?? needle, note: note ?? undefined, alsoIn: k === 'src.any' ? [WIN] : undefined });
L('tip', 'src.any_in', SRC, "'any '", { now: 'any {tag}', limit: 30, note: 'a kind of ingredient inside a line, as the {item} of tip:src.smelt when a smelt takes any log; {tag} is filled from tag.name:<tag>' });
{
  // the kinds of ingredient: the '#' keys of the recipes and smelts, shown after "Any"
  const t = src(F_RECIPES), seen = new Map();
  for (const m of t.matchAll(/'#(\w+)'/g)) if (!seen.has(m[1])) seen.set(m[1], lineAt(t, m.index));
  if (!seen.size) fail(`${F_RECIPES}: no kind of ingredient ('#' key) was read`);
  for (const [k, line] of seen) add('tag.name', k, { file: F_RECIPES, line, now: k, note: 'fills {tag} of tip:src.any and tip:src.any_in; the key itself is never shown' });
}
{
  const t = src(F_ITEMS);
  for (const [k, needle, now] of [['set.hide', '+1 defense, +4% speed', null], ['set.melee', '% melee damage, +${2 + ti} defense', '+{pct}% melee damage, +{n} defense'],
    ['set.ranged', '% ranged damage, +${Math.round((0.04 + ti * 0.005) * 100)}% critical chance', '+{pct}% ranged damage, +{crit}% critical chance'],
    ['set.magic', '% crystal-work damage, +${20 + ti * 10} mana', '+{pct}% crystal-work damage, +{n} mana'], ['set.summon', "% totem damage, +${ti >= 6 ? 2 : 1} minion", '+{pct}% totem damage, +{n} minion(s)']]) {
    const i = t.indexOf(needle);
    if (i < 0) fail(`${F_ITEMS}: the set bonus text "${needle}" is no longer there`);
    add('tip', k, { file: F_ITEMS, line: i < 0 ? null : lineAt(t, i), now: now ?? needle });
  }
}
{
  // the names of bonuses: STAT_TEXT in the inventory window
  const t = src(WIN), a = /const STAT_TEXT[^{]*\{([\s\S]*?)\n\};/.exec(t);
  if (!a) fail(`${WIN}: STAT_TEXT was not found`);
  else for (const m of a[1].matchAll(/(\w+): \['([^']+)', (?:true|false)\]/g)) add('stat', m[1], { file: WIN, line: lineAt(t, a.index + a[0].indexOf(a[1]) + m.index), now: m[2] });
  if (![...entries.keys()].some((k) => k.startsWith('stat:'))) fail(`${WIN}: no bonus names were read from STAT_TEXT`);
}
// ---- menus ----
L('menu', 'title.sub', MENU, 'a voxel sandbox of lost lights', { limit: 48, note: 'the line under the title; no light is lost or won in this world (8.11)' });
for (const [k, text] of [['paused', 'PAUSED'], ['controls', 'CONTROLS'], ['settings', 'SETTINGS'], ['resume', 'Resume'], ['settings_btn', 'Settings'], ['controls_btn', 'Controls'], ['back', 'Back'],
  ['quit', 'Save and quit to title'], ['saving', 'Saving...'], ['saved', 'Progress saved'], ['save_late', 'Could not save just now'], ['new_world', 'New world'], ['begin', 'Begin'], ['delete', 'Delete'],
  ['sure', 'Sure?'], ['other_tab', 'Open in another tab'], ['create', 'Create world'], ['name_field', 'World name'], ['name_default', 'New World'], ['seed_field', 'Seed (leave blank for a random one)'],
  ['head.new', 'new world'], ['head.controls', 'controls'], ['on', 'On'], ['off', 'Off'], ['preset', 'Graphics preset'], ['effects', 'Effects'], ['controls_sound', 'Controls and sound'],
  ['render_distance', 'Render distance'], ['fov', 'Field of view'], ['resolution', 'Resolution scale'], ['filtering', 'Texture filtering'], ['adaptive', 'Adaptive resolution'], ['bloom', 'Bloom'],
  ['shadows', 'Sun shadows'], ['tonemap', 'Tone mapping'], ['vignette', 'Vignette'], ['msaa', 'Anti-aliasing (MSAA)'], ['fxaa', 'Edge smoothing (FXAA)'], ['clouds', 'Clouds'], ['sway', 'Swaying foliage and waves'],
  ['adapt', 'Eye adaptation'], ['ui_scale', 'UI scale'], ['sensitivity', 'Mouse sensitivity'], ['sfx', 'Effects volume'], ['music', 'Music volume'], ['bob', 'View bobbing'], ['shake', 'Screen shake'],
  ['auto_jump', 'Auto-jump up single blocks'], ['auto_tool', 'Switch tools automatically'], ['fly_toggle', 'Double-tap Space to fly (creative)'], ['raw_mouse', 'Raw mouse input (no acceleration)']]) L('menu', k, MENU, `'${text}'`, { now: text, limit: 40 });
for (const p of ['low', 'medium', 'high']) L('menu', 'preset.' + p, MENU, "['low', 'medium', 'high']", { now: p, limit: 12, note: 'a button of the graphics preset, under menu:preset' });
L('menu', 'unit.chunks', MENU, "' chunks'", { now: '{n} chunks', limit: 20, note: 'the value of the menu:render_distance slider; {n} is the distance in chunks' });
L('menu', 'unit.percent', MENU, "'%'", { now: '{n}%', limit: 12, note: 'the value of a slider given in hundredths: resolution scale, UI scale, the two volumes and screen shake' });
L('menu', 'unit.times', MENU, "'x'", { now: '{n}x', limit: 12, note: 'the value of the menu:filtering slider when it is on; {n} is 2, 4, 8 or 16. At 0 the slider shows menu:off' });
L('menu', 'ui_auto', MENU, 'Auto (${Math.round(autoUiScale() * 100)}%)', { now: 'Auto ({n}%)', limit: 20, note: 'the value of the menu:ui_scale slider at its leftmost stop: the size is chosen from the window, and {n} is that size in hundredths' });
L('menu', 'world.line', MENU, 'seed ${w.seedText} · ${new Date(w.played).toLocaleDateString()} · level ${w.level}', { now: 'seed {seed} · {date} · level {n}', limit: 60 });
L('menu', 'quick_world', MAIN, 'Quick world', { limit: 28 });
L('menu', 'player_default', MAIN, "'Player'", { now: 'Player', limit: 16, alsoIn: ['src/net/host.ts', 'src/sim/migrate.ts'],
  note: 'the name of the player of a world played alone, and of a world from before names; other players see it over the head and in the list. 1 to 16 letters, digits, spaces, _ or -' });
// ---- joining a server: put on main by the multiplayer job ----
for (const [k, needle, now, note] of [
  ['join.here', 'Join ${here.name}', 'Join {name}', 'the title-screen button on a server\'s own page; {name} is the server\'s name'],
  ['join.server', 'Join a server', null, 'the title-screen button on any other page'],
  ['join.head', 'join a world', null, 'the heading of the join screen, in lower case as the other headings'],
  ['join.players', '${here.name} · ${here.players} of ${here.max} playing', '{name} · {n} of {max} playing', 'the line on the join screen of a server\'s own page'],
  ['join.address', 'Address (host:port)', null, 'the empty address field'], ['join.name', 'Your name', null, 'the empty name field'],
  ['join.password', "here ? 'Password'", 'Password', 'the empty password field on a server that has one'],
  ['join.password_maybe', 'Password (if the server has one)', null, 'the empty password field when the server is not known yet'],
  ['join.go', "col, 'Join')", 'Join', 'the button that joins'], ['join.connecting', 'Connecting...', null, 'shown while a join is under way'],
  ['join.cancel', 'Cancel', null, 'gives up a join under way'], ['server_keeps', 'The server keeps this world', null, 'the pause screen on a server, in place of the saving line'],
]) LM('menu', k, MENU, needle, { now: now ?? needle, limit: 48, note });
LM('menu', 'back_title', MAIN, 'Back to the title', { limit: 28, note: 'the button over the game when a server has closed the connection for good' });
{
  // the list of controls: the second word of each pair in KEYS
  const t = src(MENU), a = /const KEYS: \[string, string\]\[\] = \[([\s\S]*?)\]\];/.exec(t);
  if (!a) fail(`${MENU}: KEYS was not found`);
  else for (const m of (a[1] + ']').matchAll(/\['([^']+)', '([^']+)'\]/g)) {
    const k = m[2].toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''), line = lineAt(t, a.index + a[0].indexOf(a[1]) + m.index);
    add('key', k, { file: MENU, line, now: m[2], note: 'for ' + m[1] });
    // the first word of the pair: the key or button, in the left column of the list
    add('key', 'press.' + k, { file: MENU, line, now: m[1], note: 'the key or button for key:' + k + ', in the left column of the list of controls' });
  }
}
// ---- errors ----
for (const [k, file, text] of [
  ['save_failed', G, 'Save failed. Your progress may not be kept.'], ['no_save', G, 'Saving is unavailable'], ['closed', G, 'The connection was closed.'],
  ['newer.menu', MENU, 'These worlds were saved by a newer version of the game. Nothing will be saved here.'], ['newer.banner', MENU, 'These worlds were saved by a newer version of the game. Progress is lost when the tab closes.'],
  ['newer.pause', MENU, 'Saving is unavailable: a newer version saved these worlds'], ['blocked.menu', MENU, 'This browser is blocking storage. Worlds will not be saved.'],
  ['blocked.banner', MENU, 'This browser is blocking storage. Progress is lost when the tab closes.'], ['blocked.pause', MENU, 'Saving is unavailable in this browser'],
  ['world_open', MAIN, 'This world could not be opened: '], ['world_other_tab', MAIN, 'This world is open in another tab. Close it there to play it here.'], ['tab_holds', IDB, 'Another tab holds this game open: close it to continue.'],
  ['old_page', HOST, 'This page is older than the game it reached. Reload to update.'], ['password_wait', HOST, 'Too many wrong passwords. Wait a minute.'], ['password', HOST, 'Wrong password.'],
  ['name_form', HOST, 'A name is 1 to 16 letters, digits, spaces, _ or -.'], ['name_taken', HOST, 'That name belongs to someone else here.'], ['replaced', HOST, 'Joined from somewhere else.'],
  ['full', HOST, 'The world is full.'], ['character', HOST, 'Your character could not be read.'], ['rate', HOST, 'Too many messages.'], ['chunk_rate', HOST, 'Too many chunk requests.'],
  ['host_message', HOST, 'The host could not handle a message.'], ['slow', HOST, 'The connection cannot keep up.'], ['idle', HOST, 'No movement for 30 seconds.'], ['stopping', HOST, 'The host is stopping.'],
  ['sim_stopped', WORKER, 'the simulation stopped'], ['proto.no_hello', HOST, 'no hello'], ['proto.malformed', HOST, 'malformed message'], ['proto.bad_token', HOST, 'bad token'],
  ['proto.hello_first', HOST, 'hello first'], ['proto.not_move', HOST, 'not a movement message'], ['proto.second_hello', HOST, 'a second hello'], ['proto.sequence', HOST, 'sequence out of order'],
  ['step.aborted', IDB, 'transaction aborted'], ['step.open', IDB, 'open world'], ['step.list', IDB, 'list chunks'], ['step.backup', IDB, 'back up the old world'], ['step.migrate', IDB, 'migrate the world'],
]) L('error', k, file, text, { note: k.startsWith('proto.') ? 'the host closes the connection with it; the page shows it on the loading screen' : k.startsWith('step.') ? 'shown after error:world_open, before the browser\'s own words for the failure' : k === 'sim_stopped' ? 'shown after error:world_open when the simulation gives no reason' : k === 'name_form' ? 'the host answers with it, and on main the join screen writes the same sentence before it sends anything' : undefined,
  alsoIn: k === 'name_form' ? [MENU] : undefined });
for (const [k, file, text, note] of [
  ['no_address', MENU, 'Which server? Type its address, for example 192.168.1.20:8080.', 'the join screen, when the address field is empty'],
  ['address', MAIN, 'That is not an address. Type it as host:port, for example 192.168.1.20:8080.', 'the join screen, when the address cannot be read'],
  ['unreachable', MAIN, 'Cannot reach the server. Trying again...', 'the join screen, while the first connection is tried again'],
  ['reconnecting', MAIN, 'Connection lost. Reconnecting...', 'a strip at the top of the screen while a dropped connection is tried again'],
  ['load_timeout', HOST, 'The world did not finish loading in 2 minutes.', 'the host closes the connection with it; the page shows it on the join screen'],
]) LM('error', k, file, text, { note });
L('error', 'format_newer', IDB, 'is newer than this build', { now: 'world format {n} is newer than this build', note: 'shown after error:world_open' });
// ---- the command line ----
for (const [k, needle, now] of [['help', 'commands: give time tp fly creative god heal level kill spawn boss flag event dim gear locate', null], ['unknown_item', "'unknown item '", 'unknown item {key}'],
  ['unknown_creature', "'unknown creature '", 'unknown creature {key}'], ['full', "'inventory full'", 'inventory full'], ['gave', 'gave ${n} ${a[1]}', 'gave {n} {key}'], ['none_found', "'none found'", 'none found'],
  ['time', "'time set'", 'time set'], ['teleported', "'teleported'", 'teleported'], ['healed', "'healed'", 'healed'], ['level', "'level set'", 'level set'], ['cleared', "'cleared'", 'cleared'],
  ['spawned', "'spawned'", 'spawned'], ['failed', "'failed'", 'failed'], ['flag', "'flag set'", 'flag set'], ['event', "'event started'", 'event started'], ['travelling', "'travelling'", 'travelling'],
  ['caps', "'caps set'", 'caps set'], ['filled', "'filled'", 'filled']]) L('cmd', k, CH, needle, { now: now ?? needle });
L('cmd', 'off', SIM, 'Commands are off on this server.', { note: 'the answer to the command line on a server that allows no commands' });

// ---- literals that are never shown to a player in play ----
// Each stays in the source and is checked to be there, so the list follows the source. None is a surface: the loader leaves them as they are.
const NEVER_SHOWN_TEXT = [
  ['src/game.ts', 'chunks  ${c.meshed} meshed', 'the F3 overlay (game.ts debugLines: chunks, draw, cpu, pos, world, ents, view, with facing words such as "north (-z)"): a developer readout of counts, timings and positions, not game text'],
  ['src/game.ts', "'north (-z)', 'west (-x)', 'south (+z)', 'east (+x)'", 'the facing words of the F3 overlay\'s pos line: part of the same developer readout'],
  ['src/ui/debug.ts', '${this.fps.toFixed(0)} fps', 'the frame-time line at the head of the F3 overlay: a developer readout'],
  [CH, 'give <item> [count]', 'the usage line of a developer command, given only to someone typing commands where they are on; its words are argument names'],
  [CH, 'tp <x> <y> <z>', 'a developer command\'s usage line'],
  [CH, 'fill x0 y0 z0 x1 y1 z1 <block>', 'a developer command\'s usage line'],
  [CH, 'spawnat <creature> <x> <y> <z> [yaw]', 'a developer command\'s usage line'],
  [CH, 'hash cx0 cz0 cx1 cz1', 'a developer command\'s usage line'],
  [CH, 'simhash ${fnv(simState(sim)).toString(16)} tick ${sim.tick}', 'a hash of the simulation\'s state, for comparing two runs: a developer readout'],
  [HOST, "'no steps yet'", 'the reply of the tickstats command before the first step: a developer readout of step times, given only where commands are on, like simhash'],
  [HOST, 'return `steps ${n}  p50 ${q(0.5)}', 'the reply of the tickstats command, the step times and the save time: a developer readout, given only where commands are on, like simhash'],
  [CH, "out.push(`${cx},${cz}:",'the reply of the hash command, one hash of blocks for each chunk: a developer readout'],
  [CH, "'fly ' + b.flying", 'a developer toggle answering with its own name and true or false'],
  [CH, "'creative ' + p.modes.creative", 'a developer toggle answering with its own name and true or false'],
  [CH, "'god ' + p.modes.god", 'a developer toggle answering with its own name and true or false'],
  [CH, "'freeze ' + on", 'a developer toggle answering with its own name and true or false'],
  [ACT, "'summoning item'", 'fallback when no item has use summon<n>; every altar has a bait in src/data/items.ts, so eight.line:altar_waits always names one'],
];
const neverShown = NEVER_SHOWN_TEXT.map(([file, needle, why]) => {
  const t = src(file), i = t.indexOf(needle);
  if (i < 0) fail(`${file}: the text "${needle}", listed as never shown, is no longer there`);
  return { file, line: i < 0 ? null : lineAt(t, i), text: needle, why };
});

// ====================================================================================================
// Every key of src/data must be needed by some entry
// ====================================================================================================
const universe = [
  ...blocks.map((b) => ['block:' + b.key, `${F_BLOCKS}:${b.line}`]),
  ...items.map((i) => ['item:' + i.key, `${F_ITEMS}:${i.line}`]),
  ...blocks.filter((b) => !hidden.has(b.key)).map((b) => ['item:' + b.key, `${F_BLOCKS}:${b.line} (as an item)`]),
  ...mobs.map((m) => ['mob:' + m.key, `${F_MOBS}:${m.line}`]),
  ...npcs.map((n) => ['npc:' + n.key, `${F_NPCS}:${n.line}`]),
  ...quests.map((q) => ['quest:' + q.key, `${F_QUESTS}:${q.line}`]),
  ...biomes.map((b) => ['biome:' + b.key, `${F_BIOMES}:${b.line}`]),
  ...dims.map((d) => ['dim:' + d.key, `${F_DIMS}:${d.line}`]),
  ...tiers.map((t) => ['tier:' + t.key, `${F_ITEMS}:${t.line}`]),
  ...modifiers.map((m) => ['mod:' + m.key, `${F_ITEMS}:${m.line}`]),
  ...rarities.map((r) => ['rarity:' + r.key, `${F_ITEMS}:${r.line}`]),
  ...attrs.map((a) => ['attr:' + a.key, `${F_STATS}:${a.line}`]),
  ...buffs.map((b) => ['buff:' + b.key, `${F_STATS}:${b.line}`]),
  ...stations.map((s) => ['station:' + s.key, F_RECIPES]),
  ...bosses.map((b) => ['boss:' + b.n, F_MOBS]),
  ...['raid', 'ashen', 'moon'].map((e) => ['event:' + e, EV]),
];
for (const [k, where] of universe) if (!covered.has(k) && !NEVER_SHOWN.has(k)) fail(`${where}: the key '${k}' has no surface. Add it to a surface in surfaces.mjs, or to NEVER_SHOWN with the reason.`);
// keys that plan.md names must exist in the source they point at
for (const k of [...SIGHT_BY_CREW]) if (!mobs.some((m) => m.key === k)) fail(`SIGHT_BY_CREW names '${k}', which is no creature in ${F_MOBS}`);
for (const k of MATERIAL_BORN) if (!tiers.some((t) => t.key === k)) fail(`MATERIAL_BORN names '${k}', which is no hardness in ${F_ITEMS}`);
for (const k of Object.keys(STAGE_FROM)) if (!npcs.some((n) => n.key === k)) fail(`STAGE_FROM names '${k}', who is no townsperson in ${F_NPCS}`);
for (const [k] of [...PLANNED_BLOCKS, ...PLANNED_ITEMS]) if (blockKeys.has(k) || itemKeys.has(k)) fail(`'${k}' is listed as planned and is already in src/data: move it out of the PLANNED lists`);

if (problems.length) {
  console.error(`surfaces.mjs: ${problems.length} problem${problems.length > 1 ? 's' : ''}. Nothing was written.`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}

// ====================================================================================================
// Output
// ====================================================================================================
const ASSIGN = ['items-a', 'items-b', 'creatures', 'people', 'system', 'sites'];
const counts = {};
for (const e of entries.values()) { const c = (counts[e.surface] ??= { entries: 0, lines: 0 }); c.entries++; c.lines += e.lines ? e.lines[0] : 1; }
const out = {
  about: 'Written by surfaces.mjs from the game\'s source. Do not edit by hand. Each entry is one string a writer supplies, or one list of strings where `lines` gives the fewest and the most. `now` is the text the game shows today, with {braces} where the code puts a value in; `slots` lists those, and the new text carries each of them once. `empty` marks an entry that may be left as an empty string. `must` lists words the text has to contain. `planned` marks an entry for something plan.md adds and the game does not have yet. `needs` lists the internal keys the text is about.',
  letters: 'Āāīū',
  voices: ['label', 'sight', 'note', 'born', 'sand'],
  assignments: ASSIGN,
  surfaces: Object.fromEntries(Object.entries(SURFACES).map(([id, s]) => [id, { about: s.about, voice: s.voice, limit: s.limit, ...(s.lines ? { lines: s.lines } : {}), assign: s.assign, entries: counts[id]?.entries ?? 0 }])),
  never_shown: neverShown,
  entries: Object.fromEntries([...entries].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(([id, e]) => [id, e])),
};
for (const [id, s] of Object.entries(out.surfaces)) if (!s.entries) { console.error(`surfaces.mjs: the surface '${id}' has no entry`); process.exit(1); }
const json = JSON.stringify(out, null, 1) + '\n';
if (process.argv.includes('--check')) {
  const old = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (old !== json) { console.error('surfaces.mjs --check: text/_surfaces.json is not what the source gives now. Run surfaces.mjs and give the writers the difference.'); process.exit(1); }
  console.log('surfaces.mjs --check: text/_surfaces.json agrees with the source.');
} else if (rootArg > 0) {
  console.error('surfaces.mjs: --root is for --check only; nothing is written from another copy.'); process.exit(1);
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, json);
}
const pad = (s, n) => String(s).padEnd(n);
console.log(pad('surface', 16) + pad('assignment', 11) + pad('voice', 7) + pad('limit', 7) + pad('entries', 9) + 'lines at least');
let te = 0, tl = 0; const by = Object.fromEntries(ASSIGN.map((a) => [a, [0, 0]]));
for (const [id, s] of Object.entries(SURFACES)) {
  const c = counts[id]; te += c.entries; tl += c.lines; by[s.assign][0] += c.entries; by[s.assign][1] += c.lines;
  console.log(pad(id, 16) + pad(s.assign, 11) + pad(s.voice, 7) + pad(s.limit, 7) + pad(c.entries, 9) + c.lines);
}
console.log('');
for (const a of ASSIGN) console.log(pad(a, 16) + pad('', 25) + pad(by[a][0], 9) + by[a][1]);
console.log(pad('all', 16) + pad('', 25) + pad(te, 9) + tl);
console.log(`\nkeys read from src/data: ${blocks.length} blocks, ${items.length} items, ${mobs.length} creatures (${bosses.length} of them the eight, ${npcs.length} townsfolk bodies), ${npcs.length} townsfolk, ${quests.length} tasks, ${biomes.length} countries, ${dims.length} places, ${tiers.length} hardnesses, ${modifiers.length} modifiers, ${rarities.length} grades, ${buffs.length} states, ${attrs.length} attributes, ${stations.length} stations. Loot tables (${lootTables.join(', ')}) show no text of their own.`);
