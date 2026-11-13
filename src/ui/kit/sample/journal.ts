// Sample journal: the Guide's chapters and steps as src/data/quests.ts has them, the bounties householders and the
// sand-country people ask, and the crew's standing with the two peoples (world bible 8.5).

export interface Step {
  key: string;
  title: string;
  /** Its telling, wrapped on the right page. */
  hint: string;
  /** For a step that counts: how many it needs. */
  need?: number;
  /** Where to go, said in ink beside the compass mark: the thing, then how far and which way. */
  where?: string;
  /** What it gives and opens. */
  gives?: string;
}

export interface Chapter { title: string; steps: Step[] }

export const CHAPTERS: Chapter[] = [
  { title: 'Empty Hands', steps: [
    { key: 'wood', title: 'Gather wood', hint: 'Hold left-click on a tree trunk to break it. Collect 4 logs.', need: 4 },
    { key: 'bench', title: 'Make a workbench', hint: 'Press E. Turn a log into planks, then arrange four planks in a square.' },
    { key: 'woodpick', title: 'Craft a wooden pick', hint: 'Place the workbench and right-click it. Three planks over two sticks. The recipe book fills the grid for you.' },
    { key: 'stonepick', title: 'Upgrade to stone', hint: 'Dig down to stone, then craft a stone pick at the workbench.' },
    { key: 'torch', title: 'Light the dark', hint: 'Coal over a stick makes torches. Coal shows as black flecks in stone. Shades walk at night.' },
    { key: 'furnace', title: 'Build a furnace', hint: 'Eight rubble in a ring at the workbench.' },
  ] },
  { title: 'Iron and Root', steps: [
    { key: 'iron', title: 'Smelt iron', hint: 'Iron ore has tan flecks and needs a stone pick. Smelt it in the furnace with coal or wood.', need: 3, where: 'Iron ore: 38 strides down', gives: 'Practice at the furnace. Opens Forge an anvil.' },
    { key: 'anvil', title: 'Forge an anvil', hint: 'Seven iron bars at the workbench. Metal gear is made on it.', gives: 'Opens the anvil and all metal gear.' },
    { key: 'ironpick', title: 'Craft an iron pick', hint: 'At the anvil. It can break gold, geodes and Hīrak.', gives: 'Opens gold, geodes and Hīrak to the pick.' },
    { key: 'house', title: 'Raise a home', hint: "Enclose a room with a door and a torch, then place a Holder's Bed (hide over planks). Someone will come.", gives: 'A Desik moves in and charts the way.' },
    { key: 'idol', title: 'Carve a Vanahar Likeness', hint: 'A log, 2 fiber, 2 jelly (from Kinva) and a red flower, at the workbench.', need: 1, gives: 'Opens Bait Vanahar.' },
    { key: 'boss1', title: 'Bait Vanahar', hint: 'Right-click the Vanahar Altar while holding the likeness. Bring food, salves and armour.', where: 'Vanahar Altar: 212 strides east', gives: 'The Joining Bench; a Kāru and a Vejja move in. Night raids begin.' },
  ] },
  { title: 'The Deep Stone', steps: [
    { key: 'tinker', title: 'Build a Joining Bench', hint: 'Vanahar Remains between two iron bars, over planks. It joins two trinkets into one.' },
    { key: 'lumenite', title: 'Find Hīrak', hint: 'Cyan gems glowing in deep rock, far below sea level (y under 34). Iron pick or better.', need: 3 },
    { key: 'lumpick', title: 'Craft a Hīrak Pick', hint: 'At the anvil. It bites Jalit ore and black glass.' },
    { key: 'lure', title: 'Bait a Maruhar Lure', hint: '2 sandstone, a gold bar, raw meat and ember dust (Angār haunt dunes at night and lava caves).', need: 1 },
    { key: 'boss2', title: 'Bait Maruhar', hint: 'Use the lure at a Maruhar Altar. It strikes from below: keep moving when the sand ripples.', where: 'Maruhar Altar: 1,240 strides south' },
    { key: 'emberforge', title: 'Build a Maruhar Furnace', hint: 'Maruhar Remains ringed by deep rock. It loosens Jalit ore, the glowing orange ore near lava.' },
    { key: 'cinder', title: 'Forge Jalit', hint: 'Smelt Jalit ore in the Maruhar Furnace and make a full set of armour for your style.', need: 5 },
    { key: 'bell', title: 'Cast a Kankāl Bell', hint: '2 iron bars, Hīrak, 2 shade flesh and 2 bone, at the anvil. Chests in a sealed store sometimes hold one.', need: 1 },
    { key: 'boss3', title: 'Bait Kankāl', hint: 'Ring the bell at a Kankāl Altar. Its orbs are slow: sidestep, do not back away.' },
  ] },
  { title: 'Under the World', steps: [
    { key: 'gate1', title: 'Raise a Hollow Gate', hint: 'Black Glass is the black glass rimming lava pools near bedrock (y under 12). Hīrak Pick. Seven of it around Kankāl Remains at the anvil, then place the gate.' },
    { key: 'dim1', title: 'Cross to the hollow', hint: 'Step into the gate and hold still.' },
    { key: 'umbrite', title: 'Work Antar', hint: 'Violet ore in hollow rock. Jalit Pick required. The Maruhar Furnace will smelt it.', need: 5 },
    { key: 'censer', title: 'Fill a Guhamāt Smoker', hint: '2 Antar bars, 3 spore sacs and a glowing mushroom, at the anvil.', need: 1 },
    { key: 'boss4', title: 'Bait Guhamāt', hint: 'Burn the smoker at a Guhamāt Altar in the hollow. Kill the Kavak before they pile up.' },
    { key: 'voidkiln', title: 'Build a Guhamāt Furnace', hint: 'Guhamāt Remains ringed by hollow rock. It smelts Tala, the teal ore of the hollow.' },
    { key: 'noctrium', title: 'Forge Tala', hint: 'Mine Tala with an Antar Pick and smelt it in the Guhamāt Furnace.', need: 5 },
  ] },
  { title: 'Above the World', steps: [
    { key: 'kite', title: 'String a Jīmūt Kite', hint: '2 crystal fiber, 3 feathers, a Tala bar and moth dust, at the workbench.', need: 1 },
    { key: 'boss5', title: 'Bait Jīmūt', hint: 'Fly the kite from a Jīmūt Altar on the living ground. Bring a bow or a staff: it rarely lands.' },
    { key: 'gate2', title: 'Raise an Island Gate', hint: 'Six Tala bars around Jīmūt Remains, at the anvil.' },
    { key: 'dim2', title: 'Cross to the islands', hint: 'Step into the gate. Mind the edges: there is nothing under the islands.' },
    { key: 'aether', title: 'Forge Ākās', hint: 'Blue ore in island rock. Tala Pick, Guhamāt Furnace.', need: 5 },
    { key: 'lens', title: 'Grind a Ratan Lens', hint: '2 Ākās bars, 3 shards (from Sakal) and glass, at the anvil.', need: 1 },
    { key: 'boss6', title: 'Bait Ratan', hint: 'Set the lens on a Ratan Altar on the islands. Its beam turns slowly: run across it, not away.' },
  ] },
  { title: 'The Dark Night', steps: [
    { key: 'crucible', title: 'Build a Ratan Furnace', hint: 'Ratan Remains ringed by island rock. It smelts Patik.' },
    { key: 'prism', title: 'Forge Patik', hint: 'Pink ore on the islands. Ākās Pick, Ratan Furnace.', need: 5 },
    { key: 'slivers', title: 'Hunt on Amāvassa', hint: 'Every eighth night the moon turns. Chandasāvak and Ulūk drop Moon Slivers: you need 3.', need: 3 },
    { key: 'mask', title: 'Weave a Kuranga Mask', hint: '2 Patik bars, 3 moon slivers and 2 shade flesh, at the Line Frame.', need: 1 },
    { key: 'boss7', title: 'Bait Kuranga', hint: 'Use the mask at a Kuranga Altar, at night. It will not come by day.' },
    { key: 'eclforge', title: 'Build a Kuranga Furnace', hint: 'Kuranga Remains ringed by black glass. It smelts Gahan, deep in the living ground (y under 14).' },
    { key: 'eclipse', title: 'Forge Gahan', hint: 'Patik Pick. The ore glows violet near bedrock.', need: 3 },
    { key: 'key', title: 'Cut the Cairn Key', hint: '3 Gahan bars, a Hīrak Block, 2 moon slivers and 2 shards, at the anvil.', need: 1 },
    { key: 'boss8', title: 'Bait Nihān at the Cairn', hint: 'Everything you have. Everything you are.' },
  ] },
];

