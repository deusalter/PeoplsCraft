# The text files

Six writers each produce one JSON file in this folder. Together the six files hold every sentence the game shows. `_surfaces.json` lists what is wanted, and `../textlint.mjs` checks what is handed in.

Read first: `docs/world/README.md` (its 26 rules bind every line), the chapters your assignment draws on, the one-page guide at the head of `docs/world/glossary.md`, and `../plan.md`. Section H of the plan gives the five voices. Every entry is in exactly one of them.

## The form

One file for each assignment, named `<assignment>.json`. The file is one flat object. A key is `"<surface>:<key>"`, exactly as `_surfaces.json` has it. A value is a string. Where the entry in `_surfaces.json` has `lines`, the value is a list of strings, and `lines` gives the fewest and the most.

```json
{
 "item.desc:bone": "What is left in the pot when a kill is boiled down.",
 "folk.night:smith": [
  "My hand is on the stone until dawn. Ask me in the morning, peopl.",
  "A forge of remains against my wall draws, and I sit up beside it."
 ],
 "toast:folk_leaves": "{name} has nowhere to hold and walks on."
}
```

Each entry of `_surfaces.json` gives:

| Field | What it is |
| --- | --- |
| `surface`, `key` | The two halves of the id |
| `needs` | The internal keys the text is about, as `item:bone`, `mob:gelcap`, `boss:3` |
| `file`, `line`, `now` | Where the present text is in the source, and what it says today. Empty when the game shows nothing there yet |
| `voice` | One of `label`, `sight`, `note`, `born`, `sand` (plan H) |
| `limit` | The most characters one line may have |
| `lines` | Present when the value is a list: the fewest and the most lines |
| `slots` | Words in braces that the code fills in. The new text carries each of them once and no other |
| `must` | Words the text has to contain. A townsperson's first line has to say peopl |
| `planned` | The entry is for something the plan adds and the game does not have yet |
| `note` | What the thing is, where that is not plain from the key |

Rules of form, all checked:

- Only ASCII and the four letters Ā ā ī ū. The font has no middle dot, no dash longer than a hyphen, no curly quote, no tick, no arrow and no multiplication sign. Where the present text joins two phrases with a middle dot, write a comma or two sentences.
- No space at either end of a line, and no two spaces together. Where the code joins your text to something else, the code adds the space.
- A name of a born tongue is written as `names.json` has it, with its marks and its capital, and takes no English plural: one Tama, three Tama.
- No old name. `names.json` gives the old name of every key in its `old` field.
- Leave a key out and the check fails. Add a key that is not in `_surfaces.json` and the check fails. If a sentence is needed that has no entry, say so in your report. Do not invent a key.

## The six assignments

Each surface belongs to one writer. The counts are entries, and `surfaces.mjs` prints them again whenever the source changes.

### `items-a.json`: tools, weapons, armour, ammunition (190 entries)

| Surface | Key | What it is |
| --- | --- | --- |
| `gear.desc` | item key | One tooltip line for every tool, sword, bow, staff, totem, piece of armour and arrow, and for the steel saw of plan A. 175 entries. Most have no text today |
| `mod.desc` | modifier key | One line for each of the fifteen modifiers: what it is a fact about (6.10) |

The numbers of a piece are printed by the game. A description never repeats them. For gear made by the generator the entry's `note` names the hardness. Chapter 6 says what each hardness is, what a staff and a totem are, and what each arrowhead is.

### `items-b.json`: materials, food and tonics, trinkets, baits, placed things, every block (232 entries)

| Surface | Key | What it is |
| --- | --- | --- |
| `item.desc` | item key | One tooltip line for every material, creature drop, great remains, food, salve, tonic, draught, trinket, bait, door and gate kit, and for the crystal jar of plan A |
| `block.desc` | block key | One tooltip line for every block. States of one block share an entry, and `needs` lists them. Eight entries are blocks the plan adds |
| `rarity.desc` | grade 0 to 6 | One line for each grade: what it is a fact about (6.10) |

The eight baits are laid on their stones. The verbs wake, call up, ring, burn, fly, focus, wear and open are the born's account and stay out of these lines (4.2); they go in `task.said`, which is a born mouth. A found thing's description is its found text (plan G): a bait in an old chest, a bedroll in an old house and a recall stone must each read true of one made today and of one found.

### `creatures.json`: the bestiary and the eight (228 entries)

| Surface | Key | What it is |
| --- | --- | --- |
| `beast.sight`, `beast.kill`, `beast.habit`, `beast.once` | creature key | The four steps of a bestiary entry (8.9, plan D) for the five animals, the twenty-one feeders, the three sand-country fighters and the nine that form on a totem. The voice of `beast.sight` is `born` for the kinds a householder has watched from a hearth and `note` for the rest; each entry says which |
| `eight.sight`, `eight.kill`, `eight.loss`, `eight.habit`, `eight.once` | `b_...` | The five steps for each of the eight (plan D). `eight.loss` is what the crew saw change after the first kill (4.12) |
| `eight.said` | `b_...` | What householders say the animal is (4.11) |
| `eight.intro` | `b_...` | The line under the name when it comes up |
| `eight.phase` | `b_....<n>` | The line when it changes what it does, in order |
| `eight.line` | fixed keys | Six lines about a great feeder, most of which take its name |

