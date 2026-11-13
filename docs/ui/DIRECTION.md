# The interface of Peopls Craft: direction

This is the whole direction for the drawn interface. Builders follow it to the unit. Critics judge screenshots against section 9. Where a diagram and a sentence disagree, the diagram stands.

A **unit** is one cell of the interface's grid. Every diagram below is one character to the unit. Coordinates are `x, y` from the top left of the part or screen named, x to the right and y down, in units. A size is `width by height`.

Contents: 1 Stance. 2 Palette. 3 Scale and layout. 4 Letters. 5 Parts. 6 Screens. 7 Behaviour. 8 Architecture. 9 Forty checks.

---

## 1. Stance

The interface is made of the four things every hearth on this ground already has: fired clay, salt, lees and the black wood of the root. A window is a slab of salt-fired clay, pale and warm, with a bloom of salt on the edges that face the light. Its outline is root-black, which is cold and close to blue. What is written on it is written in lees, a dark brown-violet ink. Where the work is carpentry the slab is timber, and where the work is fire or iron the slab is dressed stone, tooled as the first comers tooled theirs. Whatever is held up against the world (the hotbar, a tooltip, the compass, chat) is a plate of root-black with letters in salt. Gauges are hollows and cut lines that fill, because on this ground a working runs along a line cut from a hand to a thing. Life is a drop, hunger is a bowl, the arm is a hand. The light comes from the top left on every part and every icon. The interface refuses grey vanilla slabs, dark glass with one accent colour, every gradient, glow, blur and soft shadow, every rounded card and hairline, every system letter and spaced-out capital, every percentage written inside a bar, and every mark that is there only to decorate.

Three rules follow and are used everywhere below.

1. **Laid on a bench, or held up.** A container is a light slab (clay, timber, stone) with ink on it. A readout is a dark plate with salt on it. No screen mixes the two roles: there is no dark window and no light HUD part.
2. **A hollow that fills.** Progress, fuel, heat, a count toward a step, loading: each is a shape sunk in its slab that fills unit by unit in a flat colour. Nothing spins and nothing is a number with a percent sign.
3. **Plain.** A part carries no ornament. If a line is on a slab it separates two things or joins two things.

---

## 2. Palette

46 colours. No opaque part of the interface uses any other. Each ramp runs light to dark and its hue moves as it darkens: clay from yellow toward red-brown, timber from yellow-orange toward wine, stone from green-grey toward blue-grey, root stays cold. The **Code** is the character that stands for the colour in every diagram of this document.

| Name | Hex | Code | Use |
| --- | --- | --- | --- |
| `root.0` | `#0c0d13` | `K` | outline of every part; text shadow; the dim behind windows |
| `root.1` | `#191b26` | `k` | face of dark plates: tooltip, toast, readout, hotbar floor, list well |
| `root.2` | `#2a2d3c` | `j` | raised or hovered row on a dark plate; empty gauge and pip |
| `root.3` | `#454a5e` | `h` | light edge of a dark plate; dividers on dark; disabled text on dark |
| `root.4` | `#8b92a8` | `g` | grey text on dark: the less important lines |
| `salt` | `#f7f2e3` | `W` | white: text on dark and on the world; hottest edge of a clay slab; selector; outline of a hovered button; core of an earned link |
| `clay.lt` | `#e3d7ba` | `L` | light edge of a clay slab; face of a page |
| `clay.face` | `#c9b896` | `F` | face of a clay slab |
| `clay.sh` | `#a68d6e` | `S` | inner dark edge of a clay slab; hovered slot floor; silhouettes; rules on a page |
| `clay.dk` | `#7d6756` | `D` | slot floor in clay |
| `clay.pit` | `#4f403c` | `Z` | dark edge of a clay slab and of its slots |
| `timber.hi` | `#f0c98d` | `e` | hottest edge of a timber slab |
| `timber.lt` | `#d7a265` | `f` | light edge of a timber slab |
| `timber.face` | `#b98049` | `T` | face of a timber slab |
| `timber.sh` | `#8f5a36` | `t` | inner dark edge in timber; hovered slot floor; the boards of a book |
| `timber.dk` | `#663d2c` | `U` | slot floor in timber |
| `timber.pit` | `#402625` | `X` | dark edge in timber |
| `stone.hi` | `#e4e8dc` | `A` | hottest edge of a stone slab; top row of a hovered button and of a key cap |
| `stone.lt` | `#c3cab9` | `G` | light edge of a stone slab; top row of a button; face of a key cap |
| `stone.face` | `#9da695` | `H` | face of a stone slab |
| `stone.sh` | `#6f7a76` | `J` | button face; inner dark edge in stone; hovered slot floor |
| `stone.dk` | `#4e585d` | `M` | slot floor in stone; tooling and lower edge of a button; blocks of the ground tile |
| `stone.pit` | `#323844` | `z` | dark edge in stone; disabled button face; joints of the ground tile |
| `ink` | `#2b1f2e` | `I` | text on any light face |
| `ink.faded` | `#5c4c56` | `i` | secondary and disabled text on a light face |
| `blood.lt` | `#f2785c` | `r` | worse-than lines and refusals on dark; lit top of the life fill |
| `blood` | `#c9372f` | `R` | life; boss strip; harm; refusal frame |
| `blood.dk` | `#7c1c2b` | `q` | shade of the life fill; refusal text on a light face; the wash of a fall |
| `ember.hi` | `#ffe08a` | `y` | label of a hovered button; grade Old on dark; tip of a flame |
| `ember.lt` | `#f7b54a` | `o` | hunger pip light; flame; trail on a draining strip |
| `ember` | `#dd7a26` | `O` | hunger; heat; a working that is running |
| `ember.dk` | `#8a3a1a` | `u` | shade of hunger and flame; grade Island on a light face |
| `growth.lt` | `#b5e36b` | `n` | better-than lines; can-afford; grade Upper on dark; lit top of the practice strip |
| `growth` | `#63ad3c` | `N` | the practice strip; the frame of a slot that accepts what is held |
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
| 1 | Upper | `growth.lt` #b5e36b | 11.6 | `growth.dk` #235c34 | 4.1 | `growth.lt` |
| 2 | Deep | `cyan.lt` #58e6d9 | 11.2 | `cyan.dk` #0b5a66 | 4.0 | `cyan.lt` |
| 3 | Hollow | `violet.lt` #c39bff | 7.7 | `violet.dk` #5b34a6 | 4.3 | `violet.lt` |
| 4 | Island | `dusk.lt` #ff9e57 | 8.4 | `ember.dk` #8a3a1a | 4.0 | `dusk.lt` |
| 5 | Floor | `rose.lt` #ff6f9c | 6.5 | `rose.dk` #96164a | 4.3 | `rose.lt` |
| 6 | Old | `ember.hi` #ffe08a | 13.3 | `gilt.dk` #6b4d08 | 4.0 | `ember.hi` |

**Meaning.** Colour is used for these meanings and no others.

| Meaning | On dark | On a light face |
| --- | --- | --- |
| Plain text | `salt` | `ink` |
| The less important line | `root.4` | `ink.faded` |
| A line from the server in chat | `stone.lt` | not used |
| A grade | the table above | the table above |
| Better than what is worn or held; can be afforded | `growth.lt` | `growth.dk` |
| Worse; cannot be afforded; a refusal; a warning | `blood.lt` | `blood.dk` |
| A set bonus; where to go; a link to another page | `arm.lt` | `arm.dk` |
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
| `arm.lt` | `root.1` | 10.4 |
| `blood.dk` | `clay.face` | 5.2 |
| `arm.dk` | `clay.face` | 4.5 |

**Washes.** These flat fills over the world are the only translucency in the interface. Each is one colour at one of three strengths: a quarter, a half, three quarters.

| Wash | Colour and strength | In strict mode (section 8) |
| --- | --- | --- |
| The dim behind a window | `root.0` at a half | `root.1`, opaque |
| The dim behind the pause buttons | `root.0` at three quarters | `root.1`, opaque |
| The strip under a chat line, a name tag and the prompt | `root.0` at three quarters, so that a grey line reads on a noon sky | `root.1`, opaque |
| The shade of a cooling item in the hotbar, covering the icon from the top by whole units | `root.0` at a half | `root.1`, opaque |
| A blow taken: a frame 2 units deep along the stage's edges for 0.2 s | `blood` at three quarters | not drawn |
| The fall | `blood.dk` at a quarter, a half, then a half held | `blood.dk`, opaque |
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

**Margins.** A HUD plate stands 4 units from the stage's edge (the hotbar 2 from the bottom, the compass 2 from the top). A window stands at least 3 units from every edge of the screen. A tooltip stands at least 2.

**Anchors.**

| Family | Anchor |
| --- | --- |
| Container windows (pack, chest, stations, shop), book screens, tree, map, settings | Centred on the screen: `x = floor((Vw - w) / 2)`, `y = floor((Vh - h) / 2)`. Tabs above or to the left are not counted in `w` and `h`. The world behind is dimmed |
| Title, worlds, new world, join, loading | The ground tile over the whole screen; content in a column 200 wide centred on x; y measured from the top of a block 240 tall that is centred on the screen |
| Pause, the fall | The same column over the washed world |
| HUD, bottom centre | Hotbar, practice strip, pips, level, name of the thing in hand: centred on the stage, measured up from its bottom edge |
| HUD, top centre | Compass, boss bar, event strips, the readout of what is looked at: centred on the stage, measured down from its top edge |
| HUD, top left | The crew |
| HUD, left, above the pips | Chat |
| HUD, top right | Status frames, then toasts under them |
| HUD, right | The Guide's present step, then pickups, then "Saved" at the bottom right corner |
| HUD, centre | Crosshair; the prompt 12 units under its centre |
| Above everything | The tooltip, then the held stack, then the pointer |

**Icon size.** The interface is designed for item icons of 16 by 16 units, one icon pixel to the unit, and never draws an icon at another size. The large result slot holds a 16 by 16 icon in a 24 by 24 floor. Until the icons are redrawn by hand, the game hands the kit a 16 by 16 reading of each present 32 by 32 icon (the top left pixel of every 2 by 2 block).

---

## 4. Letters

Two faces, both drawn here, both stored as pixel maps. No other letter appears anywhere, a text field included.

### 4.1 The text face

| Measure | Units |
| --- | --- |
| Cell height, and the advance from one line to the next | 10 |
| Row 0 | accent row: the macron of Ā, Ī, Ū and nothing else |
| Rows 1 to 7 | capital height, 7. Ascenders are as tall as capitals. Digits are capital height |
| Rows 3 to 7 | x-height, 5 |
| Baseline | under row 7 |
| Rows 8 and 9 | descenders (g j p q y), the tail of the comma and semicolon, the underscore, the dot under ṭ |
| Between glyphs | 1, always. There is no kerning |
| Space | 3 wide, so it advances 4 |
| Between paragraphs | 4 extra |

The position of a piece of text is the top left of its cell. A title "at 8, 6" has its capitals from y 7 to y 13.