/** The crew's present step, and how many of what it counts they have. */
export const PRESENT = { chapter: 1, step: 0, have: 2 };

export interface Bounty {
  id: string;
  /** Who asks: a householder of names.json, or the sand country's people at a fire. */
  asker: string;
  /** What is asked, short, for the row. */
  task: string;
  icon: string;
  n: number;
  /** The task told in full on the right page. */
  telling: string;
  pay: number;
  /** Seats of the crew who took it. */
  took: number[];
  /** Too far, or the standing is too low: shown in blood. */
  barred?: string;
}

export const BOUNTIES: Bounty[] = [
  { id: 'b.ore', asker: 'Kammār', task: 'Twenty iron ore', icon: 'ore', n: 20, pay: 40, took: [1, 4],
    telling: 'The smith wants raw ore, not bars: he smelts it himself to his own weight. Bring it to the anvil in the village on the Yavas.' },
  { id: 'b.meat', asker: 'Vāhak', task: 'Eight raw meat', icon: 'haunch', n: 8, pay: 24, took: [],
    telling: 'The provisioner salts meat against the nights the village is shut in. Boar and Sheep both serve.' },
  { id: 'b.idol', asker: 'Rehakār', task: 'A Vanahar Likeness', icon: 'bait', n: 1, pay: 120, took: [2],
    telling: 'Carved at the workbench from a log, fiber, jelly and a red flower. Rehakār wants one to cut lines on; it is not to be taken to the altar.' },
  { id: 'b.fuel', asker: 'A Marujan fire', task: 'Fuel for a fire', icon: 'coal', n: 32, pay: 0, took: [8],
    telling: 'Thirty-two coal to the fire in the Kāsa. They pay nothing in lees; their standing with the crew rises by one step.' },
  { id: 'b.bars', asker: 'Kāru', task: 'Four iron bars', icon: 'ingot', n: 4, pay: 18, took: [3, 5, 6],
    telling: 'For hinges and the frame of a Joining Bench. Kāru moves in once Vanahar has fallen and asks again each dawn.' },
  { id: 'b.crystal', asker: 'Vejja', task: 'Six crystal', icon: 'crystal', n: 6, pay: 75, took: [], barred: 'Needs the second notch with the householders',
    telling: 'Crystal from geodes, to grind for salves. Vejja asks it only of a crew the householders stand by.' },
];

export interface People {
  name: string;
  /** What the people holds above itself. */
  holds: string;
  /** Notches of five. */
  notch: number;
  /** Toward the next notch, 0 to 1. */
  toward: number;
  rises: string;
  falls: string;
  opens: string;
}

export const PEOPLES: People[] = [
  { name: 'Householders', holds: 'They hold a stone up to first light.', notch: 2, toward: 0.6,
    rises: 'Lees weighed in, first kills, nights held', falls: 'A bed broken, a hearth overrun',
    opens: 'Tasks for the crew' },
  { name: 'Marujan', holds: 'They hold up ground no feeder would come for.', notch: 1, toward: 0.25,
    rises: 'Kills burned, nests broken, fuel carried', falls: 'Every bait at the Maruhar Altar',
    opens: 'Trade at a fire' },
];
