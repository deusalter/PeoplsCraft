# The world of Peopls Craft

This folder is the world bible. It describes a world and gives the cause of everything the game does. It has no plot, no protagonist, no dialogue trees and no endings. People writing item text, townsfolk lines, creature names, quests, art briefs and new systems work from it.

## Reading order

1. `01-ground.md`. What the world is, where it stands, what Peopls Craft means, and the cause of every mechanic. Read this first and in full. Its section 1.10 is a table of mechanic, cause and where a player can see the cause.
2. `02-history.md`. The past in the order it happened, the sources inside the world, and where they disagree.
3. `03-places.md`. The eighteen kinds of country and the thirteen kinds of old structure.
4. `04-the-eight.md`. The eight great feeders: what each is, why its bait works, and what its first killing costs.
5. `05-peoples.md`. Householders, the sand-country people, arrivals, the eight townsfolk, and what the peoples make of the players.
6. `06-materials.md`. Matter, the stations, crystal-work, trinkets, harm, food, and old things to find.
7. `07-creatures.md`. Every creature, the night, the moon and the three attacks.
8. `08-for-the-game.md`. An index in tables: what each kill opens and loses, what each country shows, what is proposed, and the changes the bible asks of the game.
9. `borrowed.md`. Every element taken from an existing fictional world, how it stands there, and how the game uses it. These elements may not be changed.
10. `invented.md`. Every element made for the game, and why the game needed it. These may be changed, with a reason.
11. `languages.md`. Which tongue names which kind of thing, the sounds of the two born tongues and the ordered changes that made them, and how to make a new name and check it. The rules, the script and the root list are in `lang/`.
12. `glossary.md`. Every display name in the game: its meaning, its roots, who named the thing and why, what other peoples call it, the old name and the internal key. It opens with a one-page guide. It is written by `lang/glossary.mjs` and is never edited by hand.
13. `names.json`. The same names as data, one entry for each internal key, with the rule for the names the game puts together and the letters the font needs. `node lang/derive.mjs --check names.json` checks it.
14. `names-apply.md`. Where each name goes in the game's source, and every sentence outside the data tables that carries an old name.

The chapters call game things by plain description or by their internal keys in code font (`altar3`, `boss:3`, `dim:1`). Keys are save-file identifiers and never change. The name the game shows for a key is in `glossary.md`.

## Rules for writing anything in this world

**Causes**

1. Every sentence the game shows must follow from a cause in `01-ground.md`. If no cause covers it, stop and add the gap to the chapter's open list. Do not make up a reason on the spot.
2. Say the idea in plain, ugly words with no poetic terms. If it is dull that way, or if it could be moved unchanged into any other fantasy game, cut it.
3. A borrowed image, myth or name has to change what happens in play. If it can be removed and nothing changes, remove it.
4. Everything strange needs a cause, and the past has to bite the present. For any piece of history, ask what part of today's situation would not exist without it. If the answer is nothing, cut the history.
5. Section 1.9 of the ground chapter lists what belongs to the game and has no cause in the world. Leave those unexplained.

**What may not be added to fill a gap**

6. No organisation, council, order, guild or office. No ceremony or festival. No greeting, folk saying, food or household custom. No personal token that stands for a person. No list made for the sake of its number. No matched pair made for the sake of the match.
7. Nothing done with words, song or gesture has any effect, and nothing is made stronger by many people doing it together. Power here is one person acting alone, with a body, a material and a cost. The ward is the model: made parts, one holder, a cost in the body, known ways of failing, and a trade round it.
8. A people is described by what it holds above itself, who rules it and why, what it believes and what follows from that. Daily-life texture is no part of that and is left unwritten.
9. No golden age, corruption, great war, fall, forgotten truth or prophecy. No chosen one. Events and places are named after places, people or what literally happened.

**Words**

10. No office words: ledger, clerk, record, registry, tally, schedule, procedure.
11. No temple words used for mood: rite, ritual, liturgy, litany, observance, sacrament.
12. The dead are never counted, in any form.
13. No "keeper" and no "keeping".
14. No coined terms. Use a plain description or leave the thing out. Where a term of the wider cosmos is used, use the spelling in `borrowed.md` exactly, with its marks.
15. No placeholder label used as a name.
16. No sentence that sets up one thing only to knock it down for another. No line that tells the reader how to feel. No closing line that states a moral. No sayings.
17. Short declarative sentences. Where a fact would do, give the fact.

**Truth and belief**

18. A plain statement in a chapter is firm for the people building the game. A statement given as a telling belongs to someone on the ground. In game text, nobody states the firm version of the history. Each source says what it would say, gains what it would gain and leaves out what it would leave out.
19. The eight great feeders are animals. They have no self and no speech. No boss speaks, bargains or guards anything. The words altar, offering, warden and sovereign belong to the people of the ground, who are wrong.
20. Death is final. An arrival falls and rises at a bed for the cause given in section 1.6. Never write an arrival's death, a return from death, or a born person rising.
21. Worlds are not planets. There is no space beyond the sky, and no text or art shows an edge to the ground.
22. No feeder is a likeness of a person. The ones the game draws upright have no face and no hands.

**Size**

23. Do not thin the world to make it tidy. Add as much as play can carry, as long as each thing added is real in play and has a cause.

**Upkeep**

24. Anything that is not in play is marked *proposed* where it is described and has a row in `08-for-the-game.md`.
25. Anything new goes into `invented.md` as a row, with the reason the game needed it and the borrowed element it sits beside. Nothing is added to `borrowed.md` without checking how it stands in its source.
26. No chapter may contradict another. Where two disagree, the ground chapter stands until it is changed, and every chapter is checked against the change.
