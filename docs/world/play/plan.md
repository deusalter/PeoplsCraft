# Step 4: show the world in play

The world bible is finished and the game shows almost none of it. This plan says what step 4 puts on the ground, in the windows and in every sentence, so that a crew of up to eight meets the causes of chapter 1 by playing. Writers work from it and from `text/README.md`. Builders work from it once the multiplayer code is merged.

Section numbers without a letter point to the bible (`docs/world/`). Keys in code font are internal keys and never change. A stride is one piece of ground. `SEA` is the height of the one water, 96. File and line numbers are those of this worktree.

Three rules run through every section.

- **Nothing here needs the wire.** Everything placed on the ground comes from the seed and the climate, which both sides already compute. Everything that opens for the crew is a shared flag, which the host already sends and saves.
- **Step 5 is not designed here.** Damage kinds, states of a body, skill trees, gear upgrading, named uniques, bounties, standing with the peoples, a miniboss for each country, dungeons with keys, the map and the loop after the last kill belong to step 5. Where the bible proposes one of them, this plan says so and leaves a hook: a key, a place, or a flag that step 5 can build on.
- **Text states what play shows.** A line may not describe a habit, a find or a change that the game does not have when the line ships. Where a chapter marks something *proposed* and this plan does not take it, the writer leaves it out.

## A. Sites and traces

### A.1 How a site is placed

Every site is one more row of `STRUCTS` in `src/world/gen/structures.ts` and is placed the way the thirteen old structures are: a grid of regions `cell` chunks wide, at most one origin to a region, the origin and every choice drawn from `hash01(rx, salt, rz, seed)`. A build may read the seed, the climate (`heightAt`, `biomeAt`) and, through `w.get`, the cells of the chunk being written. It reads nothing else, so any chunk can decide alone what overlaps it, the host and every client build the same thing, and nothing is sent.

Rules common to all the new rows:

- New rows are stamped before `village`, so an old structure overwrites a trace where they meet.
- `structAt` gives no origin where the origin of a `village`, a `ruin` or any `arena` lies within 40 strides. It finds those origins by calling `structAt` for the regions that could hold one.
- No origin lies within 48 strides of the world spawn. The ground over the mouth has nothing built on it and nothing marking it (3.2). `findSpawn(climate)` gives the spawn from the seed.
- Two rows (`crossing` and `lamp_row`) reach past their own region. `stampStructures` tests the eight neighbouring regions for a row marked `long`.
- New salts, all unused today: 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211.
- The first time any player of the crew comes on a site (D.4 gives the distance for each, 12 strides where it gives none), the flag `cx:site:<key>.seen` is set, the line `site.sight:<key>` shows once under the compass, and the codex subject opens.

### A.2 Blocks and items the sites need

Eight blocks and two items are new. The names shown are proposals: a name is fixed in `names.json`, and section I lists what has to be added there.

| Key | Proposed name | What it is in the table | Cause |
| --- | --- | --- | --- |
| `salt_crust` | Salt Crust | Cube, white. Hardness 0.3, no tool, drops nothing | 3.2 `beach`, 6.3 |
| `snow_prints` | Prints | Flat box one sixteenth high, not solid, replaceable, drops nothing, no item | 3.2 `tundra` |
| `ash_glass` | Ash Glass | Cube, black with grey in it. Hardness 6, pick, power 3. Drops `ash_token` one time in six and otherwise nothing | 5.3 The fired token |
| `great_fire` | Fire | Cube, not solid, light `[15, 11, 5]`, harms a body that stands in it like `lava` at a quarter of the harm. Hardness 1, drops `coal` 1 to 2 | 3.2 `desert` |
| `charred_planks` | Charred Planks | Cube, black. As `oak_planks`, but no fuel | 3.2 `savanna` |
| `rough_block` | Half-dressed Stone | Cube. Top face the texture of `wardstone`, the other faces `stone`. Hardness 3, pick, power 2, drops itself | 3.2 `crags` |
| `ward_core` | Ward Core | Cube with the texture of `bedrock`. Hardness 3, any tool or none, drops itself. It does nothing where it is set (1.2 rule 3) | 6.11 |
| `cairn_base` | Dressed Stone | As `wardstone`. Used only for the base under `altar8`. Its look changes when `boss:8` is set (F) | 4.10 |
| `cutter_saw` (item) | Steel Saw | Tool of kind `axe`, speed 30, power 1; as a weapon 5 harm. One to a stack, grade 2 | 6.11 |
| `pot_crystal` (item) | Crystal Jar | Material, grade 2. One recipe by hand: one `pot_crystal` gives eight `mana_crystal` | 6.11 |

### A.3 The rows of 8.2 marked proposed

All eleven are taken, and so is the tree of the `bloomvale` row, which makes twelve sites.

**`crossing`**, in `ocean` beside any shore. Cause: 3.2 `ocean`.
*Made of.* Single `wardstone` blocks at height `SEA`, each replacing the top cell of water (or of ice), on every second cell of one straight line. Between two stones is one cell of open water. The last stone carries a second `wardstone` on top of it: the next stone, carried out and never set.
*Placed.* `long`. Cell 16 chunks, chance 0.5, salt 151. The origin must be an `ocean` column whose floor is below `SEA - 2`. A direction is hashed from the four. From the origin the build walks back against that direction, up to 48 strides, to the first column at or above `SEA`: that is the shore end. With no such column there is no crossing. Stones go out from the shore end along the direction for a hashed 16 to 72 stones, only on columns below `SEA`. One crossing in six does not stop at its count: it runs on until it meets a column at or above `SEA`, or 120 stones.
*Found.* Nothing to carry. A way over water that nothing comes up in (3.1), and the place where the work stopped.

**`pan`**, in `beach`. Cause: 3.2 `beach`, 6.3 Salt and pots.
*Made of.* A square rim of `sandstone` seven strides on a side at ground height, round a floor five on a side cut one piece down. In three pans of four the cut is full of `sand` to the rim. A pan is clean when the origin of a `village` lies within 160 strides: its floor is `salt_crust` and the cut above it is air.
*Placed.* Cell 5 chunks, chance 0.6, salt 157. `beach` only, ground from `SEA` to `SEA + 2`, the seven by seven footprint within one piece of level.
*Found.* The crust, which breaks to nothing. The game has no salt to carry (6.13).

**`fold`**, in `plains`. Cause: 3.2 `plains`.
*Made of.* Two runs of `cobble`, one piece wide and two high, meeting at a right angle. Each run is a hashed 5 to 9 long and stands on its own ground, column by column. One oak (`stampTree`, the oak kind) stands on the cell diagonally inside the angle.
*Placed.* Cell 6 chunks, chance 0.5, salt 163. `plains` only, every footprint column above `SEA` and within two pieces of level. One of four turns, hashed.
*Found.* Nothing to carry.

**`lone_tree`**, in `bloomvale`. Cause: 3.2 `bloomvale`, 3.5.
*Made of.* One island tree as the island generator stamps it: a trunk of `star_log` five high and a crown of `star_leaves`. Before it is stamped, every log and leaf of another tree within six strides of the trunk is set to air, each chunk clearing its own cells.
*Placed.* Cell 10 chunks, chance 0.5, salt 167. `bloomvale` only, on dry ground.
*Found.* Light under it, so nothing comes up there (3.1). Its leaves drop `skyfruit` now and then (C, row 23). A crew that has crossed to the islands has seen the tree before.

**`prints`**, in `tundra`. Cause: 3.2 `tundra`, 1.6 Night, light and feeders.
*Made of.* A hashed 7 to 13 `snow_prints`, one to a stride, in one straight line in one of eight directions, each lying on its own column where the top block is `snowy_grass` or `snow` and the cell above is air. Nothing stands at either end. The line starts where six strides of unmarked snow lie round its first print.
*Placed.* Cell 4 chunks, chance 0.5, salt 173. `tundra` only.
*Found.* Nothing to carry. A print goes when a block is set on it or it is struck.