The eight are animals (rule 19). The sand-country fighters are people: their entries say what was seen and what a fallen fighter carried, and never count anyone (rule 12).

### `people.json`: townsfolk, sand-country speech, what moves each one in (160 entries, 219 lines at least)

| Surface | Key | What it is |
| --- | --- | --- |
| `folk.why` | townsperson | What moves this one in, shown on a ready bed after the name |
| `folk.meet` | townsperson | The first time anyone of the crew trades with them |
| `folk.housed` | townsperson | Ordinary lines when trade opens. A list |
| `folk.stage` | `<who>.<n>` | The first trade after the first kill of the nth of the eight. A list of one or two. A townsperson has no entry for a stage before they could be housed |
| `folk.night`, `folk.dark`, `folk.attack` | townsperson | At night with the hand on the stone; on the dark night; while packs or a march are at the walls |
| `folk.idle` | townsperson | Said unasked when a peopl stands near and does not trade. Short |
| `folk.buy`, `folk.sell`, `folk.short`, `folk.leave` | townsperson | On a sale, on a purchase, when the peopl cannot pay, and on the morning the bed is broken |
| `folk.extra` | fixed keys | Desik on the dark night and on the next task; the Deserter's one line on the burrower (4.4) |
| `walker.say` | `dusk`, `dark`, `raid` | A householder on the road, met in a village at dusk (plan C) |
| `fire.say` | `before`, `after`, `night`, `struck`, `fuel` | Sand-country people at their fire (plan A, `fire_ring`) |
| `march.say` | `march`, `beaten` | Sand-country fighters on a march |

Chapter 5 gives each townsperson's trade, belief and manner, with lines as a guide. Seven are `born`. Every entry of the Deserter is `sand`, whatever its surface. All eight say peopl to the face.

### `system.json`: journal, banners, toasts, falls, places and countries, menus, hints, errors (471 entries)

| Surface | Key | What it is |
| --- | --- | --- |
| `task.title`, `task.how` | task key | The title of each task of the Guide and how it is done (plan E) |
| `task.said` | task key | From `house` on: the householders' telling of the task, what to do and what it opens. A born mouth |
| `banner`, `banner.sub` | fixed keys | The three attacks, a move-in, a level, a morning |
| `toast` | fixed keys | Every toast |
| `bed` | fixed keys | What a bed answers when it is checked |
| `fall` | fixed keys | The lines at a fall |
| `realm` | fixed keys | Crossing, loading and the compass |
| `country.enter` | country key | One line the first time the crew stands in a kind of country |
| `prompt`, `hud`, `win`, `tip`, `stat`, `attr.desc`, `state.desc` | fixed keys | Prompts, HUD words, window titles and hints, tooltip lines made from numbers, names of bonuses |
| `menu`, `key` | fixed keys | Title screen, pause, settings, controls |
| `error`, `cmd` | fixed keys | Failures a player is told of, and the command line's answers |

The blue bar is the arm (1.6). The word for it in every label is arm: "Uses {n} arm", "+{n} arm". What forms on a totem is a small feeder. Plan H gives the other fixed words of the labels.

### `sites.json`: sites, traces, old things, found texts, the rest of the codex (236 entries)

| Surface | Key | What it is |
| --- | --- | --- |
| `site.sight` | site key | One line the first time the crew comes on a kind of site: the thirteen old structures and the fourteen of plan A |
| `codex.seen`, `codex.read` | `<kind>:<key>` | What the crew saw, and what a crew can work out from it, said as a guess. Kinds: `place`, `country`, `site`, `material`, `matter`, `people`, `old`, `ground` |
| `codex.born` | `<kind>:<key>` | What householders say of it |
| `codex.sand` | `<kind>:<key>` | What the sand-country people say of it, as far as the Deserter tells it |

Nobody states the firm history (rule 18). `codex.read` reaches only what the evidence in play supports; plan D lists that evidence for each subject. Where the stonework, the householders and the sand-country people disagree (2.8), the three steps stand side by side and none is marked right.

## Checking

```
node docs/world/play/surfaces.mjs            # writes _surfaces.json again from the source; prints the counts
node docs/world/play/surfaces.mjs --check    # fails if _surfaces.json no longer agrees with the source
node docs/world/play/textlint.mjs people.json   # checks one file
node docs/world/play/textlint.mjs               # checks all six; every key must be present
node docs/world/play/textlint.mjs --selftest    # plants a fault for each check and shows it caught
```

A failure is one line: file, key, check, reason. The check does not read for sense. A line can pass it and still be a quip, a saying, or a thing no cause covers. Rule 2 of the bible is the test for those: say it in plain, ugly words, and if it is dull that way, cut it.
