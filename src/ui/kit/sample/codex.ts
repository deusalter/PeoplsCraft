// Sample codex: what the crew on Spark has met, by the four steps of the world bible's 8.9 for creatures, and what it has
// found of matter, places, peoples and old things. The crew stands at "Smelt iron" in the Guide, so it has not been
// to the hollow or the islands, nor met any of the eight but the first.
import { type Colour, GRADES } from '../palette';
import { THINGS } from './play-items';

/** The four steps of what is known of a creature (8.9): first sight, first kill, many kills, one thing seen once. */
export type Steps = [sight?: string, kill?: string, many?: string, once?: string];

/** A fact of the codex: "Found: anywhere". */
export interface Fact { label: string; text: string; c?: Colour }

export interface Entry {
  key: string;
  /** Its name in names.json; unseen entries show no name. */
  name: string;
  icon: string;
  seen: boolean;
  /** Whose word its name is and what it means, said as a sentence; left out where the name is the plain word. */
  word?: string;
  /** Short facts, each a label said in grey and a value in ink, or in its own colour where it gives one. */
  facts?: Fact[];
  /** Matter: what it goes into and what it is made from, drawn as rows of slots in place of a word. */
  uses?: boolean;
  /** For a creature, the four steps; for anything else, the paragraphs known of it. */
  steps: Steps | string[];
  /** Not yet met, but seen by someone in the crew: one line of where, said on its page. */
  hint?: string;
}

/** A spread of the codex: its heading, two lines said under its grid, and its entries. */
export interface Spread { heading: string; blurb: string; entries: Entry[] }
export interface Section { key: string; name: string; spreads: Spread[] }

const hearth = (meaning: string) => `The Householders' word for ${meaning}`;
const plain = undefined;
/** Where, when and what it leaves, the three facts every creature has. */
const c = (key: string, name: string, word: string | undefined, facts: [string, string, string] | undefined, steps: Steps): Entry =>
  ({ key, name, icon: `codex:${key}`, seen: !!facts, word, steps,
    facts: facts && [{ label: 'Found', text: facts[0] }, { label: 'When', text: facts[1] }, { label: 'Drops', text: facts[2] }] });
const f = (label: string, text: string): Fact => ({ label, text });

const KINDS: Entry[] = [
  c('woolback', 'Sheep', plain, ['Yavas', 'by day', 'Raw Meat'], ['Horned, in a heavy coat; herds of two to four.', 'Meat and hide.', 'At last light the herd lies down in a lamp’s light.']),
  c('gobblet', 'Grouse', plain, ['Vana', 'by day', 'Feather'], ['A knee-high ground bird.', 'Meat and feathers.', 'It calls all day, and stops when a feeder is near.']),
  c('burrowhog', 'Boar', plain, ['Tusāravan', 'by day', 'Raw Meat'], ['A tusked rooter of cold woods.', 'The most meat of the five, and a hide.']),
  c('dune_skipper', 'Hare', plain, ['Marudesha', 'by day', 'Raw Meat'], ['A small long-eared runner of the sand.']),
  c('glimmerfin', 'Fish', plain, ['Samudda', 'any hour', 'Raw Fish'], ['A bright fish in any water.', 'Raw fish.', 'The shoal turns as one.']),
  c('gelcap', 'Kinva', hearth('ferment'), ['Yavas', 'any hour', 'Jelly'], ['A lump of jelly under a red skin.', 'Jelly, and nothing else.', 'It sits on one patch; the grass under it is gone.']),
  c('thornling', 'Kantak', hearth('a thorn'), ['Vana', 'at night', 'Thorn'], ['Bramble and sapling, a red bud for a crest.', 'Thorn and plant fiber.', 'By day it stands rooted and is taken for a bush.']),
  c('bog_lurker', 'Kaddam', hearth('mud, mire'), ['Panka', 'any hour', 'Lees Lump'], ['Reed and peat, sunk in the mud to the head.']),
  c('sproutling', 'Paroha', hearth('a sprout'), undefined, []),
  c('cinder_wisp', 'Angār', hearth('charcoal'), ['Marudesha', 'at night', 'Ember Dust'], ['A live coal in the air.', 'Ember dust, which burns twice as long as coal.']),
  c('dune_mite', 'Kīta', hearth('a worm'), undefined, []),
  c('gloomshade', 'Tama', hearth('darkness'), ['anywhere', 'at night', 'Shade Flesh'], ['Upright and dark.', 'Dark matter and bone.', 'It goes for whoever carries most lees.', 'One held a bone no grazer has. Yavas.']),
  c('sporeling', 'Kavak', hearth('a mushroom'), undefined, []),
  c('mycelid_knight', 'Asikavak', hearth('sword mushroom'), undefined, []),
  c('glowmaw', 'Sagāl', hearth('a jackal'), undefined, []),
  c('umbral_moth', 'Salaha', hearth('a moth'), undefined, []),
  { ...c('rift_ray', 'Vihanga', hearth('a bird; sky-going'), undefined, []), hint: 'Found: under island rims' },
  c('aether_wisp', 'Kajjot', hearth('a firefly'), undefined, []),
  c('crag_bat', 'Jatu', hearth('a bat'), ['Pabbat', 'at night', 'Feather'], ['It hangs under an overhang.', 'Feather and hide.', 'It drops when a body passes beneath.']),
  c('shardling', 'Sakal', hearth('a chip, splinter'), undefined, []),
  c('moonspawn', 'Chandasāvak', hearth('young of the moon'), undefined, []),
  c('lunar_howler', 'Ulūk', hearth('an owl'), undefined, []),
  c('stonegnawer', 'Silahādak', hearth('stone-eater'), ['under turf', 'any hour', 'Stone Scale'], ['A plated crawler that eats rock.', 'Its plates, and coal.', 'Its grinding carries through rock.', 'Head to a coal seam. Pabbat.']),
  c('frost_stalker', 'Vaka', hearth('a wolf'), ['Hima', 'at night', 'Vaka Tooth'], ['A pale four-legged runner.', 'Hide and a tooth.', 'One alone follows at the edge of sight.', 'Lay in full sun, unharmed. Hima.']),
  c('rustbound', 'Nihirakka', hearth('store-guarding'), ['Sealed Store', 'any hour', 'Rust Lump'], ['It stands as harness stood on its frame.', 'Rust, an iron bar, barbed arrows.', undefined, 'Opened over a pot: no bone in it at all.']),
  c('cave_skitter', 'Lūta', hearth('a spider'), ['caves', 'any hour', 'Plant Fiber'], ['Eight legs, bodied in old cord and sacking.', 'Plant fiber.', 'The pack scatters and comes back another way.']),
];

