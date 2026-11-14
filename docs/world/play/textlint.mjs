#!/usr/bin/env node
// textlint.mjs: checks the writers' JSON files under text/ against text/_surfaces.json and names.json.
//
//   node docs/world/play/textlint.mjs                 check every assignment; all six files must be there
//   node docs/world/play/textlint.mjs people.json     check one file (several may be named)
//   node docs/world/play/textlint.mjs --selftest      plant one fault for each check and show that it is caught
//
// Exit code 1 on any failure. Each failure is one line: file, key, the check, the reason.
// The checks, by the name printed:
//   json       the file is JSON, a flat object, and every value is a string or a list of strings
//   file       the file is one of the six assignments
//   unknown    the key is in _surfaces.json
//   owner      the key belongs to this file's assignment
//   twice      the key is written once in its file
//   missing    every key of the assignment is there
//   shape      a list where _surfaces.json gives `lines`, with that many lines, none repeated; a string elsewhere
//   empty      no empty string (unless the entry is marked `empty`)
//   length     no line longer than the entry's limit, counted in characters
//   letters    only ASCII from space to ~ and the letters Ā ā ī ū
//   spaces     no space at either end, no two spaces together
//   slots      every {slot} of the entry is in the text once, and no other {word}
//   must       a word the entry requires is in the text (a townsperson's first line says peopl)
//   old-name   no old name from names.json, with or without an English plural
//   spelling   every name of a born tongue spelled and capitalised as names.json has it, with no English plural
//   banned     none of the banned words of README rules 6, 9 to 13, 16, 20 and 21, nor what plan.md H bans for the voice; nothing in
//              the voices label, sight and note says a stone is lit, on any surface
//   pattern    none of the banned turns of sentence (a count of the dead, a set-up knocked down, a placeholder name)
//
// No dependencies. Node 18 or later.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEXT = path.join(HERE, 'text');
const NAMES = path.join(HERE, '..', 'names.json');
const ASSIGNMENTS = ['items-a', 'items-b', 'creatures', 'people', 'system', 'sites'];

