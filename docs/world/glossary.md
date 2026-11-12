# Glossary

Every display name in the game, with its meaning, its roots, who named the thing and why, what other peoples call it, the old name and the internal key. This file is written by `lang/glossary.mjs` from `names.json` and is never edited by hand. `languages.md` gives the rules behind the names, and `names-apply.md` says where each one goes in the source.

## A one-page guide

**Plain English.** All game text is English, and an ordinary thing has its ordinary name: turf, rubble, oak, torch, pick. A thing has a name in a tongue only where some people on the ground had a reason to name it and no plain word is true of it. 318 of the names shown in play are plain English.

**The householders' tongue.** The speech of the born who hold hearths: what the old trade speech became in their mouths over many generations. It names the countries, the kinds of feeder and the eight great ones, the trades of the townsfolk, and the metals found only on this ground. It is heard in doubled consonants, an h between vowels and clipped ends, and 161 names shown in play are in it or begin with a word of it.

**The sand-country tongue.** The sister speech of the people of the sand, who walked away from the hearths. It names their country, their fighters and their token, and it has its own forms of words both peoples share. It is heard in long vowels, sh, z and b, and every word of it ends in a vowel. 5 names shown in play are in it.

**The cutters' tongue.** Sanskrit proper, the speech of the cutting trade on every world. It is written with every mark. No name shown in play is in it, because each thing it could name here has a plain word, and its words in this file are for the glossary.

**Saying the born tongues.** Every letter is sounded. a as in *about*, ā as in *father*; i as in *bit*, ī as in *machine*; u as in *put*, ū as in *rule*; e as in *they*; o as in *go*. g is always hard, ch is as in *church*, sh as in *ship*. A doubled consonant is held for twice the time, as the k is in *bookcase*. An h is sounded wherever it is written. Below, each name of a born tongue is followed by its syllables, with the stressed one in capitals.

**Letters.** The names shown in play use these letters outside plain English: Ā ā ī ū. Names that are not shown use these as well: ṭ.

**The twenty names a player meets first.**

| Name | Said | What it is | Register | Meaning |
| --- | --- | --- | --- | --- |
| The Living Ground | as English | the world a player comes up on | plain English | the ground of a living world, as against the two remains of the earlier world |
| Yavas | YA-vas | open grass with a lone oak here and there | householders' tongue | grass, fodder, pasturage |
| Vana | VA-na | old oak wood | householders' tongue | a forest, wood |
| Turf | as English | the top piece of green ground | plain English | grass with the soil it grows in |
| Rubble | as English | what a pick brings out of stone | plain English | broken stone |
| Pick | as English | the tool word, as in Wooden Pick | plain English | a pick |
| Stone Furnace | as English | the first fire | plain English | a furnace of stone |
| Sheep | as English | the flock animal, gone wild | plain English | sheep |
| Kinva | KIN-va | a lump of red-skinned jelly that hops | householders' tongue | ferment |
| Kantak | KAN-tak | a walking body of bramble | householders' tongue | a thorn |
| Tama | TA-ma | the commonest thing in the dark | householders' tongue | darkness |
| Lūta | LŪ-ta | a small eight-legged crawler in caves | householders' tongue | a spider |
| Silahādak | si-la-HĀ-dak | a plated crawler that grinds at rock | householders' tongue | stone-eater |
| Holder's Bed | as English | the bed that houses a townsperson | plain English | a holder's bed |
| Desik | DE-sik | the first townsperson to come | householders' tongue | familiar with a place; a guide |
| Kammār | kam-MĀR | the townsperson who comes to an anvil | householders' tongue | a smith |
| Hīrak | HĪ-rak | the gem of the deep rock, and the fourth hardness | householders' tongue | diamond |
| Vanahar | VA-na-har | the first of the eight great feeders | householders' tongue | holding the wood (vana, a forest, wood + dhara, holding, bearing; dh between vowels wears to h) |
| Vanahar Altar | VA-na-har | the great stone where the first is baited | householders' tongue | the altar of Vanahar (holding the wood). Altar is the English word, as everyone on the ground uses it |
| Amāvassa | a-mā-VAS-sa | the night the moon is dark | householders' tongue | the night of new moon |

## Labels

The title, the attributes, the four ways of fighting and the chapters of the Guide.

| Name | Key | Old name | Meaning | Why |
| --- | --- | --- | --- | --- |
| Peopls Craft | `GAME_TITLE` | unchanged | the craft of the peopls | The name of the players and of what they do: the born's word for those who come up at the mouth, and the work the born cannot do and live (1.5). It stays as it is. |
| Agility | `attr:agi` | unchanged | quickness | The game's measure of practice (1.6). The plain word stays. |
| Arm | `attr:arc` | Arcana | the driving arm | The blue bar measures the arm: how much more it will take before it stops answering (1.6, 6.6). Practice at driving hardens it. Arcana claimed stored power and spells (8.11). |
| Strength | `attr:str` | unchanged | strength | A person gets better at what they do, and attribute points are the game's measure of that (1.6). The plain word stays. |
| Vitality | `attr:vit` | unchanged | how much a body will take | The game's measure of practice (1.6). The plain word stays. |
| Empty Hands | `chapter:1` | First Light | the first steps of the order of work | An arrival comes up at the mouth with empty hands, and the first steps are the cutter's own trade (1.6). First light is the hour a holder lifts the hand, and no step of the Guide wins it (8.11). |
| Iron and Root | `chapter:2` | unchanged | iron, and the first of the eight | Nothing false: the chapter takes a crew from iron to the animal bodied in root (4.3). It stays. |
| The Deep Stone | `chapter:3` | unchanged | the deep rock of the living ground | Nothing false. It stays. |
| Under the World | `chapter:4` | unchanged | the hollow | Arrivals speak of under the world and above it (3.1). It stays. |
| Above the World | `chapter:5` | unchanged | the islands | Arrivals speak of under the world and above it, and above carries their false belief about the islands (1.8, 3.1). It stays as an arrival's word. |
| The Dark Night | `chapter:6` | The Long Night | the night the moon is dark | The ground chapter's plain words for the eighth night of the moon's round (1.6). The old title, with the first, made light a thing won by killing (8.11). |
| After the Last | `chapter:7` | Epilogue | what follows the last of the eight | The ground chapter's own heading for what a crew can do once the eighth is dead (1.6). Nothing ends there, so the word for an ending goes. |
| Guide | `guide` | unchanged | the Guide | The Guide is the order of work as the householders tell it (1.6 The Guide). The present name is already right and stays. |
| Crystal-work | `style:magic` | Magic | driving crystal through cut lines | A staff is crystal on cut lines, and driving it is the same act as holding a ward, pointed at a body (5.7, 6.6). The chapters call the craft crystal-work. Magic claimed spells (8.11). |
| Melee | `style:melee` | unchanged | fighting hand to hand | Standing between the animals and the hand on the stone (5.7, 8.4). The plain word stays. |
| Ranged | `style:ranged` | unchanged | fighting from a distance | The bow is how a held place kills from inside what it has turned back and what flies over (5.7, 8.4). The plain word stays. |
| Totem | `style:summon` | Summoner | totem work | A totem carries food, and a small feeder forms on it and stays for the food (5.7, 6.6). Nothing is summoned or bound, so the label is the thing that is carried. |

## The three places

The living ground and the two remains that the gates lead to.

#### The Living Ground

plain English · key `dim:0` · was "Overworld"

- Meaning: the ground of a living world, as against the two remains of the earlier world.
- Why: Nobody named it. Arrivals know the frame and tell the ground of a living world from the remains of a dead one, and the hollow and the islands are remains (1.3). It is the ground chapter's own plain word.
- Other names for it:
  - **the ground** (plain English): the householders' plain word. They hold that it is the only ground there is (1.8).

#### The Hollow

plain English · key `dim:1` · was "Gloomroot Hollows"