const EIGHT: Entry[] = [
  c('b_colossus', 'Vanahar', hearth('holding the wood'), ['its altar', 'when baited', 'Remains'], ['Roots come up through the paving.']),
  c('b_maw', 'Maruhar', 'The sand country says Marudara', undefined, []),
  c('b_warden', 'Kankāl', hearth('a skeleton'), undefined, []),
  c('b_sporemother', 'Guhamāt', hearth('mother of the caves'), undefined, []),
  c('b_regent', 'Jīmūt', hearth('a cloud'), undefined, []),
  c('b_luminarch', 'Ratan', hearth('a jewel'), undefined, []),
  c('b_hart', 'Kuranga', hearth('an antelope'), undefined, []),
  c('b_sovereign', 'Nihān', 'The sand country says Dūmara', undefined, []),
];

/** Matter: the materials of the play screens' sample things; the crew has handled the first fourteen. */
const MATTER: Entry[] = [...THINGS.values()].filter((t) => t.kind === 'material').slice(0, 30).map((t, i) => ({
  key: t.key, name: t.name, icon: t.icon, seen: i < 14,
  uses: true,
  facts: i < 14 ? [{ label: 'Grade', text: GRADES[t.grade].name, c: GRADES[t.grade].light }, f('Burns', t.fuel ? `${t.fuel} s` : 'no')] : undefined,
  steps: i < 14 && t.tell ? [t.tell] : [],
}));

const site = (key: string, name: string, seen: boolean, facts: Fact[], steps: string[]): Entry =>
  ({ key, name, icon: `codex:${key}`, seen, facts: seen ? facts : undefined, steps: seen ? steps : [] });

const PLACES: Entry[] = [
  site('place_village', 'Village', true, [f('Found', 'Yavas, Vana')], ['Houses, and householders in them while the beds stand.']),
  site('place_ruin', 'Broken Store', true, [f('Found', 'Vana')], ['A store whose salt failed. Tama breed under its floor.']),
  site('place_dungeon', 'Sealed Store', true, [f('Found', 'Pabbat')], ['Rooms of dressed stone. Nihirakka stand in them.']),
  site('place_altar', 'Altar', true, [f('Found', 'Vanahar Altar'), f('Way', '212 east')], ['Where a strongest comes up to bait.']),
  site('place_vault', 'Vault', false, [], []),
  site('place_island', 'Island Store', false, [], []),
  site('place_gate', 'Hollow Gate', false, [], []),
];

const PEOPLES: Entry[] = [
  { key: 'people_house', name: 'Householders', icon: 'codex:people_house', seen: true, facts: [f('Lives', 'in villages'), f('Found', 'Yavas, Vana')],
    steps: ['They hold a stone up to first light.', 'They stay in a village while its beds stand.'] },
  { key: 'people_sand', name: 'Marujan', icon: 'codex:people_sand', seen: true, word: hearth('people of the waste'), facts: [f('Lives', 'at fires'), f('Found', 'Marudesha')],
    steps: ['They hold up ground no feeder would come for.'] },
  { key: 'people_arrival', name: 'Arrivals', icon: 'codex:people_arrival', seen: true, facts: [f('Found', 'at the mouth')],
    steps: ['Those who come up at the mouth: the crew.'] },
];

const OLD: Entry[] = [
  { key: 'old_core', name: 'Ward Core', icon: 'codex:old_core', seen: true, word: 'A core under a hearth', facts: [f('Found', 'an old house'), f('Where', 'Vana')],
    steps: ['Found under the hearthstone of an old house.', 'The builders came from elsewhere.'] },
  ...['old_saw', 'old_harness', 'old_jar', 'old_pot', 'old_staff', 'old_net', 'old_bench'].map((key): Entry => ({ key, name: '', icon: `codex:${key}`, seen: false, steps: [] })),
];

export const CODEX: Section[] = [
  { key: 'creatures', name: 'Creatures', spreads: [{ heading: 'Of the ground', blurb: 'What lives up here, filled in as met.', entries: KINDS }, { heading: 'The eight', blurb: 'The strongest, each at its own altar.', entries: EIGHT }] },
  { key: 'matter', name: 'Matter', spreads: [{ heading: 'Matter', blurb: 'What the crew has had in hand.', entries: MATTER }] },
  { key: 'places', name: 'Places', spreads: [{ heading: 'Places', blurb: 'Where the crew has stood.', entries: PLACES }] },
  { key: 'peoples', name: 'Peoples', spreads: [{ heading: 'Peoples', blurb: 'Who holds ground here besides feeders.', entries: PEOPLES }] },
  { key: 'old', name: 'Old things', spreads: [{ heading: 'Old things', blurb: 'What the builders left under their hearths.', entries: OLD }] },
];