// ---- banned words -------------------------------------------------------------------------------
// A word bans itself and its inflections (see `forms`). Each list gives the rule it comes from.
const BANNED_ALL = [
  ['README rule 10: no office words', ['ledger', 'clerk', 'record', 'registry', 'tally', 'schedule', 'procedure', 'archive', 'archivist', 'office', 'official', 'logistics', 'timetable', 'appointment', 'census', 'audit', 'administration', 'paperwork']],
  ['README rule 11: no temple words', ['rite', 'ritual', 'liturgy', 'litany', 'observance', 'sacrament', 'sacred', 'holy', 'hallowed', 'temple', 'shrine', 'priest', 'priestess', 'prayer', 'pray', 'worship', 'god', 'goddess', 'divine', 'bless', 'blessing', 'consecrate', 'devotion']],
  ['README rule 13: no keeper and no keeping', ['keeper', 'keeping', 'gatekeeper', 'safekeeping']],
  ['README rule 6: no organisation, ceremony or festival', ['council', 'guild', 'brotherhood', 'sisterhood', 'cult', 'festival', 'ceremony', 'ceremonial']],
  ['README rule 9: no prophecy, chosen one or forgotten truth', ['prophecy', 'prophet', 'prophesy', 'destiny', 'destined', 'fate', 'fated', 'omen', 'legend', 'legendary', 'ancient', 'ancients', 'eldritch', 'primordial', 'immemorial']],
  ['README rule 7: nothing is done by words, and there is no stored power (8.11)', ['spell', 'magic', 'magical', 'mana', 'summon', 'summoner', 'minion', 'enchant', 'enchantment', 'curse', 'hex', 'rune', 'sigil', 'incantation', 'chant', 'conjure', 'arcane', 'arcana', 'mystic', 'mystical', 'sorcery', 'sorcerer', 'wizard', 'mage', 'spirit', 'soul', 'ghost', 'wraith', 'undead', 'demon']],
  ['README rule 14: terms of the wider cosmos stay out of game text', ['ashvattha', 'fraying', 'jagrat', 'ksudhita', 'purvasesa', 'relshari']],
  ['README rule 16: no line that tells the reader how to feel', ['eerie', 'ominous', 'mysterious', 'mysteriously', 'sinister', 'haunting', 'haunted', 'haunt', 'terrifying', 'dreadful', 'foreboding', 'chilling', 'unspeakable', 'nameless', 'whisper', 'strange', 'strangely', 'somehow', 'beware', 'doom', 'doomed', 'glorious', 'epic', 'awesome', 'unimaginable', 'indescribable']],
  ['README rule 21: worlds are not planets, and the ground has no edge to show', ['planet', 'galaxy', 'cosmos', 'universe']],
];
// By voice (plan.md H). `label` is the game's own plain label; `sight` is what a person standing there sees;
// `note` is an arrival's working note; `born` is a householder speaking; `sand` is a sand-country person speaking.
const TIME_WORDS = ['year', 'month', 'week', 'century', 'decade', 'season', 'winter', 'summer', 'autumn'];
const UI_WORDS = ['player', 'click', 'inventory', 'hotbar', 'respawn', 'spawn', 'xp', 'quest', 'boss', 'npc', 'mob', 'biome', 'dimension', 'realm', 'tooltip', 'crafting', 'loot', 'server'];
const UI_SPOKEN = [...UI_WORDS, 'level', 'game', 'screen', 'menu', 'button'];
const BANNED_VOICE = {
  label: [['H label: the born\'s words for the stones stay out of the game\'s own labels', ['offering', 'offer', 'warden', 'sovereign']], ['H label: a label says what a thing does, never whose it is or was', ['forebear', 'peopl', 'peopls']]],
  sight: [['H sight: only what a person standing there sees; the born\'s beliefs stay out', ['offering', 'offer', 'warden', 'sovereign', 'forebear', 'invasion', 'host']], ['H sight: no reckoning of time by years or seasons', TIME_WORDS], ['H sight: the game does not speak of itself here', UI_WORDS]],
  note: [['H note: a note is written for the crew and never addresses a reader', ['you', 'your', 'yours', 'yourself']], ['H note: the born\'s titles for the eight are theirs', ['warden', 'sovereign']], ['H note: no reckoning of time by years or seasons', TIME_WORDS], ['H note: the game does not speak of itself here', UI_WORDS]],
  born: [['H born: a householder has no word for these', ['arrival', 'cutter', 'pathfinder', 'core', 'world', 'island']], ['H born: no reckoning of time by years or seasons', TIME_WORDS], ['H born: a person does not speak of the game', UI_SPOKEN]],
  sand: [['H sand: these are the hearths\' words, and a sand-country person does not use them', ['altar', 'offering', 'warden', 'sovereign', 'arrival', 'cutter', 'pathfinder', 'core', 'world', 'island']], ['H sand: no reckoning of time by years or seasons', TIME_WORDS], ['H sand: a person does not speak of the game', UI_SPOKEN]],
};
// By surface: checked against entries whose surface id starts with the key.
const BANNED_SURFACE = {
  'fall': [['README rule 20: no text writes an arrival\'s death', ['die', 'died', 'dead', 'death', 'slain', 'slay', 'kill', 'killed', 'perish', 'perished', 'corpse', 'grave']]],
  'banner': [['4.10: no text says a stone is lit by a kill; a banner says no light at all', ['light']]],
  'eight.': [['README rule 19: the eight are animals: they do not speak, guard, watch or wait for anyone', ['speaks', 'spoke', 'guards', 'guard', 'watches', 'awaits', 'waits', 'remembers', 'judges', 'welcomes', 'greets', 'her', 'hers', 'his', 'him', 'she', 'he']]],
};
// No text but a born or a sand mouth says a stone is lit (4.10, 8.10, plan H.2). The check runs on every entry whose voice is label,
// sight or note, whatever its surface: lit, relit and rekindled are refused outright, and light, as a word, in any sentence that names
// a stone. Born and sand mouths may say lit, because to them it means held (5.2).
const STONE_LIT_VOICES = ['label', 'sight', 'note'];
const STONE_LIT = ['4.10: no text says a stone is lit by a kill', ['lit', 'relit', 'rekindled', 'rekindle', 'relight', 'relights', 'unlit']];
const STONE_WORD = /\b(stones?|altars?|cairns?|housings?|base)\b/i;
const LIGHT_WORD = /\b(light|lights|lighted|lighting)\b/i;
// The baits: the born's verbs for them belong only in a born mouth (4.2). Checked on item.desc of these keys.
const BAIT_KEYS = ['verdant_idol', 'sunken_lure', 'warden_bell', 'spore_censer', 'storm_kite', 'prism_lens', 'eclipse_mask', 'cairn_key'];
// `forms` makes the regular inflections (flies, flying, opened); the irregular ones are listed after the verbs.
const BAIT_VERBS = ['4.2: every bait is laid on its stone; wake, call up, ring, burn, fly, focus, wear and open are the born\'s account', ['wake', 'call', 'ring', 'burn', 'fly', 'focus', 'wear', 'open', 'offer', 'summon', 'challenge',
  'woke', 'woken', 'rang', 'rung', 'burnt', 'flew', 'flown', 'wore', 'worn']];
