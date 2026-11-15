# Step 4: show the world in play

The world bible is finished and the game shows almost none of it. This plan says what step 4 puts on the ground, in the windows and in every sentence, so that a crew of up to eight meets the causes of chapter 1 by playing. Writers work from it and from `text/README.md`. Builders work from it once the multiplayer code is merged.

Section numbers without a letter point to the bible (`docs/world/`). Keys in code font are internal keys and never change. A stride is one piece of ground. `SEA` is the height of the one water, 96. File and line numbers are those of this worktree, except where `_surfaces.json` marks an entry `branch: "main"`.

Three rules run through every section.

- **Nothing here needs the wire.** Everything placed on the ground comes from the seed and the climate, which both sides already compute. Everything that opens for the crew is a shared flag, which the host already sends and saves.
- **Step 5 is not designed here.** Damage kinds, states of a body, skill trees, gear upgrading, named uniques, bounties, standing with the peoples, a miniboss for each country, dungeons with keys, the map and the loop after the last kill belong to step 5. Where the bible proposes one of them, this plan says so and leaves a hook: a key, a place, or a flag that step 5 can build on.
- **Text states what play shows.** A line may not describe a habit, a find or a change that the game does not have when the line ships. Where a chapter marks something *proposed* and this plan does not take it, the writer leaves it out.

## A. Sites and traces

### A.1 How a site is placed

Every site is one more row of `STRUCTS` in `src/world/gen/structures.ts` and is placed the way the thirteen old structures are: a grid of regions `cell` chunks wide, at most one origin to a region, the origin and every choice drawn from `hash01(rx, salt, rz, seed)`. A build may read the seed, the climate (`heightAt`, `biomeAt`) and, through `w.get`, the cells of the chunk being written. It reads nothing else, so any chunk can decide alone what overlaps it, the host and every client build the same thing, and nothing is sent.

Rules common to all the new rows:

- **The fields.** Each row gives `cell`, `chance`, `salt`, `radius` and `y`, as `StructType` requires. `radius` covers every cell the build writes, measured from the origin across the ground: `structAt` keeps the origin `radius + 2` inside the region's edge, and `stampStructures` builds a row only in a chunk that comes within `radius` of the origin. `y` is `'surface'` where the build stands on the ground at its origin, and a number in `dim:1` and `dim:2`, where `structAt` has no climate.
- **Long rows.** A row marked `long` also gives `reach`: the farthest any cell it writes lies from its origin, always less than its region's width. For a long row `stampStructures` takes the region of the chunk and its eight neighbours, and builds each origin whose square of side `2 * reach + 1` overlaps the chunk. The margin in `structAt` stays `radius + 2`, the size of what stands at the origin itself, so origins spread over the region as for any row. Two rows are long: `crossing` (`reach` 240) and `lamp_row` (`reach` 24).
- **The test.** Each new row has a test `fits(x, z, cl, seed)`, which `structAt` calls once x and z are drawn. When it is false the region has no origin, so `locate`, the host and every chunk agree. The rules a row gives under *Placed*, beyond its numbers, are that test. `structAt` keeps the dry and biome tests it applies to `y: 'surface'`.
- **Choices.** Every choice a build makes ("a hashed 16 to 72") comes from its own `r`, `mulberry32(hashInt(rx, salt, rz, seed))`, in the order the row lists them. A choice the test needs comes from `hash01(rx, salt + 3, rz, seed)`. Where a row names one of four directions, they are +x, +z, -x, -z in that order. A tie goes to the first.
- **Order.** The new `dim:0` rows go into `STRUCTS` ahead of `village`, in this order: `crossing`, `pan`, `fold`, `lone_tree`, `prints`, `fire_ring`, `tree_floor`, `quarry`, `column`, `shaft`. `stump` goes ahead of `arena6`, and `lamp_row` straight after `cache1`. On the living ground the two rules below and the walk of `crossing` (A.3) keep each new build off every cell that a `village`, a `ruin`, an `arena` or another new build writes. A `dungeon` lies under the ground, its shell no higher than 52 (`y` at most 47, and five above it), and of the new builds only `shaft` cuts down that far, 50 strides or more from any `dungeon` origin. The order is fixed so that every copy of the code stamps the rows the same way.
- `structAt` gives no origin where the origin of a `village`, a `ruin` or any `arena` of the row's own `dim` lies within 40 strides, or within the two radii plus 2 where that is more (`fold`, `quarry` and `prints` beside a `village`, `prints` beside an `arena8`). Every cell of a build lies within its radius of its origin, so the two builds never meet. For `crossing` this binds the origin only, and its walk keeps the stones clear (A.3).
- **New rows apart.** `structAt` of a new `dim:0` row other than `crossing` gives no origin where the origin of another new `dim:0` row other than `crossing`, drawn by that row's `structAt` with every other part of its test and without this rule, lies within the sum of the two radii plus 2. It is drawn without this rule so that no test waits on another: where two origins are that near, neither stands. One row never meets its own origins in other regions, since each lies `radius + 2` inside its region and two of them stand at least `2 * radius + 4` apart. `crossing` gives way to all of these in its walk (A.3), so it needs no place in the rule.
- These two rules and the next are tests of a row's own origins, so they do not apply to `lamp_row`, whose origins are those of `cache1`: it has `cache1`'s own placement fields, so `structAt` of `lamp_row` gives the same origins as `structAt` of `cache1`, with no case of its own.
- No origin of a row on the living ground (`dim:0`) lies within 48 strides of the world spawn. The rule binds `dim:0` rows only: the spawn and the mouth of the way are on the living ground, and a row of the hollow or the islands has no spawn rule (so `stump`, a `dim:2` row, has none, and its `fits` never needs the `dim:0` climate). The ground over the mouth has nothing built on it and nothing marking it (3.2). `findSpawn(climate)` (`src/sim/rules.ts:146`) walks a spiral of up to about 2,000 climate samples, so it is run once for a seed and its answer kept with the climate, never once for each region or chunk.
- **Salts.** `structAt` draws from `salt`, `salt + 1`, `salt + 2` and `salt + 3`, so no new salt lies within 3 of another, nor of an old row's (11, 23, 37, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, which reach 152). The new salts: `crossing` 157, `pan` 163, `fold` 167, `lone_tree` 173, `prints` 179, `fire_ring` 191, `tree_floor` 197, `quarry` 211, `column` 223, `stump` 229, `shaft` 233. Two hashes are not rows: a `village` is burned by `hash01(rx, 18, rz, seed)`, and a hearthstone has a core under it by `hash01(hx, 239, hz, seed)`. `lamp_row` takes `cache1`'s salt, 137, on purpose: that is what gives it the vault's origins. Its build draws nothing from its `r`, so the shared salt decides nothing else.
- **Uneven ground.** Each row says, in its *Made of* or its test, which ground each column of the build stands on. Where a row sets cells at one height over several columns, its test bounds how far those columns may differ, or the build fills under and clears over each column from that column's own `heightAt`. The rows that do so are `pan` (test), `fold` (own ground and test), `prints` (own ground), `fire_ring` (fill and clear), `tree_floor` (test), `quarry` (fill and clear, and its faces on their own ground), `column` (own ground) and `shaft` (test, and each column cut from its own ground). `crossing` stands on the water at `SEA`, `lone_tree` and `stump` work column by column, and `lamp_row` cell by cell.
- **The root.** `bedrock` lies at height 0 in every column of the living ground and at heights 1 to 3 in some (`src/world/gen/overworld.ts:162`); in the hollow it lies below height 3 and above 177 (`src/world/gen/dims.ts:36`). Only `shaft` reaches it, and it stops at the first `bedrock` cell in each column (A.5). No other build, old or new, writes a cell below height 25, the shell of the lowest `dungeon`, nor in the hollow above height 123, the roof of the highest `cache1`, so none meets `bedrock`.
- **The sight point.** The first time any player of the crew comes on a site, the flag `cx:site:<key>.seen` is set, the line `site.sight:<key>` shows once under the compass, and the codex subject opens. "Comes on" is the event D.4 gives. Where D.4 gives a distance (12 strides where it gives none), it is measured in three dimensions from the player's feet to the site's sight point. The sight point is the cell `(x, y, z)` of the origin `structAt` gives, except for these rows, whose build moves the place or does not read `y`: `crossing`, its first stone, at `SEA` on the first column out from the shore end, found by the same walk as the build; `column`, the cell over the ground at the foot of the column, on the moved origin; `stump`, the cell over `top` (`skyColumn`) of the first spire column within three strides, scanning `dz` and then `dx` from -3 to 3; `shaft`, the cell over the ground at `(x, z)`, its mouth; `lamp_row`, its first lamp, `(x, y + 2, z + 10)` of the vault's origin. `hearth`, `burned_hearths` and `dungeon` are come on by where a player stands in a house or a room, which `villageHouses` and `dungeonRooms` give (A.5, D.4), not by a distance.
- **What the sight names stands.** A site has a sight point only where its build has set every piece that its `site.sight` and `codex.seen` name, so neither line opens where a piece is missing. Where a line names a line or a row, at least three of its pieces stand: three stones of a `crossing` with open water between each and the next, and three prints of `prints` in a line. Every build of A sets all of its named pieces at every origin, in the cell the row gives, whatever that cell held, with one exception: `lamp_row`, whose lamps are not hung in the round of a killing floor or in the cells of the next vault (A.3). A vault where any of its three lamps is not hung has no `lamp_row` sight point, and `cx:site:lamp_row.seen` does not open there. The host decides it with the round test the build uses, from the seed alone.

### A.2 Blocks and items the sites need

Eight blocks and two items are new, and one block gains a second state. The names shown are proposals: a name is fixed in `names.json`, and section I lists what has to be added there. Every other block a site uses is in `src/data/blocks.ts` today.

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
| `guest_bed_held` | (the name of `guest_bed`) | A second state of `guest_bed`, as `furnace_lit` is of `furnace`, with the pot and the slab drawn at its foot. Drops `guest_bed`, has no item, and shares the description of `guest_bed` (C, row 17) | 1.6 Rooms and townsfolk |

### A.3 The rows of 8.2 marked proposed

All eleven are taken, and so is the tree of the `bloomvale` row, which makes twelve sites.

**`crossing`**, in `ocean` beside any shore. Cause: 3.2 `ocean`.
*Made of.* Single `wardstone` blocks at height `SEA`, each set in the top cell of water whatever it held, on every second cell of one straight line. No column of the line is ice (*Placed*). The first stone is on the first cell out from the shore end. Between two stones is one cell of open water. The last stone carries a second `wardstone` on top of it: the next stone, carried out and never set.
*Placed.* `long`. Cell 16 chunks, chance 0.5, salt 157, radius 2, reach 240, `y` is `SEA`. The direction is one of the four, by `hash01(rx, 160, rz, seed)`. The test: the origin is an `ocean` column whose ground lies below `SEA - 2`, and walking back from it against the direction, one stride at a time for up to 48, a column at or above `SEA` is met. That column is the shore end. The count of stones is a hashed 16 to 72. A stone goes only on a column below `SEA`, and a crossing that meets a column at or above `SEA` before its count is up stops there. One crossing in six (hashed after the count) does not stop at its count: it runs on until it meets a column at or above `SEA`, or to 120 stones. The 120th stone lies 239 strides from the shore end, and the shore end at most 48 behind the origin, so every column of the line lies inside the reach. *Giving way.* The walk also stops at the first column it comes to, a stone's or a gap's, that lies, across the ground, within `radius + 2` of the origin of a `village`, a `ruin`, an `arena` of the living ground, or a new `dim:0` row other than `crossing`, found by `structAt` of each of those rows for its regions that come within `reach` plus its radius plus 2 of the crossing's origin. It stops in the same way at the first column within one stride, in x and in z, of a column of the line of another `crossing` whose region lies within two regions of its own in x and in z (the twenty-four round it) and comes first (the smaller `rz`, then the smaller `rx`), from that line's first stone to its last, as that crossing's walk gives it without this one rule. Twenty-four regions are enough: every origin lies 4 to 251 strides into its region of 256, so two origins two regions apart in x (or in z) may lie 265 strides apart, which two lines of up to 238 strides past their origins can close, and three regions apart they lie 521 or more apart, more than `2 * 238 + 1`, and a line runs at most 238 strides from its origin along its own axis and none along the other. So no other build writes a cell of the line, an `arena` pad that reaches down past `SEA` included (`pad()` writes seven cells under its floor whatever they held), and no two lines touch. Where a line stops this way, its last stone is the last one set before that column and carries the second stone, as at any stop. *Ice.* The walk stops in the same way at the first column it comes to, a stone's or a gap's, whose cell at `SEA` is ice. `src/world/gen/overworld.ts:172` sets that cell to `ice` where the column's `temp` from `Climate.sample` is below `-0.52 + (hash01(wx, 3, wz, seed) - 0.5) * 0.06`, so the climate and the seed alone decide it, and the walk works it out the same way. Where a line stops at ice, its last stone carries the second stone, as at any stop. *The first five columns.* The test also takes the first five columns of the line: the first three stones and the two gaps between them. Each of the five lies below `SEA`, none is an ice column, and none is a column at which the walk stops by giving way. Where any of the five fails, the test fails and the region has no origin. So every crossing has at least three stones in a line with open water between each and the next, its last stone carries the second, and the sight point, which is the first stone, always stands. Every test is on `heightAt` and `biomeAt`, so a chunk sets the stones that fall in it and no other.
*Found.* Nothing to carry. A way over water that nothing comes up in (3.1), and the place where the work stopped.

**`pan`**, in `beach`. Cause: 3.2 `beach`, 6.3 Salt and pots.
*Made of.* Everything is set at the origin's height `y`, whatever the height of each column. A square rim of `sandstone` seven strides on a side at `y`. Inside it a floor five on a side at `y - 1`, and above that floor the cut, the cells at `y`. Under the rim and the floor, `sandstone` down to `y - 3`. Over the rim and the cut, every cell from `y + 1` up to `BUILD_MAX` is air, in the words of `quarry`, so nothing that grew on a column of the footprint hangs over it. A pan is clean when the origin of a `village` lies within 160 strides: its floor is `salt_crust` and the cut is air. Every other pan has a floor of `sandstone` and the cut full of `sand` to the rim (3.2: most are full of blown sand). There is no third kind.
*Placed.* Cell 5 chunks, chance 0.6, salt 163, radius 5, `y: 'surface'`. The test: the origin is `beach`, its ground is from `SEA` to `SEA + 2`, and the 49 columns of the footprint differ in height by at most 1. The build finds a village by calling `structAt` for the `village` regions that come within 160 strides.
*Found.* The crust, which breaks to nothing. The game has no salt to carry (6.13).

