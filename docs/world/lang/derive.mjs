#!/usr/bin/env node
// Derives names in the two born tongues from Sanskrit headwords by the ordered
// sound changes in rules.json. No dependencies.
//
//   node derive.mjs <tongue> <word> [<word> ...]   show every stage and the final form
//   node derive.mjs --check <names.json>            re-derive every derived name in a name map
//   node derive.mjs --roots [roots.json]            check the stored daughter forms of the root list
//   node derive.mjs --roots --fill [roots.json]     rewrite the stored daughter forms
//   node derive.mjs --list <tongue>                 print the rules, joining rule and endings of a tongue
//   node derive.mjs --selftest                      check every example in rules.json
//
// <tongue> is `hearth` (the householders' tongue) or `sand` (the sand-country tongue).
// Words are written in IAST. Several words are joined into one name by the tongue's
// joining rule, describing word first. A word written with a leading hyphen (-kāra) is an
// ending and a word written with a trailing hyphen is a prefix: both are joined the old
// way, before the changes run, in either tongue.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RULES = JSON.parse(readFileSync(join(HERE, 'rules.json'), 'utf8'));
const ALIASES = { hearth: 'hearth', householders: 'hearth', householder: 'hearth', sand: 'sand', 'sand-country': 'sand' };
const TONGUES = Object.keys(RULES.tongues);

function expand(pattern) {
  return pattern.replace(/\{([A-Z])\}/g, (_, k) => {
    const set = RULES.classes[k];
    if (set === undefined) throw new Error(`rules.json: unknown class {${k}}`);
    return `[${set}]`;
  });
}

const compiled = new Map();
function applySteps(form, list) {
  if (!compiled.has(list)) compiled.set(list, list.map(([from, to]) => [new RegExp(expand(from), 'gu'), to]));
  for (const [re, to] of compiled.get(list)) form = form.replace(re, to);
  return form;
}

function tongue(id) {
  const key = ALIASES[String(id).toLowerCase()];
  if (!key) throw new Error(`unknown tongue "${id}": use hearth or sand`);
  return { key, ...RULES.tongues[key] };
}

// Runs the rules of the given phases, in file order, and records each rule that changed the form.
function run(form, t, phases, trace) {
  for (const rule of t.rules) {
    if (!phases.includes(rule.phase)) continue;
    const next = applySteps(form, rule.steps);
    if (next !== form && trace) trace.push({ rule: rule.id, say: rule.say, from: form, to: next });
    form = next;
  }
  return form;
}

function spell(form, t, trace) {
  const next = applySteps(form, t.spelling.steps);
  if (next !== form && trace) trace.push({ rule: 'spell', say: t.spelling.say, from: form, to: next });
  return next;
}