**`fire_ring`**, in `desert`. This is also the last row of 8.7. Cause: 3.2 `desert`, 5.3.
*Made of.*
- The ground is levelled to the origin's height within 14 strides: `sandstone` below, `sand` on top.
- A round floor of `ash_glass`, five strides in radius, at ground height, with two pieces of `sandstone` under it.
- One `great_fire` on the middle of the glass.
- A hashed 6 to 10 houses on a ring 11 strides out, evenly spaced, the first at a hashed angle. Each is five strides square outside: walls of `sandstone_bricks` two high, a flat roof of `sandstone`, a floor of `sandstone`, and one doorway with a `door` in the wall that faces the fire. There is no window and nothing inside.
- Three stacks of fuel 7 strides out, between the glass and the doors: two of `kapok_log` and one of `oak_log`, each two by two by two.
- No `chest`, `crate`, `lantern`, `bedroll` or `workbench` anywhere in the place.
*Placed.* Cell 20 chunks, chance 0.6, salt 179, radius 16. `desert` only, dry, level by the test a `village` uses. At least 64 strides from the origin of any `village`, `ruin` or `arena`.
*Who is there.* The build leaves one block entity of kind `fire` at the fire. While its chunk is ready the host keeps four to six people of the place present, as it keeps a townsperson's body: bodies of `ashen_raider`, with one `ashen_hexer`. They are at home: they do not attack, they are no creatures of an attack, and no ward or light turns them. By day they stand within 8 strides of the fire or walk the sand within 30. Before `boss:2` is set they stay out on the sand at night as well, since nothing but the burrower's host came up there (4.4). Once `boss:2` is set, at night all of them are within 6 strides of the fire and two stand at its edge facing out.
*What they do about a peopl.* When a player first comes within 10 strides, the nearest of them says one line of `fire.say:before` or `fire.say:after`, by the `boss:2` flag, as a tag over the head, or of `fire.say:night` at night. They do not trade. A player who strikes one of them, or breaks or sets a block within 16 strides of the fire, turns every one of them on that player until the next dawn, and one says `fire.say:struck`. A player who drops a log or coal within the ring hears `fire.say:fuel`, and nothing else follows in step 4. Those killed are gone. Others of that fire are there after the next dawn: a place of six to ten houses has more people than the few a crew sees at once (3.2).
*What else comes.* At night one `cinder_wisp` comes up 18 to 24 strides out, in the dark, and hangs three strides over the fire (7.3).
*Found.* `ash_glass` under an iron pick, and with it a token one time in six: a token is a piece of this floor and can be made no other way (5.3).
*Hooks for step 5.* Trade at a fire, fuel carried to it, fighters who walk with a crew, and what these people know of the sealed stores are standing with the sand-country people (8.5). The entity of kind `fire` is where that standing is kept.

**`burned_hearths`**, in `savanna`. A state of a `village`, with no row of its own. Cause: 3.2 `savanna`, 2.8.
*Made of.* The village as built, with the hearths of `hearth` below. In every house the eight floor cells round the hearthstone are `charred_planks` where they were `oak_planks`.
*Placed.* A `village` whose origin is in `savanna` is burned when `hash01(rx, 18, rz, seed) < 0.4`.
*Found.* Nothing more than in any village. The crates are stocked like the rest. Nothing in the houses says who did it, and the codex gives both tellings (D).

**`tree_floor`**, in `jungle`. Cause: 3.2 `jungle`.
*Made of.* A floor of `kapok_planks` five strides square, a hashed 7 to 10 pieces above the ground at its origin. Leaves in the three layers above the floor are set to air; trunks that pass through it are left. On the floor: a `lantern` at one corner, a `crate` with the `crate` loot beside the middle, and a `bedroll` next to the crate. Nothing joins the floor to the ground.
*Placed.* Cell 6 chunks, chance 0.5, salt 181. `jungle` only, on dry ground.
*Found.* The crate, the lamp, and a bed of the kind only an arrival uses.

**`quarry`**, in `crags`. Cause: 3.2 `crags`.
*Made of.* The build takes the one of the four directions in which the ground rises most over 8 strides from the origin. With a rise under 5 there is no quarry. The floor is the origin's height. A box seven strides across the rise and six along it is cut out: every cell in it above the floor, up to twelve pieces, is air, and the floor cells are `stone`. The faces left standing are flat and square. One `rough_block` stands on the floor in the middle of the open side.
*Placed.* Cell 8 chunks, chance 0.5, salt 191. `crags` only, origin at or above `SEA + 20`.
*Found.* The block.
*Hook for step 5.* The middle cell of the back face is where the store of 3.9 "cut back into the rock" would open.

**`column`**, in `peaks`. Cause: 3.2 `peaks`, 1.8.
*Made of.* The origin moves to the highest column within 6 strides. On it stands one column of `cobble`, one piece wide, a hashed 30 to 70 high and never within 8 of the top of the world. Beside its foot lie a `bedroll` and, on the other side, a `torch`.
*Placed.* Cell 8 chunks, chance 0.4, salt 193. `peaks` only.
*Found.* The bedroll: whoever stacked the column had a way.
*Hook for step 5.* The summit is the place of 7.8's older animals of the heights.

**`lamp_row`**, in the hollow (`dim:1`). Cause: 3.4.
*Made of.* Three `sporelamp` at one height, four strides apart, in a straight line that points at an old structure. A lamp is set only in a cell of air, and the row is built only when all three cells are air.
*Placed.* `long`. No hash of its own: one row for each `cache1`, at the cells 10, 14 and 18 strides out from its doorway, three pieces above its floor; and one row for each `arena4`, at 22, 26 and 30 strides east of its stone, nine pieces above its floor.
*Found.* Nothing to carry. Growth scatters, so a straight row was hung by a person, and it leads to a vault or a stone.

**`stump`**, on the islands (`dim:2`). Cause: 3.5 `rift_shards`.
*Made of.* Nothing is added. Within three strides of the origin, every `prism_crystal` standing more than one piece above the first block under it that is not crystal is set to air. A spire in that round is left one piece high.
*Placed.* Cell 3 chunks, chance 0.8, salt 197, from height 90 to 200. It shows only where spires stand, which is the crystal country.
*Found.* Stumps among whole spires.
*Hook for step 5.* 7.8's great `shardling` stands in a stand of spires.

### A.4 The rows of 8.7

| Row | Standing | Reason, and the hook left |
| --- | --- | --- |
| Under the floor of a `ruin`: an old `gloomshade` | step 5 | A miniboss. The origin of every `ruin` comes from the seed, so step 5 needs no new place |
| The deepest mud of a `swamp`: an old `bog_lurker` | step 5 | A miniboss |
| A `dungeon`: an old `stonegnawer` | step 5 | A miniboss |
| A `cache1` vault: an old `mycelid_knight` | step 5 | A miniboss |
| A summit in `peaks`: an old `frost_stalker` | step 5 | A miniboss. `column` marks summits |
| The oldest stand in a `forest` or `jungle`: a `thornling` pack's strongest | step 5 | A miniboss |
| A summit in `crags` or `peaks`: a `crag_bat` pack's strongest | step 5 | A miniboss. `column` and `quarry` mark the high country |
| One island in `rift`: a great `rift_ray` | step 5 | A miniboss |
| A stand of spires in `rift_shards`: a great `shardling` | step 5 | A miniboss. `stump` marks the pasture |
| Under the bed of the `ocean`: the largest sealed store | step 5 | A dungeon. `crossing` shows that the first comers worked over the water |
| `swamp`: a store under mud | step 5 | A dungeon |
| `desert`: a sealed store holed from below | step 5 | A dungeon. The people of a `fire_ring` know where it lies (5.3) |
| `crags`: a quarry cut back into the rock | step 5 | A dungeon. The back face of a `quarry` is its mouth |
| `rift`: a great store hung in open air | step 5 | A dungeon |
| `desert`: the place where the sand-country people live | step 4 | `fire_ring`, above |

### A.5 The rows of 8.8

| Row | Standing | What is done |
| --- | --- | --- |
| A cutter's saw | step 4 | `shaft`, below |
| A ward core under a hearth | step 4 | `hearth`, below |
| A crystal in the shape of a pot | step 4 | `pot_crystal`, in the loot of `dungeon` (weight 0.8) and `ruin` (weight 0.3). Both are stores where salt failed |
| A harness made for a born hunter | step 5 | A named piece of armour with numbers of its own. The bars in each of the eight already show what its wearer shows (4.2), and `eight.kill` says so |
| A sealed jar of great lees | step 5 | It is one night at a great stone, which is the loop after the last kill |
| A staff of stone | step 5 | A named weapon |
| A net for fliers | step 5 | It brings a flier down, which is a state of a body |
| A bench with stronger remains in it | step 5 | Gear upgrading (6.12) |

**`shaft`**, in any dry country of the living ground. Cause: 6.11, 1.3 Down and up.
*Made of.* A shaft of air two strides square from the surface to height 1, so that its floor is the root. The ring of twelve cells round it is `wardstone` at every height where the cell is not already solid and opaque, which walls off caves, water and molten rock. At the surface the ring stands one piece above the ground. On the floor, in one of the four cells, is a `chest` with the loot `shaft`: one `cutter_saw`, always, and two to four `torch`.
*Placed.* Cell 16 chunks, chance 0.4, salt 199. Dry ground, not `ocean`, `beach` or `swamp`. At least 96 strides from the spawn and 50 from the origin of a `dungeon`.
*Found.* The saw, and the floor: black, cold, and unmarked by the people who sank a shaft to cut it.

**`hearth`**, in every house of every `village`. Cause: 6.11, 1.5.
*Made of.* One `wardstone` in the floor of each house, in the middle cell against the wall opposite the door. In one house of eight, by a hash of the house's place, the cell under that stone is `ward_core`.
*Placed.* By `house()`, for every house.
*Found.* The core. Set down beside the floor it is the same stuff, and an arrival can see it.

## B. The eight killing floors

Each row gives what the generator builds today, what chapter 4 says the floor is, and the change. Nothing here changes a fight.