**`fold`**, in `plains`. Cause: 3.2 `plains`.
*Made of.* Two runs of `cobble`, one piece wide and two high, meeting at a right angle at the origin. One of four turns is hashed; the runs go out along the turn's direction and along the next direction of the four. Each run is a hashed `n` of 5 to 9, the first run first, and covers the cells 0 to `n - 1` along its direction, so the origin holds the corner and is `cobble` in both runs. A run stands on its own ground, column by column: its two cells are the two above `heightAt` of that column. One oak (`stampTree`, kind 0) stands on the cell one stride along each run from the corner, inside the angle, on its own ground.
*Placed.* Cell 6 chunks, chance 0.5, salt 167, radius 10, `y: 'surface'`. The test: the origin is `plains`, and every column the runs and the oak could take (cells 0 to 8 along each direction of the turn, and the oak's cell one stride along both) is above `SEA` and within two pieces of the origin's height.
*Found.* Nothing to carry.

**`lone_tree`**, in `bloomvale`. Cause: 3.2 `bloomvale`, 3.5.
*Made of.* One island tree as `src/world/gen/dims.ts:130-136` stamps it: a trunk of `star_log` a hashed 4 to 7 high and a crown of `star_leaves` seven across, from the build's own `r`. Before it is stamped, the trees there are cleared: in every column with `dx * dx + dz * dz <= 36` from the origin, at every height from that column's own `heightAt` plus 1 up to `BUILD_MAX`, each block made by `leaf()` in the block table (`oak_leaves`, `pine_leaves`, `pale_leaves`, `kapok_leaves`, `rose_leaves`, `star_leaves`) and each block made by `wood()` whose key ends `_log` (`oak_log`, `pine_log`, `pale_log`, `kapok_log`, `rose_log`, `star_log`) is set to air. The clearing goes to `BUILD_MAX` and not to a fixed height over the column, because a crown that hangs over the round can stand on a trunk outside it on higher ground: a kapok's crown reaches 17 over its own ground (`stampTree`, `src/world/gen/overworld.ts:80`) and spreads up to four strides from its trunk. Nothing else is cleared. Each chunk clears its own cells. Structures are stamped after trees (`src/world/gen/overworld.ts:330`), so the trees are there to clear. Then the flowers, which draw nothing from `r`. On every column with `9 < dx * dx + dz * dz <= 36` whose cell at `heightAt` is `grass`, the cell above it is set to `flower_white` where `dx + dz` is even and `flower_blue` where it is odd, whatever it held (after the clearing it holds air or a plant). On the two columns `(x + 4, z)` and `(x - 4, z + 1)` the cell at `heightAt` is set to `grass` and the cell above it to `flower_white` and `flower_blue` in that order, whatever either cell held, as `prints` sets its first print: so a white and a blue flower stand at every origin, whatever the ground's top is there (a steep slope turns it to `stone`, a cave can open it, and `stampTree` turns the cell under a trunk to `dirt`). Then the tree is stamped. Its crown spreads three strides from the trunk and both fixed columns lie more than four out, so neither flower is under a leaf, and a flower under the crown elsewhere stays where it is.
*Placed.* Cell 10 chunks, chance 0.5, salt 173, radius 8, `y: 'surface'`, dry. The test: the origin is `bloomvale`.
*Found.* Light under it, so nothing comes up there (3.1): the island leaves give light in the block table. Its leaves drop `skyfruit` now and then (C, row 23). A crew that has crossed to the islands has seen the tree before.

**`prints`**, in `tundra`. Cause: 3.2 `tundra`, 1.6 Night, light and feeders.
*Made of.* The first print is at the origin. A hashed one of eight directions (the four, and the four between them), and a hashed count of 7 to 13. The prints are `i = 0` to `count - 1`. Print `i` lies on the column `i` steps from the origin along the direction, one step to a print. For `i = 0`, `1` and `2`, the origin and the next two columns: the cell at its `heightAt` is set to `snowy_grass` and the cell above it to `snow_prints`, whatever either cell held. The ground's top there is not always snow, since a steep slope turns it to `stone` (`src/world/gen/overworld.ts:158`) and a cave or a ravine can open it to air (`overworld.ts:226`, `:243`); setting both cells puts the first three prints on snow at every origin. The test makes those three columns `tundra` and above `SEA`, and keeps every tree draw off them. For `i` from 3 on, on each column: if the column is not `tundra`, the line ends there. Otherwise, if its top block (the cell at `heightAt`) is `snowy_grass` or `snow`, a `snow_prints` is set in the cell above whatever that cell held (a plant, or a leaf of a pine's crown; set ground stays, so any leaves over it stay where they are); if not, that column has no print and the line goes on. The foot of a pine is `dirt` (`stampTree`, `overworld.ts:96`), so a pine's column takes no print. The build sets nothing but the prints and the cells under the first three, so nothing is set at either end, and every origin has at least three prints in a line.
*Placed.* Cell 4 chunks, chance 0.5, salt 179, radius 19, `y: 'surface'`: the last print is at most twelve steps out, and twelve steps on a slant reach 16.97 strides from the origin. The test: every column within six strides of the origin is `tundra` and above `SEA` (this is the clean snow the line starts in); no column `(x + dx, z + dz)` with `dx` and `dz` each from -3 to 3 has `hash01(x + dx, 20, z + dz, seed) < 0.003`, the draw that puts a tree on a `tundra` column (`TREES`, `overworld.ts:30`, and the tree loop at `:289`), so no pine's trunk or crown, which spreads at most three strides from its trunk, stands over the first print; and the origin lies at least 32 strides from the origin of the `prints` of each of the eight neighbouring regions, found by `structAt` without this last part of the test.
*Found.* Nothing to carry. A print goes when a block is set on it or it is struck.

**`fire_ring`**, in `desert`. This is also the last row of 8.7. Cause: 3.2 `desert`, 5.3.
*Made of.* In this order:
- The ground is levelled in every column within 15 strides of the origin (`dx * dx + dz * dz <= 225`), which holds the far corner of every house. In every column, with `h` its own `heightAt`: `sandstone` from the lower of `y - 4` and `h + 1` up to `y - 1`, so where the ground of a column lies more than four below `y` the floor stands on rock and not over a gap; `sand` at `y`; and air from `y + 1` up to `BUILD_MAX`, so no sand, rock or growth is left hanging over the place, however high a column stood or whatever grew on it. These are the words of `quarry`.
- A round floor of `ash_glass`, five strides in radius, at `y`, in place of the sand.
- One `great_fire` in the cell over the middle of the glass, at `y + 1`.
- A hashed 6 to 10 houses, then a hashed first angle. House `i` is centred on the ring 11 strides out, at the first angle plus `i` parts of the circle. Each is five strides square outside: a floor of `sandstone` at `y`, walls of `sandstone_bricks` at `y + 1` and `y + 2` round its edge, and a flat roof of `sandstone` at `y + 3`. The doorway is the middle cell of the wall that faces the fire, chosen by the larger of the two parts of the direction to the fire, as `village` chooses `face`. It holds a door two high, `door_z` in a wall that faces along x and `door_x` in one that faces along z, as `house()` sets them (`structures.ts:66-67`). There is no window and nothing inside.
- Three stacks of fuel, each two by two by two, from `y + 1` to `y + 2`. Each stands on the line halfway between two neighbouring houses: after house 0, after house `floor(n / 3)` and after house `floor(2n / 3)`. For the stack after house `i`, let `a` be the first angle plus `i + 0.5` parts of the circle. The column `(x + round(cos a * 6), z + round(sin a * 6))` is the stack's corner nearest the fire, and the stack takes that column, the next one outward in x (by the sign of `cos a`, + when it is 0) and the next one outward in z (by the sign of `sin a`, + when it is 0): four columns, two cells high each. The first two are `kapok_log`, the third `oak_log`. House centres are rounded the same way, `(x + round(cos b * 11), z + round(sin b * 11))` for the angle `b` of house `i`. At 6 strides no stack meets a house: checked for every first angle in steps of 0.1 degree and every `n` from 6 to 10, no stack column is a wall, door or inside cell of a house, and the nearest stack column to the fire lies at `dx * dx + dz * dz = 29`, outside the glass (`<= 25`). Test: for 50 seeds, every `fire_ring` built has `sandstone_bricks` at `y + 1` and `y + 2` on every wall cell of every house that is not its doorway.
- No `chest`, `crate`, `lantern`, `bedroll` or `workbench` anywhere in the place.
*Placed.* Cell 20 chunks, chance 0.6, salt 191, radius 16, `y: 'surface'`, dry. The test: the origin is `desert`, level by the test a `village` uses, and at least 64 strides from the origin of any `village`, `ruin` or `arena`.
*Who is there.* The build leaves one block entity of kind `fire` at the fire. While its chunk is ready the host keeps four to six people of the place present, as it keeps a townsperson's body: bodies of `ashen_raider`, with one `ashen_hexer`. They are at home: they do not attack, they are no creatures of an attack, and no ward or light turns them. By day they stand within 8 strides of the fire or walk the sand within 30. Before `boss:2` is set they stay out on the sand at night as well, since nothing but the burrower's host came up there (4.4). Once `boss:2` is set, at night all of them are within 6 strides of the fire and two stand at its edge facing out.
*What they do about a peopl.* When a player first comes within 10 strides, the nearest of them says one line of `fire.say:before` or `fire.say:after`, by the `boss:2` flag, as a tag over the head, or of `fire.say:night` at night. They do not trade. Two things turn them on a player, and in both they drive the player out of the light and no further, since there is no use in killing a thing that gets up (5.3). A player who strikes one of them is fought by every one of them. A player who sets within 16 strides of the fire, on the lit ground, a block of the things 5.3 says draw is gone for by every one of them: a `chest` or `crate`, a forge of remains (`emberforge`, `voidkiln`, `prism_crucible`, `eclipse_forge`), a bench (`tinker_bench`, `runeloom`), a gate frame (`hollow_frame`, `rift_frame`), or a bed (`bedroll`, `guest_bed`). Breaking a block there, or setting any other, turns nobody. In either case one says `fire.say:struck`, and they follow and strike that player until the player is 30 strides or more from the fire, then go back to it; the block set stays where it is, since in step 4 they break nothing (5.3: in play the fighters go for the players and break nothing). A player who comes back within 16 strides before the next dawn is driven out again. A player who drops a log or coal within the ring hears `fire.say:fuel`, and nothing else follows in step 4. Those killed are gone. Others of that fire are there after the next dawn: a place of six to ten houses has more people than the few a crew sees at once (3.2).
*What else comes.* At night one `cinder_wisp` comes up 18 to 24 strides out, in the dark, and hangs three strides over the fire (7.3).
*Found.* `ash_glass` under an iron pick, and with it a token one time in six: a token is a piece of this floor and can be made no other way (5.3).
*Hooks for step 5.* Trade at a fire, fuel carried to it, fighters who walk with a crew, and what these people know of the sealed stores are standing with the sand-country people (8.5). The entity of kind `fire` is where that standing is kept.

**`burned_hearths`**, in `savanna`. A state of a `village`, with no row of its own. Cause: 3.2 `savanna`, 2.8.
*Made of.* The village as built, with the hearths of `hearth` below. In every house, each of the eight cells round the hearthstone at floor height that is `oak_planks` is `charred_planks`. `house()` sets them when it is passed `burned` (A.5, `hearth`).
*Placed.* A `village` whose origin is in `savanna` is burned when `hash01(rx, 18, rz, seed) < 0.4`, for its region `(rx, rz)`. `villageHouses` gives this as `burned`.
*Found.* Nothing more than in any village. The crates are stocked like the rest. Nothing in the houses says who did it, and the codex gives both tellings (D).

**`tree_floor`**, in `jungle`. Cause: 3.2 `jungle`.
*Made of.* A floor five strides square, from `x - 2` to `x + 2` and `z - 2` to `z + 2`, at a hashed height `f` 7 to 10 pieces above the ground at its origin. A floor cell is `kapok_planks` unless it holds a log: trunks that pass through it are left. In the three layers above the floor, `f + 1` to `f + 3`, every leaf block over the floor is set to air. On the floor: a `lantern` at the corner `(x - 2, z - 2)`, a `crate` with the `crate` loot at `(x + 1, z)`, beside the middle, and a `bedroll` at `(x + 1, z + 1)`, next to the crate. Each of the three is set at `f + 1` whatever that cell held: where a trunk passes through the cell, the piece takes the place of that one cell of log, and the trunk above it stays where it is, since set ground stays (1.2). The floor cell under each of the three, at `f`, is `kapok_planks` whatever it held, so a trunk that passes through one of those cells is cut there as well. So all three stand on planks on every floor. Nothing joins the floor to the ground.
*Placed.* Cell 6 chunks, chance 0.5, salt 197, radius 4, `y: 'surface'`, dry. The test: the origin is `jungle`, and the 25 columns under the floor lie within two pieces of the origin's height, so the floor stands 5 to 12 pieces over the ground of every one of them and never meets it.
*Found.* The crate, the lamp, and a bed of the kind only an arrival uses.