**Character.** The letters are cut, the way lines are cut in a hearthstone: every stroke is one unit wide and straight, and there is no curve anywhere. A bowl or an arch is a rectangle with two of its corners cut off by one unit, always the same two: the top right and the bottom left. The top left and the bottom right stay square, as if every letter had been cut with one flat chisel held one way. So `o` is square at the top left and bottom right; `n`, `h`, `m` and `r` have flat shoulders that start square from the stem; `u` and `w` are closed square at the bottom right; `b` and `p` end square at the foot of the bowl; `d` and `q` start square at its head. Four capitals with a stem on the left (B, D, P, R) have both free corners cut, so that D and O differ in two units. Diagonals are kept for the letters that are nothing else (A's apex is flat; K, M, N, V, W, X, Y, Z and the slash of 0 use them). Lowercase `m` and `w` are 7 wide so that their counters stay open. The crossbar of A sits low, on row 5. The face has no serif except the head and foot of `I` and the feet of `l` and `1`, which keep the three apart. It is not the face of any other game: do not correct it toward one.

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

n      o      p      q      r    s     t     u      v      w        x      y      z     
.....  .....  .....  .....  ...  ....  ....  .....  .....  .......  .....  .....  ....
.....  .....  .....  .....  ...  ....  ....  .....  .....  .......  .....  .....  ....
.....  .....  .....  .....  ...  ....  .#..  .....  .....  .......  .....  .....  ....
####.  ####.  ####.  #####  ###  .###  ####  #...#  #...#  #..#..#  #...#  #...#  ####
#...#  #...#  #...#  #...#  #..  #...  .#..  #...#  #...#  #..#..#  .#.#.  #...#  ..#.
#...#  #...#  #...#  #...#  #..  .##.  .#..  #...#  #...#  #..#..#  ..#..  #...#  .#..
#...#  #...#  #...#  #...#  #..  ...#  .#..  #...#  .#.#.  #..#..#  .#.#.  #...#  #...
#...#  .####  #####  .####  #..  ###.  ..##  .####  ..#..  .######  #...#  .####  ####
.....  .....  #....  ....#  ...  ....  ....  .....  .....  .......  .....  ....#  ....
.....  .....  #....  ....#  ...  ....  ....  .....  .....  .......  .....  ####.  ....
5      5      5      5      3    4     4     5      5      7        5      5      4

```

Marked letters and digits:

```
Ā      ā      Ī    ī    Ū      ū      ṭ     0      1      2      3      4      5      6      7      8      9      
.###.  .....  ###  ...  .###.  .....  ....  .....  .....  .....  .....  .....  .....  .....  .....  .....  .....
.....  .###.  ...  ###  .....  .###.  ....  ####.  ..#..  ####.  ####.  ...#.  #####  .####  #####  ####.  ####.
.###.  .....  ###  ...  #...#  .....  .#..  #...#  .##..  ....#  ....#  ..##.  #....  #....  ....#  #...#  #...#
#...#  ####.  .#.  .#.  #...#  #...#  ####  #..##  ..#..  ....#  ....#  .#.#.  ####.  #....  ....#  #...#  #...#
#...#  ....#  .#.  .#.  #...#  #...#  .#..  #.#.#  ..#..  ...#.  .###.  #..#.  ....#  ####.  ...#.  .###.  .####
#####  .####  .#.  .#.  #...#  #...#  .#..  ##..#  ..#..  ..#..  ....#  #####  ....#  #...#  ..#..  #...#  ....#
#...#  #...#  .#.  .#.  #...#  #...#  .#..  #...#  ..#..  .#...  ....#  ...#.  ....#  #...#  ..#..  #...#  ....#
#...#  .####  ###  .#.  .####  .####  ..##  .####  .###.  #####  ####.  ...#.  ####.  .####  ..#..  .####  ####.
.....  .....  ...  ...  .....  .....  ....  .....  .....  .....  .....  .....  .....  .....  .....  .....  .....
.....  .....  ...  ...  .....  .....  .#..  .....  .....  .....  .....  .....  .....  .....  .....  .....  .....
5      5      3    3    5      5      4     5      5      5      5      5      5      5      5      5      5

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

*    %      #      &      _      <    >    @        ~      ^    |  `   $      ×    …      °    
...  .....  .....  .....  .....  ...  ...  .......  .....  ...  .  ..  .....  ...  .....  ...
...  ##..#  .....  .##..  .....  ...  ...  .#####.  .....  .#.  #  #.  .####  ...  .....  ###
#.#  ##..#  .#.#.  #..#.  .....  ..#  #..  #.....#  .....  #.#  #  .#  #.#..  ...  .....  #.#
.#.  ...#.  #####  #..#.  .....  .#.  .#.  #.###.#  .##.#  ...  #  ..  #.#..  ...  .....  ###
#.#  ..#..  .#.#.  .##..  .....  #..  ..#  #.#.#.#  #..#.  ...  #  ..  .###.  #.#  .....  ...
...  .#...  #####  #..##  .....  .#.  .#.  #.####.  .....  ...  #  ..  ..#.#  .#.  .....  ...
...  #..##  .#.#.  #..#.  .....  ..#  #..  #......  .....  ...  #  ..  ..#.#  #.#  .....  ...
...  #..##  .....  .##.#  .....  ...  ...  .#####.  .....  ...  #  ..  ####.  ...  #.#.#  ...
...  .....  .....  .....  #####  ...  ...  .......  .....  ...  .  ..  .....  ...  .....  ...
...  .....  .....  .....  .....  ...  ...  .......  .....  ...  .  ..  .....  ...  .....  ...
3    5      5      5      5      3    3    7        5      3    1  2   5      3    5      3

```

In each sheet the first line names the glyph, `#` is ink, and the last line is its width. 107 glyphs with the space.

| Width | Glyphs |
| ---: | --- |
| 1 | i . : ! ' \| |
| 2 | l , ; ( ) [ ] backtick |
| 3 | space I j r Ī ī " { } - * < > ^ × ° |
| 4 | E F J L c f k s t z ṭ |
| 5 | 0 1 2 3 4 5 6 7 8 9 A B C D G H K N O P Q R S T U V X Y Z a b d e g h n o p q u v x y Ā ā Ū ū ? – + = / \ % # & _ ~ $ … |
| 7 | M W m w — @ |

**Marks.** The macron is 3 units wide on the accent row for a capital and on row 1 for a lowercase letter, with one empty row under it. Under a macron the capital A, I or U is drawn 6 tall, from row 2. `ī` loses its dot to the macron and is 3 wide. `ṭ` is not shown in play today and is drawn so that the codex can show the cutters' words. Any further marked letter is built the same way: a macron as above, a dot under on row 9, an acute as two units rising on rows 0 and 1.

**Symbols.** 13 marks are part of the face and are written in strings by name in braces, as `{lees} 240`. They take the colour of the text round them.

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

`{tofu}` is drawn for any character the face lacks; chat may contain any. `{lees}` is a jar: the mark for coin wherever coin is counted. `{lmb}`, `{rmb}`, `{mmb}` are the mouse with one button filled. `{step}` marks the present step of the Guide. `{shield}` marks defence.

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

For digits that have no room: a stack count of three digits, the time under a status frame, a page number, the ranks under a node, the life as a number beside the pips. Its letters are kept for the few strings already wired in it, but every HUD readout with a word in it (coordinates, the night, "Saved", a distance with its unit) is the text face in sentence case: at 3 by 5, capitals are hard to tell apart (Z from 2, U from V) and set in capitals they break the rule of case. It is never used for a label or a sentence. The 4 has its diagonal so that it is not read as H.

| Measure | Units |
| --- | --- |
| Cell height | 6: rows 0 to 4 are the glyph, row 5 is empty (the comma's tail uses it) |
| Advance from line to line | 6 |
| Between glyphs | 1 |
| Space | 2 wide |
| Shadow | by the same rule as the text face |

```
0    1    2    3    4    5    6    7    8    9    A    B    C    D    E    F    G    H    I    J    K    L    M      N     O    P    
##.  .#.  ##.  ##.  ..#  ###  ##.  ###  ##.  ##.  .#.  ##.  .##  ##.  ###  ###  .##  #.#  ###  ..#  #.#  #..  #...#  #..#  .#.  ##.
#.#  ##.  ..#  ..#  .##  #..  #..  ..#  #.#  #.#  #.#  #.#  #..  #.#  #..  #..  #..  #.#  .#.  ..#  #.#  #..  ##.##  ##.#  #.#  #.#
#.#  .#.  .#.  .#.  #.#  ##.  ###  .#.  ###  ###  ###  ##.  #..  #.#  ##.  ##.  #.#  ###  .#.  ..#  ##.  #..  #.#.#  #.##  #.#  ##.
#.#  .#.  #..  ..#  ###  ..#  #.#  .#.  #.#  ..#  #.#  #.#  #..  #.#  #..  #..  #.#  #.#  .#.  #.#  #.#  #..  #...#  #..#  #.#  #..
.##  ###  ###  ##.  ..#  ##.  .##  .#.  .##  .##  #.#  ##.  .##  ##.  ###  #..  .##  #.#  ###  .#.  #.#  ###  #...#  #..#  .#.  #..
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

It is drawn as nine slices with corners 3 by 3. The face of clay and timber is flat: no grain, no speckle, no second tone. Stone is dressed, as the stance says, and so not the grey of a plain slab: over its face lies the **tooling**, a tile 24 by 24 laid from the face's top left corner (3, 3), of short level strokes of `lt` 3 to 5 long, one to a course of six rows and staggered course to course (at 3, 2; 15, 8; 9, 14; 20, 20 wrapping). A light stroke is the bright floor of a chisel's cut; it is used rather than a dark one because a dark stroke beside ink reads as a dash. A stone slab 60 by 30:

```
     0         1         2         3         4         5
     012345678901234567890123456789012345678901234567890123456789
  0  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
  1  K1111111111111111111111111111111111111111111111111111111113K
  2  K1222222222222222222222222222222222222222222222222222222236K
  3  K1233333333333333333333333333333333333333333333333333333346K
  4  K1233333333333333333333333333333333333333333333333333333346K
  5  K1233322223333333333333333333322223333333333333333333322246K
  6  K1233333333333333333333333333333333333333333333333333333346K
  7  K1233333333333333333333333333333333333333333333333333333346K
  8  K1233333333333333333333333333333333333333333333333333333346K
  9  K1233333333333333333333333333333333333333333333333333333346K
 10  K1233333333333333333333333333333333333333333333333333333346K
 11  K1233333333333333322222333333333333333333322222333333333346K
 12  K1233333333333333333333333333333333333333333333333333333346K
 13  K1233333333333333333333333333333333333333333333333333333346K
 14  K1233333333333333333333333333333333333333333333333333333346K
 15  K1233333333333333333333333333333333333333333333333333333346K
 16  K1233333333333333333333333333333333333333333333333333333346K
 17  K1233333333322233333333333333333333322233333333333333333346K
 18  K1233333333333333333333333333333333333333333333333333333346K
 19  K1233333333333333333333333333333333333333333333333333333346K
 20  K1233333333333333333333333333333333333333333333333333333346K
 21  K1233333333333333333333333333333333333333333333333333333346K
 22  K1233333333333333333333333333333333333333333333333333333346K
 23  K1223333333333333333333222223333333333333333333222223333346K
 24  K1233333333333333333333333333333333333333333333333333333346K
 25  K1233333333333333333333333333333333333333333333333333333346K
 26  K1233333333333333333333333333333333333333333333333333333346K
 27  K1344444444444444444444444444444444444444444444444444444446K
 28  K3666666666666666666666666666666666666666666666666666666666K
 29  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
```
`. nothing  1 hi  2 lt  3 face  4 sh  6 pit  K root.0   (digits are tones of the host slab's ramp; shown in stone)`

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

18 by 18, holding a 16 by 16 icon at 1, 1. Sunk: `pit` along the top and left, `hi` along the bottom and right, `face` at the two corners where they meet, floor `dk`.

```
     0         1       
     012345678901234567
  0  666666666666666663
  1  655555555555555551
  2  655555555555555551
  3  655555555555555551
  4  655555555555555551
  5  655555555555555551
  6  655555555555555551
  7  655555555555555551
  8  655555555555555551
  9  655555555555555551
 10  655555555555555551
 11  655555555555555551
 12  655555555555555551
 13  655555555555555551
 14  655555555555555551
 15  655555555555555551
 16  655555555555555551
 17  311111111111111111
```
`. nothing  1 hi  3 face  5 dk  6 pit   (digits are tones of the host slab's ramp; shown in timber)`

Slots stand in grids with no gap, so a grid of nine is 162 wide. The hotbar row of a pack stands 4 units below the three rows above it.

States, left to right: hovered (floor `sh`); accepts the held stack (a frame of `growth` on the floor's edge; shown on equipment, fuel and ore slots while a fitting thing is held); refused (the same frame in `blood`, for 0.3 s after a click the game refuses); chosen (frame of `salt`: the hotbar slot in hand, as seen in the pack); locked (floor `face`: a place that shows a thing built in and takes nothing).

```
     0         1         2         3         4         5         6         7         8         9       
     01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567
  0  666666666666666663..666666666666666663..666666666666666663..666666666666666663..666666666666666663
  1  644444444444444441..6NNNNNNNNNNNNNNNN1..6RRRRRRRRRRRRRRRR1..6WWWWWWWWWWWWWWWW1..633333333333333331
  2  644444444444444441..6N55555555555555N1..6R55555555555555R1..6W55555555555555W1..633333333333333331
  3  644444444444444441..6N55555555555555N1..6R55555555555555R1..6W55555555555555W1..633333333333333331
  4  644444444444444441..6N55555555555555N1..6R55555555555555R1..6W55555555555555W1..633333333333333331
  5  644444444444444441..6N55555555555555N1..6R55555555555555R1..6W55555555555555W1..633333333333333331
  6  644444444444444441..6N55555555555555N1..6R55555555555555R1..6W55555555555555W1..633333333333333331
  7  644444444444444441..6N55555555555555N1..6R55555555555555R1..6W55555555555555W1..633333333333333331
  8  644444444444444441..6N55555555555555N1..6R55555555555555R1..6W55555555555555W1..633333333333333331
  9  644444444444444441..6N55555555555555N1..6R55555555555555R1..6W55555555555555W1..633333333333333331
 10  644444444444444441..6N55555555555555N1..6R55555555555555R1..6W55555555555555W1..633333333333333331
 11  644444444444444441..6N55555555555555N1..6R55555555555555R1..6W55555555555555W1..633333333333333331
 12  644444444444444441..6N55555555555555N1..6R55555555555555R1..6W55555555555555W1..633333333333333331
 13  644444444444444441..6N55555555555555N1..6R55555555555555R1..6W55555555555555W1..633333333333333331
 14  644444444444444441..6N55555555555555N1..6R55555555555555R1..6W55555555555555W1..633333333333333331
 15  644444444444444441..6N55555555555555N1..6R55555555555555R1..6W55555555555555W1..633333333333333331
 16  644444444444444441..6NNNNNNNNNNNNNNNN1..6RRRRRRRRRRRRRRRR1..6WWWWWWWWWWWWWWWW1..633333333333333331
 17  311111111111111111..311111111111111111..311111111111111111..311111111111111111..311111111111111111
```
`. nothing  1 hi  3 face  4 sh  5 dk  6 pit  N growth  R blood  W salt   (digits are tones of the host slab's ramp; shown in timber)`

The hover changes the floor under the icon and nothing else. It does not tint the icon.

**Stack count.** In the text face, `salt` with its shadow, right-aligned so that its last column is the slot's x 15, cell at y 8 (digits on rows 9 to 15). The count and its shadow stay on the floor: the shadow's column 16 and row 16 keep the digits off the light edge, where salt digits would run into the bright rim and into the next slot's count. A count of 100 or more no longer fits 15 units in the text face and is written in the small face, last column on x 15, lowest row on y 15. A count of 1 is not written. The large slot places its count the same way from its own floor's bottom right, x 23 and y 23.

```
     0         1       
     012345678901234567
  0  666666666666666663
  1  655555555555555551
  2  655555555555555551
  3  655555555555555551
  4  655555555555555551
  5  655555555555555551
  6  655555555555555551
  7  655555555555555551
  8  655555555555555551
  9  655555WWWW5555W551
 10  65555W5KKKK55WWK51
 11  65555WK55555W5WK51
 12  65555WWWW55W5KWK51
 13  65555WKKKW5WWWWW51
 14  65555WK55WK5KKWKK1
 15  655555WWWWK555WK51
 16  6555555KKKK5555K51
 17  311111111111111111
```
`. nothing  1 hi  3 face  5 dk  6 pit  K root.0  W salt   (digits are tones of the host slab's ramp; shown in timber)`

**A thing that is missing** (a pattern laid out that the pack cannot fill, a kind not yet seen in the codex) is drawn as its icon's silhouette in one flat tone, `sh` of the host ramp, never as a faded icon.

**The large slot**, 26 by 26, for the result of a station. Floor 24 by 24; the icon at 5, 5.

```
     0         1         2     
     01234567890123456789012345
  0  66666666666666666666666663
  1  65555555555555555555555551
  2  65555555555555555555555551
  3  65555555555555555555555551
  4  65555555555555555555555551
  5  65555555555555555555555551
  6  65555555555555555555555551
  7  65555555555555555555555551
  8  65555555555555555555555551
  9  65555555555555555555555551
 10  65555555555555555555555551
 11  65555555555555555555555551
 12  65555555555555555555555551
 13  65555555555555555555555551
 14  65555555555555555555555551
 15  65555555555555555555555551
 16  65555555555555555555555551
 17  65555555555555555555555551
 18  65555555555555555555555551
 19  65555555555555555555555551
 20  65555555555555555555555551
 21  65555555555555555555555551
 22  65555555555555555555555551
 23  65555555555555555555555551
 24  65555555555555555555555551
 25  31111111111111111111111111
```
`. nothing  1 hi  3 face  5 dk  6 pit   (digits are tones of the host slab's ramp; shown in timber)`

**A slot on a dark plate** (hotbar, toast, readout, the cells of a pattern list). Floor `root.0`, light edge `root.3`; hovered floor `root.2`.

```
     0         1         2         3       
     01234567890123456789012345678901234567
  0  KKKKKKKKKKKKKKKKKk..KKKKKKKKKKKKKKKKKk
  1  KKKKKKKKKKKKKKKKKh..Kjjjjjjjjjjjjjjjjh
  2  KKKKKKKKKKKKKKKKKh..Kjjjjjjjjjjjjjjjjh
  3  KKKKKKKKKKKKKKKKKh..Kjjjjjjjjjjjjjjjjh
  4  KKKKKKKKKKKKKKKKKh..Kjjjjjjjjjjjjjjjjh
  5  KKKKKKKKKKKKKKKKKh..Kjjjjjjjjjjjjjjjjh
  6  KKKKKKKKKKKKKKKKKh..Kjjjjjjjjjjjjjjjjh
  7  KKKKKKKKKKKKKKKKKh..Kjjjjjjjjjjjjjjjjh
  8  KKKKKKKKKKKKKKKKKh..Kjjjjjjjjjjjjjjjjh
  9  KKKKKKKKKKKKKKKKKh..Kjjjjjjjjjjjjjjjjh
 10  KKKKKKKKKKKKKKKKKh..Kjjjjjjjjjjjjjjjjh
 11  KKKKKKKKKKKKKKKKKh..Kjjjjjjjjjjjjjjjjh
 12  KKKKKKKKKKKKKKKKKh..Kjjjjjjjjjjjjjjjjh
 13  KKKKKKKKKKKKKKKKKh..Kjjjjjjjjjjjjjjjjh
 14  KKKKKKKKKKKKKKKKKh..Kjjjjjjjjjjjjjjjjh
 15  KKKKKKKKKKKKKKKKKh..Kjjjjjjjjjjjjjjjjh
 16  KKKKKKKKKKKKKKKKKh..Kjjjjjjjjjjjjjjjjh
 17  khhhhhhhhhhhhhhhhh..khhhhhhhhhhhhhhhhh
```
`. nothing  h root.3  j root.2  k root.1  K root.0`

### 5.5 Silhouettes of empty slots

An empty slot that takes one kind of thing shows that thing as a silhouette in `sh` on the floor. Nine exist. Head, body, legs:

```
     0         1         2         3         4         5       
     0123456789012345678901234567890123456789012345678901234567
  0  666666666666666663..666666666666666663..666666666666666663
  1  655555555555555551..655555555555555551..655555555555555551
  2  655555555555555551..655444555555444551..655544444444445551
  3  655554444444455551..654444455554444451..655544444444445551
  4  655544444444445551..654444444444444451..655544444444445551
  5  655444444444444551..654444444444444451..655544445544445551
  6  655444444444444551..654454444444454451..655544445544445551
  7  655444444444444551..654454444444454451..655544445544445551
  8  655444455554444551..655554444444455551..655544445544445551
  9  655444555555444551..655554444444455551..655544445544445551
 10  655444555555444551..655554444444455551..655544445544445551
 11  655444555555444551..655554444444455551..655544445544445551
 12  655444555555444551..655554444444455551..655544445544445551
 13  655445555555544551..655554444444455551..655444445544444551
 14  655555555555555551..655544444444445551..655444445544444551
 15  655555555555555551..655555555555555551..655555555555555551
 16  655555555555555551..655555555555555551..655555555555555551
 17  311111111111111111..311111111111111111..311111111111111111
```
`. nothing  1 hi  3 face  4 sh  5 dk  6 pit   (digits are tones of the host slab's ramp; shown in timber)`

Trinket, what a furnace works, fuel:

```
     0         1         2         3         4         5       
     0123456789012345678901234567890123456789012345678901234567
  0  666666666666666663..666666666666666663..666666666666666663
  1  655555555555555551..655555555555555551..655555555555555551
  2  655555555555555551..655555555555555551..655555554555555551
  3  655555544445555551..655555544445555551..655555554455555551
  4  655555444444555551..655554444444455551..655555544455555551
  5  655555544445555551..655544444444445551..655555544445555551
  6  655555444444555551..655544444444444551..655555444445545551
  7  655554455554455551..655444444444444551..655554444444545551
  8  655544555555445551..655444444444444551..655554444444445551
  9  655544555555445551..655444444444444451..655544444444444551
 10  655544555555445551..654444444444444451..655544445444444551
 11  655544555555445551..654444444444444451..655544455544444551
 12  655554455554455551..655444444444444551..655544455544444551
 13  655555444444555551..655544444444445551..655554455544445551
 14  655555544445555551..655555555555555551..655555445444455551
 15  655555555555555551..655555555555555551..655555555555555551
 16  655555555555555551..655555555555555551..655555555555555551
 17  311111111111111111..311111111111111111..311111111111111111
```
`. nothing  1 hi  3 face  4 sh  5 dk  6 pit   (digits are tones of the host slab's ramp; shown in timber)`

A bar, a key, a piece to rework:

```
     0         1         2         3         4         5       
     0123456789012345678901234567890123456789012345678901234567
  0  666666666666666663..666666666666666663..666666666666666663
  1  655555555555555551..655555555555555551..655555555555555551
  2  655555555555555551..655555555555555551..655555555555544551
  3  655555555555555551..655555555555555551..655555555555444551
  4  655555555555555551..655544445555555551..655555555554445551
  5  655554444444445551..655445544555555551..655555555544455551
  6  655544444444444551..655455554555555551..655555555444555551
  7  655444444444444451..655455554444444451..655555554445555551
  8  655444444444444451..655455554444444451..655555544455555551
  9  654444444444444451..655445544555454551..655455444555555551
 10  654444444444444551..655544445555454551..655444445555555551
 11  654444444444444551..655555555555555551..655544455555555551
 12  655555555555555551..655555555555555551..655444445555555551
 13  655555555555555551..655555555555555551..654455445555555551
 14  655555555555555551..655555555555555551..654555555555555551
 15  655555555555555551..655555555555555551..655555555555555551
 16  655555555555555551..655555555555555551..655555555555555551
 17  311111111111111111..311111111111111111..311111111111111111
```
`. nothing  1 hi  3 face  4 sh  5 dk  6 pit   (digits are tones of the host slab's ramp; shown in timber)`

### 5.6 Button

Always dressed stone, on any slab and on the ground tile. The classic button is 200 by 20; half is 98 by 20 (two with a gap of 4); the worlds screen uses 136 by 20. Inside windows a small button is 12, 14 or 16 tall and as wide as its label plus 10.

From the top: outline `root.0` with corners left out; one row `stone.lt`; the face `stone.sh`; one row `stone.dk`; one row `stone.pit`; outline. The face of a button 20 tall carries tooling: strokes 3 units long rising to the right in `stone.dk`, one every 16 units starting at x 6 on rows 5 to 3, and one every 16 units starting at x 14 on rows 15 to 13. Smaller buttons have no tooling. The label is centred, `salt` with its shadow; its cell is at `y = floor((h - 9) / 2)`, which puts the capitals of a button 20 tall on rows 6 to 12.

Normal and hovered. Hovered: the outline turns `salt`, the top row `stone.hi`, the label `ember.hi`. A button with keyboard focus has the `salt` outline and keeps its `salt` label.

```
     0         1         2         3         4         5         6         7         8         9        
     012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678
  0  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.....WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW.
  1  KGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGK...WAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAW
  2  KJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJK...WJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJW
  3  KJJJJJJJMJJJJJJJJJJJJJJJMJJJJJJJJJJJJJJJMJJJJJJK...WJJJJJJJMJJJJJJJJJJJJJJJMJJJJJJJJJJJJJJJMJJJJJJW
  4  KJJJJJJMJJJJJJJJJJJJJJJMJJJJJJJJJJJJJJJMJJJJJJJK...WJJJJJJMJJJJJJJJJJJJJJJMJJJJJJJJJJJJJJJMJJJJJJJW
  5  KJJJJJMJJJJJJJJJJJJJJJMJJJJJJJJJJJJJJJMJJJJJJJJK...WJJJJJMJJJJJJJJJJJJJJJMJJJJJJJJJJJJJJJMJJJJJJJJW
  6  KJJJJJJJJJJJJJWWWWJJWJJJJJJJJJJJJJJJJJJJJJJJJJJK...WJJJJJJJJJJJJJyyyyJJyJJJJJJJJJJJJJJJJJJJJJJJJJJW
  7  KJJJJJJJJJJJJJWKKKWJWKJJJJJJJJJJJJJJJJJJJJJJJJJK...WJJJJJJJJJJJJJyKKKyJyKJJJJJJJJJJJJJJJJJJJJJJJJJW
  8  KJJJJJJJJJJJJJWKJJWKWKJWWWWJJWJJJWJJJJJJJJJJJJJK...WJJJJJJJJJJJJJyKJJyKyKJyyyyJJyJJJyJJJJJJJJJJJJJW
  9  KJJJJJJJJJJJJJWWWWJKWKJJKKKWJWKJJWKJJJJJJJJJJJJK...WJJJJJJJJJJJJJyyyyJKyKJJKKKyJyKJJyKJJJJJJJJJJJJW
 10  KJJJJJJJJJJJJJWKKKKJWKJJWWWWKWKJJWKJJJJJJJJJJJJK...WJJJJJJJJJJJJJyKKKKJyKJJyyyyKyKJJyKJJJJJJJJJJJJW
 11  KJJJJJJJJJJJJJWKJJJJWKJWJKKWKWKJJWKJJJJJJJJJJJJK...WJJJJJJJJJJJJJyKJJJJyKJyJKKyKyKJJyKJJJJJJJJJJJJW
 12  KJJJJJJJJJJJJJWKJJJJWWJJWWWWKJWWWWKJJJJJJJJJJJJK...WJJJJJJJJJJJJJyKJJJJyyJJyyyyKJyyyyKJJJJJJJJJJJJW
 13  KJJJJJJJJJJJJJJKMJJJJKKJJKKKKJJKKWKJJJJJJJJJJJJK...WJJJJJJJJJJJJJJKMJJJJKKJJKKKKJJKKyKJJJJJJJJJJJJW
 14  KJJJJJJJJJJJJJJMJJJJJJJJJJJJJWWWWJKJJJJJJJJJJJJK...WJJJJJJJJJJJJJJMJJJJJJJJJJJJJyyyyJKJJJJJJJJJJJJW
 15  KJJJJJJJJJJJJJMJJJJJJJJJJJJJJJKKKKJJJJJJJJJJJJJK...WJJJJJJJJJJJJJMJJJJJJJJJJJJJJJKKKKJJJJJJJJJJJJJW
 16  KJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJK...WJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJW
 17  KMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMK...WMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMW
 18  KzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzK...WzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzW
 19  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.....WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW.
```
`. nothing  A stone.hi  G stone.lt  J stone.sh  K root.0  M stone.dk  W salt  y ember.hi  z stone.pit`

Pressed and disabled. Pressed: the top two rows turn `stone.pit` and `stone.dk`, the bottom keeps one row of `stone.dk`, and tooling and label drop one unit. Disabled: a flat face of `stone.pit` with one row of `stone.dk` at the bottom, label `root.4` with no shadow, no tooling.

```
     0         1         2         3         4         5         6         7         8         9        
     012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678
  0  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.....KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
  1  KzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzK...KzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzK
  2  KMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMK...KzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzK
  3  KJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJK...KzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzK
  4  KJJJJJJJMJJJJJJJJJJJJJJJMJJJJJJJJJJJJJJJMJJJJJJK...KzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzK
  5  KJJJJJJMJJJJJJJJJJJJJJJMJJJJJJJJJJJJJJJMJJJJJJJK...KzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzK
  6  KJJJJJMJJJJJJJJJJJJJJJMJJJJJJJJJJJJJJJMJJJJJJJJK...KzzzzzzzzzzzzzggggzzgzzzzzzzzzzzzzzzzzzzzzzzzzzK
  7  KJJJJJJJJJJJJJWWWWJJWJJJJJJJJJJJJJJJJJJJJJJJJJJK...KzzzzzzzzzzzzzgzzzgzgzzzzzzzzzzzzzzzzzzzzzzzzzzK
  8  KJJJJJJJJJJJJJWKKKWJWKJJJJJJJJJJJJJJJJJJJJJJJJJK...KzzzzzzzzzzzzzgzzzgzgzzggggzzgzzzgzzzzzzzzzzzzzK
  9  KJJJJJJJJJJJJJWKJJWKWKJWWWWJJWJJJWJJJJJJJJJJJJJK...KzzzzzzzzzzzzzggggzzgzzzzzzgzgzzzgzzzzzzzzzzzzzK
 10  KJJJJJJJJJJJJJWWWWJKWKJJKKKWJWKJJWKJJJJJJJJJJJJK...KzzzzzzzzzzzzzgzzzzzgzzzggggzgzzzgzzzzzzzzzzzzzK
 11  KJJJJJJJJJJJJJWKKKKJWKJJWWWWKWKJJWKJJJJJJJJJJJJK...KzzzzzzzzzzzzzgzzzzzgzzgzzzgzgzzzgzzzzzzzzzzzzzK
 12  KJJJJJJJJJJJJJWKJJJJWKJWJKKWKWKJJWKJJJJJJJJJJJJK...KzzzzzzzzzzzzzgzzzzzggzzggggzzggggzzzzzzzzzzzzzK
 13  KJJJJJJJJJJJJJWKJJJJWWJJWWWWKJWWWWKJJJJJJJJJJJJK...KzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzgzzzzzzzzzzzzzK
 14  KJJJJJJJJJJJJJJKMJJJJKKJJKKKKJJKKWKJJJJJJJJJJJJK...KzzzzzzzzzzzzzzzzzzzzzzzzzzzzggggzzzzzzzzzzzzzzK
 15  KJJJJJJJJJJJJJJMJJJJJJJJJJJJJWWWWJKJJJJJJJJJJJJK...KzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzK
 16  KJJJJJJJJJJJJJMJJJJJJJJJJJJJJJKKKKJJJJJJJJJJJJJK...KzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzK
 17  KJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJK...KzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzK
 18  KMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMK...KMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMK
 19  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.....KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
```
`. nothing  g root.4  J stone.sh  K root.0  M stone.dk  W salt  z stone.pit`

Small buttons, 12, 14 and 16 tall, and the 12 by 12 "+":

```
     0         1         2         3         4         5         6         7         8         9         0         1         2         3         4         5    
     01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234
  0  .KKKKKKKKKKKKKKKKKKKKKKKKKKKK.....KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.....KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.....KKKKKKKKKK.
  1  KGGGGGGGGGGGGGGGGGGGGGGGGGGGGK...KGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGK...KGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGK...KGGGGGGGGGGK
  2  KJJJJJWWWWJJJJJJJJJJJJJJJJJJJK...KJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJK...KJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJK...KJJJJJJJJJJK
  3  KJJJJWJKKKKJJJJJJJJJJJWJJJJJJK...KJJJJJJJJJJWWWWWJJJJJJJWJJJJJJJJJJJJJJJJJJJK...KJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJK...KJJJJJWJJJJK
  4  KJJJJWKJJJJWWWWJJWWWJWWWWJJJJK...KJJJJJJJJJJJKWKKKJJJJJJWKJJJJJJJJJJJJJJJJJJK...KJJJJJJJJJJJJJJJJJJWWWWJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJK...KJJJJJWKJJJK
  5  KJJJJJWWWJJWKKKWJWKKKJWKKKJJJK...KJJJJJJJJJJJJWKJJWWWWJJWKJWJWWWWJJJJJJJJJJJK...KJJJJJJJJJJJJJJJJJJWKKKWJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJK...KJJJWWWWWJJK
  6  KJJJJJJKKWJWKJJWKWKJJJWKJJJJJK...KJJJJJJJJJJJJWKJJJKKKWJWKWJKWKKKWJJJJJJJJJJK...KJJJJJJJJJJJJJJJJJJWKJJWKWWWWJJWWWWJJWWWWJJJJJJJJJJJJJJJJJJK...KJJJJKWKKKJK
  7  KJJJJJJJJWKWKJJWKWKJJJWKJJJJJK...KJJJJJJJJJJJJWKJJJWWWWKWWJKJWWWWWKJJJJJJJJJK...KJJJJJJJJJJJJJJJJJJWKJJWKWKKKWJWKKKWJWKKKWJJJJJJJJJJJJJJJJJK...KJJJJJWKJJJK
  8  KJJJJWWWWJKJWWWWKWKJJJJWWJJJJK...KJJJJJJJJJJJJWKJJWJKKWKWKWJJWKKKKKJJJJJJJJJK...KJJJJJJJJJJJJJJJJJJWKJJWKWKJJWKWKJJWKWWWWWKJJJJJJJJJJJJJJJJK...KJJJJJJKJJJK
  9  KMMMMMKKKKMMMKKKKMKMMMMMKKMMMK...KJJJJJJJJJJJJWKJJJWWWWKWKJWJJWWWWJJJJJJJJJJK...KJJJJJJJJJJJJJJJJJJWKJJWKWKJJWKWKJJWKWKKKKKJJJJJJJJJJJJJJJJK...KMMMMMMMMMMK
 10  KzzzzzzzzzzzzzzzzzzzzzzzzzzzzK...KJJJJJJJJJJJJJKJJJJKKKKJKJJKJJKKKKJJJJJJJJJK...KJJJJJJJJJJJJJJJJJJWWWWJKJWWWWKWKJJWKJWWWWJJJJJJJJJJJJJJJJJK...KzzzzzzzzzzK
 11  .KKKKKKKKKKKKKKKKKKKKKKKKKKKK....KMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMK...KJJJJJJJJJJJJJJJJJJJKKKKJJJKKKKJKJJJKJJKKKKJJJJJJJJJJJJJJJJK....KKKKKKKKKK.
 12  .................................KzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzK...KJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJK...............
 13  ..................................KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK....KMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMK...............
 14  ................................................................................KzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzK...............
 15  .................................................................................KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK................
```
`. nothing  G stone.lt  J stone.sh  K root.0  M stone.dk  W salt  z stone.pit`

A button that steps through values (the kind of pattern, a graphics preset) is this same button; its label is the present value.

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

A tab's name is its tooltip. A tab that cannot be chosen yet is not drawn.

### 5.8 Dark well, list row, scroll track

A list lives in a well: a sunk rectangle with `root.0` along the top and left, a light edge along the bottom and right and a floor of `root.1`. The light edge is the `hi` of the slab the well is sunk in (`salt` on clay, as drawn here) and `stone.lt` on the ground tile. Fields, checkboxes and slider grooves take their light edge by the same rule. Rows are 18 tall and as wide as the floor less the scroll track. In a row: the icon at 1, 1; the name's cell at 20, 4, `salt` or a grade's colour, with shadow; a number right-aligned 3 units from the row's right end. A hovered row has a floor of `root.2`. The chosen row has a floor of `root.3` and a frame of `salt`. A row that cannot be used is all `root.4`.

The scroll track is the last 6 units of the floor, `root.0`. Its thumb is `root.3` with a top row of `root.4`, a bottom row of `root.2` and three grip rows of `root.1` at its middle; hovered or dragged, the thumb is `root.4` with a top row of `salt`. The thumb is never shorter than 12. A list that fits has no track and its rows take the whole floor.

```
     0         1         2         3         4         5         6         7         
     01234567890123456789012345678901234567890123456789012345678901234567890123456789
  0  KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
  1  KjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjKKKKKKW
  2  KjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjKKKKKKW
  3  KjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjKKKKKKW
  4  KjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjggggggW
  5  KjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjhhhhhhW
  6  KjjjjjjjjjjjjjjjjjjjjWWWWjjjjjjjjWjjjjjWjjjjjWjjjjjjjjjjjjjjjWjjjWWWWjjjjhhhhhhW
  7  KjjjjjjjjjjjjjjjjjjjjWKKKWjjjjjjjWKjjjjWKjjjjWKjjjjjjjjjjjjjWWKjjjKKKWjjjhhhhhhW
  8  KjjjjjjjjjjjjjjjjjjjjWKjjWKWjjjWjWWWWjjWWWWjjWKjWWWWjjjjjjjjjWKjjjjjjWKjjhhhhhhW
  9  KjjjjjjjjjjjjjjjjjjjjWWWWjKWKjjWKWKKKWjWKKKWjWKjWKKKWjjjjjjjjWKjjjjjWjKjjhkkkkhW
 10  KjjjjjjjjjjjjjjjjjjjjWKWKKjWKjjWKWKjjWKWKjjWKWKjWWWWWKjjjjjjjWKjjjjWjKjjjhhhhhhW
 11  KjjjjjjjjjjjjjjjjjjjjWKjWjjWKjjWKWKjjWKWKjjWKWKjWKKKKKjjjjjjjWKjjjWjKjjjjhkkkkhW
 12  KjjjjjjjjjjjjjjjjjjjjWKjjWjjWWWWKWWWWWKWWWWWKWWjjWWWWjjjjjjjWWWjjWWWWWjjjhhhhhhW
 13  KjjjjjjjjjjjjjjjjjjjjjKjjjKjjKKKKjKKKKKjKKKKKjKKjjKKKKjjjjjjjKKKjjKKKKKjjhkkkkhW
 14  KjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjhhhhhhW
 15  KjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjhhhhhhW
 16  KjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjhhhhhhW
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

A sunk dark field, 14 tall in a window and 16 tall in a full-screen menu, with the edges of a well. The text's cell is at 4, 2 (4, 3 when 16 tall), `salt` with shadow. With focus it has a frame of `salt` inside its edges and a caret: one unit wide, 10 tall, `salt`, one unit after the last glyph, on for 0.5 s and off for 0.5 s. A selection is a fill of `arm.dk` behind the selected glyphs. The placeholder is `root.4` with no shadow. A refused key gives the field a frame of `blood` for 0.3 s. Text longer than the field scrolls so that the caret stays inside.

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

12 by 12, with the edges of a well. On: the check mark in `salt`, 7 by 5 at 2, 3. Hovered or focused: a frame of `salt` inside. Its label is ink on the slab, cell at x + 15, y + 1.

```
     0         1         2     
     01234567890123456789012345
  0  KKKKKKKKKKK...KKKKKKKKKKK.
  1  KkkkkkkkkkkW..KkkkkkkkkkkW
  2  KkkkkkkkkkkW..KkkkkkkkkkkW
  3  KkkkkkkkWkkW..KkkkkkkkkkkW
  4  KkkkkkkWkkkW..KkkkkkkkkkkW
  5  KkWkkkWkkkkW..KkkkkkkkkkkW
  6  KkkWkWkkkkkW..KkkkkkkkkkkW
  7  KkkkWkkkkkkW..KkkkkkkkkkkW
  8  KkkkkkkkkkkW..KkkkkkkkkkkW
  9  KkkkkkkkkkkW..KkkkkkkkkkkW
 10  KkkkkkkkkkkW..KkkkkkkkkkkW
 11  .WWWWWWWWWWW...WWWWWWWWWWW
```
`. nothing  k root.1  K root.0  W salt`

### 5.11 Slider

A row 14 tall. The groove is 6 tall at y 4: `root.0` along its top and left, `hi` of the host ramp along its bottom and right, floor `root.1`, and `root.4` from its left end to the handle. The handle is 7 by 14: outline, a top row of `stone.lt`, a body of `stone.sh` with one grip column of `stone.dk`, two bottom rows of `stone.dk`. Hovered, dragged or focused, the handle's outline is `salt`. The handle moves by whole units; a slider 80 wide has 72 stops, and the value snaps to the nearest step of its setting.

```
     0         1         2         3         4         5         
     012345678901234567890123456789012345678901234567890123456789
  0  ......................KKKKK.................................
  1  .....................KGGGGGK................................
  2  .....................KJJJJJK................................
  3  .....................KJJJJJK................................
  4  KKKKKKKKKKKKKKKKKKKKKKJJMJJKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
  5  KggggggggggggggggggggKJJMJJKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk1
  6  KggggggggggggggggggggKJJMJJKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk1
  7  KggggggggggggggggggggKJJMJJKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk1
  8  KggggggggggggggggggggKJJMJJKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk1
  9  .11111111111111111111KJJJJJK11111111111111111111111111111111
 10  .....................KJJJJJK................................
 11  .....................KMMMMMK................................
 12  .....................KMMMMMK................................
 13  ......................KKKKK.................................
```
`. nothing  1 hi  g root.4  G stone.lt  J stone.sh  k root.1  K root.0  M stone.dk   (digits are tones of the host slab's ramp; shown in timber)`

### 5.12 Tooltip

A dark plate with a frame in the colour of the thing's grade (`root.4` for Surface and for anything that is not an item). The first cell is at 5, 3. Lines advance 10. After the first line 2 extra units. Width is the widest line plus 10; height is 10 to the line plus 7, plus the 2 when there is more than one line. Lines wrap at 180.

Order of lines: the name in the grade's colour; the grade and kind in `root.4` ("Deep, tool"); what it does in `salt`; lines that compare, `growth.lt` or `blood.lt`; a set line in `arm.lt`; the telling of the thing in `root.4`; last, what the mouse does here in `root.4` with the mouse symbols.

```
     0         1         2         3         4         5         
     012345678901234567890123456789012345678901234567890123456789
  0  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
  1  KccccccccccccccccccccccccccccccccccccccccccccccccccccccccccK
  2  KckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkcK
  3  KckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkcK
  4  KckkkckkkckccckkkkkkkkkkkckkkkkkkkcccckkckkkkkkckkkkkkkkkkcK
  5  KckkkcKkkcKkKKKkkkkkkkkkkcKkkkkkkkcKKKckkKkkkkkcKkkkkkkkkkcK
  6  KckkkcKkkcKkckkccckcccckkcKkckkkkkcKkkcKckcccckcKkckkkkkkkcK
  7  KckkkcccccKkcKkcKKKkKKKckcKckKkkkkcccckKcKcKKKKcKckKkkkkkkcK
  8  KckkkcKKKcKkcKkcKkkkccccKcckKkkkkkcKKKKkcKcKkkkcckKkkkkkkkcK
  9  KckkkcKkkcKkcKkcKkkckKKcKcKckkkkkkcKkkkkcKcKkkkcKckkkkkkkkcK
 10  KckkkcKkkcKkcKkcKkkkccccKcKkckkkkkcKkkkkcKkccckcKkckkkkkkkcK
 11  KckkkkKkkkKkkKkkKkkkkKKKKkKkkKkkkkkKkkkkkKkkKKKkKkkKkkkkkkcK
 12  KckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkcK
 13  KckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkcK
 14  KckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkcK
 15  KckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkcK
 16  KckkkggggkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkgkkkkcK
 17  KckkkgKKKgkkkkkkkkkkkkkkkkkkkkkkkkkkkgkkkkkkkkkkkkkkkgKkkkcK
 18  KckkkgKkkgKggggkkggggkkggggkkkkkkkkkggggkggggkkggggkkgKkkkcK
 19  KckkkgKkkgKgKKKgkgKKKgkgKKKgkkkkkkkkkgKKKgKKKgkgKKKgkgKkkkcK
 20  KckkkgKkkgKgggggKgggggKgKkkgKkkkkkkkkgKkkgKkkgKgKkkgKgKkkkcK
 21  KckkkgKkkgKgKKKKKgKKKKKgKkkgKkkkkkkkkgKkkgKkkgKgKkkgKgKkkkcK
 22  KckkkggggkKkggggkkggggkgggggKkgkkkkkkkggkkggggKkggggKggkkkcK
 23  KckkkkKKKKkkkKKKKkkKKKKgKKKKKgkKkkkkkkkKKkkKKKKkkKKKKkKKkkcK
 24  KckkkkkkkkkkkkkkkkkkkkkgKkkkkkKkkkkkkkkkkkkkkkkkkkkkkkkkkkcK
 25  KckkkkkkkkkkkkkkkkkkkkkkKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkcK
 26  KckkkkkkkkknnnnkkkkkkkkkkkkkkkkkkkkkkkkkkknkkkkkkkkkkkkkkkcK
 27  KckkkkknkkkkKKKnkkkkkkkkkkkkkkkkkkkkkkkkkknKkkkkkkkkkkkkkkcK
 28  KckkkkknKkkkkkknKkkkknnnknnnnkknnnnkknnnnknnnnkkkkkkkkkkkkcK
 29  KckkknnnnnkkkknkKkkkknKKKnKKKnkkKKKnknKKKKnKKKnkkkkkkkkkkkcK
 30  KckkkkKnKKKkknkKkkkkknKkknnnnnKknnnnKnKkkknKkknKkkkkkkkkkkcK
 31  KckkkkknKkkknkKkkkkkknKkknKKKKKnkKKnKnKkkknKkknKkkkkkkkkkkcK
 32  KckkkkkkKkknnnnnkkkkknKkkknnnnkknnnnKknnnknKkknKkkkkkkkkkkcK
 33  KckkkkkkkkkkKKKKKkkkkkKkkkkKKKKkkKKKKkkKKKkKkkkKkkkkkkkkkkcK
 34  KckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkcK
 35  KckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkcK
 36  KckkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkcK
 37  KccccccccccccccccccccccccccccccccccccccccccccccccccccccccccK
 38  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
```
`. nothing  c cyan.lt  g root.4  k root.1  K root.0  n growth.lt`

**A named old thing** has a second frame of `salt` inside the first; its first cell is at 6, 4 and it is 2 wider and 2 taller than the rule above gives. Its first line is its own name; its second says what it is.

```
     0         1         2         3         4         5         6        
     012345678901234567890123456789012345678901234567890123456789012345678
  0  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
  1  KyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyK
  2  KyWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWyK
  3  KyWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkWyK
  4  KyWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkWyK
  5  KyWkkkyyyykkkkkkkkykkkkkkkkkkkkkkkkyyyykkkkkkkkkkkkkkkkkkkkkkkykkkWyK
  6  KyWkkkyKKKykkkkkkkkKkkkkkkkkkkkkkkykKKKKkkkkkkkkkkkkkkkkkkkkkkyKkkWyK
  7  KyWkkkyKkkkKyyyykkykyyykyyyykkkkkkyKkkkkykkykkykyyyykkyyykyyyyyKkkWyK
  8  KyWkkkyKkkkkkKKKykyKyKKKyKKKykkkkkkyyykkyKkyKkyKyKKKykyKKKyKKKyKkkWyK
  9  KyWkkkyKkkkkkyyyyKyKyKkkyKkkyKkkkkkkKKykyKkyKkyKyKkkyKyKkkyKkkyKkkWyK
 10  KyWkkkyKkkykykKKyKyKyKkkyKkkyKkkkkkkkkyKyKkyKkyKyKkkyKyKkkyKkkyKkkWyK
 11  KyWkkkkyyyyKkyyyyKyKyKkkyKkkyKkkkkyyyykKkyyyyyyKkyyyyKyKkkkyyyyKkkWyK
 12  KyWkkkkkKKKKkkKKKKkKkKkkkKkkkKkkkkkKKKKkkkKKKKKKkkKKKKkKkkkkKKKKkkWyK
 13  KyWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkWyK
 14  KyWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkWyK
 15  KyWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkWyK
 16  KyWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkWyK
 17  KyWkkkggggkkgkkkkkkgkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkgkkkkkkkkkkWyK
 18  KyWkkkgKKKgkgKkkkkkgKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkgKkkkkkkkkkWyK
 19  KyWkkkgKkkgKgKkgggggKkkkkkkkkgggkgkkgkkgkggggkkgggkgggggKkkkkkkkkkWyK
 20  KyWkkkgKkkgKgKkgKKKgKkkkkkkkgkKKKgKkgKkgKgKKKgkgKKKgKKKgKkkkkkkkkkWyK
 21  KyWkkkgKkkgKgKkgKkkgKkkkkkkkkggkkgKkgKkgKgKkkgKgKkkgKkkgKkkkkkkkkkWyK
 22  KyWkkkgKkkgKgKkgKkkgKkkkkkkkkkKgkgKkgKkgKgKkkgKgKkkgKkkgKkkkkkkkkkWyK
 23  KyWkkkkggggKggkkggggKkgkkkkkgggkKkggggggKkggggKgKkkkggggKkkkkkkkkkWyK
 24  KyWkkkkkKKKKkKKkkKKKKgkKkkkkkKKKkkkKKKKKKkkKKKKkKkkkkKKKKkkkkkkkkkWyK
 25  KyWkkkkkkkkkkkkkkkkkkkKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkWyK
 26  KyWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkWyK
 27  KyWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkWyK
 28  KyWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWyK
 29  KyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyK
 30  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
```
`. nothing  g root.4  k root.1  K root.0  W salt  y ember.hi`

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

### 5.15 Pips and strips of the HUD

**Pips.** 9 by 9, ten to a row at a pitch of 8, so a row is 81 wide. Life is a drop in blood, hunger is a heaped bowl in ember, the arm is a hand in arm blue. A pip is full, half (its left five columns lit) or empty (`root.2`). Each row below shows full, half, empty.

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
 10  ...KKK.......KKK.......KKK...
 11  ..KooOK.....KoojK.....KjjjK..
 12  .KooOOOK...KooOjjK...KjjjjjK.
 13  KKKKKKKKK.KKKKKKKKK.KKKKKKKKK
 14  KOOOOOOuK.KOOOOjjjK.KjjjjjjjK
 15  .KOOOOuK...KOOOjjK...KjjjjjK.
 16  .KOOOuuK...KOOOjjK...KjjjjjK.
 17  ..KKKKK.....KKKKK.....KKKKK..
 18  .............................
 19  .............................
 20  ..K.K.K.....K.K.K.....K.K.K..
 21  .KbKbKbK...KbKbKjK...KjKjKjK.
 22  .KbKbKBK...KbKbKjK...KjKjKjK.
 23  KKbBBBBK..KKbBBjjK..KKjjjjjK.
 24  KbKBBBBK..KbKBBjjK..KjKjjjjK.
 25  KbBBBBBK..KbBBBjjK..KjjjjjjK.
 26  .KBBBBdK...KBBBjjK...KjjjjjK.
 27  ..KBBdK.....KBBjK.....KjjjK..
 28  ...KKK.......KKK.......KKK...
```
`. nothing  b arm.lt  B arm  d arm.dk  j root.2  K root.0  o ember.lt  O ember  q blood.dk  r blood.lt  R blood  u ember.dk`

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

A plain dark plate 182 by 22 holding nine dark slots at x 2 + 20i, y 2, icons at x 3 + 20i, y 3. The selector is 24 by 24 at x -1 + 20i, y -1: an outline with corners left out, two rings of `salt` (the inner ring `clay.lt` along its bottom and right), then an inner ring of `root.0` round the icon. It overhangs the plate by one unit above and below. The first three cells, the first chosen, the second holding 64:

```
     0         1         2         3         4         5         6     
     012345678901234567890123456789012345678901234567890123456789012345
  0  .KKKKKKKKKKKKKKKKKKKKKK...........................................
  1  KKWWWWWWWWWWWWWWWWWWWWKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
  2  KWWWWWWWWWWWWWWWWWWWWLWKhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh
  3  KWWKKKKKKKKKKKKKKKKKKLWKKKKKKKKKKKKKKKKKkkkKKKKKKKKKKKKKKKKKkkkKKK
  4  KWWKKKKKKKKKKKKKKKKKKLWKKKKKKKKKKKKKKKKKhkkKKKKKKKKKKKKKKKKKhkkKKK
  5  KWWKKKKKKKKKKKKKKKKKKLWKKKKKKKKKKKKKKKKKhkkKKKKKKKKKKKKKKKKKhkkKKK
  6  KWWKKKKKKKKKKKKKKKKKKLWKKKKKKKKKKKKKKKKKhkkKKKKKKKKKKKKKKKKKhkkKKK
  7  KWWKKKKKKKKKKKKKKKKKKLWKKKKKKKKKKKKKKKKKhkkKKKKKKKKKKKKKKKKKhkkKKK
  8  KWWKKKKKKKKKKKKKKKKKKLWKKKKKKKKKKKKKKKKKhkkKKKKKKKKKKKKKKKKKhkkKKK
  9  KWWKKKKKKKKKKKKKKKKKKLWKKKKKKKKKKKKKKKKKhkkKKKKKKKKKKKKKKKKKhkkKKK
 10  KWWKKKKKKKKKKKKKKKKKKLWKKKKKKKKKKKKKKKKKhkkKKKKKKKKKKKKKKKKKhkkKKK
 11  KWWKKKKKKKKKKKKKKKKKKLWKKKKKKKKKKKKKKKKKhkkKKKKKKKKKKKKKKKKKhkkKKK
 12  KWWKKKKKKKKKKKKKKKKKKLWKKKKKKWWWWKKKKWKKhkkKKKKKKKKKKKKKKKKKhkkKKK
 13  KWWKKKKKKKKKKKKKKKKKKLWKKKKKWKKKKKKKWWKKhkkKKKKKKKKKKKKKKKKKhkkKKK
 14  KWWKKKKKKKKKKKKKKKKKKLWKKKKKWKKKKKKWKWKKhkkKKKKKKKKKKKKKKKKKhkkKKK
 15  KWWKKKKKKKKKKKKKKKKKKLWKKKKKWWWWKKWKKWKKhkkKKKKKKKKKKKKKKKKKhkkKKK
 16  KWWKKKKKKKKKKKKKKKKKKLWKKKKKWKKKWKWWWWWKhkkKKKKKKKKKKKKKKKKKhkkKKK
 17  KWWKKKKKKKKKKKKKKKKKKLWKKKKKWKKKWKKKKWKKhkkKKKKKKKKKKKKKKKKKhkkKKK
 18  KWWKKKKKKKKKKKKKKKKKKLWKKKKKKWWWWKKKKWKKhkkKKKKKKKKKKKKKKKKKhkkKKK
 19  KWWKKKKKKKKKKKKKKKKKKLWKKKKKKKKKKKKKKKKKhkkKKKKKKKKKKKKKKKKKhkkKKK
 20  KWWKKKKKKKKKKKKKKKKKKLWKhhhhhhhhhhhhhhhhhkkkhhhhhhhhhhhhhhhhhkkkhh
 21  KWLLLLLLLLLLLLLLLLLLLLWKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 22  KKWWWWWWWWWWWWWWWWWWWWKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
 23  .KKKKKKKKKKKKKKKKKKKKKK...........................................
```
`. nothing  h root.3  k root.1  K root.0  L clay.lt  W salt`

A thing that is cooling (a salve, the Recall Stone) has the cooling wash over its icon from the top down, a sixteenth of the time to the row.

### 5.17 Toast

A dark plate 140 by 32 with a frame that says what kind it is: `growth` for a step of the Guide, a grade's colour for a thing found, `blood` for a warning, `root.4` otherwise. A dark slot at 6, 7 with the icon at 7, 8; the first line's cell at 30, 5 in the frame's `lt` tone; the second at 30, 16 in `root.4`. The first line is cut with `…` at 104; the second wraps onto a third rather than being cut, and the plate grows to 42 to hold it, cut with `…` only after that third line. It slides in from the stage's right edge 16 units a frame, stays 5 s, and slides out the same way. Two at most, 2 apart, in a column 4 from the stage's right edge under the status frames (y 32). While a boss bar is up, and the column's left edge would come within 4 units of the strips' right end (`cx + 91 + 4`), the column starts at y 74, under the second strip, so that neither covers the other. A toast that would run into the Guide's step waits. Its left 100 units (the rest is face and frame):

```
     0         1         2         3         4         5         6         7         8         9         
     0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
  0  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
  1  KNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN
  2  KNkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
  3  KNkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
  4  KNkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
  5  KNkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
  6  KNkkkkkkkkkkkkkkkkkkkkkkkkkkkknnnnkkkkkkkknkkkkknkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
  7  KNkkkkKKKKKKKKKKKKKKKKKkkkkkkknKKKnkkkkkkkkKkkkknKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
  8  KNkkkkKKKKKKKKKKKKKKKKKhkkkkkknKkkkKnkkknknknnnnnKnnnnkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
  9  KNkkkkKKKKKKKKKKKKKKKKKhkkkkkknKnnnknKkknKnKnKKKnKnKKKnkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 10  KNkkkkKKKKKKKKKKKKKKKKKhkkkkkknKkKnKnKkknKnKnKkknKnnnnnKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 11  KNkkkkKKKKKKKKKKKKKKKKKhkkkkkknKkknKnKkknKnKnKkknKnKKKKKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 12  KNkkkkKKKKKKKKKKKKKKKKKhkkkkkkknnnnKknnnnKnKknnnnKknnnnkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 13  KNkkkkKKKKKKKKKKKKKKKKKhkkkkkkkkKKKKkkKKKKkKkkKKKKkkKKKKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 14  KNkkkkKKKKKKKKKKKKKKKKKhkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 15  KNkkkkKKKKKKKKKKKKKKKKKhkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 16  KNkkkkKKKKKKKKKKKKKKKKKhkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 17  KNkkkkKKKKKKKKKKKKKKKKKhkkkkkkgkkkkkgkkkkkkkgkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkgkkkkgkkkkkkk
 18  KNkkkkKKKKKKKKKKKKKKKKKhkkkkkkggkkkggKkkkkkkgKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkgKkkkgKkkkkkk
 19  KNkkkkKKKKKKKKKKKKKKKKKhkkkkkkgKgkgkgKggggkkgKkgkggggkkkkkkggggkkkkkkgkkgkkgkggggkkgggkgKkgkggggkkgg
 20  KNkkkkKKKKKKKKKKKKKKKKKhkkkkkkgKkgkKgKkKKKgkgKgkKgKKKgkkkkkkKKKgkkkkkgKkgKkgKgKKKgkgKKKgKgkKgKKKgkgK
 21  KNkkkkKKKKKKKKKKKKKKKKKhkkkkkkgKkkKkgKkggggKggkKkgggggKkkkkkggggKkkkkgKkgKkgKgKkkgKgKkkggkKkgKkkgKgg
 22  KNkkkkKKKKKKKKKKKKKKKKKhkkkkkkgKkkkkgKgkKKgKgKgkkgKKKKKkkkkgkKKgKkkkkgKkgKkgKgKkkgKgKkkgKgkkgKkkgKgK
 23  KNkkkkKKKKKKKKKKKKKKKKKhkkkkkkgKkkkkgKkggggKgKkgkkggggkkkkkkggggKkkkkkggggggKkggggKgKkkgKkgkgggggKkg
 24  KNkkkkkhhhhhhhhhhhhhhhhhkkkkkkkKkkkkkKkkKKKKkKkkKkkKKKKkkkkkkKKKKkkkkkkKKKKKKkkKKKKkKkkkKkkKkKKKKKkk
 25  KNkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 26  KNkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 27  KNkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 28  KNkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 29  KNkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
 30  KNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN
 31  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
```
`. nothing  g root.4  h root.3  k root.1  K root.0  n growth.lt  N growth`

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

**Status frame.** A dark plate 18 by 18 with a frame of `growth` for a good state and `blood` for a bad one, the icon at 1, 1. Under it the time left in the small face, centred, its cell at y 20; `blood.lt` in the last ten seconds.

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
 20  ...WW....WWW.WW...
 21  .....W.W.W...W.W..
 22  ....W....WW..WWW..
 23  ...W...W...W...W..
 24  ...WWW...WW...WW..
 25  ..................
```
`. nothing  k root.1  K root.0  N growth  W salt`

### 5.19 Book

For the journal and the codex. 292 by 180. The cover is a margin of leather 6 deep, built as a slab is with its own tones: the outline with its corners left out; a light edge two deep on the top and left (`timber.lt`, then `timber.sh`) and a dark edge two deep of `timber.pit` on the bottom and right, `timber.dk` on the diagonal where they meet; two rows of `timber.dk`; then a lip of `timber.sh` one unit deep round the pages. The block of pages starts 6 in with a line of `root.0` round it; a page is `clay.lt`, and under the pages two rows of leaves show, `clay.sh` then `clay.face`. The gutter is the middle 8 columns: two of shade either side of a fold of four, `clay.face`, `clay.sh`, `clay.dk`, `clay.pit`, `clay.pit`, `clay.dk`, `clay.sh`, `clay.face`.

**Tabs** mark the sections, as on a slab (5.7), cut from the cover's leather: 24 wide at a pitch of 23 along the cover's top edge from its left corner, each carrying the 16 by 16 mark of its section, its name as its tooltip. The open one rises 21 and is joined to the cover, in the cover's tones (`timber.lt` and `timber.sh` light edges, `timber.dk` face, `timber.pit` dark edge); the others rise 18, flat `timber.pit` with a light row and column of `timber.sh`, and lighten to `timber.dk` under the pointer. A colour alone never tells the sections apart. The top left corner of the book, its first tab open and its second not:

```
     0         1         2         3         4         5
     0123456789012345678901234567890123456789012345678901
  0  .KKKKKKKKKKKKKKKKKKKKKK.............................
  1  KfffffffffffffffffffffUK............................
  2  KftttttttttttttttttttUXK............................
  3  KftUUUUUUUUUUUUUUUUUUXXKKKKKKKKKKKKKKKKKKKKKKK......
  4  KftUUUUUUUUUUUUUUUUUUXXKtttttttttttttttttttttXK.....
  5  KftUUUUUUUUUUUUUUUUUUXXKtXXXXXXXXXXXXXXXXXXXXXK.....
  6  KftUUUUUUUUUUUUUUUUUUXXKtXXXXXXXXXXXXXXXXXXXXXK.....
  7  KftUUUUUUUUUUUUUUUUUUXXKtXXXXXXXXXXXXXXXXXXXXXK.....
  8  KftUUUUUUUUUUUUUUUUUUXXKtXXXXXXXXXXXXXXXXXXXXXK.....
  9  KftUUUUUUUUUUUUUUUUUUXXKtXXXXXXXXXXXXXXXXXXXXXK.....
 10  KftUUUUUUUUUUUUUUUUUUXXKtXXXXXXXXXXXXXXXXXXXXXK.....
 11  KftUUUUUUUUUUUUUUUUUUXXKtXXXXXXXXXXXXXXXXXXXXXK.....
 12  KftUUUUUUUUUUUUUUUUUUXXKtXXXXXXXXXXXXXXXXXXXXXK.....
 13  KftUUUUUUUUUUUUUUUUUUXXKtXXXXXXXXXXXXXXXXXXXXXK.....
 14  KftUUUUUUUUUUUUUUUUUUXXKtXXXXXXXXXXXXXXXXXXXXXK.....
 15  KftUUUUUUUUUUUUUUUUUUXXKtXXXXXXXXXXXXXXXXXXXXXK.....
 16  KftUUUUUUUUUUUUUUUUUUXXKtXXXXXXXXXXXXXXXXXXXXXK.....
 17  KftUUUUUUUUUUUUUUUUUUXXKtXXXXXXXXXXXXXXXXXXXXXK.....
 18  KftUUUUUUUUUUUUUUUUUUXXKtXXXXXXXXXXXXXXXXXXXXXK.....
 19  KftUUUUUUUUUUUUUUUUUUXXKtXXXXXXXXXXXXXXXXXXXXXK.....
 20  KftUUUUUUUUUUUUUUUUUUXXKtXXXXXXXXXXXXXXXXXXXXXK.....
 21  KftUUUUUUUUUUUUUUUUUUXXKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
 22  KftUUUUUUUUUUUUUUUUUUUffffffffffffffffffffffffffffff
 23  KftUUUUUUUUUUUUUUUUUUttttttttttttttttttttttttttttttt
 24  KftUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUU
 25  KftUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUUU
 26  KftUUttttttttttttttttttttttttttttttttttttttttttttttt
 27  KftUUtKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK
 28  KftUUtKLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
 29  KftUUtKLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
 30  KftUUtKLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
 31  KftUUtKLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
 32  KftUUtKLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
 33  KftUUtKLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
 34  KftUUtKLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
 35  KftUUtKLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL
```
`. nothing  f timber.lt  K root.0  L clay.lt  t timber.sh  U timber.dk  X timber.pit`

**Text on a page** is ink. A page's text area is 126 wide and starts 12 from the book's outer edge and 10 from its top; the right page's starts at x 154. Headings are plain ink in the text face with a rule of `clay.sh` one unit thick 1 unit under their cell.

**The ribbon** of the open section lies in the gutter, the section's colour kept here and nowhere else: 8 wide, outlined, its colour with its right column in the colour's dark tone, from the cover's row 1 down 27 and then cut in a V over 3 rows. The gutter with the ribbon of Creatures:

```
     0         1         2
     01234567890123456789012345
  0  KKKKKKKKKKKKKKKKKKKKKKKKKK
  1  ffffffKRRRRRqKffffffffffff
  2  ttttttKRRRRRqKtttttttttttt
  3  UUUUUUKRRRRRqKUUUUUUUUUUUU
  4  UUUUUUKRRRRRqKUUUUUUUUUUUU
  5  ttttttKRRRRRqKtttttttttttt
  6  KKKKKKKRRRRRqKKKKKKKKKKKKK
  7  LLLLLLKRRRRRqKLLLLLLLLLLLL
  8  LLLLLLKRRRRRqKLLLLLLLLLLLL
  9  LLLLLLKRRRRRqKLLLLLLLLLLLL
 10  LLLLLLKRRRRRqKLLLLLLLLLLLL
 11  LLLLLLKRRRRRqKLLLLLLLLLLLL
 12  LLLLLLKRRRRRqKLLLLLLLLLLLL
 13  LLLLLLKRRRRRqKLLLLLLLLLLLL
 14  LLLLLLKRRRRRqKLLLLLLLLLLLL
 15  LLLLLLKRRRRRqKLLLLLLLLLLLL
 16  LLLLLLKRRRRRqKLLLLLLLLLLLL
 17  LLLLLLKRRRRRqKLLLLLLLLLLLL
 18  LLLLLLKRRRRRqKLLLLLLLLLLLL
 19  LLLLLLKRRRRRqKLLLLLLLLLLLL
 20  LLLLLLKRRRRRqKLLLLLLLLLLLL
 21  LLLLLLKRRRRRqKLLLLLLLLLLLL
 22  LLLLLLKRRRRRqKLLLLLLLLLLLL
 23  LLLLLLKRRRRRqKLLLLLLLLLLLL
 24  LLLLLLKRRRRRqKLLLLLLLLLLLL
 25  LLLLLLKRRRRRqKLLLLLLLLLLLL
 26  LLLLLLKRRRRRqKLLLLLLLLLLLL
 27  LLLLLLKRRRRRqKLLLLLLLLLLLL
 28  LLLLLLKRRKKRqKLLLLLLLLLLLL
 29  LLLLLLKRKZZKqKLLLLLLLLLLLL
 30  LLLLLLKKDZZDKKLLLLLLLLLLLL
 31  LLLLLLFSDZZDSFLLLLLLLLLLLL
 32  LLLLLLFSDZZDSFLLLLLLLLLLLL
 33  LLLLLLFSDZZDSFLLLLLLLLLLLL
 34  LLLLLLFSDZZDSFLLLLLLLLLLLL
```
`. nothing  D clay.dk  f timber.lt  F clay.face  K root.0  L clay.lt  q blood.dk  R blood  S clay.sh  t timber.sh  U timber.dk  Z clay.pit`

**Page arrows**, 16 by 7, in ink at the bottom outer corners of the pages (12 from the outer edge, 161 down from the book's top); `blood.dk` when hovered; not drawn when there is no page that way. Page numbers are in the small face, `ink.faded`, centred under each page, the cell at y 162. A page's text stops at y 158. The bottom right corner with its arrow:

```
     0         1         2
     012345678901234567890123456789
  0  LLLLLLLLLLLLLLLLLLLLLLLKtUUXXK
  1  LLLLLLLLLLLLLLLLLLLLLLLKtUUXXK
  2  LLLLLLLLLLLLLLLLLLLLLLLKtUUXXK
  3  LLLLLLLLLLLLLILLLLLLLLLKtUUXXK
  4  LLLLLLLLLLLLLIILLLLLLLLKtUUXXK
  5  LLLLIIIIIIIIIIIILLLLLLLKtUUXXK
  6  LLLLIIIIIIIIIIIIILLLLLLKtUUXXK
  7  LLLLIIIIIIIIIIIILLLLLLLKtUUXXK
  8  LLLLLLLLLLLLLIILLLLLLLLKtUUXXK
  9  LLLLLLLLLLLLLILLLLLLLLLKtUUXXK
 10  LLLLLLLLLLLLLLLLLLLLLLLKtUUXXK
 11  LLLLLLLLLLLLLLLLLLLLLLLKtUUXXK
 12  KKKKKKKKKKKKKKKKKKKKKKKKtUUXXK
 13  SSSSSSSSSSSSSSSSSSSSSSSKtUUXXK
 14  FFFFFFFFFFFFFFFFFFFFFFFKtUUXXK
 15  KKKKKKKKKKKKKKKKKKKKKKKKtUUXXK
 16  tttttttttttttttttttttttttUUXXK
 17  UUUUUUUUUUUUUUUUUUUUUUUUUUUXXK
 18  UUUUUUUUUUUUUUUUUUUUUUUUUUUXXK
 19  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXK
 20  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXK
 21  KKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
```
`. nothing  F clay.face  I ink  K root.0  L clay.lt  S clay.sh  t timber.sh  U timber.dk  X timber.pit`

### 5.20 Tree field, nodes and links

The field is a well whose floor is tiled with the ground tile (5.21) and pans under its frame. Nodes are 26 by 26 on a lattice of 40 by 40, each holding a 16 by 16 icon at 5, 5. Three frames: square, cut (its corners cut by 5), spiked (a spike on each side and a stud at each corner). Each is built by the rule for raised shapes: the shape's outer units are outline; the next units in are `hi` where they face up or left and `pit` where they face down or right; the rest is face.

```
     0         1         2         3         4         5         6         7         8 
     0123456789012345678901234567890123456789012345678901234567890123456789012345678901
  0  .KKKKKKKKKKKKKKKKKKKKKKKK........KKKKKKKKKKKKKKKK...................KK............
  1  KWWWWWWWWWWWWWWWWWWWWWWWFK......KWWWWWWWWWWWWWWWFK.......K.K.......KWFK.......K.K.
  2  KWFFFFFFFFFFFFFFFFFFFFFFZK.....KWFFFFFFFFFFFFFFFFFK.......KFK.....KWFFFK.....KFK..
  3  KWFFFFFFFFFFFFFFFFFFFFFFZK....KWFFFFFFFFFFFFFFFFFFFK.....KFFFKKKKKWFFFFFKKKKKWFFK.
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
 21  KWFFFFFFFFFFFFFFFFFFFFFFZK...KFFFFFFFFFFFFFFFFFFFFFZK.....KWFZZZZZFFFFFFZZZZZFFK..
 22  KWFFFFFFFFFFFFFFFFFFFFFFZK....KFFFFFFFFFFFFFFFFFFFZK.....KFFZKKKKKFFFFFZKKKKKFFFK.
 23  KWFFFFFFFFFFFFFFFFFFFFFFZK.....KFFFFFFFFFFFFFFFFFZK.......KFK.....KFFFZK.....KFK..
 24  KFZZZZZZZZZZZZZZZZZZZZZZZK......KFZZZZZZZZZZZZZZZK.......K.K.......KFZK.......K.K.
 25  .KKKKKKKKKKKKKKKKKKKKKKKK........KKKKKKKKKKKKKKKK...................KK............
```
`. nothing  F clay.face  K root.0  W salt  Z clay.pit`

| State | hi | face | pit | Icon |
| --- | --- | --- | --- | --- |
| Locked | `root.3` | `root.2` | `root.1` | silhouette in `root.3` |
| Open (can be taken now) | `stone.lt` | `stone.sh` | `stone.pit` | full |
| Earned | `salt` | `clay.face` | `clay.pit` | full |

A node with ranks shows them under it in the small face, as `1/3`. The chosen node has the hotbar's selector round it (5.16), 30 by 30.

**Links** run only along rows and columns, with square elbows at the midpoint. A link is 3 units wide: `root.0` either side of a core one unit wide. The core is `root.3` to a locked node, `root.4` to an open one, `salt` between two earned ones. Links are drawn under nodes.

```
     0         1         2         
     012345678901234567890123456789
  0  ..............................
  1  KKKKKKKKKKKKKKKK..............
  2  KWWWWWWWWWWWWWWK..............
  3  KKKKKKKKKKKKKKWK..............
  4  .............KWK..............
  5  .............KWK..............
  6  .............KWK..............
  7  .............KWK..............
  8  .............KWK..............
  9  .............KWK..............
 10  .............KWKKKKKKKKKKKKKKK
 11  .............KWWWWWWWWWWWWWWWK
 12  .............KKKKKKKKKKKKKKKKK
 13  ..............................
```
`. nothing  K root.0  W salt`

### 5.21 Ground tile

96 by 48: dressed stone, darkened as the ground behind a menu is, laid in courses of blocks 16 by 8 with joints of one unit, each course set 8 along from the one under it. A block is lit from the top left: its top row and left column in `stone.dk`, its face `stone.pit`, its bottom row and right column `root.1`, the joint `root.0`. One block in six, chosen by a fixed hash of its column and course, has a face one step lighter (`stone.dk`), and one in six a face one step darker (`root.1`, its lit edge `stone.pit`), so the courses read as single stones and the screen does not read as a mesh. It fills the screen behind the title, the world list, new world, join and loading, and it is the floor of the tree and of a store's map. Under a list on a full-screen menu it shows above and below the well. Text on it is text on dark: `salt` with its shadow. A block with the joint before it, and the course above and below (x and y here count from one unit before the block):

```
     0         1         2
     0123456789012345678901234
  0  KKKKKKKKKKKKKKKKKKKKKKKKK
  1  KMMMMMMMMMMMMMMkKMMMMMMMM
  2  KMzzzzzzzzzzzzzkKMzzzzzzz
  3  KMzzzzzzzzzzzzzkKMzzzzzzz
  4  KMzzzzzzzzzzzzzkKMzzzzzzz
  5  KMzzzzzzzzzzzzzkKMzzzzzzz
  6  KMzzzzzzzzzzzzzkKMzzzzzzz
  7  KkkkkkkkkkkkkkkkKkkkkkkkk
  8  KKKKKKKKKKKKKKKKKKKKKKKKK
  9  MMMMMMMkKMMMMMMMMMMMMMMkK
```
`K root.0  k root.1  M stone.dk  z stone.pit`

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

Lines are 10 tall, newest lowest, at the left of the stage. Where chat with its wash ends left of the hotbar's column (x `cx - 91`, 1 unit clear), the newest line's bottom is 48 above the stage's bottom, level with the top of the hotbar's measures and clear of the life count; on a narrower stage it is 58 above, over the row of defence and lees. Under each line a strip of the chat wash as wide as the line's text and shadow plus one unit either side (drawn opaque here); the text starts 1 in. A line from a player: their name in their colour, a colon in `root.4`, 3 units, the text in `salt`. A line from the server is all `stone.lt`. Text wraps at 141, so that chat with its wash is 144 wide (x 4 to 148 on a stage 480 wide, left of the hotbar's column and far from the crosshair), or at half the stage less 64 when that is less. A line that wraps continues 4 units in, its strip starting there too, so that a wrapped row is not read as a new speaker. Only whole lines show: when the oldest line will not fit, all of it is left out. Closed, the last 8 lines show, fewer when the crew list stands above, and each leaves 8 s after it came. Open, 12 lines show in the same place and the wheel scrolls back; the entry stands along the bottom of the stage, 4 in and 2 above the bottom edge, as wide as the stage less 8, over the hotbar, as the tradition puts it: 14 tall, floor `root.0`, a frame of `root.3`, the text's cell at 4, 2, the caret as in a field. The diagram shows two lines and, under them, the entry's left end.

```
     0         1         2         3         4         5         6         7         8         9         0
     01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
  0  kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..............................
  1  knkkkkknkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..............................
  2  knnkkknnKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..............................
  3  knKnknknKnnnnkknnnnnkkkkkWWWWkkWWWWkkkkkkWWWWWWkkWkkkWkkkkkWkkWkkWkWWWWkkWkkkWkk..............................
  4  knKknkKnKnKKKnknKKKnKgkkkWKKKWkWKKKWkkkkkWKKWKKWkWKkkWKkkkkWKkWKkWKkKKKWkWKkkWKk..............................
  5  knKkkKknKnnnnnKnKkknKkKkkWKkkWKWKkkWKkkkkWKkWKkWKWKkkWKkkkkWKkWKkWKkWWWWKWKkkWKk..............................
  6  knKkkkknKnKKKKKnKkknKkkkkWKkkWKWKkkWKkkkkWKkWKkWKWKkkWKkkkkWKkWKkWKWkKKWKWKkkWKk..............................
  7  knKkkkknKknnnnkknnnnKgkkkkWWWWKWKkkWKkkkkWKkWKkWKkWWWWKkkkkkWWWWWWKkWWWWKkWWWWKk..............................
  8  kkKkkkkkKkkKKKKkkKKnKkKkkkkKKKKkKkkkKkkkkkKkkKkkKkkKKWKkkkkkkKKKKKKkkKKKKkkKKWKk..............................
  9  kkkkkkkkkkkkkkknnnnkKkkkkkkkkkkkkkkkkkkkkkkkkkkkkWWWWkKkkkkkkkkkkkkkkkkkkWWWWkKk..............................
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

Held open with Tab. A plain dark plate 312 wide, centred on the stage at y 30. Header: the server's name at 6, 3 and "3 of 8" right-aligned in `root.4`; a rule of `root.3` at y 15. Rows are 16 tall from y 18: the head (5.25) at 5, +0; the name's cell at 18; the life strip at 18, +11, one clear unit under the name's descenders; the place's name at 148 in `root.4`, cut at 76; the level right-aligned to 244 in `growth.lt`; the distance as "42 m" right-aligned to 292, left out for oneself and for a friend in another place; three bars for the connection at 298. All of it is the text face.

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

The crew at the top left of the HUD uses the same head, name and life strip in rows 15 tall and 92 wide, with no plate: the head at 0, +0, the name's cell at 12 with its shadow, cut at 80, the strip at 12, +11.

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

A plain dark plate 182 by 12. It shows 138 degrees of the horizon, 84 units either side of the middle. N, E, S, W are letters in `salt` with no shadow. The four points halfway between them are ticks of `root.4` 6 tall at y 3, and the eight points between those are ticks 2 tall at y 5. Two marks of `salt`, 2 by 2, at x 90 on y 1 and y 9, show the heading. Marks ride on the strip at y 3, a friend's head at y 1, lying over the plate's inner edges; one that lies outside the strip's span waits at that end. Under the plate, the text's cell at y 13, in the text face with shadow and in sentence case: the place as "x -104  y 64  z 2210" at the left, cut short of the night, and "Night 3 of 8" at the right. Left half:

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

A plain dark plate 24 tall, as wide as its longer line plus 28, centred at the top of the stage under the compass. A dark slot at 3, 3 with the icon of the block or creature; the name's cell at 24, 2; the second line at 24, 12 in `root.4`, or in `blood.lt` when it says why the thing cannot be taken ("Needs an iron pick"). For a creature the second line is a thin strip of its life, 5 tall, as wide as the name.

```
     0         1         2         3         4         5         6         7         8         9         0         1     
     01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345
  0  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
  1  KhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhK
  2  KhkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
  3  KhkKKKKKKKKKKKKKKKKKkkkkWkkkWkWWWkkkkkkkkkkkWkkkkkkkkWWWWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
  4  KhkKKKKKKKKKKKKKKKKKhkkkWKkkWKkKKKkkkkkkkkkkWKkkkkkkkWKKKWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
  5  KhkKKKKKKKKKKKKKKKKKhkkkWKkkWKkWkkWWWkWWWWkkWKkWkkkkkWKkkWKWWWkWWWWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
  6  KhkKKKKKKKKKKKKKKKKKhkkkWWWWWKkWKkWKKKkKKKWkWKWkKkkkkWKkkWKWKKKWKKKWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
  7  KhkKKKKKKKKKKKKKKKKKhkkkWKKKWKkWKkWKkkkWWWWKWWkKkkkkkWKkkWKWKkkWWWWWKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
  8  KhkKKKKKKKKKKKKKKKKKhkkkWKkkWKkWKkWKkkWkKKWKWKWkkkkkkWKkkWKWKkkWKKKKKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
  9  KhkKKKKKKKKKKKKKKKKKhkkkWKkkWKkWKkWKkkkWWWWKWKkWkkkkkkWWWWKWKkkkWWWWkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 10  KhkKKKKKKKKKKKKKKKKKhkkkkKkkkKkkKkkKkkkkKKKKkKkkKkkkkkkKKKKkKkkkkKKKKkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 11  KhkKKKKKKKKKKKKKKKKKhkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 12  KhkKKKKKKKKKKKKKKKKKhkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkK
 13  KhkKKKKKKKKKKKKKKKKKhkkkrkkkrkkkkkkkkkkkkkkkkkrkkkkkkkkkkkkkkkkkkkkkkkkkkrkkkkkkkkkkkkkkkkkkkkkkkkkkkrkkkkkkrkkkkkkK
 14  KhkKKKKKKKKKKKKKKKKKhkkkrrkkrKkkkkkkkkkkkkkkkkrKkkkkkkkkkkkkkkkkkkkkkkkkkkKkkkkkkkkkkkkkkkkkkkkkkkkkkkKkkkkkrKkkkkkK
 15  KhkKKKKKKKKKKKKKKKKKhkkkrKrkrKrrrrkkrrrrkkrrrrrKkrrrkkkkkrrrrkkrrrrkkkkkkrkrrrkrrrrkkrrrrkkkkkkrrrrkkrkrrrrkrKkrkkkK
 16  KhkKKKKKKKKKKKKKKKKKhkkkrKrKrKrKKKrkrKKKrkrKKKrKrkKKKkkkkkKKKrkrKKKrkkkkkrKrKKKrKKKrkrKKKrkkkkkrKKKrkrKrKKKKrKrkKkkK
 17  KhkKKKKKKKKKKKKKKKKKhkkkrKkrrKrrrrrKrrrrrKrKkkrKkrrkkkkkkkrrrrKrKkkrKkkkkrKrKkkrKkkrKrKkkrKkkkkrKkkrKrKrKkkkrrkKkkkK
 18  KhkKKKKKKKKKKKKKKKKKhkkkrKkkrKrKKKKKrKKKKKrKkkrKkkKrkkkkkrkKKrKrKkkrKkkkkrKrKkkrKkkrKrKkkrKkkkkrKkkrKrKrKkkkrKrkkkkK
 19  KhkKKKKKKKKKKKKKKKKKhkkkrKkkrKkrrrrkkrrrrkkrrrrKrrrkKkkkkkrrrrKrKkkrKkkkkrKrKkkkrrrrKrKkkrKkkkkrrrrrKrKkrrrkrKkrkkkK
 20  KhkkhhhhhhhhhhhhhhhhhkkkkKkkkKkkKKKKkkKKKKkkKKKKkKKKkkkkkkkKKKKkKkkkKkkkkkKkKkkkkKKKKkKkkkKkkkkrKKKKKkKkkKKKkKkkKkkK
 21  KhkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkrKkkkkkkkkkkkkkkkkkkK
 22  KhkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkKkkkkkkkkkkkkkkkkkkK
 23  .KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.
```
`. nothing  h root.3  k root.1  K root.0  r blood.lt  W salt`

### 5.28 Key cap, crosshair, banner, title mark

**Key cap**, 12 tall, as wide as its label plus 6: `stone.hi` top row, `stone.lt` face, two rows of `stone.sh`, label in ink. Used in prompts and on the controls screen.

```
     0         1         2         3         4 
     012345678901234567890123456789012345678901
  0  .KKKKKKKK.....KKKKKKKKKKKKKKKKKKKKKKKKKKK.
  1  KAAIIIIAAK...KAAAIIIIAIAAAAAIAAIIIAAAAAAAK
  2  KGGIGGGGGK...KGGIGGGGGIGGGGGGGGIGGGGIGGGGK
  3  KGGIGGGGGK...KGGIGGGGGIIIIGGIGIIIIGIIIIGGK
  4  KGGIIIGGGK...KGGGIIIGGIGGGIGIGGIGGGGIGGGGK
  5  KGGIGGGGGK...KGGGGGGIGIGGGIGIGGIGGGGIGGGGK
  6  KGGIGGGGGK...KGGGGGGIGIGGGIGIGGIGGGGIGGGGK
  7  KGGIIIIGGK...KGGIIIIGGIGGGIGIGGIGGGGGIIGGK
  8  KGGGGGGGGK...KGGGGGGGGGGGGGGGGGGGGGGGGGGGK
  9  KJJJJJJJJK...KJJJJJJJJJJJJJJJJJJJJJJJJJJJK
 10  KJJJJJJJJK...KJJJJJJJJJJJJJJJJJJJJJJJJJJJK
 11  .KKKKKKKK.....KKKKKKKKKKKKKKKKKKKKKKKKKKK.
```
`. nothing  A stone.hi  G stone.lt  I ink  J stone.sh  K root.0`

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

**Title mark**, 187 by 36. The text face's own "Peopls Craft" with every unit of a glyph made a block 3 by 3, then cut at one unit: a unit of the letter is `salt` where it faces up or left, `clay.sh` where it faces down or right, `clay.lt` elsewhere; under the letter a drop 2 units deep of `clay.pit`; `root.0` round all of it. It is one pixel map and is never scaled.

**Raised letters**, for the one line of a screen that stands on a wash with no window ("You fell"): the text face with every unit of a glyph made a block 2 by 2, the whole line then lit as one raised shape: a unit with open ground above or to its left is `salt`, one with open ground below or to its right `clay.sh`, the rest `clay.lt`, and every unit of ground touching it, corners included, `root.0`. A line is twice the text face's width plus 2 by 22. It is built from the glyphs, never by scaling a drawing of text.

```
     0         1         2         3         4         5         6         7         8         9         0         1         2         3         4         5         6         7         8      
     0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456
  0  ...........................................................................................................................................................................................
  1  ...........................................................................................................................................................................................
  2  ...........................................................................................................................................................................................
  3  KKKKKKKKKKKKKK..........................................................KKKKK...............................KKKKKKKKKKKKKK.....................................KKKKKKKKKKK.................
  4  KWWWWWWWWWWWLK..........................................................KWWLK...............................KWWWWWWWWWWWLK.....................................KWWWWWWWWLK.................
  5  KWLLLLLLLLLLSK..........................................................KWLSK...............................KWLLLLLLLLLLSK.....................................KWLLLLLLLSK.................
  6  KWLLSSSSSSSSSKKKK.......................................................KWLSK...............................KWLLSSSSSSSSSKKKK..................................KWLLSSSSSSK....KKKKK........
  7  KWLSZZZZZZZZZWWLK.......................................................KWLSK...............................KWLSZZZZZZZZZWWLK..................................KWLSZZZZZZK....KWWLK........
  8  KWLSZZZZZZZZZWLSK.......................................................KWLSK...............................KWLSZZZZZZZZZWLSK..................................KWLSZZZZZZK....KWLSK........
  9  KWLSKKKKKKKKKWLSK.KKKKKKKKKKKKKK....KKKKKKKKKKKKKK....KKKKKKKKKKKKKK....KWLSK.......KKKKKKKKKKK.............KWLSKKKKKKKKKLSSK.KKKKKKKKKKK.KKKKKKKKKKKKKK....KKKKWLSKKKKKKK.KKKKWLSKKKKKKK..
 10  KWLSK.......KWLSK.KWWWWWWWWWWWLK....KWWWWWWWWWWWLK....KWWWWWWWWWWWLK....KWLSK.......KWWWWWWWWLK.............KWLSK.......KZZZK.KWWWWWWWWLK.KWWWWWWWWWWWLK....KWWWLLLWWWWWLK.KWWWLLLWWWWWLK..
 11  KWLSK.......KWLSK.KWLLLLLLLLLLSK....KWLLLLLLLLLLSK....KWLLLLLLLLLLSK....KWLSK.......KWLLLLLLLSK.............KWLSK.......KZZZK.KWLLLLLLLSK.KWLLLLLLLLLLSK....KWLLLLLLLLLLSK.KWLLLLLLLLLLSK..
 12  KWLSKKKKKKKKKLSSK.KWLLSSSSSSSSSKKKK.KWLLSSSSSSSSSKKKK.KWLLSSSSSSSSSKKKK.KWLSK....KKKKLSSSSSSSSK.............KWLSK.......KKKKK.KWLLSSSSSSK.KLSSSSSSSSSSSKKKK.KLSSLLLSSSSSSK.KLSSLLLSSSSSSK..
 13  KWLLWWWWWWWWLZZZK.KWLSZZZZZZZZZWWLK.KWLSZZZZZZZZZWWLK.KWLSZZZZZZZZZWWLK.KWLSK....KWWLZZZZZZZZZK.............KWLSK.............KWLSZZZZZZK.KZZZZZZZZZZZZWWLK.KZZZWLSZZZZZZK.KZZZWLSZZZZZZK..
 14  KWLLLLLLLLLLSZZZK.KWLSZZZZZZZZZWLSK.KWLSZZZZZZZZZWLSK.KWLSZZZZZZZZZWLSK.KWLSK....KWLSZZZZZZZZZK.............KWLSK.............KWLSZZZZZZK.KZZZZZZZZZZZZWLSK.KZZZWLSZZZZZZK.KZZZWLSZZZZZZK..
 15  KWLLSSSSSSSSSKKKK.KWLSKKKKKKKKKWLSK.KWLSKKKKKKKKKWLSK.KWLSKKKKKKKKKWLSK.KWLSK....KLSSKKKKKKKKKK.............KWLSK.............KWLSKKKKKKK.KKKKKKKKKKKKKWLSK.KKKKWLSKKKKKKK.KKKKWLSKKKKKKK..
 16  KWLSZZZZZZZZZK....KWLLWWWWWWWWWLLSK.KWLSK.......KWLSK.KWLSK.......KWLSK.KWLSK....KZZZWWWWWLK................KWLSK.............KWLSK..........KWWWWWWWWWLLSK....KWLSK..........KWLSK........
 17  KWLSZZZZZZZZZK....KWLLLLLLLLLLLLLSK.KWLSK.......KWLSK.KWLSK.......KWLSK.KWLSK....KZZZWLLLLSK................KWLSK.............KWLSK..........KWLLLLLLLLLLSK....KWLSK..........KWLSK........
 18  KWLSKKKKKKKKKK....KWLLSSSSSSSSSSSSK.KWLSK.......KWLSK.KWLSK.......KWLSK.KWLSK....KKKKLSSSSSKKKK.............KWLSK.......KKKKK.KWLSK.......KKKKLSSSSSSSSLLSK....KWLSK..........KWLSK........
 19  KWLSK.............KWLSZZZZZZZZZZZZK.KWLSK.......KWLSK.KWLSK.......KWLSK.KWLSK.......KZZZZZZWWLK.............KWLSK.......KWWLK.KWLSK.......KWWLZZZZZZZZZWLSK....KWLSK..........KWLSK........
 20  KWLSK.............KWLSZZZZZZZZZZZZK.KWLSK.......KWLSK.KWLSK.......KWLSK.KWLSK.......KZZZZZZWLSK.............KWLSK.......KWLSK.KWLSK.......KWLSZZZZZZZZZWLSK....KWLSK..........KWLSK........
 21  KWLSK.............KLSSKKKKKKKKKKKKK.KLSSKKKKKKKKKWLSK.KWLSKKKKKKKKKWLSK.KWLSKKKK.KKKKKKKKKKLSSK.............KLSSKKKKKKKKKWLSK.KWLSK.......KLSSKKKKKKKKKWLSK....KWLSK..........KLSSKKKKKKK..
 22  KWLSK.............KZZZWWWWWWWWWWWLK.KZZZWWWWWWWWWLLSK.KWLLWWWWWWWWWLLSK.KWLLWWLK.KWWWWWWWWLZZZK.............KZZZWWWWWWWWWLLSK.KWLSK.......KZZZWWWWWWWWWLLSK....KWLSK..........KZZZWWWWWLK..
 23  KWLSK.............KZZZWLLLLLLLLLLSK.KZZZWLLLLLLLLLLSK.KWLLLLLLLLLLLLLSK.KWLLLLSK.KWLLLLLLLSZZZK.............KZZZWLLLLLLLLLLSK.KWLSK.......KZZZWLLLLLLLLLLSK....KWLSK..........KZZZWLLLLSK..
 24  KLSSK.............KKKKLSSSSSSSSSSSK.KKKKLSSSSSSSSSSSK.KWLLSSSSSSSSSSSSK.KLSSSSSK.KLSSSSSSSSKKKK.............KKKKLSSSSSSSSSSSK.KLSSK.......KKKKLSSSSSSSSSSSK....KLSSK..........KKKKLSSSSSK..
 25  KZZZK................KZZZZZZZZZZZZK....KZZZZZZZZZZZZK.KWLSZZZZZZZZZZZZK.KZZZZZZK.KZZZZZZZZZK...................KZZZZZZZZZZZZK.KZZZK..........KZZZZZZZZZZZZK....KZZZK.............KZZZZZZK..
 26  KZZZK................KZZZZZZZZZZZZK....KZZZZZZZZZZZZK.KWLSZZZZZZZZZZZZK.KZZZZZZK.KZZZZZZZZZK...................KZZZZZZZZZZZZK.KZZZK..........KZZZZZZZZZZZZK....KZZZK.............KZZZZZZK..
 27  KKKKK................KKKKKKKKKKKKKK....KKKKKKKKKKKKKK.KWLSKKKKKKKKKKKKK.KKKKKKKK.KKKKKKKKKKK...................KKKKKKKKKKKKKK.KKKKK..........KKKKKKKKKKKKKK....KKKKK.............KKKKKKKK..
 28  ......................................................KWLSK................................................................................................................................
 29  ......................................................KWLSK................................................................................................................................
 30  ......................................................KLSSK................................................................................................................................
 31  ......................................................KZZZK................................................................................................................................
 32  ......................................................KZZZK................................................................................................................................
 33  ......................................................KKKKK................................................................................................................................
 34  ...........................................................................................................................................................................................
 35  ...........................................................................................................................................................................................
```
`. nothing  K root.0  L clay.lt  S clay.sh  W salt  Z clay.pit`

---

## 6. Screens

Each screen is a wireframe, a table and five lines. In a wireframe one character is 3 units wide and one line is 6 units tall, so it is a picture and the table is the measure. Coordinates are from the top left of the screen's main slab or, for a screen with side panels, of its leftmost slab; tabs stand outside and have negative coordinates. The x, y, w and h of the table are in those coordinates. An x named inside a "What" ("right-aligned to x 168") is measured from the left of the slab the item stands on. A box of `#` and `=` is a slab. A text item is shown by its mark in quotation marks.

Shared by every container: the pack is nine by three slots at x 8, the hotbar row 4 units under it, the bottom margin 6 to 8.

### The HUD

On a stage 427 by 240. A part in the left third keeps its distance from the stage's left edge, a part in the right third from the right edge, a part in the middle from the centre line; parts above y 60 keep their distance from the top, parts below y 180 from the bottom, the crosshair and prompt from the centre.

```
                                         +-----------------------------------------------------------+
 +-----------------------------+         +-H1 compass------------------------------------------------+      +-------------------------------+
 | H5 party                    |                                                                            | H6 status                     |
 |                             |         "H2"                                                               |                               |
 |                             |         +-----------------------------------------------------------+      +-------------------------------+
 |                             |         | H3 boss                                                   |
 |                             |         |                                                           |
 |                             |         |                                                           |
 |                             |         |                                                           |
 |                             |         +-----------------------------------------------------------+
 |                             |
 |                             |                                                              +---------------------------------------------+
 |                             |                                                              | H7 toast                                    |
 |                             |                                                              |                                             |
 |                             |                                                              |                                             |
 |                             |                                                              |                                             |
 +-----------------------------+                                                              +---------------------------------------------+
 +--------------------------------------------------+
 | H11 chat                                         |
 |                                                  |                 +-+
 |                                                  |                 +-+
 |                                                  |
 |                                                  | +-------------------------------+
 |                                                  | +-H13 prompt--------------------+           +-----------------------------------------+
 |                                                  |                                             | H8 tracker                              |
 |                                                  |                                             |                                         |
 |                                                  |                                             |                                         |
 |                                                  |                                             |                                         |
 +--------------------------------------------------+                                             |                                         |
                                                      "H14"                                       +-----------------------------------------+

                                         "H15"                            +-------------------------+        +------------------------------+
                                                                          +-H16 pips----------------+        | H9 feed                      |
                                         +-------------------------+"H18" +-------------------------+        |                              |
                                         +-H17 pips----------------+      +-H19 pips----------------+        |                              |
                                         [H20                                                        ]       |                              |
                                         +-----------------------------------------------------------+       |                              |
                                         | H21 hotbar                                                |       +------------------------------+
                                         |                                                           |
                                         +-----------------------------------------------------------+                              "H10"

```

| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| H1 | compass | 122 | 2 | 182 | 12 | compass strip |
| H2 | text | 122 | 15 | 182 | 10 | under it, text face with shadow: place as "x -104  y 64  z 2210" at the left, "Night 3 of 8" at the right |
| H3 | boss | 122 | 26 | 182 | 20 | boss bar: name row, then the strip. A world event (Night raid, Sand March, Amāvassa) takes the same form with a thin strip and stacks under it at y 50 |
| H4 | readout | 150 | 26 | 126 | 24 | what you look at; centred; it stands where the boss bar stands and is not drawn while a boss bar or an event strip is up (not drawn in the wireframe) |
| H5 | party | 4 | 4 | 92 | 105 | the crew: one row 15 tall to each friend online, up to seven: head, name, a life strip 41 by 4 under the name |
| H6 | status | 323 | 4 | 100 | 25 | status frames 18 square, pitch 20, from the right edge leftward, the time left under each in the small face |
| H7 | toast | 283 | 74 | 140 | 32 | toasts, 140 by 32 (42 when the second line wraps), 2 apart, two at most, sliding in from the right. On this stage the column would reach under the strips, so while a boss bar is up it starts at y 74 and one shows; otherwise it starts at y 32 under the status frames |
| H8 | tracker | 295 | 138 | 128 | 44 | the present step of the Guide: a dark plate; chapter in root.4, step in salt, count and where-to under it |
| H9 | feed | 327 | 186 | 96 | 40 | pickups: lines 10 tall, newest lowest, right-aligned: "+3 Rubble (12)" in the grade's colour |
| H10 | text | 396 | 228 | 27 | 10 | "Saved", text face, for two seconds |
| H11 | chat | 4 | 111 | 144 | 71 | chat: up to eight whole lines 10 tall, newest lowest, each on its own dark strip as wide as its text, wrapped at 141, wrapped rows 4 in. On this stage chat would reach the hotbar's column, so the newest ends at y 182; on a stage where it ends left of that column (480 wide and more) it comes down to 48 above the bottom. Fewer lines while the crew list stands above |
| H12 | cross | 209 | 116 | 9 | 9 | crosshair, 9 by 9: salt plus, root.0 outline |
| H13 | prompt | 163 | 132 | 100 | 14 | prompt: a key cap and a line on a strip of the chat wash 2 wider each side, centred on the crosshair, the cap's top 12 under its centre |
| H14 | text | 163 | 174 | 100 | 10 | name of the thing in hand, centred, in its grade's colour, for 1.6 s after a change |
| H15 | text | 122 | 186 | 70 | 10 | second row, left: shield mark and defence, then the jar mark and lees carried |
| H16 | pips | 223 | 187 | 81 | 9 | second row, right: ten arm pips, filling from the right |
| H17 | pips | 122 | 198 | 81 | 9 | first row, left: ten life pips; the life as a number in the small face ends at x 119 |
| H18 | text | 205 | 197 | 17 | 10 | level, centred on x 213, growth.lt with shadow |
| H19 | pips | 223 | 198 | 81 | 9 | first row, right: ten hunger pips, filling from the right |
| H20 | strip | 122 | 209 | 182 | 5 | practice strip, thin, eighteen segments |
| H21 | hotbar | 122 | 216 | 182 | 22 | hotbar; the selector overhangs it by one unit all round |

- **Shows.** The four measures of a body, what is in the hands, where one is and which way one faces, who is near, what the Guide wants next, and what just happened. F1 hides all of it. The debug overlay (F3) is lines of the text face on a plain dark plate at the top left, and the crew list is not drawn while it shows.
- **Clickable.** Nothing. The HUD takes no pointer.
- **Keys.** 1 to 9 and the wheel choose a hotbar cell. Enter or T opens chat. Tab holds the roster open. V sets a ping. E, G and M open the pack, the journal and the map.
- **First.** A new arrival sees the hotbar empty with its first cell chosen, ten life pips, ten hunger pips, ten arm pips, the compass, and the first step of the Guide at the right.
- **Floating numbers** over a struck creature are the text face with shadow, `salt` for a blow, `ember.hi` for a critical one with an exclamation mark after it, `growth.lt` for mending. They rise by whole units and are cut after 0.85 s.
- **Narrow stage.** On a stage under 400 wide the crew and the status frames start at y 26, under the compass; toasts start at y 54, or under the strips while a boss bar is up, and two show at most; the Guide's step is one line, its title, right-aligned at y 126; pickups stand above the arm row, three lines at most, from y 150.
- **A blow from a side** shows as a wedge 9 by 5 of `blood` with a `root.0` outline, 40 units from the centre toward the side it came from, in one of eight directions, for 1 s.

### Pack, with the body panel and the patterns made by hand

Size 394 by 182, with tabs standing 21 above. Material: clay. Anchor: centre of the screen.

```
+------+                                                                                     +------+
|T1    |+------+------+                                                                      |T4    +------+
|      ||T2    |T3    |                                                                      |      |T5    |
+------++------+------+                                                                      +------+------+
#=================================#=============================================+--------+===#======================================#
#  "S1"                           #  "M1"                                       +-M2-----+   # "R1"                                 #
#                                 #  .----. +---------------+                                # +---------------+ +--------------+   #
#  "S2"                           #  |M3  | | M4 well       |                                # +-R2 field------+ +-R4 button----+   #
#  [S3                         ]  #  '----' |               | .----..----.                   #                                      #
#                                 #  .----. |               | |M5  ||    |          .----.   # +--+                                 #
#  +---------------------------+  #  |    | |               | '----''----'          |M7  |   # +--+                                 #
#  | S4 rows                   |  #  '----' |               | .----..----.  ==M6=>  '----'   #                                      #
#  |                           |  #  .----. |               | |    ||    |                   # +-------------------------------+    #
#  |                           |  #  |    | |               | '----''----'                   # | R5 well                       |    #
#  |                           |  #  '----' +---------------+                                # |                               |    #
#  |                           |  #                                                          # |                               |    #
#  |                           |  #  .----..----..----..----..----.                          # |                               |    #
#  +---------------------------+  #  |M8  ||    ||    ||    ||    |  "M9"                    # |                               |    #
#  "S5"                           #  '----''----''----''----''----'                          # |                               |    #
#                                 #                                                          # |                               |    #
#  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  #  .----..----..----..----..----..----..----..----..----.  # |                               |    #
#  +---------------------------+  #  |M10 ||    ||    ||    ||    ||    ||    ||    ||    |  # |                               |    #
#  | S7 rows                   |  #  '----''----''----''----''----''----''----''----''----'  # |                               |    #
#  |                           |  #  .----..----..----..----..----..----..----..----..----.  # |                               |    #
#  |                           |  #  |    ||    ||    ||    ||    ||    ||    ||    ||    |  # |                               |    #
#  |                           |  #  '----''----''----''----''----''----''----''----''----'  # |                               |    #
#  |                           |  #  .----..----..----..----..----..----..----..----..----.  # |                               |    #
#  |                           |  #  |    ||    ||    ||    ||    ||    ||    ||    ||    |  # |                               |    #
#  |                           |  #  '----''----''----''----''----''----''----''----''----'  # |                               |    #
#  |                           |  #                                                          # +-------------------------------+    #
#  |                           |  #  .----..----..----..----..----..----..----..----..----.  #                                      #
#  |                           |  #  |M11 ||    ||    ||    ||    ||    ||    ||    ||    |  #                                      #
#  +---------------------------+  #  '----''----''----''----''----''----''----''----''----'  # "R6"                                 #
#                                 #                                                          #                                      #
#=================================#==========================================================#======================================#
```

| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| S0 | slab | 0 | 0 | 104 | 182 | body panel, fastened to the left side |
| T1 | tab | 0 | -21 | 24 | 24 | top tabs of the body panel: Body (chosen), then States and Skills when those steps land |
| T2 | tab | 23 | -18 | 24 | 18 | States (to come) |
| T3 | tab | 46 | -18 | 24 | 18 | Skills (to come; opens the tree) |
| S1 | text | 8 | 6 | 88 | 10 | the player's name |
| S2 | text | 8 | 18 | 88 | 10 | "Level 14" in ink; practice as "320 / 900" in the small face, right-aligned to x 96 |
| S3 | strip | 8 | 29 | 88 | 5 | practice strip, thin, eleven segments |
| S4 | rows | 8 | 38 | 88 | 48 | four rows 12 tall: Strength, Agility, Vitality, Arm; value right-aligned to x 80; a 12 by 12 button "+" at x 84 while there are points |
| S5 | text | 8 | 87 | 88 | 10 | "3 to spend", only while there are points |
| S6 | rule | 8 | 98 | 88 | 2 | cut line |
| S7 | rows | 8 | 102 | 88 | 70 | seven rows 10 tall, label in faded ink, value in ink right-aligned to x 96: Defence, Melee, Ranged, Crystal-work, Totem, Critical, Speed |
| M0 | slab | 103 | 0 | 176 | 182 | main slab |
| M1 | text | 111 | 6 | 40 | 10 | "Pack" |
| M2 | button | 241 | 3 | 30 | 12 | "Sort": merges and orders the pack, leaves the hotbar |
| M3 | slots | 111 | 16 | 18 | 54 | head, body, legs, each with its silhouette |
| M4 | well | 131 | 16 | 50 | 54 | figure well: the body as worn |
| M5 | slots | 187 | 25 | 36 | 36 | the two by two grid |
| M6 | arrow | 227 | 37 | 22 | 15 | progress arrow, empty until a pattern matches, then full |
| M7 | slots | 253 | 34 | 18 | 18 | what the grid makes |
| M8 | slots | 111 | 74 | 90 | 18 | five trinket slots with the ring silhouette |
| M9 | text | 207 | 78 | 64 | 10 | lees carried: the jar mark and the number, right-aligned to x 168 |
| M10 | slots | 111 | 98 | 162 | 54 | the pack, nine by three |
| M11 | slots | 111 | 156 | 162 | 18 | the hotbar row, four units below the pack |
| R0 | slab | 278 | 0 | 116 | 182 | recipe panel, fastened to the right side and sharing the outline column |
| R1 | text | 286 | 6 | 60 | 10 | "By hand": the station whose patterns are listed |
| R2 | field | 286 | 16 | 50 | 14 | search; placeholder "Search"; longer text scrolls inside the field |
| R3 | check | 286 | 35 | 12 | 12 | checkbox with the label "Can make" at x 23 |
| R4 | button | 338 | 16 | 48 | 14 | kind of thing: All, Tools, Weapons, Armour, Trinkets, Blocks, Other; a click steps on, a right click steps back |
| R5 | well | 286 | 52 | 98 | 110 | dark well: five by 6 pattern cells of 18, then a scroll track 6 wide |
| R6 | text | 286 | 166 | 100 | 10 | "{lmb} lay out {rmb} make", in faded ink |
| T4 | tab | 278 | -21 | 24 | 24 | top tabs of the recipe panel: one for each station whose patterns may be read, the one in use first and chosen |
| T5 | tab | 301 | -18 | 24 | 18 | a station built before |

- **Shows.** What is carried and worn, what the body can do, and what two hands can make. The figure well shows the body with the worn pieces lit. The body panel holds the level, the four attributes and the seven totals. The recipe panel lists every pattern that can be laid on the two by two grid, and through its tabs the patterns of any station the crew has built.
- **Clickable.** Every slot (see Behaviour). "Sort". The "+" beside an attribute spends a point. A pattern cell: left click lays the pattern on the grid, right click makes one straight into the pack, shift and left click makes as many as the pack affords. The search field. "Can make". The kind button. Tabs.
- **Keys.** E or Esc closes. 1 to 9 swaps the hovered slot with that hotbar slot. Q drops one from the hovered slot, Ctrl and Q the stack. Tab walks: search, "Can make", kind, pattern cells, grid, result, equipment, trinkets, pack, hotbar, "Sort", attributes. Arrows move inside a grid. Enter is a left click on the focused part, Shift and Enter a shift click. G opens the journal. Typing a letter while nothing has focus puts it in the search field.
- **First.** No part has focus. The pointer stands where it last stood. The first Tab press lands on the search field.
- **Narrow.** Under 400 units of width the two panels leave the sides. The main slab stands alone with three side tabs on its left edge: Pack, Body, Making. Body and Making each replace the upper 92 units of the slab (the pack grid and hotbar stay).

### Chest

Size 176 by 172. Material: timber. Anchor: centre of the screen.

```
#==========================================================#
#  "C1"            +-------------++---------+ +--------+   #
#                  +-C2 button---++-C3------+ +-C4-----+   #
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
| C2 | button | 56 | 3 | 44 | 12 | "Take all" |
| C3 | button | 102 | 3 | 34 | 12 | "Stash": moves out of the pack every kind the chest already holds |
| C4 | button | 138 | 3 | 30 | 12 | "Sort" the chest |
| C5 | slots | 8 | 18 | 162 | 54 | the chest, nine by three |
| C6 | text | 8 | 76 | 40 | 10 | "Pack" |
| C7 | button | 138 | 73 | 30 | 12 | "Sort" the pack |
| C8 | slots | 8 | 88 | 162 | 54 | the pack, nine by three |
| C9 | slots | 8 | 146 | 162 | 18 | the hotbar row, four units below the pack |

- **Shows.** Twenty-seven slots of the box over the pack. Two players may have one chest open; each sees the other's changes as they land.
- **Clickable.** Slots and the four buttons. Shift and left click sends a stack across.
- **Keys.** E or Esc closes. Tab walks: chest grid, pack, hotbar, then the buttons left to right. 1 to 9 and Q as in the pack.
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
#         .----..----..----.                              #  +---------------++--------------+   #
#         |B2  ||    ||    |                              #  +-R2 field------++-R4 button----+   #
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
| B6 | button | 138 | 70 | 30 | 12 | "Sort" |
| B7 | slots | 8 | 84 | 162 | 54 | the pack, nine by three |
| B8 | slots | 8 | 142 | 162 | 18 | the hotbar row, four units below the pack |
| R0 | slab | 175 | 0 | 116 | 166 | recipe panel, fastened to the right side and sharing the outline column |
| R1 | text | 183 | 6 | 60 | 10 | "Workbench": the station whose patterns are listed |
| R2 | field | 183 | 16 | 50 | 14 | search; placeholder "Search"; longer text scrolls inside the field |
| R3 | check | 183 | 35 | 12 | 12 | checkbox with the label "Can make" at x 23 |
| R4 | button | 235 | 16 | 48 | 14 | kind of thing: All, Tools, Weapons, Armour, Trinkets, Blocks, Other; a click steps on, a right click steps back |
| R5 | well | 183 | 52 | 98 | 92 | dark well: five by 5 pattern cells of 18, then a scroll track 6 wide |
| R6 | text | 183 | 148 | 100 | 10 | "{lmb} lay out {rmb} make", in faded ink |
| T1 | tab | 175 | -21 | 24 | 24 | this station, chosen |
| T2 | tab | 198 | -18 | 24 | 18 | other stations built |

- **Shows.** The grid, what it makes, and the patterns of the station. The Line Frame has the same parts; its slab is timber and its arrow fills in arm blue instead of ember, because the work there is line and crystal.
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
| J2 | slots | 26 | 35 | 18 | 18 | first piece, ring silhouette |
| J3 | rule | 44 | 43 | 12 | 2 | cut line from the first piece to the remains |
| J4 | slots | 56 | 35 | 18 | 18 | the remains built into the bench: a locked slot showing Vanahar Remains |
| J5 | rule | 74 | 43 | 12 | 2 | cut line from the second piece |
| J6 | slots | 86 | 35 | 18 | 18 | second piece, ring silhouette |
| J7 | arrow | 108 | 37 | 22 | 15 | progress arrow |
| J8 | bigslot | 136 | 31 | 26 | 26 | the joined piece |
| J9 | text | 8 | 73 | 40 | 10 | "Pack" |
| J10 | button | 138 | 70 | 30 | 12 | "Sort" |
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
#  | F2 ring    |      |F3  |                             #  | L2 well                       |   #
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
| F2 | ring | 10 | 28 | 42 | 42 | the bed, captioned "Bed" in ink with its cell at 10, 17: a locked slot 18 square at 22, 40 holding the remains built in, or, empty, their silhouette (5.4); round it eight lamps 9 by 9 at the corners and the middles of the ring's sides, which show the bed's heat: dull in the furnace's stones until the bed reaches each eighth, then lit in ember, clockwise from the top left. The ring's tooltip: "Bed lit, 5 of 8" and "It heats while the fire burns" in `root.4`, or "Bed cold" |
| F3 | slots | 70 | 17 | 18 | 18 | what is to be worked, lump silhouette |
| F4 | flame | 71 | 36 | 13 | 15 | burn gauge: the fuel left, emptying downward |
| F5 | slots | 70 | 53 | 18 | 18 | fuel, flame silhouette |
| F6 | arrow | 96 | 36 | 22 | 15 | progress arrow, filling unit by unit |
| F7 | bigslot | 128 | 31 | 26 | 26 | what comes out |
| F8 | text | 8 | 73 | 40 | 10 | "Pack" |
| F9 | button | 138 | 70 | 30 | 12 | "Sort" |
| F10 | slots | 8 | 84 | 162 | 54 | the pack, nine by three |
| F11 | slots | 8 | 142 | 162 | 18 | the hotbar row, four units below the pack |
| L0 | slab | 175 | 0 | 116 | 166 | side panel, fastened right |
| L1 | text | 183 | 6 | 80 | 10 | "Works" |
| L2 | well | 183 | 18 | 100 | 128 | dark well of list rows 18 tall: icon and name of each thing this bed loosens or this fire sets; seven show, the rest scroll |
| L3 | text | 183 | 150 | 100 | 10 | the fuel left in seconds, small face, while burning |

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
#          .----..----.   .----. ++                        #
#          |P2  ||    |   |P3  | ||                        #
#          '----''----'   '----' ||      .-------.         #
#                 +--+           ||      |       |         #
#                 |  |           ||      | P7    |         #
#                 +--+           ||      |       |         #
#             .----.             ||      '-------'         #
#             |P5  |             ++                        #
#             '----'                                       #
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
| P2 | slots | 34 | 17 | 36 | 18 | remains to boil down, two slots |
| P3 | slots | 78 | 17 | 18 | 18 | salt |
| P4 | flame | 53 | 36 | 13 | 15 | burn gauge |
| P5 | slots | 43 | 53 | 18 | 18 | fuel |
| P6 | gauge | 100 | 20 | 6 | 50 | upright gauge: the night gone, filling from the bottom; nothing comes out before first light |
| P7 | bigslot | 122 | 31 | 26 | 26 | lees, as coin |
| P8 | text | 8 | 73 | 40 | 10 | "Pack" |
| P9 | slots | 8 | 84 | 162 | 54 | the pack, nine by three |
| P10 | slots | 8 | 142 | 162 | 18 | the hotbar row, four units below the pack |

- **Shows.** Designed now so that the slab family has room for it: remains, salt and fuel in, a night passing, lees out.
- **Clickable.** Slots.
- **Keys.** As the pack.
- **First.** Focus on the first remains slot.

### Shop

Size 176 by 214. Material: clay. Anchor: centre of the screen.

```
#==========================================================#
#  "H1"                            "H2"                    #
#                                                          #
#  "H3"                                                    #
#                                                          #
#                                                          #
#                                                          #
#  +---------------------------------------------------+   #
#  | H4 well                                           |   #
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
#                                                          #
#==========================================================#
```

| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| H0 | slab | 0 | 0 | 176 | 214 | clay slab |
| H1 | text | 8 | 6 | 80 | 10 | the townsperson's name |
| H2 | text | 104 | 6 | 64 | 10 | lees carried, right-aligned to x 168; beside it the count of Mūda when the Deserter deals |
| H3 | text | 8 | 18 | 160 | 20 | what they say, two lines at most, in ink, no quotation marks |
| H4 | well | 8 | 40 | 160 | 74 | dark well of four list rows 18 tall, scroll track at its right: icon, name in the colour of its grade, price right-aligned with the jar mark. Things sold this visit come first under a grey row "Sold just now" |
| H5 | text | 8 | 119 | 40 | 10 | "Pack" |
| H6 | button | 138 | 116 | 30 | 12 | "Sort" |
| H7 | slots | 8 | 130 | 162 | 54 | the pack, nine by three |
| H8 | slots | 8 | 188 | 162 | 18 | the hotbar row, four units below the pack |

- **Shows.** What one householder sells, what was just sold to them, and the pack to sell from. A price the buyer cannot meet is drawn in blood.lt and its row in grey.
- **Clickable.** A row buys one; shift and click buys ten. Shift and click on a pack slot sells the stack; a thing of grade Island or higher, a bait or a Recall Stone asks for the same click again within two and a half seconds (the slot takes the refusal frame and the tooltip says "Again to sell").
- **Keys.** Tab walks: rows, pack, hotbar, "Sort". Up and Down move along the rows and scroll the well. Enter buys.
- **First.** Focus on the first row.

### Journal: the Guide, bounties and standing

Size 292 by 180, with tabs standing 21 above. Material: book (5.19): a leather cover, clay.lt pages. Anchor: centre of the screen. Coordinates are from the book's top left.

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
| G0 | book | 0 | 0 | 292 | 180 | the book |
| G1 | tabs | 0 | -21 | 93 | 21 | tabs of the cover's leather (5.19), pitch 23, each with its mark: Guide (the lamp), Bounties (the note), Standing (the banner), Crew (two heads). The open section's ribbon lies in the gutter in its colour: blood, arm, growth, ember |
| G2 | text | 12 | 10 | 126 | 10 | left page heading: the chapter, as "Iron and Root" |
| G3 | rule | 12 | 21 | 126 | 1 | rule in clay.sh |
| G4 | rows | 12 | 24 | 126 | 130 | thirteen step rows 10 tall: a check mark and faded ink when done, the step wedge and ink for the present step, faded ink alone for those to come |
| G5 | turn | 12 | 161 | 16 | 7 | page back |
| G6 | text | 68 | 162 | 16 | 6 | page number, small face |
| G7 | text | 154 | 10 | 126 | 10 | right page heading: the chosen step |
| G8 | text | 154 | 24 | 126 | 60 | its telling, wrapped to 126, six lines at most |
| G9 | gauge | 154 | 88 | 126 | 7 | a sunk channel filling in ember, with "3 of 5" right-aligned above it; only for steps that count |
| G10 | text | 154 | 104 | 126 | 20 | where to: "Nearest altar 212 east", in arm.dk. It is the line the crew acts on, so it wraps onto a second line rather than being cut, and is cut with `…` only after that |
| G11 | text | 154 | 118 | 126 | 30 | what the step gives: practice, and what it opens, in faded ink; three lines at most, or two starting 4 under a where-to of two lines |
| G12 | turn | 264 | 161 | 16 | 7 | page on |
| G13 | text | 210 | 162 | 16 | 6 | page number |

- **Shows.** One book shared by the crew. Guide: the order of work, a chapter to a left page, the chosen step on the right. Bounties (to come): the left page lists what householders and sand-country people ask, each row with the asker's mark and the heads of the crew who took it; the right page gives the task, the pay and one button, "Take" or "Leave", 60 by 14 at 154, 150. Standing (to come): a page to each people, a sunk channel with five notches for how the crew stands, under it what raises it, what lowers it, and what the next notch opens. Crew: the roster as a page, with each one's level and job.
- **Clickable.** A step row or a bounty row chooses it. The tabs. The page arrows. "Take".
- **Keys.** G or Esc closes. Left and Right turn the page. Up and Down move the choice. 1 to 4 pick a tab. Enter presses the page's one button.
- **First.** Opens at the Guide, at the page of the present step, with that step chosen.
- **Narrow.** Unchanged: 292 fits 320.

### Codex and bestiary (to come)

Size 292 by 180, with tabs standing 21 above. Material: book (5.19). Anchor: centre of the screen. Coordinates are from the book's top left.

```
+-------+
| X1    |+------++------++------++------+
#================================================================================================#
#                                                                                                #
#   "X2"                                           "X5"                                          #
#                                                                                                #
#   .----..----..----..----..----..----..----.     "X6"                                          #
#   |X3  ||    ||    ||    ||    ||    ||    |                                                   #
#   '----''----''----''----''----''----''----'     +-----------------+ +--------------------+    #
#   .----..----..----..----..----..----..----.     | X7 well         | | X8 rows            |    #
#   |    ||    ||    ||    ||    ||    ||    |     |                 | |                    |    #
#   '----''----''----''----''----''----''----'     |                 | |                    |    #
#   .----..----..----..----..----..----..----.     |                 | |                    |    #
#   |    ||    ||    ||    ||    ||    ||    |     |                 | |                    |    #
#   '----''----''----''----''----''----''----'     |                 | |                    |    #
#   .----..----..----..----..----..----..----.     |                 | |                    |    #
#   |    ||    ||    ||    ||    ||    ||    |     +-----------------+ +--------------------+    #
#   '----''----''----''----''----''----''----'                                                   #
#   .----..----..----..----..----..----..----.     "X9"                                          #
#   |    ||    ||    ||    ||    ||    ||    |                                                   #
#   '----''----''----''----''----''----''----'                                                   #
#   .----..----..----..----..----..----..----.                                                   #
#   |    ||    ||    ||    ||    ||    ||    |                                                   #
#   '----''----''----''----''----''----''----'                                                   #
#   .----..----..----..----..----..----..----.                                                   #
#   |    ||    ||    ||    ||    ||    ||    |                                                   #
#   '----''----''----''----''----''----''----'                                                   #
#                                                                                                #
#                                                                                                #
#   [X4 ]                                                                               [X10]    #
#                                                                                                #
#                                                                                                #
#================================================================================================#
```

| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| X0 | book | 0 | 0 | 292 | 180 | the book |
| X1 | tabs | 0 | -21 | 116 | 21 | tabs of the cover's leather (5.19), pitch 23, each with its mark: Creatures (a beast's head), Matter (a bar), Places (the map), Peoples (a bust), Old things (a gilt relic). The open section's ribbon lies in the gutter in its colour: blood, ember, growth, arm, violet.lt |
| X2 | text | 12 | 10 | 126 | 10 | heading of the section |
| X3 | slots | 12 | 24 | 126 | 126 | seven by seven entry slots sunk in the page (ramp clay, floor clay.sh). A kind not yet seen shows its silhouette in clay.face; a kind seen shows its icon |
| X4 | turn | 12 | 161 | 16 | 7 | page back |
| X5 | text | 154 | 10 | 126 | 10 | the name, in ink |
| X6 | text | 154 | 20 | 126 | 20 | how it is said and whose word it is, in faded ink, wrapped onto a second line when it needs one; what follows moves down by that line |
| X7 | well | 154 | 32 | 56 | 56 | picture well, dark |
| X8 | rows | 214 | 32 | 66 | 50 | the facts, in order where (arm.dk, a link), when, what it leaves: each wrapped onto two lines when it needs them rather than cut, five lines in all, the last fact keeping at least one |
| X9 | text | 154 | 92 | 126 | 66 | the four steps of what is known (first sight, first kill, many kills, a thing seen once): each a paragraph when known, and one rule in clay.sh when not, to the page's foot at y 158 |
| X10 | turn | 264 | 161 | 16 | 7 | page on |

- **Shows.** What the crew has met, shared by everyone on the server. Each entry fills in by the four steps of chapter 8.9 of the world bible; a step not reached is a blank rule, never a row of question marks.
- **Clickable.** Entry slots, tabs, page arrows.
- **Keys.** Arrows move among the entry slots, Page Up and Page Down turn the page, 1 to 5 pick a tab, Esc closes.
- **First.** Opens where it was last shut; the first time, at Creatures with the first seen entry chosen.

### Skill tree (to come)

Size 260 by 206, with tabs standing 21 above and 21 to the left. Material: stone. Anchor: centre of the screen.

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
| K0 | slab | 0 | 0 | 260 | 206 | stone slab |
| T1 | tab | 0 | -21 | 24 | 24 | top tabs, one to a job, item icon on each: Melee, Ranged, Crystal-work, Totem, and the cutter's trade |
| U1 | tab | -21 | 14 | 24 | 24 | side tabs, one to each of the crew online, a head in their colour: one's own first and chosen; another's tree is read, not changed |
| K1 | text | 8 | 6 | 100 | 10 | the job's name |
| K2 | text | 170 | 6 | 82 | 10 | "3 to spend", right-aligned to x 252, in growth.dk |
| K3 | well | 8 | 18 | 244 | 160 | the field: a sunk well whose floor is the ground tile in stone.dk and stone.pit, panned by dragging; nodes 26 square on a lattice of 40; links between them |
| K4 | text | 8 | 184 | 196 | 10 | the chosen node: its name, then its rank as "1 of 3" |
| K5 | button | 208 | 182 | 44 | 16 | "Take"; disabled when the node cannot be taken |

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
| W2 | well | 8 | 18 | 212 | 170 | the chart, drawn as a map is drawn, not as contours: one unit to 8, 4 (the first zoom) or 2 strides, each unit one of eight kinds in a fixed palette, face and edge: water `arm.dk`; sand `timber.hi`, `timber.face`; grass `growth`, `growth.dk`; forest `growth.dk`, `root.1`; roofs of a settlement `timber.sh`, `timber.pit`; stone `stone.face`, `stone.sh`; snow `salt`, `stone.lt`; ground not yet walked parchment, `clay.face`. The kinds stand in that order of height, and a unit with a lower neighbour takes its kind's edge tone, so that shores, cliffs and roofs are ringed by lines one unit wide; parchment beside known ground is `clay.sh`, the edge of what is charted. Countries are named under the pointer (W3), not coloured each their own. Marks are 7 by 7 and lit from the top left. On it: one's own arrow, friends' heads in their colours, pings, the bed, the fall mark, known altars and gates |
| W3 | text | 8 | 194 | 170 | 10 | under the pointer: "X -104  Z 2210", then the country's name |
| W4 | button | 190 | 192 | 14 | 14 | "-" |
| W5 | button | 206 | 192 | 14 | 14 | "+" |
| W6 | well | 226 | 18 | 78 | 128 | known places as list rows 18 tall, scroll track at the right: the bed, the mouth, each gate raised, each altar found, each friend |
| W7 | button | 226 | 152 | 78 | 16 | "Travel"; disabled unless the chosen place can be reached |
| W8 | text | 226 | 172 | 78 | 30 | what the crossing needs, wrapped: "Recall Stone, cooling 0:12" |

- **Shows.** A chart drawn in the palette, never a photograph of the terrain. Travel between known places goes by what the world allows: the Recall Stone to the bed, a gate to its far mouth. A sealed store has a tab of its own while someone is inside: its rooms are drawn on the ground tile as they are entered, doors as gaps, a locked door with the key silhouette on it.
- **Clickable.** Dragging pans the chart; the wheel and the two buttons zoom in three whole steps (8, 4 and 2 strides to the unit). A click on a place in the list centres on it. A right click on the chart sets a ping there. "Travel".
- **Keys.** M or Esc closes. Arrows pan by 16 units. + and - zoom. Tab moves between the list and "Travel". 1 to 3 pick a place tab.
- **First.** Centred on the player, at the middle zoom, with the bed chosen in the list.
- **Narrow.** Unchanged: 312 fits 320.

### Reworking bench (to come)

Size 176 by 166. Material: stone. Anchor: centre of the screen.

```
#==========================================================#
#  "Q1"                                                    #
#                                                          #
#          .----.                                          #
#          |Q4  |                                          #
#          '----'                        .-------.         #
#  .----.            +--+                |       |         #
#  |Q2  |~~~         |  |     ==Q8=>     | Q9    |         #
#  '----'            +--+                |       |         #
#          .----.    .----.              '-------'         #
#          |Q5  |    |Q7  |     +------------------+       #
#          '----'    '----'     +-Q10 button-------+       #
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
| Q2 | slots | 8 | 35 | 18 | 18 | the remains built in, locked |
| Q3 | rule | 26 | 43 | 8 | 2 | cut line |
| Q4 | slots | 34 | 17 | 18 | 18 | the piece to rework, blade silhouette |
| Q5 | slots | 34 | 53 | 18 | 18 | a bar of the same metal, bar silhouette |
| Q6 | flame | 63 | 36 | 13 | 15 | burn gauge |
| Q7 | slots | 62 | 53 | 18 | 18 | fuel |
| Q8 | arrow | 90 | 36 | 22 | 15 | progress arrow |
| Q9 | bigslot | 122 | 31 | 26 | 26 | the piece as it comes out |
| Q10 | button | 96 | 57 | 60 | 14 | "Work it"; disabled until piece, bar and fuel are in |
| Q11 | text | 8 | 73 | 40 | 10 | "Pack" |
| Q12 | slots | 8 | 84 | 162 | 54 | the pack, nine by three |
| Q13 | slots | 8 | 142 | 162 | 18 | the hotbar row, four units below the pack |

- **Shows.** A made piece put at hazard for a better setting. While all three are in, the result slot shows the piece as a silhouette and its tooltip says what may change: the modifier is drawn again, the metal stays. Named old things answer with the refusal frame.
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
| A1 | logo | 119 | 30 | 190 | 36 | the title mark |
| A2 | text | 113 | 78 | 200 | 10 | one line, centred, only when it is true: why nothing will be saved, in blood.lt |
| A3 | button | 113 | 96 | 200 | 20 | "Worlds" |
| A4 | button | 113 | 120 | 200 | 20 | "Join a server" |
| A5 | button | 113 | 144 | 200 | 20 | "Settings" |
| A6 | button | 113 | 168 | 200 | 20 | "Controls" |
| A7 | text | 4 | 230 | 80 | 6 | the build, small face, root.4 |

- **Shows.** The mark and four doors. No subtitle, no picture behind, no news.
- **Clickable.** The four buttons.
- **Keys.** Up and Down move the focus, Enter presses, W opens Worlds, J the join screen.
- **First.** Focus drawn on "Worlds" (salt outline).

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
| V1 | text | 73 | 8 | 100 | 10 | "Worlds", salt with shadow |
| V2 | well | 73 | 22 | 280 | 146 | dark well, the ground tile showing above and below it: rows 36 tall. Line one the world's name in salt; line two in root.4: "seed 4471, last played 12 November, level 14" |
| V3 | button | 73 | 176 | 136 | 20 | "Play"; disabled with no row chosen |
| V4 | button | 217 | 176 | 136 | 20 | "New world" |
| V5 | button | 73 | 200 | 136 | 20 | "Delete"; pressed once it reads "Delete for good"; if the world is open in another tab it reads "Open in another tab" and is disabled |
| V6 | button | 217 | 200 | 136 | 20 | "Back" |

- **Shows.** The worlds saved in this browser, newest first.
- **Clickable.** A row chooses it, a second click plays it. The four buttons.
- **Keys.** Up and Down choose, Enter plays, N makes a new one, Delete asks, Esc goes back.
- **First.** The newest world is chosen and "Play" has focus. With no worlds the well holds one grey line, "No world yet", and "New world" has focus.

### New world

Size 427 by 240. Material: ground tile. Anchor: the whole screen.

```
+==============================================================================================================================================+
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                     "N1"                                                                                                     "
"                                                                                                                                              "
"                                                                                                                                              "
"                                     "N2"                                                                                                     "
"                                                                                                                                              "
"                                     +-----------------------------------------------------------------+                                      "
"                                     | N3 field                                                        |                                      "
"                                     +-----------------------------------------------------------------+                                      "
"                                                                                                                                              "
"                                     "N4"                                                                                                     "
"                                     +-----------------------------------------------------------------+                                      "
"                                     | N5 field                                                        |                                      "
"                                     +-----------------------------------------------------------------+                                      "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                     +-----------------------------------------------------------------+                                      "
"                                     | N6 button                                                       |                                      "
"                                     +-----------------------------------------------------------------+                                      "
"                                                                                                                                              "
"                                     +-----------------------------------------------------------------+                                      "
"                                     | N7 button                                                       |                                      "
"                                     +-----------------------------------------------------------------+                                      "
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
| N1 | text | 113 | 40 | 200 | 10 | "New world", salt with shadow |
| N2 | text | 113 | 60 | 60 | 10 | "Name", root.4 |
| N3 | field | 113 | 70 | 200 | 16 | at most 28 characters; holds "New world", selected |
| N4 | text | 113 | 94 | 60 | 10 | "Seed", root.4 |
| N5 | field | 113 | 104 | 200 | 16 | at most 32 characters; placeholder "Left empty, one is drawn" |
| N6 | button | 113 | 150 | 200 | 20 | "Create" |
| N7 | button | 113 | 174 | 200 | 20 | "Back" |

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
"                                     "O1"                                                                                                     "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                     "O2"                                                                                                     "
"                                     +-----------------------------------------------------------------+                                      "
"                                     | O3 field                                                        |                                      "
"                                     +-----------------------------------------------------------------+                                      "
"                                                                                                                                              "
"                                     "O4"                                                                                                     "
"                                                                                                                                              "
"                                     +-----------------------------------------------------------------+                                      "
"                                     | O5 field                                                        |                                      "
"                                     +-----------------------------------------------------------------+                                      "
"                                                                                                                                              "
"                                     "O6"                                                                                                     "
"                                     +-----------------------------------------------------------------+                                      "
"                                     | O7 field                                                        |                                      "
"                                     +-----------------------------------------------------------------+                                      "
"                                                                                                                                              "
"                                     "O8"                                                                                                     "
"                                                                                                                                              "
"                                                                                                                                              "
"                                     +-----------------------------------------------------------------+                                      "
"                                     | O9 button                                                       |                                      "
"                                     +-----------------------------------------------------------------+                                      "
"                                                                                                                                              "
"                                     +-----------------------------------------------------------------+                                      "
"                                     | O10 button                                                      |                                      "
"                                     +-----------------------------------------------------------------+                                      "
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
| O1 | text | 113 | 24 | 200 | 10 | "Join a server", salt with shadow |
| O2 | text | 113 | 44 | 60 | 10 | "Address", salt with shadow: a label on the ground is text on dark |
| O3 | field | 113 | 54 | 200 | 16 | host and port; filled in when the page was served by a game server |
| O4 | text | 113 | 78 | 60 | 10 | "Name", salt with shadow |
| O5 | field | 113 | 88 | 200 | 16 | one to sixteen of A to Z, a to z, 0 to 9, space, _ and -; any other key is refused with the blood frame for 0.3 s |
| O6 | text | 113 | 112 | 200 | 10 | "Password, if it has one", salt with shadow |
| O7 | field | 113 | 122 | 200 | 16 | drawn as one 3 by 3 dot to a character |
| O8 | text | 113 | 144 | 200 | 10 | one line: what the server answered ("Spark, 3 of 8 here"), or why it refused, in blood.lt. A refusal about one field ("That name is taken", "Wrong password") stands instead 2 under that field, the field is framed in blood until it is changed, and the rows under it move down 12 |
| O9 | button | 113 | 160 | 200 | 20 | "Join"; disabled until address and name are valid |
| O10 | button | 113 | 184 | 200 | 20 | "Back" |

- **Shows.** Address, name, password. The refusals are said plainly: "That name is taken", "Wrong password", "The server is full", "This server runs another version", "No answer".
- **Clickable.** Fields and buttons.
- **Keys.** Tab order top to bottom, Enter presses "Join", Esc goes back.
- **First.** Focus in the first empty field.

### Pause

Size 427 by 240. Material: the world, dimmed. Anchor: the whole screen.

```
+==============================================================================================================================================+
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                                                                                                                              "
"                                     "Z1"                                                                                                     "
"                                                                                                                                              "
"                                     "Z2"                                                                                                     "
"                                                                                                                                              "
"                                     "Z3"                                                                                                     "
"                                                                                                                                              "
"                                                                                                                                              "
"                                     +-----------------------------------------------------------------+                                      "
"                                     | Z4 button                                                       |                                      "
"                                     +-----------------------------------------------------------------+                                      "
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
| Z1 | text | 113 | 40 | 200 | 10 | "Paused", centred, salt with shadow; on a server "Menu", since the world goes on |
| Z2 | text | 113 | 52 | 200 | 10 | the world's name, centred, root.4 |
| Z3 | text | 113 | 64 | 200 | 10 | one line, centred: "Saved", "Saving", or why not, in blood.lt |
| Z4 | button | 113 | 84 | 200 | 20 | "Back to the game" |
| Z5 | button | 113 | 108 | 200 | 20 | "Settings" |
| Z6 | button | 113 | 132 | 200 | 20 | "Controls" |
| Z7 | button | 113 | 156 | 200 | 20 | "Save and leave"; on a server "Leave" |

- **Shows.** Four buttons on the dimmed world. No slab.
- **Clickable.** The buttons.
- **Keys.** Esc goes back to the game. Up, Down, Enter.
- **First.** Focus on "Back to the game".

### Settings

Size 248 by 206, with tabs standing 21 above. Material: clay. Anchor: centre of the screen, over the ground tile from the title or over the dimmed world from the pause.

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
| E0 | slab | 0 | 0 | 248 | 206 | clay slab |
| T1 | tab | 0 | -21 | 24 | 24 | top tabs: Picture, Play, Sound, Interface |
| E1 | text | 8 | 6 | 100 | 10 | the tab's name |
| E2 | rows | 8 | 20 | 224 | 160 | ten rows 16 tall, the rest scroll. Label in ink at x 8. A switch is a checkbox right-aligned to x 232. A measure is a slider 80 wide at x 152 with its value right-aligned to x 146. A choice is a button 80 by 14 at x 152 that steps through its values |
| E3 | scroll | 234 | 20 | 6 | 160 | scroll track, light variant (floor clay.dk, thumb as the slider handle) |
| E4 | button | 74 | 184 | 100 | 16 | "Done" |

- **Shows.** Picture: preset, render distance, field of view, resolution scale, texture filtering, adaptive resolution, bloom, sun shadows, tone mapping, vignette, the two edge smoothings, clouds, sway, eye adaptation. Play: mouse sensitivity, view bobbing, screen shake, auto-jump, tool switching, double-tap to fly, raw mouse. Sound: effects, music. Interface: scale (Auto, then each whole number that fits), chat lines shown, coordinates on or off.
- **Clickable.** Controls, tabs, "Done". A change takes effect at once and is saved at once; there is no "Apply".
- **Keys.** Up and Down move along the rows, Left and Right change the focused control by one step, Space flips a switch, Q and E step through the tabs, Esc is "Done".
- **First.** Focus on the first row of the tab last open.

### Controls

Size 248 by 206. Material: clay. Anchor: as Settings.

```
#==================================================================================#
#  "Y1"                                                                            #
#                                                                                  #
#  +-----------------------------------+   +-----------------------------------+   #
#  | Y2 rows                           |   | Y3 rows                           |   #
#  |                                   |   |                                   |   #
#  |                                   |   |                                   |   #
#  |                                   |   |                                   |   #
#  |                                   |   |                                   |   #
#  |                                   |   |                                   |   #
#  |                                   |   |                                   |   #
#  |                                   |   |                                   |   #
#  |                                   |   |                                   |   #
#  |                                   |   |                                   |   #
#  |                                   |   |                                   |   #
#  |                                   |   |                                   |   #
#  |                                   |   |                                   |   #
#  |                                   |   |                                   |   #
#  |                                   |   |                                   |   #
#  |                                   |   |                                   |   #
#  |                                   |   |                                   |   #
#  |                                   |   |                                   |   #
#  |                                   |   |                                   |   #
#  |                                   |   |                                   |   #
#  |                                   |   |                                   |   #
#  |                                   |   |                                   |   #
#  |                                   |   |                                   |   #
#  |                                   |   |                                   |   #
#  |                                   |   |                                   |   #
#  +-----------------------------------+   +-----------------------------------+   #
#                                                                                  #
#                        +-------------------------------+                         #
#                        | Y4 button                     |                         #
#                        +-------------------------------+                         #
#==================================================================================#
```

| | Part | x | y | w | h | What |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Y0 | slab | 0 | 0 | 248 | 206 | clay slab |
| Y1 | text | 8 | 6 | 100 | 10 | "Controls" |
| Y2 | rows | 8 | 20 | 112 | 160 | left column, rows 13 tall: a key cap, then what it does in ink at x 48 |
| Y3 | rows | 128 | 20 | 112 | 160 | right column, the same |
| Y4 | button | 74 | 184 | 100 | 16 | "Done" |

- **Shows.** The keys as drawn caps: move, jump, sneak, sprint, the three mouse buttons, pack, journal, map, chat, roster, ping, drop, salve, hotbar, hide the interface, pause.
- **Clickable.** "Done".
- **Keys.** Esc or Enter.
- **First.** Focus on "Done".

### The screen at a fall

Size 427 by 240. Material: the world under a flat wash of blood.dk at half strength, and no window: the fall is not a container and the wash is its ground, as in the tradition. Anchor: the column 200 wide, y from the top of the block 240 tall centred on the screen.

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
"                                                                                                                                              "
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
| D1 | raised | 175 | 56 | 78 | 22 | "You fell" in raised letters (5.28), centred on the column |
| D2 | text | 113 | 86 | 200 | 10 | what did it, centred, salt with shadow: "to a Tama", "from a height", "to hunger" |
| D3 | text | 113 | 98 | 200 | 10 | what was shed, centred, salt with shadow: the jar mark and "14 shed in the wood"; left out when nothing was |
| D4 | button | 113 | 118 | 200 | 20 | "Rise again" |
| D5 | button | 113 | 142 | 200 | 20 | "Save and leave"; on a server "Leave" |

- **Shows.** The wash comes up in three steps over 0.3 s; the buttons are disabled for 0.8 s so that a blow in flight cannot press one. With friends near, their name tags and the chat stay drawn over the wash.
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
| I1 | logo | 119 | 60 | 190 | 36 | the title mark |
| I2 | gauge | 122 | 130 | 182 | 7 | a sunk channel on the tile filling in ember, unit by unit, never running back |
| I3 | text | 113 | 142 | 200 | 10 | one line, centred, root.4: what is being done ("Laying the ground", "Coming up") |

- **Shows.** The mark, a channel and one line. On a server the line also says how many are there.
- **Clickable.** Nothing.
- **Keys.** Esc gives up a join and goes back to the title.
- **First.** Nothing has focus.

### Chat, open

The HUD's chat with its entry (5.23): twelve lines ending where closed chat ends, and the entry along the bottom of the stage at 4, h - 16, over the hotbar. The crew list is not drawn while chat is open. Enter sends and closes; Esc closes and keeps the text for the next time; Up and Down walk through what was sent before; a line that starts with `/` is a command and its answer comes back as a server line. While chat is open the game takes no key.

### Roster

5.24, drawn while Tab is held. It takes no pointer and no focus.

### States of a body (to come)

The second tab of the body panel. The upper part is a well 88 by 96 at 8, 16 holding a figure 32 by 64 drawn front on; a state marks the part of the body it sits in with its status icon (the arm for an overdriven arm, the trunk for spore in a wound, the back for remains carried). Under the well, list rows 18 tall on the slab: status icon in its frame, the state's name in ink, the time left right-aligned, and in the tooltip what ends it. The six kinds of harm are not shown on the body; each is a 9 by 9 mark beside a number wherever a tooltip gives harm (an edge, a weight, a flame, the loosening, a fall, the sun), and a creature's entry in the codex lists the kinds it yields to and the kinds it turns.

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

**Focus.** The pointer and the keys are equals. Tab and Shift-Tab walk the parts that take focus in reading order: within a slab from the top left, row by row; across slabs the main slab, then the right panel, then the left. The arrow keys move inside a grid or a list. Enter and Space press. Esc closes the topmost screen. Focus is drawn (a `salt` outline on a button, a `salt` frame inside a slot, a field, a row or a checkbox) only after a key has moved it, and stops being drawn when the pointer moves.

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
38. Does every button show tooled stone with a light top row and a dark bottom, and is the hovered one outlined in salt with its label in ember?
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

**Small choices.** A hit turns the crosshair into four ticks two units long, outlined like the cross. A banner's text is clipped inside its frame so that a descender's shadow cannot notch it. A node's ranks stand on a scrap of `root.0` so that a link passing under them does not run through the figures. The roster writes the level as a bare number and a distance with an `M`. The silhouette in a hovered slot is drawn in `face`, since the hovered floor is `sh`. A row that cannot be used draws its icon flat in `root.4`. A password field draws its dots at a pitch of 4. A toast's first line takes the light tone of its frame (`growth.lt` for growth, `blood.lt` for blood, salt for `root.4`, a grade's frame as it is). The thumb of a track sunk in a slab is the slider's handle cut to 6 wide, its grip in the third column.

**Sheets and pictures.** The kit page's sheets of parts are `parts`, `parts-controls`, `parts-gauges`, `parts-hud`, `parts-plates`, `parts-book` and `parts-icons`; `uishot --screen parts` takes them all. The mock screens use 24 sample items drawn in the palette (`mock/icons.ts`); the interface's own marks, for tabs that open a page and for the states of a slot, are in `art/icons.ts`.

**Screens of the books set.** Each screen of section 6 is a file under `screens/` that exports `SCREENS`, a list of named screens; `screens/index.ts` gathers every such file, and every `ICONS` a file under `sample/` exports, so that a screen is added without editing a shared list. A screen's hard cases are screens of their own named after it (`worlds-empty`, `join-taken`, `codex-unseen`), so that `uishot --screen worlds` takes them all. A press that would open another screen in the game opens that mock screen on the kit page.

**Full-screen menus.** A menu's table is written for 427 by 240. Its parts are moved so that the table's x of 113 is the left of the 200-wide column centred on the screen, and its y is measured from the top of a block 240 tall centred on the screen; the build line alone stands at the screen's own bottom left.

**Windows on a short screen.** A window with tabs is centred with its tabs left out, then moved as little as it takes for the tabs to stand 3 units inside the screen; on a screen 240 tall the settings, the tree and the map therefore stand 24 from the top.

**The caret** stays lit for 1.5 s after its field takes focus or its text changes, then blinks, as carets do while one types.

**Lists.** A well may hold rows taller than 18 (the worlds' rows of 36, two lines), paint a row's own content over the floor and frame it draws, take a second press or Enter on the chosen row as "use", and say one grey line when it holds no rows. Up and Down on a focused row move the choice and keep it in the well.

**Rows written on a page.** A row of a list on a page (steps, bounties, the crew) is ink on the page: hovered, its floor is `clay.face`; chosen, `clay.sh`; with keyboard focus, a frame of salt. A player on a page is their 2 by 7 flag beside their name in ink.

**The codex.** An entry slot is the clay slot with a floor of `clay.sh`, its silhouette `clay.face` (`clay.sh` while hovered). The picture well holds the 16 by 16 picture standing on a strip of the ground tile at its foot. The four steps run on without gaps, a rule of `clay.sh` standing for each one not known, cut with `…` at the box's foot. The first short fact is where, in `arm.dk`.

**The chart.** Ground is known by chunks of 32 strides that a way walked passed within 56 strides of, so that what is known has square edges. Its marks are 7 by 7 like the compass's: one's own arrow, redrawn for each of four quarters rather than turned, a known altar, a raised gate and the mouth. A part may take `move`, the pointer moving to another unit over it, which is how the chart says what is under the pointer.

**The tree** pans no further than its farthest node and a margin of 8. On the tree screen the crew's side tabs start 14 down, clear of the first job's tab.

**Pictures of the books** (creatures, the eight, sites, peoples, old things, the bed and the mouth) were drawn as masks of materials and shaded by the rule for raised shapes: a unit whose neighbour above or to the left is not of its material takes the material's light tone, one whose neighbour below or to the right is not takes its dark tone, the rest its face, and every empty unit beside the shape is `root.0`. Only the shaded rows are kept in the kit.

**Moving samples** (the loading channel, the Recall Stone's cooling) hold still for their first three seconds, so that a shot taken as the page opens is the frame the grid check models.