| Key | Built today | What it is (chapter 4, 3.7) | Change |
| --- | --- | --- | --- |
| `arena1` | Pad of `moss_stone` and `grass`, six posts of `oak_log` five high with a few leaves, six `glowshroom`, a dais of `mossy_bricks` | The first comers left six oaks standing as the posts of the floor. The fungus grows where carcasses were boiled down (4.3) | The six posts are whole oaks: `stampTree` with the oak kind, trunk six high, in place of a pole with five leaves. The first `arena1` is placed from the world spawn (below) |
| `arena2` | A bowl three deep, floor of `sandstone` mixed with `sand`, rim of `gilded_bricks`, four pillars of `sandstone_bricks` standing in the bowl, a gilded dais | The sand is where the animal comes up. The footing is the rim (3.7). Rim and platform are faced with gold because a stone-eater was going to lie against them (4.4) | The floor of the bowl is `sand` two deep over `sandstone`, with no bare stone showing. The rim is three wide. The four pillars stand on the rim, 15 strides out, and nothing stands in the sand but the dais |
| `arena3` | Pad of `wardstone` and `stone_bricks`, eight pillars of `bone_block` capped with `crystal_cyan`, a dais of `wardstone` | The pillars are stacked bone of the animals boiled down here. The caps are spilled lees, set (4.5) | At the foot of every second pillar one cell of the paving is `crystal_cyan`: lees that ran off the stack and set |
| `arena4` | A dome cut in `gloomstone`, floor of `mycel`, six posts of `gloom_stem` each with one cap block, four `sporelamp` standing on the floor | The animal hangs from the roof by its own growth, and the dome is that growth. The lamps hang (4.6) | The four lamps hang three pieces under the roof at the same four places. The inner face of the dome, one layer, is `gloomcap_violet` with `gloomcap_teal` one cell in five. Each post carries a cap three by three |
| `arena5` | Pad of `stone_bricks` flecked with `storm_block`, six pillars of `storm_block` 8 to 14 high | The pillars are masts for kites. The glass is stone the animal's throws loosened, on the pad and up the masts (4.7) | Each mast is `stone_bricks` at its foot and turns to `storm_block` by height: one cell in three for its lowest third, two in three for the middle, all for the top |
| `arena6` | A disc of `riftstone` five thick flecked with `prism_crystal`, eight pillars of `prism_crystal` | A made island, laid in open air because set ground stays (3.7). The way between islands is laid a piece at a time (3.5) | From the rim, in a hashed one of four directions, a line of single `riftstone` blocks at the height of the disc runs out a hashed 12 to 40 strides, one block to every second cell, and stops |
| `arena7` | Pad of `nightglass` and `deepstone`, ten pillars of `nightglass` capped with `crystal_violet` | Deep rock brought to the surface, on open ground under the moon (4.9) | None |
| `arena8` | Pad of `stone_bricks` and `cobble`, eight stepped heaps each with a `lantern`, two discs of `wardstone`, the stone on top | A raised base of dressed stone that held the store for the charge. The animal has eaten into it from beneath and lies in it (4.10) | The base is three discs of `cairn_base`, four, four and three strides in radius, with the stone on top. Under the base, for six pieces down and three strides out, about half the cells are air by a hash of the cell: clean gaps, with nothing lying loose (3.1). From outside the base is whole. Its look changes at `boss:8` (F) |

**The first `arena1` and the spawn** (8.10, 3.2 The nearest stone). Today `structAt` moves the origin of region (0, 0) to 70 to 120 strides east and 60 to 110 south of the world's zero point, wherever the spawn is. The change: the point is taken from the spawn. Distance is a hashed 120 to 260 strides. Direction is south-east (between east and south, hashed) for three seeds in four, and a hashed direction for the fourth. The region of `arena1` that holds that point has its origin moved to it, kept `radius + 2` inside the region's edge. A test: for a hundred seeds, `locate('arena1', spawn)` is between 100 and 300 strides off, and about three quarters lie south-east.

## C. Every row of 8.10

### C.1 Needed

| # | Change | Where, and exactly what | A test |
| --- | --- | --- | --- |
| 1 | The moon is drawn dark on the night of `moon` | `src/game.ts:600`. `e.moonPhase = (Math.floor(this.clock) % 8) / 4 - 1` becomes `((Math.floor(this.clock) + 5) % 8) / 4 - 1`. The value 0 is the dark face. It now falls where `day % 8 === 7`, the night `sim/events.ts` starts `moon`, and the whole face falls on the fourth night (1.3) | Set the clock to each of eight days and read `env.moonPhase`: 0 on day 7, -1 on day 3. With `boss:3` set, `events.a` is `moon` on the same night |
| 2 | Nothing but `cinder_wisp` comes up on `desert` sand until `boss:2` | `src/sim/mobs.ts`, where a spawn rule is chosen for a cell: on the living ground, in `desert`, with `boss:2` unset, a hostile kind other than `cinder_wisp` is refused. `src/sim/events.ts`: a wave cell in `desert` is skipped under the same test. Animals are untouched | Stand a bot on `desert` at night for 2,000 steps: every hostile creature is `cinder_wisp`. Set `boss:2`: `gloomshade` comes up |
| 3 | Sand-country fighters join `raid` on the `boss:2` flag | `src/sim/events.ts:82`. `diff >= 2 ? 'ashen_raider' : 'gloomshade'` becomes `sim.flags.has('boss:2') ? 'ashen_raider' : 'gloomshade'` | With `boss:1` and `boss:3` set and `boss:2` unset, 300 raid spawns hold no `ashen_raider`. With `boss:2` set they hold some |
| 4 | Townsfolk say *peopl* | Text. Every `folk.meet` entry carries the word, and `textlint.mjs` fails one that does not. The other lines use it where a householder would address the player | `textlint.mjs` |
| 5 | No text says a stone is lit by a kill | Text. The strings of 4.13 are entries of `eight.intro`, `eight.phase`, `eight.line`, `item.desc` and `task.*`, each with its present text. `textlint.mjs` refuses "lit" and "light" in a banner and "first light" outside a born or sand mouth | `textlint.mjs` |
| 6 | Sand-country fighters are drawn as people | `src/data/mobs.ts:257-261`. For `ashen_raider`, `ashen_hexer` and `siege_brute`: no `glow`, and the `eye` colour is a dark brown. `siege_brute` is 1.95 tall and 0.4 half-wide (`h`, `hw`, and `h: 1.95, w: 0.7` in its list of boxes) | For the three keys no box has `e > 0`, and `def.h <= 2` |
| 7 | No upright feeder has a face or hands | `src/data/mobs.ts`. The builders take an option `face: false`, which makes no eye boxes and ends each arm in its forearm. It is passed for `thornling`, `sproutling`, `bog_lurker`, `shardling`, `rustbound`, `gloomshade`, `moonspawn`, `mycelid_knight`, and for `b_warden` and every other of the eight | For those keys the list of boxes holds none made by `eyes()` |
| 8 | Each gate opens at its own matching spot, the same for everyone | See C.3 | See C.3 |
| 9 | A great feeder stays while anyone is on the floor to fight | See C.3 | See C.3 |

### C.2 Would be better