**`quarry`**, in `crags`. Cause: 3.2 `crags`.
*Made of.* The direction `d` is the one of the four in which the ground rises most from the origin to 8 strides out (`heightAt` there less the origin's height). Let `p` be `d` turned a quarter to the left. The box is every column at `origin + a d + b p` for `a` from 1 to 6 and `b` from -3 to 3: seven strides across the rise and six along it, starting one stride from the origin and running into the rise. In each of those columns, with `h` its own `heightAt`: the cell at the origin's height `y` is `stone`; every cell from `h + 1` up to `y - 1` is `stone` too, so where the ground of a column lies below `y` the floor stands on rock and not over a gap; and every cell from `y + 1` up to `BUILD_MAX` is air. A column of the box can stand 18 or more above `y` on a steep crags slope, and a pine on it or on the higher ground beside it reaches 10 over its own ground (`stampTree` kind 1, `src/world/gen/overworld.ts:74-76`); the cut to `BUILD_MAX` takes all of it, with what grows on it and any crown that hangs over the box, so no rock and no leaf is left hanging over the floor. The faces are the columns just outside the box: the back face at `a = 7` for `b` from -4 to 4, and the side faces at `b = -4` and `b = 4` for `a` from 1 to 7. In every face column, every cell from `y + 1` up to that column's own `heightAt` is set to `stone`, whatever it held, so each face stands straight and flat from the floor to its own ground, whatever the ground's top was (a `crags` column is `grass` over `dirt` where its slope is 1 or less and its patch is 0.1 or less, `src/world/gen/overworld.ts:155`) and whatever cave opened it. The face columns lie at most 8.06 strides from the origin, inside the radius. The open side is the side of the origin, `a = 0`. One `rough_block` stands on the floor in the middle of the open side, at `a = 1`, `b = 0`, height `y + 1`.
*Placed.* Cell 8 chunks, chance 0.5, salt 211, radius 9, `y: 'surface'`. The test: the origin is `crags`, at or above `SEA + 20`, the rise in `d` is 5 or more, and every column of the back face from `b = -3` to `b = 3` (at `a = 7`) has a `heightAt` of at least `y + 3`, so the back face stands at least three high across the whole floor.
*Found.* The block.
*Hook for step 5.* The middle cell of the back face, `a = 7`, `b = 0`, height `y + 1`, is where the store of 3.9 "cut back into the rock" would open.

**`column`**, in `peaks`. Cause: 3.2 `peaks`, 1.8.
*Made of.* The origin moves to the highest column within 6 strides by `heightAt` (the first in a scan from -6 to 6, z then x, on a tie). On it stands one column of `cobble`, one piece wide, from the cell over its ground up a hashed 30 to 70 pieces, cut short so that its top is no higher than `BUILD_MAX - 8`, 242. Beside its foot, on the cell over the ground of the column one stride +x, lies a `bedroll`, and on the cell over the ground one stride -x a `torch`, each set in that cell whatever it held, so both stand at every column.
*Placed.* Cell 8 chunks, chance 0.4, salt 223, radius 8, `y: 'surface'`. The test: the origin is `peaks`.
*Found.* The bedroll: whoever stacked the column had a way.
*Hook for step 5.* The summit is the place of 7.8's older animals of the heights.

**`lamp_row`**, in the hollow (`dim:1`). Cause: 3.4.
*Made of.* Three `sporelamp` hung under a roof, four strides apart, in a straight line that points at an old structure (3.4). No choice spans two chunks: every cell is decided by itself, from the seed and that cell.
- At a `cache1`, a row of its own. Take the vault's origin `(x, y, z)`; its doorway is the gap at `z + 3`. A passage of air three wide and three high runs straight out from the doorway: every cell from `x - 1` to `x + 1`, `y` to `y + 2`, `z + 4` to `z + 23` is set to air, except a cell of `wardstone`, `chest`, `brood_nest` or `sporelamp`, which is left. The lamps hang in the top cell of the passage, three pieces above the vault's floor, at `(x, y + 2, z + 10)`, `(x, y + 2, z + 14)` and `(x, y + 2, z + 18)`. The cell over each lamp, at `y + 3`, is set to `gloomstone` unless it is `wardstone`, `chest`, `brood_nest` or `sporelamp`, so a lamp hangs from rock where the passage crosses a cave.
- At an `arena4`, part of that floor's own build (B), since it lies inside the floor's radius. Three lamps east of the stone, at 7, 11 and 15 strides out, each in the topmost cell of the dome there: `y + 12`, `y + 9` and `y + 4`, which is the dome's height at those distances as `arena4` cuts it (`round(sqrt(256 - d * d) * 0.8)`).
- **Clear of a killing floor.** The passage and its lamps leave untouched every cell whose column lies within 18 strides, across the ground, of the origin of an `arena4` (`dx * dx + dz * dz <= 324`), at every height. That is the whole of the floor as `arena4` writes it (radius 17, posts, caps, dais and `altar4`) and the stride round it. The build finds those origins by calling `structAt` of `arena4` for the `arena4` regions (cell 12 chunks) that come within 42 strides of the vault's origin, the reach plus 18. A lamp whose column falls in that round is not hung, and neither is its `gloomstone` (the lamp and the cell over it share a column, so the one test covers both). Every lamp outside the round is set in its cell whatever the cell held, except a cell of the next vault (below), and its `gloomstone` the same. Where the round cuts the passage short, the passage simply stops at it; the `arena4` is already the place it points to.
- **Clear of the next vault.** The lamps of a vault in region `(rx, rz)` lie at its own `x` and 10 to 18 past its own `z`. A vault's origin lies 7 to 88 strides into its region of 96 along each axis, so the only other vault whose cells a lamp or its `gloomstone` can reach is the one of region `(rx, rz + 1)`, whose origin `z` is at least 15 past this one's; a vault of another `rx` lies 15 or more strides off in `x`, more than its half-width of 3. Take that vault's origin `(x', y', z')` from `structAt` of `cache1` for region `(rx, rz + 1)`. No lamp and no `gloomstone` is set in a cell with `|cx - x'| <= 3`, `|cz - z'| <= 3` and `y' - 1 <= cy <= y' + 4`: the floor, walls, roof, doorway and room of that vault, with its `chest`, its `brood_nest` and its two lamps. So a lamp never takes that vault's wall, its chest or its nest, never makes a third lamp in its room, and its `gloomstone` never fills that vault's doorway. The passage needs no such rule, since it leaves `wardstone`, `chest`, `brood_nest` and `sporelamp` and the room is air.
- **Which vaults have a row to see.** A vault has the `lamp_row` sight (A.1) only where all three lamps hang: none of the columns `(x, z + 10)`, `(x, z + 14)` and `(x, z + 18)` lies within 18 strides of an `arena4` origin, and none of the cells `(x, y + 2, z + 10)`, `(x, y + 2, z + 14)` and `(x, y + 2, z + 18)` lies in the cells of the next vault given above. The host decides it with the same calls the build makes, `structAt` of `arena4` for the regions within 42 strides of the vault's origin and `structAt` of `cache1` for region `(rx, rz + 1)`, so it needs no chunk. A vault with one or two lamps hung has its passage and those lamps and no sight; one with none hung has no sight either. The sight point is the first lamp, `(x, y + 2, z + 10)`.
*Placed.* `long`. The row is `cache1`'s placement, given in full, so `structAt` needs no case for it: `dim` 1, cell 6, chance 0.6, salt 137, radius 5, `y: 'under'`, `reach` 24. `structAt` then draws the same origin, and the same `y` from `salt + 3`, as it draws for `cache1`, so every vault has its row. No test of its own (`fits` is absent and always true), and no 40-stride or spawn rule (above). Stamped after `cache1`. Test: for 200 seeds, stamp the hollow with and without `lamp_row` over every `arena4` of a 3 by 3 block of its regions: every cell with its column within 18 strides of an `arena4` origin is the same both times, and `altar4` stands at `(x, y + 2, z)` of each origin wherever no `cache1` vault itself crosses that cell; and every cell of every vault, from `y - 1` to `y + 4` within 3 of its origin in x and in z, is the same both times.
*Found.* Nothing to carry. Growth scatters, so a straight row was hung by a person, and it leads to a vault or a stone.

**`stump`**, on the islands (`dim:2`). Cause: 3.5 `rift_shards`.
*Made of.* Nothing is added. In each column within three strides of the origin (`dx * dx + dz * dz <= 9`), from height 90 to 200: in every run of `prism_crystal` that stands on a block that is not crystal, the lowest crystal is left and the rest of the run is set to air. A spire in that round is left one piece high.
*Placed.* Cell 3 chunks, chance 0.8, salt 229, radius 4, `y` 150, which the build does not read: it reads the cells from 90 to 200 instead. Today `structAt` gets no climate on the islands (`src/world/gen/dims.ts:139` passes null), so the test needs one thing exposed. `src/world/gen/dims.ts` gains an exported `skyColumn(seed, wx, wz)`, which gives `{ shards, top }` for a column exactly as `RiftGen.generate` works them out today: `shards` from the `nB` field (`fbm2(nB, wx / 260, wz / 260, 2) > 0.2`), and `top` the highest `y1` of the two island layers, or -1 where neither layer is there. Both depend on the seed and the column alone. `RiftGen.generate` calls it for each column, so the two cannot drift apart, and `stampStructures` and `locate` pass it on `dim:2` where they pass the climate on `dim:0`. A *spire column* is one where `shards` is true, `top` is above 108, and `hash01(wx, 5, wz, seed) < 0.03`. Those are the generator's own conditions for a spire (`dims.ts:125-128`): the top cell of an island is always `skyturf`, and above 108, the highest cell a cloud is set in, the cell over it is always air. The generator raises a spire only where the cell over `top` is still air when its column comes up in the loop (`dims.ts:126`), and an island tree on a column without `shards` sets `star_leaves` into the columns round it in that same loop (`dims.ts:130-136`), up to `dx * dx + dz * dz <= 8.5` from its trunk, so a crown can take the cell a spire needs. The test: every column with `dx * dx + dz * dz <= 81` of the origin has `shards`, at least two spire columns lie within three strides of it (`dx * dx + dz * dz <= 9`), at least one spire column lies with `9 < dx * dx + dz * dz <= 36`, and no `cache2` origin lies within 12 strides, so the store's island stamped after it (radius 5) cannot cover the stumps or the whole spire (the 40-stride rule of A.1 already keeps it clear of `arena6`). `fits` receives `skyColumn` as its `cl` on `dim:2`. A trunk stands only on a column without `shards`, so under the first part of the test every trunk lies more than nine strides from the origin, and every spire column the test counts lies within six, which puts every trunk more than three strides, and so more than `sqrt(8.5)`, from every counted spire column: no crown reaches one, and each spire column the test counts has its spire. The spire between three and six strides out lies outside the round the build cuts, so it stands whole: this is the standing spire that `site.sight` and `codex.seen` name. Every part of the test is decided by `skyColumn` and the seed alone. So every origin has at least two spires to cut, `locate('stump')` points at a place where stumps stand, and the sight and the codex open only where they do. Test: for 50 seeds, every origin `structAt` gives for `stump` in a block of 20 by 20 regions, once its chunks are built, has at least two columns within three strides whose top is `skyturf` with one `prism_crystal` over it and air over that, and at least one column with `9 < dx * dx + dz * dz <= 36` whose top is `skyturf` with two or more `prism_crystal` over it.
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
| A crystal in the shape of a pot | step 4 | `pot_crystal`, in the loot of `dungeon` as `['pot_crystal', 0.8, 1, 1]` and of `ruin` as `['pot_crystal', 0.3, 1, 1]`: one at a time. Both are stores where salt failed |
| A harness made for a born hunter | step 5 | A named piece of armour with numbers of its own. The bars in each of the eight already show what its wearer shows (4.2), and `eight.kill` says so |
| A sealed jar of great lees | step 5 | It is one night at a great stone, which is the loop after the last kill |
| A staff of stone | step 5 | A named weapon |
| A net for fliers | step 5 | It brings a flier down, which is a state of a body |
| A bench with stronger remains in it | step 5 | Gear upgrading (6.12) |

**`shaft`**, in any dry country of the living ground. Cause: 6.11, 1.3 Down and up.
*Made of.* The sixteen columns are the four of the shaft, `x` and `x + 1` by `z` and `z + 1`, and the twelve of the ring round it, `x - 1` to `x + 2` by `z - 1` to `z + 2` less the four of the shaft. Let `T` be the highest `heightAt` of the sixteen, plus 1. In this order:
- In each of the sixteen columns, from its own `heightAt` plus 1 up to `BUILD_MAX`, each block made by `leaf()` and each block made by `wood()` whose key ends `_log` is set to air, in the words of `lone_tree`. Outside the sixteen columns nothing is cleared: the part of a crown that lies outside them is left where it is, and set ground stays (1.2).
- Each shaft column is cut from its own ground: from its own `heightAt` down, cell by cell, every cell is set to air until the first `bedrock` cell, which is left with every cell below it. `bedrock` lies at height 0 in every column and at heights 1 to 3 in some (`src/world/gen/overworld.ts:162`), so a shaft column ends at height 1, 2, 3 or 4, and the floor of the shaft is the root in each of the four. Any cell from `heightAt` plus 1 to `T` of a shaft column is air as well.
- Each ring cell from height 1 to `T - 1` is `wardstone` where it is not already solid and opaque, which walls off caves, water and molten rock; a `bedrock` cell in the ring is left. The cell at `T` of every ring column is `wardstone` whatever it held. So the ring's top is one level, one piece above the highest ground of the sixteen and one or two above each ring column's own.
- On the floor of the column `(x, z)`, in its lowest cell of air (the cell over its first `bedrock` from the top), is a `chest` with the loot `shaft`.
*The loot.* `LootTable` (`src/data/loot.ts`) gains one optional field, `always: [key, min, max][]`, which `rollLoot` (`src/sim/rules.ts:95`) gives before its weighted rolls. The table is `shaft: { rolls: [0, 0], mod: 0, coins: [0, 0], entries: [], always: [['cutter_saw', 1, 1], ['torch', 2, 4]] }`. Test: rolled 100 times, every roll holds one `cutter_saw` and two to four `torch`, and nothing else.
*Placed.* Cell 16 chunks, chance 0.4, salt 233, radius 3, `y: 'surface'`, dry. The test: the origin is not `ocean`, `beach` or `swamp`, the sixteen columns differ in height by at most 1, and the origin lies at least 96 strides from the spawn and at least 50 from the origin of a `dungeon`. Test: for 50 seeds, every shaft in a block of 10 by 10 regions has air in all four columns from `T` down to the cell over the first `bedrock` from the top, `bedrock` under each, a `chest` on the floor of `(x, z)`, and `wardstone` at `T` in all twelve ring columns.
*Found.* The saw, and the floor: black, cold, and unmarked by the people who sank a shaft to cut it.

**`hearth`**, in every house of every `village`. Cause: 6.11, 1.5.
*Made of.* One `wardstone` in the floor of each house, in place of the plank: the middle cell of the row against the wall opposite the door. In the terms of `house()`, where `sx`, `sz` point out of the door, that is `(x - sx (hw - 1), y, z - sz (hd - 1))`, between the crate and the lamp, which stand at the two ends of that row one cell higher. In one house of eight, when `hash01(x, 239, z, seed) < 0.125` for the house's middle `(x, z)` (the `hx`, `hz` of the village build), the cell under that stone, at `y - 1`, is `ward_core` in place of `cobble`.
*The houses, for the build and for the host.* `src/world/gen/structures.ts` exports `villageHouses(rx, rz, seed, cl)`. It gives null where `structAt` of `village` gives no origin for the region `(rx, rz)`, and otherwise `{ x, y, z, burned, houses }`, with `(x, y, z)` that origin. It makes `r = mulberry32(hashInt(rx, 11, rz, seed))`, the `r` that `stampStructures` hands the village build, and draws from it in today's order (`structures.ts:94-97`, and the furnishing draw of `house()` at line 74): `n`, `phase`, then for each house `R`, `hw`, `hd`, and the one draw that picks workbench or bedroll. Each house is `{ hx, hy, hz, hw, hd, face, a, R, bed, hearth, core }`: `hx`, `hy`, `hz`, `hw`, `hd` and `face` worked out as the village build works them out today, `a` the house's angle and `R` its distance from the well (for the path), `bed` true where that draw is 0.5 or more (a `bedroll`; below 0.5, a `workbench`), `hearth` the hearthstone cell `[x, y, z]` of the table below, and `core` true where `hash01(hx, 239, hz, seed) < 0.125`. `burned` is true where the origin is `savanna` and `hash01(rx, 18, rz, seed) < 0.4` (`burned_hearths`). The `village` build works out its own region as `rx = Math.floor(x / 320)`, `rz = Math.floor(z / 320)` (a cell of 20 chunks is 320 strides, and the origin lies inside its region), takes the `seed` its `StructType.build` is already handed (`structures.ts:258`, as `build(w, x, y, z, r, cl, seed)`), calls `villageHouses`, and builds the well, each house and its path from what it gives. It draws nothing more from the `r` it is handed, since `villageHouses` has made the same draws. `house()` loses its `r` argument and gains three: `bed`, `core` and `burned`. It sets the bedroll or the workbench by `bed`, the `ward_core` by `core`, and the `charred_planks` of `burned_hearths` by `burned`. The draws and every other cell are as today, so every other cell of a village stays where it was, and the host and the build cannot disagree about a house.
*The workbench or bedroll moves.* Today it stands at `(x - sx, y + 1, z - sz)`. Where `hw - 1 = 1` on a door on x, or `hd - 1 = 1` on a door on z, that cell is the hearthstone's column, so the furnishing would stand on the stone. Where the size along the door is 3 and across it 2, it stands in front of the stone, and with the crate, the lamp and the back wall it closes the stone in. So in every house it stands instead in the middle row, one cell to the side of the line from the door to the stone: `(x, y + 1, z + 1)` for a door on x (face 0 or 1) and `(x + 1, y + 1, z)` for a door on z (face 2 or 3). The draw that picks workbench or bedroll keeps its place in the order, made by `villageHouses` and passed in as `bed`. That cell is inside in every size, off the back row, off the door line, and on no cell of the crate or the lamp (in a 2 by 2 house it stands beside the lamp, sharing a face with it). The line from the door to the stone is then open at `y + 1` and `y + 2` in every house, so a walker or a player reaches the stone on foot.
*Every house.* `hw` and `hd` are each 2 or 3 (`structures.ts:97`). Face 0 has the door at `+x`, 1 at `-x`, 2 at `+z`, 3 at `-z`.

| Face | Size `hw` x `hd` | Door | Hearthstone, at `y` | Crate, at `y + 1` | Lamp, at `y + 1` | Workbench or bedroll, at `y + 1` |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | 2 x 2 | `(x + 2, z)` | `(x - 1, z)` | `(x - 1, z - 1)` | `(x - 1, z + 1)` | `(x, z + 1)` |
| 0 | 2 x 3 | `(x + 2, z)` | `(x - 1, z)` | `(x - 1, z - 2)` | `(x - 1, z + 2)` | `(x, z + 1)` |
| 0 | 3 x 2 | `(x + 3, z)` | `(x - 2, z)` | `(x - 2, z - 1)` | `(x - 2, z + 1)` | `(x, z + 1)` |
| 0 | 3 x 3 | `(x + 3, z)` | `(x - 2, z)` | `(x - 2, z - 2)` | `(x - 2, z + 2)` | `(x, z + 1)` |
| 1 | 2 x 2 | `(x - 2, z)` | `(x + 1, z)` | `(x + 1, z - 1)` | `(x + 1, z + 1)` | `(x, z + 1)` |
| 1 | 2 x 3 | `(x - 2, z)` | `(x + 1, z)` | `(x + 1, z - 2)` | `(x + 1, z + 2)` | `(x, z + 1)` |
| 1 | 3 x 2 | `(x - 3, z)` | `(x + 2, z)` | `(x + 2, z - 1)` | `(x + 2, z + 1)` | `(x, z + 1)` |
| 1 | 3 x 3 | `(x - 3, z)` | `(x + 2, z)` | `(x + 2, z - 2)` | `(x + 2, z + 2)` | `(x, z + 1)` |
| 2 | 2 x 2 | `(x, z + 2)` | `(x, z - 1)` | `(x - 1, z - 1)` | `(x + 1, z - 1)` | `(x + 1, z)` |
| 2 | 2 x 3 | `(x, z + 3)` | `(x, z - 2)` | `(x - 1, z - 2)` | `(x + 1, z - 2)` | `(x + 1, z)` |
| 2 | 3 x 2 | `(x, z + 2)` | `(x, z - 1)` | `(x - 2, z - 1)` | `(x + 2, z - 1)` | `(x + 1, z)` |
| 2 | 3 x 3 | `(x, z + 3)` | `(x, z - 2)` | `(x - 2, z - 2)` | `(x + 2, z - 2)` | `(x + 1, z)` |
| 3 | 2 x 2 | `(x, z - 2)` | `(x, z + 1)` | `(x - 1, z + 1)` | `(x + 1, z + 1)` | `(x + 1, z)` |
| 3 | 2 x 3 | `(x, z - 3)` | `(x, z + 2)` | `(x - 1, z + 2)` | `(x + 1, z + 2)` | `(x + 1, z)` |
| 3 | 3 x 2 | `(x, z - 2)` | `(x, z + 1)` | `(x - 2, z + 1)` | `(x + 2, z + 1)` | `(x + 1, z)` |
| 3 | 3 x 3 | `(x, z - 3)` | `(x, z + 2)` | `(x - 2, z + 2)` | `(x + 2, z + 2)` | `(x + 1, z)` |

The door, crate and lamp columns are what `house()` builds today, given here so the table can be checked against it. Test: for every face and size, built on flat ground, the hearthstone cell is `wardstone`, the cell above it is air, the furnishing cell holds a `workbench` or `bedroll`, and a walk from the door to the stone along the door line meets nothing solid at `y + 1` or `y + 2`. Over 800 houses about one in eight has `ward_core` under the stone.
*Placed.* By `house()`, for every house. Villages already standing in a saved world keep what they have: only chunks made from now on carry the stone and the moved furnishing.
*Found.* The core. Set down beside the floor it is the same stuff, and an arrival can see it.

## B. The eight killing floors

Each row gives what the generator builds today, what chapter 4 says the floor is, and the change. Nothing here changes a fight.

| Key | Built today | What it is (chapter 4, 3.7) | Change |
| --- | --- | --- | --- |
| `arena1` | Pad of `moss_stone` and `grass`, six posts of `oak_log` five high with a few leaves, six `glowshroom`, a dais of `mossy_bricks` | The first comers left six oaks standing as the posts of the floor. The fungus grows where carcasses were boiled down (4.3) | The six posts are whole oaks, in place of a pole with five leaves. `stampTree` (`src/world/gen/overworld.ts:69`) gains an optional last argument `th`, the trunk height: when it is given, the height is still drawn from `rnd` and then replaced, so the draws after it are as today and every tree that passes no `th` is the same as today. Each of the six posts of `ringOf(6, 11, ...)` (`src/world/gen/structures.ts:150`) is `stampTree(w, 0, x + dx, y - 1, z + dz, seed, 6)`, so the trunk stands from `y` to `y + 5`, where the pole stands now. The first `arena1` is placed from the world spawn (below) |
| `arena2` | A bowl three deep, floor of `sandstone` mixed with `sand`, rim of `gilded_bricks`, four pillars of `sandstone_bricks` standing in the bowl, a gilded dais | The sand is where the animal comes up. The footing is the rim (3.7). Rim and platform are faced with gold because a stone-eater was going to lie against them (4.4) | The floor of the bowl is `sand` two deep over `sandstone`, with no bare stone showing. The rim is three wide. The four pillars stand on the rim, 15 strides out, and nothing stands in the sand but the dais |
| `arena3` | Pad of `wardstone` and `stone_bricks`, eight pillars of `bone_block` capped with `crystal_cyan`, a dais of `wardstone` | The pillars are stacked bone of the animals boiled down here. The caps are spilled lees, set (4.5) | At the foot of every second pillar one cell of the paving is `crystal_cyan`: lees that ran off the stack and set |
| `arena4` | A dome cut in `gloomstone`, floor of `mycel`, six posts of `gloom_stem` each with one cap block, four `sporelamp` standing on the floor | The animal hangs from the roof by its own growth, and the dome is that growth. The lamps hang (4.6) | The four lamps hang three pieces under the roof at the same four places. The inner face of the dome, one layer, is `gloomcap_violet` with `gloomcap_teal` one cell in five. Each post carries a cap three by three. The `lamp_row` of A: three more lamps hung in the topmost cell of the dome at 7, 11 and 15 strides east of the stone, set after the dome is cut |
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
| 2 | Nothing but `cinder_wisp` comes up on `desert` sand until `boss:2` | Three places, all under one test: the cell's column is `desert` by `realm.biomeAt`, on the living ground, with `boss:2` unset. (a) `src/sim/mobs.ts`, where a spawn rule is chosen for a cell: a rule of a hostile kind other than `cinder_wisp` whose `where` is `'surface'` or `'air'` (`SpawnRule`, `src/data/mobs.ts:48`) is refused. Rules with `where: 'cave'` or `'water'` are untouched, so the caves under the desert keep `stonegnawer`, `cave_skitter` and the cave `gloomshade` as today (D.3). (b) `src/sim/events.ts`: a wave cell in `desert` is skipped. (c) `src/sim/blocks.ts:38-47`, the nest tick: a `brood_nest` at height `SEA` or above whose kind is not `cinder_wisp` spawns nothing. This is the nest a `ruin` sets (`structures.ts:118`), which stands on the ground in any dry country. The nests of a `dungeon` and a `cache1` lie far below `SEA` and are untouched. The ruin keeps its nest block, so a saved world needs nothing done. Animals are untouched | Natural spawns: stand a bot on `desert` at night for 2,000 steps: every hostile creature that comes up at or above `SEA` is `cinder_wisp`, and a bot at the floor of a cave under the same desert still meets `stonegnawer`. Set `boss:2`: `gloomshade` comes up on the sand. Nests: find, for some seed, a `ruin` on `desert` whose build drew a nest; with `boss:2` unset, a bot stands 8 strides from the nest for 2,000 steps by day and 2,000 by night, and no `gloomshade` is within 32 strides of it. Set `boss:2`: within the same steps one comes up at the nest. Raid waves: with `boss:1` set and `boss:2` unset, stand a bot on `desert` within 28 strides of another country and start `raid`: of 300 wave spawns, none puts a creature on a `desert` cell, and some come up on the other country. Set `boss:2` and do the same: some come up on `desert` |
| 3 | Sand-country fighters join `raid` on the `boss:2` flag | `src/sim/events.ts:82`. `diff >= 2 ? 'ashen_raider' : 'gloomshade'` becomes `sim.flags.has('boss:2') ? 'ashen_raider' : 'gloomshade'` | With `boss:1` and `boss:3` set and `boss:2` unset, 300 raid spawns hold no `ashen_raider`. With `boss:2` set they hold some |
| 4 | Townsfolk say *peopl* | Text. Every `folk.meet` entry carries the word, and `textlint.mjs` fails one that does not. The other lines use it where a householder would address the player | `textlint.mjs` |
| 5 | No text says a stone is lit by a kill | Text. The strings of 4.13 are entries of `banner`, `eight.intro`, `eight.phase`, `eight.line`, `item.desc` and `task.*`, each with its present text, and the same claim could be made on any other surface. So the check goes by voice, not by surface: on every entry whose voice is `label`, `sight` or `note`, whatever its surface (the codex, the bestiary, a site, a country, a toast, a fall), `textlint.mjs` refuses "lit", "relit" and "rekindled" outright, and "light" in any sentence that names a stone, an altar, a cairn, a housing or the base. A thing that gives off light is said to glow. A banner says no "light" at all. "First light" is refused outside a born or sand mouth. Born and sand mouths may say lit, because to them it means held | `textlint.mjs` over the six files exits 0. Its `--selftest` plants "The stone is lit again." in an `eight.line`, "Kill it and the stone is lit." and "Kill it to light the stones again." in a `task.how`, "relit" in an `item.desc`, "Since the kill the stone is lit." in a `codex.read` and in a `site.sight`, "The stone is lit." in a `toast`, and "Since the kill there is light on the stone." in a `codex.read`, and each is caught |
| 6 | Sand-country fighters are drawn as people | `src/data/mobs.ts:257-261`. For `ashen_raider`, `ashen_hexer` and `siege_brute`: no `glow`, and the `eye` colour is a dark brown. `siege_brute` is 1.95 tall and 0.4 half-wide (`h`, `hw`, and `h: 1.95, w: 0.7` in its list of boxes) | For the three keys no box has `e > 0`, and `def.h <= 2` |
| 7 | No upright feeder has a face or hands | `src/data/mobs.ts`. **The small kinds.** All eight are made by `biped`. It takes an option `face: false`, which skips its call to `eyes()`, so the model has no eye boxes. A `biped` arm is one box with nothing at its end, so it has no hand to take off; the blade `mycelid_knight` holds at the end of its arm stays. The option is passed for `thornling`, `sproutling`, `bog_lurker`, `shardling`, `rustbound`, `gloomshade`, `moonspawn` and `mycelid_knight`. **The eight.** They are not made by the builders: each is a list of boxes written with `B(...)`. Four of them are drawn upright, and their faces and hands are taken out by hand. `b_colossus` (`colossus`, lines 315-366): the two eye boxes on `head` (colour `0xc4ff8a`, line 349), the jaw `jaw` and its two teeth (lines 350-351), the brow over the eyes (the first box of line 348), and in each arm the fist (the `1.65 x 1.3 x 1.65` box riding `fore`, line 343) go; the head is a plain block sunk between the shoulders and each forearm ends in its own stone. `b_warden` (`warden`, lines 400-449): the two eye slits (line 419), the mouth line and the chin under it (line 420) and the crack across the mask (line 437) go; in each arm the `hand` and its thumb (line 426) go, so the sleeve ends in its lit cuff. `b_sporemother` (`sporemother`, lines 451-492): the eight boxes of its face, the great eye, its pupil, the four lesser eyes, the slit mouth and its glow (lines 469-471), go; its arms end in spore bulbs, which are no hands, and stay. `b_sovereign` (`sovereign`, lines 599-633): the six boxes of the eye and the brow on `s4` (lines 611-614) go, and in each arm the fist and the line cut in it (line 624) go, so the forearm ends at its lit joint. The other four, `b_maw`, `b_regent`, `b_luminarch` and `b_hart`, are drawn as a worm, a bird, a ring of crystal and a stag, and are not upright likenesses of a person | For the eight builder kinds, read from `MOB_LIST`: let the head be the box with `a: 'head'` and no `o`, and `hs` its side. No other box with `a: 'head'` has an `o` whose z is at or beyond `hs / 2` (the front face of the head, where `eyes()` sets its two boxes); no box is 0.04 deep (`s[2]`, the depth `eyes()` gives); and no box has the colour that kind passes as `eye` today (`gloomshade` 0xc8a0ff, `thornling` 0xffe06a, `bog_lurker` 0xb8ff6a, `rustbound` 0xff8a3a, `mycelid_knight` 0x4ae6b8, `shardling` 0xf6a0f0, `moonspawn` 0xfff0d0, `sproutling` 0xffe06a). No box of the eight has a `par`, so none rides on an arm. For `b_colossus`, `b_warden`, `b_sporemother` and `b_sovereign`, read from `MOB_LIST`: no box is named `hand`, `jaw` or `fist`; no box with `e > 0` rides on `head` or on `s4`; no box of `b_sporemother` with `e > 0` stands on the front of the stalk, with its joint at `z >= 1.4` and below the cap at height 3.4; and nothing rides on a box named `fore` lower than that box's own lower end. `src/dev/validate.ts` runs this check with the others |
| 8 | Each gate opens at its own matching spot, the same for everyone | Half is settled by `docs/multiplayer/ARCHITECTURE.md` section 9 (`land()` takes a registered gate of that kind within 24 blocks of the arrival column), proved by its scenario `travel2` (one gate at the destination). The other half is the change to `travel()` in C.3 | `travel2`, and the two-gate test in C.3 |
| 9 | A great feeder stays while anyone is on the floor to fight | Settled by `docs/multiplayer/ARCHITECTURE.md` 7.9: a valid target is a participant who is active, alive and within 80 blocks of the stone; the fight stays open while a participant whose link dropped can come back; with no valid target and nobody to come back for, the animal withdraws after 10 seconds. Proved there by the scenarios `boss` and `stall`. Nothing is added to the rule. The leash on one player at `src/sim/boss.ts:69-74` in this worktree is the solo code that 7.9 replaces, so the row is met once the multiplayer merge lands | `boss` and `stall`, and one scenario added here, `bossstay`: two bots on the floor of `arena1` lay the bait and fight. One walks 100 strides from the stone: the animal's next target is the other, and it does not withdraw. Then the second walks 100 strides off: the animal withdraws 10 seconds later, and not before |

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
| 18 | A householder met in a `village` at dusk | step 4 | A body `n_walker` with a householder's look and the name of the people, which `names.json` has. While a `village` chunk is ready and no townsperson of the crew is housed within 64 strides, one is present from dusk to dawn. A householder on the road carries a clay pot and a slab of hard stone with the lines cut in it (1.6 Rooms and townsfolk), and the body is drawn with both. At dusk it sits on the cell beside the well under the lamp, with the pot beside it (3.2 `village`: "sitting by a pot"). It holds nothing there: it is outside, with no walls to give an edge, and nothing about it turns a feeder. When night falls it goes into the nearest house of the village that passes the room check of `src/sim/npcs.ts` and in which no player has set a `bedroll` as their place (1.6: no born person sits through a night over the near end of a stranger's way). It shuts the door and sits at the hearthstone with its pot and slab until dawn. That is a held house ward, with the cause 1.6 gives it: a pot of lees, one householder's hand on a hearthstone until first light, walls for an edge, a light inside and a door. So while it sits there, no hostile creature comes up within 28 strides of that house, as round an occupied `guest_bed`, and as there the protection is gone while `raid` or `ashen` lasts (1.6). With no such house it stays at the well and holds nothing. Right-click gives one line of `walker.say:dusk` as a toast. On the dark night it says `walker.say:dark`. During `raid` it says `walker.say:raid`. It does not trade and is gone at dawn. Test: a bot in a village at dusk finds the walker at the well; after nightfall the walker is inside a house that passes the room check, and for 2,000 steps of night no hostile creature comes up within 28 strides of it; with a `raid` started, they do |
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

**A great feeder stays.** `docs/multiplayer/ARCHITECTURE.md` 7.9 already does what 1.6 asks: the fight stays open while there is someone on the floor to fight. The fight has participants. A valid target is a participant who is active, alive and within 80 blocks of the stone. With no valid target the animal holds still. While a participant whose connection dropped can still come back (up to 90 seconds), the fight stays open for them. With no valid target for 10 seconds and nobody who can come back, the animal withdraws. The leash on one player in this worktree (`src/sim/boss.ts:69-74`) is the solo code that 7.9 replaces. Nothing is added to the rule. The scenarios `boss` and `stall` prove it there, and `bossstay` (C.1, row 9) proves the row: one fighter walking off leaves the animal to the other, and only when both are gone does it withdraw.

### C.4 Every row of 8.11

Each row of 8.11 is taken, done by the naming pass in `names.json`, or kept in its sense. Where 8.11 says *keep*, the owner's ruling comes first: every line of existing text is rewritten plainly, with no quips and no aphorisms. Keep then means that the new line says the same thing, not that the old words stay. The entries are those of `text/_surfaces.json`.

| String in the game today | Decision | The entries it touches, and what the text must say |
| --- | --- | --- |
| "Lava does not negotiate", "The ground was farther than it looked" | Taken | `fall:cause.lava`, `fall:cause.fall` say what failed the body, in the voice `sight` (H.2): molten rock burned it, the drop was longer than it could take |
| "You did not get back up" | Taken | `fall:cause.none`. No text writes an arrival's death (rule 20). The line says the player was down when they left |
| Quest chapters "First Light", "The Long Night"; the last step "The light is yours" | Done by the naming pass, and taken | `chapter:1` to `chapter:7` in `names.json` (E.1). `task.title:end`, `task.how:end`, `task.said:end`: no kill lights a stone; in Desik's mouth a stone is lit while a holder sits at it (4.10, 5.2) |
| "The Ashen Host", "The Ashen Host marches", "Defeat them to break the invasion" | Done by the naming pass, and taken | `ashen` is Sand March in `names.json`. `banner:ashen.start`, `banner.sub:ashen.start`, `banner:ashen.won`, `banner:ashen.lost`: people on a march from a fire, coming for the stores. No host and no invasion (5.3, 7.6); the voice `sight` refuses both words |
| "The Hollow Moon rises", "The Hollow Moon turns tonight", "Strange things walk tonight" | Done by the naming pass, and taken | `moon` is Amāvassa in `names.json`. `banner:moon.start` is that name, `banner.sub:moon.start` says the moon is dark, which is what is seen. The born's belief that it is hollow is in `codex.born:ground:moon`, `walker.say:dark` and Desik's lines, and in no banner (1.6 The dark night) |
| "A raid gathers in the dark" | Kept in its sense, rewritten | `banner:raid.start` is the name of the event, Night raid, and `banner.sub:raid.start` says packs are coming up round the houses. Nothing in the old line was false (7.6); it is rewritten by the ruling |
| "Gloomroot Hollows · No sky here. Bring light." "The Skyrift · Mind the edges" | Done by the naming pass; lines kept in their sense, rewritten | `dim:1` is The Hollow and `dim:2` The Islands. `realm:enter.1` says there is no sky and that the light there comes off the growth (3.4); `realm:enter.2` says there is open air under the edges of the islands. The voice `sight` gives no advice, so "bring light" and "mind" become what is seen. No line shows an edge to the ground (rule 21): the edges are those of islands |
| Wardstone: "Dense masonry laid by whoever built the old wards." | Done by the naming pass; kept in its sense, rewritten | `wardstone` is Dressed Stone. `block.desc:wardstone` says the stone was dressed by whoever built the old wards, which is all an arrival knows of the builders (2.3), and that it has lain dressed long enough to be harder than raw stone |
| Mana, Mana Crystal "the core of every spell focus", Spellweave, Sage, Arcana | Done by the naming pass, and taken | `mana_crystal` is Crystal, `weave` Crystal Fiber, `sages_ring` Crystal Ring, `attr:arc` Arm. `item.desc:mana_crystal` says crystal is old lees set hard; `tip:uses_arm`, `tip:arm`, `toast:no_arm`, `tip:set.magic`, `stat:mana` and `hud:buff.mana` say arm (H.1). `textlint.mjs` refuses mana, spell and magic everywhere |
| Runescribe, Hexer, Bound Shade, Brazier Spirit, Mycelid Sprite, Sentinel, Knight, Soul Reliquary | Done by the naming pass | `runescribe` is Rehakār, `ashen_hexer` Dāhaga, `m_shade` Jatuk, `m_brazier` Jālak, `m_mycelid` Chattak, `rustbound` Nihirakka, `mycelid_knight` Asikavak, `soul_reliquary` Crystal Pendant. Each old name is in the `old` field, and `textlint.mjs` refuses it, with an English plural as well |
| Bone Effigy: "A little carved thing that something answers to." | Done by the naming pass, and taken | `effigy` is Carved Bone. `item.desc:effigy` says the raw flesh bound on the bone is food and a small feeder forms on it (6.6). The carving does nothing |
| Heartroot "Lets a bench bind trinkets", Scorched Core "Hot enough to smelt cindrite" | Done by the naming pass, and taken | `heartroot` is Vanahar Remains, `scorched_core` Maruhar Remains. The cause is 1.6 Great remains: the remains loosen. `item.desc:heartroot` says that on a bench they loosen two worked pieces far enough to join them; `item.desc:scorched_core` says that woken by fire in a ring of stone they loosen ore no fire melts. Neither binds and neither is hot |
| `provisioner`: "Follows the smell of coin" | Taken | `folk.why:provisioner`. The cause is 1.6 Rooms and townsfolk: word that a crew carries more lees than its hearths use travels the old roads, and carrying is this householder's trade |
| `smith`: "Comes when she hears an anvil ring"; `beastcaller`: "whoever quieted the Warden" | Taken | `folk.why:smith`: she comes on word of an anvil, which householders carry between hearths by walking (5.2), because whoever works iron will want harder ore (5.5). Nobody hears an anvil at a distance. `folk.why:beastcaller`: this one works with the remains of the shade-kind and comes once its strongest is dead (1.6). No warden, and nothing quieted |
| The townsfolk lines listed at the head of 5.5 | Taken | Every `folk.*` entry of the eight is written new. None of the five old lines stays, and no line gives a word or a gesture power or is a saying (rules 6, 7, 16) |
| Bait tooltips: "wake", "call up", "Ring", "Burn", "Fly", "focus", "Wear", "Opens" | Taken | `item.desc` of the eight baits says each is laid on its stone and what in it is food (4.2). The born's verbs go only in `task.said`, a born mouth (E.1). `textlint.mjs` refuses all eight in those eight entries, with their inflections and the irregular ones (woke, rang, rung, burnt, flew, flown, wore, worn); its `--selftest` plants "Ring it" in `warden_bell` and "Fly it" and "flown" in `storm_kite` |

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
- Counts of kills are one new field of the shared state, `kills`, from creature key to a number. It is saved with the world and is not sent: only the flag that a count opens is. It counts feeders and the five ordinary animals, and no person. The eight are counted under their own keys (`b_colossus` to `b_sovereign`), so `eight.habit` opens when the count of a key reaches 3. A feeder killed by a small feeder of a totem is counted twice: under its own key, and under the key of that look (`m_shade`, `m_brazier`, `m_mycelid` and the rest of the nine), which is the count of 10 that opens the look's `habit` (D.3).
- **Where a site was first seen.** When the host sets `cx:site:<key>.seen` for a site that D.4 opens on a distance from a sight point, it sets with it, once, the flag `cx:site:<key>.at:<rx>,<rz>`: the region of the origin the player came on, `rx = Math.floor(x / (cell * 16))` and `rz = Math.floor(z / (cell * 16))`, with the row's own `cell` and the origin `structAt` draws. For `column` that is the origin before it moves, which stays in its region (it moves at most 6 strides and lies `radius + 2` = 10 inside the edge). For `lamp_row` it is the region of the `cache1` it runs from, which is the same region, since the two rows share their placement. It is a flag like any other: saved with the world, sent in `welcome` and to everyone when it is added. Nothing new goes on the wire. It is never changed and never set a second time. The codex shows nothing for it, since `at` is none of the step names of D.1. D.4 reads it where the evidence is a site seen in a second place.
- **The day of a first kill.** The host sets `boss:<n>` at each kill (`src/sim/loot.ts:33`). The first time, when the flag was not yet there, it sets with it the flag `bossday:<n>:<d>`, with `d = Math.floor(sim.shared.clock)`, the day of the kill. It is saved and sent like any flag and never changes. A day turns at dawn: the whole part of the clock rises when its fraction passes from 1 to 0, which is the dawn edge of `src/sim/events.ts:47-58`. So the dawn that ends the eighth night after the kill is the first step at which `sim.shared.clock >= d + 8`, wherever in day `d` the kill fell. `eight.loss` of `boss:4` to `boss:8` opens on that step (D.3), and after a restart the host reads `d` from the flag.
- **Nobody counts the dead people (rule 12).** The three sand-country fighters, `ashen_raider`, `ashen_hexer` and `siege_brute`, are people. `kills` has no entry for them, no step opens on how many of them have died, and no line shows such a number. Two counts in play today count them, and both change. `src/sim/events.ts:43` adds one to `ev.k` for every creature of an attack killed. From step 4 a fighter killed adds nothing. In a `raid` the count is then of feeders. An `ashen` march has no feeders in it, so its count becomes the fighters who have come up: `ev.k` rises by one as each fighter of the march comes up, and the march is beaten off when `ev.k` has reached `ev.g` and no fighter of it is still standing. `docs/multiplayer/ARCHITECTURE.md` 7.5 scales `ev.g` with the players present, and that stands. The rule for `siege_brute` at `events.ts:83` (`ev.k > ev.g * 0.5`) then reads: after half the march has come up. The HUD line of a march (`hud:event.ashen`, `src/client/invclient.ts:96`) shows the name of the march and no number. Test: a bot beats off a march: `kills` holds no key of the three, the HUD line holds no digit, and the march ends beaten off when the last fighter of its count is down.
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
| `habit` | For a feeder: the shared count of kills reaches 12 for a kind that comes in packs or attacks (`gloomshade`, `thornling`, `gelcap`, `cave_skitter`, `stonegnawer`, `sporeling`, `moonspawn`), 3 for the two that come only beside the eight, 6 for every other feeder. For a totem animal, 10 feeders killed by that look. For the three sand-country fighters, no count: the first `ashen` march that ends, beaten off or turned for home, on which one of that kind was seen. For the five ordinary animals: 6 killed, since they are no feeders and no people |
| `once` | The event in the table below |
| `eight.sight` | The animal comes up at its stone |
| `eight.kill` | `boss:<n>` is set |
| `eight.loss` | `boss:1`: the first `raid` starts. `boss:2`: the first `ashen` starts. `boss:3`: the first dawn after the first `moon`. The other five: the first step at which `sim.shared.clock >= d + 8`, with `d` read from the flag `bossday:<n>:<d>` (D.2), which is the dawn after the eighth night from the kill |
| `eight.habit` | The third kill of that kind |
| `eight.once` | See below the table |
| `eight.said` | `boss:<n>` is set and `wayfinder` is housed |

The table gives, for each creature, whether the habit of chapter 7 is in play after step 4, and the event and the fact for `once`. Where the habit is not in play, `beast.habit` says what the kind does in play today, given in the same cell. Rules marked *added* are one condition each in `src/sim/mobs.ts` and are part of step 4.

**Where a drop or a creature came from.** Six `once` events open on a drop that came off a creature of the kind, and two need a creature that came from a nest. The same items also come from blocks, chests and smelting, so the pickup of the item alone decides nothing. Two fields are added, both kept on the host only.

- `Drop` (`src/sim/drops.ts:11`) gains `src: string | null`. `DropSim.spawn` gains a last argument `src = null`. `src/sim/loot.ts:28`, where a creature's death spawns its drops, passes the creature's key (`m.def.key`). Every other drop has `src` null: a broken block, a chest, a stack a player throws, a gate kit, the drops of the eight (`loot.ts:27`). `spawn` folds a new drop into a stack lying nearby only when the two have the same `src`. A drop *of a kind* is one whose `src` is that kind's key, and its event opens when a player picks it up.
- `Mob` (`src/sim/mobs.ts:16`) gains `nest: [number, number, number] | null`. The nest tick (`src/sim/blocks.ts:45`) sets it to the nest's cell `[e.x, e.y, e.z]` on the mob it spawns. `MobSim.spawn` sets it to null on every other mob, since the pool reuses its slots. The added rule of `rustbound` measures its 10 strides from that cell.
- Neither goes on the wire (`daOf` and the creature's events are unchanged) and neither is saved, since no drop and no creature is saved today (`src/sim/storage.ts`). A drop or a creature that lies across a load has `src` or `nest` null and opens nothing.
- A nest *of a dungeon* is a `brood_nest` whose block entity has the kind `stonegnawer` or `rustbound`, and the nest *of a cache1* one with the kind `mycelid_knight`: only those builds set those kinds (`structures.ts:143` and `:210`). A `ruin` sets only `gloomshade` (`structures.ts:118`).

| Key | Habit in play after step 4 | `once`: the event, and the fact it shows |
| --- | --- | --- |
| `woolback` | No. Write: herds of two to four on grass by day; struck, it runs; gone at dusk | One is alive within 20 strides of a `village` well. They graze up to the doors of the old houses (3.2 `plains`) |
| `gobblet` | No. Write: out by day in woods and wet country; struck, it runs | `craft:arrow` is set. Its feathers fletch arrows (7.2) |
| `burrowhog` | No. Write: cold woods, crags and snow by day; gone at dusk | One is alive on `snow` or `snowy_grass` in `tundra` or `peaks`. By day it is the only thing out on the snow (3.2) |
| `dune_skipper` | No. Write: sand and dry grass by day; fast | One is seen in `desert` while `boss:2` is unset. Nothing hostile shared the sand with it by day (7.2, 4.4) |
| `glimmerfin` | Yes: the shoal keeps together | A player is in water with a hostile creature within 10 strides that has the player as its target. It stopped at the water (3.1) |
| `gloomshade` | No (step 5: it goes first for the one carrying most lees). Write: everywhere at night and in caves at any time; it walks into lamplight; the sun undoes it | One whose `nest` is set is undone by the sun within 32 strides of a player. A nest puts them out by day and each comes apart at the wall (7.9) |
| `thornling` | Yes, *added*: by day it does not move until a body is within 14 strides | One dies during `raid`. Since the first great kill its packs go for stores at dusk (4.3) |
| `gelcap` | Yes, *added*: when it first moves, a `tall_grass` on its cell is set to air | `had:idol` is set. Its jelly went into the first bait (4.3) |
| `bog_lurker` | Yes, *added*: idle on `mud` it is drawn sunk to the head | A `bog_pearl` is picked up. A lump of lees set in mud, which it swallowed (3.2 `swamp`) |
| `frost_stalker` | No. Write: cold country at night, in ones to threes; it sees a body from 24 strides | One is alive by day within 24 strides of a player. The sun does it no harm (7.3) |
| `cinder_wisp` | No. Write: it hangs in the air and throws embers from ten strides | One is within 8 strides of `lava` with a player within 20. The same kind is on the sand at night and beside the molten rock at any time (3.3) |
| `stonegnawer` | No. Write: the commonest thing under the ground, from just over the floor to just under the turf | One dies within 12 strides of a nest of a dungeon (above). It has been at the dressed stone (7.3) |
| `cave_skitter` | No. Write: small, fast, in packs of two to four | One dies standing on `mycel` on the living ground. It is bodied in fibre and in the thread fungus puts through rock (7.3) |
| `crag_bat` | No. Write: caves at any time, and the air over the high rock at night | One dies under open sky at night in `crags` or `peaks`. The animal of the caves and of the high air is one animal (7.3) |
| `rustbound` | Yes, *added*: one whose `nest` is set does not go more than 10 strides from that cell | A `barbed_arrow` or an `iron_bar` that is a drop of `rustbound` (above) is picked up. It ate the stored harness and arrows (7.3) |
| `sporeling` | Yes, *added*: when one is struck, every `sporeling` within 16 strides takes the striker as its target | A `glowshroom` that is a drop of `sporeling` is picked up. What lies on the ground is the cap it had formed in (7.1) |
| `mycelid_knight` | No. Write: two strides tall, slow, hard to knock back | One dies within 12 strides of the nest of a cache1 (above). It breeds where the lees was (7.3) |
| `umbral_moth` | Yes: it flies and does not land | `had:kite` is set. Its dust went up on the kite (4.7) |
| `glowmaw` | No. Write: a fast runner, lit along the back | A `noctrium_ore` that is a drop of `glowmaw` is picked up |
| `rift_ray` | No. Write: in the air over the islands; it stoops | One is within 16 strides of a player and 6 or more pieces lower. It rides under a rim (7.3) |
| `shardling` | Yes, *added*: it does not move until it has a target | A `prismite_ore` that is a drop of `shardling` is picked up. The crystal kinds carry bits of the ore they feed on (6.2) |
| `aether_wisp` | No. Write: a bright crystal in the air; it throws from twelve strides | A `rift_scale` that is a drop of `aether_wisp` is picked up. It had been at a dead ray (7.3) |
| `moonspawn` | Yes: it does not go down before dawn, and the sun undoes it | One is undone by the sun within 32 strides of a player (7.3) |
| `lunar_howler` | No. Write: in the air on the dark night only; the fastest thing there is | One is undone by the sun (C, row 10) |
| `sproutling` | Yes: it goes when its strongest goes | `boss:1`'s animal withdraws while one is up |
| `dune_mite` | No. Write: it comes off the burrower when the burrower thrashes | `boss:2`'s animal withdraws while one is up |
| `ashen_raider` | No. Write: a fighter with a blade | One dies during `raid`. A few follow the dusk packs in (7.4) |
| `ashen_hexer` | Yes: he stands off and throws from 13 strides | A `mana_crystal` that is a drop of `ashen_hexer` is picked up. It was taken from a store on the way, for the fire (7.4) |
| `siege_brute` | No. Write: the biggest of them, slow, hard to knock back | One comes up on a march after half its fighters have come up (D.2). He comes late (7.4). Nothing here counts the dead |
| the nine on a totem | No. Write: it stays by the hand that carries its food and goes for feeders | The bearer falls while one of that look is out: `onDeath` (`src/sim/player.ts:142`) removes an active small feeder of that look owned by the bearer. It is gone when the bearer goes down (7.5). The text of all nine tells that fall, each with the place it was seen |

`eight.once`, one event each. Each is decided by the host in `src/sim/boss.ts` (or, for the bait and the base, where the line names), at the moment named, from what the animal and the players are doing then. "Brought up by the animal" means a creature its `summon` attack or the `enter` of a phase spawned, which `boss.ts` marks with `s.event = true` (line 242).
- `b_colossus`: the `charge` attack begins its wind-up (`case 'charge'`, the step where `b.step` goes from 0 to 1), and the trunk column of one of the six posts of that `arena1` (the columns `ringOf(6, 11, ...)` gives round the origin, B) lies within 1 stride, across the ground, of the segment from the animal's middle to its target's feet, between the two ends.
- `b_maw`: the animal comes up out of the sand at the end of a `burrow` attack (the step where `b.step` goes from 1 to 2 and the eruption is drawn) while a `dune_mite` brought up by the animal in this fight is still active. Every fight that reaches its second phase has some, since that phase opens with four.
- `b_warden`: it is killed while a `gloomshade` brought up by the animal in this fight is still active.
- `b_sporemother`: its `summon` attack brings up at least one `sporeling` while a player is within 12 strides of the animal.
- `b_regent`: the bait is laid while a player whose held slot holds a `storm_plume` is within 16 strides of the stone with no opaque block between, the same test as `sight` above.
- `b_luminarch`: the `enter` of its last phase (below 0.25) brings up at least one `shardling`.
- `b_hart`: it goes back down at dawn (C, row 11).
- `b_sovereign`: after `boss:8` is set, a player's feet stand on a `cairn_base` cell of an `arena8`, the cell under the feet holding `cairn_base`.

Bestiary entries for the three fighters are entries about people. They say what was seen and what a fallen fighter carried. They never count anyone (rule 12), and no step of theirs opens on a count of their dead (D.2).

### D.4 The codex: subjects, steps, and what opens each

The keys are the constants `CODEX`, `SITES_BUILT`, `SITES_NEW` and `MATERIAL_BORN` in `surfaces.mjs`, and the countries and hardnesses read from the source.

**Steps open the same way for every subject.**

- `seen`: the event in the table.
- `read`: `seen` is open and the evidence in the table has been met.
- `born`: `seen` is open and the householder named in the table is housed (`npc:<key>`). With none named, any householder.
- `sand`: `seen` is open and `npc:deserter` is set.
- A subject with no `seen` (only `people:peopls`) says in its row what opens each of its steps in place of these rules.
- **A second place.** Where a row's evidence is the site seen in a second place, `read` opens when the event that opens its `seen` fires again, for any player, at an origin whose region differs from the one in the flag `cx:site:<key>.at:<rx>,<rz>` (D.2). The region is worked out as for that flag. A restart between the two changes nothing, since the first region is kept in the flag.
- **Words of the table.** *In a pack*: in a player's pack, hot bar or worn slots. *Broken*: a player breaks the block (`src/sim/actions.ts`, where a broken block spawns its drops), whatever it drops. *Digs to `bedrock`*: a player's pick strikes a `bedrock` cell, which does not break. *The sight event*: the player comes within the distance the row gives of the site's sight point (A.1). *Old chest*: a chest at a cell where a build sets one: `(x - 2, y + 1, z - 2)` of a `ruin`; `(mx, y, mz)` of a `dungeon`, the middle of the last room `dungeonRooms` gives, at the floor; the origin of a `cache1`; `(x, y + 1, z)` of a `cache2`; and the floor of the column `(x, z)` of a `shaft` (A.5). The host works each out from `structAt`, as it does for `site:ruin` and `site:dungeon`, and the cell must hold a `chest`. *Taken from an old chest*: a stack that the roll of that chest's loot made goes into a player's pack. The roll is made on the first opening (`src/sim/actions.ts:244`, which fills `data.s` and sets `data.loot` to null) or when the chest is broken unopened (`:211`). The host marks each stack the roll makes, by its slot in the chest's data or on the drop it spawns, and the mark goes when that stack leaves its slot or its drop by any way but into a player's pack. A stack a player puts into a chest has no mark, so a crew that puts its own bait in an old chest and takes it out opens nothing. *Comes out of its chest*, in the row of `site:dungeon`, has the same sense.

| Subject | Steps | `seen` opens when | Evidence for `read`; who gives `born` |
| --- | --- | --- | --- |
| `place:0` the living ground | seen, read, born | The first join | A block is set on `dim:0` with air in the cell under it; Desik |
| `place:1` the hollow | seen, read, born | `dim:1` | A player digs to `bedrock` in the hollow; any householder (they say Under, 3.6) |
| `place:2` the islands | seen, read | `dim:2` | A player is put back on the last footing after a fall. No householder has a word for the place |
| `country:<key>`, all eighteen | seen, read | A player stands in the country for 10 seconds; `country.enter` shows then | One event for each country. Twelve have a trace in A, and their `read` opens when that site's `seen` is open: `ocean`, `crossing`; `beach`, `pan`; `plains`, `fold`; `bloomvale`, `lone_tree`, or `dim:2` set, whichever is first; `tundra`, `prints`; `desert`, `fire_ring`; `savanna`, `burned_hearths`; `jungle`, `tree_floor`; `crags`, `quarry`; `peaks`, `column`; `hollows`, `lamp_row`; `rift_shards`, `stump`. The six with none: `forest`, `palewood` and `taiga`, the sight event of `site:village` at a village whose origin is in that country (a village under oaks, under pale trees, of pine); `swamp`, a `bog_pearl` in a pack; `hollows_crystal`, a `crystal_violet` broken; `rift`, a `skyfruit` in a pack |
| `site:village` | seen, read, born | Within 12 strides of the well | A house of the village has `bed` true by `villageHouses` (A.5), and a `bedroll` is broken at its furnishing cell (the last column of A.5's table, or `(hx - sx, hy + 1, hz - sz)` with `sx`, `sz` of `house()`, where a village made before step 4 has it), or a player's feet are inside that house (`\|fx - hx\| < hw`, `\|fz - hz\| < hd`, `hy < fy <= hy + 3`); Desik |
| `site:ruin` | seen, read, born, sand | Within 12 strides | Its chest is opened; Desik |
| `site:dungeon` | seen, read, born, sand | A player's feet are in a room of one, by `dungeonRooms` (below) | A made bait or a `recall_stone` comes out of its chest; Kammār |
| `site:cache1`, `site:cache2` | seen, read | Within 8 strides | Its chest is opened |
| `site:arena1`, `site:arena2`, `site:arena8` | seen, read, born, sand | Within 16 strides of the stone | The stone's first kill; Desik |
| `site:arena3` to `site:arena6` | seen, read | Within 16 strides of the stone | The stone's first kill |
| `site:arena7` | seen, read, born | Within 16 strides of the stone | The stone's first kill; Desik |
| `site:burned_hearths` | seen, born, sand | A player's feet are inside a house of a burned village, by `villageHouses` (below) | Desik. It has no `read`: nothing in the houses settles it (2.8) |
| `site:fire_ring` | seen, read, born, sand | Within 16 strides of the fire | An `ash_token` is broken out of the floor; Vāhak |
| `site:hearth` | seen, read, born | A player breaks a hearthstone, or stands on one, by `villageHouses` (below) | A `ward_core` is in a pack; Rehakār |
| `site:crossing` | seen, read | Within 12 strides | The site seen in a second place |
| `site:pan` | seen, read | Within 12 strides | A `salt_crust` is broken. It drops nothing, and only a clean pan has it |
| `site:fold` | seen, read | Within 12 strides | The site seen in a second place |
| `site:lone_tree` | seen, read | Within 12 strides | A `star_leaves` is broken on `dim:0`. On the living ground only a `lone_tree` has it, and leaves drop no leaves (`src/data/blocks.ts:31-34`) |
| `site:prints` | seen, read | Within 12 strides | The site seen in a second place |
| `site:tree_floor` | seen, read | Within 12 strides | The `lantern` at `(x - 2, F + 1, z - 2)` or the `bedroll` at `(x + 1, F + 1, z + 1)` is broken, with `F = heightAt(x, z) + f` the height of the floor and `f` drawn from the row's `r` as the build draws it (A.3). The `crate` does not count: it drops nothing (`src/data/blocks.ts:198`) |
| `site:quarry` | seen, read | Within 12 strides | The `rough_block` at `a = 1`, `b = 0`, height `y + 1` is broken |
| `site:column` | seen, read | Within 12 strides | The `bedroll` at `(x + 1, heightAt(x + 1, z) + 1, z)`, with `(x, z)` the moved origin, is broken |
| `site:lamp_row` | seen, read | Within 12 strides of its first lamp, at a vault whose three lamps all hang (A.1, A.3) | The site seen in a second place, at a vault whose three lamps all hang. Its region is that of the `cache1` it runs from (D.2) |
| `site:stump` | seen, read | Within 12 strides | The site seen in a second place |
| `site:shaft` | seen, read | Within 12 strides | Its chest, on the floor of the column `(x, z)`, is opened |
| `material:<key>`, the ten hardnesses | seen, read; born for `lumenite`, `cinder`, `umbrite` | A piece of it is first in a player's pack | For the first nine, a pick of it first breaks the next rock: a block whose `power` in the block table equals the pick's own `power` (`TIERS`, `src/data/items.ts:28`), the hardest rock that pick takes and the one under it does not. For `eclipse`, whose `power` 10 no block needs (the most any block needs is 9, `eclipsium_ore`, `src/data/blocks.ts:115`), a Gahan pick first breaks `eclipsium_ore`; Kammār, and for `lumenite` Rehakār |
| `matter:gold` | seen, read | `gold_bar` in a pack | `boss:2` |
| `matter:lees` | seen, read, born, sand | The first coin paid at a kill | An animal is killed and pays none; Vāhak |
| `matter:crystal` | seen, read, born, sand | `mana_crystal` in a pack | Both of two events, in either order: a `pot_crystal` is in a pack, and a `crystal_cyan`, `crystal_violet` or `crystal_amber` is broken. The read text speaks of both, so it waits for both. The host keeps each as a flag set once: the first is `cx:old:pot_crystal.seen`, which opens on the same event, and the second is `cx:matter:crystal.broken`, set the first time any player breaks one of the three. `broken` is none of the step names of D.1, so the codex shows nothing for it, as for `at` (D.2); Rehakār |
| `matter:salt` | seen, read | The sight event of `site:pan` at a clean pan (A.3) | A `brood_nest` is broken |
| `matter:remains` | seen, read, born, sand | One of the raw remains in a pack: `shade_essence`, `spore_sac`, `moth_dust`, `shard`, `rift_scale`, `moon_sliver`, `thorn`, `gel`, `chitin`, `frost_fang` or `rust_core`. These are the drops of feeders that are a feeder's own body (6.3, 7.3). The other drops of feeders are not: `bone` is what is left in the pot, `fiber` and `hide` come off animals too, `ember_dust` is a fuel with coal, `bog_pearl` is set lees, and ore, bars, arrows, `glowshroom` and `mana_crystal` are what a feeder carried | A totem is first used; Posak |
| `matter:great_remains` | seen, read, born, sand | `boss:1` | A forge of remains is first lit; Vejja |
| `people:householders` | seen, read, sand | `npc:wayfinder` | Two householders are housed |
| `people:sand` | seen, read, born | The first `ashen` or the first `fire_ring` | An `ash_token` is in a pack; Desik |
| `people:peopls` | read, born, sand | (it has no `seen`) | `read` opens on its evidence alone: a second player joins, or the first fall. `born` opens once `read` is open and any householder is housed. `sand` opens once `read` is open and `npc:deserter` is set |
| `old:cutter_saw`, `old:ward_core`, `old:pot_crystal` | seen, read | The thing is in a pack | For the saw, a tree is cut at the foot, as for `ground:set`, by a player whose held slot holds the `cutter_saw`. For the core, it is set down within 3 strides of `bedrock`. For the jar, it is broken into crystal |
| `old:made_bait` | seen, read, born, sand | A bait is taken from an old chest | A second kind of bait is taken from an old chest; Desik |
| `old:old_bed` | seen, read, born | A `bedroll` is broken at a cell where a build set one: a village house's furnishing cell (as for `site:village`), a `tree_floor` or a `column` (as for those sites) | A player rests on one; any householder |
| `old:recall_stone` | seen, read, born | A `recall_stone` is in a pack | It is used; Rehakār |
| `old:token` | seen, read, sand | An `ash_token` is in a pack | One is spent with the Deserter |
| `ground:floor` | seen, read | A player digs to `bedrock` | A `ward_core` is in a pack, or a player's feet are in one of the four columns of a `shaft` (A.5), in the cell over the first `bedrock` from the top of that column |
| `ground:set` | seen, read | A block is set with air in the cell under it | A tree is cut at the foot: a player breaks a block made by `wood()` whose key ends `_log`, where the cell under it holds no such block and the cell over it holds one. The logs over it stay, since set ground stays (1.2) |
| `ground:way` | seen, read, born, sand | The first fall | A `recall_stone` is used; any householder |
| `ground:light` | seen, read | The first `torch` is set | A `gloomshade` moves from a cell whose block light is 0 into a cell whose block light is 1 or more, within 16 strides of an active player with no opaque block between (the test of `sight` in D.3). Block light is the realm's `light.block` (`src/sim/light.ts:59`) at the cell of the creature's feet, read once a step |
| `ground:moon` | seen, read, born | The first night | The first `moon` ends; Desik |
| `ground:ward` | seen, read, born, sand | `npc:wayfinder` | A `raid` starts with a townsperson housed; the householder housed first |
| `ground:hosts` | seen, read, born, sand | `boss:1` | The second first kill; Desik |
| `ground:mouth` | seen, read, born | A second player joins, or the first fall with no bed | A player digs to `bedrock` within 16 strides of the spawn; any householder |

**Where a player stands in a house or a room.** Three subjects open on a place that no block and no distance from an origin marks: a hearthstone is a plain `wardstone`, the same block as in a dungeon, a `crossing` and the floor of `arena3`, and a house or a room lies where the build's own draws put it. The host works them out once a second for each active player, from the seed and the climate alone, with the two functions the builds themselves call, so the host and the ground cannot disagree.

- *Houses.* For each `village` region whose origin can lie within 40 strides of the player across the ground (the player's region and those of its eight neighbours that come that near), `villageHouses(rx, rz, seed, cl)` (A.5, `hearth`) gives the houses. A house's walls stand on the columns `hx - hw` and `hx + hw`, `hz - hd` and `hz + hd`, its floor at `hy` and its roof at `hy + 4`. The player's feet are the cell `(floor(px), floor(py), floor(pz))`.
- *`site:hearth`.* A player's feet are in the cell over a house's `hearth` (standing on it), or a player breaks the cell `hearth`, and in either case that cell holds, or held, `wardstone`.
- *`site:burned_hearths`.* `burned` is true for the village, the player's feet are inside a house (`|fx - hx| < hw`, `|fz - hz| < hd`, `hy < fy <= hy + 3`), and the `hearth` cell of that house holds `wardstone`.
- *`site:dungeon`.* `src/world/gen/structures.ts` exports `dungeonRooms(x, z, r)`, which makes the draws that open the `dungeon` build today (`n`, then for each room after the first: across or along, the length, the sign) and gives the middle `[x, z]` of each room, clamped as today. The build calls it with its own `r` and goes on drawing from that `r` for the crates, as today. The host calls it for each `dungeon` region whose origin can lie within 40 strides of the player across the ground, with the origin `structAt` gives and `r = mulberry32(hashInt(rx, 37, rz, seed))`. The player's feet are in a room when they lie within 4 of a room's middle in x and in z, and from the origin's `y` to `y + 4`, the air inside its shell.

The test `wardstone` in the cell `hearth` is what keeps the first two from opening in a village built before step 4: such a house has a plank there and no stone, and no burned floor (A.5, *Placed*). Test: for 20 seeds, a bot walked to the `hearth` cell of every house of the village nearest the spawn opens `site:hearth` on the first, and a bot walked through the houses of a burned village opens `site:burned_hearths` on its first step over a floor, and a bot walked through every house of a village that is not burned opens `site:hearth` and never `site:burned_hearths`. A bot walked from the origin of a `dungeon` to the middle of its last room opens `site:dungeon` in the first room, and a bot in a cave beside the shell, outside every room, does not.

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
| The villages | The householder met at the well at dusk holds a house through the night, as on any night, and on the dark night says so (`walker.say:dark`) | step 4 (C, row 18) |
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
| The text | `eight.loss:b_sovereign` opens at the dawn after the eighth night from the kill, by the flag `bossday:8:<d>` (D.2, D.3): what the nights are now | step 4 (D) |
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
| kinds of ingredient `#log`, `#planks` | log, planks | The words after "Any" in a tooltip, `tag.name:log` and `tag.name:planks` (J step 4). Written in lower case, inside a line |

