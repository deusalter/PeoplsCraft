# The play screens: what was decided while building them

The mock screens of the HUD, the pack, the chest, the stations, the shop, the reworking bench, the tooltips and the fall, under `src/ui/kit/screens/`. These are the choices taken where the direction is silent, in its spirit. Builders wiring the game to the kit may rely on them.

**Names.** `?screen=` and `uishot --screen` take: `hud`, `hud-look`, `hud-block`, `hud-first`, `chat`, `roster`, `pack`, `pack-empty`, `pack-full`, `chest`, `workbench`, `anvil`, `lineframe`, `joining`, `furnace-stone`, `furnace-maruhar`, `furnace-guhamat`, `furnace-ratan`, `furnace-kuranga`, `pot`, `shop`, `shop-deserter`, `rework`, `tooltips`, `fall`, `fall-alone`, and the sheet `parts-play`. What the screens share lives in `screens/play/`, which the registry does not read.

**Sample data.** Things, stations, creatures, townsfolk and places are the game's keys and names (`sample/play-items.ts`, `sample/play-patterns.ts`). A player's name is a handle the player chose, so the eight players have handles, one of them long with Ā ī ū in it; no handle borrows a name of the world. Lees Lump stacks to 999 so that the widest count is seen. The pot has no salt to show, because nothing named salt is in the tables: its slot stays empty with a salt silhouette.

**The hand.** `screens/play/hand.ts` plays out the table of section 7 on the sample stores: take, put, join, swap, half, one at a time with the right button held, press and drag, Shift to send, a second quick press to gather, 1 to 9 and Q over a slot, a press outside the slabs to drop. The game will turn the same presses into its ops.

**Moving parts in a photograph.** A browser driven by a script reports `navigator.webdriver`. There the furnace's arrow and flame, the pot's night, the mending pips and the fall's wash stand at a fixed phase, so the frame the shot takes is the frame the grid check paints. Anywhere else they move by the clock.

**Making.** A cell of a pattern the pack cannot afford draws its icon flat in `root.4`, as a row that cannot be used does. Its tooltip lists what goes in, each line `growth.lt` when carried and `blood.lt` when not. A cell read through another station's tab, or a pattern too large for the grid, answers a press with the refusal frame and its tooltip says where it is made. A pattern laid out that the pack cannot fill leaves the silhouettes of what is missing on the grid.

**The figure.** The body as worn is built from rectangles lit on their top and left and shaded on their right and bottom, outlined in `root.0`. A worn piece takes its material's tones (iron in stone, hide in timber, Hīrak in cyan); the rest of the body is a silhouette in `root.3` and `root.2`.

**Furnaces.** The eight stones of a bed are raised squares 12 on a side, in the tones of what the bed is ringed with: dressed stone for the Stone Furnace, deep rock for the Maruhar Furnace, hollow rock, island rock, black glass. The Stone Furnace's hollow is a locked slot with nothing in it.

**Cut lines.** A cut line is a groove of `pit` over `hi`. On the Joining Bench it is lit, `ember` over `ember.dk`, while the two pieces make something.

**Shop.** A householder gives half the price they ask for what they stock, and a little by grade for what they do not. The Deserter's prices are in Mūda, written out after the number, since Mūda has no mark of its own.

**Reworking bench.** It is the Sealed Bench of the old things (8.8), built round the Guhamāt Remains. The modifier it draws is one of the game's own for that kind of piece.

**Narrow.** Under 400 units the Workbench, the Anvil, the Line Frame and the Joining Bench carry two side tabs, the station and its patterns; the patterns stand in the grid's place with "Can make" beside the kind button and a well eight cells wide under them. The pack does the same with its three tabs, as the direction says.

**Layout check.** `scripts/uilayout.mjs` builds every mock screen under Node at 320, 400, 427, 480 and 573 units wide, paints it on a grid surface, and fails on a part off the screen or off the grid, on two stops for Tab that overlap (tabs that share an outline column excepted), and on a screen that throws. With `--png <dir>` it writes what the grid holds, which is how the narrow screens are seen, since the shot script takes the wide ones.