| # | Change | Standing | Reason, and what is done |
| --- | --- | --- | --- |
| 10 | `lunar_howler` is undone by the sun | step 4 | One key added to the kinds the sun undoes in `src/sim/mobs.ts:296`. The bestiary says the deep kind bears no light, and the flier is of that kind |
| 11 | `boss:7` goes back down at first light | step 4 | `src/sim/boss.ts`: for `n === 7`, when it is no longer night the animal withdraws, with the line `eight.line:dawn_down`. The bait is gone, as at any withdrawal |
| 12 | The `moonspawn` that come to `boss:8` come only at night | step 4 | `src/sim/boss.ts`: a `summon` of `moonspawn` is skipped by day. Today they come up in full sun and are undone at once |
| 13 | A creature weaker than a home's charge does not walk inside its reach at night | step 5 | It needs the strength of the kill in each pot, which is the standing with householders and the states of a body (8.3 Turned) |
| 14 | The three day kinds appear rooted or sunk | step 4 | `thornling` does not wander by day while it has no target. An idle `bog_lurker` standing on `mud` is drawn sunk to the head; the client works this out from what it already has. `gelcap` already sits. The habits are in the bestiary, so they have to be in play (D.3) |
| 15 | The chance of `raid` rises with great remains in chests, forges and gates | step 5 | It needs the count of stores, which is the loop after the last kill |
| 16 | Sand-country fighters go for chests, doors, forges, gates and beds | step 5 | Breaking a crew's house is a rule for standing with the sand-country people |
| 17 | A pot and a cut slab beside an occupied `guest_bed` | step 4 | A second state of the block, `guest_bed_held`, as `furnace_lit` is of `furnace`. `src/sim/npcs.ts` swaps the block when a townsperson moves in and back when one leaves. Its look carries the pot and the slab at the foot of the bed. It drops `guest_bed` |
| 18 | A householder met in a `village` at dusk | step 4 | A body `n_walker` with a householder's look and the name of the people, which `names.json` has. While a `village` chunk is ready and no townsperson of the crew is housed within 64 strides, one is present from dusk to dawn, sitting on the cell beside the well under the lamp. No hostile creature comes up within 28 strides of it. Right-click gives one line of `walker.say:dusk` as a toast. On the dark night it is inside the nearest house and says `walker.say:dark`. During `raid` it says `walker.say:raid`. It does not trade and is gone at dawn |
| 19 | The first-kill losses marked proposed (4.12) | split | **step 4:** `boss:5`: one more spawn rule for `crag_bat`, air, night, every country of the living ground, with `flag: 'boss:5'`. `boss:8`: one more spawn rule for `stonegnawer`, surface, night, with `flag: 'boss:8'`, and in `raid` one spawn in five is `stonegnawer` once `boss:8` is set. `boss:8`: the look of the base (F). `boss:2`: the Deserter's line (`folk.extra:deserter.burrower`). **step 5:** hollow and island kinds near gates (`boss:4`, `boss:5`, `boss:6`), `raid` on the dark night (`boss:7`), a pack at every dusk (`boss:8`). Each needs the rule that stores draw |
| 20 | The traces, country by country | step 4 | Section A |
| 21 | The first `arena1` placed from the world spawn | step 4 | Section B |
| 22 | The fixed hour of the islands is a dusk | step 4 | `src/data/dims.ts:19`. `fixedTime: 0.035` becomes `0.515`: the sun just under the edge on the evening side (3.5) |
| 23 | The lit leaves of the island trees drop `skyfruit` | step 4 | `src/data/blocks.ts:168`. `star_leaves` gains the drop `['skyfruit', 0.02, 1, 1]`. Leaves do not grow back, so none does |
| 24 | A kill can be burned, for no coin | step 5 | Fire as a kind of harm, and standing with the sand-country people |
| 25 | A later cost for the tonic | step 5 | A state of a body (6.8) |
| 26 | One great feeder up at a time for each kind | not taken | `ARCHITECTURE.md` 7.9 settles one live great feeder to each of the three places. That is already more than one on the server, and 1.9 lists the limit as the game's |
| 27 | An attack does not end because the last player left the living ground | not taken | `ARCHITECTURE.md` 7.5 ends it as lost, and 1.9 lists that as the game's |
| 28 | A shared standing with each born people | step 5 | Named in the brief |
| 29 | A great stone that can be charged and held | step 5 | The loop after the last kill |
| 30 | Reworking at a stronger bench; gear settling as it lies | step 5 | Gear upgrading |

### C.3 The two rules for several players

**Gates.** The bible asks that a gate raised at a spot comes out at the matching spot, the same for everyone (3.1). `ARCHITECTURE.md` section 9 already gives half of it: `land()` looks in `shared.gates` for a gate of that kind within 24 blocks of the arrival column and uses it, so everyone who crosses at one gate for the first time comes out at one far mouth. The other half is not there. `portalReturn` is kept for each player, and `travel()` (`src/sim/travel.ts:53`) sends a player who has one to that spot, whichever gate was stepped through. Two players at one gate can still come out apart, and a second gate raised far from the first leads to the first one's far mouth.

The change is in `travel()`. A stored `portalReturn[to]` is used only when it lies within 24 blocks, across the ground, of the column the player stepped from. Otherwise the player arrives as on a first crossing (`arriving = to`) and `land()` finds or builds the far mouth for that column. Coming back, the same test sends the player to the near gate when one stands within 24 blocks of the matching column, and otherwise to footing at that column, where no gate is built (section 9 already says so). `portalReturn` stays, as a hint for the gate a player last used.

A test: two bots cross at gate A and stand within 3 blocks of each other. One returns, walks 300 strides, raises gate B and crosses: it stands within 24 blocks of B's column and not at A's far mouth. It steps back through that far mouth and stands at B.

**A great feeder stays.** `ARCHITECTURE.md` 7.9 already does what 1.6 asks. The fight has participants. A valid target is a participant who is active, alive and within 80 blocks of the stone. The animal holds still when it has none, waits for one whose connection dropped, and withdraws after 10 seconds with no target and nobody to wait for. The leash on one player in this worktree (`src/sim/boss.ts:69-74`) is the solo code that 7.9 replaces. Nothing is added here.

## D. The codex and the bestiary

### D.1 What it is

One for the server. It is what the crew knows (7.7): what one of them learned is told to the rest, and an arrival who comes up late is told all of it. It holds two lists. The bestiary has an entry for every creature and for each of the eight. The codex has an entry for places, countries, sites, matter, peoples, old things and the workings of the ground.

Nobody in it states the firm history (rule 18). Every step has a speaker, and the window names the speaker over the step:

| Step | Speaker | Voice (H) | It says |
| --- | --- | --- | --- |
| `beast.sight` for a kind householders watch from a hearth | a householder | `born` | What it looks like and when it is about |
| `beast.sight` for the other kinds; `eight.sight` | the crew | `note` | The same, by someone who stood in front of it |
| `beast.kill`, `eight.kill` | the crew | `note` | What was inside it when it was opened over a pot |
| `beast.habit`, `eight.habit` | the crew | `note` | What the kind does as a rule |
| `beast.once`, `eight.once` | the crew | `note` | One thing seen once, with where it was seen |
| `eight.loss` | the crew | `note` | What changed on the ground after the first kill, as the crew saw it. This is the only place the cost of a kill is told; the Guide is silent on it (1.6) |
| `eight.said`, `codex.born` | a householder | `born` | What householders say of it. A belief is given as their saying and never as a fact |
| `codex.sand` | the Deserter | `sand` | What his people say of it, as far as he tells it |
| `codex.seen` | the crew | `note` | What is there, or what the thing is in the hand |
| `codex.read` | the crew | `note` | What a crew can work out from it, said as a guess. It reaches only what the evidence in D.4 supports |

Where the stonework, the householders and the sand-country people disagree (2.8), the subject has all three steps and they stand side by side.

### D.2 The data

- A step is a shared flag: `cx:<subject>.<step>`. A bestiary subject is the creature key (`cx:gelcap.kill`). Other subjects are `<kind>:<key>` (`cx:site:ruin.born`). Flags are in the world's saved state, are sent in `welcome`, and are sent to everyone when one is added (`ARCHITECTURE.md` 3.3, 7.6). Nothing new goes on the wire.
- Counts of kills are one new field of the shared state, `kills`, from creature key to a number. It is saved with the world and is not sent: only the flag that a count opens is.
- A late joiner receives every flag on joining and opens the codex filled as far as the others have got. That is 7.7's rule.
- When a step opens, everyone gets the toast `toast:codex_new` with the subject's name.
- A step that has not opened shows `win:codex.closed` under its heading. A subject with no open step is not listed.
- The window is a third page beside the inventory and the Guide. Its title is a name from `names.json` (section I).

### D.3 The bestiary: what opens each step

The same four events for every creature, and five for the eight.

| Step | Opens when |
| --- | --- |
| `sight` | A creature of the kind is within 16 strides of an active player and no opaque block lies between. For what forms on a totem: the first time one forms |
| `kill` | One of the kind dies of harm a player did. For what forms on a totem: the first time one of that look kills a feeder |
| `habit` | The shared count of kills reaches 12 for a kind that comes in packs or attacks (`gloomshade`, `thornling`, `gelcap`, `cave_skitter`, `stonegnawer`, `sporeling`, `moonspawn`, `ashen_raider`), 3 for the two that come only beside the eight, 6 for every other. For a totem animal, 10 kills made by that look |
| `once` | The event in the table below |
| `eight.sight` | The animal comes up at its stone |
| `eight.kill` | `boss:<n>` is set |
| `eight.loss` | `boss:1`: the first `raid` starts. `boss:2`: the first `ashen` starts. `boss:3`: the first dawn after the first `moon`. The other five: eight nights after the kill |
| `eight.habit` | The third kill of that kind |
| `eight.once` | See below the table |
| `eight.said` | `boss:<n>` is set and `wayfinder` is housed |

The table gives, for each creature, whether the habit of chapter 7 is in play after step 4, and the event and the fact for `once`. Where the habit is not in play, `beast.habit` says what the kind does in play today, given in the same cell. Rules marked *added* are one condition each in `src/sim/mobs.ts` and are part of step 4.