// Lower case, no spaces, no marks of joining; aspirates written with a raised h.
function prepare(word) {
  const c = word.normalize('NFC').toLowerCase().replace(/[\s'’]/g, '');
  const text = applySteps(c.replace(/-/g, ''), RULES.prepare);
  return { text, prefix: c.endsWith('-'), suffix: c.startsWith('-') };
}

const bare = (word) => word.normalize('NFC').toLowerCase().replace(/[\s'’-]/g, '');

// Derives one name from one or more IAST words. Returns { form, trace }.
export function derive(tongueId, words) {
  const t = tongue(tongueId);
  const trace = [];
  const parts = words.map(prepare);
  if (parts.length === 0 || parts.some((p) => p.text === '')) throw new Error('empty word');

  // Parts joined the old way form one unit. In a tongue that joins tightly every part is in one unit.
  const units = [[parts[0]]];
  for (let i = 1; i < parts.length; i++) {
    const tight = t.join.mode === 'tight' || parts[i].suffix || parts[i - 1].prefix;
    if (tight) units[units.length - 1].push(parts[i]);
    else units.push([parts[i]]);
  }
  const fuse = (unit) => {
    const stems = unit.map((p) => run(p.text, t, ['stem'], trace));
    if (stems.length === 1) return stems[0];
    const marked = stems.join('+');
    const fused = applySteps(marked, t.join.tight);
    trace.push({ rule: 'join', say: 'joined before the changes run', from: marked, to: fused });
    return fused;
  };

  let form;
  if (units.length === 1) {
    form = run(fuse(units[0]), t, ['core'], trace);
  } else {
    // Loose joining: each unit is worn down as a word of its own, short of the word-end changes.
    const worn = units.map((u) => run(fuse(u), t, ['core'], trace));
    const firsts = worn.slice(0, -1).map((w) => applySteps(w, t.join.first));
    const marked = [...firsts, worn[worn.length - 1]].join('+');
    form = applySteps(marked, t.join.between);
    trace.push({ rule: 'join', say: 'set side by side', from: worn.join(' + '), to: form });
  }
  form = run(form, t, ['edge'], trace);
  form = spell(form, t, trace);
  return { form, trace };
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function show(tongueId, words) {
  const t = tongue(tongueId);
  const { form, trace } = derive(tongueId, words);
  console.log(`${t.name}: ${words.join(' + ')}`);
  for (const s of trace) console.log(`  ${s.rule.padEnd(5)} ${s.from} > ${s.to}   (${s.say})`);
  console.log(`  = ${cap(form)}`);
}

// A name's `from` is a list of IAST words (one name word), or a list of lists (several name
// words, in order). An entry { "plain": "Stone" } inside a list of lists is an English word.
function deriveName(tongueId, from) {
  const many = from.some((x) => Array.isArray(x) || (x && typeof x === 'object'));
  const groups = many ? from : [from];
  return groups
    .map((g) => (Array.isArray(g) ? cap(derive(tongueId, g).form) : typeof g === 'string' ? cap(derive(tongueId, [g]).form) : g.plain))
    .join(' ');
}

function loadRoots(path) {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const index = new Map();
  for (const r of data.roots) index.set(bare(r.word), r);
  return { data, index };
}

const affixWords = () => {
  const set = new Set();
  for (const key of TONGUES) for (const a of RULES.tongues[key].affixes) set.add(bare(a.word));
  return set;
};

// names.json is a list (or { "names": [...] }) of entries:
//   { "key": "forest", "name": "Vanabūm", "tongue": "hearth", "from": ["vana", "-bhūmi"] }
// tongue is hearth, sand, cutters (Sanskrit proper: every word of `from` must be in roots.json),
// frame (a term whose spelling borrowed.md fixes) or plain (English). `limit` overrides the
// 18-character limit, for a boss bar. `other` may hold the same thing's names in other tongues,
// each an entry of the same shape without a key.
function check(path) {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const { index } = loadRoots(join(HERE, 'roots.json'));
  const affixes = affixWords();
  const allowed = new RegExp(`^[A-Za-z ${RULES.letters.daughters}]+$`, 'u');
  const sanskrit = new RegExp(`^[A-Za-z ${RULES.letters.cutters}]+$`, 'u');
  const entries = Array.isArray(data) ? data : data.names;
  let bad = 0;
  let seen = 0;
  const one = (e, id, limit) => {
    const fail = (msg) => {
      bad++;
      console.log(`FAIL ${id}: ${msg}`);
    };
    if ([...e.name].length > limit) fail(`"${e.name}" is ${[...e.name].length} characters, limit ${limit}`);
    if (e.tongue === 'plain' || e.tongue === 'frame') return;
    if (!e.from) return fail('a name in a tongue needs a "from" list');
    const flat = e.from.flat().filter((x) => typeof x === 'string');
    for (const w of flat) {
      const root = index.get(bare(w));
      if (!root && !affixes.has(bare(w))) fail(`"${w}" is not in roots.json`);
      if (root && root.skip && root.skip[e.tongue]) fail(`"${w}" is marked not for use in ${e.tongue}: ${root.skip[e.tongue]}`);
      if (root && root.alone && root.alone[e.tongue] && flat.length === 1) fail(`"${w}" is not to stand alone in ${e.tongue}: ${root.alone[e.tongue]}`);
    }
    if (e.tongue === 'cutters') {
      if (!sanskrit.test(e.name)) fail(`"${e.name}" uses a letter outside the IAST set in rules.json`);
      return;
    }
    seen++;
    if (!allowed.test(e.name)) fail(`"${e.name}" uses a letter outside the daughter alphabet`);
    let got;
    try {
      got = deriveName(e.tongue, e.from);
    } catch (err) {
      return fail(err.message);
    }
    if (got !== e.name) fail(`stored "${e.name}", derived "${got}" from ${JSON.stringify(e.from)}`);
  };
  for (const e of entries) {
    const id = e.key ?? e.name;
    const limit = e.limit ?? RULES.limits.inventory;
    one(e, id, limit);
    for (const o of e.other ?? []) one(o, `${id} (${o.tongue})`, o.limit ?? limit);
  }
  console.log(`${seen} derived names checked, ${bad} problem${bad === 1 ? '' : 's'}`);
  process.exit(bad ? 1 : 0);
}

function roots(path, fill) {
  const { data } = loadRoots(path);
  let bad = 0;
  const seen = Object.fromEntries(TONGUES.map((k) => [k, new Map()]));
  const words = new Set();
  for (const r of data.roots) {
    if (words.has(r.word)) {
      bad++;
      console.log(`DUPLICATE headword ${r.word}`);
    }
    words.add(r.word);
    for (const key of TONGUES) {
      const got = derive(key, [r.word]).form;
      if (fill) r[key] = got;
      else if (r[key] !== got) {
        bad++;
        console.log(`FAIL ${r.word}: ${key} stored "${r[key]}", derived "${got}"`);
      }
      if (r.skip && r.skip[key]) continue;
      const prev = seen[key].get(got);
      if (prev) {
        bad++;
        console.log(`COLLISION ${key} "${got}": ${prev} and ${r.word}`);
      } else seen[key].set(got, r.word);
    }
  }
  if (fill) {
    const head = Object.fromEntries(Object.entries(data).filter(([k]) => k !== 'roots'));
    const lines = data.roots.map((r) => '    ' + JSON.stringify(r));
    writeFileSync(path, JSON.stringify(head, null, 2).replace(/\n}$/, `,\n  "roots": [\n${lines.join(',\n')}\n  ]\n}\n`));
    console.log(`${data.roots.length} roots written, ${bad} problem${bad === 1 ? '' : 's'}`);
  } else console.log(`${data.roots.length} roots checked, ${bad} problem${bad === 1 ? '' : 's'}`);
  process.exit(bad ? 1 : 0);
}

function list(tongueId) {
  const t = tongue(tongueId);
  console.log(`${t.name} (${t.speakers})`);
  for (const r of t.rules) console.log(`  ${r.id}  ${r.say}\n       ${r.ex.map(([a, b]) => `${a} > ${b}`).join('; ')}`);
  console.log(`  spelling  ${t.spelling.say}`);
  console.log(`  joining   ${t.join.say}`);
  for (const [words, name] of t.join.ex) console.log(`       ${words.join(' + ')} = ${name}`);
  console.log('  endings and first words');
  for (const a of t.affixes) console.log(`       ${a.word.padEnd(8)} ${a.makes}: ${a.ex[0].join(' + ')} = ${a.ex[1]}`);
}

function selftest() {
  let bad = 0;
  let n = 0;
  const fail = (msg) => {
    bad++;
    console.log(`FAIL ${msg}`);
  };
  for (const key of TONGUES) {
    const t = RULES.tongues[key];
    for (const rule of [...t.rules, { id: `${key} spelling`, ...t.spelling }]) {
      for (const [from, to] of rule.ex) {
        n++;
        const got = applySteps(from, rule.steps);
        if (got !== to) fail(`${rule.id}: ${from} gives ${got}, example says ${to}`);
      }
    }
    for (const [words, name] of [...t.join.ex, ...t.affixes.map((a) => a.ex)]) {
      n++;
      const got = cap(derive(key, words).form);
      if (got !== name) fail(`${key}: ${words.join(' + ')} gives ${got}, example says ${name}`);
    }
  }
  console.log(`${n} examples checked, ${bad} problem${bad === 1 ? '' : 's'}`);
  process.exit(bad ? 1 : 0);
}

function main(argv) {
  if (argv.length === 0 || argv[0] === '--help') {
    console.log(
      'usage: node derive.mjs <hearth|sand> <IAST word> [<IAST word> ...]\n       node derive.mjs --check names.json\n       node derive.mjs --roots [--fill] [roots.json]\n       node derive.mjs --list <hearth|sand>\n       node derive.mjs --selftest',
    );
    return;
  }
  if (argv[0] === '--check') return check(resolve(argv[1] ?? 'names.json'));
  if (argv[0] === '--roots') {
    const rest = argv.slice(1).filter((a) => a !== '--fill');
    return roots(resolve(rest[0] ?? join(HERE, 'roots.json')), argv.includes('--fill'));
  }
  if (argv[0] === '--list') return list(argv[1]);
  if (argv[0] === '--selftest') return selftest();
  if (argv.length < 2) throw new Error('give a tongue and at least one word');
  show(argv[0], argv.slice(1));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
}