- Meaning: the hollow inside the root.
- Why: The ground chapter's plain word for the inside of the root, which has the wood for floor and for roof (1.3, 3.4). Arrivals who cross say the hollow, and the gate that leads there is the Hollow Gate. The old name glued two nouns and was also the name of a country inside the place.
- Other names for it:
  - **Under** (plain English): the householders' word. They say what comes up at night comes from it, and none of them has seen it (3.6).
  - **Koṭara** (cutters' tongue): the hollow of a tree: the cutting trade's word for a hollow inside wood. It is for the glossary only, because the plain word is true of the place (L.11). From *koṭara*, the hollow of a tree (MW 312,3).

#### The Islands

plain English · key `dim:2` · was "The Skyrift"

- Meaning: the islands left of the earlier world.
- Why: The ground chapter's plain word for what is left of the world that grew on the root: islands in two layers with nothing under them (1.3, 3.5). The gate that leads there is the Island Gate. The old name glued two nouns and stated the arrivals' false belief as fact. Householders have no word for the place at all (3.6).
- Other names for it:
  - **above the world** (plain English): what arrivals say of it. They hold that the islands are in the sky over the living ground, which is false (1.8, 3.1).

## The countries

The eighteen kinds of country. The names are shown only in the debug overlay today.

### Names in a tongue, and names other peoples say differently

#### Vela

householders' tongue · key `beach` · was "Shore"

- Meaning: shore, coast; limit, boundary. Said VE-la.
- Roots: *velā*, limit, boundary; shore, coast; time of day (MW 1018,2).
- Named by the born. The born name the low edge of the land, where they make the salt every charge is packed in, by their word for a shore that is also a limit (3.2 beach).

#### Kusum

householders' tongue · key `bloomvale` · was "Bloomvale"

- Meaning: a flower, blossom. Said KU-sum.
- Roots: *kusuma*, a flower, blossom (MW 298,1).
- Named by the born. A rare country of short pale turf and thick flowers. The born name it for the flowers and cannot say why they grow there (3.2 bloomvale).

#### Pabbat

householders' tongue · key `crags` · was "Highcrags"

- Meaning: mountain. Said PAB-bat.
- Roots: *parvata*, mountain (MW 609,1).
- Named by the born. The born name the high stone country, where hard rock lies at the surface and the first comers cut their housing stone, by their word for a mountain (3.2 crags).

#### Marudesha

sand-country tongue · key `desert` · was "Amber Dunes"

- Meaning: waste country. Said MA-ru-de-sha.
- Roots: *maru*, a wilderness, sandy waste, desert (MW 790,1); *deśa*, region, place, country (MW 496,2).
- Named by the sand-country people. The sand-country people's name for their own country, the dry waste where the burrower let nothing else come up (3.2 desert, 5.3). The same word is in their name for the burrower.
- Other names for it:
  - **Marudes** (householders' tongue): the householders' form of the same two words. From *maru*, a wilderness, sandy waste, desert (MW 790,1); *-deśa*, region, place, country (MW 496,2).

#### Vana

householders' tongue · key `forest` · was "Greenwood"

- Meaning: a forest, wood. Said VA-na.
- Roots: *vana*, a forest, wood (MW 917,2).
- Named by the born. The born call the old oak wood, where villages stand whole under the trees, simply the wood; the pale wood is named against it (3.2 forest).

#### Aranna

householders' tongue · key `jungle` · was "Verdance"

- Meaning: a wilderness, forest. Said a-RAN-na.
- Roots: *araṇya*, a wilderness, forest (MW 86,3).
- Named by the born. The born name the hot wet wood by their word for wild forest away from any settlement, because no flock lives in it and no village was ever built there (3.2 jungle).

#### Samudda

householders' tongue · key `ocean` · was "Open Sea"

- Meaning: the sea. Said sa-MUD-da.
- Roots: *samudra*, the sea, ocean (MW 1166,3).
- Named by the born. The born name the one water by their word for the sea: all open water lies at one height and nothing comes up in it (3.1, 3.2 ocean).

#### Davalavan

householders' tongue · key `palewood` · was "Palebark Wood"

- Meaning: white wood. Said DA-va-la-van.
- Roots: *dhavala*, white, dazzling white (MW 513,2); *vana*, a forest, wood (MW 917,2).
- Named by the born. The born read how long a country has been left from its trees, open grass, then pale wood, then oak, and name the light wood of pale-barked trees on lately given-up pasture for its white bark (3.2 palewood).

#### Sānu

householders' tongue · key `peaks` · was "Snowcrown Peaks"

- Meaning: a summit, ridge, the top of a mountain. Said SĀ-nu.
- Roots: *sānu*, a summit, ridge, the top of a mountain (MW 1202,3).
- Named by the born. The ground above the snow, where nothing grows. The born name it for what it is, the tops of the high country (3.2 peaks).

#### Yavas

householders' tongue · key `plains` · was "Verdant Plains"

- Meaning: grass, fodder, pasturage. Said YA-vas.
- Roots: *yavasa*, grass, fodder, pasturage (MW 847,3).
- Named by the born. The born name the open grass for what it is to a hearth, which is pasture. The first comers cleared it for flocks, and the flocks have gone wild and still graze it (3.2 plains).

#### Kāsa

householders' tongue · key `savanna` · was "Amber Steppe"

- Meaning: kāśa, a tall grass used for mats and roofs. Said KĀ-sa.
- Roots: *kāśa*, a species of grass used for mats and roofs (MW 280,2).
- Named by the born. The born, who have villages here, name the country for the tall dry grass that covers it between trees cut thin for fuel (3.2 savanna).
- Other names for it:
  - **Darudesha** (sand-country tongue): timber country: the nearest wood to the sand, cut for the fires for as long as fires have burned there (3.2 savanna). From *dāru*, a piece of wood, wood, timber (MW 476,1); *deśa*, region, place, country (MW 496,2).

#### Panka

householders' tongue · key `swamp` · was "Mirefen"

- Meaning: mud, mire. Said PAN-ka.
- Roots: *paṅka*, mud, mire (MW 574,2).
- Named by the born. Wet lowland that never drains, where nobody built. The born name it for the mud (3.2 swamp).

#### Tusāravan

householders' tongue · key `taiga` · was "Frostpine Reach"

- Meaning: frost wood. Said tu-SĀ-ra-van.
- Roots: *tuṣāra*, frost, cold, snow, mist (MW 452,1); *vana*, a forest, wood (MW 917,2).
- Named by the born. The born name the cold pine wood by its cold, the cause of what they know of it: snow on its higher ground and none of the day kinds of feeder (3.2 taiga).

#### Hima

householders' tongue · key `tundra` · was "Whitefell"

- Meaning: snow, frost, cold. Said HI-ma.
- Roots: *hima*, cold, frost; (n.) frost, snow (MW 1298,3).
- Named by the born. Flat and white, with snow on the grass. No village was ever raised in it, and the born name it for the snow they see lying on it (3.2 tundra).

### Plain English

| Name | Key | Old name | Meaning | Why |
| --- | --- | --- | --- | --- |
| Fungus Caverns | `hollows` | Gloomroot Hollows | caverns of fungus | Named in plain words by the arrivals who cross by gate, for what they find: caverns floored with turf and great capped fungi on everything that has died there; no born person has seen it (3.4 hollows, 3.6). |
| Crystal Caverns | `hollows_crystal` | Glimmer Vaults | caverns of standing crystal | Named in plain words by arrivals for its bare floors and spires of azure and violet crystal; the same kind of place as the crystal caverns of the deep rock, and the bible calls those so (3.3, 3.4 hollows_crystal). |
| Island Meadow | `rift` | Skyrift Meadow | a meadow on the islands | Named in plain words by arrivals for the turf, grass, flowers and lit-leaved trees of the earlier world's surface, where the first comers camped (3.5 rift). |
| Crystal Islands | `rift_shards` | Prism Shoals | islands of standing crystal | Named in plain words by arrivals for the islands set with spires of pale crystal, the pasture of the island kinds (3.5 rift_shards). |

## Old structures

None has a name in play today, except that the compass says altar. The names are for the compass and for later text.

### Names in a tongue, and names other peoples say differently

#### Altar

plain English · key `arena1` · was (none; the compass says Nearest altar)

- Meaning: an altar.
- Why: The quest compass shows one name for every killing floor, now "Nearest altar"; everyone on the ground calls the great stones altars, a belief that is in born and arrival mouths (1.8, 2.5, README rule 19). This one is the floor of the first kind (3.7).
- Other names for it:
  - **Balisil** (householders' tongue): offering stone: the householders' own word for any altar, after the small kills they lay there (2.5, 5.2). From *bali*, tribute, offering, gift (MW 723,3). Note: also the daily offering of food to gods and spirits, and the name of a king of the Daityas; *śilā*, a stone, rock (MW 1073,1).
  - **great stone** (plain English): the plain word for the housing and its floor (1.6).

#### Altar

plain English · key `arena2` · was (none; the compass says Nearest altar)

- Meaning: an altar.
- Why: The quest compass shows one name for every killing floor, now "Nearest altar"; everyone on the ground calls the great stones altars, a belief that is in born and arrival mouths (1.8, 2.5, README rule 19). This one is the floor of the second kind (3.7).
- Other names for it:
  - **Balisil** (householders' tongue): offering stone: the householders' own word for any altar, after the small kills they lay there (2.5, 5.2). From *bali*, tribute, offering, gift (MW 723,3). Note: also the daily offering of food to gods and spirits, and the name of a king of the Daityas; *śilā*, a stone, rock (MW 1073,1).
  - **great stone** (plain English): the plain word for the housing and its floor (1.6).

#### Altar

plain English · key `arena3` · was (none; the compass says Nearest altar)

- Meaning: an altar.
- Why: The quest compass shows one name for every killing floor, now "Nearest altar"; everyone on the ground calls the great stones altars, a belief that is in born and arrival mouths (1.8, 2.5, README rule 19). This one is the floor of the third kind (3.7).
- Other names for it:
  - **Balisil** (householders' tongue): offering stone: the householders' own word for any altar, after the small kills they lay there (2.5, 5.2). From *bali*, tribute, offering, gift (MW 723,3). Note: also the daily offering of food to gods and spirits, and the name of a king of the Daityas; *śilā*, a stone, rock (MW 1073,1).
  - **great stone** (plain English): the plain word for the housing and its floor (1.6).

#### Altar

plain English · key `arena4` · was (none; the compass says Nearest altar)

- Meaning: an altar.
- Why: The quest compass shows one name for every killing floor, now "Nearest altar"; everyone on the ground calls the great stones altars, a belief that is in born and arrival mouths (1.8, 2.5, README rule 19). This one is the floor of the fourth kind, in the hollow (3.7).
- Other names for it:
  - **Balisil** (householders' tongue): offering stone: the householders' own word for any altar, after the small kills they lay there (2.5, 5.2). From *bali*, tribute, offering, gift (MW 723,3). Note: also the daily offering of food to gods and spirits, and the name of a king of the Daityas; *śilā*, a stone, rock (MW 1073,1).
  - **great stone** (plain English): the plain word for the housing and its floor (1.6).

#### Altar

plain English · key `arena5` · was (none; the compass says Nearest altar)

- Meaning: an altar.
- Why: The quest compass shows one name for every killing floor, now "Nearest altar"; everyone on the ground calls the great stones altars, a belief that is in born and arrival mouths (1.8, 2.5, README rule 19). This one is the floor of the fifth kind (3.7).
- Other names for it:
  - **Balisil** (householders' tongue): offering stone: the householders' own word for any altar, after the small kills they lay there (2.5, 5.2). From *bali*, tribute, offering, gift (MW 723,3). Note: also the daily offering of food to gods and spirits, and the name of a king of the Daityas; *śilā*, a stone, rock (MW 1073,1).
  - **great stone** (plain English): the plain word for the housing and its floor (1.6).

#### Altar

plain English · key `arena6` · was (none; the compass says Nearest altar)

- Meaning: an altar.
- Why: The quest compass shows one name for every killing floor, now "Nearest altar"; everyone on the ground calls the great stones altars, a belief that is in born and arrival mouths (1.8, 2.5, README rule 19). This one is the floor of the sixth kind, a made island (3.7).
- Other names for it:
  - **Balisil** (householders' tongue): offering stone: the householders' own word for any altar, after the small kills they lay there (2.5, 5.2). From *bali*, tribute, offering, gift (MW 723,3). Note: also the daily offering of food to gods and spirits, and the name of a king of the Daityas; *śilā*, a stone, rock (MW 1073,1).
  - **great stone** (plain English): the plain word for the housing and its floor (1.6).

#### Altar

plain English · key `arena7` · was (none; the compass says Nearest altar)

- Meaning: an altar.
- Why: The quest compass shows one name for every killing floor, now "Nearest altar"; everyone on the ground calls the great stones altars, a belief that is in born and arrival mouths (1.8, 2.5, README rule 19). This one is the floor of the seventh kind (3.7).
- Other names for it:
  - **Balisil** (householders' tongue): offering stone: the householders' own word for any altar, after the small kills they lay there (2.5, 5.2). From *bali*, tribute, offering, gift (MW 723,3). Note: also the daily offering of food to gods and spirits, and the name of a king of the Daityas; *śilā*, a stone, rock (MW 1073,1).
  - **great stone** (plain English): the plain word for the housing and its floor (1.6).

#### Altar

plain English · key `arena8` · was (none; the compass says Nearest altar)

- Meaning: an altar.
- Why: The quest compass shows one name for every killing floor, now "Nearest altar"; everyone on the ground calls the great stones altars, a belief that is in born and arrival mouths (1.8, 2.5, README rule 19). This one is the floor of the eighth kind (3.7).
- Other names for it:
  - **Balisil** (householders' tongue): offering stone: the householders' own word for any altar, after the small kills they lay there (2.5, 5.2). From *bali*, tribute, offering, gift (MW 723,3). Note: also the daily offering of food to gods and spirits, and the name of a king of the Daityas; *śilā*, a stone, rock (MW 1073,1).
  - **great stone** (plain English): the plain word for the housing and its floor (1.6).

### Plain English

| Name | Key | Old name | Meaning | Why |
| --- | --- | --- | --- | --- |
| Vault | `cache1` | (none) | a vault | Plain word: one room of dressed stone in the hollow, open at its doorway, as the bible calls it (3.7 cache1). |
| Island Store | `cache2` | (none) | a store on the islands | A small store of the first comers hung between the two layers of the islands, sealed by air because an island has no depth of rock to cut a room under (3.7). It has no name in play today. |
| Sealed Store | `dungeon` | (none) | a store sealed under rock | Plain words for what it is: a crews' store of dressed stone cut under solid rock with no way in from above, sealed and full (3.7 dungeon, 2.3). |
| Broken Store | `ruin` | (none) | a store that has been broken into | Plain words for what it is: a small surface store of the born hunters, its walls broken out by feeders, sand-country people and householders short of lees; nothing on this ground falls into ruin by itself (3.1, 3.7 ruin, 2.4). |
| Village | `village` | (none) | a village | Nobody needs another word: four to six houses round a well, whole and empty, which householders on the road still use (3.7 village). |

## The peoples

For writers. Game text says these in English.

#### Peopls

plain English · key `people:arrivals` · unchanged · not shown in play

- Meaning: persons with a sound left out; ones who look like persons and do not die when killed.
- Why: Already right: the born's word for arrivals, written peopls in the game's English in every mouth, and taken by arrivals for themselves (1.5, 5.6, L.9).
- Other names for it:
  - **Manuss** (householders' tongue): Manussa, a person, with its last sound left out on purpose. Made by hand, and never shown (L.9). From *manuṣya*, a human being, a man (MW 784,3). Cut by hand, not derived.
  - **Manūsh** (sand-country tongue): Manūsha, a person, with its last sound left out on purpose. Made by hand, and never shown (L.9). From *manuṣya*, a human being, a man (MW 784,3). Cut by hand, not derived.
  - **crew, cutter** (plain English): what arrivals also say among themselves, words of the trade they came with (5.6).

#### Householders

plain English · key `people:householders` · was (none) · not shown in play

- Meaning: people who hold a house.
- Why: The ground chapter's plain word for the born who hold hearths (1.4, 5.2).
- Other names for it:
  - **Gahapat** (householders' tongue): the master of a house: what one of them is called in their own tongue. For the glossary only. From *gṛhapati*, the master of a house, householder (MW 362,1).

#### sand-country people

plain English · key `people:sand` · was "Ashen" · not shown in play

- Meaning: the people of the sand country.
- Why: The plain words of the ground chapter for the born who burn what they kill (1.4, 5.3). Game text says them in English. Ashen was a word for a faction and had no cause.
- Other names for it:
  - **Maruzana** (sand-country tongue): people of the waste: what they call themselves, after the country the burrower held (5.3). From *maru*, a wilderness, sandy waste, desert (MW 790,1); *jana*, a living being, person; people, a race (MW 410,1).
  - **Marujan** (householders' tongue): the householders' form of the same two words. From *maru*, a wilderness, sandy waste, desert (MW 790,1); *jana*, a living being, person; people, a race (MW 410,1).

## The eight great feeders

The names on the boss bars.

#### Vanahar

householders' tongue · key `b_colossus` · was "Mossback Colossus"

- Meaning: holding the wood (vana, a forest, wood + dhara, holding, bearing; dh between vowels wears to h). Said VA-na-har.
- Roots: *vana*, a forest, wood (MW 917,2); *dhara*, holding, bearing, supporting (MW 510,1). Note: chiefly the last part of a compound; alone it is said of two gods as bearers of the world.
- Named by the born. Householders say each great feeder was set over its country by the forebears and can be seen to hold it, as a lit stone did (4.11, 5.2). This one lies at the stones of the woodland kinds, in the country they call Vana, a short walk from the mouth (4.3).
- Other names for it:
  - **the woodland strongest** (plain English): what arrivals call it: the strongest of the woodland host, the first of the order of work (4.11).

#### Kuranga

householders' tongue · key `b_hart` · was "Moonbound Hart"

- Meaning: an antelope or deer. Said ku-RAN-ga.
- Roots: *kuraṅga*, a species of antelope; an antelope or deer in general (MW 293,3). Note: also, as mṛga is, the spot in the moon.
- Named by the born. It runs on four legs and carries tines, which is the shape of the deep kind's largest (4.9). The born say that on the dark night the moon is hollow and what was in it has come down, and they name the largest of what came down for the animal it looks like (1.6, 1.8).
- Other names for it:
  - **the deep strongest** (plain English): what arrivals call it: the strongest of the deep kind (4.9).

#### Ratan

householders' tongue · key `b_luminarch` · was "The Luminarch"

- Meaning: a jewel, gem. Said RA-tan.
- Roots: *ratna*, a jewel, gem; a treasure (MW 864,2).
- Named by the born. No born person has seen it, and householders have no word for the islands (3.6). What they have is the pattern of its bait, which is a lens, and the telling that the animal is bodied in crystal and that light calls it (4.8). They name it for a gem.
- Other names for it:
  - **the crystal strongest** (plain English): what arrivals call it: the strongest of the islands' crystal kinds (4.8).

#### Maruhar

householders' tongue · key `b_maw` · was "Dune Maw"

- Meaning: holding the waste (maru, a sandy waste, desert + dhara, holding). Said MA-ru-har.
- Roots: *maru*, a wilderness, sandy waste, desert (MW 790,1); *dhara*, holding, bearing, supporting (MW 510,1). Note: chiefly the last part of a compound; alone it is said of two gods as bearers of the world.
- Named by the born. Householders give the burrower the name of a thing that holds a country, as they do the woodland one, for the waste that is its own ground (4.4, 4.11, 5.2).
- Other names for it:
  - **Marudara** (sand-country tongue): holding the waste: the same two words worn the sand country's way. The sand-country people held the burrower above themselves as the thing that held their country (5.3). From *maru*, a wilderness, sandy waste, desert (MW 790,1); *dhara*, holding, bearing, supporting (MW 510,1). Note: chiefly the last part of a compound; alone it is said of two gods as bearers of the world.
  - **the burrower** (plain English): what arrivals call it (4.4).

#### Jīmūt

householders' tongue · key `b_regent` · was "Tempest Regent"

- Meaning: a cloud. Said jī-MŪT.
- Roots: *jīmūta*, a cloud (MW 422,1). Note: also the name of a wrestler and of a sage in the Mahābhārata.
- Named by the born. Storm is the born's word for the animal overhead (4.7). It is pale, it never lands, and what it throws falls from above, so they name it as they name a cloud. The old name made it a regent.
- Other names for it:
  - **the flier** (plain English): what arrivals call it (4.7).

#### Nihān

householders' tongue · key `b_sovereign` · was "Cairn Sovereign"

- Meaning: a store, hoard; a place for depositing anything. Said ni-HĀN.
- Roots: *nidhāna*, a place for depositing; a store, hoard (MW 548,3).
- Named by the born. Householders say their forebears closed their first and best stone under the cairn to save it for the day it could be lit again, and their telling makes the animal that comes up through the base a store that can be opened (4.10).
- Other names for it:
  - **Dūmara** (sand-country tongue): dying hard, tenacious of life. The sand-country people say the heap was closed over a thing that could not be killed, by people who then set lamps round it (4.10). From *durmara*, dying hard, tenacious of life (MW 486,2).
  - **the stone-eater** (plain English): what arrivals call it: the strongest of the stone-eating kind, in the base of the eighth stone (4.10).

#### Guhamāt

householders' tongue · key `b_sporemother` · was "Sporemother"

- Meaning: mother of the caves (guhā, a cave + mātṛ, a mother, any mother, said also of animals). Said gu-ha-MĀT.
- Roots: *guhā*, a cave, hiding-place (MW 360,3); *mātṛ*, mother (MW 807,1).
- Named by the born. The born say mother of it, because small feeders form round the large one on the pieces of cap that fall from it (4.6, 4.13). No householder has seen the hollow (3.6), so the saying is one that came down with the telling of the Guide, and the caves are where the telling puts it.
- Other names for it:
  - **the fungus strongest** (plain English): what arrivals call it: the strongest of the hollow's fungus kinds (4.6).

#### Kankāl

householders' tongue · key `b_warden` · was "The Pale Warden"

- Meaning: a skeleton. Said kan-KĀL.
- Roots: *kaṅkāla*, skeleton (MW 242,2).
- Named by the born. Householders know the shade-kind as the dark thing that comes to anything dead on land, and they sink their own dead in water against it (5.2, 7.3). Its strongest is pale where the rest are dark, and the pillars of its floor are stacked bone (4.5). They name it for bone. The old name made it a warden over a sealed way, and nothing was sealed (4.13).
- Other names for it:
  - **the shade strongest** (plain English): what arrivals call it: the strongest of the shade-kind (4.5).

## The eight kinds of host

For writers. The game shows no name for a kind.

#### Vanagan

householders' tongue · key `host:1` · not shown in play

- Meaning: host of the wood. Said VA-na-gan.
- Roots: *vana*, a forest, wood (MW 917,2); *-gaṇa*, a flock, troop, multitude (MW 343,1). Note: also the troop of attendants of a god.
- Named by the born. The woodland kinds feed on green growth and fed in the woods while their strongest lived (4.3, 7.3). The born name the kind for the country, as they name its strongest.
- Other names for it:
  - **woodland host** (plain English): the plain words the bible and arrivals use.

#### Vālukagan

householders' tongue · key `host:2` · not shown in play

- Meaning: host of sand (vālukā, sand + -gaṇa). Said VĀ-lu-ka-gan.
- Roots: *vālukā*, sand, gravel (MW 946,3). Note: the sand-country form reads as an English word for a white whale; the sand country is named from maru; *-gaṇa*, a flock, troop, multitude (MW 343,1). Note: also the troop of attendants of a god.
- Named by the born. The sand kinds feed on stone and where they feed in the open it falls to sand; their own ground is the sand country (4.4). The kinds of feeder are named by the born (L.1); the kind has no display name in the game today.
- Other names for it:
  - **Maruyūta** (sand-country tongue): pack of the waste: the sand-country word for the host of their own country. From *maru*, a wilderness, sandy waste, desert (MW 790,1); *-yūtha*, a herd, flock, troop (MW 856,1).
  - **sand host** (plain English): the plain words the bible and arrivals use.

#### Tamagan

householders' tongue · key `host:3` · not shown in play

- Meaning: host of the dark. Said TA-ma-gan.
- Roots: *tamas*, darkness (MW 438,1); *-gaṇa*, a flock, troop, multitude (MW 343,1). Note: also the troop of attendants of a god.
- Named by the born. The born call the common animal of this kind by their word for darkness, and the kind by the same word (7.3).
- Other names for it:
  - **shade-kind** (plain English): the plain words the bible and arrivals use.

#### Guhagan

householders' tongue · key `host:4` · not shown in play

- Meaning: host of the caves. Said GU-ha-gan.
- Roots: *guhā*, a cave, hiding-place (MW 360,3); *-gaṇa*, a flock, troop, multitude (MW 343,1). Note: also the troop of attendants of a god.
- Named by the born. The fungus kinds of the hollow. The born have the kind only from the telling, and name it for the caves where the telling puts its mother (4.6).
- Other names for it:
  - **fungus host** (plain English): the plain words the bible and arrivals use.

#### Ākāsagan

householders' tongue · key `host:5` · not shown in play

- Meaning: host of the sky. Said ā-KĀ-sa-gan.
- Roots: *ākāśa*, sky, open space (MW 127,1); *-gaṇa*, a flock, troop, multitude (MW 343,1). Note: also the troop of attendants of a god.
- Named by the born. The flying kinds feed on whatever is in the air, and their strongest never lands (4.7, 7.3). The born name the kind for the open air over them.
- Other names for it:
  - **flying host** (plain English): the plain words the bible and arrivals use.

#### Sakalagan

householders' tongue · key `host:6` · not shown in play

- Meaning: host of splinters (śakala, a chip, fragment, splinter + -gaṇa). Said SA-ka-la-gan.
- Roots: *śakala*, a chip, fragment, splinter; a potsherd (MW 1046,1); *-gaṇa*, a flock, troop, multitude (MW 343,1). Note: also the troop of attendants of a god.
- Named by the born. The kinds of the islands are bodied in splintered crystal (1.6, 4.8). The kinds of feeder are named by the born (L.1); the kind has no display name in the game today.
- Other names for it:
  - **crystal host** (plain English): the plain words the bible and arrivals use.

#### Chandagan

householders' tongue · key `host:7` · not shown in play

- Meaning: host of the moon (candra, the moon + -gaṇa). Said CHAN-da-gan.
- Roots: *candra*, the moon (MW 386,3); *-gaṇa*, a flock, troop, multitude (MW 343,1). Note: also the troop of attendants of a god.
- Named by the born. Everyone says the things of the dark night come down from the moon, so the householders' name for the deep kind has the moon in it (1.8, L.2). The kinds of feeder are named by the born (L.1); the kind has no display name in the game today.
- Other names for it:
  - **deep kind** (plain English): the plain words the bible and arrivals use.

#### Pāsānagan

householders' tongue · key `host:8` · not shown in play

- Meaning: host of stone (pāṣāṇa, a stone + -gaṇa). Said pā-SĀ-na-gan.
- Roots: *pāṣāṇa*, a stone (MW 624,1); *-gaṇa*, a flock, troop, multitude (MW 343,1). Note: also the troop of attendants of a god.
- Named by the born. The stone-eating kind feeds on rock and coal everywhere under the ground and its strongest is bodied in dressed stone (4.10, 7.3). The kinds of feeder are named by the born (L.1); the kind has no display name in the game today.
- Other names for it:
  - **stone-eating kind** (plain English): the plain words the bible and arrivals use.

## Creatures

Ordinary animals, feeders, the sand-country fighters, and what forms on a totem.

### Names in a tongue, and names other peoples say differently

#### Kajjot

householders' tongue · key `aether_wisp` · was "Aether Wisp"

- Meaning: a firefly. Said KAJ-jot.
- Roots: *khadyota*, a firefly (MW 334,2).
- Named by the first comers, through the born. It has no lasting shape. It forms round old crystal in the air over the islands, and what is seen is a bright point moving by itself (7.3). The first comers named it for the lit insect, and the name came down through the born (L.1).

#### Dāhaga

sand-country tongue · key `ashen_hexer` · was "Ashen Hexer"

- Meaning: burning, setting on fire. Said DĀ-ha-ga.
- Roots: *dāhaka*, burning, setting on fire (MW 477,2).
- Named by the sand-country people. His people name him for his work: the long iron with the basket head is the tool they burn a carcass with where it lies, and he throws its burning pitch (7.4, 5.3); Hexer states a spell and goes.
- Other names for it:
  - **Dāhak** (householders' tongue): burning, setting on fire. From *dāhaka*, burning, setting on fire (MW 477,2).

#### Shūra

sand-country tongue · key `ashen_raider` · was "Ashen Raider"

- Meaning: a strong or valiant man, a warrior. Said SHŪ-ra.
- Roots: *śūra*, a strong or valiant man, a warrior; (adj.) strong, valiant (MW 1086,1). Note: also the name of Kṛṣṇa's grandfather and of a people.
- Named by the sand-country people. A fighter with a blade who marches for a fire (5.3, 7.4). The name is what his own people call a man who marches. Ashen was a word for a faction and had no cause.
- Other names for it:
  - **Sūra** (householders' tongue): the householders' form of the same word. From *śūra*, a strong or valiant man, a warrior; (adj.) strong, valiant (MW 1086,1). Note: also the name of Kṛṣṇa's grandfather and of a people.

#### Kaddam

householders' tongue · key `bog_lurker` · was "Bog Lurker"

- Meaning: mud, mire. Said KAD-dam.
- Roots: *kardama*, mud, mire (MW 258,1).
- Named by the born. The born know it only as a head showing in the mud of the mire, where it comes up and lies, and name it for the mud it is bodied in (7.3).

#### Lūta

householders' tongue · key `cave_skitter` · was "Cave Skitter"

- Meaning: a spider. Said LŪ-ta.
- Roots: *lūtā*, a spider (MW 905,3).
- Named by the born. A small eight-legged crawler bodied in fibre and in the white thread that fungus puts through rock (7.3). The born name it for the animal it looks like.

#### Angār

householders' tongue · key `cinder_wisp` · was "Cinder Wisp"

- Meaning: charcoal, heated or not. Said an-GĀR.
- Roots: *aṅgāra*, charcoal, either heated or not heated (MW 8,1).
- Named by the born. What is seen is a live coal in the air over the sand and the molten rock, and the born name it for that coal; the sand-country people, whose fires have wisps over them, say their own form of the same word (7.3, 5.3).
- Other names for it:
  - **Angāra** (sand-country tongue): the same word as the sand-country people say it. The wisps hang over the warm ash of their fires (7.3). From *aṅgāra*, charcoal, either heated or not heated (MW 8,1).

#### Jatu

householders' tongue · key `crag_bat` · was "Crag Bat"

- Meaning: a bat. Said JA-tu.
- Roots: *jatū*, a bat (MW 409,3 (under jatu)). Note: Vedic only; easily taken for jatu (n.), lac or gum.
- Named by the born. Householders see it at night over the crags and peaks, a flier that roosts and hangs under overhangs, and call it a bat (7.3, 7.6).

#### Kīta

householders' tongue · key `dune_mite` · was "Dune Mite"

- Meaning: a worm, insect. Said KĪ-ta.
- Roots: *kīṭa*, a worm, insect (MW 284,3). Note: at the end of a compound it is a word of contempt.
- Named by the first comers, through the born. A plated six-legged crawler shed from between the burrower's plates, named by the first comers who brought the burrower up for what it plainly is, an insect (7.3, 4.4, L.1).

#### Vaka

householders' tongue · key `frost_stalker` · was "Frost Stalker"

- Meaning: a wolf. Said VA-ka.
- Roots: *vṛka*, a wolf (MW 1008,1).
- Named by the born. A pale four-legged runner of the cold country that follows at the edge of sight in ones to threes (7.3). The born of the pine villages name it for the animal it looks like. The old name was an adjective and a noun.

#### Kinva

householders' tongue · key `gelcap` · was "Gelcap"

- Meaning: ferment. Said KIN-va.
- Roots: *kiṇva*, ferment; a drug or seed used to produce fermentation (MW 282,2).
- Named by the born. It has no lasting shape and forms in the jelly that rots out of fallen growth (7.3). The born see a lump of that rot moving in the grass and name it for the rot. The old name glued two nouns.

#### Tama

householders' tongue · key `gloomshade` · was "Gloomshade"

- Meaning: darkness. Said TA-ma.
- Roots: *tamas*, darkness (MW 438,1).
- Named by the born. The born, who sit up at their hearths beside their dead because of it, see an upright dark thing the height of a person that is the commonest thing in the dark and name it for that (7.3, 5.2).

#### Sagāl

householders' tongue · key `glowmaw` · was "Glowmaw"

- Meaning: a jackal. Said sa-GĀL.
- Roots: *śṛgāla*, a jackal (MW 1087,1 (see sṛgāla, 1245,1)). Note: also written sṛgāla; said of a rogue or a coward.
- Named by the first comers, through the born. A long-jawed runner of the hollow that feeds on the fungus kinds on sufferance (7.3). No born person has seen it. The name is the one the first comers gave it, for the animal it looks like, as it came down through the born (L.1). The old name glued two nouns.

#### Ulūk

householders' tongue · key `lunar_howler` · was "Lunar Howler"

- Meaning: an owl. Said u-LŪK.
- Roots: *ulūka*, an owl (MW 218,3).
- Named by the born. The deep kind's flier, in the air on the dark night only. It calls before it stoops, and the call is heard before anything is seen (7.3). The born name it for the night bird that does the same.

#### Jālak

householders' tongue · key `m_brazier` · was "Brazier Spirit"

- Meaning: little flame. Said JĀ-lak.
- Roots: *jvāla*, flame (MW 428,2); *-ka*, an ending: little X.
- Named by the born. The trade names it by its look, an ember in the air (7.5, 5.5 beastcaller); Spirit states a wrong belief and goes.

#### Dīpik

householders' tongue · key `m_cairn` · was "Cairnlight"

- Meaning: a light, lamp, lantern. Said DĪ-pik.
- Roots: *dīpikā*, a light, lamp, lantern (MW 481,2).
- Named by the born. What forms on the totem whose head is a lamp from the housing of an eighth stone is a point of yellow light, and the trade names it for the lamp (7.5, 4.10, 5.5 beastcaller); Cairnlight is a glued pair and says the cairn is lit.

#### Harinak

householders' tongue · key `m_moon` · was "Moonbound Fawn"

- Meaning: little deer. Said HA-ri-nak.
- Roots: *hariṇa*, a deer, antelope (MW 1291,2); *-ka*, an ending: little X.
- Named by the born. The trade names it by its look, a dark four-legged thing with pale tines a hand high (7.5, 5.5 beastcaller); Moonbound says something binds it to the moon, and nothing does.

#### Chattak

householders' tongue · key `m_mycelid` · was "Mycelid Sprite"

- Meaning: little parasol. Said CHAT-tak.
- Roots: *chattra*, a parasol, umbrella (MW 404,1); *-ka*, an ending: little X.
- Named by the born. The trade names it by its look, a small lit fungus cap like a little parasol (7.5, 5.5 beastcaller); Sprite states a wrong belief and goes.

#### Jatuk

householders' tongue · key `m_shade` · was "Bound Shade"

- Meaning: little bat. Said JA-tuk.
- Roots: *jatū*, a bat (MW 409,3 (under jatu)). Note: Vedic only; easily taken for jatu (n.), lac or gum; *-ka*, an ending: little X.
- Named by the born. The trade names it by its look, a small dark flier (7.5, 5.5 beastcaller); Bound says something binds it, and nothing does (7.5).

#### Sakalak

householders' tongue · key `m_shardling` · was "Shard Mote"

- Meaning: little splinter. Said SA-ka-lak.
- Roots: *śakala*, a chip, fragment, splinter; a potsherd (MW 1046,1); *-ka*, an ending: little X.
- Named by the born. The trade names it by its look, a lit splinter like a small one of the island kind (7.5, 7.3, 5.5 beastcaller).

#### Sūlak

householders' tongue · key `m_thornling` · was "Thornling"

- Meaning: little spike. Said SŪ-lak.
- Roots: *śūla*, a spike, stake; any sharp pain (MW 1086,3); *-ka*, an ending: little X.
- Named by the born. The trade that feeds small feeders by hand names each by its look, and what forms on an iron totem is a green lump with a thorn (7.5, 5.5 beastcaller); its old name was the same as the wild kind's.

#### Kanik

householders' tongue · key `m_wisp` · was "Lumen Wisp"

- Meaning: a drop, atom, small particle. Said KA-nik.
- Roots: *kaṇikā*, a drop, atom, small particle (MW 245,1).
- Named by the born. What forms on the totem with a head of the gem is a point of the gem's colour, and the trade names it for a speck (7.5, 5.5 beastcaller). The old name called it a wisp of light.

#### Setasalaha

householders' tongue · key `m_zephyr` · was "Zephyr"

- Meaning: white moth. Said SE-ta-sa-la-ha.
- Roots: *śveta*, white, bright (MW 1106,2); *śalabha*, a moth, grasshopper, locust (MW 1059,2).
- Named by the born. The trade names it by its look, a small white flier, and calls such a flier a moth as it calls the wild one (7.5, 7.3, 5.5 beastcaller); Zephyr is a wind and says nothing true of it.

#### Chandasāvak

householders' tongue · key `moonspawn` · was "Moonspawn"

- Meaning: young of the moon. Said chan-da-SĀ-vak.
- Roots: *candra*, the moon (MW 386,3); *śāvaka*, the young of any animal (MW 1068,2).
- Named by the born. The born say that on the dark night the moon is hollow and what was in it has come down, so their name for the deep kind makes it the moon's young, which is false: it comes up out of the root (1.6, 1.8, L.2).

#### Asikavak

householders' tongue · key `mycelid_knight` · was "Mycelid Knight"

- Meaning: sword mushroom. Said A-si-ka-vak.
- Roots: *asi*, a sword, knife (MW 120,2); *kavaka*, a mushroom, fungus (MW 264,1).
- Named by the first comers, through the born. The first comers met it in their vaults in the hollow, a fungus two strides tall with one limb grown out into an edge, and the name came down with the trade (7.3, 5.4, L.1); Knight says it is a person and goes.

#### Vihanga

householders' tongue · key `rift_ray` · was "Rift Ray"

- Meaning: a bird; sky-going. Said vi-HAN-ga.
- Roots: *vihaṃga*, a bird; (adj.) sky-going, flying (MW 1003,1). Note: also the name of a serpent-demon in the Mahābhārata.
- Named by the first comers, through the born. The flier of the islands, broad and scaled, which rides under an island rim and never lands (7.3). No born person has seen it. The name is the one the first comers gave it, as it came down through the born (L.1).

#### Nihirakka

householders' tongue · key `rustbound` · was "Rustbound Sentinel"

- Meaning: store-guarding. Said ni-hi-RAK-ka.
- Roots: *nidhi*, a store, hoard, treasure (MW 548,3); *rakṣā*, guarding, protection; an amulet (MW 860,1).
- Named by the born. The born say it was posted in the sealed stores, so their name is that of a thing set to guard a store, which is false: it nests on its food (7.3); Sentinel states the same belief as a title and goes.

#### Sakal

householders' tongue · key `shardling` · was "Shardling"

- Meaning: a chip, splinter. Said SA-kal.
- Roots: *śakala*, a chip, fragment, splinter; a potsherd (MW 1046,1).
- Named by the first comers, through the born. Its shards are the bait for the strongest of the islands, which the born teach in the Guide, and the kind is named for the splintered crystal it is bodied in (7.3, 4.8).

#### Bedaga

sand-country tongue · key `siege_brute` · was "Siege Brute"

- Meaning: breaking into or through. Said BE-da-ga.
- Roots: *bhedaka*, breaking into or through, piercing (MW 766,2).
- Named by the sand-country people. The breaker: the biggest of a march, who carries a beam for doors and chests and walks at the nearest door (7.4). His people name him for the work.
- Other names for it:
  - **Bedak** (householders' tongue): the householders' form of the same word. From *bhedaka*, breaking into or through, piercing (MW 766,2).

#### Kavak

householders' tongue · key `sporeling` · was "Sporeling"

- Meaning: a mushroom, fungus. Said KA-vak.
- Roots: *kavaka*, a mushroom, fungus (MW 264,1).
- Named by the first comers, through the born. Its sacs are the bait for the strongest of the hollow, which the born teach in the Guide, and the name came down from the first comers with the trade for what is seen: a lit cap that hops (7.3, 4.6, L.1).

#### Paroha

householders' tongue · key `sproutling` · was "Sproutling"

- Meaning: a sprout, shoot. Said PA-ro-ha.
- Roots: *praroha*, a sprout, shoot (MW 689,2).
- Named by the first comers, through the born. The least of the woodland host, bodied in sprout, named by kind for what it is bodied in as the first comers knew it at the first stones (7.3, 4.3, L.1); the diminutive goes.

#### Silahādak

householders' tongue · key `stonegnawer` · was "Stonegnawer"

- Meaning: stone-eater. Said si-la-HĀ-dak.
- Roots: *śilā*, a stone, rock (MW 1073,1); *khādaka*, an eater, devourer (MW 339,1).
- Named by the first comers, through the born. A plated crawler that feeds on rock, and on coal where it finds it. It is found with its head against a wall or a seam, and its grinding carries through rock (7.3). The first comers met it in their stores and their diggings and named it for what it does, and the name came down through the born.

#### Kantak

householders' tongue · key `thornling` · was "Thornling"

- Meaning: a thorn. Said KAN-tak.
- Roots: *kaṇṭaka*, a thorn (MW 245,2).
- Named by the born. The born walk the woods by day past a body of bramble standing rooted among the bushes and taken for one, and name it for what it is bodied in (7.3, 1.6).

#### Salaha

householders' tongue · key `umbral_moth` · was "Umbral Moth"

- Meaning: a moth. Said SA-la-ha.
- Roots: *śalabha*, a moth, grasshopper, locust (MW 1059,2).
- Named by the first comers, through the born. Its dust is what the kite bait carries up, which the born teach in the Guide, and they call the flier that leaves it a moth (7.3, 4.7).

### Plain English

| Name | Key | Old name | Meaning | Why |
| --- | --- | --- | --- | --- |
| Boar | `burrowhog` | Burrowhog | boar | A tusked rooter of the cold woods (7.2) is an ordinary animal arrivals know; the glued Burrow+hog goes for the plain word. |
| Hare | `dune_skipper` | Dune Skipper | hare | A small long-eared runner of the sand and dry grass that runs and stands still by turns (7.2) is a hare to anyone who has seen one. |
| Fish | `glimmerfin` | Glimmerfin | fish | A bright fish in any water, the one creature no feeder shares its country with (7.2, 3.1), is an ordinary fish; the glued Glimmer+fin goes. |
| Grouse | `gobblet` | Gobblet | grouse | A knee-high ground bird of woods, grass and wet country that calls all day (7.2) is a bird arrivals know as a grouse; the cute coinage goes. |
| Sheep | `woolback` | Woolback | sheep | A horned grazer in a heavy coat that runs in small herds is the flocks gone wild that people here live on (1.6, 7.2); arrivals know the animal, so it has the plain word, and the glued Wool+back goes. |

## Townsfolk

Each name is stored twice in the source, once for the townsperson and once for the body, and the two entries are changed together.

#### Vejja

householders' tongue · key `apothecary` · was "Apothecary"

- Meaning: a physician. Said VEJ-ja.
- Roots: *vaidya*, a physician (MW 1022,3).
- Named by the born. A householder whose trade is the holder's body: the arm after a night at the stone, and the hand after a lifetime of nights (5.5). The born word for one who treats a body.
- A personal name, not shown in play: **Manjar** (householders' tongue), a cluster of blossoms, from *mañjarī*, a cluster of blossoms; a shoot, sprig (MW 773,3). Offered for text that needs to call this householder by a name. It is one ordinary word, worn as the born wear every word. No chapter gives a custom for naming children, so the name says nothing of the trade, and the game shows the trade word.

#### Posak

householders' tongue · key `beastcaller` · was "Beastcaller"

- Meaning: one who feeds, a breeder. Said PO-sak.
- Roots: *poṣaka*, nourishing, feeding; a breeder (MW 650,2).
- Named by the born. A householder who feeds small feeders on unsalted remains and lets them fight at the edge (5.5). The born name the trade for the feeding. The old name said the animal is called, and it stays only for the food.
- A personal name, not shown in play: **Harit** (householders' tongue), green, from *harita*, green, yellowish, pale yellow (MW 1291,2). Offered for text that needs to call this householder by a name. It is one ordinary word, worn as the born wear every word. No chapter gives a custom for naming children, so the name says nothing of the trade, and the game shows the trade word.

#### Deserter

plain English · key `deserter` · was "Ashen Deserter"

- Meaning: one who left.
- Why: A sand-country man who came with a march and did not go home with it (5.5); householders say it in plain English, and "Ashen" was a faction word with no cause.
- Other names for it:
  - **Palāyida** (sand-country tongue): fled, defeated. From *palāyita*, fled, defeated (MW 610,1).
- A personal name, not shown in play: **Kāzūra** (sand-country tongue), the wild date-palm, from *kharjūra*, the wild date-palm (Phoenix sylvestris) (MW 337,3). Offered for text that needs to call him by a name. He is a sand-country man, so it is one ordinary word worn as his people wear words. No chapter gives a custom for naming children.

#### Vejja

householders' tongue · key `n_apothecary` · was "Apothecary" · the same thing as `apothecary`

- Meaning: a physician. Said VEJ-ja.
- Roots: *vaidya*, a physician (MW 1022,3).
- Named by the born. The body of the same householder. The name tag over the head reads this copy, and the two are changed together.
- A personal name, not shown in play: **Manjar** (householders' tongue), a cluster of blossoms, from *mañjarī*, a cluster of blossoms; a shoot, sprig (MW 773,3). Offered for text that needs to call this householder by a name. It is one ordinary word, worn as the born wear every word. No chapter gives a custom for naming children, so the name says nothing of the trade, and the game shows the trade word.

#### Posak

householders' tongue · key `n_beastcaller` · was "Beastcaller" · the same thing as `beastcaller`

- Meaning: one who feeds, a breeder. Said PO-sak.
- Roots: *poṣaka*, nourishing, feeding; a breeder (MW 650,2).
- Named by the born. The body of the same householder. The name tag over the head reads this copy, and the two are changed together.
- A personal name, not shown in play: **Harit** (householders' tongue), green, from *harita*, green, yellowish, pale yellow (MW 1291,2). Offered for text that needs to call this householder by a name. It is one ordinary word, worn as the born wear every word. No chapter gives a custom for naming children, so the name says nothing of the trade, and the game shows the trade word.

#### Deserter

plain English · key `n_deserter` · was "Ashen Deserter"

- Meaning: one who left.
- Why: A sand-country man who came with a march and did not go home with it (5.5); householders say it in plain English, and "Ashen" was a faction word with no cause.
- Other names for it:
  - **Palāyida** (sand-country tongue): fled, defeated. From *palāyita*, fled, defeated (MW 610,1).
- A personal name, not shown in play: **Kāzūra** (sand-country tongue), the wild date-palm, from *kharjūra*, the wild date-palm (Phoenix sylvestris) (MW 337,3). Offered for text that needs to call him by a name. He is a sand-country man, so it is one ordinary word worn as his people wear words. No chapter gives a custom for naming children.

#### Vāhak

householders' tongue · key `n_provisioner` · was "Provisioner" · the same thing as `provisioner`

- Meaning: one who bears or carries. Said VĀ-hak.
- Roots: *vāhaka*, one who bears or carries, a bearer, carrier (MW 949,1).
- Named by the born. The body of the same householder. The name tag over the head reads this copy, and the two are changed together.
- A personal name, not shown in play: **Uppal** (householders' tongue), the blue lotus, from *utpala*, the blue lotus, a water-lily (MW 180,3). Offered for text that needs to call this householder by a name. It is one ordinary word, worn as the born wear every word. No chapter gives a custom for naming children, so the name says nothing of the trade, and the game shows the trade word.

#### Rehakār

householders' tongue · key `n_runescribe` · was "Runescribe" · the same thing as `runescribe`

- Meaning: maker of lines. Said re-ha-KĀR.
- Roots: *rekhā*, a scratch, streak, stripe, line (MW 887,1); *-kāra*, making, doing; a maker, doer (at the end of a compound) (MW 274,2).
- Named by the born. The body of the same householder. The name tag over the head reads this copy, and the two are changed together.
- A personal name, not shown in play: **Saral** (householders' tongue), a pine tree, from *sarala*, a species of pine tree (MW 1182,2). Note: chiefly (adj.) straight, upright, artless; a common given name. Offered for text that needs to call this householder by a name. It is one ordinary word, worn as the born wear every word. No chapter gives a custom for naming children, so the name says nothing of the trade, and the game shows the trade word.

#### Kammār

householders' tongue · key `n_smith` · was "Smith" · the same thing as `smith`

- Meaning: a smith. Said kam-MĀR.
- Roots: *karmāra*, an artisan, a blacksmith (MW 259,3).
- Named by the born. The body of the same householder. The name tag over the head reads this copy, and the two are changed together.
- A personal name, not shown in play: **Lata** (householders' tongue), a creeper, from *latā*, a creeper, creeping plant (MW 895,3). Offered for text that needs to call this householder by a name. It is one ordinary word, worn as the born wear every word. No chapter gives a custom for naming children, so the name says nothing of the trade, and the game shows the trade word.

#### Kāru

householders' tongue · key `n_tinker` · was "Tinker" · the same thing as `tinker`

- Meaning: a maker, an artisan. Said KĀ-ru.
- Roots: *kāru*, an artisan, maker (MW 275,1).
- Named by the born. The body of the same householder. The name tag over the head reads this copy, and the two are changed together.
- A personal name, not shown in play: **Kesar** (householders' tongue), the filament of a flower, from *kesara*, the filament of a flower; a mane (MW 310,3). Offered for text that needs to call this householder by a name. It is one ordinary word, worn as the born wear every word. No chapter gives a custom for naming children, so the name says nothing of the trade, and the game shows the trade word.

#### Desik

householders' tongue · key `n_wayfinder` · was "Wayfinder" · the same thing as `wayfinder`

- Meaning: familiar with a place; a guide. Said DE-sik.
- Roots: *deśika*, familiar with a place; a guide (MW 496,3). Note: (m.) a spiritual teacher.
- Named by the born. The body of the same householder. The name tag over the head reads this copy, and the two are changed together.
- A personal name, not shown in play: **Kumud** (householders' tongue), the white water-lily, from *kumuda*, the white water-lily (MW 292,3). Offered for text that needs to call this householder by a name. It is one ordinary word, worn as the born wear every word. No chapter gives a custom for naming children, so the name says nothing of the trade, and the game shows the trade word.

#### Vāhak

householders' tongue · key `provisioner` · was "Provisioner"

- Meaning: one who bears or carries. Said VĀ-hak.
- Roots: *vāhaka*, one who bears or carries, a bearer, carrier (MW 949,1).
- Named by the born. A householder whose trade is carrying goods from hearth to hearth (5.5). The born name the trade for the carrying.
- A personal name, not shown in play: **Uppal** (householders' tongue), the blue lotus, from *utpala*, the blue lotus, a water-lily (MW 180,3). Offered for text that needs to call this householder by a name. It is one ordinary word, worn as the born wear every word. No chapter gives a custom for naming children, so the name says nothing of the trade, and the game shows the trade word.

#### Rehakār

householders' tongue · key `runescribe` · was "Runescribe"

- Meaning: maker of lines. Said re-ha-KĀR.
- Roots: *rekhā*, a scratch, streak, stripe, line (MW 887,1); *-kāra*, making, doing; a maker, doer (at the end of a compound) (MW 274,2).
- Named by the born. A householder whose trade is cutting lines in stone, which carry what the hand drives down to the charge (5.5). The born name the trade for what it makes. The old name claimed runes, and the lines are no writing (2.3).
- A personal name, not shown in play: **Saral** (householders' tongue), a pine tree, from *sarala*, a species of pine tree (MW 1182,2). Note: chiefly (adj.) straight, upright, artless; a common given name. Offered for text that needs to call this householder by a name. It is one ordinary word, worn as the born wear every word. No chapter gives a custom for naming children, so the name says nothing of the trade, and the game shows the trade word.

#### Kammār

householders' tongue · key `smith` · was "Smith"

- Meaning: a smith. Said kam-MĀR.
- Roots: *karmāra*, an artisan, a blacksmith (MW 259,3).
- Named by the born. A householder whose trade is metal, who works at a fire by day and holds by night (5.5). The born word for a smith.
- A personal name, not shown in play: **Lata** (householders' tongue), a creeper, from *latā*, a creeper, creeping plant (MW 895,3). Offered for text that needs to call this householder by a name. It is one ordinary word, worn as the born wear every word. No chapter gives a custom for naming children, so the name says nothing of the trade, and the game shows the trade word.

#### Kāru

householders' tongue · key `tinker` · was "Tinker"

- Meaning: a maker, an artisan. Said KĀ-ru.
- Roots: *kāru*, an artisan, maker (MW 275,1).
- Named by the born. A householder whose trade is small worked pieces: knowing what each does, mending them, and joining two into one (5.5). The born word for one who makes small things with the hands.
- A personal name, not shown in play: **Kesar** (householders' tongue), the filament of a flower, from *kesara*, the filament of a flower; a mane (MW 310,3). Offered for text that needs to call this householder by a name. It is one ordinary word, worn as the born wear every word. No chapter gives a custom for naming children, so the name says nothing of the trade, and the game shows the trade word.

#### Desik

householders' tongue · key `wayfinder` · was "Wayfinder"

- Meaning: familiar with a place; a guide. Said DE-sik.
- Roots: *deśika*, familiar with a place; a guide (MW 496,3). Note: (m.) a spiritual teacher.
- Named by the born. A householder with the longest road of any, who carries word between hearths and has the fullest telling of the Guide (5.5). The born name each trade in their own tongue, and this one is the one who knows the country. The Guide is the order of work, so the English word is left to it.
- A personal name, not shown in play: **Kumud** (householders' tongue), the white water-lily, from *kumuda*, the white water-lily (MW 292,3). Offered for text that needs to call this householder by a name. It is one ordinary word, worn as the born wear every word. No chapter gives a custom for naming children, so the name says nothing of the trade, and the game shows the trade word.

## The ten hardnesses

The tier words that go in front of a tool or a piece of armour.

### Names the game puts together

A tool or a piece of armour has no name of its own in the source. Its name is the tier word, a space, and the piece word. Tools exist at all ten tiers and armour from iron up. Swords, bows, staves and totems are written out in the source and have entries of their own in names, made by the same rule with Sword, Bow, Staff and Totem.

The rule: `<tier word> <piece word>`. It makes 126 names, and none is longer than 18 characters. The prompt for a tool that is too soft reads: Needs a <tier word> pick or better. The article is an before Iron, Antar and Ākās.

| Tier key | Tier word | Register |
| --- | --- | --- |
| `wood` | Wooden | plain English |
| `stone` | Stone | plain English |
| `iron` | Iron | plain English |
| `lumenite` | Hīrak | householders' tongue |
| `cinder` | Jalit | householders' tongue |
| `umbrite` | Antar | householders' tongue |
| `noctrium` | Tala | householders' tongue |
| `aether` | Ākās | householders' tongue |
| `prism` | Patik | householders' tongue |
| `eclipse` | Gahan | householders' tongue |

Tool words: Pick, Axe, Shovel. Armour words by the way of fighting, melee: Helm, Cuirass, Greaves; ranged: Hood, Jerkin, Leggings; magic: Circlet, Robe, Skirt; summon: Mask, Mantle, Wraps. Weapon words: Sword, Bow, Staff, Totem.

### Names in a tongue, and names other peoples say differently

#### Ākās

householders' tongue · key `aether` · was "Aetherium"

- Meaning: sky, open space. Said ā-KĀS.
- Roots: *ākāśa*, sky, open space (MW 127,1).
- Named by the first comers, through the born. The first comers were arrivals, and arrivals say the islands are in the sky over the living ground, so they named the islands' common metal for the sky; the born have no word for the islands and say it only as a smith's word out of the patterns, as for the lens bait (1.8, 3.6, 4.8, 6.2).

#### Jalit

householders' tongue · key `cinder` · was "Cindersteel"

- Meaning: lighted, blazing; set on fire. Said JA-lit.
- Roots: *jvalita*, lighted, blazing, flaming; set on fire (MW 428,2).
- Named by the first comers, through the born. The ore lies beside the molten rock and is still warm when cut, and the metal comes off the anvil holding that heat and burns what it enters (6.2, 6.7). The first comers named it for that, and the born have the word with the smith's trade.

#### Gahan

householders' tongue · key `eclipse` · was "Eclipsium"

- Meaning: deep, dense, impenetrable. Said GA-han.
- Roots: *gahana*, deep, dense, impenetrable; (n.) a thicket (MW 352,1).
- Named by the first comers, through the born. The lowest rock of the living ground, lying on the wood. Nothing made of the living ground's own matter cuts it (6.2). The first comers named the metal for where it lies and how it yields, and the born have the word with the smith's trade. The old name tied the metal to the moon, which is what the born say of the deep kind and not of the ore.

#### Hīrak

householders' tongue · key `lumenite` · was "Lumenite"

- Meaning: diamond. Said HĪ-rak.
- Roots: *hīraka*, a diamond (MW 1300,3).
- Named by the first comers, through the born. The first comers named the clear gem that is cleaved on the anvil's edge and takes a finer edge than iron for the diamond, and smiths still use the name because they hold it is a stone and not crystal, though it is lees set past crystal (6.2, 6.4).

#### Tala

householders' tongue · key `noctrium` · was "Noctrium"

- Meaning: the lower part, base, bottom. Said TA-la.
- Roots: *tala*, surface, level; the lower part, base, bottom (MW 440,2).
- Named by the first comers, through the born. The same metal as the inner one, lying lower in the hollow, down to the standing water over the body of the root; the first comers named it for where it lies, and smiths count and sell it as a second metal (6.2).

#### Patik

householders' tongue · key `prism` · was "Prismite"

- Meaning: crystal, quartz. Said PA-tik.
- Roots: *sphaṭika*, crystal, quartz (MW 1269,3).
- Named by the first comers, through the born. The islands' metal with that world's crystal grown through it, named by the first comers for the crystal that shows in the bar (6.2).

#### Antar

householders' tongue · key `umbrite` · was "Umbrite"

- Meaning: the inside; inner. Said AN-tar.
- Roots: *antara*, interior, inner; (n.) the inside, an interval (MW 43,3).
- Named by the first comers, through the born. The first metal the first comers cut inside the root, where it lies at every height of the hollow, named for where it lies; the born know it only from bars and from the bait patterns, and call the place itself under (3.4, 3.6, 6.2).

### Plain English

| Name | Key | Old name | Meaning | Why |
| --- | --- | --- | --- | --- |
| Iron | `iron` | unchanged | made of iron | Ordinary iron, the one hard metal a wood fire melts (6.2). The present name is the plain word for what it is and stays. |
| Stone | `stone` | unchanged | made of stone | Knapped rubble on a haft, the second tool (6.2). The present name is the plain word for what it is and stays. |
| Wooden | `wood` | unchanged | made of wood | Timber, the youngest matter on the root and the least tool that breaks stone (6.2). The present name is the plain word for what it is and stays. |

## Tool and armour words

The words that go after a tier word. The four set words are never shown.

| Name | Key | Old name | Meaning | Why |
| --- | --- | --- | --- | --- |
| Axe | `axe` | unchanged | an axe | Present name is already the plain word for the tool (6.1). |
| Circlet | `magic_0` | unchanged | a band worn round the head | Present name is already the plain English word for the piece; armour is ordinary work and nobody on the ground gave it a name (1.6 Making, 6.4). Composed after the tier word as now. |
| Robe | `magic_1` | unchanged | a long garment | Present name is already the plain English word for the piece; armour is ordinary work and nobody on the ground gave it a name (1.6 Making, 6.4). Composed after the tier word as now. |
| Skirt | `magic_2` | unchanged | a garment hung from the waist | Present name is already the plain English word for the piece; armour is ordinary work and nobody on the ground gave it a name (1.6 Making, 6.4). Composed after the tier word as now. |
| Helm | `melee_0` | unchanged | a helmet of metal | Present name is already the plain English word for the piece; armour is ordinary work and nobody on the ground gave it a name (1.6 Making, 6.4). Composed after the tier word as now. |
| Cuirass | `melee_1` | unchanged | body armour of metal plate | Present name is already the plain English word for the piece; armour is ordinary work and nobody on the ground gave it a name (1.6 Making, 6.4). Composed after the tier word as now. |
| Greaves | `melee_2` | unchanged | leg armour of metal plate | Present name is already the plain English word for the piece; armour is ordinary work and nobody on the ground gave it a name (1.6 Making, 6.4). Composed after the tier word as now. |
| Pick | `pickaxe` | Pickaxe | a pick | Nobody names a tool; the bible's own word is pick, and the shorter word fits the composed name and the Needs a ... prompt (1.6 Breaking ground, 6.1). |
| Hood | `ranged_0` | unchanged | a hood | Present name is already the plain English word for the piece; armour is ordinary work and nobody on the ground gave it a name (1.6 Making, 6.4). Composed after the tier word as now. |
| Jerkin | `ranged_1` | unchanged | a close jacket | Present name is already the plain English word for the piece; armour is ordinary work and nobody on the ground gave it a name (1.6 Making, 6.4). Composed after the tier word as now. |
| Leggings | `ranged_2` | unchanged | leg coverings | Present name is already the plain English word for the piece; armour is ordinary work and nobody on the ground gave it a name (1.6 Making, 6.4). Composed after the tier word as now. |
| Cloth | `set:magic` | Mage | cloth | Not shown in play today; if shown, the runeloom makes "the lined cloth" worn by people who drive, and there are no mages: nothing is done by spells (6.4 runeloom, 6.6). |
| Plate | `set:melee` | unchanged | metal plate | Not shown in play today; if it is ever shown, plate is the bible's own word for what the fighter at the edge wears (6.8, 5.7). |
| Leather | `set:ranged` | Scout | leather | Not shown in play today; if shown, hood, jerkin and leggings are leather work, and scout names an office the archer does not hold (5.7; README rule 6). |
| Harness | `set:summon` | Binder | a harness | Not shown in play today; if shown, the runeloom makes "the bone-set harness worn by people who drive", and nothing binds what forms on a totem (6.4 runeloom, 7.5). |
| Shovel | `shovel` | unchanged | a shovel | Present name is already the plain word for the tool (6.1). |
| Mask | `summon_0` | unchanged | a covering for the face | Present name is already the plain English word for the piece; armour is ordinary work and nobody on the ground gave it a name (1.6 Making, 6.4). Composed after the tier word as now. |
| Mantle | `summon_1` | unchanged | a loose cloak over the shoulders | Present name is already the plain English word for the piece; armour is ordinary work and nobody on the ground gave it a name (1.6 Making, 6.4). Composed after the tier word as now. |
| Wraps | `summon_2` | unchanged | bindings wound round the legs | Present name is already the plain English word for the piece; armour is ordinary work and nobody on the ground gave it a name (1.6 Making, 6.4). Composed after the tier word as now. |

## Blocks

### Names in a tongue, and names other peoples say differently

#### Ākās Ore

householders' tongue · key `aetherium_ore` · was "Aetherium Ore"

- Meaning: sky, open space, with English "ore". Said ā-KĀS.
- Roots: *ākāśa*, sky, open space (MW 127,1); with English "Ore".
- Named by the born. The ore of the metal named by the tier word: The first comers were arrivals, and arrivals say the islands are in the sky over the living ground, so they named the islands' common metal for the sky; the born have no word for the islands and say it only as a smith's word out of the patterns, as for the lens bait (1.8, 3.6, 4.8, 6.2).

#### Vanahar Altar

householders' tongue · key `altar1` · was "Rootbound Altar"

- Meaning: the altar of Vanahar (holding the wood). Altar is the English word, as everyone on the ground uses it. Said VA-na-har.
- Roots: *vana*, a forest, wood (MW 917,2); *dhara*, holding, bearing, supporting (MW 510,1). Note: chiefly the last part of a compound; alone it is said of two gods as bearers of the world; with English "Altar".
- Named by the born. Everyone calls the great stones altars, the stone where something is laid for the one set over the country, and householders know each kind by the one that lies at it (1.8, 5.2); the great housing it really is has no name of its own on the ground (1.6).
- Other names for it:
  - **Balisil** (householders' tongue): offering stone: the householders' own word for any altar, after the small kills they lay there (2.5, 5.2). From *bali*, tribute, offering, gift (MW 723,3). Note: also the daily offering of food to gods and spirits, and the name of a king of the Daityas; *śilā*, a stone, rock (MW 1073,1).
  - **great stone** (plain English): the plain word for what it is: a great ward housing (1.6).

#### Maruhar Altar

householders' tongue · key `altar2` · was "Sunken Altar"

- Meaning: the altar of Maruhar (holding the waste). Altar is the English word, as everyone on the ground uses it. Said MA-ru-har.
- Roots: *maru*, a wilderness, sandy waste, desert (MW 790,1); *dhara*, holding, bearing, supporting (MW 510,1). Note: chiefly the last part of a compound; alone it is said of two gods as bearers of the world; with English "Altar".
- Named by the born. Everyone calls the great stones altars, the stone where something is laid for the one set over the country, and householders know each kind by the one that lies at it (1.8, 5.2); the great housing it really is has no name of its own on the ground (1.6).
- Other names for it:
  - **Balisil** (householders' tongue): offering stone: the householders' own word for any altar, after the small kills they lay there (2.5, 5.2). From *bali*, tribute, offering, gift (MW 723,3). Note: also the daily offering of food to gods and spirits, and the name of a king of the Daityas; *śilā*, a stone, rock (MW 1073,1).
  - **great stone** (plain English): the plain word for what it is: a great ward housing (1.6).

#### Kankāl Altar

householders' tongue · key `altar3` · was "Warden Altar"

- Meaning: the altar of Kankāl (a skeleton). Altar is the English word, as everyone on the ground uses it. Said kan-KĀL.
- Roots: *kaṅkāla*, skeleton (MW 242,2); with English "Altar".
- Named by the born. Everyone calls the great stones altars, the stone where something is laid for the one set over the country, and householders know each kind by the one that lies at it (1.8, 5.2); the great housing it really is has no name of its own on the ground (1.6).
- Other names for it:
  - **Balisil** (householders' tongue): offering stone: the householders' own word for any altar, after the small kills they lay there (2.5, 5.2). From *bali*, tribute, offering, gift (MW 723,3). Note: also the daily offering of food to gods and spirits, and the name of a king of the Daityas; *śilā*, a stone, rock (MW 1073,1).
  - **great stone** (plain English): the plain word for what it is: a great ward housing (1.6).

#### Guhamāt Altar

householders' tongue · key `altar4` · was "Mycelial Altar"

- Meaning: the altar of Guhamāt (mother of the caves). Altar is the English word, as everyone on the ground uses it. Said gu-ha-MĀT.
- Roots: *guhā*, a cave, hiding-place (MW 360,3); *mātṛ*, mother (MW 807,1); with English "Altar".
- Named by the born. Everyone calls the great stones altars, the stone where something is laid for the one set over the country, and householders know each kind by the one that lies at it (1.8, 5.2); the great housing it really is has no name of its own on the ground (1.6).
- Other names for it:
  - **Balisil** (householders' tongue): offering stone: the householders' own word for any altar, after the small kills they lay there (2.5, 5.2). From *bali*, tribute, offering, gift (MW 723,3). Note: also the daily offering of food to gods and spirits, and the name of a king of the Daityas; *śilā*, a stone, rock (MW 1073,1).
  - **great stone** (plain English): the plain word for what it is: a great ward housing (1.6).

#### Jīmūt Altar

householders' tongue · key `altar5` · was "Tempest Altar"

- Meaning: the altar of Jīmūt (a cloud). Altar is the English word, as everyone on the ground uses it. Said jī-MŪT.
- Roots: *jīmūta*, a cloud (MW 422,1). Note: also the name of a wrestler and of a sage in the Mahābhārata; with English "Altar".
- Named by the born. Everyone calls the great stones altars, the stone where something is laid for the one set over the country, and householders know each kind by the one that lies at it (1.8, 5.2); the great housing it really is has no name of its own on the ground (1.6).
- Other names for it:
  - **Balisil** (householders' tongue): offering stone: the householders' own word for any altar, after the small kills they lay there (2.5, 5.2). From *bali*, tribute, offering, gift (MW 723,3). Note: also the daily offering of food to gods and spirits, and the name of a king of the Daityas; *śilā*, a stone, rock (MW 1073,1).
  - **great stone** (plain English): the plain word for what it is: a great ward housing (1.6).

#### Ratan Altar

householders' tongue · key `altar6` · was "Prism Altar"

- Meaning: the altar of Ratan (a jewel). Altar is the English word, as everyone on the ground uses it. Said RA-tan.
- Roots: *ratna*, a jewel, gem; a treasure (MW 864,2); with English "Altar".
- Named by the born. Everyone calls the great stones altars, the stone where something is laid for the one set over the country, and householders know each kind by the one that lies at it (1.8, 5.2); the great housing it really is has no name of its own on the ground (1.6).
- Other names for it:
  - **Balisil** (householders' tongue): offering stone: the householders' own word for any altar, after the small kills they lay there (2.5, 5.2). From *bali*, tribute, offering, gift (MW 723,3). Note: also the daily offering of food to gods and spirits, and the name of a king of the Daityas; *śilā*, a stone, rock (MW 1073,1).
  - **great stone** (plain English): the plain word for what it is: a great ward housing (1.6).

#### Kuranga Altar

householders' tongue · key `altar7` · was "Eclipse Altar"

- Meaning: the altar of Kuranga (an antelope or deer). Altar is the English word, as everyone on the ground uses it. Said ku-RAN-ga.
- Roots: *kuraṅga*, a species of antelope; an antelope or deer in general (MW 293,3). Note: also, as mṛga is, the spot in the moon; with English "Altar".
- Named by the born. Everyone calls the great stones altars, the stone where something is laid for the one set over the country, and householders know each kind by the one that lies at it (1.8, 5.2); the great housing it really is has no name of its own on the ground (1.6).
- Other names for it:
  - **Balisil** (householders' tongue): offering stone: the householders' own word for any altar, after the small kills they lay there (2.5, 5.2). From *bali*, tribute, offering, gift (MW 723,3). Note: also the daily offering of food to gods and spirits, and the name of a king of the Daityas; *śilā*, a stone, rock (MW 1073,1).
  - **great stone** (plain English): the plain word for what it is: a great ward housing (1.6).

#### Cairn

plain English · key `altar8` · was "First Cairn"

- Meaning: a heap of stones (English).
- Why: Householders see a housing on a heap of stone ringed with lamps and call it a cairn (4.10); First is dropped because the game reads it as first laid, where in their mouths it means chief (4.13).
- Other names for it:
  - **Balisil** (householders' tongue): offering stone: the householders' own word for any altar, after the small kills they lay there (2.5, 5.2). From *bali*, tribute, offering, gift (MW 723,3). Note: also the daily offering of food to gods and spirits, and the name of a king of the Daityas; *śilā*, a stone, rock (MW 1073,1).
  - **eighth stone** (plain English): the largest housing the first comers cut, on the base that held its store (4.10).

#### Jalit Ore

householders' tongue · key `cindrite_ore` · was "Cindrite Ore"

- Meaning: lighted, blazing, with English "ore". Said JA-lit.
- Roots: *jvalita*, lighted, blazing, flaming; set on fire (MW 428,2); with English "Ore".
- Named by the first comers, through the born. The rock that carries the metal named by the tier word. The ore lies beside the molten rock and is still warm when cut, and the metal comes off the anvil holding that heat and burns what it enters (6.2, 6.7). The first comers named it for that, and the born have the word with the smith's trade.

#### Kuranga Furnace

householders' tongue · key `eclipse_forge` · was "Eclipse Forge" · the same thing as `forge5`

- Meaning: the furnace built round the remains of Kuranga. Said ku-RAN-ga.
- Roots: *kuraṅga*, a species of antelope; an antelope or deer in general (MW 293,3). Note: also, as mṛga is, the spot in the moon; with English "Furnace".
- Named by the born. The block of forge5. It has the same name.

#### Gahan Ore

householders' tongue · key `eclipsium_ore` · was "Eclipsium Ore"

- Meaning: deep, impenetrable, with English "ore". Said GA-han.
- Roots: *gahana*, deep, dense, impenetrable; (n.) a thicket (MW 352,1); with English "Ore".
- Named by the first comers, through the born. The rock that carries the metal named by the tier word. The lowest rock of the living ground, lying on the wood. Nothing made of the living ground's own matter cuts it (6.2). The first comers named the metal for where it lies and how it yields, and the born have the word with the smith's trade. The old name tied the metal to the moon, which is what the born say of the deep kind and not of the ore.

#### Maruhar Furnace

householders' tongue · key `emberforge` · was "Emberforge" · the same thing as `forge2`

- Meaning: the furnace built round the remains of Maruhar. Said MA-ru-har.
- Roots: *maru*, a wilderness, sandy waste, desert (MW 790,1); *dhara*, holding, bearing, supporting (MW 510,1). Note: chiefly the last part of a compound; alone it is said of two gods as bearers of the world; with English "Furnace".
- Named by the born. The block of forge2. It has the same name.

#### Hīrak Block

householders' tongue · key `lumenite_block` · was "Lumenite Block"

- Meaning: diamond, with English "block". Said HĪ-rak.
- Roots: *hīraka*, a diamond (MW 1300,3); with English "Block".
- Named by the born. A block of the gem named by the tier word: The first comers named the clear gem that is cleaved on the anvil's edge and takes a finer edge than iron for the diamond, and smiths still use the name because they hold it is a stone and not crystal, though it is lees set past crystal (6.2, 6.4).

#### Hīrak Ore

householders' tongue · key `lumenite_ore` · was "Lumenite Ore"

- Meaning: diamond, with English "ore". Said HĪ-rak.
- Roots: *hīraka*, a diamond (MW 1300,3); with English "Ore".
- Named by the born. The rock that carries the gem named by the tier word: The first comers named the clear gem that is cleaved on the anvil's edge and takes a finer edge than iron for the diamond, and smiths still use the name because they hold it is a stone and not crystal, though it is lees set past crystal (6.2, 6.4).

#### Tala Ore

householders' tongue · key `noctrium_ore` · was "Noctrium Ore"

- Meaning: the lower part, base, bottom, with English "ore". Said TA-la.
- Roots: *tala*, surface, level; the lower part, base, bottom (MW 440,2); with English "Ore".
- Named by the born. The ore of the metal named by the tier word: The same metal as the inner one, lying lower in the hollow, down to the standing water over the body of the root; the first comers named it for where it lies, and smiths count and sell it as a second metal (6.2).

#### Ratan Furnace

householders' tongue · key `prism_crucible` · was "Prism Crucible" · the same thing as `forge4`

- Meaning: the furnace built round the remains of Ratan. Said RA-tan.
- Roots: *ratna*, a jewel, gem; a treasure (MW 864,2); with English "Furnace".
- Named by the born. The block of forge4. It has the same name.

#### Patik Ore

householders' tongue · key `prismite_ore` · was "Prismite Ore"

- Meaning: crystal, quartz, with English "ore". Said PA-tik.
- Roots: *sphaṭika*, crystal, quartz (MW 1269,3); with English "Ore".
- Named by the born. The ore of the metal named by the tier word: The islands' metal with that world's crystal grown through it, named by the first comers for the crystal that shows in the bar (6.2).

#### Kusum Leaves

householders' tongue · key `rose_leaves` · was "Rosewood Blossom"

- Meaning: the leaves and blossom of the tree of Kusum, the flower country. Said KU-sum.
- Roots: *kusuma*, a flower, blossom (MW 298,1); with English "Leaves".
- Named by the born. The blossoming tree grows in one country only, and nobody can say whether it is an island tree or a tree of the living ground (3.2 bloomvale). It has no English name, so the born, who build with it there, say it by the name of its country. Rosewood is a different real timber.

#### Kusum Log

householders' tongue · key `rose_log` · was "Rosewood Log"

- Meaning: a log of the tree of Kusum, the flower country. Said KU-sum.
- Roots: *kusuma*, a flower, blossom (MW 298,1); with English "Log".
- Named by the born. The blossoming tree grows in one country only, and nobody can say whether it is an island tree or a tree of the living ground (3.2 bloomvale). It has no English name, so the born, who build with it there, say it by the name of its country. Rosewood is a different real timber.

#### Kusum Planks

householders' tongue · key `rose_planks` · was "Rosewood Planks"

- Meaning: planks of the tree of Kusum, the flower country. Said KU-sum.
- Roots: *kusuma*, a flower, blossom (MW 298,1); with English "Planks".
- Named by the born. The blossoming tree grows in one country only, and nobody can say whether it is an island tree or a tree of the living ground (3.2 bloomvale). It has no English name, so the born, who build with it there, say it by the name of its country. Rosewood is a different real timber.

#### Antar Ore

householders' tongue · key `umbrite_ore` · was "Umbrite Ore"

- Meaning: the inside; inner, with English "ore". Said AN-tar.
- Roots: *antara*, interior, inner; (n.) the inside, an interval (MW 43,3); with English "Ore".
- Named by the born. The ore of the metal named by the tier word: The first metal the first comers cut inside the root, where it lies at every height of the hollow, named for where it lies; the born know it only from bars and from the bait patterns, and call the place itself under (3.4, 3.6, 6.2).

#### Guhamāt Furnace

householders' tongue · key `voidkiln` · was "Voidkiln" · the same thing as `forge3`

- Meaning: the furnace built round the remains of Guhamāt. Said gu-ha-MĀT.
- Roots: *guhā*, a cave, hiding-place (MW 360,3); *mātṛ*, mother (MW 807,1); with English "Furnace".
- Named by the born. The block of forge3. It has the same name.

### Plain English

| Name | Key | Old name | Meaning | Why |
| --- | --- | --- | --- | --- |
| Air | `air` | unchanged | air | Hidden state with no item. The present name is the plain word for what it is and stays. |
| Anvil | `anvil` | unchanged | an anvil | Seven iron bars made into a block to hammer on; ordinary smithing (6.2, 6.4). The present name is already right and stays. |
| Bedrock | `bedrock` | unchanged | the rock at the bottom | The block is the root's upper face, but arrivals take the floor for stone, and the plain word carries their belief (1.3, 1.8). |
| Bedroll | `bedroll` | unchanged | a roll of bedding | Fibre over boards, where a peopl lies down and the near end of the way moves (1.6, 6.9). The present name is already right and stays. |
| Berry Bush | `berry_bush` | unchanged | a bush with berries | Fruit that grows without being sown (1.6, 6.9). The present name is the plain word for what it is and stays. |
| Berry Bush | `berry_bush_empty` | unchanged | a bush with berries | Hidden picked state with no item. The present name is the plain word for what it is and stays. |
| Bone Block | `bone_block` | Palebone | bone stacked as a block | The pillars at the shade-kind's stones are the bone of the animals the first comers boiled down there, stacked; the joined name is replaced by what it is (4.5 The floor). |
| Clay Bricks | `bricks` | unchanged | fired clay bricks | Clay set by fire (6.4). The present name is the plain word for what it is and stays. |
| Brood Nest | `brood_nest` | unchanged | a nest where feeders breed | A store where the salt failed and feeders have bred since; nest is the bible's own word and the beastcaller asks what was breeding in one (1.6, 5.5 beastcaller). The present name is already right and stays. |
| Cactus | `cactus` | Needlepod | cactus | The bible calls it cactus; the coined name goes (3.2 desert). |
| Chest | `chest` | unchanged | a chest | A box (6.4). The present name is already right and stays. |
| Clay | `clay` | unchanged | clay | Clay of the shallows, for brick and for every lees pot (3.2 ocean, 3.8). The present name is the plain word for what it is and stays. |
| Cloud | `cloud` | Cloudstuff | cloud | Ground that was going when that sky stopped, hanging in sheets; arrivals say the islands are in the sky, so to them the sheets under the islands are cloud, and the plain word carries that belief (1.8, 3.5). |
| Coal Ore | `coal_ore` | unchanged | rock with coal in it | Old timber in the rock (6.3). The present name is the plain word for what it is and stays. |
| Rubble | `cobble` | Cobblestone | broken stone | Stone is jointed finer than a stride, so a pick brings it away as rubble, which fire closes back to whole stone; cobblestone is dressed paving, which this is not (6.2, 6.4). |
| Supply Crate | `crate` | unchanged | a crate of supplies | Householders on the road pass nights in the old houses, which is why the crates are stocked (1.6 The old stonework). The present name is already right and stays. |
| Amber Crystal | `crystal_amber` | unchanged | amber-coloured crystal | Standing crystal nobody has matched to a kind (3.3). The present name is the plain word for what it is and stays. |
| Azure Crystal | `crystal_cyan` | unchanged | blue crystal | Standing crystal, the lees of the shade-kind's own dead (3.3). The present name is the plain word for what it is and stays. |
| Violet Crystal | `crystal_violet` | unchanged | violet crystal | Standing crystal, the lees of the deep kind (3.3). The present name is the plain word for what it is and stays. |
| Dry Bramble | `dead_bush` | unchanged | dry bramble | The bible's own words for it (3.2 tundra, desert). The present name is the plain word for what it is and stays. |
| Deep Rock | `deepstone` | Deepstone | the darker rock of the depths | The darker deep rock between stone and the wood, which also rings the burrower's forge; the bible calls it deep rock and the plain words replace the joined one (3.1, 6.4). |
| Dirt | `dirt` | unchanged | earth, soil | Soil, the top of the order soil, stone, deep rock, wood (3.1). The present name is the plain word for what it is and stays. |
| Door | `door_x` | unchanged | a door | A door, which a house ward needs because a ward stops no person (1.6 Rooms and townsfolk). The present name is already right and stays. |
| Door | `door_x_open` | unchanged | a door | A door, which a house ward needs because a ward stops no person (1.6 Rooms and townsfolk). The present name is already right and stays. |
| Door | `door_z` | unchanged | a door | A door, which a house ward needs because a ward stops no person (1.6 Rooms and townsfolk). The present name is already right and stays. |
| Door | `door_z_open` | unchanged | a door | A door, which a house ward needs because a ward stops no person (1.6 Rooms and townsfolk). The present name is already right and stays. |
| Fern | `fern` | unchanged | fern | The present name is the plain word for what it is and stays. |
| Blue Flower | `flower_blue` | Skybell | a blue flower | One of the two flowers of the islands, spread through the green country; the born cannot know where it came from and the bible names it only by its colour (3.2 bloomvale, 3.5). |
| Red Flower | `flower_red` | Emberpetal | a red flower | The bible knows it only as the red flower, the one the first bait uses; the joined name is replaced (3.2 bloomvale, 4.3). |
| White Flower | `flower_white` | Moonlily | a white flower | The other island flower; it has nothing to do with the moon, so the joined name goes (3.2 bloomvale, 3.5). |
| Yellow Flower | `flower_yellow` | Sunpip | a yellow flower | A pasture flower with no people's name in the bible; the cute name is replaced by what it is (3.2 plains). |
| Stone Furnace | `furnace` | unchanged | a furnace of stone | The block of forge1; an ordinary fire in a ring of rubble (6.4). The present name is already right and stays. |
| Stone Furnace | `furnace_lit` | unchanged | a furnace of stone | The burning state of the same block shows the same name (6.4). The present name is already right and stays. |
| Gilded Bricks | `gilded_bricks` | unchanged | bricks faced with gold | Stone faced with gold against the stone-eating kinds, the rim of the burrower's bowl (3.7, 6.3). The present name is the plain word for what it is and stays. |
| Glass | `glass` | unchanged | glass | Sand set by fire (6.4). The present name is the plain word for what it is and stays. |
| Fungus Planks | `gloom_planks` | Gloomcap Planks | planks cut from fungus stem | As the fungus stem (3.4 hollows). |
| Fungus Stem | `gloom_stem` | Gloomcap Stem | the stem of a great fungus | The great capped fungi are the hollow's only timber; the joined name is replaced (3.4 hollows). |
| Teal Fungus Cap | `gloomcap_teal` | Teal Gloomcap | a teal cap of a great fungus | As the fungus stem (3.4 hollows). |
| Violet Fungus Cap | `gloomcap_violet` | Violet Gloomcap | a violet cap of a great fungus | As the fungus stem (3.4 hollows). |
| Hollow Rock | `gloomstone` | Gloomstone | the rock of the hollow | The rock that lies between two faces of the wood and rings the third forge (3.4, 6.4). Every other block of the hollow has a plain name, and so has its rock. The old name glued two nouns. |
| Glowing Mushroom | `glowshroom` | Glowshroom | a mushroom that gives light | The glowing fungus of the hollow and of the woodland floors; the cute joined name is replaced (3.4, 3.7, 6.9). |
| Gold Block | `gold_block` | unchanged | a block of gold | The present name is the plain word for what it is and stays. |
| Gold Ore | `gold_ore` | unchanged | rock with gold in it | Gold lies deep and stays soft (6.3). The present name is the plain word for what it is and stays. |
| Turf | `grass` | Grass Block | grass with the soil it grows in | A piece of grassed soil lifted whole; "block" is a game word and the plain word for the thing is turf, as the bible says of the hollow and the islands (3.1, 3.4, 3.5). |
| Gravel | `gravel` | unchanged | gravel | Floor of the deep sea, with flint in it (3.2 ocean). The present name is the plain word for what it is and stays. |
| Holder's Bed | `guest_bed` | Guest Bed | a holder's bed | It is a holder's seat for the night, hide over boards because a holder sits up on it every night, and the householder who takes it is no guest, since the hearth under that roof is the householder's (1.6, 5.2, 6.9); holder is the plain word the ground chapter fixes. |
| Hollow Gate Frame | `hollow_frame` | unchanged | the frame of a gate to the hollow | The frame block of the hollow gate; plain words of the crews who build it (1.6 Gates, 6.4 Gate frames). The present name is already right and stays. |
| Hollow Gate | `hollow_portal` | unchanged | a gate to the hollow | The opening the remains loosen inside the frame (1.6 Gates). The present name is already right and stays. |
| Ice | `ice` | unchanged | ice | Ice is ground and does not count as water (3.1). The present name is the plain word for what it is and stays. |
| Iron Block | `iron_block` | unchanged | a block of iron | The present name is the plain word for what it is and stays. |
| Iron Ore | `iron_ore` | unchanged | rock with iron in it | Iron of the upper and middle rock (6.2). The present name is the plain word for what it is and stays. |
| Kapok Leaves | `kapok_leaves` | unchanged | kapok leaves | The present name is the plain word for what it is and stays. |
| Kapok Log | `kapok_log` | unchanged | a log of kapok | The tree of the wet wood, cut thin on the steppe for the sand country's fires (3.2 savanna, jungle). The present name is the plain word for what it is and stays. |
| Kapok Planks | `kapok_planks` | unchanged | kapok planks | The present name is the plain word for what it is and stays. |
| Lantern | `lantern` | unchanged | a lantern | An ordinary light, sold by the smith (5.5 smith). The present name is already right and stays. |
| Lava | `lava` | unchanged | molten rock | Stone the sand kinds fed on until it runs (3.3). The present name is the plain word for what it is and stays. |
| Glowing Frond | `lumen_frond` | Lumen Frond | a frond that gives light | One of the growths that light the hollow; the Latin-sounding word goes, and "lit" is avoided because in householders' mouths it means held (1.6 After the last, 3.4). |
| Geode | `mana_ore` | Mana Geode | a hollow stone lined with crystal | Lees shut in rock sets dense as a geode; "mana" names no matter on this ground, so the plain word stays alone (1.6, 6.3). |
| Mossy Stone | `moss_stone` | Mossy Cobble | stone grown with moss | The mossed stone of the woodland killing floors; named to match rubble and the bible's words (3.2 forest, 3.7). |
| Mossy Bricks | `mossy_bricks` | unchanged | stone bricks grown with moss | The dais at the woodland stones is mossed brick (3.7). The present name is the plain word for what it is and stays. |
| Mud | `mud` | unchanged | mud | The mire, where lees sets as it does in rock (3.2 swamp). The present name is the plain word for what it is and stays. |
| Brown Mushroom | `mushroom_brown` | Duskcap | a brown mushroom | The brown caps of the shade, the mire and the hollow that go into plain stew; the joined name is replaced (3.2 forest, 6.9). |
| Red Mushroom | `mushroom_red` | Dapplecap | a red mushroom | An ordinary mushroom; the cute joined name is replaced by what it is (6.9). |
| Fungal Turf | `mycel` | Mycel Turf | turf of fungus | The turf of the hollow, which also took in some caverns of the deep rock; no people of the ground has walked it to name it, so it is said plainly (3.3, 3.4, 3.6). |
| Black Glass | `nightglass` | Nightglass | black glass | Rock that ran beside the molten rock and set again is black glass, as sand runs to black glass under the sand-country fires; the joined name is replaced by what it is (3.2 desert, 3.3, 6.2). |
| Oak Leaves | `oak_leaves` | unchanged | oak leaves | The present name is the plain word for what it is and stays. |
| Oak Log | `oak_log` | unchanged | a log of oak | The old wood of the green country (3.2 forest). The present name is the plain word for what it is and stays. |
| Oak Planks | `oak_planks` | unchanged | oak planks | The present name is the plain word for what it is and stays. |
| Birch Leaves | `pale_leaves` | Palebark Leaves | birch leaves | As the birch log (3.2 palewood). |
| Birch Log | `pale_log` | Palebark Log | a log of birch | The pale-barked tree that is first to seed into given-up pasture is what English calls a birch; the joined name is replaced by the plain one (3.2 palewood). |
| Birch Planks | `pale_planks` | Palebark Planks | birch planks | As the birch log (3.2 palewood). |
| Packed Path | `path` | unchanged | trodden earth | The packed paths from the well to each door (3.7). The present name is the plain word for what it is and stays. |
| Pine Needles | `pine_leaves` | unchanged | pine needles | The present name is the plain word for what it is and stays. |
| Pine Log | `pine_log` | unchanged | a log of pine | The cold wood (3.2 taiga). The present name is the plain word for what it is and stays. |
| Pine Planks | `pine_planks` | unchanged | pine planks | The present name is the plain word for what it is and stays. |
| Pale Crystal | `prism_crystal` | Prism Crystal | pale crystal | The spires of pale crystal on the islands, the oldest lees on the root; the bible says pale crystal (3.5 rift_shards, 6.3). |
| Reeds | `reeds` | unchanged | reeds | Where grass meets water, and in the mire for fibre (3.2). The present name is the plain word for what it is and stays. |
| Island Gate Frame | `rift_frame` | Rift Gate Frame | the frame of a gate to the islands | The frame block of the gate to the islands; "rift" claimed a tear that is not there (1.3, 1.6 Gates). |
| Island Gate | `rift_portal` | Rift Gate | a gate to the islands | The opening to the islands inside its frame; named for the place it reaches, which is the islands (1.3). |
| Island Rock | `riftstone` | Riftstone | the rock of the islands | The rock under the turf of the islands, which rings the fourth forge (3.5, 6.4). Every other block of the islands has a plain name, and so has its rock. The old name glued two nouns. |
| Line Frame | `runeloom` | Runeloom | a frame for cutting lines | The block of the same station; a frame for cutting lines evenly and laying fibre under tension, named in the plain words the trade already uses (6.4, 6.6). |
| Sand | `sand` | unchanged | sand | Rock with the firmness eaten out of it by the sand kinds (3.2 desert). The present name is the plain word for what it is and stays. |
| Sandstone | `sandstone` | unchanged | sand set again into stone | Loose ground that lay long enough over the root and set again (3.2 beach). The present name is the plain word for what it is and stays. |
| Sandstone Bricks | `sandstone_bricks` | unchanged | bricks cut from sandstone | The present name is the plain word for what it is and stays. |
| Scoria | `scoria` | unchanged | cindery rock | The rock round the molten rock where it stands highest (3.3). The present name is the plain word for what it is and stays. |
| Island Soil | `skysoil` | Skysoil | soil of the islands | As island turf (3.5 rift). |
| Island Turf | `skyturf` | Skyturf | turf of the islands | The surface of the earlier world as it stood at its last dusk; no people of the ground lives there or has a word for the islands, and the bible says island turf (3.5 rift, 3.6). |
| Snow | `snow` | unchanged | snow | Snow lies where it lies and has never been seen to melt (3.1). The present name is the plain word for what it is and stays. |
| Snowy Turf | `snowy_grass` | Snowy Grass | turf with snow on it | Snow on the grass of the cold country; named to match turf (3.2 tundra). |
| Lamp Fungus | `sporelamp` | Sporelamp | a fungus that hangs like a lamp | The bible calls these the lamps that hang from the roofs, and they are growth, not made lamps; the joined name is replaced by a plain one that says both (3.4). |
| Island Leaves | `star_leaves` | Starwood Leaves | leaves of the island tree | Its leaves give light, so nothing comes up under it (3.5 rift). |
| Island Log | `star_log` | Starwood Log | a log of the island tree | The island tree with lit leaves, which the first comers camped under; the bible says island tree and island timber, and the joined name goes (3.2 bloomvale, 3.5 rift). |
| Island Planks | `star_planks` | Starwood Planks | planks of island timber | As the island log (3.5 rift). |
| Stone | `stone` | unchanged | stone | The common rock under every soil (6.2). The present name is the plain word for what it is and stays. |
| Stone Bricks | `stone_bricks` | unchanged | bricks cut from stone | The present name is the plain word for what it is and stays. |
| Glassed Stone | `storm_block` | Stormglass | stone turned to glass | Stone the flier's throws have loosened and that has set again as glass, on the pad and up the masts; the joined name is replaced by what happened to it (4.7 The floor). |
| Tall Grass | `tall_grass` | unchanged | tall grass | Pasture grass, cut for fibre (3.2 plains). The present name is the plain word for what it is and stays. |
| Thatch | `thatch` | unchanged | thatch | Roofing of the plank and thatch villages (3.7). The present name is the plain word for what it is and stays. |
| Joining Bench | `tinker_bench` | Tinker's Bench | a bench for joining two worked pieces into one | A piece of the remains of the first great feeder held between two iron bars over a plank top. Two worked pieces laid against the remains go soft enough to be pressed into one (6.4). The plain name says what is done on it. |
| Torch | `torch` | unchanged | a torch | Light stops feeders coming up; a torch is a torch (1.6 Night, L.11). The present name is already right and stays. |
| Dressed Stone | `wardstone` | Wardstone | stone dressed by hand | The first comers' dressed stone, common stone that has lain dressed ever since and now needs a stone pick; the bible says dressed stone, and the joined name goes (1.6 The old stonework, 2.3, 6.1). |
| Water | `water` | unchanged | water | The one sheet of water, in which nothing comes up (3.1). The present name is the plain word for what it is and stays. |
| Water | `water1` | unchanged | water | A flowing state with no item, sharing the one literal. The present name is the plain word for what it is and stays. |
| Water | `water2` | unchanged | water | A flowing state with no item, sharing the one literal. The present name is the plain word for what it is and stays. |
| Water | `water3` | unchanged | water | A flowing state with no item, sharing the one literal. The present name is the plain word for what it is and stays. |
| Water | `water4` | unchanged | water | A flowing state with no item, sharing the one literal. The present name is the plain word for what it is and stays. |
| Water | `water5` | unchanged | water | A flowing state with no item, sharing the one literal. The present name is the plain word for what it is and stays. |
| Water | `water6` | unchanged | water | A flowing state with no item, sharing the one literal. The present name is the plain word for what it is and stays. |
| Water | `water7` | unchanged | water | A flowing state with no item, sharing the one literal. The present name is the plain word for what it is and stays. |
| Workbench | `workbench` | unchanged | a bench to work at | Four planks fitted square; an ordinary made thing with a plain name (6.4). The present name is already right and stays. |

## Items

### Names in a tongue, and names other peoples say differently

#### Ākās Bar

householders' tongue · key `aether_bar` · was "Aetherium Bar"

- Meaning: sky, open space, with English "bar". Said ā-KĀS.
- Roots: *ākāśa*, sky, open space (MW 127,1); with English "Bar".
- Named by the born. A bar of the metal named by the tier word: The first comers were arrivals, and arrivals say the islands are in the sky over the living ground, so they named the islands' common metal for the sky; the born have no word for the islands and say it only as a smith's word out of the patterns, as for the lens bait (1.8, 3.6, 4.8, 6.2).

#### Ākās Bow

householders' tongue · key `aether_bow` · was "Galebow"

- Meaning: a bow of Ākās. Said ā-KĀS.
- Roots: *ākāśa*, sky, open space (MW 127,1); with English "Bow".
- Named by the born. A bow is an ordinary thing. It is said by the hardness of its make and the plain word, as the picks and the bars are (6.2, 5.7, L.11).

#### Ākās Staff

householders' tongue · key `aether_staff` · was "Stormcaller"

- Meaning: a staff with a seat of Ākās. Said ā-KĀS.
- Roots: *ākāśa*, sky, open space (MW 127,1); with English "Staff".
- Named by the born. A staff throws as hard as its seat is hard, and each is made of the metal whose seat it carries (6.6). It is said by that metal and the plain word.

#### Ākās Sword

householders' tongue · key `aether_sword` · was "Aether Blade"

- Meaning: a sword of Ākās. Said ā-KĀS.
- Roots: *ākāśa*, sky, open space (MW 127,1); with English "Sword".
- Named by the born. A sword of this hardness is an ordinary thing and is said as one: the word for what it is made of and the plain word for the weapon, as the picks and the bars are (6.2, L.11).

#### Ākās Totem

householders' tongue · key `aether_totem` · was "Zephyr Chime"

- Meaning: a totem with a billet of Ākās. Said ā-KĀS.
- Roots: *ākāśa*, sky, open space (MW 127,1); with English "Totem".
- Named by the born. A totem is two carved bones and a billet of metal, and what forms on it takes its body from the billet (6.6, 7.5). It is said by that metal and the plain word.

#### Mūda

sand-country tongue · key `ash_token` · was "Ashen Token"

- Meaning: a seal, a stamp; a sign, token; a pass. Said MŪ-da.
- Roots: *mudrā*, a seal, signet-ring; a stamp, print, mark; a sign, token; a pass (MW 822,3). Note: also a position of the fingers used in worship.
- Named by the sand-country people. A piece broken from the glass floor under a fire that has burned kills for generations. Whoever holds a fire gives them to those who march for it, and one shown at any fire is a night inside the light (5.3). The name is their own word for it.
- Other names for it:
  - **Fired Token** (plain English): the plain words of the peoples chapter (5.3).

#### Nihān Remains

householders' tongue · key `cairn_heart` · was "Cairnheart"

- Meaning: the raw remains of Nihān: the trade's plain word for a piece of a great feeder that has not been boiled down, with the name of the animal. Said ni-HĀN.
- Roots: *nidhāna*, a place for depositing; a store, hoard (MW 548,3); with English "Remains".
- Named by the born. The raw remains of the strongest of the stone-eating kind, the strongest thing any living person has killed on this ground. Boiled down, one of these is one charge (4.10). The old name claimed a light returned (4.13). Remains is the trade's plain word (6.3), and each of the eight is known by the name of the animal it came from.

#### Cairn Key

plain English · key `cairn_key` · unchanged

- Meaning: the key to the cairn (English).
- Why: The present name is already right: the born say the key opens the cairn, and both words are theirs in the game's English (4.10); it is a small housing with a charge nobody drives (4.10), and the tooltip, not the name, must stop saying it opens anything (4.13).
- Other names for it:
  - **bait** (plain English): a small housing with an undriven charge of slivers and shards, which is what the animal eats (4.10).

#### Jalit Bar

householders' tongue · key `cinder_bar` · was "Cindersteel Bar"

- Meaning: lighted, blazing, with English "bar". Said JA-lit.
- Roots: *jvalita*, lighted, blazing, flaming; set on fire (MW 428,2); with English "Bar".
- Named by the first comers, through the born. A bar of the metal named by the tier word. The ore lies beside the molten rock and is still warm when cut, and the metal comes off the anvil holding that heat and burns what it enters (6.2, 6.7). The first comers named it for that, and the born have the word with the smith's trade.

#### Jalit Bow

householders' tongue · key `cinder_bow` · was "Emberstring"

- Meaning: a bow of Jalit. Said JA-lit.
- Roots: *jvalita*, lighted, blazing, flaming; set on fire (MW 428,2); with English "Bow".
- Named by the born. A bow is an ordinary thing. It is said by the hardness of its make and the plain word, as the picks and the bars are (6.2, 5.7, L.11).

#### Jalit Staff

householders' tongue · key `cinder_staff` · was "Cinder Rod"

- Meaning: a staff with a seat of Jalit. Said JA-lit.
- Roots: *jvalita*, lighted, blazing, flaming; set on fire (MW 428,2); with English "Staff".
- Named by the born. A staff throws as hard as its seat is hard, and each is made of the metal whose seat it carries (6.6). It is said by that metal and the plain word.

#### Jalit Sword

householders' tongue · key `cinder_sword` · was "Cindersteel Cleaver"

- Meaning: a sword of Jalit. Said JA-lit.
- Roots: *jvalita*, lighted, blazing, flaming; set on fire (MW 428,2); with English "Sword".
- Named by the born. A sword of this hardness is an ordinary thing and is said as one: the word for what it is made of and the plain word for the weapon, as the picks and the bars are (6.2, L.11).

#### Jalit Totem

householders' tongue · key `cinder_totem` · was "Brazier Totem"

- Meaning: a totem with a billet of Jalit. Said JA-lit.
- Roots: *jvalita*, lighted, blazing, flaming; set on fire (MW 428,2); with English "Totem".
- Named by the born. A totem is two carved bones and a billet of metal, and what forms on it takes its body from the billet (6.6, 7.5). It is said by that metal and the plain word.

#### Gahan Bar

householders' tongue · key `eclipse_bar` · was "Eclipsium Bar"

- Meaning: deep, impenetrable, with English "bar". Said GA-han.
- Roots: *gahana*, deep, dense, impenetrable; (n.) a thicket (MW 352,1); with English "Bar".
- Named by the first comers, through the born. A bar of the metal named by the tier word. The lowest rock of the living ground, lying on the wood. Nothing made of the living ground's own matter cuts it (6.2). The first comers named the metal for where it lies and how it yields, and the born have the word with the smith's trade. The old name tied the metal to the moon, which is what the born say of the deep kind and not of the ore.

#### Gahan Bow

householders' tongue · key `eclipse_bow` · was "Umbra Longbow"

- Meaning: a bow of Gahan. Said GA-han.
- Roots: *gahana*, deep, dense, impenetrable; (n.) a thicket (MW 352,1); with English "Bow".
- Named by the born. A bow is an ordinary thing. It is said by the hardness of its make and the plain word, as the picks and the bars are (6.2, 5.7, L.11).

#### Kuranga Remains

householders' tongue · key `eclipse_ember` · was "Eclipse Ember"

- Meaning: the raw remains of Kuranga: the trade's plain word for a piece of a great feeder that has not been boiled down, with the name of the animal. Said ku-RAN-ga.
- Roots: *kuraṅga*, a species of antelope; an antelope or deer in general (MW 293,3). Note: also, as mṛga is, the spot in the moon; with English "Remains".
- Named by the born. A piece of the strongest of the deep kind, which gives its kind's light. In a ring of black glass it is the fifth forge (4.9). The born call it a coal from the last eclipse, which is their belief about the moon. Remains is the trade's plain word (6.3), and each of the eight is known by the name of the animal it came from.

#### Kuranga Mask

householders' tongue · key `eclipse_mask` · was "Eclipse Mask"

- Meaning: a mask for Kuranga: the plain English word for what the born take the vessel to be, with the name of the one it is laid for. Said ku-RAN-ga.
- Roots: *kuraṅga*, a species of antelope; an antelope or deer in general (MW 293,3). Note: also, as mṛga is, the spot in the moon; with English "Mask".
- Named by the born. The born say it is worn and the animal sees the wearer; it is laid on the stone like every other bait (4.9). What is laid for the one set over a country is an offering, and householders teach how to make each one (5.2).
- Other names for it:
  - **bait** (plain English): what it is: raw remains of the host's lesser animals in a vessel made to reach one animal (1.6, 4.2).

#### Kuranga Tine

householders' tongue · key `eclipse_shard` · was "Eclipse Shard"

- Meaning: a tine of Kuranga: plain English for the piece, with the name of the animal it came from. Said ku-RAN-ga.
- Roots: *kuraṅga*, a species of antelope; an antelope or deer in general (MW 293,3). Note: also, as mṛga is, the spot in the moon; with English "Tine".
- Named by the born. It is a sliver of its body, which grows outward as its tines do, and the strongest low remains a person can carry (4.9). Eclipse claimed a tie to the moon. Householders who work remains know each piece by holding it and by what it came from (5.5, tinker).

#### Gahan Staff

householders' tongue · key `eclipse_staff` · was "Eclipse Staff"

- Meaning: a staff with a seat of Gahan. Said GA-han.
- Roots: *gahana*, deep, dense, impenetrable; (n.) a thicket (MW 352,1); with English "Staff".
- Named by the born. A staff throws as hard as its seat is hard, and each is made of the metal whose seat it carries (6.6). It is said by that metal and the plain word.

#### Gahan Sword

householders' tongue · key `eclipse_sword` · was "Eclipse Reaver"

- Meaning: a sword of Gahan. Said GA-han.
- Roots: *gahana*, deep, dense, impenetrable; (n.) a thicket (MW 352,1); with English "Sword".
- Named by the born. A sword of this hardness is an ordinary thing and is said as one: the word for what it is made of and the plain word for the weapon, as the picks and the bars are (6.2, L.11).

#### Gahan Totem

householders' tongue · key `eclipse_totem` · was "Moonbound Icon"

- Meaning: a totem with a billet of Gahan. Said GA-han.
- Roots: *gahana*, deep, dense, impenetrable; (n.) a thicket (MW 352,1); with English "Totem".
- Named by the born. A totem is two carved bones and a billet of metal, and what forms on it takes its body from the billet (6.6, 7.5). It is said by that metal and the plain word.

#### Jalit Arrow

householders' tongue · key `ember_arrow` · was "Ember Arrow"

- Meaning: an arrow headed with Jalit. Said JA-lit.
- Roots: *jvalita*, lighted, blazing, flaming; set on fire (MW 428,2); with English "Arrow".
- Named by the born. The five arrowheads are five hardnesses (6.7). This head comes off the anvil holding the heat of the deep and burns what it enters, and it is said by its metal, as the bar is.

#### Vaka Tooth

householders' tongue · key `frost_fang` · was "Frost Fang"

- Meaning: a tooth of the Vaka. Said VA-ka.
- Roots: *vṛka*, a wolf (MW 1008,1); with English "Tooth".
- Named by the born. A tooth of the pale runner of the cold country (7.3). It is said by the name of the animal, which sets it apart from the tooth of the burrower.

#### Vanahar Remains

householders' tongue · key `heartroot` · was "Heartroot"

- Meaning: the raw remains of Vanahar: the trade's plain word for a piece of a great feeder that has not been boiled down, with the name of the animal. Said VA-na-har.
- Roots: *vana*, a forest, wood (MW 917,2); *dhara*, holding, bearing, supporting (MW 510,1). Note: chiefly the last part of a compound; alone it is said of two gods as bearers of the world; with English "Remains".
- Named by the born. A piece of the body of the strongest of the woodland host that has not been boiled down. It still moves, and it loosens only made things (4.3, 6.3). Remains is the trade's plain word (6.3), and each of the eight is known by the name of the animal it came from.

#### Hīrak

householders' tongue · key `lumenite` · was "Lumenite" · the same thing as `lumenite`

- Meaning: diamond. Said HĪ-rak.
- Roots: *hīraka*, a diamond (MW 1300,3).
- Named by the born. The gem itself, cleaved and never smelted: The first comers named the clear gem that is cleaved on the anvil's edge and takes a finer edge than iron for the diamond, and smiths still use the name because they hold it is a stone and not crystal, though it is lees set past crystal (6.2, 6.4).

#### Hīrak Bow

householders' tongue · key `lumenite_bow` · was "Glimmerbow"

- Meaning: a bow of Hīrak. Said HĪ-rak.
- Roots: *hīraka*, a diamond (MW 1300,3); with English "Bow".
- Named by the born. A bow is an ordinary thing. It is said by the hardness of its make and the plain word, as the picks and the bars are (6.2, 5.7, L.11).

#### Hīrak Staff

householders' tongue · key `lumenite_staff` · was "Lumen Staff"

- Meaning: a staff with a seat of Hīrak. Said HĪ-rak.
- Roots: *hīraka*, a diamond (MW 1300,3); with English "Staff".
- Named by the born. A staff throws as hard as its seat is hard, and each is made of the metal whose seat it carries (6.6). It is said by that metal and the plain word.

#### Hīrak Sword

householders' tongue · key `lumenite_sword` · was "Lumenite Saber"

- Meaning: a sword of Hīrak. Said HĪ-rak.
- Roots: *hīraka*, a diamond (MW 1300,3); with English "Sword".
- Named by the born. A sword of this hardness is an ordinary thing and is said as one: the word for what it is made of and the plain word for the weapon, as the picks and the bars are (6.2, L.11).

#### Hīrak Totem

householders' tongue · key `lumenite_totem` · was "Wisp Lantern"

- Meaning: a totem with a billet of Hīrak. Said HĪ-rak.
- Roots: *hīraka*, a diamond (MW 1300,3); with English "Totem".
- Named by the born. A totem is two carved bones and a billet of metal, and what forms on it takes its body from the billet (6.6, 7.5). It is said by that metal and the plain word.

#### Maruhar Tooth

householders' tongue · key `maw_fang` · was "Maw Fang"

- Meaning: a tooth of Maruhar: plain English for the piece, with the name of the animal it came from. Said MA-ru-har.
- Roots: *maru*, a wilderness, sandy waste, desert (MW 790,1); *dhara*, holding, bearing, supporting (MW 510,1). Note: chiefly the last part of a compound; alone it is said of two gods as bearers of the world; with English "Tooth".
- Named by the born. It is a tooth, the one part of the animal harder than its plates (4.4). Householders who work remains know each piece by holding it and by what it came from (5.5, tinker).

#### Vanahar Sprig

householders' tongue · key `mossheart_sprig` · was "Mossheart Sprig"

- Meaning: a sprig of Vanahar: plain English for the piece, with the name of the animal it came from. Said VA-na-har.
- Roots: *vana*, a forest, wood (MW 917,2); *dhara*, holding, bearing, supporting (MW 510,1). Note: chiefly the last part of a compound; alone it is said of two gods as bearers of the world; with English "Sprig".
- Named by the born. It is a shoot off the body that still puts out leaf (4.3); Mossheart was two evocative nouns glued. Householders who work remains know each piece by holding it and by what it came from (5.5, tinker).

#### Guhamāt Cap

householders' tongue · key `mycelial_crown` · was "Mycelial Crown"

- Meaning: a cap of Guhamāt: plain English for the piece, with the name of the animal it came from. Said gu-ha-MĀT.
- Roots: *guhā*, a cave, hiding-place (MW 360,3); *mātṛ*, mother (MW 807,1); with English "Cap".
- Named by the born. It is a piece of the cap, on which low feeders form as they formed on the pieces that fell from the animal (4.6). Householders who work remains know each piece by holding it and by what it came from (5.5, tinker).

#### Tala Bar

householders' tongue · key `noctrium_bar` · was "Noctrium Bar"

- Meaning: the lower part, base, bottom, with English "bar". Said TA-la.
- Roots: *tala*, surface, level; the lower part, base, bottom (MW 440,2); with English "Bar".
- Named by the born. A bar of the metal named by the tier word: The same metal as the inner one, lying lower in the hollow, down to the standing water over the body of the root; the first comers named it for where it lies, and smiths count and sell it as a second metal (6.2).

#### Tala Bow

householders' tongue · key `noctrium_bow` · was "Nightreach"

- Meaning: a bow of Tala. Said TA-la.
- Roots: *tala*, surface, level; the lower part, base, bottom (MW 440,2); with English "Bow".
- Named by the born. A bow is an ordinary thing. It is said by the hardness of its make and the plain word, as the picks and the bars are (6.2, 5.7, L.11).

#### Tala Staff

householders' tongue · key `noctrium_staff` · was "Spore Staff"

- Meaning: a staff with a seat of Tala. Said TA-la.
- Roots: *tala*, surface, level; the lower part, base, bottom (MW 440,2); with English "Staff".
- Named by the born. A staff throws as hard as its seat is hard, and each is made of the metal whose seat it carries (6.6). It is said by that metal and the plain word.

#### Tala Sword

householders' tongue · key `noctrium_sword` · was "Noctrium Edge"

- Meaning: a sword of Tala. Said TA-la.
- Roots: *tala*, surface, level; the lower part, base, bottom (MW 440,2); with English "Sword".
- Named by the born. A sword of this hardness is an ordinary thing and is said as one: the word for what it is made of and the plain word for the weapon, as the picks and the bars are (6.2, L.11).

#### Tala Totem

householders' tongue · key `noctrium_totem` · was "Mycelid Idol"

- Meaning: a totem with a billet of Tala. Said TA-la.
- Roots: *tala*, surface, level; the lower part, base, bottom (MW 440,2); with English "Totem".
- Named by the born. A totem is two carved bones and a billet of metal, and what forms on it takes its body from the billet (6.6, 7.5). It is said by that metal and the plain word.

#### Patik Arrow

householders' tongue · key `prism_arrow` · was "Prism Arrow"

- Meaning: an arrow headed with Patik. Said PA-tik.
- Roots: *sphaṭika*, crystal, quartz (MW 1269,3); with English "Arrow".
- Named by the born. The five arrowheads are five hardnesses (6.7). This one is headed with the islands' metal that has crystal through it and is said by its metal, as the bar is.

#### Patik Bar

householders' tongue · key `prism_bar` · was "Prismite Bar"

- Meaning: crystal, quartz, with English "bar". Said PA-tik.
- Roots: *sphaṭika*, crystal, quartz (MW 1269,3); with English "Bar".
- Named by the born. A bar of the metal named by the tier word: The islands' metal with that world's crystal grown through it, named by the first comers for the crystal that shows in the bar (6.2).

#### Patik Bow

householders' tongue · key `prism_bow` · was "Spectrum Bow"

- Meaning: a bow of Patik. Said PA-tik.
- Roots: *sphaṭika*, crystal, quartz (MW 1269,3); with English "Bow".
- Named by the born. A bow is an ordinary thing. It is said by the hardness of its make and the plain word, as the picks and the bars are (6.2, 5.7, L.11).

#### Ratan Crystal

householders' tongue · key `prism_core` · was "Prism Core"

- Meaning: a crystal of Ratan: plain English for the piece, with the name of the animal it came from. Said RA-tan.
- Roots: *ratna*, a jewel, gem; a treasure (MW 864,2); with English "Crystal".
- Named by the born. It is a piece of the densest crystal there is (4.8). Householders who work remains know each piece by holding it and by what it came from (5.5, tinker).

#### Ratan Remains

householders' tongue · key `prism_heart` · was "Prism Heart"

- Meaning: the raw remains of Ratan: the trade's plain word for a piece of a great feeder that has not been boiled down, with the name of the animal. Said RA-tan.
- Roots: *ratna*, a jewel, gem; a treasure (MW 864,2); with English "Remains".
- Named by the born. A piece of the strongest of the islands' crystal kinds. In a ring of the rock of the islands it is the fourth forge (4.8). Remains is the trade's plain word (6.3), and each of the eight is known by the name of the animal it came from.

#### Ratan Lens

householders' tongue · key `prism_lens` · was "Prism Lens"

- Meaning: a lens for Ratan: the plain English word for what the born take the vessel to be, with the name of the one it is laid for. Said RA-tan.
- Roots: *ratna*, a jewel, gem; a treasure (MW 864,2); with English "Lens".
- Named by the born. The born say the lens gathers light and the light calls the animal, their account of a bait that works by the shards it holds flat (4.8). What is laid for the one set over a country is an offering, and householders teach how to make each one (5.2).
- Other names for it:
  - **bait** (plain English): what it is: raw remains of the host's lesser animals in a vessel made to reach one animal (1.6, 4.2).

#### Patik Staff

householders' tongue · key `prism_staff` · was "Prism Wand"

- Meaning: a staff with a seat of Patik. Said PA-tik.
- Roots: *sphaṭika*, crystal, quartz (MW 1269,3); with English "Staff".
- Named by the born. A staff throws as hard as its seat is hard, and each is made of the metal whose seat it carries (6.6). It is said by that metal and the plain word.

#### Patik Sword

householders' tongue · key `prism_sword` · was "Prismite Brand"

- Meaning: a sword of Patik. Said PA-tik.
- Roots: *sphaṭika*, crystal, quartz (MW 1269,3); with English "Sword".
- Named by the born. A sword of this hardness is an ordinary thing and is said as one: the word for what it is made of and the plain word for the weapon, as the picks and the bars are (6.2, L.11).

#### Patik Totem

householders' tongue · key `prism_totem` · was "Shardling Core"

- Meaning: a totem with a billet of Patik. Said PA-tik.
- Roots: *sphaṭika*, crystal, quartz (MW 1269,3); with English "Totem".
- Named by the born. A totem is two carved bones and a billet of metal, and what forms on it takes its body from the billet (6.6, 7.5). It is said by that metal and the plain word.

#### Guhamāt Remains

householders' tongue · key `queen_spore` · was "Queen Spore"

- Meaning: the raw remains of Guhamāt: the trade's plain word for a piece of a great feeder that has not been boiled down, with the name of the animal. Said gu-ha-MĀT.
- Roots: *guhā*, a cave, hiding-place (MW 360,3); *mātṛ*, mother (MW 807,1); with English "Remains".
- Named by the born. A piece of the strongest of the hollow's fungus kinds. In a ring of the rock of the hollow it is the third forge (4.6). A great feeder is an animal and has no queen (4.13). Remains is the trade's plain word (6.3), and each of the eight is known by the name of the animal it came from.

#### Vihanga Scale

householders' tongue · key `rift_scale` · was "Rift Scale"

- Meaning: a scale of the Vihanga. Said vi-HAN-ga.
- Roots: *vihaṃga*, a bird; (adj.) sky-going, flying (MW 1003,1). Note: also the name of a serpent-demon in the Mahābhārata; with English "Scale".
- Named by the born. A scale of the broad flier of the islands (7.3), said by the name of the animal. The old name used a word for the place that is gone.

#### Maruhar Remains

householders' tongue · key `scorched_core` · was "Scorched Core"

- Meaning: the raw remains of Maruhar: the trade's plain word for a piece of a great feeder that has not been boiled down, with the name of the animal. Said MA-ru-har.
- Roots: *maru*, a wilderness, sandy waste, desert (MW 790,1); *dhara*, holding, bearing, supporting (MW 510,1). Note: chiefly the last part of a compound; alone it is said of two gods as bearers of the world; with English "Remains".
- Named by the born. A piece of the burrower's middle, which is bodied in rock from beside the molten rock. In a ring of deep rock it is the second forge (4.4). Householders say it is hot enough to melt the ore, which is false: the remains loosen the ore, and no fire does. Core is the ward word for root-wood (1.2), so the old word goes. Remains is the trade's plain word (6.3), and each of the eight is known by the name of the animal it came from.

#### Guhamāt Smoker

householders' tongue · key `spore_censer` · was "Spore Censer"

- Meaning: a smoker for Guhamāt: the plain English word for what the born take the vessel to be, with the name of the one it is laid for. Said gu-ha-MĀT.
- Roots: *guhā*, a cave, hiding-place (MW 360,3); *mātṛ*, mother (MW 807,1); with English "Smoker".
- Named by the born. It smoulders the sacs on the fungus so that the smoke carries in the still air of the hollow (4.6). The plain word for a pot that makes smoke is used, since a censer is a temple vessel. What is laid for the one set over a country is an offering, and householders teach how to make each one (5.2).
- Other names for it:
  - **bait** (plain English): what it is: raw remains of the host's lesser animals in a vessel made to reach one animal (1.6, 4.2).

#### Jīmūt Kite

householders' tongue · key `storm_kite` · was "Storm Kite"

- Meaning: a kite for Jīmūt: the plain English word for what the born take the vessel to be, with the name of the one it is laid for. Said jī-MŪT.
- Roots: *jīmūta*, a cloud (MW 422,1). Note: also the name of a wrestler and of a sage in the Mahābhārata; with English "Kite".
- Named by the born. It is a kite, flown from the stone to put the bait in the air (4.7). What is laid for the one set over a country is an offering, and householders teach how to make each one (5.2).
- Other names for it:
  - **bait** (plain English): what it is: raw remains of the host's lesser animals in a vessel made to reach one animal (1.6, 4.2).

#### Jīmūt Remains

householders' tongue · key `storm_plume` · was "Storm Plume"

- Meaning: the raw remains of Jīmūt: the trade's plain word for a piece of a great feeder that has not been boiled down, with the name of the animal. Said jī-MŪT.
- Roots: *jīmūta*, a cloud (MW 422,1). Note: also the name of a wrestler and of a sage in the Mahābhārata; with English "Remains".
- Named by the born. A piece of the pale stuff the flier is bodied in. It stands up from the hand however it is held, and six bars round one of these are the second gate (4.7). Remains is the trade's plain word (6.3), and each of the eight is known by the name of the animal it came from.

#### Maruhar Lure

householders' tongue · key `sunken_lure` · was "Sunken Lure"

- Meaning: a lure for Maruhar: the plain English word for what the born take the vessel to be, with the name of the one it is laid for. Said MA-ru-har.
- Roots: *maru*, a wilderness, sandy waste, desert (MW 790,1); *dhara*, holding, bearing, supporting (MW 510,1). Note: chiefly the last part of a compound; alone it is said of two gods as bearers of the world; with English "Lure".
- Named by the born. The born speak of calling it up; a burrower is reached by a lure sunk through the loose sand, which the gold weighs down (1.6, 4.4). What is laid for the one set over a country is an offering, and householders teach how to make each one (5.2).
- Other names for it:
  - **bait** (plain English): what it is: raw remains of the host's lesser animals in a vessel made to reach one animal (1.6, 4.2).

#### Jīmūt Feather

householders' tongue · key `tempest_feather` · was "Tempest Feather"

- Meaning: a feather of Jīmūt: plain English for the piece, with the name of the animal it came from. Said jī-MŪT.
- Roots: *jīmūta*, a cloud (MW 422,1). Note: also the name of a wrestler and of a sage in the Mahābhārata; with English "Feather".
- Named by the born. It is the same pale stuff as the plume, bears weight and has almost none (4.7); tempest carried the storm the born speak of. Householders who work remains know each piece by holding it and by what it came from (5.5, tinker).

#### Antar Bar

householders' tongue · key `umbrite_bar` · was "Umbrite Bar"

- Meaning: the inside; inner, with English "bar". Said AN-tar.
- Roots: *antara*, interior, inner; (n.) the inside, an interval (MW 43,3); with English "Bar".
- Named by the born. A bar of the metal named by the tier word: The first metal the first comers cut inside the root, where it lies at every height of the hollow, named for where it lies; the born know it only from bars and from the bait patterns, and call the place itself under (3.4, 3.6, 6.2).

#### Antar Bow

householders' tongue · key `umbrite_bow` · was "Duskbow"

- Meaning: a bow of Antar. Said AN-tar.
- Roots: *antara*, interior, inner; (n.) the inside, an interval (MW 43,3); with English "Bow".
- Named by the born. A bow is an ordinary thing. It is said by the hardness of its make and the plain word, as the picks and the bars are (6.2, 5.7, L.11).

#### Antar Staff

householders' tongue · key `umbrite_staff` · was "Umbral Scepter"

- Meaning: a staff with a seat of Antar. Said AN-tar.
- Roots: *antara*, interior, inner; (n.) the inside, an interval (MW 43,3); with English "Staff".
- Named by the born. A staff throws as hard as its seat is hard, and each is made of the metal whose seat it carries (6.6). It is said by that metal and the plain word.

#### Antar Sword

householders' tongue · key `umbrite_sword` · was "Umbrite Glaive"

- Meaning: a sword of Antar. Said AN-tar.
- Roots: *antara*, interior, inner; (n.) the inside, an interval (MW 43,3); with English "Sword".
- Named by the born. A sword of this hardness is an ordinary thing and is said as one: the word for what it is made of and the plain word for the weapon, as the picks and the bars are (6.2, L.11).

#### Antar Totem

householders' tongue · key `umbrite_totem` · was "Shade Effigy"

- Meaning: a totem with a billet of Antar. Said AN-tar.
- Roots: *antara*, interior, inner; (n.) the inside, an interval (MW 43,3); with English "Totem".
- Named by the born. A totem is two carved bones and a billet of metal, and what forms on it takes its body from the billet (6.6, 7.5). It is said by that metal and the plain word.

#### Vanahar Likeness

householders' tongue · key `verdant_idol` · was "Verdant Idol"

- Meaning: a likeness for Vanahar: the plain English word for what the born take the vessel to be, with the name of the one it is laid for. Said VA-na-har.
- Roots: *vana*, a forest, wood (MW 917,2); *dhara*, holding, bearing, supporting (MW 510,1). Note: chiefly the last part of a compound; alone it is said of two gods as bearers of the world; with English "Likeness".
- Named by the born. Householders say the log must be carved as a likeness and they put a red flower on it; the remains in it do the work (4.3). What is laid for the one set over a country is an offering, and householders teach how to make each one (5.2).
- Other names for it:
  - **bait** (plain English): what it is: raw remains of the host's lesser animals in a vessel made to reach one animal (1.6, 4.2).

#### Antar Arrow

householders' tongue · key `void_arrow` · was "Umbral Arrow"

- Meaning: an arrow headed with Antar. Said AN-tar.
- Roots: *antara*, interior, inner; (n.) the inside, an interval (MW 43,3); with English "Arrow".
- Named by the born. The five arrowheads are five hardnesses (6.7). This one is headed with the metal of the hollow and is said by its metal, as the bar is. The old name claimed a shade.

#### Kankāl Bell

householders' tongue · key `warden_bell` · was "Warden Bell"

- Meaning: a bell for Kankāl: the plain English word for what the born take the vessel to be, with the name of the one it is laid for. Said kan-KĀL.
- Roots: *kaṅkāla*, skeleton (MW 242,2); with English "Bell".
- Named by the born. The born ring the iron cup set mouth down on the stone and call it a bell; the sound does nothing (4.5). What is laid for the one set over a country is an offering, and householders teach how to make each one (5.2).
- Other names for it:
  - **bait** (plain English): what it is: raw remains of the host's lesser animals in a vessel made to reach one animal (1.6, 4.2).

#### Kankāl Remains

householders' tongue · key `warden_sigil` · was "Warden Sigil"

- Meaning: the raw remains of Kankāl: the trade's plain word for a piece of a great feeder that has not been boiled down, with the name of the animal. Said kan-KĀL.
- Roots: *kaṅkāla*, skeleton (MW 242,2); with English "Remains".
- Named by the born. A piece of the strongest of the shade-kind. Seven pieces of black glass round one of these are the first gate (4.5). The old name made it a sign and the animal a warden. Remains is the trade's plain word (6.3), and each of the eight is known by the name of the animal it came from.

#### Kankāl Plate

householders' tongue · key `wardens_aegis` · was "Warden's Aegis"

- Meaning: a plate of Kankāl: plain English for the piece, with the name of the animal it came from. Said kan-KĀL.
- Roots: *kaṅkāla*, skeleton (MW 242,2); with English "Plate".
- Named by the born. It is a plate of the pale set matter of its body (4.5); warden and aegis claim a guard. Householders who work remains know each piece by holding it and by what it came from (5.5, tinker).

### Plain English

| Name | Key | Old name | Meaning | Why |
| --- | --- | --- | --- | --- |
| Apple | `apple` | unchanged | an apple | Fruit from trees; nothing is tilled (6.9). The present name is already right and stays. |
| Arrow | `arrow` | unchanged | an arrow | A flint head on a shaft (6.7). The present name is already right and stays. |
| Barbed Arrow | `barbed_arrow` | unchanged | an arrow with a barbed head | Barbed iron, one of the five heads (6.7). The present name is already right and stays. |
| Wild Berries | `berries` | unchanged | berries that grow unsown | What grows without being sown; nothing is tilled, so wild is true (1.6 Food). The present name is already right and stays. |
| Whistle | `binders_whistle` | Binder's Whistle | a whistle | The whistle packed with remains, on which one more small feeder forms; the beastcaller thinks it works by its sound, and nothing binds (6.7, 5.5 beastcaller, 7.5). |
| Lees Lump | `bog_pearl` | Bog Pearl | a lump of lees set in mud | Lees that lies in mud sets as it does in rock, and the animal that lies in the mire swallows a lump with the mud (3.2 swamp, 7.3). It is no pearl. Lees is the plain word the ground chapter fixes. |
| Bone | `bone` | unchanged | bone | What is left in the pot, and what feeders leave (6.3, 7.3). The present name is already right and stays. |
| Spring Boots | `bounding_boots` | Bounding Boots | boots with a spring in them | Plain good gear, the boots and the anklet worked into one piece (6.7, 6.12 Join). |
| Thorned Guard | `briar_bracer` | Briar Bracer | a guard for the arm set with thorn | The thorned guard, set with thorn so that what strikes it is cut (6.7). It is said like the plain guard it is made from. |
| Cairn Bow | `cairn_bow` | Firstlight Bow | the bow out of the cairn | One of the four arms of the first comers that lay in the store under the eighth stone and come out of the animal that ate the store (4.10). It is an ordinary arm and is said in plain English, with the born's word for the place, as the key and the gem are. |
| Cairn Sword | `cairn_edge` | Dawnbreaker | the sword out of the cairn | One of the four arms of the first comers that lay in the store under the eighth stone and come out of the animal that ate the store (4.10). It is an ordinary arm and is said in plain English, with the born's word for the place, as the key and the gem are. |
| Cairn Staff | `cairn_staff` | Sovereign Rod | the staff out of the cairn | One of the four arms of the first comers that lay in the store under the eighth stone and come out of the animal that ate the store (4.10). It is an ordinary arm and is said in plain English, with the born's word for the place, as the key and the gem are. |
| Cairn Lamp | `cairn_totem` | Cairn Lantern | a totem whose head is a lamp from the housing | One of the four arms of the first comers that lay in the store under the eighth stone and come out of the animal that ate the store (4.10). It is an ordinary arm and is said in plain English, with the born's word for the place, as the key and the gem are. Its head is a lamp from the housing, and the plain word says so (7.5). |
| Stone Scale | `chitin` | Chitin Plate | a scale of the stone-eating kind | The plates of the stone-eating kind are scale of the stone it has eaten (7.3). The scale worn at the wrist is one of these (6.7). Chitin is the wrong matter. |
| Cloud Bottle | `cloud_bottle` | Bottled Gust | a bottle of the pale stuff | It holds a wad of the pale stuff that hangs under the islands, let out under the foot as one step of ground in the air (6.7, 3.5). Arrivals take that stuff for cloud, because they hold that the islands are in the sky, and the block has the same word (1.8). It holds no wind. |
| Coal | `coal` | unchanged | coal | Old timber in the rock, or timber charred in the fire (6.3). The present name is the plain word for what it is and stays. |
| Roast Fish | `cooked_fish` | Seared Glimmerfin | roasted fish | Plain, matching Roast Meat (6.9). |
| Roast Meat | `cooked_meat` | unchanged | roasted meat | Fire trebles what meat is worth (6.9). The present name is already right and stays. |
| Wrist Scale | `delvers_charm` | Delver's Charm | a scale worn at the wrist | A scale of the stone-eating kind worn at the wrist, which loosens rock a little under the pick (6.7). |
| Door | `door` | unchanged | a door | The item that places a door (1.6 Rooms and townsfolk). The present name is already right and stays. |
| Knuckle Band | `duelists_sigil` | Duelist's Sigil | a band worn over the knuckles | One of the two bands that add to a blow, which belong to the game and have no cause (6.7, 1.9). The plain name says where it is worn and claims nothing. The old name claimed a duel and a sign. |
| Carved Bone | `effigy` | Bone Effigy | a carved bone | A carved bone with raw shade remains bound to it, which a small feeder forms on because the remains are food (6.6); an effigy is a likeness and claimed the carving did the work (8.11), and the beastcaller's own words are carved bone (5.5). |
| Ember Dust | `ember_dust` | unchanged | dust of embers | What the cinder wisp leaves, which burns twice as long as coal (6.3, 7.3); plain words for what it is. The present name is already right and stays. |
| Feather | `feather` | unchanged | a feather | From the bird, an ordinary animal (6.9). The present name is already right and stays. |
| Feather Charm | `feather_charm` | unchanged | a small worn piece with a feather | One of the pieces with the pale stuff of the islands in it, which takes the force out of a landing (6.7). The present name stays. |
| Plant Fiber | `fiber` | unchanged | fibre from plants | Tall grass and reeds for fibre (3.2, 6.9). The present name is already right and stays. |
| Flint | `flint` | unchanged | flint | Flint in the gravel of the deep sea (3.2 ocean). The present name is the plain word for what it is and stays. |
| Cloud Emblem | `gale_emblem` | Gale Emblem | an emblem with the pale stuff in it | The piece that gives a second step in the air and a soft landing, made with the pale stuff that arrivals take for cloud (6.7, 1.8). It has no wind in it. |
| Jelly | `gel` | Capgel | jelly | It is the jelly that rots out of fallen growth, in which the Kinva forms and which lies there when it is killed (7.3 gelcap); a plain word, where the old name glued two words together. |
| Fungus Broth | `glow_broth` | Glowcap Broth | a broth of fungus | The lit fungus of the hollow eaten as broth, which feeds and eases the arm a little (6.9); "glowcap" glued two words, and the apothecary's broth needs only the plain words. |
| Gold Bar | `gold_bar` | unchanged | a bar of gold | The present name is the plain word for what it is and stays. |
| Greater Salve | `greater_salve` | unchanged | a stronger salve | The stronger salve made with growth from the hollow (5.5 apothecary, 6.8). The present name is already right and stays. |
| Greater Tonic | `greater_tonic` | unchanged | a stronger tonic | The stronger tonic made with growth from the hollow (5.5 apothecary). The present name is already right and stays. |
| Locket | `heart_locket` | Heart Locket | a small hinged case worn on a chain | The locket, a number with no cause (6.7, 1.9); heart adds nothing. |
| Hide | `hide` | unchanged | hide | From the grazer, the rooter and some feeders (6.9). The present name is already right and stays. |
| Hide Cap | `hide_0` | unchanged | a cap of hide | Present name is already right: hide is the grazer's and rooter's, cut on the workbench, and cap is the plain word (6.4 workbench, 6.9). |
| Hide Vest | `hide_1` | unchanged | a vest of hide | Present name is already right: plain hide work (6.4 workbench, 6.9). |
| Hide Trousers | `hide_2` | unchanged | trousers of hide | Present name is already right: plain hide work (6.4 workbench, 6.9). |
| Hollow Gate | `hollow_gate_kit` | unchanged | a gate to the hollow | A frame of hard matter round remains that hold a relation to the hollow (1.6 Gates); crews build gates and no householder goes through one (5.2), so the crews' plain words name it, and the hollow is the plain word for that place (1.3). The present name is already right and stays. |
| Iron Bar | `iron_bar` | unchanged | a bar of iron | The present name is the plain word for what it is and stays. |
| Iron Bow | `iron_bow` | Iron Recurve | a bow of the iron hardness | A bow is an ordinary thing. It is said by the hardness of its make and the plain word, as the picks and the bars are (6.2, 5.7, L.11). |
| Arm Guard | `iron_bracer` | Iron Bracer | an iron guard for the arm | Plain good gear: the iron guard for the arm (6.7). The plain name leaves out the metal, so that it is not read as a piece of iron armour. |
| Iron Staff | `iron_staff` | Spark Wand | a staff with an iron seat | A staff throws as hard as its seat is hard, and each is made of the metal whose seat it carries (6.6). It is said by that metal and the plain word. |
| Iron Sword | `iron_sword` | unchanged | a sword of iron | A sword of this hardness is an ordinary thing and is said as one: the word for what it is made of and the plain word for the weapon, as the picks and the bars are (6.2, L.11). |
| Iron Totem | `iron_totem` | Thornling Totem | a totem with an iron billet | A totem is two carved bones and a billet of metal, and what forms on it takes its body from the billet (6.6, 7.5). It is said by that metal and the plain word. |
| Bark Draught | `ironbark` | Ironbark Draught | a draught of bark | A bark draught that toughens skin for a few minutes, ordinary herb-work (6.9); "ironbark" glued two nouns and claimed iron. |
| Worn Coin | `lucky_coin` | Lucky Coin | a worn coin | The coin that brings more from a kill belongs to the game and has no cause (6.7, 1.9). The name claims no metal, since coin on this ground is lees by weight (1.6), and it leaves the word lucky to the modifier. |
| Shell | `magnet_shell` | Lodeshell | a shell | Lodeshell is two nouns glued; the shell that draws loose things in is a number with no cause (6.7, 1.9). |
| Crystal Charm | `mana_charm` | Mana Charm | a charm of crystal | Crystal-work that eases a driving arm; mana claims stored power, and the blue bar is the arm's strain (6.7, 6.6, 8.11). |
| Crystal | `mana_crystal` | Mana Crystal | crystal | Lees set hard; "mana" names nothing on this ground, and the plain word is what every crew says (1.6, 6.6). |
| Eyeglass | `marksman_lens` | Marksman's Lens | a lens of ground glass for the eye | Plain good gear: the ground glass that helps an archer's eye (6.7). |
| Moon Sliver | `moon_sliver` | unchanged | a sliver of the moon | Everyone says the things of the dark night come down from the moon and that their slivers are pieces of it (1.8, 7.3 moonspawn); the name carries that false belief, as names here do. The present name is already right and stays. |
| Moth Dust | `moth_dust` | unchanged | dust of the moth | The flier of the hollow is bodied in the dust that falls from the great caps and leaves it (7.3 umbral_moth). The present name is already right and stays. |
| Raw Fish | `raw_fish` | Glimmerfin | raw fish | The fish as food is plain fish; the creature has its own name, and food takes the plain word (6.9). |
| Raw Meat | `raw_meat` | unchanged | raw meat | Meat of the ordinary animals (6.9). The present name is already right and stays. |
| Long Glove | `reach_gauntlet` | Longarm Gauntlet | a long glove | The long glove that adds reach (6.7); Longarm is two words glued. |
| Recall Stone | `recall_stone` | unchanged | a stone that takes its bearer back | Crystal and cut lines round a gem, the same crossing as a fall made on purpose, taking the bearer back to the bed (1.6); arrivals find and use it, and the plain words say what it does. The present name is already right and stays. |
| Island Gate | `rift_gate_kit` | Rift Gate | a gate to the islands | There is no rift: the far place is the islands, what is left of the root's own world (1.3), and the crews who build the kit name it in plain words for where it opens (1.6 Gates). |
| Rust Lump | `rust_core` | Rusted Core | a lump of rust | The rustbound is bodied in the rust of the harness it ate and has no bone in it (1.6, 7.3 rustbound); "core" is the ward word for root-wood under a housing (1.2) and must not be used of anything else. |
| Crystal Ring | `sages_ring` | Sage's Ring | a ring of crystal | Crystal-work, crystal on a short line worn where the driving arm can use it; there are no sages and no spells (6.7, 6.6). |
| Healing Salve | `salve` | unchanged | a salve that heals | Fruit, mushroom and fibre bound on a wound, ordinary herb-work (6.9). The present name is already right and stays. |
| Shade Flesh | `shade_essence` | Shade Essence | the flesh of the shade-kind | It is the shade-kind's own matter raw, the body of bone and dark matter it took from other feeders (7.3 gloomshade); "essence" claimed a spirit, and the plain words say what is cut from the body. |
| Dark Cloak | `shadow_cloak` | Gloam Cloak | a dark cloak | The dark cloak, woven with the stuff of the shade-kind, hard to see at its edges (6.7); gloam is a poetic word. |
| Shard | `shard` | Living Shard | a shard | The Sakal is splintered crystal and leaves a shard (7.3 shardling); "living" claimed a life the crystal does not have. |
| Island Fruit | `skyfruit` | Skyfruit | fruit of the islands | The fruit that hung on the island trees at that world's last dusk, brought back by crews (6.9); "sky" glued an evocative noun on and stated the arrivals' mistake that the islands are overhead (1.8) as fact in every mouth, including the provisioner's, who sells it. |
| Cloud Treads | `skyrunner_treads` | Skyrunner Treads | treads with the pale stuff under the heel | Boots with the pale stuff under the foot and the heel (6.7). They are said with the word arrivals use for that stuff, which sets them apart from the plain boots. |
| Crystal Pendant | `soul_reliquary` | Soul Reliquary | a hanging piece of crystal | The larger crystal piece that does what the ring and the charm do; soul and reliquary are temple words, and 8.11 asks for it renamed (6.7, 8.11). |
| Cairn Gem | `sovereign_light` | Sovereign's Light | a gem of the cairn (English) | It is a piece of housing with its gem in it, and householders take the housing for the cairn they say closed their chief stone (4.10); sovereign and light claim a rule and a lighting that the kill never gives (4.13). |
| Spore Sac | `spore_sac` | unchanged | a sac of spores | What a Kavak leaves; three make the bait for the hollow's fungus strongest (7.3 sporeling). The present name is already right and stays. |
| Anklet | `spring_anklet` | Spring Anklet | a band worn round the ankle | Plain good gear: the anklet that helps the legs (6.7); spring adds nothing the effect line does not say. |
| Mushroom Stew | `stew` | Duskcap Stew | a stew of mushrooms | The brown caps make a plain stew (6.9); a plain name that does not depend on the cap's own name. |
| Stick | `stick` | unchanged | a stick | Ordinary timber (6.2). The present name is already right and stays. |
| Stone Bow | `stone_bow` | Flintstring Bow | the bow made at the stone hardness | The bow a crew makes once it is knapping stone, the second of the ten hardnesses (6.2). It is said like the stone sword beside it. The old name glued two nouns. |
| Stone Sword | `stone_sword` | unchanged | a sword of knapped stone | A sword of this hardness is an ordinary thing and is said as one: the word for what it is made of and the plain word for the weapon, as the picks and the bars are (6.2, L.11). |
| Walking Boots | `strider_boots` | Strider Boots | boots for walking | Plain good gear, leather cut to fit a body: the boots that help the legs (6.7). Strider is a cute coinage. |
| Flower Tea | `swiftroot` | Swiftroot Tea | a tea of flowers | It is a flower tea that quickens the legs (6.9); the old name glued two words and called a flower a root. |
| Thorn | `thorn` | Bramble Thorn | a thorn | Thorn is what the Kantak is bodied in and leaves (1.6, 7.3); the plain word, shortened. |
| Fins | `tide_fins` | Tide Fins | fins for swimming | The fins are plain good gear; tide adds nothing, and nothing flows on this ground (6.7, invented.md: water). |
| Tonic | `tonic` | Mana Tonic | a tonic | Ground crystal in fruit juice, the drink a holder takes at first light (5.5 apothecary, 6.6); there is no mana (8.11). |
| Arm Ring | `warriors_band` | Warrior's Band | a ring worn on the arm | One of the two bands that add to a blow, a number with no cause (6.7, 1.9); warrior is an office word for a person and the plain piece is a ring on the arm. |
| Crystal Fiber | `weave` | Spellweave | fibre laid round crystal | It is fibre laid round crystal, the same path as a cut line made up as cloth (6.4); there are no spells (8.11), so it takes the plain words for what it is. |
| Wooden Bow | `wood_bow` | Shortbow | a bow of wood | A bow is an ordinary thing. It is said by the hardness of its make and the plain word, as the picks and the bars are (6.2, 5.7, L.11). |
| Wooden Sword | `wood_sword` | unchanged | a sword of wood | A sword of this hardness is an ordinary thing and is said as one: the word for what it is made of and the plain word for the weapon, as the picks and the bars are (6.2, L.11). |

## Stations

### Names in a tongue, and names other peoples say differently

#### Maruhar Furnace

householders' tongue · key `forge2` · was "Emberforge"

- Meaning: the furnace built round the remains of Maruhar. Said MA-ru-har.
- Roots: *maru*, a wilderness, sandy waste, desert (MW 790,1); *dhara*, holding, bearing, supporting (MW 510,1). Note: chiefly the last part of a compound; alone it is said of two gods as bearers of the world; with English "Furnace".
- Named by the born. The born carry the pattern of the four forges built round great remains (2.3), and each is known by the animal whose remains lie in its bed. This one is a piece of Maruhar in a ring of the deep rock it passed through, with a fire under it (6.4). Furnace is the plain word, as for the stone one. The old name glued two nouns.

#### Guhamāt Furnace

householders' tongue · key `forge3` · was "Voidkiln"

- Meaning: the furnace built round the remains of Guhamāt. Said gu-ha-MĀT.
- Roots: *guhā*, a cave, hiding-place (MW 360,3); *mātṛ*, mother (MW 807,1); with English "Furnace".
- Named by the born. The born carry the pattern of the four forges built round great remains (2.3), and each is known by the animal whose remains lie in its bed. This one is a piece of Guhamāt in a ring of the rock of the hollow, with a fire under it (6.4). Furnace is the plain word, as for the stone one. The old name glued two nouns.

#### Ratan Furnace

householders' tongue · key `forge4` · was "Prism Crucible"

- Meaning: the furnace built round the remains of Ratan. Said RA-tan.
- Roots: *ratna*, a jewel, gem; a treasure (MW 864,2); with English "Furnace".
- Named by the born. The born carry the pattern of the four forges built round great remains (2.3), and each is known by the animal whose remains lie in its bed. This one is a piece of Ratan in a ring of the rock of the islands, with a fire under it (6.4). Furnace is the plain word, as for the stone one. The old name glued two nouns.

#### Kuranga Furnace

householders' tongue · key `forge5` · was "Eclipse Forge"

- Meaning: the furnace built round the remains of Kuranga. Said ku-RAN-ga.
- Roots: *kuraṅga*, a species of antelope; an antelope or deer in general (MW 293,3). Note: also, as mṛga is, the spot in the moon; with English "Furnace".
- Named by the born. The born carry the pattern of the four forges built round great remains (2.3), and each is known by the animal whose remains lie in its bed. This one is a piece of Kuranga in a ring of black glass, with a fire under it (6.4). Furnace is the plain word, as for the stone one. The old name glued two nouns.

### Plain English

| Name | Key | Old name | Meaning | Why |
| --- | --- | --- | --- | --- |
| Anvil | `anvil` | unchanged | an anvil | A block of iron heavy enough to stand under a hammer; ordinary smithing (6.4). The present name is already right and stays. |
| Chest | `chest` | unchanged | a chest | A box; ordinary goods in it draw nothing (6.4). The present name is already right and stays. |
| Stone Furnace | `forge1` | unchanged | a furnace of stone | A wood or coal fire in a ring of rubble that melts the soft ores; an ordinary fire with a plain name (1.6 Fire, 6.4). The present name is already right and stays. |
| Hand | `hand` | unchanged | the hand | Making by hand is splitting, knapping, tying and mixing, ordinary work (6.4). The present name is already right and stays. |
| Line Frame | `runeloom` | Runeloom | a frame for cutting lines | Nothing on this ground carries runes or words (2.3, L.11) and the thing is no loom; it is the crews' frame that holds a stave true while lines are cut along it and lays fibre under even tension, so it takes the plain words of the trade, line and frame (6.4). |
| Joining Bench | `tinker` | Tinker's Bench | a bench for joining two worked pieces into one | A piece of the remains of the first great feeder held between two iron bars over a plank top. Two worked pieces laid against the remains go soft enough to be pressed into one (6.4). The plain name says what is done on it. |
| Workbench | `workbench` | unchanged | a bench to work at | A true flat face and a vice, ordinary carpentry that every cutter knows (1.6 Making, 6.4). The present name is already right and stays. |

## Modifiers

A modifier goes in front of the name of a piece of gear.

| Name | Key | Old name | Meaning | Why |
| --- | --- | --- | --- | --- |
| True | `arcane` | Arcane | straight, even, without flaw | Arcane claims secret power; the fact is that its grain runs one way from hand to head so a line cut along it leaks less, and true is the word the bible uses of lines and edges that lie right (6.10, 6.12, 5.5 runescribe). |
| Favoured | `blessed` | Blessed | shown favour | Blessed names a god; it set all at once with no soft place, smiths cannot do it on purpose, and the born call it favour, so the name carries their word (6.10). |
| Brittle | `brittle` | unchanged | hard but liable to break | Present name is already the plain word for the fact: hammered after it set, with cracks too fine to see (6.10). |
| Dull | `dull` | unchanged | not sharp | Present name is already the plain word for the fact: the edge never closed (6.10). |
| Fleet | `fleet` | unchanged | swift | The present name stays: the bible gives this label no cause and it belongs to the game (6.10, 1.9). |
| Heavy | `heavy` | unchanged | of great weight | Present name is already the plain word for the fact: it set dense, more metal than its size (6.10). |
| Keen | `keen` | unchanged | having a fine sharp edge | Present name is already the plain word for the fact: the edge closed to a single line with no flaw (6.10). |
| Lucky | `lucky` | unchanged | having luck | The present name stays: the bible gives this label no cause and it belongs to the game (6.10, 1.9). |
| Flecked | `menacing` | Menacing | marked with small spots of something | Menacing is a mood; the fact is a grain of a strong kill's lees set in the piece (6.10). |
| Glowing | `radiant` | Radiant | giving off a faint light | Old lees has set into the metal and it shows a faint cold light; glowing says that without praise (6.10, 6.2 eclipse). |
| Quenched | `savage` | Savage | cooled in liquid after forging | Savage is a mood; the fact is that the metal passed through a feeder or was quenched in lees, and loosens a little where it cuts (6.10). |
| Dense | `stalwart` | Stalwart | closely packed in substance | Stalwart is a word for a person; the fact is that it set dense throughout, turns more and weighs more (6.10). |
| Lean | `swift` | Swift | having little substance for its size | The fact is that it set with less metal in it than its shape suggests; lean says that, and light would be read as lamplight (6.10). |
| Vital | `vital` | unchanged | of life | The present name stays: the bible gives this label no cause and it belongs to the game (6.10, 1.9). |
| Thick | `warding` | Warding | deep from face to back | Warding takes the word ward for a plate; the fact is that it set thickest where blows land (6.10, 1.2 Wards). |

## Rarities

| Name | Key | Old name | Meaning | Why |
| --- | --- | --- | --- | --- |
| Surface | `rarity:0` | Common | of the surface | A crew's plain word for where the matter lay: surface matter and green work, timber, rubble, hide, fibre (6.10). Common is a loot-table word. |
| Upper | `rarity:1` | Uncommon | of the upper rock | Matter of the upper rock, worked by fire: iron (6.10, 6.2 iron). |
| Deep | `rarity:2` | Rare | of the deep rock | Matter of the deep rock of the living ground: the gem and cinder (6.10, 6.2). |
| Hollow | `rarity:3` | Epic | from the hollow | Matter from between two faces of the wood, which is the hollow (6.10). The grade is said by the plain word for the place. |
| Island | `rarity:4` | Legendary | from the islands | Matter of the earlier world, which is the islands (6.10). The grade is said by the plain word for the place. |
| Floor | `rarity:5` | Mythic | from the floor | Matter that lay on the wood itself; arrivals call the root's face the floor and take it for stone (6.10, 1.3, 1.8). |
| Old | `rarity:6` | Relic | old | A made thing that has lain made since the first comers; relic is a word for the holy dead and a loot-table word, and old is the plain fact (6.10, 4.10). |

## States of a body

| Name | Key | Old name | Meaning | Why |
| --- | --- | --- | --- | --- |
| Rested | `dawn` | unchanged | rested | A body that slept a night through mends faster for a short time (6.9). The present name is already right and stays. |
| Well Fed | `fed` | unchanged | well fed | A full meal leaves a body mending faster for a while (6.9). The present name is already right and stays. |
| Toughened | `ironbark` | Ironbark | with toughened skin | The status from the bark draught, which toughens the skin (6.9); plain, like Well Fed and Rested. |
| Quickened | `swift` | Swiftroot | with quickened legs | The status from the flower tea, which quickens the legs (6.9). |

## The three attacks

### Names in a tongue, and names other peoples say differently

#### Sand March

plain English · key `ashen` · was "The Ashen Host"

- Meaning: a march of the sand-country people.
- Why: They are people on a march from a fire, not a host, which is a feeders' word (5.3, 8.11); the householders whose houses it reaches say plainly who comes.
- Other names for it:
  - **Payāna** (sand-country tongue): setting out, a march: the sand-country people's own word for what they do (5.3). From *prayāṇa*, setting out, a journey, a march (MW 688,1). Note: also departure, death.

#### Amāvassa

householders' tongue · key `moon` · was "The Hollow Moon"

- Meaning: the night of new moon. Said a-mā-VAS-sa.
- Roots: *amāvāsyā*, the night of new moon (MW 81,2).
- Named by the born. The moon is wholly dark on the eighth night of its round, which is the only calendar (1.3). The born have a word for that night, and since the strongest of the shade-kind was killed it is the night the deep kind comes up (1.6). A banner that says the born's word states nothing false, where the old name stated their belief about the moon as fact (8.11).
- Other names for it:
  - **the hollow moon** (plain English): the born's belief, said in English: they say the moon is hollow that night and that what was in it has come down (1.6, 1.8). It belongs in a born mouth.
  - **the dark night** (plain English): the ground chapter's plain words.

### Plain English

| Name | Key | Old name | Meaning | Why |
| --- | --- | --- | --- | --- |
| Night raid | `raid` | unchanged | a raid at night | The broken woodland host goes for stores at dusk; the string says nothing false (1.6, 8.11). The present name is already right and stays. |

## Titles and lines at the great stones

The title under each boss bar is dropped. The other lines are sentences, and are given here so that the old ones are replaced with them.

| Name | Key | Old name | Meaning | Why |
| --- | --- | --- | --- | --- |
| Roots come up through the paving. | `b_colossus:intro` | The ground remembers how to stand up. | plain English, said of what a hunter on the floor sees | When it comes up at a stone its roots go into the joints of the paving and up the oaks (4.3); the line says what a hunter sees, not that the ground does anything (4.13). |
| Its roots tear up out of the paving. | `b_colossus:phase1` | Roots tear free of the altar. | plain English, said of what a hunter on the floor sees | At half strength it pulls itself off the floor it has rooted into (4.3). |
| (none) | `b_colossus:title` | Warden of the Greenwood | (no subtitle) | Dropped: the bar shows the name alone. The name already carries the householders' belief, a line under it would gloss it (L.2), and 4.13 replaces every title, which the old one was. |
| Hoofbeats come up out of the dark. | `b_hart:intro` | Hoofbeats, and then no moon. | plain English, said of what a hunter on the floor sees | It runs on four legs and comes up at night under any moon; it does not put the moon out (4.9, 4.13). |
| Its tines light up violet. | `b_hart:phase1` | Its antlers catch a light that is not there. | plain English, said of what a hunter on the floor sees | The light on its antlers is the violet light its own kind gives (4.9, 4.13). |
| It charges, and is somewhere else. | `b_hart:phase2` | The Hart will not be led back. | plain English, said of what a hunter on the floor sees | At 25% it charges and changes place; nobody leads it (4.9, 4.13). |
| (none) | `b_hart:title` | Herald of the Long Night | (no subtitle) | Dropped: the bar shows the name alone. The name already carries the householders' belief, a line under it would gloss it (L.2), and 4.13 replaces every title, which the old one was. |
| Crystal gathers over the stone and turns. | `b_luminarch:intro` | Every colour arrives at once. | plain English, said of what a hunter on the floor sees | It hangs with a ring of pieces of its own crystal body turning round it (4.8); light is not what it is (4.13). |
| The crystals round it begin to turn. | `b_luminarch:phase1` | The prisms begin to turn. | plain English, said of what a hunter on the floor sees | The ring round it is pieces of its own body (4.8); light edit only (4.13). |
| It stops holding its shape, and pieces come away. | `b_luminarch:phase2` | It burns too bright to hold its shape. | plain English, said of what a hunter on the floor sees | At 25% it stops holding its body and pieces come away, on which its lesser kind form (4.8). |
| (none) | `b_luminarch:title` | First Light, Refracted | (no subtitle) | Dropped: the bar shows the name alone. The name already carries the householders' belief, a line under it would gloss it (L.2), and 4.13 replaces every title, which the old one was. |
| The sand in the bowl begins to move. | `b_maw:intro` | The dunes begin to breathe. | plain English, said of what a hunter on the floor sees | It comes up from below through the loose sand carried into the bowl (4.4); the sand is not breathing (4.13). |
| It stays up and thrashes, shedding grit. | `b_maw:phase1` | The Maw thrashes, shedding grit and fury. | plain English, said of what a hunter on the floor sees | At 45% it stays up and thrashes, and the grit it sheds draws its lesser kind (4.4); fury and the old name go (4.13). |
| (none) | `b_maw:title` | Hunger Beneath the Sand | (no subtitle) | Dropped: the bar shows the name alone. The name already carries the householders' belief, a line under it would gloss it (L.2), and 4.13 replaces every title, which the old one was. |
| Something large circles over the kite. | `b_regent:intro` | The sky leans down to look at you. | plain English, said of what a hunter on the floor sees | The kite puts the bait in the air, the only place it feeds, and it circles and does not land (4.7, 4.13). |
| Pieces of it begin to fall on the floor. | `b_regent:phase1` | Thunder gathers under its wings. | plain English, said of what a hunter on the floor sees | The strikes on marked ground fall from it because it is overhead; there is no thunder (4.7, 4.13). |
| It screams and stoops lower. | `b_regent:phase2` | The Regent screams, and the storm answers. | plain English, said of what a hunter on the floor sees | The stoop is how it takes anything; storm is the born's word for it overhead and nothing answers (4.7, 4.13). |
| (none) | `b_regent:title` | Sovereign of the High Wind | (no subtitle) | Dropped: the bar shows the name alone. The name already carries the householders' belief, a line under it would gloss it (L.2), and 4.13 replaces every title, which the old one was. |
| Stone moves inside the cairn. | `b_sovereign:intro` | It was here before the light. It kept it. | plain English, said of what a hunter on the floor sees | It lies in the base under the eighth stone and comes up through it to take the bait (4.10); it holds no light for anyone, and the line drops the banned word (README 13). |
| Stone grinds on stone. The stack parts, and its lit middle shows. | `b_sovereign:phase1` | Stone grinds on stone. The cairn opens its eye. | plain English, said of what a hunter on the floor sees | At 66% the stack parts and its lit middle shows, which the born call an eye (4.10); the eye goes (4.13). |
| It is coming apart, and everything in it shows. | `b_sovereign:phase2` | All the light it ever kept, all at once. | plain English, said of what a hunter on the floor sees | At 33% it is coming apart and everything in it shows at once (4.10). It held nothing for anyone, so the line says what a hunter on the floor sees. |
| (none) | `b_sovereign:title` | The First Stone Laid | (no subtitle) | Dropped: the bar shows the name alone. The name already carries the householders' belief, a line under it would gloss it (L.2), and 4.13 replaces every title, which the old one was. |
| The smoke reaches the roof, and the roof moves. | `b_sporemother:intro` | The cavern exhales. | plain English, said of what a hunter on the floor sees | The censer's smoke carries in the still air, and the dome over the floor is the growth the animal hangs by (4.6, 4.13). |
| Its cap splits, and the inside glows. | `b_sporemother:phase1` | Her cap splits and glows. | plain English, said of what a hunter on the floor sees | At 55% the wound opens the cap and the inside gives the light all fungus gives there (4.6); light edit only (4.13). |
| Its growth tears from the roof, and it swings. | `b_sporemother:phase2` | Sporemother tears loose from her roots! | plain English, said of what a hunter on the floor sees | At 20% most of the growth that held it tears and it swings on what is left (4.6). |
| (none) | `b_sporemother:title` | Mother of the Under-Bloom | (no subtitle) | Dropped: the bar shows the name alone. The name already carries the householders' belief, a line under it would gloss it (L.2), and 4.13 replaces every title, which the old one was. |
| The bell is rung, and something pale comes up. | `b_warden:intro` | A bell tolls with no bell to toll it. | plain English, said of what a hunter on the floor sees | The born ring the cup that holds the bait, and that can be said; the animal is pale with the deep kind it ate (4.5, 4.13). |
| It turns, throwing pale matter in spirals. | `b_warden:phase1` | The Warden raises both hands. | plain English, said of what a hunter on the floor sees | What the game called raising both hands is the animal turning to throw in spirals; it has no hands (4.5, 4.13). |
| It is coming apart, and the smaller ones come for it. | `b_warden:phase2` | The seal cracks. So does the Warden. | plain English, said of what a hunter on the floor sees | At 25% it begins to fail to hold its body and the shade-kind come in for it; nothing was sealed (4.5, 4.13). |
| (none) | `b_warden:title` | Keeper of the Sealed Way | (no subtitle) | Dropped: the bar shows the name alone. The name already carries the householders' belief, a line under it would gloss it (L.2), and 4.13 replaces every title, which the old one was. |

## Old things to find

Proposed in the materials chapter. None has a key in the game yet.

| Name | Key | Old name | Meaning | Why |
| --- | --- | --- | --- | --- |
| Steel Saw | `find:cutter_saw` | a cutter's saw | a saw of steel | A two-handled saw of steel from another world, made by cutters for broken root-wood; steel is a metal nobody makes on this ground, and plain words say what a crew sees (6.11). |
| Wire Net | `find:flier_net` | a net for fliers | a net of wire | A throwing net of island wire with weighted rim, from a store on the islands, for which the born have no word at all (6.11, 3.6). |
| Sealed Jar | `find:great_lees_jar` | a sealed jar of great lees | a sealed jar | A first comers' clay jar of salted great lees; to the householders it is lees in a jar, the plain thing every hearth wants, and nobody living has seen one opened (6.11, 1.6 Coin). |
| Ward Core | `find:hearth_core` | a core under a hearth | the core of a ward | A core cut on another world, set under an old hearthstone by first comers who built house wards the way they are built elsewhere; core is the fixed plain word (6.11, 1.2 Wards). |
| Heavy Harness | `find:hunter_harness` | a harness made for a born hunter | a heavy harness | Gem scale over cinder plate, heavier than anything an arrival wears; householders deny that the born ever hunted, so nobody on the ground calls it a hunter's, and a crew calls it by what it is (6.11, 1.5, 2.4). |
| Crystal Jar | `find:pot_crystal` | a crystal in the shape of a pot | crystal in the shape of a jar | A single crystal with the form of the inside of a jar whose clay broke off it; plain words say what it is, and it is where a player sees that crystal is lees (6.11). |
| Sealed Bench | `find:remains_bench` | a bench with stronger remains in it | a bench found sealed | A bench built round the remains of the hollow's strongest, sealed in a room of a dungeon; the tinker has never seen one, and a crew names it for how it is found (6.11, 6.12, 5.5 tinker). |
| Stone Staff | `find:stone_staff` | a staff of stone | a staff of dressed stone | A first comers' rod of dressed stone with cut lines and a gem seat, from before anyone here cut lines in wood; it lies in a vault in the hollow, where no born person goes, so it has only the crew's plain name (6.11, 3.6). |