| Key | Habit in play after step 4 | `once`: the event, and the fact it shows |
| --- | --- | --- |
| `woolback` | No. Write: herds of two to four on grass by day; struck, it runs; gone at dusk | One is alive within 20 strides of a `village` well. They graze up to the doors of the old houses (3.2 `plains`) |
| `gobblet` | No. Write: out by day in woods and wet country; struck, it runs | `craft:arrow` is set. Its feathers fletch arrows (7.2) |
| `burrowhog` | No. Write: cold woods, crags and snow by day; gone at dusk | One is alive on `snow` or `snowy_grass` in `tundra` or `peaks`. By day it is the only thing out on the snow (3.2) |
| `dune_skipper` | No. Write: sand and dry grass by day; fast | One is seen in `desert` while `boss:2` is unset. Nothing hostile shared the sand with it by day (7.2, 4.4) |
| `glimmerfin` | Yes: the shoal keeps together | A player is in water with a hostile creature within 10 strides that has the player as its target. It stopped at the water (3.1) |
| `gloomshade` | No (step 5: it goes first for the one carrying most lees). Write: everywhere at night and in caves at any time; it walks into lamplight; the sun undoes it | One that came from a `brood_nest` is undone by the sun within 32 strides of a player. A nest puts them out by day and each comes apart at the wall (7.9) |
| `thornling` | Yes, *added*: by day it does not move until a body is within 14 strides | One dies during `raid`. Since the first great kill its packs go for stores at dusk (4.3) |
| `gelcap` | Yes, *added*: when it first moves, a `tall_grass` on its cell is set to air | `had:idol` is set. Its jelly went into the first bait (4.3) |
| `bog_lurker` | Yes, *added*: idle on `mud` it is drawn sunk to the head | A `bog_pearl` is picked up. A lump of lees set in mud, which it swallowed (3.2 `swamp`) |
| `frost_stalker` | No. Write: cold country at night, in ones to threes; it sees a body from 24 strides | One is alive by day within 24 strides of a player. The sun does it no harm (7.3) |
| `cinder_wisp` | No. Write: it hangs in the air and throws embers from ten strides | One is within 8 strides of `lava` with a player within 20. The same kind is on the sand at night and beside the molten rock at any time (3.3) |
| `stonegnawer` | No. Write: the commonest thing under the ground, from just over the floor to just under the turf | One dies within 12 strides of a `brood_nest` in a `dungeon`. It has been at the dressed stone (7.3) |
| `cave_skitter` | No. Write: small, fast, in packs of two to four | One dies standing on `mycel` on the living ground. It is bodied in fibre and in the thread fungus puts through rock (7.3) |
| `crag_bat` | No. Write: caves at any time, and the air over the high rock at night | One dies under open sky at night in `crags` or `peaks`. The animal of the caves and of the high air is one animal (7.3) |
| `rustbound` | Yes, *added*: one that came from a nest does not go more than 10 strides from it | A `barbed_arrow` or an `iron_bar` it dropped is picked up. It ate the stored harness and arrows (7.3) |
| `sporeling` | Yes, *added*: when one is struck, every `sporeling` within 16 strides takes the striker as its target | A `glowshroom` it dropped is picked up. What lies on the ground is the cap it had formed in (7.1) |
| `mycelid_knight` | No. Write: two strides tall, slow, hard to knock back | One dies within 12 strides of the nest in a `cache1`. It breeds where the lees was (7.3) |
| `umbral_moth` | Yes: it flies and does not land | `had:kite` is set. Its dust went up on the kite (4.7) |
| `glowmaw` | No. Write: a fast runner, lit along the back | A `noctrium_ore` it dropped is picked up |
| `rift_ray` | No. Write: in the air over the islands; it stoops | One is within 16 strides of a player and 6 or more pieces lower. It rides under a rim (7.3) |
| `shardling` | Yes, *added*: it does not move until it has a target | A `prismite_ore` it dropped is picked up. The crystal kinds carry bits of the ore they feed on (6.2) |
| `aether_wisp` | No. Write: a bright crystal in the air; it throws from twelve strides | A `rift_scale` it dropped is picked up. It had been at a dead ray (7.3) |
| `moonspawn` | Yes: it does not go down before dawn, and the sun undoes it | One is undone by the sun within 32 strides of a player (7.3) |
| `lunar_howler` | No. Write: in the air on the dark night only; the fastest thing there is | One is undone by the sun (C, row 10) |
| `sproutling` | Yes: it goes when its strongest goes | `boss:1`'s animal withdraws while one is up |
| `dune_mite` | No. Write: it comes off the burrower when the burrower thrashes | `boss:2`'s animal withdraws while one is up |
| `ashen_raider` | No. Write: a fighter with a blade | One dies during `raid`. A few follow the dusk packs in (7.4) |
| `ashen_hexer` | Yes: he stands off and throws from 13 strides | A `mana_crystal` he dropped is picked up. It was taken from a store on the way, for the fire (7.4) |
| `siege_brute` | No. Write: the biggest of them, slow, hard to knock back | One comes up after half of a march's count is met. He comes late (7.4) |
| the nine on a totem | No. Write: it stays by the hand that carries its food and goes for feeders | The bearer falls while one of that look is out. It is gone when the bearer goes down (7.5) |

`eight.once`, one event each: `b_colossus`, it charges a player who stands behind one of the six oaks; `b_maw`, a `dune_mite` is on the floor before the animal comes up; `b_warden`, it is killed while `gloomshade` it drew are still up; `b_sporemother`, a `sporeling` forms where a piece of cap landed; `b_regent`, the bait is laid within sight of a player holding a `storm_plume`; `b_luminarch`, a `shardling` forms on the floor at the last change; `b_hart`, it goes back down at dawn (C, row 11); `b_sovereign`, a player stands on the base after the kill.

Bestiary entries for the three fighters are entries about people. They say what was seen and what a fallen fighter carried. They never count anyone (rule 12).

### D.4 The codex: subjects, steps, and what opens each

The keys are the constants `CODEX`, `SITES_BUILT`, `SITES_NEW` and `MATERIAL_BORN` in `surfaces.mjs`, and the countries and hardnesses read from the source.

**Steps open the same way for every subject.**

- `seen`: the event in the table.
- `read`: `seen` is open and the evidence in the table has been met.
- `born`: `seen` is open and the householder named in the table is housed (`npc:<key>`). With none named, any householder.
- `sand`: `seen` is open and `npc:deserter` is set.

| Subject | Steps | `seen` opens when | Evidence for `read`; who gives `born` |
| --- | --- | --- | --- |
| `place:0` the living ground | seen, read, born | The first join | A block is set in the air and stays; Desik |
| `place:1` the hollow | seen, read, born | `dim:1` | A player digs to `bedrock` in the hollow; any householder (they say Under, 3.6) |
| `place:2` the islands | seen, read | `dim:2` | A player is put back on the last footing after a fall. No householder has a word for the place |
| `country:<key>`, all eighteen | seen, read | A player stands in the country for 10 seconds; `country.enter` shows then | The country's trace of A has been seen, or, where it has none: `forest` and `palewood`, a `village` under trees; `swamp`, a `bog_pearl`; `taiga`, a `village` of pine; `ocean`, a `crossing`; `hollows_crystal`, `crystal_violet` mined; `rift`, `skyfruit` in hand; `bloomvale`, `dim:2` |
| `site:village` | seen, read, born | Within 12 strides of the well | A `bedroll` found in a house; Desik |
| `site:ruin` | seen, read, born, sand | Within 12 strides | Its chest is opened; Desik |
| `site:dungeon` | seen, read, born, sand | A player stands inside one | A made bait or a `recall_stone` comes out of its chest; Kammār |
| `site:cache1`, `site:cache2` | seen, read | Within 8 strides | Its chest is opened |
| `site:arena1`, `site:arena2`, `site:arena8` | seen, read, born, sand | Within 16 strides of the stone | The stone's first kill; Desik |
| `site:arena3` to `site:arena6` | seen, read | Within 16 strides of the stone | The stone's first kill |
| `site:arena7` | seen, read, born | Within 16 strides of the stone | The stone's first kill; Desik |
| `site:burned_hearths` | seen, born, sand | Inside a burned house | Desik. It has no `read`: nothing in the houses settles it (2.8) |
| `site:fire_ring` | seen, read, born, sand | Within 16 strides of the fire | An `ash_token` is broken out of the floor; Vāhak |
| `site:hearth` | seen, read, born | A player breaks or stands on a hearthstone | A `ward_core` is found; Rehakār |
| the other sites of A | seen, read | Within 12 strides | The found thing is taken, or, where there is none, the site is seen a second time in another place |
| `material:<key>`, the ten hardnesses | seen, read; born for `lumenite`, `cinder`, `umbrite` | A piece of it is first in a player's pack | A pick of it first breaks the next rock; Kammār, and for `lumenite` Rehakār |
| `matter:gold` | seen, read | `gold_bar` in a pack | `boss:2` |
| `matter:lees` | seen, read, born, sand | The first coin paid at a kill | An animal is killed and pays none; Vāhak |
| `matter:crystal` | seen, read, born, sand | `mana_crystal` in a pack | A `pot_crystal` is found, or standing crystal is mined; Rehakār |
| `matter:salt` | seen, read | A clean `pan` is seen | A `brood_nest` is broken |
| `matter:remains` | seen, read, born, sand | Any raw remains in a pack | A totem is first used; Posak |
| `matter:great_remains` | seen, read, born, sand | `boss:1` | A forge of remains is first lit; Vejja |
| `people:householders` | seen, read, sand | `npc:wayfinder` | Two householders are housed |
| `people:sand` | seen, read, born | The first `ashen` or the first `fire_ring` | An `ash_token` is in a pack; Desik |
| `people:peopls` | read, born, sand | (it has no `seen`) | `read`: a second player joins, or the first fall; any householder |
| `old:cutter_saw`, `old:ward_core`, `old:pot_crystal` | seen, read | The thing is in a pack | For the saw, a tree is felled with it. For the core, it is set down within 3 strides of `bedrock`. For the jar, it is broken into crystal |
| `old:made_bait` | seen, read, born, sand | A bait is taken from an old chest | A second kind of bait is found; Desik |
| `old:old_bed` | seen, read, born | A `bedroll` is taken from an old house or its chest | A player rests on one; any householder |
| `old:recall_stone` | seen, read, born | A `recall_stone` is in a pack | It is used; Rehakār |
| `old:token` | seen, read, sand | An `ash_token` is in a pack | One is spent with the Deserter |
| `ground:floor` | seen, read | A player's pick stops on `bedrock` | A `ward_core` or the bottom of a `shaft` has been seen |
| `ground:set` | seen, read | A block is set with nothing under it | A tree is cut at the foot and the rest hangs |
| `ground:way` | seen, read, born, sand | The first fall | A `recall_stone` is used; any householder |
| `ground:light` | seen, read | The first `torch` is set | A hostile creature walks into block light near a player |
| `ground:moon` | seen, read, born | The first night | The first `moon` ends; Desik |
| `ground:ward` | seen, read, born, sand | `npc:wayfinder` | A `raid` starts with a townsperson housed; the householder housed first |
| `ground:hosts` | seen, read, born, sand | `boss:1` | The second first kill; Desik |
| `ground:mouth` | seen, read, born | A second player joins, or the first fall with no bed | A player digs to `bedrock` within 16 strides of the spawn; any householder |