// Turns of sentence, whatever the words.
const PATTERNS = [
  ['README rule 12: the dead are never counted', /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|hundreds|thousand|thousands|dozen|dozens|score|scores|countless|numberless)\s+(?:\w+\s+)?(dead|deaths|corpses|bodies|graves|killed|slain|fallen|lost|lives)\b/i],
  ['README rule 12: the dead are never counted', /\b(lost|buried|burned|sank|killed|mourned)\s+(\d+|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|a hundred|hundreds|a thousand|thousands|a dozen|dozens|scores)\b(?!\s+(?:coins?|nights?|strides?|bars?|logs?|arrows?))/i],
  ['README rule 12: the dead are never counted', /\b(death toll|body count|count(?:ed|ing)? the dead|number of (?:the )?dead|how many (?:died|fell|were lost))\b/i],
  ['README rule 16: no sentence that sets up one thing only to knock it down for another', /\bnot\s+(?:just\s+|only\s+|merely\s+|simply\s+)?[^.?;:]{1,60}?[,]?\s+but\b/i],
  ['README rule 16: no sentence that sets up one thing only to knock it down for another', /\b(less an? [^.?]{1,40} than|more than (?:just|merely|only)|isn't [^.?]{1,40}[,;] it's|is no [^.?]{1,30}[,;] it is)\b/i],
  ['README rule 15: no placeholder label used as a name', /\bthe (tall|old|pale|dark|hooded|silent|quiet|first|last|nameless|great) ones?\b/i],
  ['README rule 9: no golden age, great war, fall or chosen one', /\b(golden age|great war|chosen one|long ago|ages past|days of old|lost to time|time out of mind|once upon)\b/i],
  ['README rule 21: no edge to the ground, no space beyond the sky', /\b(edge of the (?:world|ground)|end of the (?:world|ground)|outer space|beyond the sky|among the stars)\b/i],
  ['README rule 17: short declarative sentences; no exclamation', /!/],
  ['README rule 16: no closing line that trails off', /\.\.\.|…/],
];
// Old names that are also ordinary English words: flagged only when written with their capital inside a sentence.
const PLAIN_OLD = new Set(['Shore', 'Smith', 'Swift', 'Common', 'Uncommon', 'Rare', 'Relic', 'Savage', 'Scout', 'Binder', 'Tinker', 'Radiant', 'Stalwart', 'Menacing', 'Warding', 'Blessed']);