## J. Order of work

1. Writers start now, from `text/README.md`. Nothing they write waits on a builder, except that `beast.habit` and `beast.once` follow D.3 as written.
2. After the multiplayer merge, run `surfaces.mjs` again on the merged tree. The entries it marks `branch: "main"` (the join screen, the reconnecting strip, the load timeout, the toasts `toast:bait_returned`, `toast:bed_lost`, `toast:resting.one` and `toast:resting.many`, the list of players `hud:roster.*`, the name tag `hud:tag.state`, the ping label `hud:ping.unnamed` and the notes of the chat log `chat:*`), the lines of `never_shown` it marks `branch: "main"`, and every place in `at` marked `(main)` are then in this tree and become ordinary entries; the script stops on any shown literal the merge moved, and the writers get the difference. Then builders take C.1 first: nine changes, each with its test.
3. Then A and B, which touch only `src/world/gen/` and the block and item tables. Run `surfaces.mjs` after the tables change: the eight blocks and two items move from its `PLANNED` lists to the source, and it stops until they are moved. `guest_bed_held` needs no move: once the block table has it, the script folds it into the entry of `guest_bed`.
4. Then D and the text loader: one module that reads the six files, looked up by `"<surface>:<key>"`, replacing the entry's literal at every place it is written: each `file:line` its `at` lists, or its `file` and `line` where it has no `at`. A literal written several times ("Back", "On", "Off", the slot labels, the default name "Player") is replaced at every one. `tip:slot_empty` takes its `{slot}` from `win:slot.head`, `win:slot.body` and `win:slot.legs`. A fall by a projectile sends the cause `'a projectile'` (`src/sim/projectiles.ts:100`), which `src/game.ts:302` writes today as `Slain by a projectile`, through `fall:cause.slain`: the loader writes `fall:cause.shot` as the whole line for that cause, and fills `{name}` of `fall:cause.slain` only with a creature's or a block's name from `names.json`. A tooltip prints a piece's numbers from its `stats`, with the names of `stat`; the descriptions carry none, where today a trinket's description is its numbers. The line under each active state on the HUD, which `buffLine` (`src/ui/hud.ts:34-38`) builds and `src/ui/hud.ts:71` shows, takes the word after each number from `hud:buff.<key>`, the entries made from `STAT_WORDS` (`src/ui/hud.ts:32`): the loader replaces each word of that literal with its entry, and a key that has no `hud:buff` entry is written with the text of its `stat:<key>` entry, never as the bare key. Words that code puts into a line or after a number are entries too, and the loader writes each at its place. `realm:dir.<k>` replaces the eight words of the list at `src/ui/questView.ts:43`, in its order (`e`, `se`, `s`, `sw`, `w`, `nw`, `n`, `ne`), and so fills `{direction}` of `realm:compass.altar`. `realm:place.0` to `realm:place.2` fill `{place}` of `realm:compass.in` (`src/ui/questView.ts:37`) and `realm:cross.out` (`src/sim/travel.ts:58`) by the place's number: the loader writes them where those two lines read `DIM_NAMES` (`src/core/constants.ts:22`), and `DIM_NAMES` itself is left as it is for any code that does not show it. `menu:preset.low`, `.medium` and `.high` are the text of the three preset buttons at `src/ui/menus.ts:56`; the preset's key in the settings stays `low`, `medium` or `high`. The slider values at `src/ui/menus.ts:69-89` are written through `menu:unit.chunks` (render distance, line 69), `menu:unit.percent` (lines 71, 82, 85, 86 and 89; line 82 keeps `menu:ui_auto` at its leftmost stop) and `menu:unit.times` (line 72, with `menu:off` at 0), each with `{n}` the number the code gives today; the field of view and the mouse sensitivity are the number alone. `hud:dist.m` and `hud:dist.km` are the distance under the compass marker at `src/ui/hud.ts:230`, below 1000 and from 1000 on, with `{n}` the number the code gives today. Where an entry's `at` lists a place written in another form than its `file` and `line` (`hud:coins` at `src/ui/windows.ts:293`, which writes `inv.coins + ' coins'` in the inventory window), the loader writes the entry there as well, with the same slots. Two toasts of the multiplayer code have entries of their own, so a line of one is never written over another: `toast:bait_returned` replaces the toast of `refund()` at `src/sim/boss.ts:93` (main), sent when a fight ends unfinished and the bait goes back to the player who laid it, and `toast:bed_lost` replaces the toast of `tickSleep` at `src/sim/player.ts:265` (main), sent when a bed the player set is no longer a bed. `toast:kill_coins` replaces the coins floated up over a kill for the player they go to, `src/sim/loot.ts:17` (`:64` on main), which `src/client/fxplay.ts:35` draws through `hud.floater`; `{n}` is the coins, and the line says coins as `toast:coins` does, never `c`. The resting toast of `tickSleep` (`src/sim/player.ts:247-248`, main), sent to everyone on the living ground while some but not all of them are in a bed, is written whole through `toast:resting.one` when one is in a bed and `toast:resting.many` when two or more are, with `{names}` every name but the last joined with a comma and a space, `{name}` the last, `{n}` how many are in a bed and `{m}` how many the night waits for; the code no longer builds the line from `' is'`, `' and '` and `' are'`. The list of players held open by Tab (`src/ui/roster.ts`, main) is written through `hud:roster.alone` and `hud:roster.count` (its head, line 38), `hud:roster.you` (the player's own row, line 45), `hud:roster.state.away`, `.asleep`, `.fallen` and `.loading` (the four words of `STATE`, line 5, by key), `hud:level` (line 46) and `hud:dist.m` (line 45); its third column is the name of the place from `names.json`, as `realmName` gives it. The name tag over another player (`tagText`, `src/ui/hud.ts:67`, main) is written through `hud:tag.state` where `stateOf` (`src/client/social.ts:39`, main) gives a state, with `{name}` the player's name and `{state}` filled from `hud:roster.state.away`, `.asleep`, `.fallen` and `.loading` by key, as in the list; the bare key is never written, and with no state the tag is the name alone. The label of a ping marker in the world (`src/ui/hud.ts:413`, main) is the ping's name, a comma and a space, and then `hud:dist.m` with `{n}` the distance; where the ping carries no name, `hud:ping.unnamed` stands in place of the name. `menu:game_name` is the heading of the loading box (`src/game.ts:181` and `:368`) and of the boxes at `src/main.ts:40`, `:54` and `:61`: its text is the slot `{title}` alone, and the loader fills it with the name of `GAME_TITLE` in `names.json`, in capitals, so the name of the game is never written in a text file. The notes the chat log adds (`src/client/social.ts`, main, drawn in italic by `src/ui/chat.ts`) are `chat:joined` (line 111), `chat:renamed` (lines 112 and 118), `chat:went` (line 117) and `chat:left` (line 128); the `{place}` of `chat:went` is filled from `realm:place.0` to `realm:place.2` by the place's number, as for `realm:compass.in`, and `realmName` is not used there. The fallback `'Elsewhere'` of `realmName` (`src/client/social.ts:53`, main) is listed under `never_shown`: `DIMS` has the three places 0 to 2 and a player is only ever in one of them, so the fallback is never reached and the loader leaves it as it is. `menu:join.connecting` is written at `src/ui/menus.ts:249` and on the reconnect path at `src/main.ts:156` (both main). `cmd:gear` and `cmd:located` are the answers of `gear` and `locate` at `src/sim/cheats.ts:68` and `:72`. `toast:bed_gone` is written only at the two places of `src/sim/travel.ts` its `at` lists, where the player is sent to the spawn. `toast:folk_ground` is also the answer of the bed check at `src/sim/npcs.ts:90`, and `toast:worn_twice` the answer of `refusal()` at `src/sim/rules.ts:68`. `tip:src.any` is written at `src/data/sources.ts:30` and at the head of an ingredient line of the recipe tooltip, `src/ui/windows.ts:623`. `tip:src.any_in` is written at `src/data/sources.ts:15`, where `nameOf` gives `'any ' + tag` for a smelt that takes a kind of ingredient, and it is then the `{item}` of `tip:src.smelt`. The `{tag}` of both is filled from `tag.name:<tag>`, the entries made from the `'#'` keys of `src/data/recipes.ts` (`tag.name:log`, `tag.name:planks`); the bare key is never written. `tip:compared` heads the comparison at `src/ui/windows.ts:568`, with `{name}` the name of the worn piece from `names.json`, and `tip:no_difference` follows it as today. On every row of a shop, `src/ui/windows.ts:431`, the price is `win:shop.price_coins` where the row is paid in coins and `win:shop.price_tokens` where it is paid in tokens, with `{n}` the price. The fallback `'summoning item'` at `src/sim/actions.ts:277` is listed under `never_shown`: every altar has a bait, so `eight.line:altar_waits` always names an item, and the loader leaves the fallback as it is. The font has ASCII and Ā ā ī ū and nothing else. Six glyphs it lacks are written by the code today: the middle dot (U+00B7), the arrow (U+2192), the heavy tick (U+2714), the pointer (U+27A4), the multiplication sign (U+00D7) and the degree sign (U+00B0). The loader takes each out, at these places (line numbers of this tree before the multiplayer merge; step 2 moves them with the rest):
   - Middle dots that code puts between two pieces, outside any literal of `_surfaces.json`. Each is replaced by a comma and a space. `src/ui/windows.ts:584` joins the click hints of a tooltip. `src/data/sources.ts:32` joins the two sources of an item (`tip:src.*`). `src/ui/windows.ts:397` joins `win:stats.attributes` and `win:stats.to_spend`. `src/ui/windows.ts:407` joins a townsperson's name and `win:shop.tokens` in the shop heading. `src/ui/hud.ts:217` writes the position and the clock: the loader writes `hud:coords` there whole, and the code puts no dot of its own. `src/ui/roster.ts:46` (main) joins the place and the state with a comma and a space. `src/ui/hud.ts:413` (main) joins the name of a ping, or `hud:ping.unnamed`, and its distance with a comma and a space.
   - Middle dots inside a literal that has an entry: `src/ui/menus.ts:142` (`menu:world.line`), `src/ui/menus.ts:226` (`fall:lost`), `src/game.ts:302` (`fall:at`), `src/ui/hud.ts:254` (`hud:no_arrows`), `src/ui/windows.ts:230` (`win:book.keys`), `:281` (`win:pack.keys`), `:393` (`win:stats.level`), `:589` (`tip:kind`), `:593` (`tip:rate`), `:597` (`tip:mining`), `src/sim/player.ts:119` (`banner.sub:level`), `src/sim/travel.ts:109` (`banner.sub:first`), `src/ui/hud.ts:67` (`hud:tag.state`, main). The text written for the entry has none, and where the code adds the dot round it (`fall:lost`, `fall:at`, `hud:no_arrows`) the code writes a comma and a space in its place.
   - The chapter titles of the Guide, `src/data/quests.ts:4`: numeral and name are joined with a full stop and a space (E.1).
   - The arrow between the crafting grid and its output, `src/ui/windows.ts:189`. The loader writes the element empty, and the stylesheet's `.arrow` rule draws the arrow as a pixel shape, as the slots and bars are drawn.
   - The three markers of a Guide row, `src/ui/windows.ts:266`: the tick of a done task, the pointer of the current one and the middle dot of one not reached. The loader writes no marker. The row takes the class `done`, `cur` or `todo`, and the stylesheet draws the mark of each as a pixel shape at the left of the row.
   - The tick in the toast of a finished task, `src/sim/quests.ts:37`: `toast:task_done` has none, and the code writes the text as given.
   - The multiplication sign between a count and an ingredient, `src/ui/windows.ts:624`: `tip:needs_n` replaces the whole line.
   - The degree sign after the field of view on its slider, `src/ui/menus.ts:70`: the value is written as the number alone.
   The same holds for every other literal of `_surfaces.json` whose `now` has a middle dot: the code that joins it writes a comma. The literals `_surfaces.json` lists under `never_shown` (the F3 overlay of `src/game.ts:633-642` and `src/ui/debug.ts:25`, the usage lines, toggles and hashes of the developer commands in `src/sim/cheats.ts`, with the two usage lines `flag <name>` and `event raid|moon|ashen` that main adds at `:66` and `:67`, the `tickstats` reply of `src/net/host.ts:409` and `:411`, and the rejection the developer tools get on a joined client, `src/main.ts:131` (main), which reaches only a developer's console) are a developer's readout of numbers, names of arguments and code words, and are no game text: the loader leaves them as they are, and they keep ASCII only.
5. Then C.2's step 4 rows and F.
6. `surfaces.mjs --check` and `textlint.mjs` run with the other checks of the build, and so do the tests of K.

## K. Two rules the build proves by test

Reading cannot settle either of these for good. The ground changes with every seed, and `main` gains strings while the multiplayer work goes on. So the build of step 4 settles both by test, and its gate fails while either fails.

### K.1 What the sight names stands

A.1 says that a site has a sight point only where its build has set every piece its lines name. The build proves it. For every row of A in the table below, it adds a generator test. The test draws origins of that row with `structAt`, region by region, over at least 8 seeds, until it has at least 300 origins. For `hearth` and `burned_hearths` an origin is a house that `villageHouses` gives, and for `lamp_row` it is a vault whose three lamps all hang (A.3). It builds every chunk within the row's radius, or its `reach`, with the real generator: terrain, caves, trees, then `stampStructures`. Then it checks the cells one by one against every assertion in the row. Each assertion comes from the `site.sight`, `codex.seen` and `codex.read` lines of `text/sites.json` as they stand now.

An origin that fails an assertion is a fault in the row, never in the text. The build tightens the row's test, so that no origin stands where it fails, or its build, so that the piece is set whatever the cell held, and runs the test again until no origin fails. It never loosens a line to fit what was built. If a writer later changes a line, the assertions for that row change with it before the text ships. *Origin* is `(x, y, z)` as `structAt` gives it, with the build's own names for its parts (A.3, A.5). *Top* of a column is the cell at its `heightAt`.

| Row | From `site.sight` | From `codex.seen` | From `codex.read` |
| --- | --- | --- | --- |
| `crossing` | The shore end has `heightAt` of `SEA` or more. At least three stones: `wardstone` at `SEA` on columns 0, 2 and 4 of the line and on every second column to the last stone. Each of those columns is `ocean` and has ground below `SEA`. The cell over every stone but the last is air | The cell at `SEA` of every gap column, 1, 3, 5 and on to the one before the last stone, is `water` and not `ice`, with air over it. The last stone has a second `wardstone` over it and air over that | Every stone is at `SEA`, the waterline. No column of the line has a stone at any other height |
| `pan` | All 24 rim cells at `y` are `sandstone`, with air over each. The origin is `beach`. Every column of the ring one stride outside the rim has `sand` at its top | A pan with no `village` origin within 160 strides has 25 `sandstone` floor cells at `y - 1` and 25 `sand` cells at `y`. A pan with one has 25 `salt_crust` floor cells and air at `y`. Of all the pans drawn, more than half are of the first kind and at least one is of the second | Every clean pan has a `village` origin within 160 strides, and no full pan has one |
| `fold` | Each run has 5 to 9 columns from the origin along its direction. In each, the two cells over the top are `cobble`. The origin holds the corner in both runs. The oak's column, one stride along both runs, has `oak_log` in the cell over its top | In every run column, the cell over the two `cobble` is not `cobble` | The column one past the end of each run has no `cobble` in the two cells over its top |
| `lone_tree` | `star_log` from the cell over the origin's top, 4 to 7 high, with `star_leaves` in its crown. In every column with `dx * dx + dz * dz <= 36`, no cell above the top holds a `_log` block other than this trunk, nor a leaf block other than `star_leaves`. `flower_white` over the top of `(x + 4, z)` and `flower_blue` over the top of `(x - 4, z + 1)` | The spawn test of `src/sim` refuses a feeder in the cell over the top of every column under the crown. The drop table of `star_leaves` holds `skyfruit` | The island generator, over the same seeds, sets both `flower_white` and `flower_blue` on island columns |
| `prints` | `snow_prints` over `snowy_grass` on columns 0, 1 and 2 of the line, and every print on the line stands on `snowy_grass` or `snow`. No print lies more than 12 steps out | The column one step behind the origin has no `snow_prints`, and neither does the column one step past the last print. No `snow_prints` lies within the radius off the line | (nothing it names is built) |
| `fire_ring` | `great_fire` at `(x, y + 1, z)`. `ash_glass` in every cell at `y` with `dx * dx + dz * dz <= 25`. 6 to 10 houses: `sandstone` floor at `y`, `sandstone_bricks` at `y + 1` and `y + 2` on every wall cell but the doorway, `sandstone` roof at `y + 3`. The doorway holds a door at `y + 1` and `y + 2` in the wall that faces the fire | A block entity of kind `fire` at the fire. The three stacks: `kapok_log`, `kapok_log` and `oak_log` in their four columns at `y + 1` and `y + 2`. Within the radius, no `chest`, `crate`, `bedroll`, `guest_bed`, `furnace`, `furnace_lit` or forge of remains (`emberforge`, `voidkiln`, `prism_crucible`, `eclipse_forge`) | The drop table of `ash_glass` holds `ash_token` |
| `burned_hearths` | In every house of a burned village, each of the eight cells round the `hearth` cell at floor height that lies inside the floor is `charred_planks`. Every other cell of the house is what `house()` sets for an unburned house | No `charred_planks` lies anywhere in the village but round a hearthstone. Every house has its `crate` with a block entity of kind `crate` and the loot `village` | (it has no `read`) |
| `tree_floor` | The 25 cells at `F` are `kapok_planks` or a `_log` block. `F` stands 5 to 12 above the top of each of the 25 columns. `lantern` at `(x - 2, F + 1, z - 2)`. The build sets no cell between the top of any of the 25 columns and `F` | `crate` at `(x + 1, F + 1, z)` with a block entity of kind `crate`, and `bedroll` at `(x + 1, F + 1, z + 1)`. The cell under each of the lamp, the crate and the bedroll is `kapok_planks` | The `bedroll` cell holds a `bedroll` |
| `quarry` | Air in every cell from `y + 1` to `BUILD_MAX` of the 42 box columns, but the `rough_block`. Every back face column from `b = -3` to `b = 3` has a top of at least `y + 3`. Exactly one `rough_block` within the radius | All 42 floor cells at `y` are `stone`. In every face column, every cell from `y + 1` to its top is `stone`. `rough_block` at `a = 1`, `b = 0`, height `y + 1` | (nothing it names is built beyond the cut and the block) |
| `column` | The moved origin's `heightAt` is at least that of every column within 6 strides. `cobble` from the cell over its top up at least 10 cells, and air in the cell over the last `cobble`. No `cobble` in any of the eight columns round it from two cells over the origin's top up to the column's top | `bedroll` over the top of `(x + 1, z)` and `torch` over the top of `(x - 1, z)`, each at most two below the lowest `cobble` of the column | The `bedroll` cell holds a `bedroll` |
| `lamp_row` | `sporelamp` at `(x, y + 2, z + 10)`, `(x, y + 2, z + 14)` and `(x, y + 2, z + 18)`, four apart. The cell over each is solid | No other `sporelamp` in the passage, `x - 1` to `x + 1`, `y` to `y + 2`, `z + 4` to `z + 23` | The three lie on the line `x` that runs to the vault's doorway at `(x, y, z + 3)` |
| `stump` | At least two columns within three strides with `skyturf` on top, one `prism_crystal` over it and air over that. At least one column with `9 < dx * dx + dz * dz <= 36` with `skyturf` on top and two or more `prism_crystal` over it | Every stump and every whole spire counted is `prism_crystal` | The creature `shardling` has a spawn on the surface of `dim:2` |
| `shaft` | `wardstone` at `T` in all twelve ring columns. Air in all four shaft columns from `T` down to the cell over the first `bedrock` from the top. The floor lies at least 80 below `T` | Every ring cell from 1 to `T - 1` that is not `bedrock` is solid and opaque: no air, water or `lava` in the ring. A `chest` with a block entity of kind `chest` and the loot `shaft` on the floor of `(x, z)` | The loot `shaft`, rolled 100 times, gives one `cutter_saw` every time |
| `hearth` | In every house, `wardstone` at the `hearth` cell of the table in A.5, opposite the door, at floor height, with air over it | Every house of every village drawn has its hearthstone. The C row 18 bot test also asserts that after nightfall the householder's feet are within one cell of the `hearth` cell of the house it is in | Of all houses drawn, between one in sixteen and one in four have `ward_core` at the cell under the hearthstone, and every other house has `cobble` there |

These tests stand beside the tests the rows of A already give, and do not replace them.

### K.2 Every shown string has its entry

The surface list goes stale whenever `main` gains a string. So the build rebuilds it twice: at the start, on the tree it builds from, and again in its gate, on the tree it ships.

- `node docs/world/play/surfaces.mjs` and then `node docs/world/play/surfaces.mjs --check` both exit 0 on the tree being built. Where the first stops on a literal that moved or is gone, the entry is moved or taken out, and the writers get the difference.
- Every entry the run adds gets its text in the file of its `assign`, in the voice of its surface (H.1 for every `label`), before the gate passes. `node docs/world/play/textlint.mjs` and its `--selftest` exit 0.
- A sweep of the shown-string sources finds no string that reaches the screen without an entry. The sources are those the checkers used: `src/ui`, `src/client`, `src/sim`, `src/data`, `src/net`, `src/game.ts` and `src/main.ts`. The sweep lists every string literal and template in them that holds a word of letters and that the code writes to the page or sends to a player: into `textContent`, `innerHTML`, `title` or `placeholder`, as the text of an element it makes, or in an event the client draws as a toast, a banner, a floater, a name tag, a ping label or a chat note. Each one has to stand at the `file` and `line` of an entry, at a place an entry's `at` lists, or at a line of `never_shown` with its reason. A literal that is a key, a class name, a sound name or a number joined to nothing shown needs neither. Any other literal fails the gate, and the build gives it an entry, with its text in the label voice, or a `never_shown` line that says why no player sees it.