### D.5 Headings

A subject's heading is a name from `names.json`: the creature, the item, the block, the country, the place, the people, the kind of structure. The subjects that have no name there are listed in section I.

## E. The journal

### E.1 What it is

The journal is the Guide: the order of work. It keeps every key of `src/data/quests.ts`, the order of the keys, and the test that completes each one. Nothing is added to the chain and nothing is taken out. What changes is the text and how it is laid out.

**Chapters.** Seven, with the names `names.json` gives for `chapter:1` to `chapter:7`: Empty Hands, Iron and Root, The Deep Stone, Under the World, Above the World, The Dark Night, After the Last. This is 8.11's ruling, and the naming pass has already put it in the source. The numeral and the name are joined in code with a full stop and a space, since the font has no middle dot.

**Three lines to a task.**

- `task.title`. What to do, as an order of a few words. Voice `label`.
- `task.how`. How it is done and what completes it: what goes into the making, where, with which tool. Voice `label`. Advice for a fight goes here and says what the animal does, in plain words.
- `task.said`, from `house` on. The householders' telling of the task: what to do next, where, and what it opens. Voice `born`. It never says what a killing lets loose, because the telling has no line for it (2.3). It is where the born's verbs for the baits are used (wake, ring, burn, wear, open), since it is a born mouth (4.2). It shows only while a householder is housed. Desik says it when trade opens (`folk.extra:wayfinder.next`).

The tasks before `house` are the cutter's own trade and have no telling (1.6 The Guide).

**For a crew and for one player.** `ARCHITECTURE.md` 7.6 already rules it. There is one index for the server. A task is met when its flag is set, or when any one online player holds what it asks. What players hold is never added together. Everyone online gets the toast and the experience. A player alone is a crew of one.

**What step 5 adds.** The tasks householders ask of a crew (5.5: stock an old house, clear a nest, bring raw ore) open with standing. The journal has a second list for them, empty in step 4.

### E.2 The tasks

"Done when" is the test in the source, unchanged. "The telling says it opens" is the matter for `task.said`, from 8.1 and 6.5.

| Key | Chapter | Asks | Done when | The telling says it opens |
| --- | --- | --- | --- | --- |
| `wood` | 1 | Four logs | A player holds 4 of any log | (no telling) |
| `bench` | 1 | A workbench | `craft:workbench` | |
| `woodpick` | 1 | A wooden pick | `craft:wood_pickaxe` | |
| `stonepick` | 1 | A stone pick | `craft:stone_pickaxe` | |
| `torch` | 1 | A torch | `craft:torch` | |
| `furnace` | 1 | A furnace of rubble | `craft:furnace` | |
| `iron` | 2 | Three iron bars | A player holds 3 `iron_bar` | |
| `anvil` | 2 | An anvil | `craft:anvil` | |
| `ironpick` | 2 | An iron pick | `craft:iron_pickaxe` | |
| `house` | 2 | A closed, lit room with a door and a holder's bed | `npc:wayfinder` | A householder under the roof, and a held hearth |
| `idol` | 2 | The first bait | A player holds `verdant_idol` | The animal at the nearest stone will come to it |
| `boss1` | 2 | Kill the strongest of the woodland host | `boss:1` | The joining bench. Kāru and Vejja come |
| `tinker` | 3 | A joining bench | `craft:tinker_bench` | Two worked pieces made one |
| `lumenite` | 3 | Three of the gem of the deep rock | A player holds 3 `lumenite` | An edge that takes the next rock |
| `lumpick` | 3 | A pick of it | `craft:lumenite_pickaxe` | The warm ore and the black glass |
| `lure` | 3 | The second bait | A player holds `sunken_lure` | The burrower will come to it |
| `boss2` | 3 | Kill the burrower | `boss:2` | A furnace that loosens what fire leaves hard. Kammār has more to sell |
| `emberforge` | 3 | The first furnace of remains | `craft:emberforge` | The warm ore, and later the metal of Under |
| `cinder` | 3 | Five bars of the warm metal | A player holds 5 `cinder_bar` | A pick that takes the ore of Under |
| `bell` | 3 | The third bait | A player holds `warden_bell` | The strongest of the shade-kind will come to it |
| `boss3` | 3 | Kill the strongest of the shade-kind | `boss:3` | The way Under. Posak comes, and Vejja has more to sell |
| `gate1` | 4 | A gate kit | `craft:hollow_gate_kit` | A gate wherever its frame will stand |
| `dim1` | 4 | Cross | `dim:1` | The metals of Under |
| `umbrite` | 4 | Five bars | A player holds 5 `umbrite_bar` | A pick for the lower metal |
| `censer` | 4 | The fourth bait | A player holds `spore_censer` | The animal that hangs from the roof Under will come to the smoke |
| `boss4` | 4 | Kill the strongest of the hollow | `boss:4` | A furnace for the lower metal. Kammār sells the upper |
| `voidkiln` | 4 | The second furnace of remains | `craft:voidkiln` | The lower metal, and later the metal beyond the second gate |
| `noctrium` | 4 | Five bars | A player holds 5 `noctrium_bar` | The frame of the second gate |
| `kite` | 5 | The fifth bait | A player holds `storm_kite` | The flier will come to it |
| `boss5` | 5 | Kill the flier | `boss:5` | The second gate |
| `gate2` | 5 | The second gate kit | `craft:rift_gate_kit` | A gate (the telling has no word for where it leads, 3.6) |
| `dim2` | 5 | Cross | `dim:2` | Harder metal than any below |
| `aether` | 5 | Five bars | A player holds 5 `aether_bar` | A pick for the metal with crystal in it |
| `lens` | 5 | The sixth bait | A player holds `prism_lens` | The strongest of the crystal kinds will come to it |
| `boss6` | 5 | Kill the strongest of the crystal kinds | `boss:6` | A furnace for that metal |
| `crucible` | 6 | The third furnace of remains | `craft:prism_crucible` | The metal with crystal in it |
| `prism` | 6 | Five bars | A player holds 5 `prism_bar` | A pick that takes the ore on the floor |
| `slivers` | 6 | Three slivers | A player holds 3 `moon_sliver` | The seventh bait needs them |
| `mask` | 6 | The seventh bait | A player holds `eclipse_mask` | The strongest of the deep kind will come to it, at night |
| `boss7` | 6 | Kill the strongest of the deep kind | `boss:7` | A furnace for the last metal |
| `eclforge` | 6 | The fourth furnace of remains | `craft:eclipse_forge` | The metal that lies on the floor |
| `eclipse` | 6 | Three bars | A player holds 3 `eclipse_bar` | The last bait |
| `key` | 6 | The last bait | A player holds `cairn_key` | What lies in the cairn will come to it |
| `boss8` | 6 | Kill what lies in the base of the eighth stone | `boss:8` | Nothing in the telling. Desik's own line is that the stones can be lit again |
| `end` | 7 | Nothing | Never | `task.how` says what a crew holds now: the strongest kill there is, and nothing in the telling to spend it on. `task.said` is Desik's: a stone is lit while a holder sits at it, and none has. No line says a stone is lit |

The words in this table are for writers and are not the text. The text names each animal by its name in `names.json`.

## F. The two changes of the world

### F.1 The turn in the middle: `boss:3`

Before it, a dark night is a night like another. After it, the deep kind is on the ground on every eighth night, a gate can be raised, and the crew begins to pay for being away (8.6).

