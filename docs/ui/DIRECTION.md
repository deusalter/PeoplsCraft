# The interface of Peopls Craft: direction

This is the whole direction for the drawn interface. Builders follow it to the unit. Critics judge screenshots against section 9. Where a diagram and a sentence disagree, the diagram stands.

A **unit** is one cell of the interface's grid. Every diagram below is one character to the unit. Coordinates are `x, y` from the top left of the part or screen named, x to the right and y down, in units. A size is `width by height`.

Contents: 1 Stance. 2 Palette. 3 Scale and layout. 4 Letters. 5 Parts. 6 Screens. 7 Behaviour. 8 Architecture. 9 Forty checks.

---

## 1. Stance

The interface is made of the four things every hearth on this ground already has: fired clay, salt, lees and the black wood of the root. A window is a slab of salt-fired clay, pale and warm, with a bloom of salt on the edges that face the light. Its outline is root-black, which is cold and close to blue. What is written on it is written in lees, a dark brown-violet ink. Where the work is carpentry the slab is timber, and where the work is fire or iron the slab is dressed stone, cut flat as the first comers cut theirs. Whatever is held up against the world (the hotbar, a tooltip, the compass, chat) is a plate of root-black with letters in salt. Gauges are hollows and cut lines that fill, because on this ground a working runs along a line cut from a hand to a thing. Life is a drop, hunger is a bowl, the arm is a hand. The light comes from the top left on every part and every icon. The interface refuses grey vanilla slabs, dark glass with one accent colour, every gradient, glow, blur and soft shadow, every rounded card and hairline, every system letter and spaced-out capital, every percentage written inside a bar, and every mark that is there only to decorate.

Three rules follow and are used everywhere below.

1. **Laid on a bench, or held up.** A container is a light slab (clay, timber, stone) with ink on it. A readout is a dark plate with salt on it, or bare salt on the world with its shadow. No screen mixes the two roles: there is no dark window. The one light part of the HUD is the toast, which is not a readout but a small slab handed in from the edge, as the tradition hands its notices.
2. **A hollow that fills.** Progress, fuel, heat, a count toward a step, loading: each is a shape sunk in its slab that fills unit by unit in a flat colour. Nothing spins and nothing is a number with a percent sign.
3. **Plain.** A part carries no ornament. If a line is on a slab it separates two things or joins two things.

---

## 2. Palette

49 colours. No opaque part of the interface uses any other. Each ramp runs light to dark and its hue moves as it darkens: clay from yellow toward red-brown, timber from yellow-orange toward wine, stone from green-grey toward blue-grey, root stays cold. The **Code** is the character that stands for the colour in every diagram of this document.

| Name | Hex | Code | Use |
| --- | --- | --- | --- |
| `root.0` | `#0c0d13` | `K` | outline of every part; text shadow; the dim behind windows |
| `root.1` | `#191b26` | `k` | face of dark plates: tooltip, toast, readout, hotbar floor, list well |
| `root.2` | `#2a2d3c` | `j` | raised or hovered row on a dark plate; empty gauge and pip; face of a block of the ground tile |
| `root.3` | `#454a5e` | `h` | light edge of a dark plate; dividers on dark; disabled text on dark |
| `root.4` | `#8b92a8` | `g` | grey text on dark: the less important lines |
| `salt` | `#f7f2e3` | `W` | white: text on dark and on the world; hottest edge of a clay slab; selector; the outline and wedge of a focused button; lit line of an earned link |
| `clay.lt` | `#e3d7ba` | `L` | light edge of a clay slab; face of a page |
| `clay.face` | `#c9b896` | `F` | face of a clay slab |
| `clay.sh` | `#a68d6e` | `S` | inner dark edge of a clay slab; slot floor in clay; rules on a page |
| `clay.dk` | `#7d6756` | `D` | silhouettes in an empty clay slot |
| `clay.pit` | `#4f403c` | `Z` | dark edge of a clay slab and of its slots |
| `timber.hi` | `#f0c98d` | `e` | hottest edge of a timber slab |
| `timber.lt` | `#d7a265` | `f` | light edge of a timber slab |
| `timber.face` | `#b98049` | `T` | face of a timber slab |
| `timber.sh` | `#8f5a36` | `t` | inner dark edge in timber; slot floor in timber; the boards of a book |
| `timber.dk` | `#663d2c` | `U` | silhouettes in an empty timber slot |
| `timber.pit` | `#402625` | `X` | dark edge in timber |
| `stone.hi` | `#e4e8dc` | `A` | hottest edge of a stone slab; top row of a hovered button and of a key cap |
| `stone.lt` | `#c3cab9` | `G` | light edge of a stone slab; top row of a button; face of a key cap; the label over a field on the ground |
| `stone.face` | `#9da695` | `H` | face of a stone slab |
| `stone.sh` | `#6f7a76` | `J` | button face; inner dark edge in stone; slot floor in stone |
| `stone.dk` | `#4e585d` | `M` | silhouettes in an empty stone slot; lower edge of a button and of a key cap; shade of an open node's link |
| `stone.pit` | `#323844` | `z` | dark edge in stone; dark edge of a disabled button; the lip of a block of the ground tile |
| `ink` | `#2b1f2e` | `I` | text on any light face |
| `ink.faded` | `#5c4c56` | `i` | secondary and disabled text on a light face |
| `blood.lt` | `#f2785c` | `r` | worse-than lines and refusals on dark; lit top of the life fill |
| `blood` | `#c9372f` | `R` | life; boss strip; harm; refusal frame |
| `blood.dk` | `#7c1c2b` | `q` | shade of the life fill; refusal text on a light face |
| `ember.hi` | `#ffe08a` | `y` | label and outline of a hovered button; grade Old on dark; tip of a flame |
| `ember.lt` | `#f7b54a` | `o` | hunger pip light; flame; trail on a draining strip |
| `ember` | `#dd7a26` | `O` | hunger; heat; a working that is running |
| `ember.dk` | `#8a3a1a` | `u` | shade of hunger and flame; grade Island on a light face |
| `growth.lt` | `#b5e36b` | `n` | better-than lines; can-afford; lit top of the practice strip |
| `growth` | `#63ad3c` | `N` | the practice strip; the frame of a slot that accepts what is held; grade Upper on dark and its tooltip frame |
| `growth.dk` | `#235c34` | `m` | shade of the practice strip; grade Upper on a light face |
| `arm.lt` | `#8fd3f5` | `b` | lit top of the arm fill; set-bonus and where-to lines on dark |
| `arm` | `#3d8fdb` | `B` | the arm; the progress arrow at the Line Frame |
| `arm.dk` | `#28488f` | `d` | shade of the arm fill; link and info text on a light face |
| `cyan.lt` | `#58e6d9` | `c` | grade Deep on dark |
| `cyan.dk` | `#0b5a66` | `C` | grade Deep on a light face |
| `violet.lt` | `#c39bff` | `v` | grade Hollow on dark; the strip of Amāvassa |
| `violet.dk` | `#5b34a6` | `V` | grade Hollow on a light face; the wash of a gate |
| `dusk.lt` | `#ff9e57` | `a` | grade Island on dark |
| `rose.lt` | `#ff6f9c` | `p` | grade Floor on dark |
| `rose.dk` | `#96164a` | `P` | grade Floor on a light face |
| `gilt.dk` | `#6b4d08` | `Y` | grade Old on a light face |
| `blood.pit` | `#4a1606` | `Q` | the wash of a fall, and nothing else: a red-brown dark enough that over a blue sky it stays red and never turns violet |
| `grit.lt` | `#77827e` | `E` | the lit side of a pebble in the face of a menu button, and nothing else |
| `grit.dk` | `#67726e` | `w` | the shade of a pebble and a crack in the face of a menu button, and nothing else |

**Ramp roles.** The three slab ramps have the same six roles, lightest first: `hi`, `lt`, `face`, `sh`, `dk`, `pit`. In clay the `hi` role is `salt`. A part drawn on a slab takes its tones from that slab's ramp, so a slot in a timber slab is timber. In the diagrams such tones are the digits `1` to `6` in that order, and the diagram is drawn once for all three ramps.

| Role | Digit | clay | timber | stone |
| --- | --- | --- | --- | --- |
| hi | 1 | `salt` | `timber.hi` | `stone.hi` |
| lt | 2 | `clay.lt` | `timber.lt` | `stone.lt` |
| face | 3 | `clay.face` | `timber.face` | `stone.face` |
| sh | 4 | `clay.sh` | `timber.sh` | `stone.sh` |
| dk | 5 | `clay.dk` | `timber.dk` | `stone.dk` |
| pit | 6 | `clay.pit` | `timber.pit` | `stone.pit` |

**Grades.** The seven grades of `names.json` (`rarity:0` to `rarity:6`). Each has a tone for dark plates and a tone for light faces. A tooltip, a list row in a dark well and the name over the hotbar use the first. A name written on a slab or a page uses the second.

| Grade | Name | On dark (`root.1`) | Contrast | On a light face (`clay.face`) | Contrast | Tooltip frame |
| --- | --- | --- | ---: | --- | ---: | --- |
| 0 | Surface | `salt` #f7f2e3 | 15.3 | `ink` #2b1f2e | 8.1 | `root.4` |
| 1 | Upper | `growth` #63ad3c | 6.2 | `growth.dk` #235c34 | 4.1 | `growth` |
| 2 | Deep | `cyan.lt` #58e6d9 | 11.2 | `cyan.dk` #0b5a66 | 4.0 | `cyan.lt` |
| 3 | Hollow | `violet.lt` #c39bff | 7.7 | `violet.dk` #5b34a6 | 4.3 | `violet.lt` |
| 4 | Island | `dusk.lt` #ff9e57 | 8.4 | `ember.dk` #8a3a1a | 4.0 | `dusk.lt` |
| 5 | Floor | `rose.lt` #ff6f9c | 6.5 | `rose.dk` #96164a | 4.3 | `rose.lt` |
| 6 | Old | `ember.hi` #ffe08a | 13.3 | `gilt.dk` #6b4d08 | 4.0 | `ember.hi` |

Upper on dark is the mid green `growth`, not `growth.lt`: with the light green its name and a better-than line in the same tooltip said two things in one colour.

**Meaning.** Colour is used for these meanings and no others.

| Meaning | On dark | On a light face |
| --- | --- | --- |
| Plain text | `salt` | `ink` |
| The less important line | `root.4` | `ink.faded` |
| The label over a field of a form on the ground, a step quieter than what is typed | `stone.lt` | not used |
| A line from the server or the world in chat, after the `{cairn}` mark | `root.4` | not used |
| A line of the world about a great feeder in chat: its name, then the rest | `blood.lt`, then `violet.lt` | not used |
| A grade | the table above | the table above |
| Better than what is worn or held; can be afforded | `growth.lt` | `growth.dk` |
| Worse; cannot be afforded; a refusal; a warning | `blood.lt` | `blood.dk` |
| A set bonus; where to go | `arm.lt` | where to go: `ink` after the compass mark (5.19); a set bonus: `arm.dk` |
| A link to another page, which can be pressed | `arm.lt` | `arm.dk`, with a rule of itself one unit under its words only while hovered. Blue on a page is kept for what can be pressed, so that a line that cannot be pressed never reads as a link |
| The hovered button's label | `ember.hi` | not used |
| One of the eight players | their colour, below | their colour as a 2 by 7 flag beside a name in ink |

**The eight players.** A player's colour goes by the seat the server gave them, 1 to 8: 1 `arm.lt`, 2 `growth.lt`, 3 `ember.lt`, 4 `rose.lt`, 5 `cyan.lt`, 6 `violet.lt`, 7 `blood.lt`, 8 `salt`. It frames their head on the compass, the map and the roster, their flag on a name tag, their name in chat and their ping.

**Measured contrast** of the pairs the screens use (WCAG ratio):

| Text | On | Ratio |
| --- | --- | ---: |
| `ink` | `clay.face` | 8.1 |
| `ink` | `clay.lt` | 11.0 |
| `ink` | `timber.face` | 4.7 |
| `ink` | `stone.face` | 6.2 |
| `ink.faded` | `clay.face` | 4.1 |
| `ink.faded` | `clay.lt` | 5.6 |
| `salt` | `root.1` | 15.3 |
| `root.4` | `root.1` | 5.5 |
| `salt` | `stone.sh` | 4.0 |
| `root.4` | `stone.pit` | 3.8 |
| `blood.lt` | `root.1` | 6.2 |
| `growth.lt` | `root.1` | 11.6 |
| `growth` | `root.1` | 6.2 |
| `arm.lt` | `root.1` | 10.4 |
| `blood.dk` | `clay.face` | 5.2 |
| `arm.dk` | `clay.face` | 4.5 |

**Washes.** These flat fills over the world are the only translucency in the interface. Each is one colour at one of three strengths: a quarter, a half, three quarters.

| Wash | Colour and strength | In strict mode (section 8) |
| --- | --- | --- |
| The dim behind a window | `root.0` at a half | `root.1`, opaque |
| The dim behind the pause | `root.0` at a half, as behind any window | `root.1`, opaque |
| The strip under a chat line, a name tag, the prompt, the lines under "Paused", the Guide's step, the name of the thing in hand and a pickup on the HUD | `root.0` at three quarters, so that a grey line reads on a noon sky | `root.1`, opaque |
| The shade of a cooling item in the hotbar, covering the icon from the top by whole units | `root.0` at a half | `root.1`, opaque |
| A blow taken: a frame 2 units deep along the stage's edges for 0.2 s | `blood` at three quarters | not drawn |
| The fall | `blood.pit` at a quarter, a half, then three quarters held. Over the noon sky `blood.dk` at a half read as a lilac wash, which is the violet glow this interface refuses | `blood.pit`, opaque |
| Crossing a gate | `violet.dk` at a quarter, a half, three quarters as the crossing fills | `violet.dk`, opaque |

**Later.** The texture pass starts from these ramps. It may add ramps the world needs (leaf, water, sky, the metals). It may not change a value here, and it may not add a tone inside one of these ramps.

---

## 3. Scale and layout

**One scale.** The whole interface is drawn at one whole number of device pixels to the unit, `s`. Device pixels are the canvas's backing pixels: the window's CSS size times `devicePixelRatio`, rounded. Nothing is drawn at a fraction of a unit, at a second pixel size, smoothed, blurred or turned.

- `fit = min(floor(W / 320), floor(H / 240))`, held between 1 and 8, where `W` and `H` are the window in device pixels.
- The setting "Interface scale" offers Auto and each whole number from 1 to `fit`. Auto is `fit`. A stored choice larger than `fit` is drawn at `fit` until the window grows.
- The tradition's range of 1 to 5 was set on screens of one device pixel to the CSS pixel. The cap here is 8 so that a dense laptop screen gets the same physical size.
- **Virtual screen.** `Vw = floor(W / s)`, `Vh = floor(H / s)` units. The device pixels left over are split evenly: the grid's origin is at `floor((W - Vw * s) / 2), floor((H - Vh * s) / 2)`.
- Under 320 by 240 device pixels the interface draws one line in the middle, "The window is too small", and nothing else.

| Window in device pixels | Scale | Virtual screen | Stage | Layout |
| --- | ---: | --- | --- | --- |
| 1280 by 720 | 3 | 426 by 240 | 426 by 240 | wide |
| 1366 by 768 | 3 | 455 by 256 | 455 by 256 | wide |
| 1536 by 864 | 3 | 512 by 288 | 512 by 288 | wide |
| 1920 by 1080 | 4 | 480 by 270 | 480 by 270 | wide |
| 2560 by 1440 | 6 | 426 by 240 | 426 by 240 | wide |
| 3440 by 1440 | 6 | 573 by 240 | 426 by 240 | wide |
| 2880 by 1800 | 7 | 411 by 257 | 411 by 257 | wide |
| 3840 by 2160 | 8 | 480 by 270 | 480 by 270 | wide |
| 1100 by 700 | 2 | 550 by 350 | 550 by 350 | wide |
| 960 by 1080 | 3 | 320 by 360 | 320 by 360 | narrow |
| 800 by 600 | 2 | 400 by 300 | 400 by 300 | wide |
| 640 by 480 | 2 | 320 by 240 | 320 by 240 | narrow |

**Wide and narrow.** A virtual screen 400 units wide or more is **wide**: side panels stand beside their main slab. From 320 to 399 it is **narrow**: side panels fold into side tabs on the main slab, as each screen says in section 6. No screen needs more than 394 by 234 when wide or 314 by 234 when narrow.

**The stage.** The HUD is laid out on the stage: the middle of the virtual screen, as tall as the screen and `min(Vw, floor(Vh * 16 / 9))` wide. On an ultrawide window the corners of the HUD are therefore the corners of the stage, and the world is clear to either side of it. Windows, menus and washes use the whole screen.

**Margins.** A HUD plate stands 4 units from the stage's edge (the hotbar 2 from the bottom, the compass 2 from the top, the toast on the right edge itself, handed in from it). A window stands at least 3 units from every edge of the screen. A tooltip stands at least 2.

**Anchors.**

| Family | Anchor |
| --- | --- |
| Container windows (pack, chest, stations, shop), book screens, tree, map, settings | Centred on the screen: `x = floor((Vw - w) / 2)`, `y = floor((Vh - h) / 2)`. Tabs above or to the left are not counted in `w` and `h`. The world behind is dimmed |
| Title, worlds, new world, join, loading | The ground tile over the whole screen; content in a column 200 wide centred on x; y measured from the top of a block 240 tall that is centred on the screen. The world list alone runs its well by the screen's edges and its buttons from the bottom (World list) |
| Pause | No slab: the title, its lines and the buttons in the menus' column of 200 over the dimmed world, the title's cell 40 down the block of 240 |
| The fall | The same column over the washed world |
| HUD, bottom centre | Hotbar, practice strip, pips, level, name of the thing in hand: centred on the stage, measured up from its bottom edge |
| HUD, top centre | Compass, boss bar, event strips, the readout of what is looked at with the prompt as its third row: centred on the stage, measured down from its top edge |
| HUD, top left | The crew |
| HUD, left, above the pips | Chat |
| HUD, top right | The status frames in the corner, always; the Guide's present step on one line under them; a toast slid in under the step while one shows |
| HUD, right | Pickups, then "Saved" at the bottom right corner |
| HUD, centre | Crosshair |
| Above everything | The tooltip, then the held stack, then the pointer |

**Icon size.** The interface is designed for item icons of 16 by 16 units, one icon pixel to the unit, and never draws an icon at another size. The large result slot holds a 16 by 16 icon in a 24 by 24 floor. Until the icons are redrawn by hand, the game hands the kit a 16 by 16 reading of each present 32 by 32 icon (the top left pixel of every 2 by 2 block). Every icon the kit draws for itself is its own silhouette, outlined in `root.0` and lit from the top left: no two things share an outline, and no thing is another's picture in other tones. A dozen things drawn as one shaded ball in a dozen colours, and every bar as one parallelogram recoloured, read as placeholder marbles. A bar is an ingot with a top face 2 deep and a stamp 3 by 1 on its front, each metal at its own length and height and in its own tones.

---

## 4. Letters

Two faces, both drawn here, both stored as pixel maps. No other letter appears anywhere, a text field included.

### 4.1 The text face

| Measure | Units |
| --- | --- |
| Cell height, and the advance from one line to the next | 10 |
| Row 0 | empty in every glyph but Ā, Ī, Ū, whose macron stands there (below); the macron of ā, ī, ū sits on row 1 over the x-height |
| Rows 1 to 7 | capital height, 7. Ascenders are as tall as capitals. Digits are capital height |
| Rows 3 to 7 | x-height, 5 |
| Baseline | under row 7 |
| Rows 8 and 9 | descenders (g j p q y), the tail of the comma and semicolon, the underscore, the dot under ṭ |
| Between glyphs | 1, always. There is no kerning |
| Space | 3 wide, so it advances 4 |
| Between paragraphs | 4 extra |

The position of a piece of text is the top left of its cell. A title "at 8, 6" has its capitals from y 7 to y 13.

**Character.** The letters are cut, the way lines are cut in a hearthstone: every stroke is one unit wide and straight, and there is no curve anywhere. A bowl or an arch is a rectangle with two of its corners cut off by one unit, always the same two: the top right and the bottom left. The top left and the bottom right stay square, as if every letter had been cut with one flat chisel held one way. So `o` is square at the top left and bottom right; `n`, `h`, `m` and `r` have flat shoulders that start square from the stem; `u` and `w` are closed square at the bottom right; `b` and `p` end square at the foot of the bowl; `d` and `q` start square at its head. Four capitals with a stem on the left (B, D, P, R) have both free corners cut, so that D and O differ in two units. Diagonals are kept for the letters that are nothing else (A's apex is flat; K, M, N, V, W, X, Y, Z and the slash of 0 use them). Lowercase `m` and `w` are 7 wide so that their counters stay open. The crossbar of A sits low, on row 5. The face has no serif except the head and foot of `I` (the head given up under a macron) and the feet of `l` and `1`, which keep the three apart. It is not the face of any other game: do not correct it toward one.

Capitals:

```
A      B      C      D      E     F     G      H      I    J     K      L     M        
.....  .....  .....  .....  ....  ....  .....  .....  ...  ....  .....  ....  .......
.###.  ####.  ####.  ####.  ####  ####  ####.  #...#  ###  ...#  #...#  #...  #.....#
#...#  #...#  #...#  #...#  #...  #...  #...#  #...#  .#.  ...#  #..#.  #...  ##...##
#...#  #...#  #....  #...#  #...  #...  #....  #...#  .#.  ...#  #.#..  #...  #.#.#.#
#...#  ####.  #....  #...#  ###.  ###.  #.###  #####  .#.  ...#  ##...  #...  #..#..#
#####  #...#  #....  #...#  #...  #...  #...#  #...#  .#.  ...#  #.#..  #...  #.....#
#...#  #...#  #...#  #...#  #...  #...  #...#  #...#  .#.  #..#  #..#.  #...  #.....#
#...#  ####.  .####  ####.  ####  #...  .####  #...#  ###  .###  #...#  ####  #.....#
.....  .....  .....  .....  ....  ....  .....  .....  ...  ....  .....  ....  .......
.....  .....  .....  .....  ....  ....  .....  .....  ...  ....  .....  ....  .......
5      5      5      5      4     4     5      5      3    4     5      4     7

N      O      P      Q      R      S      T      U      V      W        X      Y      Z      
.....  .....  .....  .....  .....  .....  .....  .....  .....  .......  .....  .....  .....
#...#  ####.  ####.  ####.  ####.  .####  #####  #...#  #...#  #.....#  #...#  #...#  #####
##..#  #...#  #...#  #...#  #...#  #....  ..#..  #...#  #...#  #.....#  #...#  #...#  ....#
#.#.#  #...#  #...#  #...#  #...#  #....  ..#..  #...#  #...#  #.....#  .#.#.  .#.#.  ...#.
#.#.#  #...#  ####.  #...#  ####.  .###.  ..#..  #...#  #...#  #..#..#  ..#..  ..#..  ..#..
#..##  #...#  #....  #.#.#  #.#..  ....#  ..#..  #...#  .#.#.  #.#.#.#  .#.#.  ..#..  .#...
#...#  #...#  #....  #..#.  #..#.  ....#  ..#..  #...#  .#.#.  ##...##  #...#  ..#..  #....
#...#  .####  #....  .##.#  #...#  ####.  ..#..  .####  ..#..  #.....#  #...#  ..#..  #####
.....  .....  .....  .....  .....  .....  .....  .....  .....  .......  .....  .....  .....
.....  .....  .....  .....  .....  .....  .....  .....  .....  .......  .....  .....  .....
5      5      5      5      5      5      5      5      5      7        5      5      5

```

Lowercase:

```
a      b      c     d      e      f     g      h      i  j    k     l   m
.....  .....  ....  .....  .....  ....  .....  .....  .  ...  ....  ..  .......
.....  #....  ....  ....#  .....  .###  .....  #....  #  ..#  #...  #.  .......
.....  #....  ....  ....#  .....  .#..  .....  #....  .  ...  #...  #.  .......
####.  ####.  ####  #####  ####.  ####  #####  ####.  #  ..#  #..#  #.  ######.
....#  #...#  #...  #...#  #...#  .#..  #...#  #...#  #  ..#  #.#.  #.  #..#..#
.####  #...#  #...  #...#  #####  .#..  #...#  #...#  #  ..#  ##..  #.  #..#..#
#...#  #...#  #...  #...#  #....  .#..  #...#  #...#  #  ..#  #.#.  #.  #..#..#
.####  #####  .###  .####  .####  .#..  .####  #...#  #  ..#  #..#  ##  #..#..#
.....  .....  ....  .....  .....  ....  ....#  .....  .  ..#  ....  ..  .......
.....  .....  ....  .....  .....  ....  ####.  .....  .  ##.  ....  ..  .......
5      5      4     5      5      4     5      5      1  3    4     2   7

n      o      p      q       r    s     t     u      v      w        x      y      z
.....  .....  .....  ......  ...  ....  ....  .....  .....  .......  .....  .....  ....
.....  .....  .....  ......  ...  ....  ....  .....  .....  .......  .....  .....  ....
.....  .....  .....  ......  ...  ....  .#..  .....  .....  .......  .....  .....  ....
####.  ####.  ####.  #####.  ###  .###  ####  #...#  #...#  #..#..#  #...#  #...#  ####
#...#  #...#  #...#  #...#.  #..  #...  .#..  #...#  #...#  #..#..#  .#.#.  #...#  ..#.
#...#  #...#  #...#  #...#.  #..  .##.  .#..  #...#  #...#  #..#..#  ..#..  #...#  .#..
#...#  #...#  #...#  #...#.  #..  ...#  .#..  #...#  .#.#.  #..#..#  .#.#.  #...#  #...
#...#  .####  #####  .####.  #..  ###.  ..##  .####  ..#..  .######  #...#  .####  ####
.....  .....  #....  ....#.  ...  ....  ....  .....  .....  .......  .....  ....#  ....
.....  .....  #....  ....##  ...  ....  ....  .....  .....  .......  .....  ####.  ....
5      5      5      6       3    4     4     5      5      7        5      5      4


```

Marked letters and digits:

```
ā      ī    ū      ṭ     0      1      2      3      4      5      6      7      8      9
.....  ...  .....  ....  .....  .....  .....  .....  .....  .....  .....  .....  .....  .....
.###.  ###  .###.  ....  ####.  ..#..  ####.  ####.  ...#.  #####  .####  #####  ####.  ####.
.....  ...  .....  .#..  #...#  .##..  ....#  ....#  ..##.  #....  #....  ....#  #...#  #...#
####.  .#.  #...#  ####  #..##  ..#..  ....#  ....#  .#.#.  ####.  #....  ....#  #...#  #...#
....#  .#.  #...#  .#..  #.#.#  ..#..  ...#.  .###.  #..#.  ....#  ####.  ...#.  .###.  .####
.####  .#.  #...#  .#..  ##..#  ..#..  ..#..  ....#  #####  ....#  #...#  ..#..  #...#  ....#
#...#  .#.  #...#  .#..  #...#  ..#..  .#...  ....#  ...#.  ....#  #...#  ..#..  #...#  ....#
.####  .#.  .####  ..##  .####  .###.  #####  ####.  ...#.  ####.  .####  ..#..  .####  ####.
.....  ...  .....  ....  .....  .....  .....  .....  .....  .....  .....  .....  .....  .....
.....  ...  .....  .#..  .....  .....  .....  .....  .....  .....  .....  .....  .....  .....
5      3    5      4     5      5      5      5      5      5      5      5      5      5


```

Capitals with a macron are cut to six rows, 2 to 7, with the macron on row 0 of their own cell and row 1 clear between them, so that the mark never leaves the 10 rows its line owns. Drawn on the row above the cell, as they first were, the macron fell among the descenders and strips of the line above and read as a stray underscore belonging to it.

```
Ā      Ī    Ū
.###.  ###  .###.
.....  ...  .....
.###.  .#.  #...#
#...#  .#.  #...#
#...#  .#.  #...#
#####  .#.  #...#
#...#  .#.  #...#
#...#  ###  .####
.....  ...  .....
.....  ...  .....
5      3    5
```

Punctuation:

```
.  ,   :  ;   !  ?      '  "    (   )   [   ]   {    }    -    –      —        +      =      /      \
.  ..  .  ..  .  .....  .  ...  ..  ..  ..  ..  ...  ...  ...  .....  .......  .....  .....  .....  .....
.  ..  .  ..  #  ####.  #  #.#  .#  #.  ##  ##  ..#  #..  ...  .....  .......  .....  .....  ....#  #....
.  ..  .  ..  #  ....#  #  #.#  #.  .#  #.  .#  .#.  .#.  ...  .....  .......  ..#..  .....  ...#.  .#...
.  ..  .  ..  #  ....#  .  ...  #.  .#  #.  .#  .#.  .#.  ...  .....  .......  ..#..  #####  ...#.  .#...
.  ..  #  .#  #  ..##.  .  ...  #.  .#  #.  .#  #..  ..#  ###  #####  #######  #####  .....  ..#..  ..#..
.  ..  .  ..  #  ..#..  .  ...  #.  .#  #.  .#  .#.  .#.  ...  .....  .......  ..#..  #####  .#...  ...#.
.  ..  .  ..  .  .....  .  ...  #.  .#  #.  .#  .#.  .#.  ...  .....  .......  ..#..  .....  .#...  ...#.
#  .#  #  .#  #  ..#..  .  ...  .#  #.  ##  ##  ..#  #..  ...  .....  .......  .....  .....  #....  ....#
.  #.  .  #.  .  .....  .  ...  ..  ..  ..  ..  ...  ...  ...  .....  .......  .....  .....  .....  .....
.  ..  .  ..  .  .....  .  ...  ..  ..  ..  ..  ...  ...  ...  .....  .......  .....  .....  .....  .....
1  2   1  2   1  5      1  3    2   2   2   2   3    3    3    5      7        5      5      5      5

*      %        #      &      _      <    >    @        ~      ^    |  `  $      ×    …      °
.....  .......  .....  .....  .....  ...  ...  .......  .....  ...  .  ..  .....  ...  .....  ...
.....  ##....#  .....  .##..  .....  ...  ...  .#####.  .....  .#.  #  #.  .####  ...  .....  ###
#.#.#  #.#..#.  .#.#.  #..#.  .....  ..#  #..  #.....#  .....  #.#  #  .#  #.#..  ...  .....  #.#
.###.  .##.#..  #####  #..#.  .....  .#.  .#.  #.###.#  .##.#  ...  #  ..  #.#..  ...  .....  ###
#.#.#  ...#...  .#.#.  .##..  .....  #..  ..#  #.#.#.#  #..#.  ...  #  ..  .###.  #.#  .....  ...
.....  ..#.##.  #####  #..##  .....  .#.  .#.  #.####.  .....  ...  #  ..  ..#.#  .#.  .....  ...
.....  .#..#.#  .#.#.  #..#.  .....  ..#  #..  #......  .....  ...  #  ..  ..#.#  #.#  .....  ...
.....  #....##  .....  .##.#  .....  ...  ...  .#####.  .....  ...  #  ..  ####.  ...  #.#.#  ...
.....  .......  .....  .....  #####  ...  ...  .......  .....  ...  .  ..  .....  ...  .....  ...
.....  .......  .....  .....  .....  ...  ...  .......  .....  ...  .  ..  .....  ...  .....  ...
5      7        5      5      5      3    3    7        5      3    1  2   5      3    5      3


```

In each sheet the first line names the glyph, `#` is ink, and the last line is its width. 107 glyphs with the space.

| Width | Glyphs |
| ---: | --- |
| 1 | i . : ! ' \| |
| 2 | l , ; ( ) [ ] backtick |
| 3 | space I j r Ī ī " { } - < > ^ × ° |
| 4 | E F J L c f k s t z ṭ |
| 5 | 0 1 2 3 4 5 6 7 8 9 A B C D G H K N O P Q R S T U V X Y Z a b d e g h n o p u v x y Ā ā Ū ū ? – + = / \ * # & _ ~ $ … |
| 6 | q, whose descender ends in a spur to the right on row 9 so that it is never read as g |
| 7 | M W m w — @ %, whose two rings are each 3 by 3 with the face's cut corners, apart from the diagonal that joins them: at 5 wide its rings were 2 by 2 blocks touching the stroke and "+20%" read as "+20/." |

**Marks.** The macron is 3 units wide on row 0 for a capital and on row 1 for a lowercase letter, with one empty row under it. Under a macron the capital A, I or U is drawn 6 tall, from row 2; the I under it loses its head serif and keeps its foot, since its macron and a 3-wide head two rows apart read as a doubled bar. `ī` loses its dot to the macron and is 3 wide. `ṭ` is not shown in play today and is drawn so that the codex can show the cutters' words. Any further marked letter is built the same way: a macron as above, a dot under on row 9, an acute as two units rising on rows 0 and 1.

**Symbols.** 18 marks are part of the face and are written in strings by name in braces, as `{lees} 240`. They take the colour of the text round them.

```
tofu   lees     check    cross  right  left   up     down   step  shield   lmb      rmb      mmb      
.....  .......  .......  .....  .....  .....  .....  .....  ...   .......  .......  .......  .......
#####  .#####.  .......  .....  .....  .....  .....  .....  ...   #######  .##.##.  .##.##.  .##.##.
#...#  ..#.#..  ......#  #...#  ..#..  ..#..  ..#..  ..#..  ...   #.....#  ###.#.#  #.#.###  #.###.#
#...#  .#...#.  .....#.  .#.#.  ...#.  .#...  .###.  ..#..  #..   #.....#  ###.#.#  #.#.###  #.###.#
#...#  #.....#  #...#..  ..#..  #####  #####  #.#.#  #.#.#  ##.   #.....#  #######  #######  #######
#...#  #..#..#  .#.#...  .#.#.  ...#.  .#...  ..#..  .###.  ###   .#...#.  #.....#  #.....#  #.....#
#...#  #.....#  ..#....  #...#  ..#..  ..#..  ..#..  ..#..  ##.   ..#.#..  #.....#  #.....#  #.....#
#####  .#####.  .......  .....  .....  .....  .....  .....  #..   ...#...  .#####.  .#####.  .#####.
.....  .......  .......  .....  .....  .....  .....  .....  ...   .......  .......  .......  .......
.....  .......  .......  .....  .....  .....  .....  .....  ...   .......  .......  .......  .......
5      7        7        5      5      5      5      5      3     7        7        7        7

muda     back     cairn    bed      skull
.......  .......  .......  .......  .......
#######  ..#....  ...##..  ...#...  .#####.
#.....#  .##....  ..###..  ..##...  #######
#.###.#  #######  .......  ..###..  ##.#.##
#.#.#.#  .##...#  .#####.  .#####.  ##.#.##
#.###.#  ..#...#  .......  #######  #######
#.....#  ......#  #######  #.#.#.#  .#####.
#######  ..#####  #######  #######  .#.#.#.
.......  .......  .......  .......  .......
.......  .......  .......  .......  .......
7        7        7        7        7

```

| Name | Width |
| --- | ---: |
| `{tofu}` | 5 |
| `{lees}` | 7 |
| `{check}` | 7 |
| `{cross}` | 5 |
| `{right}` | 5 |
| `{left}` | 5 |
| `{up}` | 5 |
| `{down}` | 5 |
| `{step}` | 3 |
| `{shield}` | 7 |
| `{lmb}` | 7 |
| `{rmb}` | 7 |
| `{mmb}` | 7 |
| `{muda}` | 7 |
| `{back}` | 7 |
| `{cairn}` | 7 |
| `{bed}` | 7 |
| `{skull}` | 7 |

`{tofu}` is drawn for any character the face lacks; chat may contain any. `{lees}` is a jar: the mark for coin wherever coin is counted. `{muda}` is the Deserter's stamped token, a square of glass with a square seal struck in it, written after a number as `{lees}` is. A ring with a cross in it was a disc beside the jar and read at a glance as the same coin. `{back}` is a turned arrow: the mark of a thing that can be bought back. `{cairn}` is three stones stacked: the mark before a line the world or the server speaks in chat. `{bed}` is a flame on a hearth of bricks, as wide as the cell at its foot: drawn as a fire under an arch it was a padlock's shackle over its body, and a work only this bed can do read as a locked one. It is never at a slot's corner, where the lock stands: in a furnace's list of works it stands at the right of each work that only that furnace's bed can do. `{lmb}`, `{rmb}`, `{mmb}` are the mouse with one button filled. `{step}` marks the present step of the Guide. `{shield}` marks defence. `{skull}` stands before the name of a creature that attacks, on the readout (5.27), in that name's `blood.lt`.

**Shadow.** Text on a dark plate, on the ground tile, on a button or on the world has a shadow: the same glyphs one unit right and one unit down in `root.0`, drawn first. Text on a light face (a slab, a page, a key cap) has none. The shadow is always `root.0` and never a darker copy of the text's colour, so that the palette stays closed.

**Case.** Sentence case everywhere: "Take all", "Rise again", "Join a server". No label is set in capitals and no text is letter-spaced. The names of `names.json` are written exactly as they stand there.

**Numbers.** Every digit is 5 wide, the 1 included, so digits stand in columns. A column of numbers is right-aligned: the last digit of each ends on the same unit. A count over 999 takes a comma (`1,240`). A decimal uses the point. A stack count is written bare (`64`). A time is `m:ss`. Never write a percent sign inside or over a gauge; in a line of a tooltip it is allowed (`+12% speed`).

**Sample**, ink on `clay.face` and a grade colour with its shadow on `root.1`:

```
     0         1         2         3         4         5         6         7         8         9         0         1         
     012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
  0  FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
  1  FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
  2  FFIFFFIFIIIFFFFFFFFFFFIFFFFFFFFIIIIFFIFFFFFFIFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
  3  FFIFFFIFFFFFFFFFFFFFFFIFFFFFFFFIFFFIFFFFFFFFIFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
  4  FFIFFFIFFIFFIIIFIIIIFFIFFIFFFFFIFFFIFIFIIIIFIFFIFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
  5  FFIIIIIFFIFFIFFFFFFFIFIFIFFFFFFIIIIFFIFIFFFFIFIFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
  6  FFIFFFIFFIFFIFFFFIIIIFIIFFFFFFFIFFFFFIFIFFFFIIFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
  7  FFIFFFIFFIFFIFFFIFFFIFIFIFFFFFFIFFFFFIFIFFFFIFIFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
  8  FFIFFFIFFIFFIFFFFIIIIFIFFIFFFFFIFFFFFIFFIIIFIFFIFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
  9  FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
 10  FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
 11  FFFIIIFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
 12  FFFFFFFFIFFFFFIIIFFFFFFFFFFFFFFFFIFFFIIIIFFFFFFIFFFFFFFFFFFFFFFIIIIFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
 13  FFFIIIFFIFFFFFFFFFFFFFFFFFFFFFFFIIFFFFFFFIFFFFFIFFFFFFFFFFFFFFFIFFFIFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
 14  FFIFFFIFIFFIFIIIIFFFIIIFFFFFFFFFFIFFFFFFFIFFFFFIIIIFFIFFFIFFFFFIFFFIFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
 15  FFIFFFIFIFIFFFFFFIFIFFFFFFFFFFFFFIFFFFFFIFFFFFFIFFFIFIFFFIFFFFFFIIIIFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
 16  FFIIIIIFIIFFFFIIIIFFIIFFFFFFFFFFFIFFFFFIFFFFFFFIFFFIFIFFFIFFFFFFFFFIFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
 17  FFIFFFIFIFIFFIFFFIFFFFIFFFFFFFFFFIFFFFIFFFFFFFFIFFFIFIFFFIFFFFFFFFFIFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
 18  FFIFFFIFIFFIFFIIIIFIIIFFFIFFFFFFIIIFFIIIIIFFFFFIIIIIFFIIIIFFFFFIIIIFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
 19  FFFFFFFFFFFFFFFFFFFFFFFFIFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFIFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
 20  FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFIIIIFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
 21  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 22  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 23  kkkkkckkkkkkkckkckkkkkkkkkkkcccckkkkkkkkkkkkkkkkkkkkkkkckkkkkkkkkkkcccckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 24  kkkkkcKkkkkkkcKkkKkckkkkkkkckKKKKkkkkkkkkkkkkkkkkkkkkkkcKkkkkkkkkkkkKKKckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 25  kkkkkcKcccckkcKkckcccckkkkkcKkkkkckkckkckcccckkccckcccccKkkkkckkkckkkkkcKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 26  kkkkkcKkKKKckcKkcKkcKKKkkkkkccckkcKkcKkcKcKKKckcKKKcKKKcKkkkkkckckKkkkckKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 27  kkkkkcKkccccKcKkcKkcKkkkkkkkkKKckcKkcKkcKcKkkcKcKkkcKkkcKkkkkkkckKkkkckKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 28  kkckkcKckKKcKcKkcKkcKkkkkkkkkkkcKcKkcKkcKcKkkcKcKkkcKkkcKkkkkkckckkkckKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 29  kkkcccKkccccKcckcKkkcckkkkkcccckKkccccccKkccccKcKkkkccccKkkkkckKkckccccckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 30  kkkkKKKkkKKKKkKKkKkkkKKkkkkkKKKKkkkKKKKKKkkKKKKkKkkkkKKKKkkkkkKkkkKkKKKKKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 31  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 32  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 33  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
```
`. nothing  c cyan.lt  F clay.face  I ink  k root.1  K root.0`

### 4.2 The small face

For digits that have no room: a stack count of three digits, the time under a status frame, the ranks under a node. Its letters are kept for the few strings already wired in it, but every HUD readout with a word in it (coordinates, the night, "Saved", a distance with its unit) is the text face in sentence case: at 3 by 5, capitals are hard to tell apart (Z from 2, U from V) and set in capitals they break the rule of case. It is never used for a label or a sentence, and it is never shown as an alphabet beside the text face: the type sheet shows it only at its job, a row of counts after a label in the text face, since a second full alphabet read as a second font. The modded tradition draws its large counts smaller in the same way. The 4 has its diagonal so that it is not read as H. The 0 is a full box with square corners and nothing inside; the 8 is the same box with its middle row filled, two holes one above the other, so that neither has the cut corners of D and B. A pinched waist on the 8 was tried and dropped: with its shadow it read as a 3 or a B. The 3 is open on the left. Under a status frame the time stands on a plate of its own, 16 by 7 of `root.1` with its corners left out, a unit in from each side of the frame and 2 under it, and has no shadow: its glyphs stand 1 apart like any small text and its colon is 1 wide, so "0:08" is 13 wide on the 16 of plate. Bare on the world with its shadow, the shadow filled the one-unit counters and gaps and "2:31" smeared into a blot; set 2 apart the times ran into one long line.

| Measure | Units |
| --- | --- |
| Cell height | 6: rows 0 to 4 are the glyph, row 5 is empty (the comma's tail uses it) |
| Advance from line to line | 6 |
| Between glyphs | 1 |
| Space | 2 wide |
| Shadow | by the same rule as the text face |

```
0    1    2    3    4    5    6    7    8    9    A    B    C    D    E    F    G    H    I    J    K    L    M      N     O    P    
###  .#.  ##.  ##.  ..#  ###  ##.  ###  ###  ##.  .#.  ##.  .##  ##.  ###  ###  .##  #.#  ###  ..#  #.#  #..  #...#  #..#  .#.  ##.
#.#  ##.  ..#  ..#  .##  #..  #..  ..#  #.#  #.#  #.#  #.#  #..  #.#  #..  #..  #..  #.#  .#.  ..#  #.#  #..  ##.##  ##.#  #.#  #.#
#.#  .#.  .#.  .#.  #.#  ##.  ###  .#.  ###  ###  ###  ##.  #..  #.#  ##.  ##.  #.#  ###  .#.  ..#  ##.  #..  #.#.#  #.##  #.#  ##.
#.#  .#.  #..  ..#  ###  ..#  #.#  .#.  #.#  ..#  #.#  #.#  #..  #.#  #..  #..  #.#  #.#  .#.  #.#  #.#  #..  #...#  #..#  #.#  #..
###  ###  ###  ##.  ..#  ##.  .##  .#.  ###  .##  #.#  ##.  .##  ##.  ###  #..  .##  #.#  ###  .#.  #.#  ###  #...#  #..#  .#.  #..
...  ...  ...  ...  ...  ...  ...  ...  ...  ...  ...  ...  ...  ...  ...  ...  ...  ...  ...  ...  ...  ...  .....  ....  ...  ...
3    3    3    3    3    3    3    3    3    3    3    3    3    3    3    3    3    3    3    3    3    3    5      4     3    3

Q    R    S    T    U    V    W      X    Y    Z    :  .  ,  -   +    /    %    x    '  (   )   !  ?    
.#.  ##.  .##  ###  #.#  #.#  #...#  #.#  #.#  ###  .  .  .  ..  ...  ..#  #.#  ...  #  .#  #.  #  ##.
#.#  #.#  #..  .#.  #.#  #.#  #...#  #.#  #.#  ..#  #  .  .  ..  .#.  ..#  ..#  #.#  #  #.  .#  #  ..#
#.#  ##.  .#.  .#.  #.#  #.#  #.#.#  .#.  .#.  .#.  .  .  .  ##  ###  .#.  .#.  .#.  .  #.  .#  #  .#.
#.#  #.#  ..#  .#.  #.#  #.#  ##.##  #.#  .#.  #..  #  .  .  ..  .#.  #..  #..  #.#  .  #.  .#  .  ...
.##  #.#  ##.  .#.  .##  .#.  #...#  #.#  .#.  ###  .  #  #  ..  ...  #..  #.#  ...  .  .#  #.  #  .#.
...  ...  ...  ...  ...  ...  .....  ...  ...  ...  .  .  #  ..  ...  ...  ...  ...  .  ..  ..  .  ...
3    3    3    3    3    3    5      3    3    3    1  1  1  2   3    3    3    3    1  2   2   1  3

```

| Width | Glyphs |
| ---: | --- |
| 1 | : . , ' ! |
| 2 | space - ( ) |
| 3 | 0 1 2 3 4 5 6 7 8 9 A B C D E F G H I J K L O P Q R S T U V X Y Z + / % x ? |
| 4 | N |
| 5 | M W |

---

## 5. Parts

Each part is given as a pixel map to copy and its measurements. A digit in a diagram is a role of the host slab's ramp (section 2); a letter is one colour of the palette; `.` is nothing. The line under each diagram lists the codes it uses. Diagrams of parts that hold an icon leave the icon out.

### 5.1 Window slab

An opaque slab. From the outside in: an outline one unit thick in `root.0` with its four corner units left out; a light edge two units deep along the top and the left, `hi` then `lt`; a dark edge two units deep along the bottom and the right, `pit` then `sh`; the face. Where the light edge meets the dark edge, at the top right and the bottom left, the two units on the diagonal are `face`.

A slab 24 by 14:

```
     0         1         2   
     012345678901234567890123
  0  .KKKKKKKKKKKKKKKKKKKKKK.
  1  K1111111111111111111113K
  2  K1222222222222222222236K
  3  K1233333333333333333346K
  4  K1233333333333333333346K
  5  K1233333333333333333346K
  6  K1233333333333333333346K
  7  K1233333333333333333346K
  8  K1233333333333333333346K
  9  K1233333333333333333346K
 10  K1233333333333333333346K
 11  K1344444444444444444446K
 12  K3666666666666666666666K
 13  .KKKKKKKKKKKKKKKKKKKKKK.
```
`. nothing  1 hi  2 lt  3 face  4 sh  6 pit  K root.0   (digits are tones of the host slab's ramp; shown in timber)`

It is drawn as nine slices with corners 3 by 3. The face of every slab, clay, timber and stone, is flat: no grain, no speckle, no tool mark, no second tone; the ramp's own hue tells stone from a plain grey slab. Stone was once dressed with tool marks, cuts of 3 by 1 in `sh` along bands at its top and bottom; before them pebbles 3 by 3 and 4 by 3 set by a hash over the whole face, chips of 2 by 2 and cuts of 3 by 1 in cells of 14, and light dashes in staggered courses. Every one of them, the last included, was read on a screenshot as dust, dirt or dead pixels: noise laid on a face for texture. A joint line under the title was not drawn: the title has no rule under it (5.3).

| Slab | Ramp | Used for |
| --- | --- | --- |
| Clay | clay | the pack, the shop, settings, controls, the pot |
| Timber | timber | chest and crate, Workbench, Line Frame, Joining Bench |
| Stone | stone | Anvil, the five furnaces, the reworking bench, the skill tree, the map |
| Book | timber boards, clay pages | journal, codex (5.19) |

Classic sizes: a container is 176 wide (nine slots of 18 between margins of 7) and 166 tall when it has three rows above the pack. Side panels are 104 or 116 wide and as tall as their main slab, and overlap it by one unit so that the two share one outline column.

### 5.2 Dark plate

Everything held up against the world. Outline as the slab's. Inside it either a light edge one unit deep in `root.3` along the top and left only (the plain plate: hotbar, compass, roster, readout), or a frame one unit deep all round in a colour that means something (tooltip, toast, status). The face is `root.1`.

```
     0         1         2         3         4  
     0123456789012345678901234567890123456789012
  0  .KKKKKKKKKKKKKKKKKK.....KKKKKKKKKKKKKKKKKK.
  1  KhhhhhhhhhhhhhhhhhhK...KppppppppppppppppppK
  2  KhkkkkkkkkkkkkkkkkkK...KpkkkkkkkkkkkkkkkkpK
  3  KhkkkkkkkkkkkkkkkkkK...KpkkkkkkkkkkkkkkkkpK
  4  KhkkkkkkkkkkkkkkkkkK...KpkkkkkkkkkkkkkkkkpK
  5  KhkkkkkkkkkkkkkkkkkK...KpkkkkkkkkkkkkkkkkpK
  6  KhkkkkkkkkkkkkkkkkkK...KpkkkkkkkkkkkkkkkkpK
  7  KhkkkkkkkkkkkkkkkkkK...KpkkkkkkkkkkkkkkkkpK
  8  KhkkkkkkkkkkkkkkkkkK...KpkkkkkkkkkkkkkkkkpK
  9  KhkkkkkkkkkkkkkkkkkK...KpkkkkkkkkkkkkkkkkpK
 10  KhkkkkkkkkkkkkkkkkkK...KppppppppppppppppppK
 11  .KKKKKKKKKKKKKKKKKK.....KKKKKKKKKKKKKKKKKK.
```
`. nothing  h root.3  k root.1  K root.0  p rose.lt`

### 5.3 Title

There is no title bar. A slab's title is text in `ink` at 8, 6, in sentence case, left-aligned, with no shadow and no rule under it. Small buttons that act on the whole slab stand in the same row at the right, 12 tall at y 3, the last one ending at x 168 on a slab 176 wide.

```
     0         1         2         3         4         5         
     012345678901234567890123456789012345678901234567890123456789
  0  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
  1  KWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWFK
  2  KWLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLFZK
  3  KWLFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFSZK
  4  KWLFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFSZK
  5  KWLFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFSZK
  6  KWLFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFSZK
  7  KWLFFFFFIIIIFFIFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFSZK
  8  KWLFFFFFIFFFIFIFFFFFFFFFFFFFFFFFIFFFFFFFFFFFFFFFFFFFFFFFFSZK
  9  KWLFFFFFIFFFFFIIIIFFIIIIFFFIIIFIIIIFFFFFFFFFFFFFFFFFFFFFFSZK
 10  KWLFFFFFIFFFFFIFFFIFIFFFIFIFFFFFIFFFFFFFFFFFFFFFFFFFFFFFFSZK
 11  KWLFFFFFIFFFFFIFFFIFIIIIIFFIIFFFIFFFFFFFFFFFFFFFFFFFFFFFFSZK
 12  KWLFFFFFIFFFIFIFFFIFIFFFFFFFFIFFIFFFFFFFFFFFFFFFFFFFFFFFFSZK
 13  KWLFFFFFFIIIIFIFFFIFFIIIIFIIIFFFFIIFFFFFFFFFFFFFFFFFFFFFFSZK
 14  KWLFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFSZK
 15  KWLFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFSZK
 16  KWLFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFSZK
 17  KWLFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFSZK
 18  KWLFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFSZK
 19  KWLFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFSZK
 20  KWLFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFSZK
 21  KWFSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSZK
 22  KFZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZK
 23  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
```
`. nothing  F clay.face  I ink  K root.0  L clay.lt  S clay.sh  W salt  Z clay.pit`

### 5.4 Slot

18 by 18, holding a 16 by 16 icon at 1, 1. Sunk: `pit` along the top and left, `hi` along the bottom and right, `face` at the two corners where they meet, floor `sh`. The pit edge must stand well below the floor: on a floor of `dk` it sank into it, and at the 960-pixel size a grid read as pale lines ruled on the slab, a spreadsheet and not a field of wells. On `sh` each slot's dark top and left sits against its neighbour's light bottom and right, so the grid breaks into cells.

```
     0         1       
     012345678901234567
  0  666666666666666663
  1  644444444444444441
  2  644444444444444441
  3  644444444444444441
  4  644444444444444441
  5  644444444444444441
  6  644444444444444441
  7  644444444444444441
  8  644444444444444441
  9  644444444444444441
 10  644444444444444441
 11  644444444444444441
 12  644444444444444441
 13  644444444444444441
 14  644444444444444441
 15  644444444444444441
 16  644444444444444441
 17  311111111111111111
```
`. nothing  1 hi  3 face  4 sh  6 pit   (digits are tones of the host slab's ramp; shown in timber)`

Slots stand in grids with no gap, so a grid of nine is 162 wide. The hotbar row of a pack stands 4 units below the three rows above it.

States, left to right: hovered (floor `lt`, as the tradition's flat white lifts a hovered slot; on a dark plate `root.3`, the silhouette then `root.4`); accepts the held stack (a frame of `growth` on the floor's edge; shown on equipment, fuel and ore slots while a fitting thing is held); refused (the same frame in `blood`, for 0.3 s after a click the game refuses); chosen (frame of `salt`: a slot picked out on a page or a sheet; the pack does not mark the hotbar cell in hand, since a thin salt frame there reads as a hover and the heavy selector belongs to the HUD); locked (floor `face`: a place that shows a thing built in and takes nothing). Colour alone does not tell a state: accepts and refused each carry a mark 7 by 7 over the floor's top right corner, at `x = size - 8`, `y = 1`, a check of `growth.lt` or a cross of `blood.lt` on a badge of `root.1` with a `root.0` outline whose corners are left out; locked carries a lock on the same badge (a shackle of `root.4` over a body of `ember.hi`, `ember.lt`, `ember`, `ember.dk` with a keyhole of `root.0`) at `x = size - 8`, `y = size - 8`, over the bottom right corner where a count would stand, since a locked place holds one built-in thing and no count; at the top left it sank into the icon's own outline. The other marks of a state stand on the same badge, each a shape 5 by 5 of its own so that shape tells them before colour: alert, a `!` of `blood.lt`; new, a star of `ember.hi`; better, an arrow up of `growth.lt`; worse, an arrow down of `blood.lt`. They stand over the top right corner like the check and the cross, which leaves the bottom right to the count; only the lock takes the bottom right. Drawn bare over the icon, without the badge, they sank into it and could not be told apart at scale 2.

A slot carrying a frame (accepts, refused, chosen, or focus) steps its count in by two, its last column on x 14 and its lowest row on y 14, so that the count's shadow ends inside the frame and never runs through it.

```
     0         1     
     0123456789012345
  0  .KKKKK....KKKKK.
  1  KrkkkrK..KkkkknK
  2  KkrkrkK..KkkknkK
  3  KkkrkkK..KnknkkK
  4  KkrkrkK..KknkkkK
  5  KrkkkrK..KkkkkkK
  6  .KKKKK....KKKKK.
```
`. nothing  k root.1  K root.0  n growth.lt  r blood.lt`

```
     0         1         2         3         4         5         6         7         8         9       
     01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567
  0  666666666666666663..666666666666666663..666666666666666663..666666666666666663..666666666666666663
  1  622222222222222221..6NNNNNNNNNNNNNNNN1..6RRRRRRRRRRRRRRRR1..6WWWWWWWWWWWWWWWW1..633333333333333331
  2  622222222222222221..6N44444444444444N1..6R44444444444444R1..6W44444444444444W1..633333333333333331
  3  622222222222222221..6N44444444444444N1..6R44444444444444R1..6W44444444444444W1..633333333333333331
  4  622222222222222221..6N44444444444444N1..6R44444444444444R1..6W44444444444444W1..633333333333333331
  5  622222222222222221..6N44444444444444N1..6R44444444444444R1..6W44444444444444W1..633333333333333331
  6  622222222222222221..6N44444444444444N1..6R44444444444444R1..6W44444444444444W1..633333333333333331
  7  622222222222222221..6N44444444444444N1..6R44444444444444R1..6W44444444444444W1..633333333333333331
  8  622222222222222221..6N44444444444444N1..6R44444444444444R1..6W44444444444444W1..633333333333333331
  9  622222222222222221..6N44444444444444N1..6R44444444444444R1..6W44444444444444W1..633333333333333331
 10  622222222222222221..6N44444444444444N1..6R44444444444444R1..6W44444444444444W1..633333333333333331
 11  622222222222222221..6N44444444444444N1..6R44444444444444R1..6W44444444444444W1..633333333333333331
 12  622222222222222221..6N44444444444444N1..6R44444444444444R1..6W44444444444444W1..633333333333333331
 13  622222222222222221..6N44444444444444N1..6R44444444444444R1..6W44444444444444W1..633333333333333331
 14  622222222222222221..6N44444444444444N1..6R44444444444444R1..6W44444444444444W1..633333333333333331
 15  622222222222222221..6N44444444444444N1..6R44444444444444R1..6W44444444444444W1..633333333333333331
 16  622222222222222221..6NNNNNNNNNNNNNNNN1..6RRRRRRRRRRRRRRRR1..6WWWWWWWWWWWWWWWW1..633333333333333331
 17  311111111111111111..311111111111111111..311111111111111111..311111111111111111..311111111111111111
```
`. nothing  1 hi  2 lt  3 face  4 sh  6 pit  N growth  R blood  W salt   (digits are tones of the host slab's ramp; shown in timber)`

The hover changes the floor under the icon and nothing else. It does not tint the icon.

**Stack count.** In the text face, `salt` with its shadow, right-aligned so that its last column is the slot's x 16, cell at y 9 (digits on rows 10 to 16), the tradition's place: the digits take the floor's last column and row and their shadow falls on the light edge at x 17 and y 17, where it parts them from the rim. Kept a unit further in, on x 15 and y 15, the counts of a full pack hid the lower right of every icon, and ore, coal and rubble could no longer be told apart. A count of 100 or more no longer fits in the text face and is written in the small face, last column on x 16, lowest row on y 16. A count of 1,000 or more is written in thousands in the small face (`1k`, `12k`), so that a count is never more than three glyphs. A count of 1 is not written. The large slot places its count the same way from its own floor's bottom right, x 24 and y 24. The icon is not raised in a full grid to clear the digits: at y 0 its top row would lie on the slot's dark edge, and the same thing would stand at two heights in two grids.

```
     0         1       
     012345678901234567
  0  666666666666666663
  1  644444444444444441
  2  644444444444444441
  3  644444444444444441
  4  644444444444444441
  5  644444444444444441
  6  644444444444444441
  7  644444444444444441
  8  644444444444444441
  9  644444WWWW4444W441
 10  64444W4KKKK44WWK41
 11  64444WK44444W4WK41
 12  64444WWWW44W4KWK41
 13  64444WKKKW4WWWWW41
 14  64444WK44WK4KKWKK1
 15  644444WWWWK444WK41
 16  6444444KKKK4444K41
 17  311111111111111111
```
`. nothing  1 hi  3 face  4 sh  6 pit  K root.0  W salt   (digits are tones of the host slab's ramp; shown in timber)`

**A thing that is missing** (a pattern laid out that the pack cannot fill, a kind not yet seen in the codex) is drawn as its icon's silhouette in one flat tone, `dk` of the host ramp, never as a faded icon.

**A pattern the pack cannot afford**, in the cells of a pattern list, is known and has a shape to be told by (the pattern the grid already holds is never one: it is made by taking the result, and a lock on it beside a ready chain said the opposite of the chain): its icon is drawn flat in `root.4`, so its outline still reads, and the lock of a locked slot stands over the cell's bottom right corner at 10, 10, where the count would be; no count is written. A pattern that gives more than one writes how many on a badge cut as the lock is, in the same corner: `root.0` round a face of `root.1`, the number in the small face in `root.4` with its shadow, at 2, 1 inside the badge, the badge as wide as the number and 4. Written as a stack's count, in `salt` in the text face, the pattern read as a thing already in the pack; bare grey digits drawn a unit in vanished into grey icons such as stone bricks. A half wash of `root.0` over the whole icon was tried first: on the dark floor a washed icon differed from a makeable one only a little in brightness. A cell of the list is a slot on a dark plate (5.4): `root.0` along its top and left, `root.3` along its bottom and right, a floor of `root.2`, `root.3` under the pointer.

**The pattern laid out**, the one whose pieces now lie on the grid, is chosen in its list as a row is: its cell's floor is `root.3` and a frame of `root.4` one unit inside its 18 stands round the icon. It is not framed in `salt`, which says where the keys are; while the keys are on it the salt frame stands in place of the grey.

**The large slot**, 26 by 26, for the result of a station. Floor 24 by 24; the icon at 5, 5.

```
     0         1         2     
     01234567890123456789012345
  0  66666666666666666666666663
  1  64444444444444444444444441
  2  64444444444444444444444441
  3  64444444444444444444444441
  4  64444444444444444444444441
  5  64444444444444444444444441
  6  64444444444444444444444441
  7  64444444444444444444444441
  8  64444444444444444444444441
  9  64444444444444444444444441
 10  64444444444444444444444441
 11  64444444444444444444444441
 12  64444444444444444444444441
 13  64444444444444444444444441
 14  64444444444444444444444441
 15  64444444444444444444444441
 16  64444444444444444444444441
 17  64444444444444444444444441
 18  64444444444444444444444441
 19  64444444444444444444444441
 20  64444444444444444444444441
 21  64444444444444444444444441
 22  64444444444444444444444441
 23  64444444444444444444444441
 24  64444444444444444444444441
 25  31111111111111111111111111
```
`. nothing  1 hi  3 face  4 sh  6 pit   (digits are tones of the host slab's ramp; shown in timber)`

**A slot on a dark plate** (the readout, the cells of a pattern list). `root.0` along its top and left, a floor of `root.2`, `root.3` along its bottom and right; hovered floor `root.3`. On a floor of `root.0` a dark thing, itself outlined in `root.0`, lost its silhouette: the Tama on the readout and a ring in a pattern list all but vanished. The cells of a pattern list are this slot; a place still to fill keeps the well's `root.1` floor and a lower edge of `root.2`.

```
     0         1         2         3       
     01234567890123456789012345678901234567
  0  KKKKKKKKKKKKKKKKKk..KKKKKKKKKKKKKKKKKk
  1  Kjjjjjjjjjjjjjjjjh..Khhhhhhhhhhhhhhhhh
  2  Kjjjjjjjjjjjjjjjjh..Khhhhhhhhhhhhhhhhh
  3  Kjjjjjjjjjjjjjjjjh..Khhhhhhhhhhhhhhhhh
  4  Kjjjjjjjjjjjjjjjjh..Khhhhhhhhhhhhhhhhh
  5  Kjjjjjjjjjjjjjjjjh..Khhhhhhhhhhhhhhhhh
  6  Kjjjjjjjjjjjjjjjjh..Khhhhhhhhhhhhhhhhh
  7  Kjjjjjjjjjjjjjjjjh..Khhhhhhhhhhhhhhhhh
  8  Kjjjjjjjjjjjjjjjjh..Khhhhhhhhhhhhhhhhh
  9  Kjjjjjjjjjjjjjjjjh..Khhhhhhhhhhhhhhhhh
 10  Kjjjjjjjjjjjjjjjjh..Khhhhhhhhhhhhhhhhh
 11  Kjjjjjjjjjjjjjjjjh..Khhhhhhhhhhhhhhhhh
 12  Kjjjjjjjjjjjjjjjjh..Khhhhhhhhhhhhhhhhh
 13  Kjjjjjjjjjjjjjjjjh..Khhhhhhhhhhhhhhhhh
 14  Kjjjjjjjjjjjjjjjjh..Khhhhhhhhhhhhhhhhh
 15  Kjjjjjjjjjjjjjjjjh..Khhhhhhhhhhhhhhhhh
 16  Kjjjjjjjjjjjjjjjjh..Khhhhhhhhhhhhhhhhh
 17  khhhhhhhhhhhhhhhhh..khhhhhhhhhhhhhhhhh
```
`. nothing  h root.3  j root.2  k root.1  K root.0`

### 5.5 Silhouettes of empty slots

An empty slot that takes one kind of thing shows that thing as a silhouette in `dk` on the floor (`sh` under the pointer, on the hovered floor of `lt`). Nine exist. Head, body, legs:

```
     0         1         2         3         4         5       
     0123456789012345678901234567890123456789012345678901234567
  0  666666666666666663..666666666666666663..666666666666666663
  1  644444444444444441..644444444444444441..644555555555555441
  2  644444444444444441..644555444444555441..644555555555555441
  3  644445555555544441..645555544445555541..644555555555555441
  4  644455555555554441..645555555555555541..644555555555555441
  5  644555555555555441..645555555555555541..644555554455555441
  6  644555555555555441..645545555555545541..644555554455555441
  7  644555555555555441..645545555555545541..645555554455555541
  8  644555544445555441..644445555555544441..645555554455555541
  9  644555444444555441..644445555555544441..645555554455555541
 10  644555444444555441..644445555555544441..645555554455555541
 11  644555444444555441..644445555555544441..644555554455555441
 12  644555444444555441..644445555555544441..644455554455554441
 13  644554444444455441..644445555555544441..644455554455554441
 14  644444444444444441..644455555555554441..644455554455554441
 15  644444444444444441..644444444444444441..644455554455554441
 16  644444444444444441..644444444444444441..644444444444444441
 17  311111111111111111..311111111111111111..311111111111111111
```
`. nothing  1 hi  3 face  4 sh  5 dk  6 pit   (digits are tones of the host slab's ramp; shown in timber)`

Trinket, what a furnace works, fuel:

```
     0         1         2         3         4         5       
     0123456789012345678901234567890123456789012345678901234567
  0  666666666666666663..666666666666666663..666666666666666663
  1  644444444444444441..644444444444444441..644444444444444441
  2  644444444444444441..644444444444444441..644444445444444441
  3  644444455554444441..644444455554444441..644444445544444441
  4  644444555555444441..644445555555544441..644444455544444441
  5  644444455554444441..644455555555554441..644444455554444441
  6  644444555555444441..644455555555555441..644444555554454441
  7  644445544445544441..644555555555555441..644445555555454441
  8  644455444444554441..644555555555555441..644445555555554441
  9  644455444444554441..644555555555555541..644455555555555441
 10  644455444444554441..645555555555555541..644455554555555441
 11  644455444444554441..645555555555555541..644455544455555441
 12  644445544445544441..644555555555555441..644455544455555441
 13  644444555555444441..644455555555554441..644445544455554441
 14  644444455554444441..644444444444444441..644444554555544441
 15  644444444444444441..644444444444444441..644444444444444441
 16  644444444444444441..644444444444444441..644444444444444441
 17  311111111111111111..311111111111111111..311111111111111111
```
`. nothing  1 hi  3 face  4 sh  5 dk  6 pit   (digits are tones of the host slab's ramp; shown in timber)`

A bar, a key, a piece to rework:

```
     0         1         2         3         4         5       
     0123456789012345678901234567890123456789012345678901234567
  0  666666666666666663..666666666666666663..666666666666666663
  1  644444444444444441..644444444444444441..644444444444444441
  2  644444444444444441..644444444444444441..644444444444455441
  3  644444444444444441..644444444444444441..644444444444555441
  4  644444444444444441..644455554444444441..644444444445554441
  5  644445555555554441..644554455444444441..644444444455544441
  6  644455555555555441..644544445444444441..644444444555444441
  7  644555555555555541..644544445555555541..644444445554444441
  8  644555555555555541..644544445555555541..644444455544444441
  9  645555555555555541..644554455444545441..644544555444444441
 10  645555555555555441..644455554444545441..644555554444444441
 11  645555555555555441..644444444444444441..644455544444444441
 12  644444444444444441..644444444444444441..644555554444444441
 13  644444444444444441..644444444444444441..645544554444444441
 14  644444444444444441..644444444444444441..645444444444444441
 15  644444444444444441..644444444444444441..644444444444444441
 16  644444444444444441..644444444444444441..644444444444444441
 17  311111111111111111..311111111111111111..311111111111111111
```
`. nothing  1 hi  3 face  4 sh  5 dk  6 pit   (digits are tones of the host slab's ramp; shown in timber)`

### 5.6 Button

A button 20 tall is dressed stone, on any slab and on the ground tile: these are the buttons of the menus. The classic button is 200 by 20; half is 98 by 20 (two with a gap of 4); the worlds screen uses 136 by 20. Inside windows a small button is 12, 14 or 16 tall and as wide as its label plus 10, and it is a raised piece of the slab it stands on, in that slab's ramp (below), so that a grey stone button is never pasted on clay or timber.

Inside the outline of `root.0`, whose corners are left out, the button is lit from the top left like every slab: the first row and the first column `stone.lt`; the face `stone.sh`; the last row and the last column `stone.pit`, with a row and a column of `stone.dk` inside them, so that the bevel is one light unit on the top and left and one dark and one pit on the bottom and right. The two units where light meets dark, at the top right and the bottom left, are face. The face of a button 20 tall is one slab of dressed stone with no joints. Joints set out from the label (7 left of it, 6 right, then every 40) stood at a different x on every button, 37 and 161 on one, 21 and 177 on the next, and in a column of stacked buttons they read as a mis-registered nine-slice or as random flagstones, not as one slab. The face carries pebbles in the two grits a few levels either side of `stone.sh` (`grit.lt`, `grit.dk`, section 2), placed by a hash of the button's label and width so that no two buttons match: 5 to 7 to every 40 units of face, of three shapes, 1 by 1, 2 by 1 (`grit.lt` then `grit.dk`) and 2 by 2 (`grit.lt` on its top left unit and `grit.dk` on its bottom right), no two within 5 units, none within 3 of the label; and one crack of three units of `grit.dk`, somewhere else on each button. Pressed, pebbles and crack drop a unit down and right with the label. Smaller buttons are plain. A tile of pebbles 16 by 16 repeated over the face put the same specks at the same places on every button: it read as a perforated sheet, and as the grey speckled button of the game this tradition comes from. A groove with a lit far wall every 25 read as a fence of bright posts. The label is centred, `salt` with its shadow; its cell is at `y = floor((h - 9) / 2)`, which puts the capitals of a button 20 tall on rows 6 to 12.

Normal and hovered. Hovered: the outline turns `ember.hi`, the light row and column `stone.hi`, the label `ember.hi`, so that the frame and the words light together. A door that loses something (leaving a world that is not saved) hovers its outline and label in `blood.lt` instead, the warning colour on dark. A button with keyboard focus and not the pointer has a solid outline of `salt`, keeps its `salt` label, and carries a wedge 3 by 5 in `salt` with its shadow, pointing right at the label, its rows 2 to 6 of the label's cell and its point 4 units left of the first letter, inside the button: half buttons stand only 4 apart, and a wedge outside would fall on the next. Salt and the wedge against ember.hi keep focus from being read as hover. Its outline was once dashed, runs of two units of `salt` and two of `root.0`: that was a browser's focus ring, not a drawn state. (The diagram below shows the solid outline of hover; the pebbles stand where the rules above put them.)

```
     0         1         2         3         4         5         6         7         8         9        
     012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678
  0  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.....yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy.
  1  KGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGJK...yAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJy
  2  KGJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJMzK...yAJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJMzy
  3  KGJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJMzK...yAJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJMzy
  4  KGJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJMzK...yAJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJMzy
  5  KGJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJMzK...yAJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJMzy
  6  KGJJJJJJJJJJJJWWWWJJWJJJJJJJJJJJJJJJJJJJJJJJJMzK...yAJJJJJJJJJJJJyyyyJJyJJJJJJJJJJJJJJJJJJJJJJJJMzy
  7  KGJJJJJJJJJJJJWKKKWJWKJJJJJJJJJJJJJJJJJJJJJJJMzK...yAJJJJJJJJJJJJyKKKyJyKJJJJJJJJJJJJJJJJJJJJJJJMzy
  8  KGJJJJJJJJJJJJWKJJWKWKJWWWWJJWJJJWJJJJJJJJJJJMzK...yAJJJJJJJJJJJJyKJJyKyKJyyyyJJyJJJyJJJJJJJJJJJMzy
  9  KGJJJJJJJJJJJJWWWWJKWKJJKKKWJWKJJWKJJJJJJJJJJMzK...yAJJJJJJJJJJJJyyyyJKyKJJKKKyJyKJJyKJJJJJJJJJJMzy
 10  KGJJJJJJJJJJJJWKKKKJWKJJWWWWKWKJJWKJJJJJJJJJJMzK...yAJJJJJJJJJJJJyKKKKJyKJJyyyyKyKJJyKJJJJJJJJJJMzy
 11  KGJJJJJJJJJJJJWKJJJJWKJWJKKWKWKJJWKJJJJJJJJJJMzK...yAJJJJJJJJJJJJyKJJJJyKJyJKKyKyKJJyKJJJJJJJJJJMzy
 12  KGJJJJJJJJJJJJWKJJJJWWJJWWWWKJWWWWKJJJJJJJJJJMzK...yAJJJJJJJJJJJJyKJJJJyyJJyyyyKJyyyyKJJJJJJJJJJMzy
 13  KGJJJJJJJJJJJJJKJJJJJKKJJKKKKJJKKWKJJJJJJJJJJMzK...yAJJJJJJJJJJJJJKJJJJJKKJJKKKKJJKKyKJJJJJJJJJJMzy
 14  KGJJJJJJJJJJJJJJJJJJJJJJJJJJJWWWWJKJJJJJJJJJJMzK...yAJJJJJJJJJJJJJJJJJJJJJJJJJJJyyyyJKJJJJJJJJJJMzy
 15  KGJJJJJJJJJJJJJJJJJJJJJJJJJJJJKKKKJJJJJJJJJJJMzK...yAJJJJJJJJJJJJJJJJJJJJJJJJJJJJKKKKJJJJJJJJJJJMzy
 16  KGJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJMzK...yAJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJMzy
 17  KGMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMzK...yAMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMzy
 18  KJzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzK...yJzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzy
 19  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.....yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy.
```
`. nothing  A stone.hi  G stone.lt  J stone.sh  K root.0  M stone.dk  W salt  y ember.hi  z stone.pit`

Pressed and disabled. Pressed (held under the pointer; the label stays `ember.hi`): the outline goes back to `root.0`, as the button is pushed into its slab, and the bevel turns over: the first row and column `stone.pit` with a row and a column of `stone.dk` inside them, the last row and column `stone.lt`, where the lower lip of the sunk face catches the light, and grain and label move one unit down and one right. With a `salt` outline and the label dropped only a unit, pressed was told from hovered by a slightly darker face alone. So pressed never looks like hovered or focused. Disabled: still a slab of stone two steps darker, its outline and bevel kept: the first row and column `stone.sh`, a bare face of `stone.dk` with no grain, the last row and column `stone.pit` with a row and a column of `stone.pit` inside them; the label `root.4` with its shadow. A flat face of `stone.pit` was the dark of a text field, and under a form a disabled "Join" read as a fourth, empty field.

```
     0         1         2         3         4         5         6         7         8         9        
     012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678
  0  .WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW.....KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
  1  WzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzJW...KzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzK
  2  WzMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMGW...KzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzK
  3  WzMJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJGW...KzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzK
  4  WzMJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJGW...KzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzK
  5  WzMJJMMMJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJMMMJJGW...KzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzK
  6  WzMJJJJGJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJGJJGW...KzzzzzzzzzzzzzggggzzgzzzzzzzzzzzzzzzzzzzzzzzzzzK
  7  WzMJJJJJJJJJJJyyyyJJyJJJJJJJJJJJJJJJJJJJJJJJJJGW...KzzzzzzzzzzzzzgzzzgzgzzzzzzzzzzzzzzzzzzzzzzzzzzK
  8  WzMJJJJJJJJJJJyKKKyJyKJJJJJJJJJJJJJJJJJJJJJJJJGW...KzzzzzzzzzzzzzgzzzgzgzzggggzzgzzzgzzzzzzzzzzzzzK
  9  WzMJJJJJJJJJJJyKJJyKyKJyyyyJJyJJJyJJJJJJJJJJJJGW...KzzzzzzzzzzzzzggggzzgzzzzzzgzgzzzgzzzzzzzzzzzzzK
 10  WzMJJJJJJJJJJJyyyyJKyKJJKKKyJyKJJyKJJJJJJJJJJJGW...KzzzzzzzzzzzzzgzzzzzgzzzggggzgzzzgzzzzzzzzzzzzzK
 11  WzMJJJJJJJJJJJyKKKKJyKJJyyyyKyKJJyKJJJJJJJJJJJGW...KzzzzzzzzzzzzzgzzzzzgzzgzzzgzgzzzgzzzzzzzzzzzzzK
 12  WzMJJJJJJJJJJJyKJJJJyKJyJKKyKyKJJyKJJJJJJJJJJJGW...KzzzzzzzzzzzzzgzzzzzggzzggggzzggggzzzzzzzzzzzzzK
 13  WzMJJJJJJJJJJJyKJJJJyyJJyyyyKJyyyyKJJJJJJJJJJJGW...KzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzgzzzzzzzzzzzzzK
 14  WzMJJJJJJJJJJJJKJJJJJKKJJKKKKJJKKyKJJJJJJJJJJJGW...KzzzzzzzzzzzzzzzzzzzzzzzzzzzzggggzzzzzzzzzzzzzzK
 15  WzMJJJJJJJJJJJJJJJJJJJJJJJJJJyyyyJKJJJJJJJJJJJGW...KzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzK
 16  WzMJJJJJJJJJJJJJJJJJJJJJJJJJJJKKKKJJJJJJJJJJJJGW...KzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzK
 17  WzJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJGW...KzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzK
 18  WJGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGW...KMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMK
 19  .WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW.....KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
```
`. nothing  g root.4  G stone.lt  J stone.sh  K root.0  M stone.dk  W salt  y ember.hi  z stone.pit`

Small buttons in stone, 12, 14 and 16 tall, and the 12 by 12 "+" (on a column of rows 12 apart the "+" is 11 by 11, so that a unit stays clear between two):

```
     0         1         2         3         4         5         6         7         8         9         0         1         2         3         4         5    
     01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234
  0  .KKKKKKKKKKKKKKKKKKKKKKKKKKKK.....KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.....KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.....KKKKKKKKKK.
  1  KGGGGGGGGGGGGGGGGGGGGGGGGGGGJK...KGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGJK...KGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGJK...KGGGGGGGGGJK
  2  KGJJJJWWWWJJJJJJJJJJJJJJJJJMzK...KGJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJMzK...KGJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJMzK...KGJJJJJJJMzK
  3  KGJJJWJKKKKJJJJJJJJJJJWJJJJMzK...KGJJJJJJJJJWWWWWJJJJJJJWJJJJJJJJJJJJJJJJJMzK...KGJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJMzK...KGJJJJWJJMzK
  4  KGJJJWKJJJJWWWWJJWWWJWWWWJJMzK...KGJJJJJJJJJJKWKKKJJJJJJWKJJJJJJJJJJJJJJJJMzK...KGJJJJJJJJJJJJJJJJJWWWWJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJMzK...KGJJJJWKJMzK
  5  KGJJJJWWWJJWKKKWJWKKKJWKKKJMzK...KGJJJJJJJJJJJWKJJWWWWJJWKJWJWWWWJJJJJJJJJMzK...KGJJJJJJJJJJJJJJJJJWKKKWJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJMzK...KGJJWWWWWMzK
  6  KGJJJJJKKWJWKJJWKWKJJJWKJJJMzK...KGJJJJJJJJJJJWKJJJKKKWJWKWJKWKKKWJJJJJJJJMzK...KGJJJJJJJJJJJJJJJJJWKJJWKWWWWJJWWWWJJWWWWJJJJJJJJJJJJJJJJMzK...KGJJJKWKKMzK
  7  KGJJJJJJJWKWKJJWKWKJJJWKJJJMzK...KGJJJJJJJJJJJWKJJJWWWWKWWJKJWWWWWKJJJJJJJMzK...KGJJJJJJJJJJJJJJJJJWKJJWKWKKKWJWKKKWJWKKKWJJJJJJJJJJJJJJJMzK...KGJJJJWKJMzK
  8  KGJJJWWWWJKJWWWWKWKJJJJWWJJMzK...KGJJJJJJJJJJJWKJJWJKKWKWKWJJWKKKKKJJJJJJJMzK...KGJJJJJJJJJJJJJJJJJWKJJWKWKJJWKWKJJWKWWWWWKJJJJJJJJJJJJJJMzK...KGJJJJJKJMzK
  9  KGMMMMKKKKMMMKKKKMKMMMMMKKMMzK...KGJJJJJJJJJJJWKJJJWWWWKWKJWJJWWWWJJJJJJJJMzK...KGJJJJJJJJJJJJJJJJJWKJJWKWKJJWKWKJJWKWKKKKKJJJJJJJJJJJJJJMzK...KGMMMMMMMMzK
 10  KJzzzzzzzzzzzzzzzzzzzzzzzzzzzK...KGJJJJJJJJJJJJKJJJJKKKKJKJJKJJKKKKJJJJJJJMzK...KGJJJJJJJJJJJJJJJJJWWWWJKJWWWWKWKJJWKJWWWWJJJJJJJJJJJJJJJMzK...KJzzzzzzzzzK
 11  .KKKKKKKKKKKKKKKKKKKKKKKKKKKK....KGMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMzK...KGJJJJJJJJJJJJJJJJJJKKKKJJJKKKKJKJJJKJJKKKKJJJJJJJJJJJJJJMzK....KKKKKKKKKK.
 12  .................................KJzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzK...KGJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJMzK...............
 13  ..................................KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK....KGMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMzK...............
 14  ................................................................................KJzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzK...............
 15  .................................................................................KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK................
```
`. nothing  G stone.lt  J stone.sh  K root.0  M stone.dk  W salt  z stone.pit`

**The small button of a slab.** Inside the outline: the first row and column `hi`, the face `face`, the last row and column `dk` (`pit` on timber, whose `dk` is too near its face to read as an edge); the two units where light meets dark are face. The label is `ink` with no shadow, centred, its cell at `y = floor((h - 9) / 2)`. A small button with words is 14 tall (16 where a row has room); 12 is kept for a label with no descender and for the square "+". On a button 12 tall with `sh` and `dk` under the face, the descender of the "p" of "Sort pack" lay on the button's edge and outline; at 14 with one dark row it ends on the face, on row 11. Hovered, the face turns `lt`. Pressed, the bevel turns over: the first row and column `dk` with `sh` inside them, the face `sh`, the last row and column `face`, and the label moves one unit down and one right. Disabled: a flat face of `sh`, the label `ink.faded` on clay and `salt` on stone and timber, the tradition's light words on a flat dark face: faded ink on `stone.sh` stood at 1.8 to 1 and could not be read. A door that loses something ("Delete" in the question of the world list) has its label in `blood.dk`, the refusal's tone on a light face. Keyboard focus, with the pointer elsewhere, turns the outline solid `salt`, as on a menu button; a small button has no room for the wedge. No grain. On the Anvil, the furnaces and the map the ramp is stone, with the same roles. A clay "Sort", 30 by 12, normal and hovered:

```
     0         1         2         3         4         5         6     
     0123456789012345678901234567890123456789012345678901234567890123
  0  .KKKKKKKKKKKKKKKKKKKKKKKKKKKK.....KKKKKKKKKKKKKKKKKKKKKKKKKKKK.
  1  KWWWWWWWWWWWWWWWWWWWWWWWWWWWFK...KWWWWWWWWWWWWWWWWWWWWWWWWWWWLK
  2  KWFFFFIIIIFFFFFFFFFFFFFFFFFFDK...KWLLLLIIIILLLLLLLLLLLLLLLLLLDK
  3  KWFFFIFFFFFFFFFFFFFFFFIFFFFFDK...KWLLLILLLLLLLLLLLLLLLLILLLLLDK
  4  KWFFFIFFFFFIIIIFFIIIFIIIIFFFDK...KWLLLILLLLLIIIILLIIILIIIILLLDK
  5  KWFFFFIIIFFIFFFIFIFFFFIFFFFFDK...KWLLLLIIILLILLLILILLLLILLLLLDK
  6  KWFFFFFFFIFIFFFIFIFFFFIFFFFFDK...KWLLLLLLLILILLLILILLLLILLLLLDK
  7  KWFFFFFFFIFIFFFIFIFFFFIFFFFFDK...KWLLLLLLLILILLLILILLLLILLLLLDK
  8  KWFFFIIIIFFFIIIIFIFFFFFIIFFFDK...KWLLLIIIILLLIIIILILLLLLIILLLDK
  9  KWFFFFFFFFFFFFFFFFFFFFFFFFFFDK...KWLLLLLLLLLLLLLLLLLLLLLLLLLLDK
 10  KFDDDDDDDDDDDDDDDDDDDDDDDDDDDK...KLDDDDDDDDDDDDDDDDDDDDDDDDDDDK
 11  .KKKKKKKKKKKKKKKKKKKKKKKKKKKK.....KKKKKKKKKKKKKKKKKKKKKKKKKKKK.
```
`. nothing  D clay.dk  F clay.face  I ink  K root.0  L clay.lt  S clay.sh  W salt`

A button that steps through values (a graphics preset) is this same button; its label is the present value.

### 5.7 Tabs

A tab is a small slab of the host's ramp that sticks out of it and carries one 16 by 16 item icon. Tabs along one edge share outline columns: the pitch is 23 for a tab 24 wide, and the first is flush with the slab's corner.

**Top tab**, 24 wide. The chosen tab rises 21 units above the slab's outline row and is joined to it: across its inner width the slab's outline and light edge are gone and the face runs through. Its icon is at 4, 4 from the tab's top left. A tab not chosen rises 18, is flat `sh` with a light row and column of `lt` and a dark column of `pit`, stops at the slab's outline, and has its icon at 4, 2.

```
     0         1         2         3         4         5         
     012345678901234567890123456789012345678901234567890123456789
  0  .KKKKKKKKKKKKKKKKKKKKKK.....................................
  1  K1111111111111111111113K....................................
  2  K1222222222222222222236K....................................
  3  K1233333333333333333346KKKKKKKKKKKKKKKKKKKKKKK..............
  4  K1233333333333333333346K2222222222222222222224K.............
  5  K1233333333333333333346K2444444444444444444446K.............
  6  K1233333333333333333346K2444444444444444444446K.............
  7  K1233333333333333333346K2444444444444444444446K.............
  8  K1233333333333333333346K2444444444444444444446K.............
  9  K1233333333333333333346K2444444444444444444446K.............
 10  K1233333333333333333346K2444444444444444444446K.............
 11  K1233333333333333333346K2444444444444444444446K.............
 12  K1233333333333333333346K2444444444444444444446K.............
 13  K1233333333333333333346K2444444444444444444446K.............
 14  K1233333333333333333346K2444444444444444444446K.............
 15  K1233333333333333333346K2444444444444444444446K.............
 16  K1233333333333333333346K2444444444444444444446K.............
 17  K1233333333333333333346K2444444444444444444446K.............
 18  K1233333333333333333346K2444444444444444444446K.............
 19  K1233333333333333333346K2444444444444444444446K.............
 20  K1233333333333333333346K2444444444444444444446K.............
 21  K1233333333333333333346KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
 22  K1233333333333333333331111111111111111111111111111111111113K
 23  K1233333333333333333322222222222222222222222222222222222236K
 24  K1233333333333333333333333333333333333333333333333333333346K
 25  K1233333333333333333333333333333333333333333333333333333346K
 26  K1233333333333333333333333333333333333333333333333333333346K
 27  K1233333333333333333333333333333333333333333333333333333346K
 28  K1233333333333333333333333333333333333333333333333333333346K
 29  K1233333333333333333333333333333333333333333333333333333346K
 30  K1233333333333333333333333333333333333333333333333333333346K
 31  K1233333333333333333333333333333333333333333333333333333346K
 32  K1233333333333333333333333333333333333333333333333333333346K
 33  K1233333333333333333333333333333333333333333333333333333346K
```
`. nothing  1 hi  2 lt  3 face  4 sh  6 pit  K root.0   (digits are tones of the host slab's ramp; shown in timber)`

**Side tab**, 24 tall, on the left edge, by the same construction turned: the chosen one stands out 21 with its icon at 4, 4, the others 18 with the icon at 2, 4.

```
     0         1         2         3         
     0123456789012345678901234567890123456789
  0  ......................KKKKKKKKKKKKKKKKKK
  1  .....................K111111111111111111
  2  .....................K122222222222222222
  3  .....................K123333333333333333
  4  .....................K123333333333333333
  5  .....................K123333333333333333
  6  .KKKKKKKKKKKKKKKKKKKKK123333333333333333
  7  K111111111111111111111113333333333333333
  8  K122222222222222222222223333333333333333
  9  K123333333333333333333333333333333333333
 10  K123333333333333333333333333333333333333
 11  K123333333333333333333333333333333333333
 12  K123333333333333333333333333333333333333
 13  K123333333333333333333333333333333333333
 14  K123333333333333333333333333333333333333
 15  K123333333333333333333333333333333333333
 16  K123333333333333333333333333333333333333
 17  K123333333333333333333333333333333333333
 18  K123333333333333333333333333333333333333
 19  K123333333333333333333333333333333333333
 20  K123333333333333333333333333333333333333
 21  K123333333333333333333333333333333333333
 22  K123333333333333333333333333333333333333
 23  K123333333333333333333333333333333333333
 24  K123333333333333333333333333333333333333
 25  K123333333333333333333333333333333333333
 26  K123333333333333333333333333333333333333
 27  K134444444444444444444323333333333333333
 28  K366666666666666666666123333333333333333
 29  .KKKKKKKKKKKKKKKKKKKKK123333333333333333
 30  ...K22222222222222222K123333333333333333
 31  ...K24444444444444444K123333333333333333
 32  ...K24444444444444444K123333333333333333
 33  ...K24444444444444444K123333333333333333
 34  ...K24444444444444444K123333333333333333
 35  ...K24444444444444444K123333333333333333
 36  ...K24444444444444444K123333333333333333
 37  ...K24444444444444444K123333333333333333
 38  ...K24444444444444444K123333333333333333
 39  ...K24444444444444444K123333333333333333
 40  ...K24444444444444444K123333333333333333
 41  ...K24444444444444444K123333333333333333
 42  ...K24444444444444444K123333333333333333
 43  ...K24444444444444444K123333333333333333
 44  ...K24444444444444444K123333333333333333
 45  ...K24444444444444444K123333333333333333
 46  ...K24444444444444444K123333333333333333
 47  ...K24444444444444444K123333333333333333
 48  ...K24444444444444444K123333333333333333
 49  ...K24444444444444444K123333333333333333
 50  ...K24444444444444444K123333333333333333
 51  ...K46666666666666666K123333333333333333
 52  ....KKKKKKKKKKKKKKKKKK123333333333333333
 53  .....................K123333333333333333
 54  .....................K123333333333333333
 55  .....................K123333333333333333
```
`. nothing  1 hi  2 lt  3 face  4 sh  6 pit  K root.0   (digits are tones of the host slab's ramp; shown in timber)`

A tab's name is its tooltip. A tab that cannot be chosen yet is not drawn, except in a row whose tabs keep one order from screen to screen (the stations of the recipe panel): there it stands in its place, flat `dk` inside its outline, its icon flat in `sh`, and the lock of a locked slot (5.4), 7 by 7, at its icon's bottom right (10, 9 from the icon), so that it is told from a tab that is merely not chosen, which keeps its icon at full brightness. Dim alone, the two read alike.

A chosen tab flush with the slab's far corner (the last of a row that fills the edge) carries its dark columns, `sh` and `pit`, straight down into the slab's dark edge, with no light step where the slab's corner stood: the light step drawn there stuck a notch of `hi` out into the dark edge.

### 5.8 Dark well, list row, scroll track

A list lives in a well: a sunk rectangle with `root.0` along the top and left, a light edge along the bottom and right and a floor of `root.1`. The light edge is the `hi` of the slab the well is sunk in (`salt` on clay, as drawn here) and `stone.lt` on the ground tile. Fields, checkboxes and slider grooves take their light edge by the same rule. Rows are 18 tall and as wide as the floor less the scroll track. In a row: the icon at 1, 1; the name's cell at 20, 4, `salt` or a grade's colour, with shadow; a number right-aligned 3 units from the row's right end. A hovered row has a floor of `root.2`. The chosen row has a floor of `root.3` and no frame: a frame of `salt` round a row means only that the keys are on it, so that a chosen row never reads as a web list's outlined selection. A row that cannot be used is all `root.4`.

The scroll track is the last 6 units of the floor, `root.0`. Its thumb stands 4 wide inside it, a column of `root.0` left on either side, and is `root.3` with a top row of `root.4`, a bottom row of `root.2` and three grip rows of `root.1` at its middle; hovered or dragged, the thumb is `root.4` with a top row of `salt`. The thumb is never shorter than 12. At the track's full width the chosen row's `root.3` floor ran straight into the thumb and the two read as one block; the column of `root.0` between them is the gutter that keeps them apart. A list that fits has no track and its rows take the whole floor.

```
     0         1         2         3         4         5         6         7         
     01234567890123456789012345678901234567890123456789012345678901234567890123456789
  0  KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
  1  KjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjKKKKKKW
  2  KjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjKKKKKKW
  3  KjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjKKKKKKW
  4  KjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjKggggKW
  5  KjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjKhhhhKW
  6  KjjjjjjjjjjjjjjjjjjjjWWWWjjjjjjjjWjjjjjWjjjjjWjjjjjjjjjjjjjjjWjjjWWWWjjjjKhhhhKW
  7  KjjjjjjjjjjjjjjjjjjjjWKKKWjjjjjjjWKjjjjWKjjjjWKjjjjjjjjjjjjjWWKjjjKKKWjjjKhhhhKW
  8  KjjjjjjjjjjjjjjjjjjjjWKjjWKWjjjWjWWWWjjWWWWjjWKjWWWWjjjjjjjjjWKjjjjjjWKjjKhhhhKW
  9  KjjjjjjjjjjjjjjjjjjjjWWWWjKWKjjWKWKKKWjWKKKWjWKjWKKKWjjjjjjjjWKjjjjjWjKjjKhkkhKW
 10  KjjjjjjjjjjjjjjjjjjjjWKWKKjWKjjWKWKjjWKWKjjWKWKjWWWWWKjjjjjjjWKjjjjWjKjjjKhhhhKW
 11  KjjjjjjjjjjjjjjjjjjjjWKjWjjWKjjWKWKjjWKWKjjWKWKjWKKKKKjjjjjjjWKjjjWjKjjjjKhkkhKW
 12  KjjjjjjjjjjjjjjjjjjjjWKjjWjjWWWWKWWWWWKWWWWWKWWjjWWWWjjjjjjjWWWjjWWWWWjjjKhhhhKW
 13  KjjjjjjjjjjjjjjjjjjjjjKjjjKjjKKKKjKKKKKjKKKKKjKKjjKKKKjjjjjjjKKKjjKKKKKjjKhkkhKW
 14  KjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjKhhhhKW
 15  KjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjKhhhhKW
 16  KjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjKhhhhKW
 17  KjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjW
 18  KjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjKKKKKKW
 19  KWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWKKKKKKW
 20  KWhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhWKKKKKKW
 21  KWhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhWKKKKKKW
 22  KWhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhWKKKKKKW
 23  KWhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhWKKKKKKW
 24  KWhhhhhhhhhhhhhhhhhhhWWWWWhhhhhhhhhhhhhhhhWhhhhhhhhhhhhhhhhhhhhhhWWWWhhhWKKKKKKW
 25  KWhhhhhhhhhhhhhhhhhhhhKWKKKhhhhhhhhhhhhhhhWKhhhhhhhhhhhhhhhhhhhhhhKKKWhhWKKKKKKW
 26  KWhhhhhhhhhhhhhhhhhhhhhWKhhWWWWhhWWWhWWWWhWWWWhhhhhhhhhhhhhhhhhhhhhhhWKhWKKKKKKW
 27  KWhhhhhhhhhhhhhhhhhhhhhWKhhWKKKWhWKKKWKKKKWKKKWhhhhhhhhhhhhhhhhhhhhhWhKhWKKKKKKW
 28  KWhhhhhhhhhhhhhhhhhhhhhWKhhWKhhWKWKhhWKhhhWKhhWKhhhhhhhhhhhhhhhhhhhWhKhhWKKKKKKW
 29  KWhhhhhhhhhhhhhhhhhhhhhWKhhWKhhWKWKhhWKhhhWKhhWKhhhhhhhhhhhhhhhhhhWhKhhhWKKKKKKW
 30  KWhhhhhhhhhhhhhhhhhhhhhWKhhhWWWWKWKhhhWWWhWKhhWKhhhhhhhhhhhhhhhhhWWWWWhhWKKKKKKW
 31  KWhhhhhhhhhhhhhhhhhhhhhhKhhhhKKKKhKhhhhKKKhKhhhKhhhhhhhhhhhhhhhhhhKKKKKhWKKKKKKW
 32  KWhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhWKKKKKKW
 33  KWhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhWKKKKKKW
 34  KWhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhWKKKKKKW
 35  KWhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhWKKKKKKW
 36  KWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWKKKKKKW
 37  .WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
```
`. nothing  g root.4  h root.3  j root.2  k root.1  K root.0  W salt`

A well also frames things that are not lists: the figure in the pack, the picture in the codex, the field of the tree, the chart of the map.

Where rows of controls scroll on a slab and not in a well (settings), the track is a channel sunk in the slab (5.14 turned upright, 6 wide with its rim, floor `dk`) and its thumb is the slider's handle, 6 wide and never shorter than 12.

### 5.9 Text field

A sunk dark field, 14 tall in a window and 20 tall in the form of a full-screen menu (16 where a slab holds one), with the edges of a well. The text's cell is at 4, 2 (4, 3 when 16 tall, 4, 5 when 20), `salt` with shadow. With focus it has a frame of `salt` inside its edges and a caret: one unit wide, 10 tall, `salt`, one unit after the last glyph, on for 0.5 s and off for 0.5 s. A selection is a fill of `arm.dk` behind the selected glyphs. The placeholder is `root.4` with no shadow. A refused key gives the field a frame of `blood` for 0.3 s. Text longer than the field scrolls so that the caret stays inside.

```
     0         1         2         3         4         5         6         7         8         9         0  
     0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012
  0  KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK....KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
  1  KWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW...KkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkW
  2  KWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkWkkkkkkkkkkkkkkkkWW...KkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkW
  3  KWkkkWWWWkkkkkkkkkkkkkkkkkWkkkkWkkkkkkkkkkkkkkkkWW...KkkkkggggkkkkkkkkkkkkkkkkkgkkkkkkkkkkkkkkkkkkkkkkW
  4  KWkkWkKKKKkkkkkkkkkkkkkkkkWKkkkWkkkkkkkkkkkkkkkkWW...KkkkgkkkkkkkkkkkkkkkkkkkkkgkkkkkkkkkkkkkkkkkkkkkkW
  5  KWkkWKkkkkWWWWkkWWWWkkWWWkWKkWkWkkkkkkkkkkkkkkkkWW...KkkkgkkkkkggggkkggggkkgggggkkkkkkkkkkkkkkkkkkkkkkW
  6  KWkkkWWWkkWKKKWkkKKKWkWKKKWKWkKWkkkkkkkkkkkkkkkkWW...KkkkkgggkkgkkkgkgkkkgkgkkkgkkkkkkkkkkkkkkkkkkkkkkW
  7  KWkkkkKKWkWKkkWKkWWWWKWKkkWWkKkWkkkkkkkkkkkkkkkkWW...KkkkkkkkgkgggggkgggggkgkkkgkkkkkkkkkkkkkkkkkkkkkkW
  8  KWkkkkkkWKWKkkWKWkKKWKWKkkWKWkkWkkkkkkkkkkkkkkkkWW...KkkkkkkkgkgkkkkkgkkkkkgkkkgkkkkkkkkkkkkkkkkkkkkkkW
  9  KWkkWWWWkKWWWWWKkWWWWKWKkkWKkWkWkkkkkkkkkkkkkkkkWW...KkkkggggkkkggggkkggggkkggggkkkkkkkkkkkkkkkkkkkkkkW
 10  KWkkkKKKKkWKKKKKkkKKKKkKkkkKkkKWkkkkkkkkkkkkkkkkWW...KkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkW
 11  KWkkkkkkkkWKkkkkkkkkkkkkkkkkkkkWkkkkkkkkkkkkkkkkWW...KkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkW
 12  KWWWWWWWWWWKWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW...KkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkW
 13  .WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW....WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
```
`. nothing  g root.4  k root.1  K root.0  W salt`

### 5.10 Checkbox

12 by 12, with the edges of a well. Off: its floor is the slab's slot floor (`sh`), an empty hollow like a slot; a box filled with `root.1` while off read at a glance as filled, which is to say on. On: the floor is `root.1` and on it the check mark in `salt`, 7 by 6 and two units thick, at 2, 2, with its shadow of `root.0` one unit right and down like any letter on dark; a tick one unit thin in a dark box was too faint a difference between on and off. Hovered or focused: a frame of `salt` inside. Its label is ink on the slab, cell at x + 15, y + 1.

```
     0         1         2     
     01234567890123456789012345
  0  KKKKKKKKKKK...KKKKKKKKKKK.
  1  KkkkkkkkkkkW..KSSSSSSSSSSW
  2  KkkkkkkkWkkW..KSSSSSSSSSSW
  3  KkkkkkkWWKkW..KSSSSSSSSSSW
  4  KkWkkkWWKKkW..KSSSSSSSSSSW
  5  KkWWkWWKKkkW..KSSSSSSSSSSW
  6  KkkWWWKKkkkW..KSSSSSSSSSSW
  7  KkkkWKKkkkkW..KSSSSSSSSSSW
  8  KkkkkKkkkkkW..KSSSSSSSSSSW
  9  KkkkkkkkkkkW..KSSSSSSSSSSW
 10  KkkkkkkkkkkW..KSSSSSSSSSSW
 11  .WWWWWWWWWWW...WWWWWWWWWWW
```
`. nothing  k root.1  K root.0  W salt  S clay.sh`. On a dark plate or the ground tile both floors are `root.1`, the box being a hole in the dark either way.

### 5.11 Slider

A channel 14 tall, sunk into its host the way a slot is: `root.0` along its top and left, `hi` of the host ramp along its bottom and right, floor `dk` of the host ramp (`root.1` on dark or on the ground tile). The run from its left end to the handle is `sh` of the ramp (`root.2` on dark): the hollow fills as the value grows. When the setting has 16 steps or fewer (and they stand 4 units or more apart), a notch of `pit` (`root.3` on dark) 1 by 2 marks each step at the top and at the bottom of the floor, where the handle's centre would stand. A setting of more steps (field of view by the degree, mouse sensitivity) is moved as if continuous and has no notches, so that a notched channel always means steps and a plain one never does. The handle is 8 by 14 and stands across the channel: outline `root.0` with its corners left out, `stone.hi` along its top and left, a face of `stone.face`, `stone.sh` along its right and bottom, and a grip cut down its middle as a `stone.dk` column beside a `stone.hi` column, rows 4 to 9. Hovered, dragged or focused, the handle's outline is `salt`. The handle moves by whole units; a slider 80 wide has 72 stops, and the value snaps to the nearest step of its setting. The value is not written on the slider: it stands in ink in the label column, right-aligned 4 units left of the channel, with its unit ("70°", "10 s"). A measure of a few even steps from nothing, a volume or the screen shake, is written out of its top, "9 of 10", and "Off" at 0: a lone digit left open whether 9 was full. A thin groove with a pale fill and a small knob reads as a web page's range input, not as a thing cut in the slab.

```
     0         1         2         3         4         5         
     012345678901234567890123456789012345678901234567890123456789
  0  KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
  1  K444444444444644444446KAAAAAHK555555565555555655555556555551
  2  K444444444444644444446KAHHHHJK555555565555555655555556555551
  3  K444444444444444444444KAHHHHJK555555555555555555555555555551
  4  K444444444444444444444KAHMAHJK555555555555555555555555555551
  5  K444444444444444444444KAHMAHJK555555555555555555555555555551
  6  K444444444444444444444KAHMAHJK555555555555555555555555555551
  7  K444444444444444444444KAHMAHJK555555555555555555555555555551
  8  K444444444444444444444KAHMAHJK555555555555555555555555555551
  9  K444444444444444444444KAHMAHJK555555555555555555555555555551
 10  K444444444444444444444KAHHHHJK555555555555555555555555555551
 11  K444444444444644444446KAHHHHJK555555565555555655555556555551
 12  K444444444444644444446KHJJJJJK555555565555555655555556555551
 13  K1111111111111111111111KKKKKK1111111111111111111111111111111
```
`. nothing  1 hi  4 sh  5 dk  6 pit  A stone.hi  H stone.face  J stone.sh  K root.0  M stone.dk   (digits are tones of the host slab's ramp)`

### 5.12 Tooltip

A dark plate with a frame in the colour of the thing's grade (`root.4` for Surface and for anything that is not an item), one unit deep inside the `root.0` outline. The frame is lit like every part: its top and left in the grade's colour, its right and bottom one step down in the same ramp (`root.4` to `root.3`, `growth.lt` to `growth`, `cyan.lt` to `cyan.dk`, `violet.lt` to `violet.dk`, `dusk.lt` to `ember`, `rose.lt` to `rose.dk`, `ember.hi` to `ember.lt`, `blood` to `blood.dk`). A frame one flat colour all round read as a hairline drawn round a box. The status frames (5.18) and every framed plate take the same step. The first cell is at 5, 3. Lines advance 10. After the first line 2 extra units. Width is the widest line plus 10; height is 10 to the line plus 7, plus the 2 when there is more than one line. Lines wrap at 180.

Order of lines: the name in the grade's colour; the grade and kind in `root.4` ("Deep grade, tool": the word grade is written, since "Upper, tool" alone does not say what Upper is); what it does in `salt`, each stat once with any modifier already in it ("+4 defence" for Thick Iron Greaves, never "+2 defence" and then "+2 more defence"); lines that compare, `growth.lt` or `blood.lt`, which name the stat's change and what it is set against and do not repeat the stat ("+3 over Hide Trousers"); a set line in `arm.lt`; the telling of the thing in `root.4`; last, what the mouse does here in `root.4` with the mouse symbols.

```
     0         1         2         3         4         5         
     012345678901234567890123456789012345678901234567890123456789
  0  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
  1  KcccccccccccccccccccccccccccccccccccccccccccccccccccccccccCK
  2  KckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkCK
  3  KckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkCK
  4  KckkkckkkckccckkkkkkkkkkkckkkkkkkkcccckkckkkkkkckkkkkkkkkkCK
  5  KckkkcKkkcKkKKKkkkkkkkkkkcKkkkkkkkcKKKckkKkkkkkcKkkkkkkkkkCK
  6  KckkkcKkkcKkckkccckcccckkcKkckkkkkcKkkcKckcccckcKkckkkkkkkCK
  7  KckkkcccccKkcKkcKKKkKKKckcKckKkkkkcccckKcKcKKKKcKckKkkkkkkCK
  8  KckkkcKKKcKkcKkcKkkkccccKcckKkkkkkcKKKKkcKcKkkkcckKkkkkkkkCK
  9  KckkkcKkkcKkcKkcKkkckKKcKcKckkkkkkcKkkkkcKcKkkkcKckkkkkkkkCK
 10  KckkkcKkkcKkcKkcKkkkccccKcKkckkkkkcKkkkkcKkccckcKkckkkkkkkCK
 11  KckkkkKkkkKkkKkkKkkkkKKKKkKkkKkkkkkKkkkkkKkkKKKkKkkKkkkkkkCK
 12  KckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkCK
 13  KckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkCK
 14  KckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkCK
 15  KckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkCK
 16  KckkkggggkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkgkkkkCK
 17  KckkkgKKKgkkkkkkkkkkkkkkkkkkkkkkkkkkkgkkkkkkkkkkkkkkkgKkkkCK
 18  KckkkgKkkgKggggkkggggkkggggkkkkkkkkkggggkggggkkggggkkgKkkkCK
 19  KckkkgKkkgKgKKKgkgKKKgkgKKKgkkkkkkkkkgKKKgKKKgkgKKKgkgKkkkCK
 20  KckkkgKkkgKgggggKgggggKgKkkgKkkkkkkkkgKkkgKkkgKgKkkgKgKkkkCK
 21  KckkkgKkkgKgKKKKKgKKKKKgKkkgKkkkkkkkkgKkkgKkkgKgKkkgKgKkkkCK
 22  KckkkggggkKkggggkkggggkgggggKkgkkkkkkkggkkggggKkggggKggkkkCK
 23  KckkkkKKKKkkkKKKKkkKKKKgKKKKKgkKkkkkkkkKKkkKKKKkkKKKKkKKkkCK
 24  KckkkkkkkkkkkkkkkkkkkkkgKkkkkkKkkkkkkkkkkkkkkkkkkkkkkkkkkkCK
 25  KckkkkkkkkkkkkkkkkkkkkkkKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkCK
 26  KckkkkkkkkknnnnkkkkkkkkkkkkkkkkkkkkkkkkkkknkkkkkkkkkkkkkkkCK
 27  KckkkkknkkkkKKKnkkkkkkkkkkkkkkkkkkkkkkkkkknKkkkkkkkkkkkkkkCK
 28  KckkkkknKkkkkkknKkkkknnnknnnnkknnnnkknnnnknnnnkkkkkkkkkkkkCK
 29  KckkknnnnnkkkknkKkkkknKKKnKKKnkkKKKnknKKKKnKKKnkkkkkkkkkkkCK
 30  KckkkkKnKKKkknkKkkkkknKkknnnnnKknnnnKnKkkknKkknKkkkkkkkkkkCK
 31  KckkkkknKkkknkKkkkkkknKkknKKKKKnkKKnKnKkkknKkknKkkkkkkkkkkCK
 32  KckkkkkkKkknnnnnkkkkknKkkknnnnkknnnnKknnnknKkknKkkkkkkkkkkCK
 33  KckkkkkkkkkkKKKKKkkkkkKkkkkKKKKkkKKKKkkKKKkKkkkKkkkkkkkkkkCK
 34  KckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkCK
 35  KckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkCK
 36  KckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkCK
 37  KcCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCK
 38  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
```
`. nothing  c cyan.lt  C cyan.dk  g root.4  k root.1  K root.0  n growth.lt`

**A named old thing** has a second frame of `salt` inside the first, stepped to `clay.lt` on its right and bottom; its first cell is at 6, 4 and it is 2 wider and 2 taller than the rule above gives. Its first line is its own name; its second says what it is.

```
     0         1         2         3         4         5         6        
     012345678901234567890123456789012345678901234567890123456789012345678
  0  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
  1  KyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyoK
  2  KyWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWLoK
  3  KyWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkLoK
  4  KyWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkLoK
  5  KyWkkkyyyykkkkkkkkykkkkkkkkkkkkkkkkyyyykkkkkkkkkkkkkkkkkkkkkkkykkkLoK
  6  KyWkkkyKKKykkkkkkkkKkkkkkkkkkkkkkkykKKKKkkkkkkkkkkkkkkkkkkkkkkyKkkLoK
  7  KyWkkkyKkkkKyyyykkykyyykyyyykkkkkkyKkkkkykkykkykyyyykkyyykyyyyyKkkLoK
  8  KyWkkkyKkkkkkKKKykyKyKKKyKKKykkkkkkyyykkyKkyKkyKyKKKykyKKKyKKKyKkkLoK
  9  KyWkkkyKkkkkkyyyyKyKyKkkyKkkyKkkkkkkKKykyKkyKkyKyKkkyKyKkkyKkkyKkkLoK
 10  KyWkkkyKkkykykKKyKyKyKkkyKkkyKkkkkkkkkyKyKkyKkyKyKkkyKyKkkyKkkyKkkLoK
 11  KyWkkkkyyyyKkyyyyKyKyKkkyKkkyKkkkkyyyykKkyyyyyyKkyyyyKyKkkkyyyyKkkLoK
 12  KyWkkkkkKKKKkkKKKKkKkKkkkKkkkKkkkkkKKKKkkkKKKKKKkkKKKKkKkkkkKKKKkkLoK
 13  KyWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkLoK
 14  KyWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkLoK
 15  KyWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkLoK
 16  KyWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkLoK
 17  KyWkkkggggkkgkkkkkkgkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkgkkkkkkkkkkLoK
 18  KyWkkkgKKKgkgKkkkkkgKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkgKkkkkkkkkkLoK
 19  KyWkkkgKkkgKgKkgggggKkkkkkkkkgggkgkkgkkgkggggkkgggkgggggKkkkkkkkkkLoK
 20  KyWkkkgKkkgKgKkgKKKgKkkkkkkkgkKKKgKkgKkgKgKKKgkgKKKgKKKgKkkkkkkkkkLoK
 21  KyWkkkgKkkgKgKkgKkkgKkkkkkkkkggkkgKkgKkgKgKkkgKgKkkgKkkgKkkkkkkkkkLoK
 22  KyWkkkgKkkgKgKkgKkkgKkkkkkkkkkKgkgKkgKkgKgKkkgKgKkkgKkkgKkkkkkkkkkLoK
 23  KyWkkkkggggKggkkggggKkgkkkkkgggkKkggggggKkggggKgKkkkggggKkkkkkkkkkLoK
 24  KyWkkkkkKKKKkKKkkKKKKgkKkkkkkKKKkkkKKKKKKkkKKKKkKkkkkKKKKkkkkkkkkkLoK
 25  KyWkkkkkkkkkkkkkkkkkkkKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkLoK
 26  KyWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkLoK
 27  KyWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkLoK
 28  KyWLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLoK
 29  KyooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooK
 30  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
```
`. nothing  g root.4  k root.1  K root.0  L clay.lt  o ember.lt  W salt  y ember.hi`

### 5.13 Progress arrow

A hollow in the shape of an arrow, 22 by 15 with its rim. It is built by the rule for every sunk shape: the shape's own units are floor (`dk`); a unit just above or just left of the shape is `pit`; a unit just below or just right of it is `hi`. It fills from the left, one column of units at a time, in `ember` (in `arm` at the Line Frame). Empty, and at six tenths:

```
     0         1         2         3         4     
     0123456789012345678901234567890123456789012345
  0  ..............6.......................6.......
  1  .............656.....................656......
  2  .............6556....................6556.....
  3  .............65556...................65556....
  4  .............655556..................655556...
  5  .6666666666666555556.....6666666666666555556..
  6  655555555555555555556...6OOOOOOOOOOOO55555556.
  7  6555555555555555555551..6OOOOOOOOOOOO555555551
  8  655555555555555555551...6OOOOOOOOOOOO55555551.
  9  .1111111111116555551.....1111111111116555551..
 10  .............655551..................655551...
 11  .............65551...................65551....
 12  .............6551....................6551.....
 13  .............651.....................651......
 14  ..............1.......................1.......
```
`. nothing  1 hi  5 dk  6 pit  O ember   (digits are tones of the host slab's ramp; shown in timber)`

### 5.14 Gauges

**Burn gauge**, 13 by 15: a hollow in the shape of one tongue of flame, leaning a little to the right, by the same rule; it has no cleft, so that it fills as one shape. It shows the fuel left and empties from the top by whole rows. Its fill is shaped as a flame lit from within, never banded: `ember` on the body, `ember.dk` on the right unit of each row and along the bottom row, an inner tongue of `ember.lt` that widens toward the base (column 6 on rows 4 and 5, 5 to 6 on rows 6 and 7, 4 to 6 on row 8, 4 to 7 on rows 9 and 10, 5 to 7 on row 11), and `ember.hi` only at the tip: the top unit of rows 1 and 2 when full, otherwise the tongue's highest lit row. **Upright gauge**, 6 wide: a channel 4 wide that fills from the bottom in one colour. Empty flame, a flame at 55 hundredths, an upright gauge at four tenths:

```
     0         1         2         3
     012345678901234567890123456789012345
  0  ......6..............6.........6666.
  1  .....656............656.......655551
  2  .....6551...........6551......655551
  3  ....65556..........65556......655551
  4  ....655551.........655551.....655551
  5  ...6555551........6555551.....655551
  6  ..65555556.......65555556.....655551
  7  ..655555556......6OOyyOOu6....655551
  8  .65555555551....6OOoooOOOu1...655551
  9  655555555556...6OOOooooOOu6...655551
 10  6555555555551..6OOOooooOOOu1..655551
 11  6555555555551..6OOOOoooOOOu1..655551
 12  .65555555551....6OOOOOOOOu1...655551
 13  ..655555551......6uuuuuuu1....6OOOO1
 14  ...1111111........1111111.....6OOOO1
 15  ..............................6OOOO1
 16  ..............................6OOOO1
 17  ..............................6OOOO1
 18  ..............................6OOOO1
 19  ..............................6OOOO1
 20  ..............................6OOOO1
 21  ...............................1111.
```
`. nothing  1 hi  5 dk  6 pit  o ember.lt  O ember  u ember.dk  y ember.hi   (digits are tones of the host slab's ramp; shown in timber)`

**Channel**, 7 tall: a channel 5 tall that fills from the left. Used for a count toward a step, for standing, for loading.

```
     0         1         2         3         4 
     012345678901234567890123456789012345678901
  0  .6666666666666666666666666666666666666666.
  1  6OOOOOOOOOOOOOOOOOOOOOO5555555555555555551
  2  6OOOOOOOOOOOOOOOOOOOOOO5555555555555555551
  3  6OOOOOOOOOOOOOOOOOOOOOO5555555555555555551
  4  6OOOOOOOOOOOOOOOOOOOOOO5555555555555555551
  5  6OOOOOOOOOOOOOOOOOOOOOO5555555555555555551
  6  .1111111111111111111111111111111111111111.
```
`. nothing  1 hi  5 dk  6 pit  O ember   (digits are tones of the host slab's ramp; shown in timber)`

A channel that counts whole things (a step's "2 of 3", the five notches of standing) is cut into that many segments, with a column of `pit` one unit wide between two segments, and each segment fills whole or not at all; the floor is shared out so that no two segments differ by more than a unit. A count of more than 12 fills by units as above. A solid run for "2 of 3" was the one strip in the game with no segments, and a fill stopping partway through a notch did not say the score. On standing, the way toward the next notch is a line of `ember` one unit tall a unit under the channel, under the segment it will fill, as long as the share of that segment earned.

### 5.15 Pips and strips of the HUD

**Pips.** 9 by 9, ten to a row at a pitch of 8, so a row is 81 wide. Each is drawn 7 wide in columns 1 to 7 of its cell, so one clear column stands between neighbours and no two pips share an outline. Life is a drop in blood. Hunger is one bowl outline for every state, a bowl and never a cup: no stem, wider than it is deep. A rim 7 wide in `ember.lt`, a belly below it 7 wide in `ember` with `ember.dk` on its right two columns, then a foot ring 3 wide in `ember.dk` and a base of `root.0` 3 wide, so the underside rounds. Full, a heap of food 3 wide in `ember.hi` stands over the rim, its last unit `ember.lt`, its outline flat with the rim's so the full bowl has shoulders and never rounds into a ball. Empty is the same bowl with no heap, in `root.2` with a `root.3` rim and a `root.1` foot. Half is the full pip's left five columns, heap and all, beside the empty one's rest. (A goblet with a stem and a flared foot, tried first, read as a trophy full and an anvil empty; a deeper bowl read as a bucket. The bowl is 7 wide, not 9, so that a clear column still stands between neighbours.) The arm is a hand in arm blue: three fingers and a thumb inside the 7 columns, the fingertips in `arm.lt`, the last column in `arm.dk`. A pip is full, half (its left five columns lit) or empty (`root.2`). Each row below shows full, half, empty.

```
     0         1         2        
     01234567890123456789012345678
  0  ....K.........K.........K....
  1  ...KrK.......KrK.......KjK...
  2  ..KrRRK.....KrRjK.....KjjjK..
  3  ..KrRRK.....KrRjK.....KjjjK..
  4  .KrRRRRK...KrRRjjK...KjjjjjK.
  5  .KRRRRqK...KRRRjjK...KjjjjjK.
  6  .KRRRRqK...KRRRjjK...KjjjjjK.
  7  ..KRqqK.....KRqjK.....KjjjK..
  8  ...KKK.......KKK.......KKK...
  9  .............................
 10  .............................
 11  .............................
 12  ...KKK.......KK..............
 13  .KKyyoKK...KKyyKKK...KKKKKKK.
 14  .KoooooK...KooohhK...KhhhhhK.
 15  .KOOOuuK...KOOOjjK...KjjjjjK.
 16  ..KuuuK.....KuukK.....KkkkK..
 17  ...KKK.......KKK.......KKK...
 18  .............................
 19  .............................
 20  ..K.K.K.....K.K.K.....K.K.K..
 21  .KbKbKbK...KbKbKjK...KjKjKjK.
 22  .KBKBKdK...KBKBKjK...KjKjKjK.
 23  .KBBBBdK...KBBBjjK...KjjjjjK.
 24  .KKBBBdK...KKBBjjK...KKjjjjK.
 25  .KbKBBdK...KbKBjjK...KjKjjjK.
 26  .KBBBBdK...KBBBjjK...KjjjjjK.
 27  ..KBBdK.....KBBjK.....KjjjK..
 28  ...KKK.......KKK.......KKK...
```
`. nothing  b arm.lt  B arm  d arm.dk  h root.3  j root.2  k root.1  K root.0  o ember.lt  O ember  q blood.dk  r blood.lt  R blood  u ember.dk  y ember.hi`

A pip is a tenth of the measure's maximum. With `v = 10 * now / max`, pip `i` (counted from 0 at the end the row fills from) is full when `v >= i + 0.75`, half when `v >= i + 0.25`, else empty; while `now` is above nothing the first pip is at least half. The life row fills from the left. The hunger and arm rows are right-aligned and fill from the right, drawn mirrored.

Life at a quarter or less: each pip moves one unit up or down, changing every fourth frame. Life mending: one pip at a time stands one unit higher, the raised place moving along the row once a second. Hunger at 4 or less shakes the same way.

**Thin strip**, 5 tall: outline, then 3 rows. Lit: the first row in the `lt` tone, the second in the mid tone, the third in the `dk` tone. Unlit: `root.2`. Segment lines of `root.0` one unit wide divide it evenly. It fills from the left by whole units. The practice strip over the hotbar is 182 wide with 18 segments, in growth.

```
     0         1         2         3         4 
     012345678901234567890123456789012345678901
  0  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
  1  KnnnnnnnnnKnnnnnnnnnKnnnnjjjjjKjjjjjjjjjjK
  2  KNNNNNNNNNKNNNNNNNNNKNNNNjjjjjKjjjjjjjjjjK
  3  KmmmmmmmmmKmmmmmmmmmKmmmmjjjjjKjjjjjjjjjjK
  4  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
```
`. nothing  j root.2  K root.0  m growth.dk  n growth.lt  N growth`

**Strip**, 7 tall: outline, then 5 rows: the first `lt`, three mid, the last `dk`; unlit `root.2` under a first row of `root.1`. When the measure drops, the part just lost stays lit in `ember.lt` for 0.4 s and then shortens by 2 units a frame.

```
     0         1         2         3         4         5     
     01234567890123456789012345678901234567890123456789012345
  0  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
  1  KrrrrrrrrrrrrrrrrrKrrrrrrrrrooooookkKkkkkkkkkkkkkkkkkkkK
  2  KRRRRRRRRRRRRRRRRRKRRRRRRRRRoooooojjKjjjjjjjjjjjjjjjjjjK
  3  KRRRRRRRRRRRRRRRRRKRRRRRRRRRoooooojjKjjjjjjjjjjjjjjjjjjK
  4  KRRRRRRRRRRRRRRRRRKRRRRRRRRRoooooojjKjjjjjjjjjjjjjjjjjjK
  5  KqqqqqqqqqqqqqqqqqKqqqqqqqqqoooooojjKjjjjjjjjjjjjjjjjjjK
  6  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
```
`. nothing  j root.2  k root.1  K root.0  o ember.lt  q blood.dk  r blood.lt  R blood`

### 5.16 Hotbar and selector

One strip 182 by 22, not a dark plate with slots dropped in it and not nine framed boxes. An outline of `root.0` round the whole strip, and dividers of `root.0` one unit wide at x 20, 40 … 160, so that nine cells stand at a pitch of 20 inside one outline. Each cell is sunk in the strip, lit from the top left: a row and a column of `stone.pit` along its top and left, a floor of `stone.dk`, a row and a column of `stone.sh` along its bottom and right. The icon stands at x 3 + 20i, y 3; its count at the floor's bottom right as in a slot (its last column at 16 + 20i, its lowest row at 18). The cells are 19 wide, the last 20, since nine pitches of 20 and two outlines make 182; the last cell's spare column is floor. (Raised cells each with a rim and a frame of `root.0` round a well read as nine separate buttons, and their empty wells as flat navy squares.) The selector is 24 by 24 at x -1 + 20i, y -1, over the chosen cell: a frame two deep, an outer ring of `root.0` with its four corner units left out and an inner ring of `salt`, open in the middle so the cell shows through; it overhangs the strip by one unit all round. The first three cells, the first chosen (the diagram's column `.` is x -1):

```
      0         1         2         3         4         5         6     
     .012345678901234567890123456789012345678901234567890123456789012345
 -1  .KKKKKKKKKKKKKKKKKKKKKK...........................................
  0  KWWWWWWWWWWWWWWWWWWWWWWKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
  1  KWzzzzzzzzzzzzzzzzzzzKWKzzzzzzzzzzzzzzzzzKzzzzzzzzzzzzzzzzzzzKzzzz
  2  KWzMMMMMMMMMMMMMMMMMJKWKMMMMMMMMMMMMMMMMJKzMMMMMMMMMMMMMMMMMJKzMMM
  3  KWzMMMMMMMMMMMMMMMMMJKWKMMMMMMMMMMMMMMMMJKzMMMMMMMMMMMMMMMMMJKzMMM
  4  KWzMMMMMMMMMMMMMMMMMJKWKMMMMMMMMMMMMMMMMJKzMMMMMMMMMMMMMMMMMJKzMMM
  5  KWzMMMMMMMMMMMMMMMMMJKWKMMMMMMMMMMMMMMMMJKzMMMMMMMMMMMMMMMMMJKzMMM
  6  KWzMMMMMMMMMMMMMMMMMJKWKMMMMMMMMMMMMMMMMJKzMMMMMMMMMMMMMMMMMJKzMMM
  7  KWzMMMMMMMMMMMMMMMMMJKWKMMMMMMMMMMMMMMMMJKzMMMMMMMMMMMMMMMMMJKzMMM
  8  KWzMMMMMMMMMMMMMMMMMJKWKMMMMMMMMMMMMMMMMJKzMMMMMMMMMMMMMMMMMJKzMMM
  9  KWzMMMMMMMMMMMMMMMMMJKWKMMMMMMMMMMMMMMMMJKzMMMMMMMMMMMMMMMMMJKzMMM
 10  KWzMMMMMMMMMMMMMMMMMJKWKMMMMMMMMMMMMMMMMJKzMMMMMMMMMMMMMMMMMJKzMMM
 11  KWzMMMMMMMMMMMMMMMMMJKWKMMMMMMMMMMMMMMMMJKzMMMMMMMMMMMMMMMMMJKzMMM
 12  KWzMMMMMMMMMMMMMMMMMJKWKMMMMMMMMMMMMMMMMJKzMMMMMMMMMMMMMMMMMJKzMMM
 13  KWzMMMMMMMMMMMMMMMMMJKWKMMMMMMMMMMMMMMMMJKzMMMMMMMMMMMMMMMMMJKzMMM
 14  KWzMMMMMMMMMMMMMMMMMJKWKMMMMMMMMMMMMMMMMJKzMMMMMMMMMMMMMMMMMJKzMMM
 15  KWzMMMMMMMMMMMMMMMMMJKWKMMMMMMMMMMMMMMMMJKzMMMMMMMMMMMMMMMMMJKzMMM
 16  KWzMMMMMMMMMMMMMMMMMJKWKMMMMMMMMMMMMMMMMJKzMMMMMMMMMMMMMMMMMJKzMMM
 17  KWzMMMMMMMMMMMMMMMMMJKWKMMMMMMMMMMMMMMMMJKzMMMMMMMMMMMMMMMMMJKzMMM
 18  KWzMMMMMMMMMMMMMMMMMJKWKMMMMMMMMMMMMMMMMJKzMMMMMMMMMMMMMMMMMJKzMMM
 19  KWzMMMMMMMMMMMMMMMMMJKWKMMMMMMMMMMMMMMMMJKzMMMMMMMMMMMMMMMMMJKzMMM
 20  KWzJJJJJJJJJJJJJJJJJJKWKJJJJJJJJJJJJJJJJJKzJJJJJJJJJJJJJJJJJJKzJJJ
 21  KWWWWWWWWWWWWWWWWWWWWWWKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
 22  .KKKKKKKKKKKKKKKKKKKKKK...........................................
```
`. nothing  J stone.sh  K root.0  M stone.dk  W salt  z stone.pit`

A thing that is cooling (a salve, the Recall Stone) has the cooling wash over its icon from the top down, a sixteenth of the time to the row.

### 5.17 Toast

A small clay slab 160 by 32, opaque, handed in from the right edge: the one light part of the HUD (rule 1). An outline of `root.0` with its corner units left out; a light edge one deep of `salt` along the top and left; a dark edge two deep along the bottom and right, `clay.sh` then `clay.pit`; the face `clay.face`. The 16 by 16 icon stands on the face at 8, 8, with no slot. The first line's cell at 30, 7 in the light-face tone of what the toast is: `growth.dk` for a step of the Guide, a grade's light-face tone for a thing found, `blood.dk` for a warning, `ink` otherwise. The second line's cell at 30, 18 in `ink`. Both have no shadow. The first line is cut with `…` at 124; the second wraps onto a third rather than being cut, and the slab grows to 42 to hold it. It slides in from the stage's right edge 16 units a frame, stays 5 s, and slides out the same way. One shows at a time; the rest wait their turn. It is docked in the top right corner: its right edge on the stage's right edge, its top at y 0 where its left edge stands 4 clear of the compass's column (`cx + 91 + 4`, a stage of 510 or more), else at y 26, one under the compass's line. While it shows, the status frames and the Guide's step come down under it, 4 below its foot, and go back up when it leaves, so that it is always the first thing in the corner and never a card floating under them. Where what stands under the compass reaches within 4 of its left edge (a boss bar and its event strip, a readout wider than the gap) it stands 4 under that instead, still on the right edge, and the status frames and the step keep their place at the top. (Hung 4 under the Guide's step and 4 in from the edge, it read as a modal card in the middle of the sky.) Its left 40 units (`i` the icon's cells, `t` and `n` the first and second lines' cells):

```
     0         1         2         3         
     0123456789012345678901234567890123456789
  0  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
  1  KWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
  2  KWFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
  3  KWFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
  4  KWFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
  5  KWFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
  6  KWFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
  7  KWFFFFFFFFFFFFFFFFFFFFFFFFFFFFtttttttttt
  8  KWFFFFFFiiiiiiiiiiiiiiiiFFFFFFtttttttttt
  9  KWFFFFFFiiiiiiiiiiiiiiiiFFFFFFtttttttttt
 10  KWFFFFFFiiiiiiiiiiiiiiiiFFFFFFtttttttttt
 11  KWFFFFFFiiiiiiiiiiiiiiiiFFFFFFtttttttttt
 12  KWFFFFFFiiiiiiiiiiiiiiiiFFFFFFtttttttttt
 13  KWFFFFFFiiiiiiiiiiiiiiiiFFFFFFtttttttttt
 14  KWFFFFFFiiiiiiiiiiiiiiiiFFFFFFtttttttttt
 15  KWFFFFFFiiiiiiiiiiiiiiiiFFFFFFtttttttttt
 16  KWFFFFFFiiiiiiiiiiiiiiiiFFFFFFtttttttttt
 17  KWFFFFFFiiiiiiiiiiiiiiiiFFFFFFFFFFFFFFFF
 18  KWFFFFFFiiiiiiiiiiiiiiiiFFFFFFnnnnnnnnnn
 19  KWFFFFFFiiiiiiiiiiiiiiiiFFFFFFnnnnnnnnnn
 20  KWFFFFFFiiiiiiiiiiiiiiiiFFFFFFnnnnnnnnnn
 21  KWFFFFFFiiiiiiiiiiiiiiiiFFFFFFnnnnnnnnnn
 22  KWFFFFFFiiiiiiiiiiiiiiiiFFFFFFnnnnnnnnnn
 23  KWFFFFFFiiiiiiiiiiiiiiiiFFFFFFnnnnnnnnnn
 24  KWFFFFFFFFFFFFFFFFFFFFFFFFFFFFnnnnnnnnnn
 25  KWFFFFFFFFFFFFFFFFFFFFFFFFFFFFnnnnnnnnnn
 26  KWFFFFFFFFFFFFFFFFFFFFFFFFFFFFnnnnnnnnnn
 27  KWFFFFFFFFFFFFFFFFFFFFFFFFFFFFnnnnnnnnnn
 28  KWFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF
 29  KWSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS
 30  KZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ
 31  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
```
`. nothing  F clay.face  K root.0  S clay.sh  W salt  Z clay.pit`

### 5.18 Boss bar and status frame

**Boss bar.** 182 wide. The name's cell at y 0, centred, `salt` with shadow. The strip at y 13, 7 tall, ten segments, in blood. Each point at which the animal changes is marked by two ticks of `salt`, 1 by 2, above and below the strip. Nothing else stands on its lines: no title, no number. The middle of one:

```
     0         1         2         3         4         5         6     
     012345678901234567890123456789012345678901234567890123456789012345
  0  ..................................................................
  1  ..............W...W...................W...........................
  2  ..............WK..WK..................WK..........................
  3  ..............WK..WKWWWW..WWWW..WWWW..WWWW..WWWW..WWW.............
  4  ..............WK..WK.KKKW.WKKKW..KKKW.WKKKW..KKKW.WKKK............
  5  ...............W.W.K.WWWWKWK..WK.WWWWKWK..WK.WWWWKWK..............
  6  ...............WKWK.W.KKWKWK..WKW.KKWKWK..WKW.KKWKWK..............
  7  ................W.K..WWWWKWK..WK.WWWWKWK..WK.WWWWKWK..............
  8  .................K....KKKK.K...K..KKKK.K...K..KKKK.K..............
  9  ..................................................................
 10  ..................................................................
 11  .................................W................................
 12  .................................W................................
 13  KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
 14  rrrrrrrrrrrrrrKrrrrrrrrrrrrrrrrrKrrrrrrrrrooooooooKooookkkkkkkkkkk
 15  RRRRRRRRRRRRRRKRRRRRRRRRRRRRRRRRKRRRRRRRRRooooooooKoooojjjjjjjjjjj
 16  RRRRRRRRRRRRRRKRRRRRRRRRRRRRRRRRKRRRRRRRRRooooooooKoooojjjjjjjjjjj
 17  RRRRRRRRRRRRRRKRRRRRRRRRRRRRRRRRKRRRRRRRRRooooooooKoooojjjjjjjjjjj
 18  qqqqqqqqqqqqqqKqqqqqqqqqqqqqqqqqKqqqqqqqqqooooooooKoooojjjjjjjjjjj
 19  KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
 20  .................................W................................
 21  .................................W................................
```
`. nothing  j root.2  k root.1  K root.0  o ember.lt  q blood.dk  r blood.lt  R blood  W salt`

A world event (Night raid, Sand March, Amāvassa) is the same with a thin strip that shows the time left, in `blood` for the first two and `violet.lt` for the third.

**Status frame.** Frames stand at a pitch of 22, 4 clear of each other, so that the times under them never run together into one string of figures. A dark plate 18 by 18 with a frame of `growth` for a good state and `blood` for a bad one, the icon at 1, 1. A bad state's frame also has a unit cut from each of its corners, the outline stepping in to meet it, so that harm and help differ in outline and not in colour alone. Under it the time left in the small face, centred on the plate, its cell at y 21, with no shadow, on a plate of `root.1` 16 by 7 at 1, 20 with its four corner units left out, so that the plate hangs centred under the frame, a unit of plate stands round the figures and two units of world stand between plate and frame (at one, plate and frame read as one block); in the last ten seconds it is `blood.lt` and blinks, lit for 0.5 s and out for 0.5 s, the plate staying. A good frame, and the top left corner of a bad one:

```
     0         1       
     012345678901234567
  0  .KKKKKKKKKKKKKKKK.
  1  KNNNNNNNNNNNNNNNNK
  2  KNkkkkkkkkkkkkkkNK
  3  KNkkkkkkkkkkkkkkNK
  4  KNkkkkkkkkkkkkkkNK
  5  KNkkkkkkkkkkkkkkNK
  6  KNkkkkkkkkkkkkkkNK
  7  KNkkkkkkkkkkkkkkNK
  8  KNkkkkkkkkkkkkkkNK
  9  KNkkkkkkkkkkkkkkNK
 10  KNkkkkkkkkkkkkkkNK
 11  KNkkkkkkkkkkkkkkNK
 12  KNkkkkkkkkkkkkkkNK
 13  KNkkkkkkkkkkkkkkNK
 14  KNkkkkkkkkkkkkkkNK
 15  KNkkkkkkkkkkkkkkNK
 16  KNNNNNNNNNNNNNNNNK
 17  .KKKKKKKKKKKKKKKK.
 18  ..................
 19  ..................
 20  ..kkkkkkkkkkkkkk..
 21  .kkWWkkkkWWWkWWkk.
 22  .kkkkWkWkWkkkWkWk.
 23  .kkkWkkkkWWkkWWWk.
 24  .kkWkkkWkkkWkkkWk.
 25  .kkWWWkkkWWkkkWWk.
 26  ..kkkkkkkkkkkkkk..
```
`. nothing  k root.1  K root.0  N growth  W salt`

```
     0    
     01234
  0  ..KKK
  1  .KRRR
  2  KRkkk
  3  KRkkk
```
`. nothing  k root.1  K root.0  R blood`

### 5.19 Book

For the journal and the codex. 298 by 186. The cover is a board of leather 6 deep inside its outline, built as a slab is (5.1) one step darker than timber, and with nothing more: the outline with its corners left out; a light edge two deep on the top and left, `timber.lt` then `timber.face`; a face of `timber.sh`; a dark edge two deep on the bottom and right, `timber.pit` then `timber.dk`; the face on the two diagonal units where light meets dark; at each of its four corners the board steps in by two, its outline running diagonally through the corner unit, so that it is the worn corner of a bound board and not the cut corner of a slab. The block of pages starts 7 in with a line of `root.0` round it; a page is `clay.lt`. Under each page the stack of leaves shows two deep along its outer side and along the foot of both, `clay.face` and then `clay.sh` outward, darkening into the outline. The gutter is three columns at the middle: the left page's last column `clay.sh`, a crease of `root.0`, and the right page's first column, which is the page's own `clay.lt`; the two page columns stop at the leaves and the crease runs on through them to the outline. Beside the gutter each page dips into the binding: a band 3 wide of `clay.face`, one tone, from the left page's columns 145 to 147 and the right page's 151 to 153, inside the text's margins. Without it the two pages were two flat panels split by a line, a split view and not an opened book. **The ribbon** keeps the place: 4 wide, from the top edge of the board down the gutter to 14 under the top of the block (y 21), `blood.lt`, `blood`, `blood`, `blood.dk` from left to right inside a `root.0` outline, its tail cut in a notch two deep; it lies in the fold, where no line of a page reaches. Over the head of the right page it touched the first word. It is one ribbon and always blood: it says the book lies open, the tabs say where. The leaves are not doubled into two lines a unit apart: that is the inset rule found above. A board 3 deep read as a frame round two panels and not as the boards of a bound book; leaves three deep with a light leaf inside a dark one left that dark line standing 2 in from every page edge, an inset rule. An earlier gutter of 16 columns stepping down to the fold and back, and a board edge of five rows each a step darker, were bands of equal stripes: pillow shading, which this interface refuses.

**Tabs** mark the sections, as on a slab (5.7), cut from the cover's leather: 24 wide at a pitch of 23 along the cover's top edge from its left corner, each carrying the 16 by 16 mark of its section, its name as its tooltip. The tabs are the book's bookmarks, and the one ribbon in the fold only keeps the place: five ribbons of five colours hanging from the foot were a second way to the same pages, matched to their tabs by colour alone. The open tab rises 21 and is joined to the cover as a tab joins a slab, in the cover's tones (its light edge `timber.lt` and `timber.face`, its face `timber.sh`, its dark edge `timber.dk` and `timber.pit`); the others rise 18, flat `timber.pit` with a light row and column of `timber.sh`, and lighten to `timber.dk` under the pointer. A colour alone never tells the sections apart. The top left corner of the book, its first tab open and its second not, the marks left out:

```
     0         1         2         3         4         5
     0123456789012345678901234567890123456789012345678901
  0  .KKKKKKKKKKKKKKKKKKKKKK.............................
  1  KffffffffffffffffffffftK............................
  2  KfTTTTTTTTTTTTTTTTTTTtXK............................
  3  KfTttttttttttttttttttUXKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
  4  KfTttttttttttttttttttUXKtttttttttttttttttttttXKttttt
  5  KfTttttttttttttttttttUXKtXXXXXXXXXXXXXXXXXXXXXKtXXXX
  6  KfTttttttttttttttttttUXKtXXXXXXXXXXXXXXXXXXXXXKtXXXX
  7  KfTttttttttttttttttttUXKtXXXXXXXXXXXXXXXXXXXXXKtXXXX
  8  KfTttttttttttttttttttUXKtXXXXXXXXXXXXXXXXXXXXXKtXXXX
  9  KfTttttttttttttttttttUXKtXXXXXXXXXXXXXXXXXXXXXKtXXXX
 10  KfTttttttttttttttttttUXKtXXXXXXXXXXXXXXXXXXXXXKtXXXX
 11  KfTttttttttttttttttttUXKtXXXXXXXXXXXXXXXXXXXXXKtXXXX
 12  KfTttttttttttttttttttUXKtXXXXXXXXXXXXXXXXXXXXXKtXXXX
 13  KfTttttttttttttttttttUXKtXXXXXXXXXXXXXXXXXXXXXKtXXXX
 14  KfTttttttttttttttttttUXKtXXXXXXXXXXXXXXXXXXXXXKtXXXX
 15  KfTttttttttttttttttttUXKtXXXXXXXXXXXXXXXXXXXXXKtXXXX
 16  KfTttttttttttttttttttUXKtXXXXXXXXXXXXXXXXXXXXXKtXXXX
 17  KfTttttttttttttttttttUXKtXXXXXXXXXXXXXXXXXXXXXKtXXXX
 18  KfTttttttttttttttttttUXKtXXXXXXXXXXXXXXXXXXXXXKtXXXX
 19  KfTttttttttttttttttttUXKtXXXXXXXXXXXXXXXXXXXXXKtXXXX
 20  KfTttttttttttttttttttUXKtXXXXXXXXXXXXXXXXXXXXXKtXXXX
 21  KfTttttttttttttttttttUXKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
 22  KfTtttttttttttttttttttffffffffffffffffffffffffffffff
 23  KfTttttttttttttttttttTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
 24  KfTttttttttttttttttttttttttttttttttttttttttttttttttt
 25  KfTttttttttttttttttttttttttttttttttttttttttttttttttt
 26  KfTttttttttttttttttttttttttttttttttttttttttttttttttt
 27  KfTttttttttttttttttttttttttttttttttttttttttttttttttt
 28  KfTttttKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
 29  KfTttttKSFLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
 30  KfTttttKSFLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
 31  KfTttttKSFLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
 32  KfTttttKSFLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
 33  KfTttttKSFLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
```
`. nothing  F clay.face  f timber.lt  K root.0  L clay.lt  S clay.sh  T timber.face  t timber.sh  U timber.dk  X timber.pit`

**Text on a page** is ink. A line that says where to go starts with the compass mark, 9 by 9 in the line's ink, and the words 12 to its right:

```
     0       
     012345678
  0  ..IIIII..
  1  .I.....I.
  2  I...I...I
  3  I..III..I
  4  I..III..I
  5  I...I...I
  6  I...I...I
  7  .I.....I.
  8  ..IIIII..
```
`. nothing  I ink`

A page's text area is 126 wide and starts 15 from the book's outer edge and 13 from its top; the right page's starts at x 157. Headings are plain ink in the text face with a rule of `clay.sh` one unit thick 1 unit under their cell.

**Page arrows**, 16 by 7, in ink at the bottom outer corners of the pages (15 from the outer edge, 164 down from the book's top); `blood.dk` when hovered; not drawn when there is no page that way. Page numbers are in the text face, `ink.faded`, centred under each page, the cell at y 163 so that their figures stand level with the arrows; in the small face they were lost between the arrows. The arrows lead on through the sections as the page numbers run on: on the first spread of a section the back arrow turns to the last spread of the section before, and on its last spread the forward arrow to the first spread of the next, so that only the book's first spread has no back arrow and only its last has no forward one. A page's text stops at y 161. The bottom right corner with its arrow, from x 266 and y 164:

```
     0         1         2         3 
     01234567890123456789012345678901
  0  LLLLLLLLLLLLILLLLLLLLLFSKttttUXK
  1  LLLLLLLLLLLLIILLLLLLLLFSKttttUXK
  2  LLLIIIIIIIIIIIILLLLLLLFSKttttUXK
  3  LLLIIIIIIIIIIIIILLLLLLFSKttttUXK
  4  LLLIIIIIIIIIIIILLLLLLLFSKttttUXK
  5  LLLLLLLLLLLLIILLLLLLLLFSKttttUXK
  6  LLLLLLLLLLLLILLLLLLLLLFSKttttUXK
  7  LLLLLLLLLLLLLLLLLLLLLLFSKttttUXK
  8  LLLLLLLLLLLLLLLLLLLLLLFSKttttUXK
  9  LLLLLLLLLLLLLLLLLLLLLLFSKttttUXK
 10  LLLLLLLLLLLLLLLLLLLLLLFSKttttUXK
 11  LLLLLLLLLLLLLLLLLLLLLLFSKttttUXK
 12  FFFFFFFFFFFFFFFFFFFFFFFSKttttUXK
 13  SSSSSSSSSSSSSSSSSSSSSSSSKttttUXK
 14  KKKKKKKKKKKKKKKKKKKKKKKKKttttUXK
 15  tttttttttttttttttttttttttttttUXK
 16  tttttttttttttttttttttttttttttUXK
 17  tttttttttttttttttttttttttttttUXK
 18  tttttttttttttttttttttttttttttUXK
 19  UUUUUUUUUUUUUUUUUUUUUUUUUUUUUUXK
 20  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXK
 21  KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
```
`. nothing  F clay.face  I ink  K root.0  L clay.lt  S clay.sh  t timber.sh  U timber.dk  X timber.pit`

### 5.20 Tree field, nodes and links

The field is a well whose floor is laid with boards and pans under its frame: a tile 96 by 42 of boards 6 tall with a joint of one unit, each a flat face of `timber.pit` with two grain lines of `root.1` 4 to 9 long, the joint and two butt joints a board, placed by a fixed hash, in `root.0`. No board is lit: a `timber.dk` top row on every board made the floor as loud as the nodes, and a locked node's dark was lost in it. It is timber and not the ground tile so that the tree does not read as one more menu.

The field lays its nodes out from a margin of 4 inside its frame; along an axis where all of them fit with that margin they stand centred and the field does not pan that way. Dragging pans by whole units, and on release the pan comes to rest on a whole step of the lattice (or the far end), so that the edge falls 4 before a node and a node at rest is never cut through. Where nodes lie past an edge a small stone button 12 by 12 says so and steps the pan one lattice step that way when pressed: an arrow head 5 wide and 3 deep in `salt` with its `root.0` shadow on the small button's stone, up and down in the right-hand corners, left and right low on the side edges, where a field laid out from the top left leaves room; its tooltip is "More to the right" over "Press, or drag the field". A bare head of salt in a corner, which did nothing when pressed, read as a stray mark. Nodes are 26 by 26 on a lattice of 40 across and 30 down, each holding a 16 by 16 icon at 5, 5. Rows 30 apart let a job's five rows stand whole in a field 154 tall, so that on a wide screen the tree never pans up and down: rows of 40 hid the first row and left a link running off the field's top edge to nothing that could be seen. Three frames, and the shape says the kind: square (a step anyone may take), cut (the job's own skill; its corners cut by 5), spiked (a mark the job ends in: a body 20 by 20 at 3, 3 with eight spikes 3 long, one at the middle of each side, 6 wide at its foot, 4 in the middle and 2 at its tip, and a wedge out of each corner on the diagonal, lit on the top left one and shaded on the bottom right one). A body with one-unit nubs at the middle of each side read as a rounded blob. Each is built by the rule for raised shapes: the shape's outer units are outline; the next units in are `hi` where they face up or left and `pit` where they face down or right; the rest is face. The tone says the state, the shape never does.

```
     0         1         2         3         4         5         6         7         8 
     0123456789012345678901234567890123456789012345678901234567890123456789012345678901
  0  .KKKKKKKKKKKKKKKKKKKKKKKK........KKKKKKKKKKKKKKKK.......KK..........KK..........KK
  1  KWWWWWWWWWWWWWWWWWWWWWWWFK......KWWWWWWWWWWWWWWWFK......KWKK.......KWFK.......KKFK
  2  KWFFFFFFFFFFFFFFFFFFFFFFZK.....KWFFFFFFFFFFFFFFFFFK......KWWK.....KWFFFK.....KFFK.
  3  KWFFFFFFFFFFFFFFFFFFFFFFZK....KWFFFFFFFFFFFFFFFFFFFK.....KWWWKKKKKWFFFFFKKKKKWFZK.
  4  KWFFFFFFFFFFFFFFFFFFFFFFZK...KWFFFFFFFFFFFFFFFFFFFFFK.....KFFWWWWWFFFFFFWWWWWFZK..
  5  KWFFFFFFFFFFFFFFFFFFFFFFZK..KWFFFFFFFFFFFFFFFFFFFFFFFK.....KWFFFFFFFFFFFFFFFFZK...
  6  KWFFFFFFFFFFFFFFFFFFFFFFZK..KWFFFFFFFFFFFFFFFFFFFFFFZK.....KWFFFFFFFFFFFFFFFFZK...
  7  KWFFFFFFFFFFFFFFFFFFFFFFZK..KWFFFFFFFFFFFFFFFFFFFFFFZK.....KWFFFFFFFFFFFFFFFFZK...
  8  KWFFFFFFFFFFFFFFFFFFFFFFZK..KWFFFFFFFFFFFFFFFFFFFFFFZK.....KWFFFFFFFFFFFFFFFFZK...
  9  KWFFFFFFFFFFFFFFFFFFFFFFZK..KWFFFFFFFFFFFFFFFFFFFFFFZK.....KWFFFFFFFFFFFFFFFFZK...
 10  KWFFFFFFFFFFFFFFFFFFFFFFZK..KWFFFFFFFFFFFFFFFFFFFFFFZK....KWFFFFFFFFFFFFFFFFFFFK..
 11  KWFFFFFFFFFFFFFFFFFFFFFFZK..KWFFFFFFFFFFFFFFFFFFFFFFZK...KWFFFFFFFFFFFFFFFFFFFFFK.
 12  KWFFFFFFFFFFFFFFFFFFFFFFZK..KWFFFFFFFFFFFFFFFFFFFFFFZK..KWFFFFFFFFFFFFFFFFFFFFFFFK
 13  KWFFFFFFFFFFFFFFFFFFFFFFZK..KWFFFFFFFFFFFFFFFFFFFFFFZK..KFFFFFFFFFFFFFFFFFFFFFFFZK
 14  KWFFFFFFFFFFFFFFFFFFFFFFZK..KWFFFFFFFFFFFFFFFFFFFFFFZK...KFFFFFFFFFFFFFFFFFFFFFZK.
 15  KWFFFFFFFFFFFFFFFFFFFFFFZK..KWFFFFFFFFFFFFFFFFFFFFFFZK....KFFFFFFFFFFFFFFFFFFFZK..
 16  KWFFFFFFFFFFFFFFFFFFFFFFZK..KWFFFFFFFFFFFFFFFFFFFFFFZK.....KWFFFFFFFFFFFFFFFFZK...
 17  KWFFFFFFFFFFFFFFFFFFFFFFZK..KWFFFFFFFFFFFFFFFFFFFFFFZK.....KWFFFFFFFFFFFFFFFFZK...
 18  KWFFFFFFFFFFFFFFFFFFFFFFZK..KWFFFFFFFFFFFFFFFFFFFFFFZK.....KWFFFFFFFFFFFFFFFFZK...
 19  KWFFFFFFFFFFFFFFFFFFFFFFZK..KWFFFFFFFFFFFFFFFFFFFFFFZK.....KWFFFFFFFFFFFFFFFFZK...
 20  KWFFFFFFFFFFFFFFFFFFFFFFZK..KFFFFFFFFFFFFFFFFFFFFFFFZK.....KWFFFFFFFFFFFFFFFFZK...
 21  KWFFFFFFFFFFFFFFFFFFFFFFZK...KFFFFFFFFFFFFFFFFFFFFFZK.....KWFZZZZZFFFFFFZZZZZZZK..
 22  KWFFFFFFFFFFFFFFFFFFFFFFZK....KFFFFFFFFFFFFFFFFFFFZK.....KWFZKKKKKFFFFFZKKKKKZZZK.
 23  KWFFFFFFFFFFFFFFFFFFFFFFZK.....KFFFFFFFFFFFFFFFFFZK......KWFK.....KFFFZK.....KZZK.
 24  KFZZZZZZZZZZZZZZZZZZZZZZZK......KFZZZZZZZZZZZZZZZK......KFKK.......KFZK.......KKZK
 25  .KKKKKKKKKKKKKKKKKKKKKKKK........KKKKKKKKKKKKKKKK.......KK..........KK..........KK
```
`. nothing  F clay.face  K root.0  W salt  Z clay.pit`

| State | hi | face | pit | Icon |
| --- | --- | --- | --- | --- |
| Locked | `root.3` | `root.2` | `root.1` | silhouette in `root.3`, and the slot's lock (5.4), 7 by 7, at 18, 17 (15, 14 on the spiked frame, inside its body) |
| Open (can be taken now) | `stone.lt` | `stone.sh` | `stone.pit` | full |
| Earned | `salt` | `clay.face` | `clay.pit` | full |

A node with more than one rank shows them as cells 3 by 3, one unit apart, in a strip of `root.0` one unit round them, set into the frame's foot so that the strip's last row is the frame's bottom outline (rows 21 to 25 of square and cut, 18 to 22 of the spiked body), centred; on a locked node it stands at x 4, clear of the lock. A rank taken is `ember`, one to take is `root.2`. The tooltip says "Rank 2 of 3". Lit squares in salt on the outline were tried and read as a row of teeth, and figures needed the second face; ember cells sunk in a dark strip read as a count. The chosen node has the hotbar's selector round it (5.16), 30 by 30. The node under the pointer, which the readout under the field then describes, has a ring of `salt` one unit deep round its outline, 28 by 28, so that the name written under the field is always seen against the node it names.

**Links** run only along rows and columns, with square elbows at the midpoint on a whole unit. A link is 2 units wide and two-toned like a cord of the stuff of the nodes it joins: a lit line one unit wide with a shaded line one unit under it, or to its right where it runs down. It takes the tones of the duller of its two ends: `root.3` over `root.1` to a locked node, `stone.lt` over `stone.dk` to an open one, `salt` over `clay.sh` between two earned ones. A light line over `root.0` vanished into the dark boards and read as a one-tone hairline. The light line runs through the node's centre at 12, 12, so that each segment shows from one node's edge to the next and none runs past its last node. Links are drawn under nodes.

```
     0         1         2         
     012345678901234567890123456789
  0  ..............................
  1  WWWWWWWWWWWWWW................
  2  KKKKKKKKKKKKKWK...............
  3  .............WK...............
  4  .............WK...............
  5  .............WK...............
  6  .............WK...............
  7  .............WK...............
  8  .............WK...............
  9  .............WK...............
 10  .............WWWWWWWWWWWWWWWWW
 11  .............KKKKKKKKKKKKKKKKK
 12  ..............................
 13  ..............................
```
`. nothing  K root.0  W salt` (between two earned nodes the `K` here is `clay.sh`)

### 5.21 Ground tile

32 by 32: a wall of dressed stone sunk to about a quarter of its light, as the tradition darkens the block behind a menu, so that it recedes behind the buttons and the words on it. Blocks are 8 tall in four courses of two, their faces 13, 15 and 17 long (14, 16 and 18 with the joint) and each course set along from the last so that no joint stands over the joint below it. A block's face is `root.2` with a lip of `stone.pit` along its top row and left column; the joint is `root.0`, one unit, along its bottom row and right column. Two blocks of the eight have faces a tone darker, `root.1`; one has a chip 2 by 2 of `root.1` knocked off the bottom right corner of its face; one has a crack of three units of `root.0` running down from its lip. Nothing else marks a block: no single specks, which at this size read as noise. Every block alike, repeated every 16, read as a printed wallpaper and not as a wall that was laid. The brightest unit of the wall is darker than any button's face. It fills the screen behind the title, the world list, new world, join and loading, and it is the floor of a store's map. The tree has a floor of its own (5.20). Under a list on a full-screen menu it shows above and below the well. Text on it is text on dark: `salt` with its shadow, and no strip under it. The whole tile:

```
     0         1         2         3 
     01234567890123456789012345678901
  0  zzzzzzzzzzzzzKzzzzzzzzzzzzzzzzzK
  1  zkkkkkkkkkkkkKzjjjjjjjjjjjjjjjjK
  2  zkkkkkkkkkkkkKzjjjjjjjjjjjjjjjjK
  3  zkkkkkkkkkkkkKzjjjjjjjjjjjjjjjjK
  4  zkkkkkkkkkkkkKzjjjjjjjjjjjjjjjjK
  5  zkkkkkkkkkkkkKzjjjjjjjjjjjjjjjjK
  6  zkkkkkkkkkkkkKzjjjjjjjjjjjjjjjjK
  7  KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
  8  zzzzzzKzzzzzzzzzzzzzzzKzzzzzzzzz
  9  jjjjjjKzjjjjjjjjjjjjjjKzjjjjjjjj
 10  jjjjjjKzjjjjjjjjjjjjjjKzjjjjjjjj
 11  jjjjjjKzjjjjjjjjjjjjjjKzjjjjjjjj
 12  jjjjjjKzjjjjjjjjjjjjjjKzjjjjjjjj
 13  jjjjkkKzjjjjjjjjjjjjjjKzjjjjjjjj
 14  jjjjkkKzjjjjjjjjjjjjjjKzjjjjjjjj
 15  KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
 16  KzzzzzzzzzzzzzzzzzKzzzzzzzzzzzzz
 17  KzjjjjjjjjjjjjjjjjKzkkkkkkkkkkkk
 18  KzjjjjjjjjjjjjjjjjKzkkkkkkkkkkkk
 19  KzjjjjjjjjjjjjjjjjKzkkkkkkkkkkkk
 20  KzjjjjjjjjjjjjjjjjKzkkkkkkkkkkkk
 21  KzjjjjjjjjjjjjjjjjKzkkkkkkkkkkkk
 22  KzjjjjjjjjjjjjjjjjKzkkkkkkkkkkkk
 23  KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
 24  zzzzzzzzzzKzzzzzzzzzzzzzzzKzzzzz
 25  KjjjjjjjjjKzjjjjjjjjjjjjjjKzjjjj
 26  KjjjjjjjjjKzjjjjjjjjjjjjjjKzjjjj
 27  jKjjjjjjjjKzjjjjjjjjjjjjjjKzjjjj
 28  jjjjjjjjjjKzjjjjjjjjjjjjjjKzjjjj
 29  jjjjjjjjjjKzjjjjjjjjjjjjjjKzjjjj
 30  jjjjjjjjjjKzjjjjjjjjjjjjjjKzjjjj
 31  KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
```
`j root.2  k root.1  K root.0  z stone.pit`

### 5.22 Pointer and held stack

The system cursor is hidden over the game. The pointer is drawn, 10 by 14, its hot spot at 0, 0:

```
     0         
     0123456789
  0  K.........
  1  KK........
  2  KWK.......
  3  KWWK......
  4  KWWWK.....
  5  KWWWWK....
  6  KWWWWWK...
  7  KWWWWWSK..
  8  KWWWWSSSK.
  9  KWWSWSKKKK
 10  KWSKWSK...
 11  KSK.KWSK..
 12  KK..KWSK..
 13  K....KK...
```
`. nothing  K root.0  S clay.sh  W salt`

A held stack is its icon centred on the pointer's place (at -8, -8) with its count as in a slot. While a stack is held the pointer itself is not drawn and no tooltip shows. The pointer and the held stack move by whole units.

### 5.23 Chat

Lines are 10 tall, newest lowest, at the left of the stage. Where chat with its wash ends 4 units left of the hotbar's column (x `cx - 91`), the newest line's bottom is 48 above the stage's bottom, level with the top of the hotbar's measures; where it would come closer or reach over that column it is 68 above (at 1 unit clear the chat's wash seemed to run into the pips and the hotbar), clear of the name of the thing in hand and the row of defence and lees. Under the lines lies one strip of the chat wash as wide as the column (the wrap plus 3), the same for every line whatever its length, so that chat reads as one plate and not as highlighted text (drawn opaque here); the text starts 1 in. A line from a player: their name in their colour, a colon in `root.4`, one space, the text in `salt`: the text starts 5 units after the colon's right edge (the face's gap and a space of 4). At 3 units the name, the colon and the first word ran together. A line from the server or the world (a bell rung, a thing that comes up, the answer to a command) has no name and no colon: the `{cairn}` mark, 2 units, then the text, all in `root.4`, so that it is never read as a player's line gone wrong. A line of the world about a great feeder ("Kankāl turns, throwing pale matter in spirals.") keeps the `{cairn}` and 2 units, then leads with the feeder's name in `blood.lt`, the boss strip's colour, a space, and the rest in `violet.lt`: in grey with only the cairn it read as a crew line with no name. The setting Chat width gives the column: Narrow 160, Middle 240, Wide 320, and text wraps at that less 3, or at half the stage less 64 when that is less, so that chat never reaches the prompt under the crosshair (Middle is therefore 179 wide on a stage 480 wide, x 4 to 183). At 144 a crew line wrapped into five rows and six lines filled half the screen's height while two thirds of its width stood empty; the tradition's own default is 320. A line that wraps continues 8 units in, two spaces' width, so that a wrapped row is not read as a new speaker (at 4, one space, it read as a stray space and not as a continuation). Only whole lines show: when the oldest line will not fit, all of it is left out. Closed, the last 8 lines show, fewer when the crew list stands above, and each leaves 8 s after it came. Open, the entry stands in chat's own column, 4 in and as wide as the column (the wrap plus 3), its bottom where the newest closed line's bottom is, and 12 lines show 2 above it, so that the lines move up 16 as chat opens and the wheel scrolls back. Along the bottom of the stage, as the tradition puts it, the entry covered the hotbar, and nobody could see what was in hand while typing in a fight; 240 wide just over the hotbar it would cover the life pips instead. In the column it covers neither, and what is typed past its width scrolls: 14 tall, floor `root.0`, a frame of `root.3`, the text's cell at 4, 2, the caret as in a field. The diagram shows two lines and, under them, the entry's left end.

```
     0         1         2         3         4         5         6         7         8         9         0
     01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
  0  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.............................
  1  knkkkkknkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.............................
  2  knnkkknnKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.............................
  3  knKnknknKnnnnkknnnnnkkkkkkWWWWkkWWWWkkkkkkWWWWWWkkWkkkWkkkkkWkkWkkWkWWWWkkWkkkWkk.............................
  4  knKknkKnKnKKKnknKKKnKgkkkkWKKKWkWKKKWkkkkkWKKWKKWkWKkkWKkkkkWKkWKkWKkKKKWkWKkkWKk.............................
  5  knKkkKknKnnnnnKnKkknKkKkkkWKkkWKWKkkWKkkkkWKkWKkWKWKkkWKkkkkWKkWKkWKkWWWWKWKkkWKk.............................
  6  knKkkkknKnKKKKKnKkknKkkkkkWKkkWKWKkkWKkkkkWKkWKkWKWKkkWKkkkkWKkWKkWKWkKKWKWKkkWKk.............................
  7  knKkkkknKknnnnkknnnnKgkkkkkWWWWKWKkkWKkkkkWKkWKkWKkWWWWKkkkkkWWWWWWKkWWWWKkWWWWKk.............................
  8  kkKkkkkkKkkKKKKkkKKnKkKkkkkkKKKKkKkkkKkkkkkKkkKkkKkkKKWKkkkkkkKKKKKKkkKKKKkkKKWKk.............................
  9  kkkkkkkkkkkkkkknnnnkKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkWWWWkKkkkkkkkkkkkkkkkkkkWWWWkKk.............................
 10  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.............................
 11  kGGGGGkGkkkkkkkkkkkkkkkGkkkkkkkkkkkGkkGkkkkkkGkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.............................
 12  kkKGKKKGKkkkkkkkkkkkkkkGKkkkkkkkkkkGKkGKkkkkkkKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.............................
 13  kkkGKkkGGGGkkGGGGkkkkkkGGGGkkGGGGkkGKkGKkkkkkGkkGGGkkkkkGGGkGkkkGkGGGGkkGGGGGkkkk.............................
 14  kkkGKkkGKKKGkGKKKGkkkkkGKKKGkGKKKGkGKkGKkkkkkGKGkKKKkkkkGKKKGKkkGKGKKKGkGKKKGKkkk.............................
 15  kkkGKkkGKkkGKGGGGGKkkkkGKkkGKGGGGGKGKkGKkkkkkGKkGGkkkkkkGKkkGKkkGKGKkkGKGKkkGKkkk.............................
 16  kkkGKkkGKkkGKGKKKKKkkkkGKkkGKGKKKKKGKkGKkkkkkGKkkKGkkkkkGKkkGKkkGKGKkkGKGKkkGKkkk.............................
 17  kkkGKkkGKkkGKkGGGGkkkkkGGGGGKkGGGGkGGkGGkkkkkGKGGGkKkkkkGKkkkGGGGKGKkkGKkGGGGKGkk.............................
 18  kkkkKkkkKkkkKkkKKKKkkkkkKKKKKkkKKKKkKKkKKkkkkkKkKKKkkkkkkKkkkkKKKKkKkkkKkkKKGKkKk.............................
 19  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkGGGGkKkkk.............................
 20  .........................................................................KKKK.................................
 21  ..............................................................................................................
 22  hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh
 23  hKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKh
 24  hKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKWKKKKKKKKKKKKKKKKKKKKh
 25  hKKKKKKKKWKKKKKKKKKKKKKKKWKKKKWKWKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKWKKKKKKKKKKWKKWKKKKKKWKKKKKKKKKKKKKKKKKKKKh
 26  hKKKKWKKKWKKKKKKKKKKKKKKKWKKKKKKWKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKWKKKKKWKKKWKKKKKKKKKKKKKKKKKKKKh
 27  hKKKWWWWKWWWWKKWWWWKKKKKKWKKWKWKWKKWWWWKKKKKKWWWKWWWWKKWKKWKKWKKKKKWKKWWWKKKKKWKKWKWWWWKWKKKKKKKKKKKKKKKKKKKKh
 28  hKKKKWKKKWKKKWKWKKKWKKKKKWKWKKWKWKKWKKKWKKKKKWKKKWKKKWKWKKWKKWKKKKKWKWKKKKKKKKWKKWKKWKKKWKKKKKKKKKKKKKKKKKKKKh
 29  hKKKKWKKKWKKKWKWWWWWKKKKKWWKKKWKWKKWKKKWKKKKKWKKKWKKKWKWKKWKKWKKKKKWKKWWKKKKKKWKKWKKWKKKWKKKKKKKKKKKKKKKKKKKKh
 30  hKKKKWKKKWKKKWKWKKKKKKKKKWKWKKWKWKKWKKKWKKKKKWKKKWKKKWKWKKWKKWKKKKKWKKKKWKKKKKWKKWKKWKKKWKKKKKKKKKKKKKKKKKKKKh
 31  hKKKKKWWKWKKKWKKWWWWKKKKKWKKWKWKWWKWKKKWKKKKKWKKKKWWWWKKWWWWWWKKKKKWKWWWKKKKKKWWKWKKKWWKWKKKKKKKKKKKKKKKKKKKKh
 32  hKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKWKKKKKKKKKKKKKKKKKKKKh
 33  hKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKWKKKKKKKKKKKKKKKKKKKKh
 34  hKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKh
 35  hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh
```
`. nothing  g root.4  G stone.lt  h root.3  k root.1  K root.0  n growth.lt  W salt`

### 5.24 Roster

Held open with Tab. A plain dark plate 304 wide, centred on the stage at y 30. It stays opaque: it is a readout held up against the world like the tooltip and the hotbar (rule 1), and the washes of section 2 are kept for strips under single lines. While it is held the crew list, the Guide's step and the toasts are not drawn: it covers the right column on a stage of 480, and words of a toast clipped at its edge read as a layering fault. Header: the server's name at 6, 3 and "7 of 8" (those on, of the seats) right-aligned in `root.4`; a rule of `root.3` at y 15. Under it the columns' names in the small face, `root.4` with its shadow, at y 18: "Where" at 134, "Lvl" right-aligned to 221, "Far" right-aligned to 283; a green 14 with no name over it did not say it was a level. Rows are 16 tall from y 27, one for every seat, those away last; their columns 6 apart: the head (5.25) at 5, +0; the name's cell at 18, cut at 110; the life strip at 18, +11, one clear unit under the name's descenders; the place's name at 134 in `root.4`, cut at 70, a bare name without an article ("Sealed Store", as "Yavas"); the level right-aligned to 221 in `growth.lt`; how far, right-aligned to 283, always in words: "42 m" in `salt`, and in `root.4` "here" for oneself, "other place" for a friend in another place, "lost" with the connection lost (a distance beside the cross contradicted it), "away" for a seat whose player is not on; a dash and a "?" stood there unexplained; the connection in a cell 9 by 7 at 289: three bars 2 wide and 1 apart, 3, 5 and 7 tall, lit in `salt`, in `blood.lt` when only one is lit, and with none the `{cross}` in `blood.lt` in place of the bars. A seat that is away has its name and level in `root.4`, no life strip and no connection's cell. A header of "7 of 8" over seven rows left the eighth seat unaccounted for. All of it but the columns' names is the text face.

**Life strip.** 41 by 4 beside a name: a frame of `root.0` round two rows, `blood.lt` over `blood` where it is lit and `root.2` where it is spent, a segment line of `root.0` every 8 units. It fills from the left by whole units. A name tag uses the same strip as wide as the tag. Left part and right part:

```
     0         1         2         3         4         5         6         7         8         9         0         1
     012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
  0  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
  1  Khhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh
  2  Khkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
  3  Khkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
  4  KhkkkkkWWWWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
  5  KhkkkkWkKKKKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
  6  KhkkkkWKkkkkWWWWkkWWWWWWkkWWWWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
  7  KhkkkkkWWWkkWKKKWkWKKWKKWkWKKKWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
  8  KhkkkkkkKKWkWKkkWKWKkWKkWKWWWWWKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
  9  KhkkkkkkkkWKWKkkWKWKkWKkWKWKKKKKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 10  KhkkkkWWWWkKkWWWWKWKkWKkWKkWWWWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 11  KhkkkkkKKKKkkkKKKKkKkkKkkKkkKKKKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 12  Khkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 13  Khkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 14  Khkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 15  Khhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh
 16  Khkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 17  Khkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 18  Khkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 19  KhkkkkkKKKKKKkkkWWWWWkkkkkkkWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 20  KhkkkkKWbbbbBKkkkKWKKKkkkkkkWKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 21  KhkkkkKbbbbbbKkkkkWKkkWWWWkkWKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 22  KhkkkkKLLFFFSKkkkkWKkkkKKKWkWKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 23  KhkkkkKLIFFISKkkkkWKkkkWWWWKWKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 24  KhkkkkKLFFFFSKkkkkWKkkWkKKWKWKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 25  KhkkkkKDDDDDDKkkkkWKkkkWWWWKWWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 26  KhkkkkkKKKKKKkkkkkkKkkkkKKKKkKKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 27  Khkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 28  Khkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 29  KhkkkkkkkkkkkkkkKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 30  KhkkkkkkkkkkkkkkKrrrrrrrKrrrrrrrKrrrrrrrKrrrrrrrKrrrrrrrKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 31  KhkkkkkkkkkkkkkkKRRRRRRRKRRRRRRRKRRRRRRRKRRRRRRRKRRRRRRRKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 32  KhkkkkkkkkkkkkkkKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 33  Khkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 34  Khkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 35  KhkkkkkKKKKKKkkkWWWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 36  KhkkkkKWnnnnNKkkkWKKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 37  KhkkkkKnnnnnnKkkkWKkWkkkWkWkkkWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 38  KhkkkkKLLFFFSKkkkWKkWKkkWKWKkkWKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 39  KhkkkkKLIFFISKkkkWKkWKkkWKWKkkWKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 40  KhkkkkKLFFFFSKkkkWKkkWkWkKWKkkWKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 41  KhkkkkKDDDDDDKkkWWWkkkWkKkkWWWWKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 42  KhkkkkkKKKKKKkkkkKKKkkkKkkkkKKWKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 43  KhkkkkkkkkkkkkkkkkkkkkkkkkWWWWkKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 44  KhkkkkkkkkkkkkkkkkkkkkkkkkkKKKKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 45  KhkkkkkkkkkkkkkkKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 46  KhkkkkkkkkkkkkkkKrrrrrrrKrrrrrrrKrrrrrjjKjjjjjjjKjjjjjjjKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 47  KhkkkkkkkkkkkkkkKRRRRRRRKRRRRRRRKRRRRRjjKjjjjjjjKjjjjjjjKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 48  KhkkkkkkkkkkkkkkKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 49  Khkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 50  Khkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 51  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
```
`. nothing  b arm.lt  B arm  D clay.dk  F clay.face  h root.3  I ink  j root.2  k root.1  K root.0  L clay.lt  n growth.lt  N growth  r blood.lt  R blood  S clay.sh  W salt`

```
     0         1         2         3         4         5         6         7         8         9         0
     0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345
  0  KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
  1  hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhK
  2  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
  3  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
  4  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkggggkkkkkkkkkkkkkgggkkkkkggggkkkkkkK
  5  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkKKKgkkkkkkkkkkkkgKKKkkkkgKKKgkkkkkK
  6  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkgKkkkkggggkkggggkkkkkgKkkgKkkkkK
  7  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkgkKkkkkgKKKgkkgKKKkkkkkgggkKkkkkK
  8  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkgkKkkkkkgKkkgKkgKkkkkkkgkKKgkkkkkK
  9  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkgkKkkkkkkgKkkgKkgKkkkkkkgKkkgKkkkkK
 10  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkgggggkkkkkkggggKkgKkkkkkkkggggKkkkkK
 11  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkKKKKKkkkkkkKKKKkkKkkkkkkkkKKKKkkkkK
 12  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 13  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 14  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 15  hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhkK
 16  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 17  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 18  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 19  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkknkkkkkknkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 20  kkkkkkkkkkkkkkkkkkkkkkkkkkkkknnKkkkknnKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 21  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkknKkkknknKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkWWkkkkkK
 22  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkknKkknkKnKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkWWkkkkkK
 23  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkknKkknnnnnkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkWWkWWkkkkkK
 24  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkknKkkkKKnKKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkWWkWWkkkkkK
 25  kkkkkkkkkkkkkkkkkkkkkkkkkkkkknnnkkkkknKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkWWkWWkWWkkkkkK
 26  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkKKKkkkkkKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkWWkWWkWWkkkkkK
 27  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 28  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 29  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 30  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 31  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 32  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 33  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 34  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 35  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkknnnnkkkkkkkkkkkkkkkkkkkkkkkkkkkkkWkkWWWWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 36  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkknKKKnkkkkkkkkkkkkkkkkkkkkkkkkkkkWWKkkKKKWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 37  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkknKkknKkkkkkkkkkkkkkkkkkkkkkkkkkWkWKkkkkkWKkkkkWWWWWWkkkkkkkkkkkkhhkkkkkK
 38  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkknnnnKkkkkkkkkkkkkkkkkkkkkkkkkWkKWKkkkkWkKkkkkWKKWKKWkkkkkkkkkkkhhkkkkkK
 39  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkKKnKkkkkkkkkkkkkkkkkkkkkkkkkWWWWWkkkWkKkkkkkWKkWKkWKkkkkkkkWWkhhkkkkkK
 40  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkknKkkkkkkkkkkkkkkkkkkkkkkkkkKKWKKkWkKkkkkkkWKkWKkWKkkkkkkkWWkhhkkkkkK
 41  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkknnnnkKkkkkkkkkkkkkkkkkkkkkkkkkkkkWKkWWWWWkkkkkWKkWKkWKkkkkWWkWWkhhkkkkkK
 42  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkKKKKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkKkkKKKKKkkkkkKkkKkkKkkkkWWkWWkhhkkkkkK
 43  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 44  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 45  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 46  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 47  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 48  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 49  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 50  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 51  KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
```
`. nothing  g root.4  h root.3  k root.1  K root.0  n growth.lt  W salt`

The crew at the top left of the HUD is folded to heads: a column 12 wide, rows 18 tall, with no plate and no names: the head (5.25) at 1, +1 inside an outline of `root.0` one unit round that follows its cut corners (12 by 12 with its own corners left out), and a life strip 12 by 4 at 0, +13, one clear unit under the outline. With the seat's ring straight against the sky, the pale rings of `cyan.lt` and `salt` vanished on a noon sky and the faces looked pasted on. The names are on the roster, held open with Tab. A HUD that wrote seven names, places and strips down the left took a fifth of the screen from the world. A friend who has fallen and not yet risen keeps the frame of their seat, but their face gives way to a skull of bone 7 by 7 on `root.1` inside it (`salt` at its top left, `clay.lt`, `clay.sh` at its bottom and right, sockets and nose of `root.0`), over an empty strip; the roster draws the same head. An empty strip alone told the fall only by the absence of red. A wider strip of ten cells with a number was weighed and left: the column is 12 wide so that the crew takes no width from the world, and the roster gives the rest.

### 5.25 Name tag, ping, compass marks

**Name tag**, over a friend's head and over a townsperson within 12 strides: the name's cell on a strip of the chat wash 11 tall and as wide as the name plus 10 (drawn opaque here), the name 5 in; a flag 2 by 7 in the player's colour at 1, 2; under the strip their life strip (5.24) as wide as the tag. A townsperson's tag has no flag and no strip. Tags are centred over the head and snap to units.

```
     0         1         2
     01234567890123456789012345678
  0  kkkkkkkkkkkkkkkkkkkkkkkkkkkkk
  1  kkkkkWkkkkkWkkkkkkkkkkkkkkkkk
  2  knnkkWWkkkWWKkkkkkkkkkkkkkkkk
  3  knnkkWKWkWkWKWWWWkkWWWWWkkkkk
  4  knnkkWKkWkKWKWKKKWkWKKKWKkkkk
  5  knnkkWKkkKkWKWWWWWKWKkkWKkkkk
  6  knnkkWKkkkkWKWKKKKKWKkkWKkkkk
  7  knnkkWKkkkkWKkWWWWkkWWWWKkkkk
  8  knnkkkKkkkkkKkkKKKKkkKKWKkkkk
  9  kkkkkkkkkkkkkkkkkkkWWWWkKkkkk
 10  kkkkkkkkkkkkkkkkkkkkKKKKkkkkk
 11  KKKKKKKKKKKKKKKKKKKKKKKKKKKKK
 12  KrrrrrrrKrrrrrrrKjjjjjjjKjjjK
 13  KRRRRRRRKRRRRRRRKjjjjjjjKjjjK
 14  KKKKKKKKKKKKKKKKKKKKKKKKKKKKK
```
`. nothing  j root.2  k root.1  K root.0  n growth.lt  r blood.lt  R blood  W salt`

**Marks on the compass**, 7 by 7: the bed, where one fell, where the Guide points; and a friend's **head**, 10 by 10. The head is a person, not a chip: an 8 by 8 face lit from the top left, each seat its own, with its own hair or cloth (a long parted fall, a short crop with stubble, a close crop and a full beard, a knot on the crown, a hood wrapped to the eyes, red tufts and freckles, long grey hair under a band, a bare pate with a grey beard), its own skin on a ramp of three tones from the clay or timber ramp with the next darker tone for the mouth, eyes of one `root.0` unit under a brow of the hair's dark tone, and a mouth or beard row. The seat's colour is only the frame, one unit deep round the face with its corners left out; where the hair or a pate leaves the square, `root.1` shows inside the frame. The same head stands beside a name in the crew and the roster, on the map and beside a bounty. As a 16 by 16 icon, for the crew's side tabs and the map's list, the face is 10 by 10 (its forehead and chin rows and the two edge columns of the face drawn twice, never scaled), framed in the seat's colour and outlined in `root.0`.

```
     0         1         2         3
     0123456789012345678901234567890123
  0  ...K.....KK...KK...KKKKK...KKKKKK.
  1  ..KnK....KrK.KrK..KyyyyyK.KWbbbbBK
  2  .KnnnK....KrKrK....KyyyK..KbbbbbbK
  3  KnnnnnK....KrK.....KyyyK..KLLFFFSK
  4  KnKKKnK...KrKrK....KyyyK..KLIFFISK
  5  KnK.KnK..KrK.KrK..KyyyyyK.KLFFFFSK
  6  KKK.KKK..KK...KK..KKKKKKK.KDDDDDDK
  7  ...........................KKKKKK.
```
`. nothing  b arm.lt  B arm  D clay.dk  F clay.face  I ink  K root.0  L clay.lt  n growth.lt  r blood.lt  S clay.sh  W salt  y ember.hi`

**Ping**, 9 by 6, in the colour of the player who set it (shown in `cyan.lt`), pointing down at the place; under it the distance in the text face with shadow, as "42 m". It stands 8 s in the world and on the compass.

```
     0        
     012345678
  0  KKKKKKKKK
  1  KcccccccK
  2  .KcccccK.
  3  ..KcccK..
  4  ...KcK...
  5  ....K....
```
`. nothing  c cyan.lt  K root.0`

### 5.26 Compass strip

A plain dark plate 182 by 12. It shows 138 degrees of the horizon, 84 units either side of the middle. N, E, S, W are letters in `salt` with no shadow. The four points halfway between them are ticks of `root.4` 6 tall at y 3, and the eight points between those are ticks 2 tall at y 5. The night of the round stands in a compartment fastened to the strip's right end: a plain plate that shares the strip's right outline column, which runs unbroken from its top to its foot, holding a crescent 7 by 7 in `salt` shaded `root.4` at 3, 2 from the shared column and, 3 clear of it, "3/8" in `salt` with no shadow, its cell at y 1 like the winds', 2 clear before its outline. The strip itself stays 182 and centred on the crosshair; the compartment reaches past it on the right. Written "Night 3 of 8" under the strip, the night stood between the compass and the boss bar, and a column of five lines ran 120 units down the middle of the view. "N3/8" in the small face was not used: on a compass N is north, and the small face carries no words. Two marks of `salt`, 2 by 2, at x 90 on y 1 and y 9, show the heading. Marks ride on the strip at y 3, a friend's head at y 1, lying over the plate's inner edges; one that lies outside the strip's span waits at that end. A mark that would come within 3 units of a wind's letter stands aside from it, 3 clear, on the side its bearing lies: a friend's head drawn hard against the N merged with it. Under the plate, only while the setting Coordinates is on, the place as "x -104  y 64  z 2210" at the left, the text's cell at y 13, in the text face with shadow. Left half:

```
     0         1         2         3         4         5         6         7         8         9
     012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345
  0  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
  1  KhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhWWhhhh
  2  KhkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkKKKKKKkkkkkkkkkkkWkkkWkkkkkkkkkkkkkkkkkkkkWWkkkk
  3  KhkkkkkkkkkgkkkkkkkkkkkKkkkkkkkkkkkkkkkkkkkkkkkKWbbbbBKkkkkkkkkkkWWkkWkkkkkkkkkkkkkkkkkkkkkkkkkk
  4  KhkkkkkkkkkgkkkkkkkkkkKnKkkkkkkkkkkkkkkkkkkkkkkKbbbbbbKkkkkkkkkkkWkWkWkkkkkkkkkkkkkkkkkkkkkkkkkk
  5  KhkkkkkkkkkgkkkkkkkkkKnnnKkkkkkkkkkkkkgkkkkkkkkKLLFFFSKkkkkkkkkkkWkWkWkkkkkkkkkkkkkkkkkkkkkkkgkk
  6  KhkkkkkkkkkgkkkkkkkkKnnnnnKkkkkkkkkkkkgkkkkkkkkKLIFFISKkkkkkkkkkkWkkWWkkkkkkkkkkkkkkkkkkkkkkkgkk
  7  KhkkkkkkkkkgkkkkkkkkKnKKKnKkkkkkkkkkkkkkkkkkkkkKLFFFFSKkkkkkkkkkkWkkkWkkkkkkkkkkkkkkkkkkkkkkkkkk
  8  KhkkkkkkkkkgkkkkkkkkKnKkKnKkkkkkkkkkkkkkkkkkkkkKDDDDDDKkkkkkkkkkkWkkkWkkkkkkkkkkkkkkkkkkkkkkkkkk
  9  KhkkkkkkkkkkkkkkkkkkKKKkKKKkkkkkkkkkkkkkkkkkkkkkKKKKKKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkWWkkkk
 10  KhkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkWWkkkk
 11  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
 12  ................................................................................................
 13  ................................................................................................
 14  .................W...WWWW.....W.....................WWWW....W...................WWWW..WWWW....W.
 15  ................WWK..WKKKW...WWK...................W.KKKK..WWK...................KKKW..KKKW..WWK
 16  .W...W...........WK..WK.WWK.W.WK.........W...W.....WK.....W.WK.........WWWW.........WK....WK..WK
 17  ..W.W.K....WWW...WK..WKW.WKW.KWK.........WK..WK....WWWW..W.KWK..........KWKK.......W.K...W.K..WK
 18  ...W.K......KKK..WK..WW.KWKWWWWW.........WK..WK....WKKKW.WWWWW..........W.K.......W.K...W.K...WK
 19  ..W.W............WK..WKK.WK.KKWKK........WK..WK....WK..WK.KKWKK........W.K.......W.K...W.K....WK
 20  .W.K.W..........WWW...WWWWK...WK..........WWWWK.....WWWWK...WK.........WWWW.....WWWWW.WWWWW..WWW
 21  ..K...K..........KKK...KKKK....K...........KKWK......KKKK....K..........KKKK.....KKKKK.KKKKK..KK
 22  .........................................WWWW.K.................................................
 23  ..........................................KKKK..................................................
```
`. nothing  b arm.lt  B arm  D clay.dk  F clay.face  g root.4  h root.3  I ink  k root.1  K root.0  L clay.lt  n growth.lt  S clay.sh  W salt`

### 5.27 Readout of what is looked at

A plain dark plate 132 by 26, always: whatever it names, the eye finds it in the same place. Sized to its words, and 40 tall with a third row for what E does, it jumped between widths and heights as the look moved from a block to a townsperson. 132 holds the longest second line of a block ("Needs a stone pick" after its cross, 102) beside the slot; at 120 it was cut. It stands 6 under the compass's plate, centred. A dark slot at 4, 4 with the icon of the block or creature; the name's cell at 25, 2; the second line's at 25, 12; both cut with `…` short of the plate's right 4. For a block the second line is worked out from the tool in hand: when it will break the block, a `{check}` in `growth.lt`, a space, then its name and "will do" in `salt` ("Iron pick will do", or "Breaks by hand"); when it is too weak, a `{cross}`, a space and what is needed, all in `blood.lt` ("Needs a Hīrak pick"), so that the yes and the no differ by their glyph as well as by their colour. In grey the yes read as a line that did not matter, the most useful line on the plate. A second icon of the needed tool after the line was dropped: it did not line up with the slot's icon and made the plate 18 wider than its words. A townsperson's second line is their work in `root.4`. For a creature the second line is a thin strip of its life (5.15), 41 wide in ten segments of 3, at 25, 15: as wide as the name it was 24 units of two-unit segments, unreadable at scale 2. A creature that attacks has `{skull}` and a space before its name, both in `blood.lt`; a calm one's name is `salt`, so the plate says which kind it is before the strip does. When E does something to the thing (talk, open), it stands at the right of the second line in the same plate: the key cap (5.28) at y 10, so that its label's capitals sit on the line's, 3 clear, then the word in `salt` with its shadow, its cell at y 12, ending 4 in from the plate's right as the slot stands 4 in from its left; the second line is cut 4 short of the cap. Drawn as a second plate 6 under the first, the prompt read as a second notice; as a third row it made the plate taller than every other readout. The slot's floor is `root.2` (5.4). An icon drawn on this plate stands at least two ramp steps above `root.1`: a dark creature is drawn in `root.2` to `root.4`, never `root.1` to `root.3`.

```
     0         1         2         3         4         5         6         7         8         9         0         1         2
     0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456
  0  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
  1  KhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhK
  2  KhkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
  3  KhkKKKKKKKKKKKKKKKKKkkkkkkkWkkkkkkkWkkWkkkkkkkkkkWWWWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
  4  KhkKKKKKKKKKKKKKKKKKhkkkkkkWKkkkkkkWKkkKkWkkkkkkkWKKKWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
  5  KhkKKKKKKKKKKKKKKKKKhkkkkkkWKWWWWkkWKkWkWWWWkkkkkWKkkWKWWWkWWWWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
  6  KhkKKKKKKKKKKKKKKKKKhkkkkkkWKkKKKWkWKkWKkWKKKkkkkWKkkWKWKKKWKKKWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
  7  KhkKKKKKKKKKKKKKKKKKhkkkkkkWKkWWWWKWKkWKkWKkkkkkkWKkkWKWKkkWWWWWKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
  8  KhkKKKKKKKKKKKKKKKKKhkkkWkkWKWkKKWKWKkWKkWKkkkkkkWKkkWKWKkkWKKKKKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
  9  KhkKKKKKKKKKKKKKKKKKhkkkkWWWKkWWWWKWWkWKkkWWkkkkkkWWWWKWKkkkWWWWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 10  KhkKKKKKKKKKKKKKKKKKhkkkkkKKKkkKKKKkKKkKkkkKKkkkkkkKKKKkKkkkkKKKKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 11  KhkKKKKKKKKKKKKKKKKKhkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 12  KhkKKKKKKKKKKKKKKKKKhkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 13  KhkKKKKKKKKKKKKKKKKKhkkkkkkkkkkkkkrkkkrkkkkkkkkkkkkkkkkkrkkkkkkkkkkkkkkkkkkkkrkkkrkrrrkkkkkkkkkkkrkkkkkkkkkkkkkkrkkkkkkrkkkkkkK
 14  KhkKKKKKKKKKKKKKKKKKhkkkrkkkrkkkkkrrkkrKkkkkkkkkkkkkkkkkrKkkkkkkkkkkkkkkkkkkkrKkkrKkKKKkkkkkkkkkkrKkkkkkkkkkkkkkkKkkkkkrKkkkkkK
 15  KhkKKKKKKKKKKKKKKKKKhkkkkrkrkKkkkkrKrkrKrrrrkkrrrrkkrrrrrKkrrrkkkkkrrrrkkkkkkrKkkrKkrkkrrrkrrrrkkrKkrkkkkkrrrrkkrkrrrrkrKkrkkkK
 16  KhkKKKKKKKKKKKKKKKKKhkkkkkrkKkkkkkrKrKrKrKKKrkrKKKrkrKKKrKrkKKKkkkkkKKKrkkkkkrrrrrKkrKkrKKKkKKKrkrKrkKkkkkrKKKrkrKrKKKKrKrkKkkK
 17  KhkKKKKKKKKKKKKKKKKKhkkkkrkrkkkkkkrKkrrKrrrrrKrrrrrKrKkkrKkrrkkkkkkkrrrrKkkkkrKKKrKkrKkrKkkkrrrrKrrkKkkkkkrKkkrKrKrKkkkrrkKkkkK
 18  KhkKKKKKKKKKKKKKKKKKhkkkrkKkrkkkkkrKkkrKrKKKKKrKKKKKrKkkrKkkKrkkkkkrkKKrKkkkkrKkkrKkrKkrKkkrkKKrKrKrkkkkkkrKkkrKrKrKkkkrKrkkkkK
 19  KhkKKKKKKKKKKKKKKKKKhkkkkKkkkKkkkkrKkkrKkrrrrkkrrrrkkrrrrKrrrkKkkkkkrrrrKkkkkrKkkrKkrKkrKkkkrrrrKrKkrkkkkkrrrrrKrKkrrrkrKkrkkkK
 20  KhkkhhhhhhhhhhhhhhhhhkkkkkkkkkkkkkkKkkkKkkKKKKkkKKKKkkKKKKkKKKkkkkkkkKKKKkkkkkKkkkKkkKkkKkkkkKKKKkKkkKkkkkrKKKKKkKkkKKKkKkkKkkK
 21  KhkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkrKkkkkkkkkkkkkkkkkkkK
 22  KhkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkKkkkkkkkkkkkkkkkkkkK
 23  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
```
`. nothing  h root.3  k root.1  K root.0  r blood.lt  W salt`

### 5.28 Key cap, crosshair, banner, title mark

**Key cap**, 14 tall, as wide as its label plus 6 or as wide as a list of caps asks with its label centred, so at least 2 units stand clear on each side of the label inside the outline: row 0 the outline, row 1 `stone.hi`, then the `stone.lt` face to row 10 with the label's cell at y 2 so that capitals and ascenders stand on rows 3 to 9 and never touch the top, rows 11 and 12 `stone.dk`, row 13 the outline. The label is in ink. Caps of one row stand side by side sharing an outline column. Used in prompts and on the controls screen.

```
     0         
     0123456789
  0  .KKKKKKKK.
  1  KAAAAAAAAK
  2  KGGGGGGGGK
  3  KGGIIIIGGK
  4  KGGIGGGGGK
  5  KGGIGGGGGK
  6  KGGIIIGGGK
  7  KGGIGGGGGK
  8  KGGIGGGGGK
  9  KGGIIIIGGK
 10  KGGGGGGGGK
 11  KMMMMMMMMK
 12  KMMMMMMMMK
 13  .KKKKKKKK.
```
`. nothing  A stone.hi  G stone.lt  I ink  M stone.dk  K root.0`

**Crosshair**, 9 by 9. A hit turns it for 0.14 s into four diagonal ticks of the same weight; a critical hit draws them in `ember.hi`.

```
     0        
     012345678
  0  ...KKK...
  1  ...KWK...
  2  ...KWK...
  3  KKKKWKKKK
  4  KWWWWWWWK
  5  KKKKWKKKK
  6  ...KWK...
  7  ...KWK...
  8  ...KKK...
```
`. nothing  K root.0  W salt`

**Banner**, for the start of an event or the coming of a great feeder: a dark plate with a frame, 24 tall, as wide as its longer line plus 10, centred on the stage at y 56, for 4 s. First line in the frame's colour, second in `root.4`.

```
     0         1         2         3         4         5         
     012345678901234567890123456789012345678901234567890123456789
  0  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
  1  KggggggggggggggggggggggggggggggggggggggggggggggggggggggggggK
  2  KgkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkgK
  3  KgkkkrkkkrkrkkkkkkkrkkkkkkkkkkkkkkkkkkkkkkkkrkkkkkrkkkkkkkgK
  4  KgkkkrrkkrKkKkkkkkkrKkkkkkrkkkkkkkkkkkkkkkkkkKkkkkrKkkkkkkgK
  5  KgkkkrKrkrKrkrrrrrkrrrrkkrrrrkkkkkrrrkrrrrkkrkrrrrrKkkkkkkgK
  6  KgkkkrKrKrKrKrKKKrKrKKKrkkrKKKkkkkrKKKkKKKrkrKrKKKrKkkkkkkgK
  7  KgkkkrKkrrKrKrKkkrKrKkkrKkrKkkkkkkrKkkkrrrrKrKrKkkrKkkkkkkgK
  8  KgkkkrKkkrKrKrKkkrKrKkkrKkrKkkkkkkrKkkrkKKrKrKrKkkrKkkkkkkgK
  9  KgkkkrKkkrKrKkrrrrKrKkkrKkkrrkkkkkrKkkkrrrrKrKkrrrrKkkkkkkgK
 10  KgkkkkKkkkKkKkkKKrKkKkkkKkkkKKkkkkkKkkkkKKKKkKkkKKKKkkkkkkgK
 11  KgkkkkkkkkkkkrrrrkKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkgK
 12  KgkkkkkkkkkkkkKKKKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkgK
 13  KgkkkkkkkkkkkkkkkkkkkkgkgkkkkkkkkkkgkkkkkkkkkkkkkkkkkkkkkkgK
 14  KgkkkkkkkkkkkkkkkkgkkkkKgKkkkkkkkkkgKkkkkkkkkkkkkkkkkkkkkkgK
 15  KgkkkgkkkgkggggkkggggkgkgKkkkkkgggggKggggkkgkkgkkgkggggkkkgK
 16  KgkkkgKkkgKgKKKgkkgKKKgKgKkkkkkgKKKgKkKKKgkgKkgKkgKgKKKgkkgK
 17  KgkkkgKkkgKgKkkgKkgKkkgKgKkkkkkgKkkgKkggggKgKkgKkgKgKkkgKkgK
 18  KgkkkgKkkgKgKkkgKkgKkkgKgKkkkkkgKkkgKgkKKgKgKkgKkgKgKkkgKkgK
 19  KgkkkkggggKgKkkgKkkggkgKggkkkkkkggggKkggggKkggggggKgKkkgKkgK
 20  KgkkkkkKKKKkKkkkKkkkKKkKkKKkkkkkkKKKKkkKKKKkkKKKKKKkKkkkKkgK
 21  KgkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkgK
 22  KggggggggggggggggggggggggggggggggggggggggggggggggggggggggggK
 23  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
```
`. nothing  g root.4  k root.1  K root.0  r blood.lt`

**Title mark**, 248 by 31. "PEOPLS CRAFT" is drawn by hand for the mark alone and stands out of the wall, as the tradition builds a game's name from its own blocks. Its letters are not the text face enlarged: the text face scaled up kept the thin shapes of small letters and read as large text, not as a drawn name. Each letter is laid out on cells of 3 by 3 units, 8 cells (24 units) tall, with strokes 2 cells (6 units) thick and a width of its own (E, L, S, C and F 5 cells, P, O, R, A and T 6), the corners of O, C, S, A and of the bowls of P and R cut by one cell; letters stand 5 apart and the words 15. PEOPLS is timber: face `timber.face`, its top row and left column `timber.hi`, its bottom row and right column `timber.sh`, grain lines of `timber.sh` one unit deep on every fourth row, broken into runs by a fixed hash and never on an edge. CRAFT is fired clay in the same roles, `salt`, `clay.face`, `clay.sh`, and stands 2 units lower, so that the name reads as two pieces set into the wall and not as one typeset line. Behind both faces the letters are pushed back 3 units down and to the right in `clay.dk`, and one outline of `root.0` runs round the whole, corners included. There is no plaque behind it: a parchment board with a dog-eared corner read as a signboard from clip art. It stands 30 from the top of the title's block. No subtitle stands under it: the title shows the mark and four doors (section 6).

**Raised letters**, for the one line of a screen that stands on a wash with no window ("You fell"): a headline face of cap height 14 drawn at one unit to the pixel. Its strokes are 2 wide, laid out from the text face's glyphs at 2 to the unit as a mask; every cut corner of the face, and every step of a diagonal, is then filled back to a cut of a single unit, the face's chisel at the top right and bottom left; the stroke is `salt` with a band of `clay.lt` one unit deep along its right and bottom, where it turns from the light from the top left; every unit of ground touching it, corners included, is `root.0`, and a flat `root.0` copy of the whole drawing stands 1 right and 1 down as its shadow. A line is twice the text face's width plus 2 by 22. Lit in blocks of 2 (`salt`, `clay.lt`, `clay.sh` by the block) under an outline and shadow of 1, it read as the text face scaled up: two pixel sizes in one word.

### 5.29 The body as worn

The player drawn front on, as the tradition puts the player's model in the pack: a person, not a mannequin. Two sizes, built by the same plan: small, 18 by 34 with its outline, for the pack's well; large, 26 by 54, for the States tab. Every limb is lit from the top left: its left column in the lit tone of its ramp, its right column in the shade, the middle in the mid tone, and the torso and the upper arms carry a lit top row, the shoulders, whose last unit stays in shade; the whole is outlined in `root.0`. From the second row of the torso down to the hands a split of `root.0` one unit wide parts each arm from the torso, cut from the arm's inner column, so that a pale chest piece does not read as one slab from hand to hand.

| Part | Small | Large | Drawn in |
| --- | --- | --- | --- |
| Head | 8 by 8 | 10 by 10 | the seat's own face (5.25), the large one its 10 by 10 face. A worn helm covers the top 3 (4) rows and runs down both sides 3 rows more in its material, so the eyes still show |
| Torso | 8 by 12 | 12 by 20 | a tunic of the timber ramp (`timber.lt`, `timber.face`, `timber.sh`) when bare; the worn chest piece's tones over it |
| Arms | 4 by 12 | 6 by 20 | the chest's tones, the last 2 (3) rows the face's skin ramp for the hands |
| Legs | 4 by 12 each, under the torso | 6 by 22 each | trousers of `clay.sh`, `clay.dk`, `clay.pit` when bare, the worn leg piece's tones over them; the last 3 (5) rows boots of `timber.sh`, `timber.dk`, `timber.pit`; a split of `root.0` one unit wide between the legs from their third row down |

The material of a worn piece gives its tones: iron `stone.lt`, `stone.face`, `stone.sh`; hide `timber.lt`, `timber.face`, `timber.sh`; lumenite `cyan.lt`, `cyan.lt`, `cyan.dk`. The picture changes as soon as a piece is put on or taken off. The figure stands on one course of the ground tile, 8 tall, along the bottom of its well, with a shadow of `root.1` 10 wide on the ground's top row under the feet.

---

## 6. Screens

Each screen is a wireframe, a table and five lines. In a wireframe one character is 3 units wide and one line is 6 units tall, so it is a picture and the table is the measure. Coordinates are from the top left of the screen's main slab or, for a screen with side panels, of its leftmost slab; tabs stand outside and have negative coordinates. The x, y, w and h of the table are in those coordinates. An x named inside a "What" ("right-aligned to x 168") is measured from the left of the slab the item stands on. A box of `#` and `=` is a slab. A text item is shown by its mark in quotation marks.

Shared by every container: the pack is nine by three slots at x 8, the hotbar row 4 units under it, the bottom margin 6 to 8.

### The HUD

On a stage 427 by 240. A part in the left third keeps its distance from the stage's left edge, a part in the right third from the right edge, a part in the middle from the centre line; parts above y 60 keep their distance from the top, parts below y 180 from the bottom, the crosshair from the centre.

```
                                          +----------------------------------------------------+--------+
 +---+                                    | H1 compass                                         |H2 night|     +----------------------------------+
 | H5|                                    +----------------------------------------------------+--------+     | H6 status                        |
 |   |                                    +-------------------------------------------------------------+     |                                  |
 |   |                                    | H3 boss                                                     |     +----------------------------------+
 |   |                                    |                                                             |     +----------------------------------+
 |   |                                    |                                                             |     | H8 step                          |
 |   |                                    +-------------------------------------------------------------+     +----------------------------------+
 |   |
 |   |                                    +-------------------------------------------------------------+
 |   |                                    | H3 event                                                    |
 |   |                                    +-------------------------------------------------------------+
 |   |
 |   |
 |   |                                                                                    +------------------------------------------------------+
 |   |                                                                                    | H7 toast                                             |
 |   |                                                                                    |                                                      |
 |   |                                                                                    |                                                      |
 +---+                                                                                    |                                                      |
                                                                       +---+              +------------------------------------------------------+
 +-------------------------------------------------+                   |   |
 | H11 chat, only for 8 s after a line             |                   +---+
 |                                                 |
 |                                                 |
 |                                                 |
 |                                                 |
 |                                                 |
 |                                                 |
 |                                                 |
 |                                                 |      "H14"
 +-------------------------------------------------+
                                          "H15"                             +---------------------------+       +--------------------------------+
                                                                            | H16 pips                  |       | H9 feed                        |
                                          +-H17 pips-----------------+"H18" +-H19 pips------------------+       |                                |
                                          +--------------------------+      +---------------------------+       |                                |
                                          +-H20---------------------------------------------------------+       |                                |
                                          +-------------------------------------------------------------+       |                                |
                                          | H21 hotbar                                                  |       +--------------------------------+
                                          |                                                             |
                                          |                                                             |                              "H10"
                                          +-------------------------------------------------------------+
```

| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| H1 | compass | 122 | 2 | 182 | 12 | compass strip |
| H2 | night | 303 | 2 | 31 | 12 | the night's compartment at the compass strip's right end (5.26): a crescent and "3/8". Under the strip, the place as "x -104  y 64  z 2210" at the left only while the setting Coordinates is on (it is off at first) |
| H3 | boss | 122 | 18 | 182 | 20 | boss bar, 4 under the compass's plate: name row, then the strip. A world event (Night raid, Sand March, Amāvassa) takes the same form with a thin strip; each further bar stands 20 under the one above it, at y 38. Two at most |
| H4 | readout | 147 | 20 | 132 | 26 | what you look at, always 132 by 26, centred, 6 under the compass's plate; it is not drawn while a boss bar or an event strip is up (not drawn in the wireframe) |
| H5 | party | 4 | 4 | 12 | 125 | the crew folded to heads (5.24): one row 18 tall to each friend online, up to seven: the head 10 by 10 in its outline of `root.0`, a life strip 12 by 4 one clear unit under it; no names |
| H6 | status | 323 | 4 | 100 | 27 | status frames 18 square, pitch 22, from the right edge leftward, the time left under each in the small face. They never move for a toast: handed in above them, a toast pushed them down 32 units and back up, and the corner rearranged itself between moments |
| H7 | toast | 267 | 48 | 160 | 32 | one toast, a clay slab 160 by 32 (42 when the second line wraps), sliding in from the right for 5 s, its right edge on the stage's, 4 under the Guide's step (y 48 here). Where what stands under the compass reaches within 4 of its column (a boss bar's strips on this stage) it stands 4 under that instead, at y 86 |
| H8 | tracker | 323 | 32 | 100 | 12 | the present step of the Guide folded to one line 2 under the plates of the status times (29 under the top of the frames), moving with them, right-aligned: the step mark and the step in salt, the count in root.4 ("Smelt iron  2 of 3"), on one strip of the chat wash a unit wider than the text all round, no frame; the chapter and where to go are in the journal |
| H9 | feed | 327 | 186 | 96 | 40 | pickups: lines 10 tall, newest lowest, right-aligned: "+3 Rubble (12)" in the grade's colour with its shadow, each on its own strip of the chat wash 10 tall reaching 2 past its words on each side, the strips ending 4 from the stage's edge. Bare on the world, a green line on noon grass showed only its shadow |
| H10 | text | 396 | 228 | 27 | 10 | "Saved", text face, for two seconds |
| H11 | chat | 4 | 111 | 144 | 71 | chat: up to eight whole lines 10 tall, newest lowest, on one strip of the chat wash as wide as the column, wrapped as 5.23 says, wrapped rows 8 in. Where chat reaches over the hotbar's column the newest ends 68 above the bottom; where it ends left of that column it comes down to 48 above the bottom. Fewer lines while the crew list stands above. Each line leaves 8 s after it came, so a still HUD shows no chat at all |
| H12 | cross | 209 | 116 | 9 | 9 | crosshair, 9 by 9: salt plus, root.0 outline |
| H13 | prompt | 245 | 30 | 30 | 14 | prompt: at the right of the readout's second line (5.27), a key cap and what E does to the thing the readout names ("Talk"), inside the same plate. There is one look target: the readout and the prompt always name the same thing, and no row is drawn when the thing cannot be used (a Tama, a block) |
| H14 | text | 163 | 174 | 100 | 10 | name of the thing in hand, centred, in its grade's colour with its shadow, for 1.6 s after a change, on a strip of the chat wash 10 tall reaching 2 past its words on each side and no plate; it stands over the row of defence and lees, 66 above the stage's bottom. Bare on the world as the tradition writes it, an Upper name in `growth` vanished into noon grass |
| H15 | text | 122 | 187 | 70 | 10 | second row, left: a shield sprite 9 by 9 and the defence 2 right of it, 8 clear, then a pouch sprite 9 by 9 and the lees carried 2 right of it, the digits centred on the sprites' rows. Both are outlined in `root.0` and lit from the top left like the pips beside them: the shield of stone, `stone.lt` face, a rim of `stone.hi` on its top and left, its right half `stone.dk`; the pouch of clay with a neck tied 3 by 2 in `clay.dk`. The glyphs `{shield}` and `{lees}` in salt were one-unit lines among sprites and read as letters of a font |
| H16 | pips | 223 | 187 | 81 | 9 | second row, right: ten arm pips, filling from the right |
| H17 | pips | 122 | 198 | 81 | 9 | first row, left: ten life pips. No number stands beside them: the pips already say it, and the life's number is in the pack's body panel |
| H18 | text | 205 | 200 | 17 | 10 | level, centred on x 213 in `growth.lt`, sitting on the practice strip as the tradition sets it: its figures end 1 above the strip, under the feet of the pips, their ring's lowest row on the strip's top (ending level with the pips' feet, it read as a count of life or hunger wedged between the rows), and each figure is ringed in `root.0` one unit round (the text drawn at the four steps left, right, up and down, then over them) and has no shadow. With a shadow, floating midway between the two pip rows, it read as a count of something and not as a level. While the strip is empty nothing is written: a new arrival's lone 1 beside an empty strip read as a stray figure |
| H19 | pips | 223 | 198 | 81 | 9 | first row, right: ten hunger pips, filling from the right |
| H20 | strip | 122 | 209 | 182 | 5 | practice strip, thin, eighteen segments |
| H21 | hotbar | 122 | 216 | 182 | 22 | hotbar; the selector overhangs it by one unit all round |

- **Shows.** The four measures of a body, what is in the hands, where one is and which way one faces, who is near, what the Guide wants next, and what just happened. F1 hides all of it. The debug overlay (F3) is lines of the text face on a plain dark plate at the top left, and the crew list is not drawn while it shows.
- **Clickable.** Nothing. The HUD takes no pointer.
- **Keys.** 1 to 9 and the wheel choose a hotbar cell. Enter or T opens chat. Tab holds the roster open. V sets a ping. E, G and M open the pack, the journal and the map.
- **First.** A new arrival sees the hotbar empty with its first cell chosen, ten life pips, ten hunger pips, ten arm pips, the compass, and the first step of the Guide at the right.
- **Floating numbers** over a struck creature are the text face with shadow, `salt` for a blow, `ember.hi` for a critical one with an exclamation mark after it, `growth.lt` for mending. They rise by whole units and are cut after 0.85 s.
- **Narrow stage.** On a stage under 400 wide the crew and the status frames start at y 26, under the compass; the Guide's step stands under the status frames at y 54; a toast stands 4 under the step, or under the strips while a boss bar is up; pickups stand above the arm row, three lines at most, from y 150.
- **A blow from a side** shows as a wedge 9 by 5 of `blood` with a `root.0` outline, 40 units from the centre toward the side it came from, in one of eight directions, for 1 s.

### Pack, with the body panel and the patterns made by hand

The pack is the main slab, 176 by 182, with one row of tabs standing 21 above it; the main slab and the panel fastened to it are centred on the screen together, as the tradition moves its pack aside when its recipe book opens, so that the panel never stands near the screen's edge. Material: clay. The tab chosen fastens one panel to the main slab and nothing else: Body or States, a panel 136 by 166 at its top left, narrower and 16 shorter, flush with its top and sharing its left outline column; or Making, the recipe panel 116 by 166 at its right, flush with its top. The recipe panel is closed until Making is chosen, as the tradition keeps its recipe book. Skills opens the tree. So the window is never three equal columns: one slab stands, one smaller panel hangs from it. With Body chosen (x counted from the body panel's left; the main slab's left is x 135):

```
                                     +-------+
                                     |T1     +------+-------+-------+
                                     |       |T2    |T3     |T4     |
                                     |       |      |       |       |
                                     |       |      |       |       |
#====================================#=========================================================#
# S0                                 # M0                                          +---------+ #
#  "S1"                              #  "M1"                                       |M2       | #
#                                    #                                             |         | #
#                                    #  +----++----------------+                   +---------+ #
#  "S2"          +-S3-------------+  #  |M3  ||M4 well         |                               #
#                +----------------+  #  |    ||                |                               #
#  +------------------------------+  #  |    ||                | +-----------+                 #
#  |S4 rows                       |  #  |    ||                | |M5         |                 #
#  |                              |  #  |    ||                | |           |=M6=>    +-----+ #
#  |                              |  #  |    ||                | |           |         |M7   | #
#  |                              |  #  |    ||                | |           |         |     | #
#  |                              |  #  |    ||                | |           |         |     | #
#  |                              |  #  |    ||                | |           |         +-----+ #
#  |                              |  #  |    ||                | |           |                 #
#  |                              |  #  |    ||                | +-----------+                 #
#  |                              |  #  |    ||                |                               #
#  |                              |  #  +----++----------------+                               #
#  +------------------------------+  #                                                         #
#  "S5"                              #  +----------------------------+                         #
#                                    #  |M8                          |          "M9"           #
#                                    #  |                            |                         #
#                                    #  |                            |                         #
#  ~S6~                              #  +----------------------------+                         #
#  +------------------------------+  #                                                         #
#  |S7 rows                       |  #  +----------------------------------------------------+ #
#  |                              |  #  |M10                                                 | #
#  |                              |  #  |                                                    | #
#  |                              |  #  |                                                    | #
#  |                              |  #  |                                                    | #
#  |                              |  #  |                                                    | #
#  |                              |  #  |                                                    | #
#  |                              |  #  |                                                    | #
#  |                              |  #  |                                                    | #
#  |                              |  #  |                                                    | #
#  |                              |  #  |                                                    | #
#  |                              |  #  |                                                    | #
#  |                              |  #  |                                                    | #
#  |                              |  #  +----------------------------------------------------+ #
#  |                              |  #  +----------------------------------------------------+ #
#  |                              |  #  |M11                                                 | #
#==+------------------------------+==#  |                                                    | #
                                     #  |                                                    | #
                                     #  +----------------------------------------------------+ #
                                     #                                                         #
                                     #=========================================================#
```

| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| T1 | tab | 135 | -21 | 24 | 24 | the main slab's tabs, the only tab row: Body (the person), States, Making (the pattern grid), Skills (opens the tree) |
| T2 | tab | 158 | -18 | 24 | 18 | States |
| T3 | tab | 181 | -18 | 24 | 18 | Making |
| T4 | tab | 204 | -18 | 24 | 18 | Skills |
| S0 | slab | 0 | 0 | 136 | 166 | body panel, plain, no tabs of its own |
| S1 | text | 8 | 6 | 120 | 10 | the player's name; one too long for 120 is cut with "…" and its tooltip gives it whole with the level under it |
| S2 | text | 8 | 17 | 40 | 10 | "Level 14" in ink |
| S3 | strip | 52 | 17 | 76 | 5 | practice strip, thin, from 6 after the level to x 128, its top on the level's cap line, a segment to 8 units; under it at y 23 the practice in figures, "320/900" in the small face in `ink.faded`, its last column on the strip's last (the small face has no lower case, and "of" set in it would be capitals); in words ("320 of 900 to level 15") it is the strip's tooltip. A strip with no figure did not say how far the next level was |
| S4 | rows | 8 | 29 | 120 | 48 | four rows 12 tall: Strength, Agility, Vitality, Arm; each name's tooltip says in two grey lines what a point raises ("+2% crystal-work and totem harm", "+6 arm per point"), so that a word of the game's own such as Arm is never left to be guessed; value right-aligned to x 116, the one column every figure of the panel ends on; the 12 units from x 117 to 128 are a gutter kept whether there are points or not, so that with none the figures do not hang mid-panel apart from the totals; while there are points, a clay button "+" 10 by 10 at x 119 at the top of each row, 2 clear of the figures. While the pointer is on a "+", the row shows what one press makes, "6 {right} 7" with the arrow and the new figure in `growth.dk`, and each total below that the point would change is written at its new value in `growth.dk`, so a point is never spent blind |
| S5 | text | 8 | 78 | 120 | 10 | "3 to spend", only while there are points |
| S6 | rule | 8 | 89 | 120 | 2 | cut line |
| S7 | rows | 8 | 92 | 120 | 70 | seven rows 10 tall, label in faded ink, value in ink right-aligned to x 116 with the attributes' figures: Defence, Melee, Ranged, Crystal-work, Totem, Critical, Speed |
| M0 | slab | 135 | 0 | 176 | 182 | main slab |
| M1 | text | 143 | 6 | 40 | 10 | "Pack" |
| M2 | button | 273 | 3 | 30 | 14 | "Sort": merges and orders the pack, leaves the hotbar |
| M3 | slots | 143 | 16 | 18 | 54 | head, body, legs, each with its silhouette |
| M4 | well | 163 | 16 | 50 | 54 | figure well: the body as worn (5.29), standing on one course of the ground tile 8 tall along the well's floor |
| M5 | slots | 219 | 25 | 36 | 36 | the two by two grid |
| M6 | arrow | 259 | 37 | 22 | 15 | progress arrow, empty until a pattern matches, then full |
| M7 | slots | 285 | 34 | 18 | 18 | what the grid makes |
| M8 | slots | 143 | 74 | 90 | 18 | five trinket slots with the ring silhouette |
| M9 | text | 239 | 78 | 64 | 10 | lees carried: the jar mark and the number, right-aligned to x 303 |
| M10 | slots | 143 | 98 | 162 | 54 | the pack, nine by three |
| M11 | slots | 143 | 156 | 162 | 18 | the hotbar row, four units below the pack |

**States chosen.** The body panel shows instead its title "States" at 8, 6 and, from y 24, a row 22 tall to each state the HUD shows, in the HUD's order from the left (what harms first, then what helps, soonest gone first), so that the two screens list the same states: its frame 18 by 18 at 0, 2 with the state's icon; on the first line at x 22 its name in `growth.dk` for a state that helps and `blood.dk` for one that harms; on the second at x 22, y 11, what it does in `ink.faded` ("+6 defence") and the time left right-aligned to x 128 in the text face, `ink.faded` (`blood.dk` under ten seconds). The tooltip says how it ends. The figure is not drawn again: a second, larger copy of the body above the list pushed the states into the panel's lower third while the pack beside it already shows the body.

**Making chosen.** No panel stands at the left; the main slab's left is x 0 and the recipe panel's is x 175:

| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| R0 | slab | 175 | 0 | 116 | 166 | recipe panel, plain: the pack lists only what two hands can make, so it has no station tabs and no tab row of its own |
| R1 | text | 183 | 6 | 60 | 10 | "By hand" |
| R2 | field | 183 | 16 | 98 | 14 | search, as wide as the well; placeholder "Search"; longer text scrolls inside the field |
| R3 | check | 183 | 35 | 12 | 12 | checkbox with the label "Can make" at x 23 |
| R5 | well | 183 | 52 | 98 | 96 | dark well: five pattern cells of 18 to the row, then a scroll track 6 wide; while the list fits, the rest of the well's rows are empty cells, sunk like the others with a lower edge of `root.2`, so the well reads as a page with places still to fill and not as six icons on a black field |
| R6 | text | 183 | 152 | 100 | 10 | a mouse 9 by 11, then "lay out", a second mouse, then "make", in faded ink: each mouse is drawn in the slab's ramp with the button it speaks of filled in `ember.lt`, `ember`, `ember.dk`, standing from y 151, since the face's 7 wide `{lmb}` and `{rmb}` in faded ink did not show which button was which |

- **Shows.** What is carried and worn, what the body can do, and what two hands can make. The figure well shows the player with their own face and each worn piece drawn on the body. The body panel holds the level, the four attributes and the seven totals. The recipe panel, opened with Making, lists every pattern that can be laid on the two by two grid; the patterns of a station are read at that station.
- **Clickable.** Every slot (see Behaviour). "Sort". The "+" beside an attribute spends a point. A pattern cell: left click lays the pattern on the grid, right click makes one straight into the pack, shift and left click makes as many as the pack affords. The search field. "Can make". Tabs.
- **Keys.** E or Esc closes. 1 to 9 swaps the hovered slot with that hotbar slot. Q drops one from the hovered slot, Ctrl and Q the stack. Tab walks: search, "Can make", pattern cells, grid, result, equipment, trinkets, pack, hotbar, "Sort", attributes. Arrows move inside a grid. Enter is a left click on the focused part, Shift and Enter a shift click. G opens the journal. Typing a letter while nothing has focus puts it in the search field.
- **First.** No part has focus. The pointer stands where it last stood. The first Tab press lands on the search field.
- **Narrow.** Under 400 units of width the two panels leave the sides. The main slab stands alone with three side tabs on its left edge: Pack, Body, Making. Body and Making each replace the upper 92 units of the slab (the pack grid and hotbar stay).

### Chest

Size 229 by 172: the slab 176 by 172 and a panel 54 by 40 fastened to its right side, its top on the slab's top. Material: timber. Anchor: centre of the screen, the panel counted.

```
#==========================================================#
#  "C1"                                       +--------+   #
#                                             +-C4-----+   #
#  .----..----..----..----..----..----..----..----..----.  #
#  |C5  ||    ||    ||    ||    ||    ||    ||    ||    |  #
#  '----''----''----''----''----''----''----''----''----'  #
#  .----..----..----..----..----..----..----..----..----.  #
#  |    ||    ||    ||    ||    ||    ||    ||    ||    |  #
#  '----''----''----''----''----''----''----''----''----'  #
#  .----..----..----..----..----..----..----..----..----.  #
#  |    ||    ||    ||    ||    ||    ||    ||    ||    |  #
#  '----''----''----''----''----''----''----''----''----'  #
#                                             +--------+   #
#  "C6"                                       +-C7-----+   #
#                                                          #
#  .----..----..----..----..----..----..----..----..----.  #
#  |C8  ||    ||    ||    ||    ||    ||    ||    ||    |  #
#  '----''----''----''----''----''----''----''----''----'  #
#  .----..----..----..----..----..----..----..----..----.  #
#  |    ||    ||    ||    ||    ||    ||    ||    ||    |  #
#  '----''----''----''----''----''----''----''----''----'  #
#  .----..----..----..----..----..----..----..----..----.  #
#  |    ||    ||    ||    ||    ||    ||    ||    ||    |  #
#  '----''----''----''----''----''----''----''----''----'  #
#  .----..----..----..----..----..----..----..----..----.  #
#  |C9  ||    ||    ||    ||    ||    ||    ||    ||    |  #
#  '----''----''----''----''----''----''----''----''----'  #
#                                                          #
#                                                          #
#==========================================================#
```

| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| C0 | slab | 0 | 0 | 176 | 172 | timber slab |
| C1 | text | 8 | 6 | 40 | 10 | "Chest", or "Supply Crate" |
| P0 | panel | 175 | 0 | 54 | 40 | a timber panel fastened to the slab's right side, its top on the slab's top, sharing its outline column. Hung 17 down, beside nothing in particular, it was fastened to neither the slab's top nor a row |
| C2 | button | 179 | 4 | 46 | 14 | "Take all", a small timber button with its word on it; its tooltip adds "Into the pack, then the hotbar". Two bare arrows did not say which one emptied the chest and which filled it |
| C3 | button | 179 | 22 | 46 | 14 | "Stash", 4 under C2: moves out of the pack every kind the chest already holds, as its tooltip says. It is not "Store all": a chest that takes only what it already holds keeps the pack's tools out of it |
| C4 | button | 107 | 3 | 61 | 14 | "Sort chest", the only button in the title row, its right edge 8 in. Two buttons both called "Sort", 70 apart, were told apart only by where they stood |
| C5 | slots | 8 | 18 | 162 | 54 | the chest, nine by three |
| C6 | text | 8 | 76 | 40 | 10 | "Pack" |
| C7 | button | 112 | 72 | 56 | 14 | "Sort pack", its right edge 8 in; every station that shows the pack under its own slots names this button the same way |
| C8 | slots | 8 | 88 | 162 | 54 | the pack, nine by three |
| C9 | slots | 8 | 146 | 162 | 18 | the hotbar row, four units below the pack |

- **Shows.** Twenty-seven slots of the box over the pack. Two players may have one chest open; each sees the other's changes as they land.
- **Clickable.** Slots and the four buttons. Shift and left click sends a stack across.
- **Keys.** E or Esc closes. Tab walks: chest grid, pack, hotbar, then Sort, Take all and Stash. 1 to 9 and Q as in the pack.
- **First.** Focus on the first chest slot. Nothing is drawn as focused until a key moves it.

### Workbench, Anvil and Line Frame

Size 291 by 166, with tabs standing 21 above. Material: timber for the Workbench and the Line Frame, stone for the Anvil. Anchor: centre of the screen.

```
                                                          +------+
                                                          |T1    |+------+
                                                          |      ||T2    |
                                                          +------++------+
#=========================================================#======================================#
#  "B1"                                                   #  "R1"                                #
#         .----..----..----.                              #  +------------------------------+    #
#         |B2  ||    ||    |                              #  +-R2 field---------------------+    #
#         '----''----''----'                              #                                      #
#         .----..----..----.             .-------.        #  +--+                                #
#         |    ||    ||    |             |       |        #  +--+                                #
#         '----''----''----'  ==B3=>     | B4    |        #                                      #
#         .----..----..----.             |       |        #  +-------------------------------+   #
#         |    ||    ||    |             '-------'        #  | R5 well                       |   #
#         '----''----''----'                              #  |                               |   #
#                                             +--------+  #  |                               |   #
#  "B5"                                       +-B6-----+  #  |                               |   #
#                                                         #  |                               |   #
#  .----..----..----..----..----..----..----..----..----. #  |                               |   #
#  |B7  ||    ||    ||    ||    ||    ||    ||    ||    | #  |                               |   #
#  '----''----''----''----''----''----''----''----''----' #  |                               |   #
#  .----..----..----..----..----..----..----..----..----. #  |                               |   #
#  |    ||    ||    ||    ||    ||    ||    ||    ||    | #  |                               |   #
#  '----''----''----''----''----''----''----''----''----' #  |                               |   #
#  .----..----..----..----..----..----..----..----..----. #  |                               |   #
#  |    ||    ||    ||    ||    ||    ||    ||    ||    | #  |                               |   #
#  '----''----''----''----''----''----''----''----''----' #  +-------------------------------+   #
#  .----..----..----..----..----..----..----..----..----. #                                      #
#  |B8  ||    ||    ||    ||    ||    ||    ||    ||    | #                                      #
#  '----''----''----''----''----''----''----''----''----' #  "R6"                                #
#                                                         #                                      #
#                                                         #                                      #
```

| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| B0 | slab | 0 | 0 | 176 | 166 | station slab |
| B1 | text | 8 | 6 | 80 | 10 | the station's name |
| B2 | slots | 30 | 17 | 54 | 54 | the three by three grid |
| B3 | arrow | 91 | 36 | 22 | 15 | progress arrow |
| B4 | bigslot | 122 | 31 | 26 | 26 | the result, in the large slot (icon at 127, 36) |
| B5 | text | 8 | 73 | 40 | 10 | "Pack" |
| B6 | button | 112 | 69 | 56 | 14 | "Sort pack" |
| B7 | slots | 8 | 84 | 162 | 54 | the pack, nine by three |
| B8 | slots | 8 | 142 | 162 | 18 | the hotbar row, four units below the pack |
| R0 | slab | 175 | 0 | 116 | 166 | recipe panel, fastened to the right side and sharing the outline column |
| R1 | text | 183 | 6 | 80 | 10 | "Patterns", since the slab beside it already names the station; through another station's tab, whose patterns they are: "Anvil patterns", "Patterns by hand". The tabs stay on the panel, not on the main slab: they change only what the panel lists |
| R2 | field | 183 | 16 | 98 | 14 | search, as wide as the well; placeholder "Search"; longer text scrolls inside the field |
| R3 | check | 183 | 35 | 12 | 12 | checkbox with the label "Can make" at x 23 |
| R5 | well | 183 | 52 | 98 | 92 | dark well: five by 5 pattern cells of 18, then a scroll track 6 wide |
| R6 | text | 183 | 148 | 100 | 10 | "{lmb} lay out {rmb} make", in faded ink |
| T1 to T5 | tab | 175 + 23 i | -21 or -18 | 24 | 24 or 18 | the five stations in one order on every making screen: By hand, Workbench, Anvil, Line Frame, Joining Bench. The one whose patterns are listed is chosen (24 tall); another whose patterns may be read here is a plain tab (18); one whose patterns cannot be read here is drawn flat, a face of `dk` with no light or dark edge and its icon flat in `sh` with the lock of a locked slot at its bottom right (5.7), and its tooltip says "Its patterns are not read here". A tab never moves: when each screen put itself first, the same station stood in a different place on every screen |

- **Shows.** The grid, what it makes, and the patterns of the station. The Line Frame has the same parts; its slab is timber and its arrow fills in arm blue instead of ember, because the work there is line and crystal.
- **Says why.** While pieces lie on the grid and nothing comes of them, one line stands at 91, 59, under the arrow, as a refusal: `{cross}`, a space and the words in `blood.dk`, the refusal on a light face, cut at 77 wide. It names what a laid pattern lacks, "{cross} Crystal short" ("{cross} 2 Crystal short" for two of one kind, "{cross} 3 pieces short" for several kinds), else "{cross} Nothing joins". Each empty cell the pattern wants keeps the missing thing's silhouette and takes a frame of `blood` one unit deep inside its floor, with no badge, for as long as it stays empty. "One piece short" in `ink.faded` read as a caption and did not say which piece.
- **Clickable.** As the pack. A pattern read through another station's tab cannot be laid here; its cell answers with the refusal frame and the line "Made at the Anvil".
- **Keys.** As the pack.
- **First.** The first Tab press lands on the search field.
- **Narrow.** The recipe panel becomes a side tab on the left edge of the slab and replaces the grid area when chosen.

### Joining Bench

Size 176 by 166. Material: timber. Anchor: centre of the screen.

```
#==========================================================#
#  "J1"                                                    #
#                                                          #
#                                                          #
#                                                          #
#                                            .-------.     #
#        .----.    .----.    .----.          |       |     #
#        |J2  |~~~~|J4  |~~~~|J6  | ==J7=>   | J8    |     #
#        '----'    '----'    '----'          |       |     #
#                                            '-------'     #
#                                                          #
#                                                          #
#                                             +--------+   #
#  "J9"                                       +-J10----+   #
#  .----..----..----..----..----..----..----..----..----.  #
#  |J11 ||    ||    ||    ||    ||    ||    ||    ||    |  #
#  '----''----''----''----''----''----''----''----''----'  #
#  .----..----..----..----..----..----..----..----..----.  #
#  |    ||    ||    ||    ||    ||    ||    ||    ||    |  #
#  '----''----''----''----''----''----''----''----''----'  #
#  .----..----..----..----..----..----..----..----..----.  #
#  |    ||    ||    ||    ||    ||    ||    ||    ||    |  #
#  '----''----''----''----''----''----''----''----''----'  #
#                                                          #
#  .----..----..----..----..----..----..----..----..----.  #
#  |J12 ||    ||    ||    ||    ||    ||    ||    ||    |  #
#  '----''----''----''----''----''----''----''----''----'  #
#                                                          #
#==========================================================#
```

| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| J0 | slab | 0 | 0 | 176 | 166 | timber slab |
| J1 | text | 8 | 6 | 80 | 10 | "Joining Bench" |
| J2 | slots | 26 | 21 | 18 | 18 | first piece, ring silhouette. The chain stands under the title as the Workbench's grid does, on one centre line at y 30: 25 units of bare face between the title and a chain at 35 read as a missing row |
| J3 | rule | 44 | 29 | 12 | 2 | cut line from the first piece to the remains |
| J4 | slots | 56 | 21 | 18 | 18 | the remains built into the bench: a locked slot showing Vanahar Remains, its floor `face` and no lock on it. The remains are the middle of the join, not a thing barred, and the 7 by 7 lock over them read as "cannot be used" |
| J5 | rule | 74 | 29 | 12 | 2 | cut line from the second piece |
| J6 | slots | 86 | 21 | 18 | 18 | second piece, ring silhouette |
| J7 | arrow | 108 | 23 | 22 | 15 | progress arrow |
| J8 | bigslot | 136 | 17 | 26 | 26 | the joined piece |
| J8a | text | 8 | 46 | 160 | 10 | what the bench says, in words: "Ready to join: Spring Boots" in ink while the two pieces make something; "{cross} A second piece short" or "{cross} These two do not join" in `blood.dk`, the refusal on a light face; with nothing laid, "Lay two pieces against the remains" in faded ink. The cut lines are `ember` over `ember.dk` while the pieces make something and a dark groove (`pit` over `hi`) while they do not. "Lit: the two pieces join", a key to the cut lines, did not say whether anything would come of them |
| J9 | text | 8 | 73 | 40 | 10 | "Pack" |
| J10 | button | 112 | 69 | 56 | 14 | "Sort pack" |
| J11 | slots | 8 | 84 | 162 | 54 | the pack, nine by three |
| J12 | slots | 8 | 142 | 162 | 18 | the hotbar row, four units below the pack |

- **Shows.** Two worked pieces laid against the remains, and the one piece they make. The recipe panel of the bench screen fastens to the right here too (not drawn again).
- **Clickable.** Slots. The locked slot answers a click with the refusal frame.
- **Keys.** As the pack.
- **First.** Focus on the first piece.

### The five furnaces

Size 291 by 166. Material: stone. Anchor: centre of the screen.

```
#=========================================================#======================================#
#  "F1"                                                   #  "L1"                                #
#                                                         #                                      #
#  +------------+      .----.                             #  +-------------------------------+   #
#  | F2 bed     |      |F3  |                             #  | L2 well                       |   #
#  |            |      '----'              .-------.      #  |                               |   #
#  |            |       +--+               |       |      #  |                               |   #
#  |            |       |  |    ==F6=>     | F7    |      #  |                               |   #
#  |            |       +--+               |       |      #  |                               |   #
#  +------------+      .----.              '-------'      #  |                               |   #
#                      |F5  |                             #  |                               |   #
#                      '----'                             #  |                               |   #
#                                             +--------+  #  |                               |   #
#  "F8"                                       +-F9-----+  #  |                               |   #
#  .----..----..----..----..----..----..----..----..----. #  |                               |   #
#  |F10 ||    ||    ||    ||    ||    ||    ||    ||    | #  |                               |   #
#  '----''----''----''----''----''----''----''----''----' #  |                               |   #
#  .----..----..----..----..----..----..----..----..----. #  |                               |   #
#  |    ||    ||    ||    ||    ||    ||    ||    ||    | #  |                               |   #
#  '----''----''----''----''----''----''----''----''----' #  |                               |   #
#  .----..----..----..----..----..----..----..----..----. #  |                               |   #
#  |    ||    ||    ||    ||    ||    ||    ||    ||    | #  |                               |   #
#  '----''----''----''----''----''----''----''----''----' #  |                               |   #
#                                                         #  +-------------------------------+   #
#  .----..----..----..----..----..----..----..----..----. #                                      #
#  |F11 ||    ||    ||    ||    ||    ||    ||    ||    | #  "L3"                                #
#  '----''----''----''----''----''----''----''----''----' #                                      #
#                                                         #                                      #
#=========================================================#======================================#
```

| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| F0 | slab | 0 | 0 | 176 | 166 | stone slab |
| F1 | text | 8 | 6 | 120 | 10 | "Stone Furnace", "Maruhar Furnace", "Guhamāt Furnace", "Ratan Furnace" or "Kuranga Furnace" |
| F2 | bed | 10 | 29 | 34 | 34 | the bed, uncaptioned, centred on the column of ore, flame and fuel: a firebox in the furnace's stones. A round arch two units deep (outline root.0; outer row the stones' light tone where it faces up or left and their shaded tone where it faces down or right; inner row their face) springs from two jambs at half height and stands on a sill two units deep; joints of root.0 cut it into voussoirs at 20, 50, 80, 100, 130 and 160 degrees, the keystone between 80 and 100, and the jambs and sill into blocks. Inside, a hearth of root.1 with root.0 in the arch's shadow along its top and left. A locked slot 18 square at 18, 37 holds the remains built in, or, empty, their silhouette (5.4). Round it eight coal bricks 4 square, three on the floor under the slot, two up each jamb and one under the keystone, each lit from the top left (highlight along its top and left, shade along its bottom and right). They show the bed's heat: each passes from cold (stone.sh, highlight stone.face) to ember.lt (highlight ember.hi) to ember.hi (highlight salt) as the heat passes its sixteenths, the floor's middle first and the top last, as fire climbs. The bed's tooltip: "Bed lit, 5 of 8" and "It heats while the fire burns" in `root.4`, or "Bed cold". Eight lamps in a square ring read as a loading ring, not as a fire. A caption "Bed" over it sat a unit under the title and read as a second title; the arch says what it is and the tooltip names it |
| F3 | slots | 70 | 19 | 18 | 18 | what is to be worked, lump silhouette |
| F4 | flame | 71 | 38 | 13 | 15 | burn gauge: the fuel left, emptying downward |
| F5 | slots | 70 | 55 | 18 | 18 | fuel, flame silhouette |
| F6 | arrow | 96 | 38 | 22 | 15 | progress arrow, filling unit by unit |
| F6b | text | 92 | 60 | 70 | 10 | "{cross} Needs fuel" in `blood.dk`, the refusal's tone on a light face, 4 right of the fuel slot and under the arrow, while there is ore to work and room for it but no fire and no fuel; nothing else on the slab says why nothing happens. In `ink.faded` it read as a hint and not as the reason the furnace stands still |
| F7 | bigslot | 128 | 33 | 26 | 26 | what comes out |
| F8 | text | 8 | 73 | 40 | 10 | "Pack" |
| F9 | button | 112 | 3 | 56 | 14 | "Sort pack", on the title row at its right, as the chest's "Sort chest": on the pack row its top stood a unit under F6b |
| F10 | slots | 8 | 84 | 162 | 54 | the pack, nine by three |
| F11 | slots | 8 | 142 | 162 | 18 | the hotbar row, four units below the pack |
| L0 | slab | 175 | 0 | 116 | 166 | side panel, fastened right |
| L1 | text | 183 | 6 | 80 | 10 | "Works" |
| L2 | well | 183 | 18 | 100 | 128 | dark well of list rows 18 tall: icon and name of each thing this bed loosens or this fire sets; seven show, the rest scroll. A row whose ore is in neither the ore slot, the pack nor the hotbar cannot be worked now and is drawn as a row that cannot be used (5.8): its icon flat in root.4, its name in root.4; its tooltip ends with why, in `blood.lt`: "{cross} No Gold Ore in the pack". The work under way, the one whose ore lies in the ore slot, is the chosen row (5.8). A name keeps its grade's colour, as on every list of things. A work that only this furnace's bed can do carries `{bed}` in `root.4` right-aligned 3 from the row's end, and its tooltip adds "Only a bed of Kuranga Remains works it" in `root.4`; the Stone Furnace, whose works every bed can do, shows no mark. The column of ore, flame and fuel starts at y 19 so that a long title ("Kuranga Furnace") stands 5 clear of the ore slot |

The fuel left is not written on the slab: the flame empties as it burns, and its tooltip says "Fuel for 0:52", or "No fire" and "Fuel goes in the slot below" in `root.4`. A bare time in the panel's corner was cut off from what it timed.

- **Shows.** One layout for all five. They differ by the title, by the remains in the bed, and by the list of what the bed works. A furnace goes on working with the window shut.
- **Clickable.** The three slots. A row of the list: hovering shows what it is made from and how long it takes; a click does nothing.
- **Keys.** As the pack. Tab walks: ore, fuel, result, pack, hotbar, "Sort".
- **First.** Focus on the ore slot.

### The pot (to come: nothing in the tables boils remains down yet)

Size 176 by 166. Material: clay. Anchor: centre of the screen.

```
#==========================================================#
#  "P1"                                                    #
#                                                          #
#        .----..----. .----.                               #
#        |P2  ||    | |P3  |                               #
#        '----''----' '----'                               #
#            +--+      "P12"                               #
#            |P4|       ++                .-------.        #
#            +--+       ||     ====\      |       |        #
#           .----.      ||     P11 >      | P7    |        #
#           |P5  |      ++     ====/      |       |        #
#           '----'      P6                '-------'        #
#                                                          #
#  "P8"                                                    #
#  .----..----..----..----..----..----..----..----..----.  #
#  |P9  ||    ||    ||    ||    ||    ||    ||    ||    |  #
#  '----''----''----''----''----''----''----''----''----'  #
#  .----..----..----..----..----..----..----..----..----.  #
#  |    ||    ||    ||    ||    ||    ||    ||    ||    |  #
#  '----''----''----''----''----''----''----''----''----'  #
#  .----..----..----..----..----..----..----..----..----.  #
#  |    ||    ||    ||    ||    ||    ||    ||    ||    |  #
#  '----''----''----''----''----''----''----''----''----'  #
#                                                          #
#  .----..----..----..----..----..----..----..----..----.  #
#  |P10 ||    ||    ||    ||    ||    ||    ||    ||    |  #
#  '----''----''----''----''----''----''----''----''----'  #
#                                                          #
#==========================================================#
```
| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| P0 | slab | 0 | 0 | 176 | 166 | clay slab |
| P1 | text | 8 | 6 | 60 | 10 | "Pot" |
| P2 | slots | 26 | 17 | 36 | 18 | remains to boil down, two slots |
| P3 | slots | 66 | 17 | 18 | 18 | salt, 4 clear of the remains and joined to nothing: salt is optional, and a cut line between them read as a joining bench. Empty, it shows a lidded crock (the lid a row clear of the pot) in `dk`; a heap read as a flat triangle |
| P12 | text | 66 | 36 | | 10 | "Salt" in ink.faded under its slot |
| P4 | flame | 38 | 36 | 13 | 15 | burn gauge |
| P5 | slots | 35 | 53 | 18 | 18 | fuel |
| P6 | gauge | 70 | 47 | 9 | 31 | the water in the pot, under the salt: an upright channel 6 by 20 at 72, 47 (a 1-unit sunken frame round a fill 4 wide) filled in `arm`, which boils down through the night, and 2 under it a drop 9 by 9 in arm blue at 70, 69, so that the gauge is never read as heat. Its tooltip, on the channel and the drop, is "Water" then "It boils down through the night" in grey |
| P11 | arrow | 86 | 46 | 22 | 15 | the progress arrow (5.13): the night gone, filling from the left; nothing comes out before first light |
| P7 | bigslot | 112 | 40 | 26 | 26 | lees, as coin. The working stands in the left 140 units as the furnace's does: with the lees at 128 the arrow ran a long empty track and the remains and what they give sat far apart |
| P13 | text | 138 | 68 | | 10 | while nothing boils, why, right-aligned to the slot's right edge in ink.faded: "No remains" or "No fire". The water channel and the salt slot say what they are in their tooltips |
| P8 | text | 8 | 73 | 40 | 10 | "Pack" |
| P9 | slots | 8 | 84 | 162 | 54 | the pack, nine by three |
| P10 | slots | 8 | 142 | 162 | 18 | the hotbar row, four units below the pack |

- **Shows.** Designed now so that the slab family has room for it: remains, salt and fuel in, a night passing, lees out.
- **Clickable.** Slots.
- **Keys.** As the pack.
- **First.** Focus on the first remains slot.

### Shop

Size 176 by 227, with two tabs standing 21 out of its left edge. Material: clay. Anchor: centre of the screen, the tabs left out of the centring.

```
+------+==========================================================#
|T1    |#  "H1"                                            "H2"    #
+------+#  +---------------------------------------------------+   #
|T2    |#  | H4 well, six rows                                 |   #
+------+#  |                                                   |   #
        #  |                                                   |   #
        #  |                                                   |   #
        #  |                                                   |   #
        #  |                                                   |   #
        #  |                                                   |   #
        #  |                                                   |   #
        #  |                                                   |   #
        #  |                                                   |   #
        #  |                                                   |   #
        #  |                                                   |   #
        #  |                                                   |   #
        #  |                                                   |   #
        #  |                                                   |   #
        #  |                                                   |   #
        #  |                                                   |   #
        #  |                                                   |   #
        #  +---------------------------------------------------+   #
        #                                             +--------+   #
        #  "H5"                                       +-H6-----+   #
        #                                                          #
        #  .----..----..----..----..----..----..----..----..----.  #
        #  |H7  ||    ||    ||    ||    ||    ||    ||    ||    |  #
        #  '----''----''----''----''----''----''----''----''----'  #
        #  .----..----..----..----..----..----..----..----..----.  #
        #  |    ||    ||    ||    ||    ||    ||    ||    ||    |  #
        #  '----''----''----''----''----''----''----''----''----'  #
        #  .----..----..----..----..----..----..----..----..----.  #
        #  |    ||    ||    ||    ||    ||    ||    ||    ||    |  #
        #  '----''----''----''----''----''----''----''----''----'  #
        #  .----..----..----..----..----..----..----..----..----.  #
        #  |H8  ||    ||    ||    ||    ||    ||    ||    ||    |  #
        #  '----''----''----''----''----''----''----''----''----'  #
        #                                                          #
        #==========================================================#

| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| H0 | slab | 0 | 0 | 176 | 227 | clay slab |
| T1 | tab | -21 | 0 | 24 | 24 | "Buy": a fired jar of lees, the coin mark (`coin` among the tab marks); chosen when the shop opens. An item on a tab said nothing of what the tab switched between |
| T2 | tab | -18 | 23 | 24 | 24 | "Sell": the pack mark |
| H1 | text | 8 | 6 | 96 | 10 | the keeper's name and the chosen tab's name: "Kammār, buy", "Kammār, sell"; its tooltip gives what they say, in root.4 |
| H2 | text | 104 | 6 | 64 | 10 | the one coin this keeper takes, right-aligned to x 168: "12 {lees}", or "38 {muda}" when the Deserter deals; its tooltip names the coin ("Mūda", then "The one coin the Deserter takes" in root.4), so that the purse and every price carry the mark alone and the word is not needed beside it. Two purses side by side, one a mark and one a word, left the buyer to guess which the shop took |
| H4 | well | 8 | 18 | 160 | 92 | dark well of five list rows 18 tall, scroll track at its right: icon, name in the colour of its grade, then how many one press brings in root.4 when more than one ("Barbed Arrow ×8", the price being for the lot), price right-aligned with the same mark as H2. Under Sell each row is a thing sold this visit at what was paid for it, its price led by `{back}`; with nothing sold the well says "Nothing sold yet. Shift {lmb} a thing in the pack to sell it." in root.4. A grey heading row among the goods read as a thing that could not be bought |
| H3 | text | 8 | 113 | 160 | 10 | what a press does, in ink.faded with the mouse marks: under Buy "{lmb} buy one   Shift {lmb} buy ten", under Sell "Shift {lmb} in the pack sells". With no line and no button, pressing a row was an affordance nothing told of |
| H5 | text | 8 | 132 | 40 | 10 | "Pack" |
| H6 | button | 112 | 128 | 56 | 14 | "Sort pack" |
| H7 | slots | 8 | 143 | 162 | 54 | the pack, nine by three |
| H8 | slots | 8 | 201 | 162 | 18 | the hotbar row, four units below the pack |

- **Shows.** What one householder sells, under Buy; what was sold to them this visit, to buy back, under Sell; and the pack to sell from. A price the buyer cannot meet has its figure in blood.lt and its coin mark greyed in `root.4`, with no `{cross}` before it: beside "×8" a cross before "14" read as "times 14", or as a close glyph. Every price is right-aligned 6 units from the scroll track (from the well's inner edge when no track stands). Its icon and its name in the colour of its grade stay as they are, so that the grade and the price are read apart. A silhouette means only a thing not yet seen (the codex), never one that cannot be bought.
- **Clickable.** A row buys one; shift and click buys ten. Shift and click on a pack slot sells the stack; a thing of grade Island or higher, a bait or a Recall Stone asks for the same click again within two and a half seconds (the slot takes the refusal frame and the tooltip says "Again to sell").
- **Keys.** Tab walks: the two tabs, rows, pack, hotbar, "Sort". Up and Down move along the rows and scroll the well. Enter buys.
- **First.** Focus on the first row.

### Journal: the Guide, bounties and standing

Size 298 by 186, with tabs standing 21 above. Material: book (5.19): a leather cover, clay.lt pages. Anchor: centre of the screen. Coordinates are from the book's top left.

```
+-------+
| G1    |+------++------++------+
#================================================================================================#
#                                                                                                #
#   "G2"                                           "G7"                                          #
#                                                                                                #
#   +----------------------------------------+     "G8"                                          #
#   | G4 rows                                |                                                   #
#   |                                        |                                                   #
#   |                                        |                                                   #
#   |                                        |                                                   #
#   |                                        |                                                   #
#   |                                        |                                                   #
#   |                                        |                                                   #
#   |                                        |                                                   #
#   |                                        |                                                   #
#   |                                        |                                                   #
#   |                                        |     [G9                                      ]    #
#   |                                        |                                                   #
#   |                                        |                                                   #
#   |                                        |     "G10"                                         #
#   |                                        |                                                   #
#   |                                        |     "G11"                                         #
#   |                                        |                                                   #
#   |                                        |                                                   #
#   |                                        |                                                   #
#   |                                        |                                                   #
#   +----------------------------------------+                                                   #
#                                                                                                #
#   [G5 ]                                                                               [G12]    #
#                      "G6"                                           "G13"                      #
#                                                                                                #
#================================================================================================#
```

| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| G0 | book | 0 | 0 | 298 | 186 | the book |
| G1 | tabs | 0 | -21 | 93 | 21 | tabs of the cover's leather (5.19), pitch 23, each with its mark: Guide (the lamp), Bounties (the note), Standing (the banner), Crew (two heads). The tabs are the bookmarks; the book has no ribbons |
| G2 | text | 15 | 13 | 126 | 10 | left page heading: the chapter, as "Iron and Root" |
| G3 | rule | 15 | 24 | 126 | 1 | rule in clay.sh |
| G4 | rows | 15 | 27 | 126 | 130 | step rows 10 tall to the line, a mark column 8 wide and the title at 10: done, a `{check}` in `growth.dk` at 0 and the title in faded ink; the present step, the `{step}` wedge at 2 and ink; the next step, a hollow box 5 by 5 at 1 on the baseline and ink; later ones, a lock 5 by 5 at 1 and faded ink. Told by grey alone, a locked step and an open one differed only a little in tone. A title too long for one line wraps onto a second at 10, and the row is 20 tall; cut with `…`, "Carve a Vanahar Liken…" lost its last word on a page with room to spare. The chosen row is told by a band of `clay.face` behind it, not by the tone of its words, so that choosing a later step does not make it read as next |
| G5 | turn | 15 | 164 | 16 | 7 | page back |
| G6 | text | 71 | 163 | 16 | 10 | page number, text face |
| G7 | text | 157 | 13 | 126 | 10 | right page heading: the chosen step |
| G8 | text | 157 | 27 | 126 | 60 | its telling, wrapped to 126, six lines at most |
| G9 | gauge | 157 | 91 | 126 | 7 | a sunk channel in as many segments as the step counts (5.14), filling a segment at a time in ember, with "3 of 5" right-aligned above it; only for steps that count |
| G10 | text | 157 | 107 | 126 | 20 | where to: the compass mark (9 by 9, ink) at 0, 0 and the words in ink at 12, saying the thing, then how far and which way: "Vanahar Altar: 212 m east", "Iron ore: 38 m down". A line that ends in up or down has the `{up}` or `{down}` arrow of the text face in place of the compass mark, 2 in, since the compass cannot point straight up or down. Every screen writes a distance as a count and "m", as the HUD and the roster do; "strides" is a word of the tables, not of a readout. It is the line the crew acts on, so it wraps onto a second line rather than being cut, and is cut with `…` only after that |
| G11 | text | 157 | 121 | 126 | 30 | what the step gives: practice, and what it opens, in faded ink; three lines at most, or two starting 4 under a where-to of two lines |
| G12 | turn | 267 | 164 | 16 | 7 | page on |
| G13 | text | 213 | 163 | 16 | 10 | page number |

- **Shows.** One book shared by the crew. Guide: the order of work, a chapter to a left page, the chosen step on the right. Bounties (to come): the left page lists what householders and the Marujan ask, in rows 20 tall: the thing asked for in a slot at the left; the task on the first line in ink; on the second, in faded ink, how it stands: "open", "done", why the crew cannot take it ("needs standing"), or who took it, in words: "taken by", then "you" when one took it oneself or else the first taker's handle (cut with `…` to the row), then how many more, "taken by Mira_K +2", "taken by you +1". A row of 8 by 8 faces with no names did not say who held a bounty in a crew of eight; the faces stand with their names on the bounty's page. No row is told apart by a greyed whole or by colour alone. The right page gives the task, who asks, the telling (as many lines as fit above what follows), the pay, and for a bounty that asks for things how many the pack holds, "You carry 12 of 20" in ink (in `growth.dk` once it is all there) and under it, on a row of its own, a channel 80 long whose rim stands 2 under the words' descenders, cut in segments when the count is 12 or less (squeezed beside the words, 28 long, it touched them); then who took it ("Taken by" in faded ink, and on its row and the next, 11 apart, the takers' heads of 10 by 10 in their seats' frames with the names in ink 13 to their right, ", you" after one's own; a third and more counted in a line, "and 2 more"), and one button, "Take" or "Leave", 60 by 14 at 157, 147, which keeps its place whatever the telling's length, its foot on the last row a page's text may reach, clear of the page number. Every section carries page numbers at its foot as the Guide does, the book being one book: the Guide's chapters are its first leaves, then a spread each for bounties, standing and the crew. Standing (to come): a page to each people, a sunk channel of five segments, one filled for each notch the crew stands at, with the way toward the next as a line of ember under it, under it what raises it, what lowers it, and what the next notch opens. Crew: the roster as the left page, "Level" in faded ink right-aligned on the "Crew" heading's row over the column of levels, and a row 12 tall to each: one's own row marked by the `{step}` wedge at 1, the head (10 by 10 in its seat's frame) at 6, 1, the name at 19, and at the right their level, one's own included (written "you" in its place, one's level was the one missing from the list), or, for one who is away, "away" in faded ink with the name faded and their own face in the greys of the root (lit tones `root.4`, mid `root.3`, shade `root.2`, eyes and mouth `root.1`) in a frame of `clay.dk` in place of their seat's colour, so that being away is never told by colour alone and the row still shows whom; a head flat in one tone was a blank square; the right page gives the chosen one's head (10 by 10, the face of 8 by 8 in its seat's frame) at 0, 14 with their level and job, where they are, and how far, on up to three lines beside it at 14 (one's own page has no third line: a "You" there said again what the heading says); under "Worn" at 48, five slots in a row at 0, 58 for head, body, legs and two trinkets, silhouettes where nothing is worn; under "Bounties taken" at 82, up to three rows 20 apart from 92, each a slot with the thing asked for and two lines, the task in ink and "for" the asker in faded ink.
- **Clickable.** A step row or a bounty row chooses it. The tabs. The page arrows. "Take".
- **Keys.** G or Esc closes. Left and Right turn the page. Up and Down move the choice. 1 to 4 pick a tab. Enter presses the page's one button.
- **First.** Opens at the Guide, at the page of the present step, with that step chosen.
- **Narrow.** Unchanged: 298 fits 320.

### Codex and bestiary (to come)

Size 298 by 186, with tabs standing 21 above. Material: book (5.19). Anchor: centre of the screen. Coordinates are from the book's top left.

```
+-------+
| X1    |+------++------++------++------+
#================================================================================================#
#                                                                                                #
#   "X2"                                           "X5"                                          #
#                                                                                                #
#   .----..----..----..----..----..----..----.     "X6"                                          #
#   |X3  ||    ||    ||    ||    ||    ||    |                                                   #
#   '----''----''----''----''----''----''----'     +-------+ "X8"                                #
#   .----..----..----..----..----..----..----.     |X7     |                                     #
#   |    ||    ||    ||    ||    ||    ||    |     |       |                                     #
#   '----''----''----''----''----''----''----'     +-------+                                     #
#   .----..----..----..----..----..----..----.                                                   #
#   |    ||    ||    ||    ||    ||    ||    |     "X9"                                          #
#   '----''----''----''----''----''----''----'                                                   #
#   .----..----..----..----..----..----..----.                                                   #
#   |    ||    ||    ||    ||    ||    ||    |                                                   #
#   '----''----''----''----''----''----''----'                                                   #
#                                                                                                #
#   "blurb, two lines"                                                                           #
#                                                                                                #
#                                                                                                #
#                                                                                                #
#                                                                                                #
#                                                                                                #
#                                                                                                #
#                                                                                                #
#                                                                                                #
#                                                                                                #
#   [X4 ]                                                                               [X10]    #
#                                                                                                #
#                                                                                                #
#================================================================================================#
```

| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| X0 | book | 0 | 0 | 298 | 186 | the book |
| X1 | tabs | 0 | -21 | 116 | 21 | tabs of the cover's leather (5.19), pitch 23, each with its mark: Creatures (a beast's head), Matter (a bar), Places (the map), Peoples (a bust), Old things (the ward core: a dressed stone disc with a blue gem sunk in it, a thing from the section and not a shape). The tabs are the bookmarks; the book has no ribbons (5.19) |
| X2 | text | 15 | 13 | 126 | 10 | heading of the section, and right-aligned to the page's edge in faded ink how many of its entries are known ("1 of 8") where it stands 6 clear of the heading |
| X3 | slots | 15 | 27 | 126 | 126 | entry slots sunk in the page (ramp clay, floor clay.sh), seven to a row, and exactly as many slots as the spread has entries: an empty slot promised more to find than there is. The chosen slot carries a frame of ember 2 deep that stands a unit out of the slot, over its neighbours' edges. Under the last row, 4 below, two lines in ink say what the spread holds ("What lives up here, filled in as met."). A kind not yet seen shows its silhouette: the flat mask of its own 16 by 16 picture in clay.dk on the clay.sh floor (the floor clay.face under the pointer, as under a known picture), a hollow and not a pale ghost, as 5.4 draws any missing thing; in clay.face the masks stood near the page's own tone and told a known kind from an unknown one by little more than the outline: the picture's body without its root.0 outline (outline units clear of the body on all eight sides, an antenna or a string, stay), with only holes of one unit drawn round on all four sides closed, so legs, ears, tails, wings and the notch at the neck keep their units; no picture's mask may be a convex blob; a kind seen shows its icon. A short chapter, eight entries or fewer (the eight, the old things), is a list of two columns 63 apart, rows 20 apart: each row the entry's slot and beside it, at 21, 4, its name in ink cut to the column, or "?" in faded ink where it is not yet met; under the last row, 6 below, the two lines. Eight slots in rows of four left half the page bare parchment under a cramped block, and a picture twice the size would draw an icon at another size than 16 |
| X4 | turn | 15 | 164 | 16 | 7 | page back; on a section's first spread it turns to the last spread of the section before, so that only page 1 has none |
| X5 | text | 157 | 13 | 126 | 10 | the name, in ink |
| X6 | text | 157 | 23 | 126 | 20 | whose word the name is and what it means, said as a sentence in faded ink ("The Householders' word for darkness"), wrapped onto a second line when it needs one; left out where the name is the plain word, and what follows moves up |
| X7 | well | 157 | 35 | 24 | 24 | picture well sunk in the parchment: clay.dk along its top and left, salt along its bottom and right, a floor of clay.face, the 16 by 16 picture at 4, 4; a kind not yet seen stands there as the flat mask of its picture in clay.sh. A dark well on the page clashed with the parchment |
| X8 | rows | 185 | 35 | 98 | 30 | the facts, one line each, three at most: a label in faded ink and its value in ink ("Found: anywhere", "When: at night", "Drops: Shade Flesh"; for matter "Grade" in the grade's colour and "Burns"). A bare value in blue read as a link that led nowhere. When what a creature drops is a thing of the world and the steps still fit whole under it, it is shown and not said: "Drops" in faded ink 4 under the well, and 11 under that the thing in a slot of the page's clay with its name for a tooltip; the facts then lose their "Drops" line and the steps start 4 under the slot. In words only, the lower half of a page with few steps stood bare |
| X9 | text | 157 | 69 | 126 | 92 | 4 under the taller of the well and the facts, for matter first "Used in" and "Made from" in faded ink, each over a grid of slots in the clay of the page with what it goes into and what it is made of, 18 to the cell with no gap, seven to a line and wrapping, two lines at most, the last cell then saying how many more in the small face in ink ("+3") and naming them in its tooltip; the next title stands 4 under the grid ("Made from: nothing yet" with no grid when nothing makes it). One row of seven filled the page and had nowhere to put an eighth; then: the four steps of what is known (first sight, first kill, many kills, a thing seen once): each a paragraph when known, to the page's foot at y 161, and when any is not, one line in faded ink 4 under the last paragraph, "Three more to learn". A rule for each step not known was a line that held nothing: empty lines on a form. A kind not yet met has no steps and no rules: under the well, 4 down, one line in faded ink from the world once someone in the crew has seen it ("Found: under island rims"), so that the page says where to look; else the parchment is bare |
| X10 | turn | 267 | 164 | 16 | 7 | page on; on a section's last spread it turns to the first spread of the next |

- **Shows.** What the crew has met, shared by everyone on the server. Each entry fills in by the four steps of chapter 8.9 of the world bible; a step not reached is counted in one faded line, never drawn as a blank rule or a row of question marks.
- **Clickable.** Entry slots, tabs, page arrows.
- **Keys.** Arrows move among the entry slots, Page Up and Page Down turn the page, 1 to 5 pick a tab, Esc closes.
- **First.** Opens where it was last shut; the first time, at Creatures with the first seen entry chosen.

### Skill tree (to come)

Size 320 by 212 on a wide screen and 260 by 212 on a narrow one, with tabs standing 21 above and 21 to the left. Material: stone. Anchor: centre of the screen. Wide, the field holds a job's seven columns whole and pans only up and down; at 260 half the tree was always out of view.

```
       +------+
       |T1    |+------+------++------++------+
       |      ||T2    |T3    ||T4    ||T5    |
       +------++------+------++------++------+
       #======================================================================================#
       #  "K1"                                                  "K2"                          #
+------+                                                                                      #
|U1    |  +-------------------------------------------------------------------------------+   #
|      |  | K3 well                                                                       |   #
+------+  |                                                                               |   #
 +----+#  |                                                                               |   #
 |U2  |#  |                                                                               |   #
 |    |#  |                                                                               |   #
 +----+#  |                                                                               |   #
 +----+#  |                                                                               |   #
 |U3  |#  |                                                                               |   #
 |    |#  |                                                                               |   #
 +----+#  |                                                                               |   #
       #  |                                                                               |   #
       #  |                                                                               |   #
       #  |                                                                               |   #
       #  |                                                                               |   #
       #  |                                                                               |   #
       #  |                                                                               |   #
       #  |                                                                               |   #
       #  |                                                                               |   #
       #  |                                                                               |   #
       #  |                                                                               |   #
       #  |                                                                               |   #
       #  |                                                                               |   #
       #  |                                                                               |   #
       #  |                                                                               |   #
       #  |                                                                               |   #
       #  +-------------------------------------------------------------------------------+   #
       #                                                                    +-------------+   #
       #  "K4"                                                              | K5 button   |   #
       #                                                                    +-------------+   #
       #                                                                                      #
       #======================================================================================#
```

| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| K0 | slab | 0 | 0 | W | 212 | stone slab, W 320 wide or 260 narrow |
| T1 | tab | 0 | -21 | 24 | 24 | top tabs, one to a job, item icon on each: Melee, Ranged, Crystal-work, Totem, and the cutter's trade |
| U1 | tab | -21 | 14 | 24 | 24 | side tabs, one to each of the eight of the crew, away or not, at the pitch of 23, a head in their colour; the tooltip is the name and level ("Rook (you), level 14", "Jun, level 3, away"): one's own first and chosen; another's tree is read, not changed |
| K1 | text | 8 | 6 | W - 166 | 10 | the job: "Melee" |
| K2 | text | W - 158 | 6 | 150 | 10 | right-aligned to x W - 8: "3 to spend" in growth.dk on one's own tree; on another's, their name cut at 90 and "(read only)", "brackenfoot_1999 (read only)", in ink.faded, so that a long name never runs into the title |
| K3 | well | 8 | 17 | W - 16 | 156 | the field (5.20): boards, panned by dragging and at rest on whole lattice steps; nodes 26 square on a lattice of 40 across and 30 down, so that the five rows stand whole; links between them |
| K4 | text | 8 | 175 | W - 16 | 32 | the node under the pointer, or the chosen node when the pointer is on none, on three lines 11 apart: its name in ink with its kind and rank "Own skill, 3 of 3" right-aligned to x W - 8 in faded ink (the kinds are Step, Own skill and End mark, after the square, cut and spiked frames, so the shapes are learnt as they are read; a legend of shapes in the field had no room clear of the nodes); what a rank does, in ink, cut 48 short of the right edge where Take stands; then the third line, which says first why Take is not there: on a node with every rank taken "Full" in growth.dk; on a locked node "{cross} Needs Deep breath" in blood.dk; with no point to spend "{cross} No points to spend" in blood.dk; otherwise what it needs ("Needs: Deep breath", or "Needs nothing: a first step") in faded ink. A full node that still said what it needed, over a disabled Take, read as locked. A name and a rank alone left the player nothing to choose by. Where no Take stands the lines run the full width |
| K5 | button | W - 52 | 192 | 44 | 16 | "Take", drawn only when it can be pressed: on one's own tree, on a node that is open and not full, with a point to spend. It is never drawn disabled; the third line of K4 says why it is not there |

- **Shows.** One field to a job. Square frames are steps anyone may take, cut frames are the job's own skills, spiked frames are the three marks a job ends in. Locked is dull, open is stone, earned is clay and salt. The party shows in the side tabs, so that a crew can see who took what.
- **Clickable.** A node chooses it; "Take" or a second click on the chosen node spends a point. Dragging the field pans it. Tabs.
- **Keys.** Arrows move to the nearest node that way. Enter takes. Q and E step through the jobs. Esc closes.
- **First.** The field is centred on the last node earned in that job, and that node is chosen.

### World map (to come)

Size 312 by 212, with tabs standing 21 above. Material: stone. Anchor: centre of the screen.

```
+------+
|T1    |+------+------+
|      ||T2    |T3    |
+------++------+------+
#=======================================================================================================#
#  "W1"                                                                                                 #
#                                                                                                       #
#  +---------------------------------------------------------------------+ +------------------------+   #
#  | W2 well                                                             | | W6 well                |   #
#  |                                                                     | |                        |   #
#  |                                                                     | |                        |   #
#  |                                                                     | |                        |   #
#  |                                                                     | |                        |   #
#  |                                                                     | |                        |   #
#  |                                                                     | |                        |   #
#  |                                                                     | |                        |   #
#  |                                                                     | |                        |   #
#  |                                                                     | |                        |   #
#  |                                                                     | |                        |   #
#  |                                                                     | |                        |   #
#  |                                                                     | |                        |   #
#  |                                                                     | |                        |   #
#  |                                                                     | |                        |   #
#  |                                                                     | |                        |   #
#  |                                                                     | |                        |   #
#  |                                                                     | |                        |   #
#  |                                                                     | |                        |   #
#  |                                                                     | +------------------------+   #
#  |                                                                     |                              #
#  |                                                                     | +------------------------+   #
#  |                                                                     | | W7 button              |   #
#  |                                                                     | +------------------------+   #
#  |                                                                     |                              #
#  |                                                                     | "W8"                         #
#  +---------------------------------------------------------------------+                              #
#                                                                                                       #
#  "W3"                                                        +---+ +---+                              #
#                                                              +-W-+ +-W-+                              #
#                                                                                                       #
#=======================================================================================================#
```

| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| W0 | slab | 0 | 0 | 312 | 212 | stone slab |
| T1 | tab | 0 | -21 | 24 | 24 | top tabs: The Living Ground, The Hollow, The Islands, then one for each sealed store the crew is inside |
| W1 | text | 8 | 6 | 120 | 10 | the place's name |
| W2 | well | 8 | 18 | 170 | 170 | the chart, 168 by 168, drawn as a map is drawn, not as contours, at one scale: cells of 2 by 2 units, a cell to 16, 8 (the first zoom) or 4 strides, each cell one of eight kinds in a fixed palette of face, lit and edge: water `arm.dk`, its shallows `arm`; sand `timber.hi`, `salt`, `timber.face`; grass `growth`, `growth.lt`, `growth.dk`; forest `growth.dk`, `growth`, `root.1`; roofs of a settlement `timber.sh`, `timber.face`, `timber.pit`; stone `stone.face`, `stone.lt`, `stone.sh`; snow `salt`, `salt`, `stone.lt`; ground not yet walked parchment, `clay.face`. The kinds stand in that order of height. A cell takes one unit of its kind's lit tone along each side whose neighbour above or to the left stands lower, and one unit of its edge tone along each side whose neighbour below or to the right stands lower, so that every rise reads lit from the top left with a shade line only on its south and east; whole cells of the edge tone made a band two deep round every rise; water beside land is the shallows, a band one cell (2 units) wide, whose unit that touches the land is a line of surf in `clay.lt`. Each kind's plain face carries marks of one unit on a grid fixed to the world, every other row moved half a pitch along, so that a fill reads as ground and not as a flat colour, and the marks move with the ground as it pans: grass at a pitch of 8 by 6 in `growth.dk`, each point by a fixed hash of it either bare (a third of them) or one of three tufts, a v 3 by 2, a hook 2 by 2 or a blade 1 by 2, moved 0 to 3 units right and 0 to 3 down from the point (one v on the exact lattice read as a machine's fill); sand a grain of `clay.sh` at 6 by 6; forest a crown 5 by 4 of `growth` with its top left lit in `growth.lt` and its foot and right side in `root.1`, at 7 by 7; water a ripple of `arm.lt` 3 by 1 at 8 by 6. A mark is drawn only where the whole of it lies on its kind's plain face, never over a shore, an edge or another kind. Where parchment meets the known, a rule of one unit of `root.0` runs along the parchment's side. No other line on the chart is one unit wide but the surf. Countries are named under the pointer (W3), not coloured each their own. Marks are 7 by 7 and lit from the top left. On it: one's own arrow, friends' heads in their colours, pings, the bed, the fall mark, known altars and gates. A friend's head under the pointer carries their name tag (5.25) over it, drawn above the chart and the list |
| W3 | text | 8 | 194 | 132 | 10 | what is under the pointer, in ink, and "Point at the chart" in faded ink while nothing is: on the living ground "X -104  Z 2210", then the country's name; in a sealed store the room's name ("Key room"), "A locked door: it wants a key", the friend inside, or "Not entered yet". It never repeats the slab's title |
| W4 | button | 144 | 191 | 16 | 16 | "-", its tooltip "Farther", or "Farthest" while it stands grey at the farthest zoom |
| W5 | button | 162 | 191 | 16 | 16 | "+", ending on the chart well's right edge; its tooltip "Closer", or "Closest" while it stands grey at the closest zoom |
| W6 | well | 184 | 18 | 120 | 130 | known places as list rows 16 tall, so that eight show, the scroll track of 5.8 inside the well's right edge whenever rows overflow. On the living ground two groups, each under a header row in `root.4` at 3 that cannot be chosen: "Places" (the bed, the mouth, each gate raised, each altar found) and "Crew" (every player here, oneself first, one inside a store at its mouth; one who is away has no place and is not listed). In a sealed store what is on its chart comes first (who is inside, a locked door, the stair up), then a header row "Elsewhere", then the rest. Up and Down step over headers. A place on another chart is chosen for its line under Travel and the chart stays put; that line gives how far and which way only for the living ground. The icon at 1, 0, the name's cell at 20, 3 |
| W7 | button | 184 | 152 | 120 | 16 | "Travel"; disabled unless the chosen place can be reached; while the way is cooling the disabled button says why and how long, once, in salt on its flat face: "Recall Stone cooling, 0:12", or "Cooling, 0:12" where that is wider than the button's words may run. "Travel in 0:12" on the button and "Recall Stone cooling" in faded ink under it said the wait twice, the second time grey on grey |
| W8 | text | 184 | 172 | 120 | 30 | where Travel would take one, in ink: the crossing and the place, "Recall Stone to Bed", or why there is none, "No crossing to an altar", wrapped to two lines at most; then on a line of its own how far and which way, "13 m north-east", so that a wrap never parts a count from its "m". A place in the store, and oneself, have no such line |

- **Shows.** A chart drawn in the palette, never a photograph of the terrain. Travel between known places goes by what the world allows: the Recall Stone to the bed, a gate to its far mouth. A sealed store has a tab of its own while someone is inside: its rooms are drawn as they are entered, as a plan, on flat `root.1` for ground not entered. On the ground tile the chart could not be told from the menus that stand on the same tile. Each room is a hollow, sunk as a slot is: a floor of flagstones, `stone.sh` with seams of `stone.pit` one unit wide, 8 units to the stone (4 at the farther zooms), every other course moved half a stone along, fixed to the store; walls 2 units deep (1 at the farther zooms) in `stone.dk` where the floor lies below or right of them and `stone.lt` where it lies above or left, and a `root.0` outline. Lit on their upper left and floored in a pale grout grid, the rooms stood up off the field like disabled buttons. A passage between two rooms is 3 wide with the same walls, and a doorway is only where a passage's floor meets a room's, a 3-unit gap in its wall. A locked door opens on ground not yet entered: a leaf of `ember` 3 by 3 set in the wall, lit on its top and left in `ember.lt` and shaded in `ember.dk`, the key silhouette in `salt` beside it. The stair up is a block 9 by 9 of treads, `stone.hi` over `stone.sh`, in a `root.0` frame. Flat rectangles joined by stubs read as a wireframe diagram on a field drawn in more detail than they were.
- **Clickable.** Dragging pans the chart; the wheel and the two buttons zoom in three whole steps (8, 4 and 2 strides to the unit). A click on a place in the list centres on it. A right click on the chart sets a ping there. "Travel".
- **Keys.** M or Esc closes. Arrows pan by 16 units. + and - zoom. Tab moves between the list and "Travel". 1 to 3 pick a place tab.
- **First.** Centred on the player, at the middle zoom, with the bed chosen in the list.
- **Narrow.** Unchanged: 312 fits 320.

### Reworking bench (to come)

Size 176 by 166. Material: stone. Anchor: centre of the screen.

```
#==========================================================#
#  "Q1"                                         .-------.  #
#      .----.  .----.  .----.                   |       |  #
#      |Q4  |==|Q2  |==|Q5  |     ==Q8=>        | Q9    |  #
#      '----'  '----'  '----'                   |       |  #
#               +--+                            '-------'  #
#               |Q6|                            +---------+#
#               +--+                            +-Q10-----+#
#              .----.                                      #
#              |Q7  |                                      #
#              '----'                                      #
#                                                          #
#  "Q11"                                                   #
#  .----..----..----..----..----..----..----..----..----.  #
#  |Q12 ||    ||    ||    ||    ||    ||    ||    ||    |  #
#  '----''----''----''----''----''----''----''----''----'  #
#  .----..----..----..----..----..----..----..----..----.  #
#  |    ||    ||    ||    ||    ||    ||    ||    ||    |  #
#  '----''----''----''----''----''----''----''----''----'  #
#  .----..----..----..----..----..----..----..----..----.  #
#  |    ||    ||    ||    ||    ||    ||    ||    ||    |  #
#  '----''----''----''----''----''----''----''----''----'  #
#                                                          #
#  .----..----..----..----..----..----..----..----..----.  #
#  |Q13 ||    ||    ||    ||    ||    ||    ||    ||    |  #
#  '----''----''----''----''----''----''----''----''----'  #
#                                                          #
#==========================================================#
```

| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Q0 | slab | 0 | 0 | 176 | 166 | stone slab |
| Q1 | text | 8 | 6 | 100 | 10 | the bench's name |
| Q4 | slots | 21 | 17 | 18 | 18 | the piece to rework, blade silhouette |
| Q3 | rule | 39 | 25 | 8 | 2 | cut line, the full span between the slots |
| Q2 | slots | 47 | 17 | 18 | 18 | the remains built in, locked |
| Q14 | rule | 65 | 25 | 8 | 2 | cut line |
| Q5 | slots | 73 | 17 | 18 | 18 | a bar of the same metal, bar silhouette |
| Q6 | flame | 24 | 36 | 13 | 15 | burn gauge, under the piece |
| Q7 | slots | 21 | 53 | 18 | 18 | fuel |
| Q8 | arrow | 97 | 19 | 22 | 15 | progress arrow, on the row it reads from |
| Q9 | bigslot | 128 | 13 | 26 | 26 | the piece as it comes out |
| Q10 | button | 128 | 43 | 40 | 14 | "Work it", 4 under the result and left-aligned with it, its right edge on the title margin at 168; disabled until piece, bar and fuel are in. Wider and right-aligned with the result, its left edge stood under nothing |
| Q15 | text | 47 | 59 | | 20 | what a working takes and gives, under the remains, so that it is weighed before "Work it" is pressed: "Costs 1 Iron Bar, 1 Coal" (the bar the piece's metal asks for, the fuel laid in) in ink, and 10 under it "Rolls a new modifier" in ink.faded |
| Q11 | text | 8 | 73 | 40 | 10 | "Pack" |
| Q12 | slots | 8 | 84 | 162 | 54 | the pack, nine by three |
| Q13 | slots | 8 | 142 | 162 | 18 | the hotbar row, four units below the pack |

- **Shows.** A made piece put at hazard for a better setting. While all three are in, the result slot shows the piece as a silhouette and its tooltip names the piece with its present modifier in its grade's colour ("Dull Iron Sword"), then "Now Dull: a new modifier is drawn", then that it may come out worse. Named old things answer with the refusal frame.
- **Clickable.** Slots and "Work it".
- **Keys.** As the pack; Enter on "Work it".
- **First.** Focus on the piece slot.

### Title

Size 427 by 240. Material: ground tile over the whole screen. Anchor: the whole screen.

```
+==============================================================================================================================================+
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                       +-------------------------------------------------------------+                                        "
"                                       | A1 logo                                                     |                                        "
"                                       |                                                             |                                        "
"                                       |                                                             |                                        "
"                                       |                                                             |                                        "
"                                       +-------------------------------------------------------------+                                        "
"                                                                                                                                              "
"                                                                                                                                              "
"                                     "A2"                                                                                                     "
"                                                                                                                                              "
"                                                                                                                                              "
"                                     +-----------------------------------------------------------------+                                      "
"                                     | A3 button                                                       |                                      "
"                                     +-----------------------------------------------------------------+                                      "
"                                                                                                                                              "
"                                     +-----------------------------------------------------------------+                                      "
"                                     | A4 button                                                       |                                      "
"                                     +-----------------------------------------------------------------+                                      "
"                                                                                                                                              "
"                                     +-----------------------------------------------------------------+                                      "
"                                     | A5 button                                                       |                                      "
"                                     +-----------------------------------------------------------------+                                      "
"                                                                                                                                              "
"                                     +-----------------------------------------------------------------+                                      "
"                                     | A6 button                                                       |                                      "
"                                     +-----------------------------------------------------------------+                                      "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
""A7"                                                                                                                                          "
+==============================================================================================================================================+
```

| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| A1 | logo | 89 | 30 | 248 | 31 | the title mark |
| A2 | text | 113 | 78 | 200 | 10 | one line, centred, only when it is true: why nothing will be saved, in blood.lt |
| A3 | button | 113 | 96 | 200 | 20 | "Worlds" |
| A4 | button | 113 | 120 | 200 | 20 | "Join a server" |
| A5 | button | 113 | 144 | 200 | 20 | "Settings" |
| A6 | button | 113 | 168 | 200 | 20 | "Controls" |
| A7 | text | 4 | 230 | 80 | 6 | the build, small face, root.4 |

- **Shows.** The mark and four doors. No subtitle, no picture behind, no news.
- **Clickable.** The four buttons.
- **Keys.** Up and Down move the focus, Enter presses, W opens Worlds, J the join screen.
- **First.** Focus on "Worlds", drawn (salt outline) once a key is pressed.

### World list

Size 427 by 240. Material: ground tile. Anchor: the whole screen.

```
+==============================================================================================================================================+
"                                                                                                                                              "
"                       "V1"                                                                                                                   "
"                                                                                                                                              "
"                       +-------------------------------------------------------------------------------------------+                          "
"                       | V2 well                                                                                   |                          "
"                       |                                                                                           |                          "
"                       |                                                                                           |                          "
"                       |                                                                                           |                          "
"                       |                                                                                           |                          "
"                       |                                                                                           |                          "
"                       |                                                                                           |                          "
"                       |                                                                                           |                          "
"                       |                                                                                           |                          "
"                       |                                                                                           |                          "
"                       |                                                                                           |                          "
"                       |                                                                                           |                          "
"                       |                                                                                           |                          "
"                       |                                                                                           |                          "
"                       |                                                                                           |                          "
"                       |                                                                                           |                          "
"                       |                                                                                           |                          "
"                       |                                                                                           |                          "
"                       |                                                                                           |                          "
"                       |                                                                                           |                          "
"                       |                                                                                           |                          "
"                       |                                                                                           |                          "
"                       +-------------------------------------------------------------------------------------------+                          "
"                                                                                                                                              "
"                       +-------------------------------------------+   +-------------------------------------------+                          "
"                       | V3 button                                 |   | V4 button                                 |                          "
"                       +-------------------------------------------+   +-------------------------------------------+                          "
"                                                                                                                                              "
"                       +-------------------------------------------+   +-------------------------------------------+                          "
"                       | V5 button                                 |   | V6 button                                 |                          "
"                       +-------------------------------------------+   +-------------------------------------------+                          "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
+==============================================================================================================================================+
```

| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| V1 | text | C | 17 | 100 | 9 | "Worlds", salt with shadow, on the ground tile above the well, at the well's left edge, its cell ending 6 over the well. At x 100 over a well at x 9 it matched neither the well nor the centre |
| V2 | well | C | 32 | 280 | Vh - 84 | dark well 280 wide in the column of the buttons, centred, from 32 under the top to 52 over the bottom, the ground tile showing above it, below it and to either side as the tradition's lists stand: its top edge and left edge `root.0`, its bottom and right edge the ground's light tone. Across the screen's width with the rows' words in a column 280 wide in its middle, every row began with a dead band 93 units wide, a web table never laid out. Rows 36 tall run the well's width, so the chosen row's lighter floor is a band across it. At 2, 2 of each row the world's picture, 32 by 32 (V7). From 38, line one the world's name in salt at y 7; line two in root.4 at y 19: "level 14, 12 November, seed 4471", the level first, since a long seed cut the level off when it came last. A list of words with no picture is a file list, not a list of worlds |
| V7 | picture | | | 32 | 32 | the game's picture of the world's spawn once it has one; until then a side cut of the spawn the seed raises, built of blocks 4 by 4 as the world is: a frame of root.0 with a light edge of root.3 along its top and left inside it; rows 1 to 12 a sky of two flat bands, `arm` over `arm.lt`, no sun; then each column of blocks, one cell to 4 units of the heightmap, at its own height (a walk of a block up, down or level, within three blocks of the sky); the top block turf, 1 unit of `growth.lt` over 1 of `growth` (snow: `salt` over `stone.lt`; dunes: `clay.lt` over `clay.face`), then earth in `timber.sh` (dunes `clay.face`) with one speck of `timber.dk` (`clay.sh`) to the block, then from the third block down stone in `stone.sh` with one speck of `stone.dk` to the block. The first picture, a flat sky with a sun dot over one wavy band, was the same clip-art composition on every row |
| V3 | button | C | Vh - 48 | 136 | 20 | "Play"; disabled with no row chosen |
| V4 | button | C + 144 | Vh - 48 | 136 | 20 | "New world" |
| V5 | button | C | Vh - 24 | 136 | 20 | "Delete"; pressed, it asks (V8); if the world is open in another tab it reads "Open in another tab" and is disabled |
| V8 | slab | centred | centred | 200 | 58 | the question Delete asks, over the whole screen dimmed by `root.0` at a half, which takes the pointer: a stone slab, its title "Delete Hearth on the Yavas?" (the name cut to fit), at 8, 18 "It cannot be undone." in ink, and at 8, 34 two slab buttons 16 tall and 90 wide, 4 apart: "Delete" with its label in `blood.dk`, and "Cancel", which has the keys. Esc is Cancel. A Delete that turned into "Delete for good" in place, under Play and in the same stone, was one slip from losing a world |
| V6 | button | C + 144 | Vh - 24 | 136 | 20 | "Back" |

These coordinates are in screen units, not the menu block's: C is `floor((Vw - 280) / 2)`.

- **Shows.** The worlds saved in this browser, newest first.
- **Clickable.** A row chooses it, a second click plays it. The four buttons.
- **Keys.** Up and Down choose, Enter plays, N makes a new one, Delete asks, Esc goes back.
- **First.** The newest world is chosen and "Play" has focus. With no worlds the well keeps its size and its first row is a row still to be filled: at 2, 2 an empty picture frame (root.0, a floor of root.1 with its top row and left column root.2) holding the stepped skyline of a hill in root.2, the faint silhouette of what belongs there; at 38, 7 "No world yet" in salt and at 38, 19 "Press New world to start one." in root.4; "New world" has focus. A well one row deep with the bare ground under it looked broken, not empty; a large dark box with two centred lines in it was a web page's empty state. Any other empty list says its line at the left of its first row.

### New world

Size 427 by 240. Material: ground tile. Anchor: the whole screen.

```
+==============================================================================================================================================+
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                              "N1"                                                                            "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                     "N2"                                                                                                     "
"                                     +----------------------------------------------------------------+                                       "
"                                     | N3 field                                                       |                                       "
"                                     |                                                                |                                       "
"                                     +----------------------------------------------------------------+                                       "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                     "N4"                                                                                                     "
"                                     +----------------------------------------------------------------+                                       "
"                                     | N5 field                                                       |                                       "
"                                     |                                                                |                                       "
"                                     +----------------------------------------------------------------+                                       "
"                                                                                                                                              "
"                                                                                                                                              "
"                                     +----------------------------------------------------------------+                                       "
"                                     | N6 button                                                      |                                       "
"                                     |                                                                |                                       "
"                                     +----------------------------------------------------------------+                                       "
"                                     +----------------------------------------------------------------+                                       "
"                                     | N7 button                                                      |                                       "
"                                     |                                                                |                                       "
"                                     +----------------------------------------------------------------+                                       "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
+==============================================================================================================================================+
```

| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| N1 | text | 113 | 16 | 200 | 10 | "New world", centred on the column, salt with shadow: the screen's head |
| N2 | text | 113 | 36 | 60 | 10 | "Name", `stone.lt` with shadow, 11 over its field so its letters stand 3 clear of it; a step quieter than the salt typed in the field, so a label never reads as an entry |
| N3 | field | 113 | 47 | 200 | 20 | at most 28 characters; holds "New world", selected |
| N4 | text | 113 | 86 | 60 | 10 | "Seed", `stone.lt` with shadow; rows of a form stand 50 apart: label 11, field 20, the 11 under the field in which an answer is written with its letters 2 under it, then 8 between the groups. At 42, with the next label straight under the answer, an answer and the label below it read as one group |
| N5 | field | 113 | 97 | 200 | 20 | at most 32 characters; placeholder "Left empty, one is drawn" |
| N6 | button | 113 | 134 | 200 | 20 | "Create", 17 under the last field, 6 under the cell of its answer |
| N7 | button | 113 | 158 | 200 | 20 | "Back", 24 under "Create" |

- **Shows.** Two fields.
- **Clickable.** Fields and buttons.
- **Keys.** Tab and Shift-Tab move between the fields and buttons, Enter in a field presses "Create", Esc goes back.
- **First.** Focus in the name field with its text selected.

### Join a server

Size 427 by 240. Material: ground tile. Anchor: the whole screen.

```
+==============================================================================================================================================+
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                           "O1"                                                                               "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                     "O2"                                                                                                     "
"                                     +----------------------------------------------------------------+                                       "
"                                     | O3 field                                                       |                                       "
"                                     |                                                                |                                       "
"                                     +----------------------------------------------------------------+                                       "
"                                     "O3b"                                                                                                    "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                     "O4"                                                                                                     "
"                                     +----------------------------------------------------------------+                                       "
"                                     | O5 field                                                       |                                       "
"                                     |                                                                |                                       "
"                                     +----------------------------------------------------------------+                                       "
"                                     "O5b"                                                                                                    "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                     "O6"                                                                                                     "
"                                     +----------------------------------------------------------------+                                       "
"                                     | O7 field                                                       |                                       "
"                                     |                                                                |                                       "
"                                     +----------------------------------------------------------------+                                       "
"                                     "O7b"                                                                                                    "
"                                                                                                                                              "
"                                     +----------------------------------------------------------------+                                       "
"                                     | O9 button                                                      |                                       "
"                                     |                                                                |                                       "
"                                     +----------------------------------------------------------------+                                       "
"                                     +----------------------------------------------------------------+                                       "
"                                     | O10 button                                                     |                                       "
"                                     |                                                                |                                       "
"                                     +----------------------------------------------------------------+                                       "
"                                                                                                                                              "
+==============================================================================================================================================+
```

| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| O1 | text | 113 | 16 | 200 | 10 | "Join a server", centred on the column, salt with shadow: the screen's head, not a label |
| O2 | text | 113 | 36 | 60 | 10 | "Address", `stone.lt` with shadow, 11 over its field: a label on the ground is text on dark, a step quieter than what is typed |
| O3 | field | 113 | 47 | 200 | 20 | host and port; filled in when the page was served by a game server. Fields stand on the darkened ground with no slab under them |
| O4 | text | 113 | 86 | 60 | 10 | "Name", `stone.lt` with shadow; rows stand 50 apart, as on New world |
| O5 | field | 113 | 97 | 200 | 20 | one to sixteen of A to Z, a to z, 0 to 9, space, _ and -; any other key is refused with the blood frame for 0.3 s |
| O6 | text | 113 | 136 | 200 | 10 | "Password, if it has one", `stone.lt` with shadow |
| O7 | field | 113 | 147 | 200 | 20 | drawn as one 3 by 3 dot to a character |
| O8 | text | 113 | 68 | 200 | 11 | what the server answered, in the 11 kept under the field it is about (O3b, O5b, O7b): text with its shadow, its cell 1 under the field so its letters stand 2 under it, cut with `…` at 196, laid on a strip of the chat wash 10 tall reaching 2 past its words on each side (from x 111), with no edge or frame. Bare on the bricks of the ground tile, the grey answer read poorly; sunk in a strip with edges of its own it read as a second field, a disabled one, which a flat strip only as wide as its words does not. The next label stands 8 under the answer's cell, so an answer is never read as the label of the field below it. A refusal about one field ("That name is taken", "Wrong password") under that field in blood.lt, the field framed in blood until it is changed; an answer about the server ("Spark, 7 of 8 here" in root.4, "The server is full" in blood.lt) under the address. While the name is empty and the server has said nothing about it, the line under Name says why Join stands disabled: "Type a name to join" in root.4. Every field keeps its 11 whether a line stands in them or not, so nothing moves when an answer comes or goes, and 8 more stand between the answer's cell and the next label, so the rows keep their pitch of 50 |
| O9 | button | 113 | 184 | 200 | 20 | "Join", 17 under the last field; disabled until address and name are valid. After "The server is full" it reads "Try again in 5 s" and stands disabled, counting each second down, then "Try again". While it waits, a strip of `ember` 2 tall lies along the foot of its face (rows 15 and 16, from x 2, 195 long when whole) and empties from the right by whole units as the wait runs out, so that the countdown is told from a plain disabled button before its words are read |
| O10 | button | 113 | 208 | 200 | 20 | "Back" |

- **Shows.** Address, name, password. The refusals are said plainly: "That name is taken", "Wrong password", "The server is full", "This server runs another version", "No answer".
- **Clickable.** Fields and buttons.
- **Keys.** Tab order top to bottom, Enter presses "Join", Esc goes back.
- **First.** Focus in the first empty field.

### Pause

Size 427 by 240. Material: none. The world under a half of `root.0`, the dim behind any window, and on it the menus' column of 200, centred on x, measured from the top of a block 240 tall centred on the screen, as the tradition's game menu stands.

```
+==============================================================================================================================================+
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                     "Z1"                                                                                                     "
"                                     "Z2"                                                                                                     "
"                                     "Z4"                                                                                                     "
"                                                                                                                                              "
"                                                                                                                                              "
"                                     +-----------------------------------------------------------------+                                      "
"                                     | Z5 button                                                       |                                      "
"                                     +-----------------------------------------------------------------+                                      "
"                                                                                                                                              "
"                                     +-----------------------------------------------------------------+                                      "
"                                     | Z6 button                                                       |                                      "
"                                     +-----------------------------------------------------------------+                                      "
"                                                                                                                                              "
"                                     +-----------------------------------------------------------------+                                      "
"                                     | Z7 button                                                       |                                      "
"                                     +-----------------------------------------------------------------+                                      "
"                                                                                                                                              "
"                                     +-----------------------------------------------------------------+                                      "
"                                     | Z8 button                                                       |                                      "
"                                     +-----------------------------------------------------------------+                                      "
"                                                                                                                                              "
"                                     +-----------------------------------------------------------------+                                      "
"                                     | Z9 button                                                       |                                      "
"                                     +-----------------------------------------------------------------+                                      "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
+==============================================================================================================================================+
```

Drawn on a server. Alone, Z2 and Z8 are left out and Z3 and Z4 stand in their place; on a server Z3 is left out and Z4 stands under Z2.

| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Z1 | text | 113 | 40 | 200 | 10 | "Paused", `salt` with its shadow, centred on the column |
| Z2 | text | 113 | 52 | 200 | 10 | on a server only: the place and its address, "Spark  spark.local:8420", `salt` with its shadow, centred, two spaces between them. "The world runs on" in `blood.lt` above three centred lines spent the warning colour on a line that warns of nothing |
| Z3 | text | 113 | 52 | 200 | 10 | alone: the world's name, `root.4` with its shadow, centred, 12 under the title's cell |
| Z4 | text | 113 | 62 | 200 | 10 | alone: when it was saved, "Saved 0:42 ago" or "Saving" in `root.4`, or why not in `blood.lt`; on a server: who is on and that the world goes on, in `root.4`: "7 of 8 here, the world runs on". Red is kept for "Not saved" and its kind |
| Z5 | button | 113 | 80 | 200 | 20 | "Back to the game", 8 under the last line's cell; the buttons stand 4 apart |
| Z6 | button | 113 | 104 | 200 | 20 | "Settings" |
| Z7 | button | 113 | 128 | 200 | 20 | "Controls" |
| Z8 | button | 113 | 152 | 200 | 20 | on a server only: "Crew", which opens the roster held open until it is closed, so that the crew can be read without holding Tab |
| Z9 | button | 113 | 176 | 200 | 20 | "Save and leave"; on a server "Leave" |
| | | | | | | When the last save failed, the last button is "Try to save again" and another stands 24 under it: "Leave without saving", its label `blood.lt` when hovered or pressed in place of `ember.hi`. A door must never promise the save the line above says cannot happen |

- **Shows.** The title, the world and whether it is saved, in salt and grey over the dimmed world, the lines under the title (Z2 to Z4) on one strip of the chat wash 2 wider than the longest of them on each side, since `root.4` bare on the half-dimmed sky was barely legible at the 960 size; and the stone buttons in a column under them: no slab. A clay slab behind the stone buttons set two materials against each other and boxed a column that needed no box, which read as a web dialog.
- **Clickable.** The buttons.
- **Keys.** Esc goes back to the game. Up, Down, Enter.
- **First.** Focus on "Back to the game", not drawn until a key moves it: a frame on open reads as a hovered button.

### Settings

Size 248 by 212, with tabs standing 21 above. Material: clay. Anchor: centre of the screen, over the ground tile from the title or over the dimmed world from the pause.

```
+------+
|T1    |+------+------++------+
|      ||T2    |T3    ||T4    |
+------++------+------++------+
#==================================================================================#
#  "E1"                                                                            #
#                                                                                  #
#  +-------------------------------------------------------------------------+++   #
#  | E2 rows                                                                 |||   #
#  |                                                                         |||   #
#  |                                                                         |||   #
#  |                                                                         |||   #
#  |                                                                         |||   #
#  |                                                                         |||   #
#  |                                                                         |||   #
#  |                                                                         |||   #
#  |                                                                         |||   #
#  |                                                                         |||   #
#  |                                                                         |||   #
#  |                                                                         |||   #
#  |                                                                         |||   #
#  |                                                                         |||   #
#  |                                                                         |||   #
#  |                                                                         |||   #
#  |                                                                         |||   #
#  |                                                                         |||   #
#  |                                                                         |||   #
#  |                                                                         |||   #
#  |                                                                         |||   #
#  |                                                                         |||   #
#  |                                                                         |||   #
#  |                                                                         |||   #
#  |                                                                         |||   #
#  +-------------------------------------------------------------------------+++   #
#                        +-------------------------------+                         #
#                        | E4 button                     |                         #
#                        +-------------------------------+                         #
#                                                                                  #
#==================================================================================#
```

| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| E0 | slab | 0 | 0 | 248 | 212 | clay slab |
| T1 | tab | 0 | -21 | 24 | 24 | top tabs: Picture, Play, Sound, Interface. Their marks are things of the hearth, not of a desk: Picture a shuttered window in a stone jamb with sky and hill through it, Play an open hand in clay, Sound a bell, Interface a slate hung from a nail in a timber frame with three chalked lines. A framed photograph, a computer mouse and an application window made the settings read as a preferences pane |
| E1 | text | 8 | 6 | 100 | 10 | the tab's name |
| E2 | rows | 8 | 20 | 224 | 160 | ten rows 16 tall, the rest scroll. Label in ink at x 8. A switch is a checkbox right-aligned to x 232. A measure is a slider 80 wide at x 152 with its value right-aligned to x 147. A choice is a button 80 by 14 at x 152 that steps through its values. Chat width says its width with its name, "Narrow, 160", "Middle, 240", "Wide, 320", and while its button is hovered or focused chat itself stands where it will at that width, the sample lines on an opaque strip of `root.0` over everything: "Middle" alone did not say how wide |
| E3 | scroll | 234 | 20 | 6 | 160 | scroll track, light variant (floor clay.dk, thumb as the slider handle) |
| E4 | button | 24 | 184 | 200 | 20 | "Done": the menus' stone button, as on the title and the pause, 8 above the slab's foot. A small clay "Done" 100 by 16 made two families of button for one role across the full-screen menus |

- **Shows.** Picture: preset, render distance, field of view, resolution scale, texture filtering, adaptive resolution, bloom, sun shadows, tone mapping, vignette, the two edge smoothings, clouds, sway, eye adaptation. Play: mouse sensitivity, view bobbing, screen shake, auto-jump, tool switching, double-tap to fly, raw mouse. Play also: invert looking up and down, crouch and run while the key is held. Sound: all sound, effects, music, wind, water and birds, rain and thunder, footsteps, crew voices, interface clicks, sound in the background, subtitles. A standard option keeps the name players know it by ("Subtitles", "Switch to the right tool"); a plain-word rename of it is a riddle. A label that is a term of the trade (texture filtering, bloom, tone mapping) has a tooltip with its name and one plain line in `root.4`. Interface: scale (Auto, then each whole number that fits), chat lines shown, chat width, how long chat stays, and a switch for each part of the HUD a player may want gone: the crew list, toasts, the pickup log, the name of the thing in hand, coordinates, the compass. Every tab fills the ten rows the slab shows, so that the slab keeps one height across the tabs and "Done" stands under the last row, not under an empty face.
- **Clickable.** Controls, tabs, "Done". A change takes effect at once and is saved at once; there is no "Apply".
- **Keys.** Up and Down move along the rows, Left and Right change the focused control by one step, Space flips a switch, Q and E step through the tabs, Esc is "Done".
- **First.** Focus on the first row of the tab last open.

### Controls

Size: as its rows need, 246 by 198 for the game's keys (at least 216 wide, so that "Done" stands 8 in from each side). Material: clay. Anchor: centre of the screen, over the ground tile from the title or over the dimmed world from the pause.

```
#============================================================================#
#  "Y1"                                         "Y5"                         #
#                                                                            #
#  +--------------------------------+   +-----------------------------+      #
#  | Y2 rows                        |   | Y3 rows                     |      #
#  |                                |   |                             |      #
#  |                                |   |                             |      #
#  |                                |   |                             |      #
#  |                                |   |                             |      #
#  |                                |   |                             |      #
#  |                                |   |                             |      #
#  |                                |   |                             |      #
#  |                                |   |                             |      #
#  |                                |   |                             |      #
#  |                                |   |                             |      #
#  |                                |   |                             |      #
#  |                                |   |                             |      #
#  |                                |   |                             |      #
#  |                                |   |                             |      #
#  |                                |   |                             |      #
#  |                                |   |                             |      #
#  |                                |   |                             |      #
#  +--------------------------------+   +-----------------------------+      #
#    +----------------------------------------------------------------+      #
#    | Y4 button                                                      |      #
#    +----------------------------------------------------------------+      #
#                                                                            #
#============================================================================#
```

| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Y0 | slab | 0 | 0 | 246 | 198 | clay slab, as wide as its two columns with 8 at each side and 12 between, as tall as its rows, the button and 8 under it |
| Y1 | text | 8 | 6 | 60 | 10 | "Controls" |
| Y2 | rows | 8 | 20 | | 144 | left column, rows 16 tall: the key caps from the row's left (the mouse 2 lower), then what it does in ink, 6 after the run of caps, at the cap's text height. Every row's run of caps is one width on the screen, the widest of a single cap and of Move's four caps at the width of its widest, sharing outline columns (49 for the game's keys): a single cap takes the whole run with its label centred, the four of Move share it. Caps each as wide as their label left the column ragged |
| Y3 | rows | | 20 | | 144 | right column, the same, starting 12 after the left column's longest line |
| Y4 | button | 23 | 170 | 200 | 20 | "Done", the menus' stone button, centred, 6 under the last row and 8 above the slab's foot |
| Y5 | text | | 6 | | 10 | right-aligned to the slab's width less 8, in `ink.faded`: "Press a row to change its key", or while a row waits, "Press a key for Sneak" |

- **The mouse** buttons are key caps like the rest, in the run's one width: on each, `{lmb}`, `{rmb}` or `{mmb}` (the mouse with that button filled) and its word, "Left", "Right" or "Wheel", both in ink, centred. A grey mouse 9 by 13 and a grey word with no cap round them looked like disabled rows beside the keys. A key that cannot be changed (the number row, Esc) carries a lock 5 by 5 in ink at its cap's right, 2 in, its label centred in what is left; what it does stays in ink like every row's, since grey words alone were the only thing that told it
- **A row is a button.** Hovered, its floor (2 units round the caps and the words) turns `clay.lt`; with keyboard focus it has a ring of `salt`. Pressed (or Enter), it waits: the floor `clay.lt` with a ring of `ink`, the cap waited for reads "?", and the next key, or a mouse button pressed on the row, takes its place; a row of several caps (Move) then waits for its next cap. Esc leaves it as it was. A key that two rows share turns both rows' words `blood.dk`, and the tooltip of each says "Shares a key with Pack" in `blood.lt`. The number row and Esc cannot be changed: their words are `ink.faded`, they take no hover, and their tooltip says "This key cannot be changed".
- **Shows.** The keys as drawn caps: move, jump, sneak, sprint, the three mouse buttons, pack, journal, map, chat, roster, ping, drop, salve, hotbar, hide the interface, pause.
- **Clickable.** Each row but the two fixed ones; "Done". A change takes effect at once and is saved at once.
- **Keys.** Tab walks the rows and "Done"; Enter on a row makes it wait; Esc while a row waits leaves it, else it is "Done".
- **First.** Focus on "Done".

### The screen at a fall

Size 427 by 240. Material: the world dimmed by a quarter wash of root.0 and over that a half wash of blood.dk, so the scene stays seen through the red (blood.pit at three quarters read as a flat maroon fill with no world under it), and no window: the fall is not a container and the wash is its ground, as in the tradition. Anchor: the column 200 wide, y from the top of the block 240 tall centred on the screen.

```
+==============================================================================================================================================+
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                          "D1 raised"                                                                         "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                               "D2"                                                                           "
"                                                                                                                                              "
"                                                               "D3"                                                                           "
"                                                               "D3b"                                                                          "
"                                                                                                                                              "
"                                    +------------------------------------------------------------------+                                      "
"                                    | D4 button                                                        |                                      "
"                                    +------------------------------------------------------------------+                                      "
"                                                                                                                                              "
"                                    +------------------------------------------------------------------+                                      "
"                                    | D5 button                                                        |                                      "
"                                    +------------------------------------------------------------------+                                      "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
+==============================================================================================================================================+
```

| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| D1 | raised | 175 | 56 | 78 | 22 | "You fell" in raised letters (5.28), centred on the column, with a flat `root.0` copy of the whole drawing 1 right and 1 down under it, as its shadow. "Fell" is this ground's word for a death wherever it is said (chat's "Rook fell to a Tama", the compass's mark of where one fell), so the headline keeps it and does not switch to "died" |
| D2 | text | 113 | 86 | 200 | 10 | what did it, centred, salt with shadow: "to a Tama", "from a height", "to hunger" |
| D3 | text | 113 | 98 | 200 | 10 | what was shed, centred, salt with shadow, in words: the jar mark and "14 lees dropped"; left out when nothing was. "14 shed in Vana" said neither what was shed nor a place that can be found: Vana is a country |
| D3b | text | 113 | 110 | 200 | 10 | where the shed lees lie, centred, in arm.lt with shadow as a place to go: "Your lees lie at x -104  z 2210"; when nothing was shed, in its place, where the body fell, salt with its shadow as all text on the world: "At x 312  z -88". In `root.4` on the washed world it was the faintest line on the screen |
| D4 | button | 113 | 126 | 200 | 20 | "Rise again", 6 under the last line drawn: at y 126 with D3 and D3b, at 114 when nothing was shed |
| D5 | button | 113 | 150 | 200 | 20 | "Save and leave"; on a server "Leave"; 4 under D4 |

- **Shows.** The red comes up in two steps over 0.1 s (a quarter, a half); the buttons are disabled for 0.8 s so that a blow in flight cannot press one. With friends near, their name tags and the chat stay drawn over the wash, the chat where it stands in play, or lower where that would bring a line within 16 of the last button.
- **Clickable.** The two buttons.
- **Keys.** Enter rises once the buttons wake. Esc does nothing here.
- **First.** Focus on "Rise again", drawn disabled until it wakes.

### Loading

Size 427 by 240. Material: ground tile. Anchor: the whole screen.

```
+==============================================================================================================================================+
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                       +-------------------------------------------------------------+                                        "
"                                       | I1 logo                                                     |                                        "
"                                       |                                                             |                                        "
"                                       |                                                             |                                        "
"                                       |                                                             |                                        "
"                                       +-------------------------------------------------------------+                                        "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                        [I2                                                         ]                                         "
"                                                                                                                                              "
"                                     "I3"                                                                                                     "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
+==============================================================================================================================================+
```

| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| I1 | logo | 89 | 60 | 248 | 31 | the title mark |
| I2 | gauge | 119 | 109 | 188 | 11 | a dark well sunk in the tile (5.8) with, 3 in, the HUD's thin strip (5.15), 182 by 5, 20 under the mark: eighteen segments, each root.2 when empty and, as it fills unit by unit, ember with a top row of ember.lt and a bottom row of ember.dk; it never runs back |
| I3 | text | 113 | 123 | 200 | 10 | one line, centred, 6 under the strip, with its shadow: what is being done in salt ("Laying the ground", "Coming up"), then two spaces and which stage it is of how many in `root.4`, the less important line on dark ("2 of 4"), so that a long stall reads as one slow stage and not a hang. `grit.lt` was asked for and is kept for the pebbles of a button |
| I4 | text | 113 | 135 | 200 | 10 | on a server only, how many are there ("7 of 8 here"), centred in `root.4` with its shadow, 12 under the stage. Written after the stage on one line, it joined two facts that have nothing to do with each other |

- **Shows.** The mark, a strip and one line. On a server a second line says how many are there. A picture of what was being raised once stood alone between the mark and the strip, tied to neither, and was dropped.
- **Clickable.** Nothing.
- **Keys.** Esc gives up a join and goes back to the title.
- **First.** Nothing has focus.

### Chat, open

The HUD's chat with its entry (5.23): twelve lines ending 2 above the entry, and the entry under them in chat's own column (5.23), clear of the hotbar and its measures. The crew list is not drawn while chat is open. Enter sends and closes; Esc closes and keeps the text for the next time; Up and Down walk through what was sent before; a line that starts with `/` is a command and its answer comes back as a server line. While chat is open the game takes no key.

### Roster

5.24, drawn while Tab is held. It takes no pointer and no focus.

### States of a body (to come)

The States tab of the pack (the second of its four), as the pack's States tab above draws it: no figure (the pack beside it shows the body), the title, then rows 22 tall from the top of the panel: status icon in its frame, the state's name on the first line in the colour of what it does, cut with `…` before it can wrap, what it does and the time left on the second line, and in the tooltip what ends it. The six kinds of harm are not shown on the body; each is a 9 by 9 mark beside a number wherever a tooltip gives harm (an edge, a weight, a flame, the loosening, a fall, the sun), and a creature's entry in the codex lists the kinds it yields to and the kinds it turns.

### Keys and stores (to come)

A key is an item and lies in the pack; its empty place in a door's prompt uses the key silhouette. Standing at a locked door the readout says "Locked" in `blood.lt` and names the key. A sealed store that someone is inside has a tab on the map screen (see World map).

---

## 7. Behaviour

**Hover.** The part under the pointer shows its hovered state at once. One part is hovered at a time: the topmost that takes the pointer. A tooltip for a slot shows at once; for a button, a tab or a label after 0.4 s of rest.

**Press.** A slot acts when the button goes down. A button shows pressed while the button is down over it and acts when it comes up over it; dragged off, it does nothing. A tab acts on the press.

**Stacks.** The window is a tool first. The kit reports what was done to which slot; the game turns it into its ops.

| Input | What it does |
| --- | --- |
| Left press on a slot, hand empty | takes the stack |
| Left press, a stack held | puts it down; joins a stack of the same kind; swaps with another kind |
| Right press, hand empty | takes half, the larger half |
| Right press, a stack held | puts one down |
| Right button held and moved over other slots | puts one in each as it passes |
| Left press on a stack, moved to another slot and let go | puts it there (press, drag, drop) |
| Shift and left press | sends the stack where the open window says: to the chest, to the furnace, onto the body, to the shop, or between pack and hotbar |
| Double left press with a stack held | gathers every stack of that kind into the hand, up to a full stack |
| 1 to 9 over a slot | swaps it with that hotbar cell |
| Q over a slot; Ctrl and Q | drops one; drops the stack |
| Press outside every slab with a stack held | drops the held stack into the world |
| Press on the result slot; Shift and press | takes what the grid makes; takes as many as it can make |

Spreading a held stack evenly by dragging with the left button is wanted and needs one new op; it is not drawn until then. When a window closes, what is held and what lies on a grid goes back to the pack.

**Focus.** The pointer and the keys are equals. Tab and Shift-Tab walk the parts that take focus in reading order: within a slab from the top left, row by row; across slabs the main slab, then the right panel, then the left. The arrow keys move inside a grid or a list. Enter and Space press. Esc closes the topmost screen. Focus is drawn (a `salt` outline on a button, a `salt` frame inside a slot, a field, a row or a checkbox) only after a key has moved it, and stops being drawn when the pointer moves. The focus a screen gives on opening (its "First") is not drawn: the first Tab or arrow key shows it where it stands rather than moving it on. A field given focus shows its caret at once.

**Scrolling.** A list moves by whole rows. One notch of the wheel is one row. Dragging the thumb snaps to rows. A press on the track above or below the thumb moves one page. Moving focus to a row outside the well scrolls it into the well. The field of the tree and the chart pan by whole units.

**Tooltip placement.** Its left edge is 10 units right of the pointer and its top 4 above it. If its right edge would pass 2 units from the screen's right edge, it stands to the left instead, its right edge 6 left of the pointer. Its top and bottom are then held 2 units inside the screen. It is drawn above every slab and is never clipped by one.

**Text that is too long.** One line in a fixed place (a name in a row, a title, a button's label) is cut at the last glyph that leaves room for `…` and the `…` is drawn. Text in a box of several lines wraps at spaces; a word longer than a line is broken at a glyph; after the box's last line it is cut with `…`. Text is never shrunk, squeezed or run outside its box.

**Movement.** Parts move by whole units. A toast slides. A pip shakes. Nothing fades continuously: a wash that comes or goes does it in the three strengths, and a line of chat or a toast leaves by being cut.

**Sounds** are not the kit's. It tells the game what happened (`press`, `refuse`, `tab`, `page`, `take`, `put`) and the game plays what it will.

---

## 8. Architecture

Decided. Builders do not reopen these.

**One canvas.** A canvas `#gui` over the game's canvas, the same size in CSS pixels. Its backing store is the window in device pixels (read from a `ResizeObserver`'s `devicePixelContentBoxSize` where the browser has it, else `round(css * devicePixelRatio)`), so that one backing pixel is one device pixel at any zoom or ratio. Its 2D context has `imageSmoothingEnabled = false`. Every draw is a `fillRect` or a `drawImage` at whole device pixels: unit times scale plus the grid's origin. No transform other than that, no path, no `fillText`, no shadow, no gradient, no CSS effect on the canvas.

A second, small canvas (48 by 48 units) carries the pointer and the held stack and is moved with a CSS translate snapped to units, so that moving the mouse redraws nothing. These two canvases and one hidden input are every DOM element the interface owns.

**Pixel maps.** All art is data: rows of characters and a key.

```ts
export interface PixelMapSrc {
  rows: string[];                               // equal lengths; '.' is nothing
  key: Record<string, Colour | Role>;           // one character to a palette name or a ramp role
  slice?: [left: number, top: number, right: number, bottom: number];   // nine-slice insets
}
```

`pixmap(src)` checks it (a ragged row, a character with no key, a name not in the palette: each throws at start-up, in every build) and returns indices. A map that uses roles is drawn with a ramp: `s.map(SLOT, x, y, 'timber')`. Each map is baked once per ramp into an offscreen canvas at one device pixel to the unit and drawn scaled by `s` with smoothing off. Glyphs are baked once per colour used. The two faces are pixel maps too: a glyph is its rows and its first row, as in this document's sheets.

**Surface.** Parts draw through one small interface, which has two makers.

```ts
export interface Surface {
  readonly w: number; readonly h: number;       // units
  fill(x: number, y: number, w: number, h: number, c: Colour): void;
  wash(x: number, y: number, w: number, h: number, c: Colour, quarters: 1 | 2 | 3): void;
  map(m: PixelMap, x: number, y: number, ramp?: Ramp): void;
  nine(m: PixelMap, x: number, y: number, w: number, h: number, ramp?: Ramp): void;
  tile(m: PixelMap, x: number, y: number, w: number, h: number, ox?: number, oy?: number): void;
  text(str: string, x: number, y: number, c: Colour, shadow?: boolean, face?: Face): number;   // returns the width
  icon(key: string, x: number, y: number, look?: 'full' | 'flat', flat?: Colour): void;        // 16 by 16
  clip(x: number, y: number, w: number, h: number): void; unclip(): void;
}
```

`CanvasSurface` draws to the canvas. `GridSurface` writes palette indices into an array, one cell to the unit, and runs under Node with no browser: it is what the tests read. A call with a coordinate that is not a whole number throws in both.

**A retained tree of parts.** A screen is a function from a plain view (the facts it shows, as data) to a tree of nodes. It is called again whenever its view's revision changes; nothing is diffed, the old tree is dropped. What must outlive a rebuild (hover, press, focus, scroll, the caret) is kept by the root against each node's `id`.

```ts
export interface Node {
  id?: string;                                  // stable across rebuilds
  x: number; y: number; w: number; h: number;   // units, from the parent's top left
  paint?(s: Surface, live: Live): void;
  kids?: Node[];
  clip?: boolean;                               // children are clipped to this node: wells
  takes?: boolean;                              // takes the pointer; a node with handlers does by default
  focus?: boolean;                              // a stop for Tab
  tip?(live: Live): Tip | null;
  on?: Partial<Handlers>;                       // down, up, click, wheel, key, drag, enter, leave, text
}
export interface Live { hover: boolean; down: boolean; focus: boolean; t: number }
export type Screen<V> = (view: V, ui: Ui) => Node;
```

Parts are functions that return nodes: `slab(...)`, `slot(...)`, `button(...)`, `well(...)`. Hit-testing walks the last tree from the top layer down and from the last child to the first, and returns the first node that takes the pointer and contains the unit under it; a clipped child outside its well is not hit. The root keeps four layers and paints them in order: HUD, window, menu, over (tooltip, toasts, banner). The canvas is cleared and painted whole when any layer is marked dirty (a view's revision, a change of hover, press or focus, a blink, a moving part) and not otherwise.

**Text entry.** One real `<input>` serves every drawn field. It is in the DOM, laid over the drawn field's rectangle in CSS pixels, with `opacity: 0`, no pointer events and a font size of 16 px. When a drawn field takes focus the input is given that field's text, limit and allowed characters, moved onto it and focused; the browser's own editing, clipboard, selection and IME then work, and an IME's candidate window opens beside the drawn field. On every `input`, `selectionchange`, `compositionupdate` and `compositionend` the kit copies the input's value, selection and composing run into the field's state and marks it dirty; the composing run is drawn with a rule of `salt` under it. A press on the drawn field sets the input's selection from the glyph under the pointer. While a field has focus, key events reach the game's bindings only for Esc; Enter, Tab and Esc are handled by the kit. A password field draws a 3 by 3 dot for each character and sets the input's type.

**The kit is alone.** Nothing under `src/ui/kit/` imports from outside it: not the simulation, not the session, not three.js, not `data/`. `scripts/uicheck.mjs` fails on any import that climbs out. A screen takes a view that is a plain interface declared beside it (`PackView`, `ShopView`), and reports what the player did through callbacks on that view. The game will later build those views from its mirrors and turn the callbacks into ops; `mock/` builds them from fixed data today. Icons come through an `IconSource` given to the root: `(key) => PixelMap`, with a 16 by 16 stand-in in the mock.

**Folders.**

```
src/ui/kit/
  palette.ts        the colours of section 2, their names, the ramps and roles
  pixmap.ts         PixelMapSrc, pixmap(), baking, nine-slice
  surface.ts        Surface and GridSurface
  canvas.ts         CanvasSurface; the only file that touches a 2D context
  scale.ts          fit, the virtual screen, the stage, wide or narrow
  font/             text.ts and small.ts (glyph rows), measure.ts, wrap.ts (wrapping and cutting)
  art/              the pixel maps, one file to a family: slab, slot, silhouettes, button, tabs, well,
                    controls, gauges, hud, book, tree, marks, pointer, title
  parts/            functions that return nodes, one file to a part of section 5
  node.ts           Node, Live, Handlers, Tip
  root.ts           layers, rebuild, paint, hit-testing, hover, press, focus, drag, scroll
  textentry.ts      the hidden input
  tooltip.ts        building and placing
  screens/          one file to a screen of section 6, each exporting its view's interface and its Screen
  mock/             fixed views and a stand-in icon source
  check.ts          the pixel-grid check
  golden/           text dumps of every mock screen from GridSurface
uikit.html          a static page with no world: ?screen=pack&scale=3&strict=1, ?part=slot, ?sheet=text
scripts/uicheck.mjs Node: imports, pixel maps, layouts, goldens
scripts/uishot.mjs  one screenshot of uikit.html through headless Chrome, then the pixel-grid check on it
```

**How art is tested.**

1. *Data.* `uicheck` loads every pixel map: rows equal, every character keyed, every name in the palette. It loads both faces and fails on a glyph whose width or rows differ from section 4.
2. *Layout.* It builds every screen from its mock at 400 by 240, 427 by 240 and 320 by 240 and fails if a node leaves the screen, if two nodes that take the pointer overlap, or if a node's coordinates are not whole numbers.
3. *Goldens.* It paints each on a `GridSurface` and compares the cells with `golden/<screen>.txt`, a dump in this document's own codes. A changed golden is accepted only after its picture has been judged against section 9.
4. *The pixel-grid check*, on a real screenshot. `uishot` opens `uikit.html` in strict mode (washes drawn as their opaque stand-ins, the ground under everything `stone.pit`) at scales 1, 2, 3 and 5, and `check.ts` reads the PNG: for a screenshot at scale `s`, every block of `s` by `s` device pixels on the grid must be one flat colour, and that colour must be one of the palette's. One mixed block means something was drawn off the grid or smoothed; one foreign colour means something was drawn outside the palette. The check prints the unit and the colours it found. `uishot` is the only way the interface is photographed, and one runs at a time.

---

## 9. Forty checks

Each is answered yes or no from a screenshot. A no is a fault.

The grid

1. Does every edge in the picture lie on the unit grid, with no part offset by a fraction of a unit?
2. Is every unit one flat colour, with no smoothing, blur or half-tone along any edge?
3. Is there one pixel size on the whole screen, with no art or text drawn larger or smaller than the rest?
4. Is every colour of every opaque part one of the palette's (item icons excepted until they are redrawn)?
5. Is the picture free of gradients, glows and soft shadows?
6. Is every corner square or cut by whole units, with no curve anywhere?

Material

7. Is each window an opaque slab with a root-black outline whose four corner units are left out?
8. Does every slab show light two units deep on its top and left and dark two units deep on its bottom and right?
9. Is each slab the material its work calls for (clay, timber, stone, book) by the table in 5.1?
10. Are containers light slabs and readouts dark plates, with no dark window and no light part on the HUD?
11. Is the world behind a window one flat dimness?
12. Does every full-screen menu stand on the ground tile, with no picture, vignette or gradient behind it?

Slots

13. Is every slot 18 units square with a floor 16 square, dark along its top and left and light along its bottom and right?
14. Do the slots of a grid touch with no gap, and does the hotbar row stand 4 units below the pack?
15. Is every stack count salt with a root-black shadow at the bottom right of its slot, and is a count of one left unwritten?
16. Does every empty slot that takes one kind of thing show that thing's silhouette?
17. Is the hovered slot told by a lighter floor alone, with its icon untouched?

Letters

18. Is every letter on the screen from the game's two faces, text typed into a field included?
19. Is text on a light face ink with no shadow, and text on dark, on stone or on the world salt or a meaning colour with a shadow one unit down and right?
20. Is every title at the top left of its slab, 8 units in, in sentence case?
21. Is the screen free of labels set in capitals and of letter-spacing?
22. Do Ā, ā, ī and ū carry their macrons in every name that has them?
23. Do the digits of a column of numbers end on the same unit?
24. Does every coloured word have a meaning in the table of section 2 (a grade, better, worse, a refusal, a place to go, a player)?
25. Is text that is too long cut with the three-dot glyph inside its box, never spilled, shrunk or squeezed?

Layout

26. Does the window stand at least 3 units from every edge of the screen, and whole on it?
27. Is the window laid out as a tool: grids on the left margin of 8, the title at the top left, nothing centred but a button's label, a result and a full-screen column?
28. Does every line, box and mark on the screen separate two things, join two things or hold something, with no ornament?
29. Do side panels share an outline with their main slab, with no gap and no floating card?
30. Does the chosen tab join the face of its slab while the others stand lower and darker?

The HUD

31. Is the hotbar a strip of nine cells with a selector that overhangs it by one unit?
32. Are life, hunger and the arm rows of ten pips of 9 units: drops, bowls and hands?
33. Is the HUD free of any number with a percent sign and of any text inside a bar or strip?
34. Do strips and gauges fill by whole units, and do strips show their segment lines?
35. Is a boss shown as a name over a segmented strip at the top centre, with nothing else on those lines?
36. On a window wider than 16 to 9, do the HUD's parts keep to the stage and its margins?

Parts

37. Is the tooltip a dark plate with a one-unit frame in the grade's colour, above everything and whole on the screen?
38. Does every button show tooled stone with a light top row and a dark bottom, is the hovered one outlined in ember.hi with its label in ember.hi, and the focused one outlined solid in salt with the wedge before its label?
39. Is progress shown by a hollow that fills (arrow, flame, channel), never by a spinner, a bare number or a percentage?
40. Is every icon 16 units square and lit from the top left, with no emoji and no geometric glyph standing in for a picture?

---

## Decisions made while building

Taken where the direction is silent, in its spirit. Builders may rely on them.

**Pixel maps.** A key may map a character to `'tint'`, which stands for the colour given at draw time; the letters and the coloured frames of plates (tooltip, refusal) are drawn this way, so one map serves every grade. A map may also be drawn `flat`, every cell in one colour, which is how a silhouette or a missing thing is drawn from its icon. `coded(rows, name, slice)` builds a map straight from rows written in this document's own codes and role digits.

**Nine-slice.** A middle piece whose columns (or rows) are all alike is drawn as one stretched copy of a single column (or row); any other middle piece repeats, cut at the far edge. Both give the same cells; stretching is fewer draws.

**Atlas.** Every map is baked once per ramp, tint or flat colour into pages of 1024 by 1024 at one pixel to the unit, with one clear pixel between neighbours so a scaled copy can never take a neighbour's edge. It lives in `canvas.ts`, the one file that touches a 2D context. Clipping is done by cutting rectangles, not with a canvas clip path.

**Letters.** The sheets of 4.1 and 4.2 are kept in `font/text.ts` and `font/small.ts` in the same form as above and read at start-up; a sheet whose rows disagree with its own width line throws. The small face has no tofu in 4.2; it draws a 3 by 5 box. Curly quotes become straight ones, and the arrows and check marks some strings already hold become `{right}`, `{left}`, `{up}`, `{down}`, `{check}`, `{cross}`. The middle dot `·`, used as a separator in some present strings, is deliberately left to draw as tofu so that every such string is found and rewritten when it is wired. A cut line drops trailing spaces before its `…`. When a box of several lines runs out, its last line takes `…` after its last word if there is room, else it is cut at a glyph.

**Tree.** Besides the handlers of section 8 a node may have `pass` (the pointer came onto it with a button held that was pressed elsewhere: spreading one at a time with the right button) and `drop` (a press that began elsewhere was let go over it). A pointer event says `double` for a second press of the same button on the same node within 0.3 s. `Node.field` marks a drawn text field, which the hidden input then serves; `Node.anim` keeps the root painting every frame while that node is shown. `Live.focus` is true only while the focus was put there by a key, so a part draws its focus whenever it is told to.

**Input.** Hit-testing stops at a modal layer: a press that hits nothing in it goes to that layer's `outside` (dropping a held stack into the world) and never to the HUD below. Tab walks the stops of the topmost layer that has any, in tree order, so a screen lists its parts in the reading order of section 7. An arrow key the focused part does not use moves the focus to the nearest stop that way, a unit across counting three units along. One notch of the wheel is 100 pixels of `deltaY` (33 to a line). A key goes first to the focused part and its parents, then to the part under the pointer (so 1 to 9 and Q act over a slot), then to the game.

**Pointer canvas.** The pointer's canvas is 48 by 48 units with the hot spot at 16, 16, so a held stack's icon (at -8, -8) and its count both fit.

**Grid surface.** Cells hold a palette index, or one of three marks for what is not the palette's by design: the world (`.` in a dump), a wash over a colour outside strict mode (`~`), a picture from the game (`?`).

**The pixel-grid check** lives in `scripts/uilib.mjs` rather than `check.ts`, since it reads PNGs under Node. It is stricter than section 8 asks: the page paints the same frame on a `GridSurface`, and every unit of the screenshot the kit drew must be exactly the palette colour the grid holds, not merely some palette colour. The world behind a window is exempt from it, flatness included, because the world is the game's render; the game's pictures are exempt from the palette but not from flatness. `uigrid` checks scales 2, 3 and 4 (and strict mode with `--strict`); `uishot` checks its two shots as it takes them. Chrome runs with `--force-color-profile=srgb` so that a screenshot holds the colours the canvas holds.

**The kit page.** `uikit.html` puts a flat stand-in for the world (sky and grass in CSS colours) behind screens that stand on the world; strict mode hides it and shows `stone.pit`. The type and parts sheets are 474 units wide and need a virtual screen of 480 by 270: they are sheets for judging, not screens of the game, and the 394 by 234 limit of section 3 does not bind them. The zoomed shot is taken at scale 1 in a 480 by 270 window, the same virtual screen as the shots at scales 2 and 4.

**Parts.** Each part of section 5 is a function in `parts/` that returns a node, and each takes a `force` (hover, press, focus) so that a sheet can pin a state without the pointer. A part that holds a slab's tones takes its host: a ramp, `ground` or `dark`; a well's, a field's, a checkbox's and a groove's light edge follow from it (5.8). `scripts/uiparts.mjs` draws every part whose diagram carries no text on a grid surface and compares it unit for unit with the diagram.

**Tabs.** The diagrams of 5.7 disagree on the far corner of a tab not chosen: the top tab keeps it, the side tab leaves it out. Both leave it out; the tab drawn after it, which shares that column, fills it back, so only the last of a row shows the cut. A chosen tab away from the corner joins the slab exactly as the one at the corner does. A tab not chosen shows a floor of `face` while hovered and a frame of salt inside when a key has moved the focus to it.

**Pips.** A half pip is the full pip's five lit columns beside the empty pip's other four. The rows that fill from the right take the lit columns on the right, but the pips themselves are not turned, so their light still comes from the top left.

**Small choices.** A hit turns the crosshair into four ticks two units long, outlined like the cross. A banner's text is clipped inside its frame so that a descender's shadow cannot notch it. A node's ranks stand on a scrap of `root.0` so that a link passing under them does not run through the figures. The roster writes the level as a bare number and a distance with an `M`. The silhouette in a hovered slot is drawn in `sh`, on the hovered floor of `lt`. A row that cannot be used draws its icon flat in `root.4`, except in the shop, where a good out of reach keeps its icon and its grade and only its price, its figure in blood and its mark greyed, says so. A password field draws its dots at a pitch of 4. A toast's first line takes the light tone of its frame (`growth.lt` for growth, `blood.lt` for blood, salt for `root.4`, a grade's frame as it is). The thumb of a track sunk in a slab is the slider's handle cut to 6 wide, its grip in the third column.

**Sheets and pictures.** The kit page's sheets of parts are `parts`, `parts-controls`, `parts-gauges`, `parts-hud`, `parts-plates`, `parts-book` and `parts-icons`; `uishot --screen parts` takes them all. The mock screens use 24 sample items drawn in the palette (`mock/icons.ts`); the interface's own marks, for tabs that open a page and for the states of a slot, are in `art/icons.ts`.

**Screens of the books set.** Each screen of section 6 is a file under `screens/` that exports `SCREENS`, a list of named screens; `screens/index.ts` gathers every such file, and every `ICONS` a file under `sample/` exports, so that a screen is added without editing a shared list. A screen's hard cases are screens of their own named after it (`worlds-empty`, `join-taken`, `codex-unseen`), so that `uishot --screen worlds` takes them all. A press that would open another screen in the game opens that mock screen on the kit page.

**Full-screen menus.** A menu's table is written for 427 by 240. Its parts are moved so that the table's x of 113 is the left of the 200-wide column centred on the screen, and its y is measured from the top of a block 240 tall centred on the screen; the build line alone stands at the screen's own bottom left.

**Windows on a short screen.** A window with tabs is centred with its tabs left out, then moved as little as it takes for the tabs to stand 3 units inside the screen; on a screen 240 tall the settings, the tree and the map therefore stand 24 from the top.

**The caret** stays lit for 1.5 s after its field takes focus or its text changes, then blinks, as carets do while one types.

**Lists.** A well may hold rows taller than 18 (the worlds' rows of 36, two lines), paint a row's own content over the floor and frame it draws, take a second press or Enter on the chosen row as "use", and say one grey line when it holds no rows. Up and Down on a focused row move the choice and keep it in the well.

**Rows written on a page.** A row of a list on a page (steps, bounties, the crew) is ink on the page: chosen, a band of `clay.face` the row's full width and height behind its words, the page pressed down under it; hovered and not chosen, a band of `salt`, the page lifted as the tradition lifts a hovered slot; with keyboard focus, a frame of salt. A rule of `clay.dk` under the chosen row's words was tried and read as a link (and on a page a rule under words is the hovered link's own mark), and where a descender met it the two strokes ran into one blot. A player on a page is their 2 by 7 flag beside their name in ink.

**The codex.** An entry slot is the clay slot with a floor of `clay.sh`, its silhouette `clay.face` (`clay.sh` while hovered). The picture well is a hollow in the parchment with the 16 by 16 picture in its middle. The four steps run on without gaps, a rule of `clay.sh` standing for each one not known, cut with `…` at the box's foot. Each fact is a label in `ink.faded` and its value in ink.

**The chart.** Ground is known by chunks of 32 strides that a way walked passed within 56 strides of, so that what is known has square edges. Its marks are 7 by 7 like the compass's: one's own arrow, redrawn for each of four quarters rather than turned, a known altar, a raised gate and the mouth. A part may take `move`, the pointer moving to another unit over it, which is how the chart says what is under the pointer.

**The tree** pans no further than its farthest node and a margin of 8. On the tree screen the crew's side tabs start 14 down, clear of the first job's tab.

**Pictures of the books** (creatures, the eight, sites, peoples, old things, the bed and the mouth) were drawn as masks of materials and shaded by the rule for raised shapes: a unit whose neighbour above or to the left is not of its material takes the material's light tone, one whose neighbour below or to the right is not takes its dark tone, the rest its face, and every empty unit beside the shape is `root.0`. Only the shaded rows are kept in the kit.

**One sample crew.** Every mock screen that shows a player takes them from one crew of eight in `sample/crew.ts`, on the server Spark: the same handles, seats, levels and places on the HUD, the roster, chat, the fall, the pack, the journal, the map and the join screen, so that a check of one name can be followed from screen to screen. The handles keep the join screen's rule (one to sixteen of A to Z, a to z, 0 to 9, space, _ and -), so the longest is sixteen and none carries a macron; a longer one could not be typed. One of the eight is away, for the screens that show it.

**Moving samples** (the loading channel, the Recall Stone's cooling) hold still for their first three seconds, so that a shot taken as the page opens is the frame the grid check models.