// ---- helpers ---------------------------------------------------------------------------------------
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** A word and its inflections, lower case. */
function forms(w) {
  const out = new Set([w, w + 's', w + "'s"]);
  if (/(s|x|z|ch|sh)$/.test(w)) out.add(w + 'es');
  if (/[^aeiou]y$/.test(w)) { out.add(w.slice(0, -1) + 'ies'); out.add(w.slice(0, -1) + 'ied'); out.add(w + 'ing'); }
  else if (/e$/.test(w)) { out.add(w + 'd'); out.add(w.slice(0, -1) + 'ing'); out.add(w + 'r'); }
  else { out.add(w + 'ed'); out.add(w + 'ing'); out.add(w + 'er'); if (/[^aeiou][aeiou][^aeiouwxy]$/.test(w)) { const d = w + w[w.length - 1]; out.add(d + 'ed'); out.add(d + 'ing'); } }
  return out;
}
function wordMap(lists) { const m = new Map(); for (const [why, words] of lists) for (const w of words) for (const f of forms(w)) if (!m.has(f)) m.set(f, [w, why]); return m; }
const ALL = wordMap(BANNED_ALL);
const VOICE = Object.fromEntries(Object.entries(BANNED_VOICE).map(([v, l]) => [v, wordMap(l)]));
const SURF = Object.entries(BANNED_SURFACE).map(([p, l]) => [p, wordMap(l)]);
const BAIT = wordMap([BAIT_VERBS]);
const LIT = new Map(STONE_LIT[1].map((w) => [w, [w, STONE_LIT[0]]]));
const WORD = /[A-Za-zĀāĪīŪū]+(?:'[a-z]+)?/g;
const ALLOWED = /^[ -~Āāīū]*$/;

/** What names.json gives the checks: old names to refuse, and the born words with their spelling. */
function readNames(names) {
  const current = new Set(), olds = [], born = new Map();   // born: folded word -> Set of exact spellings
  const plainParts = new Set();
  const addBorn = (name) => { for (const w of name.match(WORD) ?? []) { if (plainParts.has(w)) continue; const f = fold(w); if (!born.has(f)) born.set(f, new Set()); born.get(f).add(w); } };
  const all = [];
  for (const e of names.names) { all.push(e); for (const o of e.other ?? []) all.push(o); if (e.personal) all.push(e.personal); }
  for (const t of names.generated?.tiers ?? []) all.push({ name: t.word, tongue: t.tongue, from: t.from });
  for (const e of all) for (const part of (e.from ?? []).flat()) if (part && typeof part === 'object' && part.plain) for (const w of String(part.plain).split(/\s+/)) plainParts.add(w);
  for (const e of all) { if (e.name) current.add(e.name); if ((e.tongue === 'hearth' || e.tongue === 'sand') && e.name) addBorn(e.name); }
  for (const e of names.names) {
    const o = e.old;
    if (!o || o === e.name || e.kind === 'text' || e.kind === 'find' || /^\(/.test(o) || current.has(o)) continue;
    olds.push({ old: o, name: e.name, key: e.key });
  }
  return { olds, born };
}
/** The keys at the top of a JSON object, in the order written, so that a key written twice can be found (JSON.parse keeps only the last). */
function topKeys(text) {
  const keys = []; let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      let j = i + 1; while (j < text.length && text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
      if (depth === 1 && /^\s*:/.test(text.slice(j + 1))) { try { keys.push(JSON.parse(text.slice(i, j + 1))); } catch { /* the parse below reports it */ } }
      i = j;
    } else if (c === '{' || c === '[') depth++; else if (c === '}' || c === ']') depth--;
  }
  return keys;
}

/**
 * The check itself. `files` maps a file name to its text. `only` limits the missing-key check to the files given.
 * Returns failures as { file, key, check, msg }.
 */
export function lint(surfaces, names, files, only = null) {
  const out = [], bad = (file, key, check, msg) => out.push({ file, key, check, msg });
  const { olds, born } = readNames(names), E = surfaces.entries;
  const want = only ?? ASSIGNMENTS.map((a) => a + '.json');
  for (const f of want) if (!files.has(f)) bad(f, '', 'missing', `the file is not there (${Object.values(E).filter((e) => e.assign + '.json' === f).length} entries wait for it)`);
  for (const [file, text] of files) {
    const assign = file.replace(/\.json$/, '');
    if (!ASSIGNMENTS.includes(assign)) { bad(file, '', 'file', `not one of the six assignments (${ASSIGNMENTS.join(', ')})`); continue; }
    let data;
    try { data = JSON.parse(text); } catch (e) { bad(file, '', 'json', 'not JSON: ' + e.message); continue; }
    if (!data || typeof data !== 'object' || Array.isArray(data)) { bad(file, '', 'json', 'the top of the file must be one object from "<surface>:<key>" to text'); continue; }
    { const once = new Set(); for (const k of topKeys(text)) { if (once.has(k)) bad(file, k, 'twice', 'the key is written twice in this file; only the last would be read'); once.add(k); } }
    for (const [key, val] of Object.entries(data)) {
      const e = E[key];
      if (!e) { bad(file, key, 'unknown', 'no such entry in _surfaces.json'); continue; }
      if (e.assign !== assign) { bad(file, key, 'owner', `belongs to ${e.assign}.json`); continue; }
      const isList = Array.isArray(val);
      if (!(typeof val === 'string' || (isList && val.every((x) => typeof x === 'string')))) { bad(file, key, 'json', 'the value must be a string or a list of strings'); continue; }
      if (e.lines && !isList) { bad(file, key, 'shape', `takes a list of ${e.lines[0]} to ${e.lines[1]} lines`); continue; }
      if (!e.lines && isList) { bad(file, key, 'shape', 'takes one string, not a list'); continue; }
      if (e.lines && (val.length < e.lines[0] || val.length > e.lines[1])) bad(file, key, 'shape', `has ${val.length} lines; takes ${e.lines[0]} to ${e.lines[1]}`);
      if (isList && new Set(val.map((x) => x.trim().toLowerCase())).size !== val.length) bad(file, key, 'shape', 'the same line is in the list twice');
      const linesOf = isList ? val : [val];
      linesOf.forEach((s, i) => checkLine(s, isList ? `${key} [${i + 1}]` : key, e));
    }
    for (const [key, e] of Object.entries(E)) if (e.assign === assign && !(key in data)) bad(file, key, 'missing', `no text (${e.voice}, at most ${e.limit} characters${e.lines ? `, ${e.lines[0]} to ${e.lines[1]} lines` : ''})`);

    function checkLine(s, key, e) {
      if (s === '') { if (!e.empty) bad(file, key, 'empty', 'empty text'); return; }
      const n = [...s].length;
      if (n > e.limit) bad(file, key, 'length', `${n} characters; the limit is ${e.limit}`);
      if (!ALLOWED.test(s)) { const c = [...s].find((ch) => !ALLOWED.test(ch)); bad(file, key, 'letters', `the character ${JSON.stringify(c)} (U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}) is not in the font: ASCII and Ā ā ī ū only`); }
      if (s !== s.trim()) bad(file, key, 'spaces', 'a space at the start or the end');
      if (/ {2,}/.test(s)) bad(file, key, 'spaces', 'two spaces together');
      // slots
      const have = s.match(/\{[^{}]*\}/g) ?? [], slots = e.slots ?? [];
      for (const sl of slots) { const c = have.filter((h) => h === sl).length; if (c !== 1) bad(file, key, 'slots', `${sl} must be in the text once; it is there ${c} times`); }
      for (const h of new Set(have)) if (!slots.includes(h)) bad(file, key, 'slots', `${h} is no slot of this entry${slots.length ? ` (its slots: ${slots.join(' ')})` : ''}`);
      if (/[{}]/.test(s.replace(/\{[^{}]*\}/g, ''))) bad(file, key, 'slots', 'a brace without its pair');
      const body = s.replace(/\{[^{}]*\}/g, ' ');
      for (const w of e.must ?? []) if (!new RegExp(`\\b${esc(w)}s?\\b`).test(body)) bad(file, key, 'must', `the text has to contain "${w}"`);
      // old names
      for (const o of olds) {
        const single = !/\s/.test(o.old), plain = PLAIN_OLD.has(o.old);
        // an English plural of an old name is the old name: Gloomshades, Wardstones
        const re = new RegExp(`(^|[^A-Za-zĀāĪīŪū])${esc(o.old)}(?:e?s)?(?![A-Za-zĀāĪīŪū])`, single && !plain ? 'gi' : 'g');
        let m;
        while ((m = re.exec(body))) {
          const at = m.index + m[1].length;
          if (plain && (at === 0 || /[.?:]\s*$/.test(body.slice(0, at)))) continue;   // an ordinary word starting a sentence
          bad(file, key, 'old-name', `"${body.slice(at, m.index + m[0].length)}" is the old name of ${o.key}; the name is "${o.name}"`); break;
        }
      }
      // names of the born tongues
      for (const w of body.match(WORD) ?? []) {
        const bare = w.replace(/'[a-z]+$/, ''), f = fold(bare), set = born.get(f);
        if (set) { if (!set.has(bare)) bad(file, key, 'spelling', `"${bare}" is written "${[...set].join('" or "')}" in names.json`); continue; }
        if (f.endsWith('s') && born.has(f.slice(0, -1)) && [...born.get(f.slice(0, -1))].some((x) => fold(x) + 's' === f && /^[A-ZĀĪŪ]/.test(bare))) bad(file, key, 'spelling', `"${bare}": a name of a born tongue takes no English plural (languages.md); write "${[...born.get(f.slice(0, -1))][0]}"`);
      }
      // banned words
      // the command line answers with the words a player types, which are code
      const lists = e.surface === 'cmd' ? [] : [ALL, VOICE[e.voice], ...SURF.filter(([p]) => e.surface.startsWith(p) && !(p === 'eight.' && e.voice === 'born')).map(([, m]) => m)];
      if (e.surface === 'item.desc' && BAIT_KEYS.includes(e.key)) lists.push(BAIT);
      const litHere = STONE_LIT_VOICES.includes(e.voice);
      if (litHere) lists.push(LIT);
      const told = new Set();
      for (const w of body.match(WORD) ?? []) {
        const lw = fold(w.replace(/'[a-z]+$/, '')), lwFull = fold(w);
        for (const m of lists) { const hit = m?.get(lw) ?? m?.get(lwFull); if (hit && !told.has(hit[0])) { told.add(hit[0]); bad(file, key, 'banned', `"${w}": ${hit[1]}`); } }
      }
      for (const [why, re] of PATTERNS) { const m = re.exec(body); if (m && !(e.voice === 'label' && m[0] === '...')) bad(file, key, 'pattern', `"${m[0].trim()}": ${why}`); }
      if (litHere) for (const sentence of body.split(/[.?;:]/)) { const l = LIGHT_WORD.exec(sentence), st = STONE_WORD.exec(sentence); if (l && st) { bad(file, key, 'banned', `"${l[0]}" in a sentence about a "${st[0]}": ${STONE_LIT[0]} (4.10)`); break; } }
      if (e.voice !== 'born' && e.voice !== 'sand' && /\bfirst light\b/i.test(body)) bad(file, key, 'banned', '"first light": the hour a holder lifts the hand, a householder\'s phrase (5.2); say dawn');
    }
  }
  return out;
}

// ---- selftest --------------------------------------------------------------------------------------
function selftest() {
  const names = JSON.parse(fs.readFileSync(NAMES, 'utf8'));
  const ent = (surface, key, voice, limit, extra = {}) => ({ surface, key, needs: [], file: null, line: null, now: '', voice, limit, assign: extra.assign ?? 'system', ...extra });
  const surfaces = { entries: {
    'toast:a': ent('toast', 'a', 'label', 40),
    'toast:b': ent('toast', 'b', 'label', 40, { now: '{name} has moved in', slots: ['{name}'] }),
    'banner:c': ent('banner', 'c', 'sight', 40),
    'fall:d': ent('fall', 'd', 'sight', 60),
    'folk.housed:e': ent('folk.housed', 'e', 'born', 60, { assign: 'people', lines: [2, 3] }),
    'folk.meet:e': ent('folk.meet', 'e', 'born', 80, { assign: 'people', must: ['peopl'] }),
    'fire.say:f': ent('fire.say', 'f', 'sand', 60, { assign: 'people', lines: [1, 2] }),
    'item.desc:g': ent('item.desc', 'g', 'note', 80, { assign: 'items-b' }),
    'item.desc:warden_bell': ent('item.desc', 'warden_bell', 'note', 80, { assign: 'items-b' }),
    'eight.intro:h': ent('eight.intro', 'h', 'sight', 80, { assign: 'creatures' }),
    'site.sight:i': ent('site.sight', 'i', 'sight', 90, { assign: 'sites' }),
    'gear.desc:j': ent('gear.desc', 'j', 'note', 80, { assign: 'items-a' }),
    'eight.line:k': ent('eight.line', 'k', 'sight', 60, { assign: 'creatures' }),
    'task.how:l': ent('task.how', 'l', 'label', 160),
    'task.said:m': ent('task.said', 'm', 'born', 130),
    'codex.read:n': ent('codex.read', 'n', 'note', 160, { assign: 'sites' }),
    'item.desc:storm_kite': ent('item.desc', 'storm_kite', 'note', 80, { assign: 'items-b' }),
  } };
  const good = {
    'system.json': { 'toast:a': 'The pack is full.', 'toast:b': '{name} has moved in.', 'banner:c': 'Packs come up at dusk', 'fall:d': 'The drop was too long for the body.',
      'task.how:l': 'Lay the key on the stone. Lamps stand round the base.', 'task.said:m': 'A stone is lit while one of us sits at it, peopl.' },
    'people.json': { 'folk.housed:e': ['Put it on the table, away from the pot.', 'I buy anything, peopl.'], 'fire.say:f': ['Nothing of ours draws.'], 'folk.meet:e': 'You have a room and a light, peopl. I will hold here.' },
    'items-b.json': { 'item.desc:g': 'A tooth of Maruhar. Harder than its plates.', 'item.desc:warden_bell': 'Lay it on a Kankāl Altar. Kankāl comes up to it.',
      'item.desc:storm_kite': 'Cloth and feather round a bar, laid on its stone.' },
    'creatures.json': { 'eight.intro:h': 'Roots come up through the paving.', 'eight.line:k': 'It goes back down into the base.' },
    'items-a.json': { 'gear.desc:j': 'Flint on a shaft, fletched with grouse feather.' }, 'sites.json': { 'site.sight:i': 'Single dressed stones run out from the shore and stop.',
      'codex.read:n': 'Iron bars lay in the floor, so born hunters failed here, it seems.' },
  };
  const run = (change) => {
    const f = JSON.parse(JSON.stringify(good)); const raw = new Map();
    change(f, raw);
    const files = new Map(Object.entries(f).map(([k, v]) => [k, JSON.stringify(v)]));
    for (const [k, v] of raw) if (v === null) files.delete(k); else files.set(k, v);
    return lint(surfaces, names, files);
  };
  const clean = run(() => {});
  let failed = 0;
  if (clean.length) { failed++; console.log('NOT CAUGHT  the clean fixture should pass, and gave:'); for (const e of clean) console.log(`   ${e.file}: ${e.key}: ${e.check}: ${e.msg}`); }
  else console.log('ok          the clean fixture passes with no failure');
  const cases = [
    ['json', 'a file that is not JSON', (f, raw) => raw.set('system.json', '{ "toast:a": ')],
    ['json', 'a value that is a number', (f) => { f['system.json']['toast:a'] = 3; }],
    ['file', 'a file that is no assignment', (f, raw) => raw.set('extras.json', '{}')],
    ['missing', 'a whole file absent', (f, raw) => raw.set('sites.json', null)],
    ['missing', 'a key left out', (f) => { delete f['system.json']['banner:c']; }],
    ['unknown', 'a key that is in no surface', (f) => { f['system.json']['toast:zzz'] = 'Text.'; }],
    ['owner', 'a key in another writer\'s file', (f) => { f['people.json']['toast:a'] = f['system.json']['toast:a']; delete f['system.json']['toast:a']; }],
    ['twice', 'a key written twice in one file', (f, raw) => { const o = f['system.json']; raw.set('system.json', '{"toast:a":"No room.",' + JSON.stringify(o).slice(1)); }],
    ['shape', 'a string where a list is wanted', (f) => { f['people.json']['folk.housed:e'] = 'One line.'; }],
    ['shape', 'too few lines in a list', (f) => { f['people.json']['folk.housed:e'] = ['One line only.']; }],
    ['shape', 'the same line twice in a list', (f) => { f['people.json']['folk.housed:e'] = ['I buy anything.', 'I buy anything.']; }],
    ['empty', 'an empty string', (f) => { f['system.json']['toast:a'] = ''; }],
    ['length', 'a line over its limit', (f) => { f['system.json']['toast:a'] = 'The pack is full and nothing more will go into it today.'; }],
    ['letters', 'a letter outside ASCII and Ā ā ī ū (an em dash)', (f) => { f['system.json']['toast:a'] = 'The pack is full — no room.'; }],
    ['letters', 'a marked letter the font lacks (ṭ)', (f) => { f['items-b.json']['item.desc:g'] = 'A tooth of Koṭara.'; }],
    ['spaces', 'a space at the end', (f) => { f['system.json']['toast:a'] = 'The pack is full. '; }],
    ['slots', 'a slot left out', (f) => { f['system.json']['toast:b'] = 'Someone has moved in.'; }],
    ['slots', 'a slot the entry does not have', (f) => { f['system.json']['toast:a'] = 'The pack of {name} is full.'; }],
    ['must', 'a first meeting that does not say peopl (8.10)', (f) => { f['people.json']['folk.meet:e'] = 'You have a room and a light. I will hold here.'; }],
    ['old-name', 'an old name of a creature (Gloomshade)', (f) => { f['items-b.json']['item.desc:g'] = 'What a Gloomshade leaves in the pot.'; }],
    ['old-name', 'an old name in lower case (wardstone)', (f) => { f['items-b.json']['item.desc:g'] = 'Cut from wardstone.'; }],
    ['old-name', 'an old name with an English plural (Gloomshades)', (f) => { f['items-b.json']['item.desc:g'] = 'Gloomshades came at dusk.'; }],
    ['old-name', 'an old name with an English plural in lower case (wardstones)', (f) => { f['items-b.json']['item.desc:g'] = 'Two wardstones, set.'; }],
    ['old-name', 'an old name of two words (Guest Bed)', (f) => { f['system.json']['toast:a'] = 'Place a Guest Bed.'; }],
    ['spelling', 'a born name without its marks (Kankal)', (f) => { f['items-b.json']['item.desc:warden_bell'] = 'Lay it on a Kankal Altar.'; }],
    ['spelling', 'a born name without its capital (tama)', (f) => { f['items-b.json']['item.desc:g'] = 'What a tama leaves in the pot.'; }],
    ['spelling', 'an English plural on a born name (Kinvas)', (f) => { f['items-b.json']['item.desc:g'] = 'Jelly from Kinvas.'; }],
    ['banned', 'an office word, inflected (records), rule 10', (f) => { f['items-b.json']['item.desc:g'] = 'It records where the stores lie.'; }],
    ['banned', 'a temple word (rite), rule 11', (f) => { f['people.json']['folk.housed:e'][0] = 'It is a rite of ours.'; }],
    ['banned', 'keeper, rule 13', (f) => { f['items-b.json']['item.desc:g'] = 'Carried by the keepers of the stone.'; }],
    ['banned', 'mana, banned everywhere (8.11)', (f) => { f['system.json']['toast:a'] = 'Not enough mana.'; }],
    ['banned', 'a word that tells the reader how to feel (strange), rule 16', (f) => { f['system.json']['banner:c'] = 'Strange things walk tonight'; }],
    ['banned', 'a note that addresses the reader (you)', (f) => { f['items-b.json']['item.desc:g'] = 'It returns you to the bed.'; }],
    ['banned', 'a householder speaking of the game (level)', (f) => { f['people.json']['folk.housed:e'][0] = 'Come back at a higher level.'; }],
    ['banned', 'a sand-country mouth saying altar', (f) => { f['people.json']['fire.say:f'] = ['Leave the altar alone.']; }],
    ['banned', 'a banner that says a stone is lit', (f) => { f['system.json']['banner:c'] = 'The cairns are lit'; }],
    ['banned', 'a line of the eight that says a stone is lit (eight.line, 4.10)', (f) => { f['creatures.json']['eight.line:k'] = 'The stone is lit again.'; }, '4.10'],
    ['banned', 'a journal line that says a kill lights a stone (task.how, 4.10)', (f) => { f['system.json']['task.how:l'] = 'Kill it and the stone is lit.'; }, '4.10'],
    ['banned', 'a journal line that says a kill lights the stones, as a verb (task.how, 4.10)', (f) => { f['system.json']['task.how:l'] = 'Kill it to light the stones again.'; }, '4.10'],
    ['banned', 'an item line that says a stone is relit (item.desc, 4.10)', (f) => { f['items-b.json']['item.desc:g'] = 'The cairns are relit with it.'; }, '4.10'],
    ['banned', 'a codex step that says a stone is lit (codex.read, H.3)', (f) => { f['sites.json']['codex.read:n'] = 'Since the kill the stone is lit.'; }, '4.10'],
    ['banned', 'a first sight of a site that says a stone is lit (site.sight, H.2)', (f) => { f['sites.json']['site.sight:i'] = 'Since the kill the stone is lit.'; }, '4.10'],
    ['banned', 'a toast that says a stone is lit (toast, H.1)', (f) => { f['system.json']['toast:a'] = 'The stone is lit.'; }, '4.10'],
    ['banned', 'a codex step that puts light on a stone, as a word (codex.read)', (f) => { f['sites.json']['codex.read:n'] = 'Since the kill there is light on the stone.'; }, '4.10'],
    ['banned', 'a line at a fall that writes a death (rule 20)', (f) => { f['system.json']['fall:d'] = 'The drop killed the body.'; }],
    ['banned', 'a bait described with a born verb (ring)', (f) => { f['items-b.json']['item.desc:warden_bell'] = 'Ring it at a Kankāl Altar.'; }],
    ['banned', 'a bait described with a born verb (fly)', (f) => { f['items-b.json']['item.desc:storm_kite'] = 'Fly it over the stone on a windy day.'; }, '4.2'],
    ['banned', 'a bait described with a born verb, irregular (flown)', (f) => { f['items-b.json']['item.desc:storm_kite'] = 'It is flown over the stone.'; }, '4.2'],
    ['banned', 'a great feeder given a sex and a will (rule 19)', (f) => { f['creatures.json']['eight.intro:h'] = 'It guards the stone.'; }],
    ['banned', 'first light outside a born mouth', (f) => { f['system.json']['toast:a'] = 'Come back at first light.'; }, 'first light'],
    ['pattern', 'a count of the dead (rule 12)', (f) => { f['people.json']['folk.housed:e'][0] = 'We lost three dead at that stone.'; }],
    ['pattern', 'a set-up knocked down (rule 16)', (f) => { f['items-b.json']['item.desc:g'] = 'It is not a tooth but a piece of the sand.'; }],
    ['pattern', 'a placeholder used as a name (rule 15)', (f) => { f['people.json']['folk.housed:e'][0] = 'The pale one took them.'; }],
    ['pattern', 'an exclamation (rule 17)', (f) => { f['creatures.json']['eight.intro:h'] = 'It tears loose from the roof!'; }],
  ];
  for (const [check, what, change, mustSay] of cases) {
    const got = run(change).filter((e) => e.check === check && (!mustSay || e.msg.includes(mustSay)));
    if (got.length) console.log(`caught      ${check.padEnd(9)} ${what}\n            -> ${got[0].file}: ${got[0].key || '(file)'}: ${got[0].msg}`);
    else { failed++; console.log(`NOT CAUGHT  ${check.padEnd(9)} ${what}`); }
  }
  console.log(failed ? `\nselftest: ${failed} of ${cases.length + 1} checks failed` : `\nselftest: the clean fixture passes and all ${cases.length} planted faults are caught`);
  process.exit(failed ? 1 : 0);
}

// ---- main ------------------------------------------------------------------------------------------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (argv.includes('--selftest')) selftest();
  const S = path.join(TEXT, '_surfaces.json');
  if (!fs.existsSync(S)) { console.error('textlint: text/_surfaces.json is not there. Run surfaces.mjs first.'); process.exit(1); }
  const surfaces = JSON.parse(fs.readFileSync(S, 'utf8')), names = JSON.parse(fs.readFileSync(NAMES, 'utf8'));
  const given = argv.filter((a) => !a.startsWith('--')).map((a) => path.basename(a));
  const files = new Map();
  for (const f of fs.readdirSync(TEXT)) if (f.endsWith('.json') && !f.startsWith('_') && (!given.length || given.includes(f))) files.set(f, fs.readFileSync(path.join(TEXT, f), 'utf8'));
  for (const g of given) if (!files.has(g)) { console.error(`textlint: text/${g} is not there`); process.exit(1); }
  const errs = lint(surfaces, names, files, given.length ? given : null);
  const total = Object.keys(surfaces.entries).length;
  if (!errs.length) { console.log(`textlint: ${[...files.keys()].join(', ')}: no failure (${given.length ? 'the entries of these files' : total + ' entries'})`); process.exit(0); }
  const byCheck = {};
  for (const e of errs) { console.log(`${e.file}: ${e.key || '(file)'}: ${e.check}: ${e.msg}`); byCheck[e.check] = (byCheck[e.check] ?? 0) + 1; }
  console.error(`\ntextlint: ${errs.length} failure${errs.length > 1 ? 's' : ''} (${Object.entries(byCheck).map(([k, n]) => `${k} ${n}`).join(', ')})`);
  process.exit(1);
}