| Where | What a player sees | Built by |
| --- | --- | --- |
| The sky | The moon's face now agrees with the night: wholly dark on the night of `moon`, whole four nights before. From the kill on, the face tells a crew how many nights are left (7.6) | step 4 (C, row 1) |
| The sky | On the dark night the sky takes the colour of the deep kind | in play |
| The ground | `moonspawn` on the ground and `lunar_howler` in the air on every dark night, about twenty hostile things near a person where there were fourteen. At dawn the sun undoes every one still up, the fliers too | in play; the fliers by step 4 (C, row 10) |
| The ground | No `raid` falls on the dark night | in play |
| The ground | The first gate, wherever the crew raises it. A bed marks nothing on the far side | in play |
| The villages | The householder at the well is indoors on the dark night and says so (`walker.say:dark`) | step 4 (C, row 18) |
| The crew's houses | Posak moves in. Every townsperson has a line for the first trade after the kill (`folk.stage:<who>.3`) and lines for the dark night (`folk.dark`). In their mouths the peopls broke a seal (4.11). No banner says it | step 4, text |
| The text | The banner for the night says the moon is dark, which is what is seen. The born's belief that it is hollow is in `codex.born` of `ground:moon` and in Desik's lines | step 4, text |
| The text | `eight.loss:b_warden` opens at the first dawn after the first dark night: what the crew saw, in its own words | step 4 (D) |
| The journal | Under the World begins | in play |

*What step 5 builds on it.* A gate is great remains with no hand on them and draws (3.4). Far kinds come up near a gate once their strongest is dead (`boss:4`, `boss:5`, `boss:6`). `raid` falls on the dark night once `boss:7` is set. Spore in a wound is the cost of staying below. Each uses flags and places step 4 leaves as they are: `shared.gates` already holds every gate.

### F.2 The end of the Guide: `boss:8`

| Where | What a player sees | Built by |
| --- | --- | --- |
| The ground | Every hostile creature hardens by the last step | in play |
| The ground | The base of every `arena8` stands broken. `cairn_base` and `altar8` each have a second look, with dark gaps in it. The client holds the flags, so it draws the second look from the moment `boss:8` is set, at every stone of the kind, for everyone, with no chunk made again. A crew that breaks into the base finds the gaps B puts under it | step 4 |
| The ground | `stonegnawer` comes up at night on the surface and comes with `raid` | step 4 (C, row 19) |
| The sky | Nothing changes. The moon keeps its round | |
| The crew's houses | Every townsperson has a line for the first trade after the kill (`folk.stage:<who>.8`). In their mouths the peopls opened the cairn (4.11). Desik says the stones can be lit again, and by lit he means held | step 4, text |
| The text | The banner is the animal's name and that it has fallen, with nothing under it. No text says a stone is lit (4.10) | in play; text by step 4 |
| The text | `eight.loss:b_sovereign` opens eight nights after: what the nights are now | step 4 (D) |
| The journal | After the Last: one task that is never met, saying what the crew holds | step 4, text |

*What step 5 builds on it.* A great stone charged with `cairn_heart` and held by a householder for one night (4.10). A pack at every dusk on which no great stone is held. The householder who will sit at a great stone, which is the last thing standing with them opens (5.6). The sealed jar of 6.11. The journal's second list. Step 4 leaves `cairn_heart` with nothing made from it and `end` never met, which is the state those start from.

## G. Found texts

**There is no writing on this ground.** The bible is strict about it, and this plan follows it.

- No stone carries words. The lines cut in a housing, a hearthstone and a recall stone are there to be driven (2.3, languages L.10).
- Nobody numbers the rounds of the moon, and nothing is reckoned in years (2.1). There is nothing to date and nobody who dates it.
- The Guide passes by word of mouth (1.6). The patterns for baits, gates and forges are carried by the born and taught (2.3). Householders carry word between hearths by walking (5.2).
- No office words, and nothing counted (rules 10 and 12).

So no book, letter, sign, map, list or cut inscription is placed, and no surface in `_surfaces.json` is a piece of writing found in the world. Builders must not add one.

**What is found is a thing, and its description is the text.** A description is an arrival's working note (H). It says what the thing is made of and what was done with it. It does not say who made it or what became of them: the reader draws that. Each of these has to read true both of one made this morning and of one taken from an old chest.

| Key | Where it lies | What finding it is for | Entry |
| --- | --- | --- | --- |
| `verdant_idol` | The chest of a `ruin` | A bait made ahead and never laid, in a store of the born hunters (2.4) | `item.desc`, `codex.*:old:made_bait` |
| `warden_bell` | The chest of a `dungeon` | The same, under the rock, with gear and a stone for the way beside it (2.7) | `item.desc` |
| `spore_censer` | The chest of a `cache1` | The first comers crossed to the hollow to bait (2.3) | `item.desc` |
| `prism_lens` | The chest of a `cache2` | The same on the islands | `item.desc` |
| `recall_stone` | The chest of a `dungeon`; Desik and Rehakār sell it | A stone that serves only a person with a way, in a store the born say their forebears made (2.8) | `item.desc`, `codex.*:old:recall_stone` |
| `bedroll` | A house of a `village`, its chest, a `tree_floor`, the foot of a `column` | A bed of the kind only an arrival uses, in every old house (1.5) | `block.desc`, `codex.*:old:old_bed` |
| `skyfruit` | The chest of a `cache2`; under a `lone_tree` | Fruit of a place where the hour stands (6.9) | `item.desc` |
| `cloud_bottle`, `feather_charm`, `gale_emblem` | Chests of `ruin`, `dungeon`, `cache2` | The pale stuff of the islands, in stores on the living ground (6.7) | `item.desc` |
| `ash_token` | A beaten march; the floor of a `fire_ring` | A piece of the floor under a fire (5.3) | `item.desc`, `codex.*:old:token` |
| `cutter_saw` | The bottom of a `shaft` | What the first comers came for, and what the floor is (6.11) | `gear.desc`, `codex.*:old:cutter_saw` |
| `ward_core` | Under a hearthstone, one house in eight | The builders came from where a ward needs a core (6.11) | `block.desc`, `codex.*:old:ward_core` |
| `pot_crystal` | The chest of a `dungeon` or a `ruin` | What crystal is (6.11) | `item.desc`, `codex.*:old:pot_crystal` |
| `rough_block` | The foot of a `quarry` | Stone was cut here for housings, and the cutting stopped (3.2) | `block.desc` |
| `salt_crust` | A clean `pan` | Where the salt for every charge comes from (6.3) | `block.desc` |

**What is found and cannot be carried has one line and a codex entry.** These are the sites of A and the old structures: `site.sight:<key>`, voice `sight`, saying what is in front of the player, and `codex.seen` and `codex.read`.

**Cut lines are for the texture pass.** The top of each great stone has a hollow worn for a hand and lines running down from it. A hearthstone has lines. Step 7 draws them. They are not letters and nothing reads them.

## H. Voices

Every sentence the game shows is in one of five voices. `_surfaces.json` gives the voice of every entry, and `textlint.mjs` holds each voice to its bans.

All five share the rules of the bible's README. Short declarative sentences. A fact where a fact will do. Nothing that tells the reader how to feel. No quip, no saying, no closing line that states a moral, no sentence that sets one thing up to knock it down. No office word, no temple word, no keeper. Nothing counted among the dead. No exclamation mark.

### H.1 `label`: the game's own plain label

**Where.** Buttons, window titles, tooltip lines made from numbers, prompts, toasts about the pack and the controls, menus, errors, `task.title` and `task.how`.

**How it writes.** It names a control, a number or a rule of play, in the fewest plain words. It may address the player as "you" only where a control needs it. It uses the fixed words below and the names in `names.json`. It has no opinion and no past.

**Fixed words.** The blue bar is the *arm*: "Uses 7 arm", "+20 arm", "The arm is spent". What forms on a totem is a *small feeder*: "+1 small feeder". The four ways of fighting are Melee, Ranged, Crystal-work and Totem. Lees weighed out is *coins*. A bait is *laid*. A fall is a *fall*, and the player *rises*.

**It may never say.** Mana, spell, magic, summon, minion. Offering, warden, sovereign, forebear or peopl, which are words of people on the ground. Anything about what a thing was or who made it.

Five lines:
1. "Lay it on a Vanahar Altar."
2. "Uses {n} arm."
3. "The room needs a door."
4. "Seven iron bars, at the workbench."
5. "Needs an Antar pick or better."

Five rejected:
1. "Not enough mana." The bar is the arm and nothing is stored in it (8.11).
2. "Offer the bell and something will answer." Offering is the born's word, and the line is coy about what happens (4.2, rule 17).
3. "Everything you have. Everything you are." A flourish in place of the how (rule 16).
4. "Summons a minion that fights for you." Nothing is summoned: a small feeder forms on the food (6.6).
5. "Lava does not negotiate." A quip at a fall (8.11).

### H.2 `sight`: what a person standing there sees

**Where.** Banners for the three attacks, the lines when one of the eight comes up and changes, the lines at a fall, crossing lines, `country.enter`, `site.sight`.

**How it writes.** Present tense. What is in front of a person and nothing behind it. A fall line says what failed the body. It names animals by their names and people by what they are. It gives no cause, no belief and no advice.

**It may never say.** That the ground, the sky, a stone or a great feeder wants, waits, watches, remembers, guards or speaks. That a stone is lit. A belief of the born as a fact: a host, an invasion, a seal, a hollow moon. That an arrival died. The words of the interface.

Five lines:
1. "The sand in the bowl begins to move."
2. "A march from the sand country"
3. "The moon is dark tonight"
4. "The drop was longer than the body could take."
5. "Single dressed stones run out from the shore and stop."

Five rejected:
1. "The Hollow Moon rises." It states the born's belief as a fact (8.11).
2. "The ground remembers how to stand up." The ground does nothing (4.13).
3. "You did not get back up." It writes an arrival's death (rule 20).
4. "The first light is yours." No kill lights a stone, and first light is the hour a holder lifts the hand (4.10).
5. "Strange things walk tonight." It tells the reader how to feel and says nothing seen (rule 16).

### H.3 `note`: an arrival's working note

**Where.** Descriptions of items, blocks, modifiers and grades. The bestiary steps a crew fills. `codex.seen` and `codex.read`. What moves a townsperson in.

**Who.** One of the crew, telling the rest: a cutter who grew up beside wards and knows lees, feeders, charges and dead wood from home, and knows nothing of this ground but what was seen and what householders said.

**How it writes.** What the thing is made of, where it was, what it does, what was inside it. Things first, in the order a hand meets them. It may say "we" of the crew. It gives a householder's saying as a saying: "The born say". In `codex.read` it reasons from what was found and marks the step as a guess: "so it seems", "which would mean". It may be wrong where arrivals are wrong (1.8): it takes the floor for stone until a core or a shaft says otherwise, and it puts the islands overhead.

**It may never say.** "You". The firm history: that the builders were arrivals, that the way failed, that the hosts were whole. Those are in no mouth (2.7), and a note reaches at most the evidence. An arrival's death. A number that is the game's. A word of the wider cosmos.

Five lines:
1. "Old lees, set hard. The head of every staff."
2. "A tooth. The one part of the animal harder than its plates."
3. "Opened over the pot, it had no bone anywhere in it."
4. "Black, cold, and heavier than stone many times its size. No tool marks it."
5. "The same beds lie in every old house, and no born person has a use for one. So the people who built these houses had a way, as we have."

Five rejected:
1. "Returns you to your bed. Reusable." It addresses a reader and speaks as the game (H.1 holds the label).
2. "A little carved thing that something answers to." The carving does nothing: the remains on it are food (8.11).
3. "The first comers were arrivals like us, and their way failed." Nobody on the ground knows it (2.7).
4. "A coal from the last eclipse. It has not gone out." A tie to the moon, which is the born's belief, in an arrival's mouth (4.13).
5. "Splits light, heat and ore alike." A triple for the sound of it. The remains loosen ore (rule 2, 4.8).

### H.4 `born`: a householder speaking

**Where.** Seven townsfolk in every situation, the householder on the road, `task.said`, `eight.said`, `codex.born`, and `beast.sight` for the kinds a householder has watched from a hearth.

**Who.** A born person trained to hold, with a trade for the daylight. They want lees in the pot by dusk.

**How it writes.** Plainly, and to get something done: what to do next, where, what it opens. Never what it costs (5.2). They say peopl to the face. They say lit and mean held, and first light for the hour a holder lifts the hand. They say altar and offering, forebears, Under for the hollow. They say what they have seen from a hearth and what "they said" on the road. Each speaks from a trade (5.5): Kammār of metal by trial, Rehakār of cut lines, Posak of what is on the bone. A belief of theirs may be said flat, because it is theirs: the forebears set each great one over its country; the moon is hollow that night; a peopl was never born anywhere.

**It may never say.** The firm history. A saying or a proverb. A greeting or a custom. A word for the islands, a ward core, a world other than this ground, or a pathfinder: they have none. Anything about the game. A count of the dead. That a peopl died.

Five lines:
1. "Put it on the table, away from the pot."
2. "The moon is dark in three nights, peopl. Be under a roof or where you mean to fight."
3. "I can work a bar of that metal and I cannot make one."
4. "They said every stone on this road was lit once."
5. "Two pots this close bring them at dusk. I told the others so before I sat down here."

Five rejected:
1. "A salve now is worth ten after." A saying (5.5).
2. "Things follow you if you ask correctly." Asking does nothing (rule 7).
3. "Mana is only light that has not decided what to be yet." Stored power, and a line made to sound deep (8.11, rule 2).
4. "Welcome, traveller. May your hearth be warm." A greeting and a custom, and no householder calls a peopl traveller (rule 6, 5.2).
5. "Our forebears were peopls like you." No householder says it. The telling is the other way (1.5).

### H.5 `sand`: a sand-country person speaking

**Where.** The Deserter in every situation, the people at a fire, fighters on a march, `codex.sand`.

**Who.** A born person of the sand. Their forebears gave up the pot. They hold a fire, burn every kill, and class peopls with what a store draws (5.3).

**How it writes.** Short. About what draws and what is burned: the fire, the light, fuel, the sand, the burrower, the stones, what a march goes for. They say peopl and mean the kind that did this to the country. They say stones, never altars. The people at a fire say little to a peopl and tell nothing they know. The Deserter says more, because he sits beside a pot now, and he says it of his people as "we" and of the fires as "ours". He is right about some things householders are wrong about, and wrong about others (2.7).

**It may never say.** Altar, offering, warden, sovereign. Anything in favour of a pot, except from the Deserter, and from him only as what he does. The firm history. A threat for its own sake: a march goes for stores, since there is no use in killing a thing that gets up. A count of the dead, their own included.

Five lines:
1. "I marched with them and I will not again."
2. "While the burrower lived nothing else came up on the sand."
3. "Nothing of ours draws. Go back to your stores."
4. "A night inside the light, at any fire of ours. That is all it buys."
5. "The fire wants wood. Leave it at the edge and go."

Five rejected:
1. "Leave the altar unbaited." Altar is the hearths' word. He says the sand stones (5.5).
2. "You will pay in blood for what you boiled." A threat for mood. The grievance is one plain line, said once (4.4).
3. "Ash to ash." A saying, and a ceremony of words (rule 6, rule 7).
4. "We lost forty at the last store." The dead are never counted (rule 12).
5. "The burrower was our god." A temple word, and false: it was the price of their country (5.3, rule 11).

## I. What `names.json` has to gain

Every name shown comes from `names.json`. This plan adds things with no name there. Each needs an entry before its text ships. The names below are plain English proposals: none of these things was named by a people on the ground for a reason the bible gives, except where noted.

| Key | Proposed | For |
| --- | --- | --- |
| block `salt_crust` | Salt Crust | A.2 |
| block `snow_prints` | Prints | A.2 |
| block `ash_glass` | Ash Glass | A.2. The sand-country people would have a word for it; the bible gives none |
| block `great_fire` | Fire | A.2 |
| block `charred_planks` | Charred Planks | A.2 |
| block `rough_block` | Half-dressed Stone | A.2 |
| block `cairn_base` | Dressed Stone | A.2: the name `wardstone` has |
| item `cutter_saw`, block `ward_core`, item `pot_crystal` | Steel Saw, Ward Core, Crystal Jar | Already in `names.json` as `find:cutter_saw`, `find:hearth_core`, `find:pot_crystal`, marked not shown. They are now shown |
| creature `n_walker` | Householder | C, row 18. `people:householders` has the word |
| label `codex` | Known | The third page, beside Guide: what the crew has seen, as against what householders tell |
| label `bestiary` | Creatures | The first list of that page |
| the fourteen sites of A | Stone Crossing, Salt Pan, Fold Corner, Island Tree, Prints, Sand-country Fire, Burned Hearths, Tree Floor, Quarry, Stone Column, Lamp Row, Crystal Stump, Shaft, Hearthstone | Codex headings |
| `ground:floor`, `ground:set`, `ground:way`, `ground:light`, `ground:moon`, `ground:ward`, `ground:hosts`, `ground:mouth` | The Floor, Set Ground, The Way, Light, The Moon, House Ward, Hosts, The Mouth | Codex headings |
| `matter:lees`, `matter:salt`, `matter:remains`, `matter:great_remains` | Lees, Salt, Raw Remains, Great Remains | Codex headings. `matter:gold` and `matter:crystal` take the names of `gold_bar` and `mana_crystal` |
| `old:made_bait`, `old:old_bed` | Made Bait, Old Bedroll | Codex headings |

## J. Order of work

1. Writers start now, from `text/README.md`. Nothing they write waits on a builder, except that `beast.habit` and `beast.once` follow D.3 as written.
2. After the multiplayer merge, builders take C.1 first: nine changes, each with its test.
3. Then A and B, which touch only `src/world/gen/` and the block and item tables. Run `surfaces.mjs` after the tables change: the eight blocks and two items move from its `PLANNED` lists to the source, and it stops until they are moved.
4. Then D and the text loader: one module that reads the six files, looked up by `"<surface>:<key>"`, replacing the literals at the `file` and `line` each entry gives. A tooltip prints a piece's numbers from its `stats`, with the names of `stat`; the descriptions carry none, where today a trinket's description is its numbers.
5. Then C.2's step 4 rows and F.
6. `surfaces.mjs --check` and `textlint.mjs` run with the other checks of the build.
