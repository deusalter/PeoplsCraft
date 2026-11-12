# Putting the names into the game

This is for the person who changes the game's source. It says which strings change in each file, which sentences outside the data tables carry an old name, and what stays as it is. `names.json` is the source of every name here, and `glossary.md` gives the meaning and the reason for each.

File and line numbers are those of the source at commit `9e03564`. If the source has moved since, find the string by its old text.

## Before starting

1. **Change display names only.** Every internal key stays: block ids, item ids, creature ids, tier keys, biome keys, quest keys. A key is a save-file identifier, and changing one breaks existing saves.
2. **Three old values stay as they are.** The save database is still named `cairnlight` (src/systems/save.ts:6). The settings key is still `cairnlight.settings` (src/ui/menus.ts:11). The default seed of the quick test world is still `cairn` (src/main.ts:27). None of them is shown to a player, and changing the first two would lose every player's saves and settings.
3. **The title stays.** `GAME_TITLE` (src/core/constants.ts:24), the page title (index.html:6) and the two upper-case copies on the loading screen (src/game.ts:116 and 669) all read Peopls Craft already.
4. **Letters.** The names shown in play use Ā ā ī ū outside plain English. The bitmap font needs those four, and it needs no other marked letter. No shown name starts with Ī or Ū, and nothing with a marked letter is upper-cased today. If a banner is ever upper-cased, Ā is already covered.
5. **Lengths.** No name is longer than 18 characters, and no boss name longer than 24. A modifier in front of a gear name can reach 22 ("Brittle Hīrak Leggings"), so a tooltip that shows the modifier and the name on one line has to allow 22, or show the modifier on a line of its own.
6. **Check.** After any change to `names.json`, run `node docs/world/lang/derive.mjs --check docs/world/names.json` and `node docs/world/lang/glossary.mjs`.

## 1. The data tables

### src/core/constants.ts and src/data/dims.ts: the three places

The realm names are stored twice, and the two lists are read in different sentences. Give each list the form its sentence needs.

| Realm | Old name | `DIMS[n].name` (dims.ts:17-19): banners, loading, debug | `DIM_NAMES[n]` (constants.ts:22): the compass line "In <name>" |
| --- | --- | --- | --- |
| 0 | Overworld | The Living Ground | the living ground |
| 1 | Gloomroot Hollows | The Hollow | the hollow |
| 2 | The Skyrift | The Islands | the islands |

With the second list in lower case the compass reads "In the hollow". The loading line "Crossing into <Realm>" (src/game.ts:677) reads the first list and should become "Crossing to the hollow" and "Crossing to the islands", from the second list.

### src/data/biomes.ts: the countries

18 names change and 0 stay. They are shown only in the debug overlay today.

| Key | Line | Old name | New name |
| --- | --- | --- | --- |
| `ocean` | biomes.ts:12 | Open Sea | Samudda |
| `beach` | biomes.ts:13 | Shore | Vela |
| `plains` | biomes.ts:14 | Verdant Plains | Yavas |
| `forest` | biomes.ts:15 | Greenwood | Vana |
| `palewood` | biomes.ts:16 | Palebark Wood | Davalavan |
| `bloomvale` | biomes.ts:17 | Bloomvale | Kusum |
| `taiga` | biomes.ts:18 | Frostpine Reach | Tusāravan |
| `tundra` | biomes.ts:19 | Whitefell | Hima |
| `desert` | biomes.ts:20 | Amber Dunes | Marudesha |
| `savanna` | biomes.ts:21 | Amber Steppe | Kāsa |
| `jungle` | biomes.ts:22 | Verdance | Aranna |
| `swamp` | biomes.ts:23 | Mirefen | Panka |
| `crags` | biomes.ts:24 | Highcrags | Pabbat |
| `peaks` | biomes.ts:25 | Snowcrown Peaks | Sānu |
| `hollows` | biomes.ts:26 | Gloomroot Hollows | Fungus Caverns |
| `hollows_crystal` | biomes.ts:27 | Glimmer Vaults | Crystal Caverns |
| `rift` | biomes.ts:28 | Skyrift Meadow | Island Meadow |
| `rift_shards` | biomes.ts:29 | Prism Shoals | Crystal Islands |

### src/data/blocks.ts: blocks

65 names change and 68 stay. A block that is also an item shows the same string in the inventory, in pickup toasts and in "Mine X" lines, so one change covers all of them.

| Key | Line | Old name | New name |
| --- | --- | --- | --- |
| `cobble` | blocks.ts:60 | Cobblestone | Rubble |
| `deepstone` | blocks.ts:61 | Deepstone | Deep Rock |
| `grass` | blocks.ts:63 | Grass Block | Turf |
| `snowy_grass` | blocks.ts:71 | Snowy Grass | Snowy Turf |
| `nightglass` | blocks.ts:73 | Nightglass | Black Glass |
| `pale_log` | blocks.ts:84 | Palebark Log | Birch Log |
| `pale_leaves` | blocks.ts:85 | Palebark Leaves | Birch Leaves |
| `pale_planks` | blocks.ts:86 | Palebark Planks | Birch Planks |
| `rose_log` | blocks.ts:90 | Rosewood Log | Kusum Log |
| `rose_leaves` | blocks.ts:91 | Rosewood Blossom | Kusum Leaves |
| `rose_planks` | blocks.ts:92 | Rosewood Planks | Kusum Planks |
| `flower_red` | blocks.ts:96 | Emberpetal | Red Flower |
| `flower_yellow` | blocks.ts:97 | Sunpip | Yellow Flower |
| `flower_blue` | blocks.ts:98 | Skybell | Blue Flower |
| `flower_white` | blocks.ts:99 | Moonlily | White Flower |
| `mushroom_brown` | blocks.ts:102 | Duskcap | Brown Mushroom |
| `mushroom_red` | blocks.ts:103 | Dapplecap | Red Mushroom |
| `cactus` | blocks.ts:104 | Needlepod | Cactus |
| `glowshroom` | blocks.ts:107 | Glowshroom | Glowing Mushroom |
| `mana_ore` | blocks.ts:112 | Mana Geode | Geode |
| `lumenite_ore` | blocks.ts:113 | Lumenite Ore | Hīrak Ore |
| `cindrite_ore` | blocks.ts:114 | Cindrite Ore | Jalit Ore |
| `eclipsium_ore` | blocks.ts:115 | Eclipsium Ore | Gahan Ore |
| `wardstone` | blocks.ts:122 | Wardstone | Dressed Stone |
| `emberforge` | blocks.ts:131 | Emberforge | Maruhar Furnace |
| `voidkiln` | blocks.ts:132 | Voidkiln | Guhamāt Furnace |
| `prism_crucible` | blocks.ts:133 | Prism Crucible | Ratan Furnace |
| `eclipse_forge` | blocks.ts:134 | Eclipse Forge | Kuranga Furnace |
| `tinker_bench` | blocks.ts:135 | Tinker's Bench | Joining Bench |
| `runeloom` | blocks.ts:136 | Runeloom | Line Frame |
| `guest_bed` | blocks.ts:138 | Guest Bed | Holder's Bed |
| `lumenite_block` | blocks.ts:149 | Lumenite Block | Hīrak Block |
| `gloomstone` | blocks.ts:152 | Gloomstone | Hollow Rock |
| `mycel` | blocks.ts:153 | Mycel Turf | Fungal Turf |
| `gloom_stem` | blocks.ts:154 | Gloomcap Stem | Fungus Stem |
| `gloomcap_teal` | blocks.ts:155 | Teal Gloomcap | Teal Fungus Cap |
| `gloomcap_violet` | blocks.ts:156 | Violet Gloomcap | Violet Fungus Cap |
| `gloom_planks` | blocks.ts:157 | Gloomcap Planks | Fungus Planks |
| `umbrite_ore` | blocks.ts:158 | Umbrite Ore | Antar Ore |
| `noctrium_ore` | blocks.ts:159 | Noctrium Ore | Tala Ore |
| `lumen_frond` | blocks.ts:160 | Lumen Frond | Glowing Frond |
| `sporelamp` | blocks.ts:161 | Sporelamp | Lamp Fungus |
| `riftstone` | blocks.ts:164 | Riftstone | Island Rock |
| `skyturf` | blocks.ts:165 | Skyturf | Island Turf |
| `skysoil` | blocks.ts:166 | Skysoil | Island Soil |
| `star_log` | blocks.ts:167 | Starwood Log | Island Log |
| `star_leaves` | blocks.ts:168 | Starwood Leaves | Island Leaves |
| `star_planks` | blocks.ts:169 | Starwood Planks | Island Planks |
| `aetherium_ore` | blocks.ts:170 | Aetherium Ore | Ākās Ore |
| `prismite_ore` | blocks.ts:171 | Prismite Ore | Patik Ore |
| `cloud` | blocks.ts:172 | Cloudstuff | Cloud |
| `prism_crystal` | blocks.ts:173 | Prism Crystal | Pale Crystal |
| `rift_frame` | blocks.ts:178 | Rift Gate Frame | Island Gate Frame |
| `rift_portal` | blocks.ts:179 | Rift Gate | Island Gate |
| `altar1` | blocks.ts:182 | Rootbound Altar | Vanahar Altar |
| `altar2` | blocks.ts:183 | Sunken Altar | Maruhar Altar |
| `altar3` | blocks.ts:184 | Warden Altar | Kankāl Altar |
| `altar4` | blocks.ts:185 | Mycelial Altar | Guhamāt Altar |
| `altar5` | blocks.ts:186 | Tempest Altar | Jīmūt Altar |
| `altar6` | blocks.ts:187 | Prism Altar | Ratan Altar |
| `altar7` | blocks.ts:188 | Eclipse Altar | Kuranga Altar |
| `altar8` | blocks.ts:189 | First Cairn | Cairn |
| `moss_stone` | blocks.ts:192 | Mossy Cobble | Mossy Stone |
| `bone_block` | blocks.ts:193 | Palebone | Bone Block |
| `storm_block` | blocks.ts:199 | Stormglass | Glassed Stone |

Two block descriptions carry an old name: see section 2.

### src/data/items.ts: tiers, pieces, rarities, modifiers

**Tier words** (the `name` of each `TIERS` line). These go in front of every tool and every piece of armour.

| Key | Line | Old | New |
| --- | --- | --- | --- |
| `wood` | items.ts:29 | Wooden | Wooden |
| `stone` | items.ts:30 | Stone | Stone |
| `iron` | items.ts:31 | Iron | Iron |
| `lumenite` | items.ts:32 | Lumenite | Hīrak |
| `cinder` | items.ts:33 | Cindersteel | Jalit |
| `umbrite` | items.ts:34 | Umbrite | Antar |
| `noctrium` | items.ts:35 | Noctrium | Tala |
| `aether` | items.ts:36 | Aetherium | Ākās |
| `prism` | items.ts:37 | Prismite | Patik |
| `eclipse` | items.ts:38 | Eclipsium | Gahan |

**Swords, bows, staves and totems** are whole strings in the `names` array of each `TIERS` line. They now follow one rule, the tier word and Sword, Bow, Staff or Totem. Either write the strings below into the arrays, or replace the arrays with the rule.

| Key | Old name | New name |
| --- | --- | --- |
| `wood_sword` | Wooden Sword | Wooden Sword |
| `wood_bow` | Shortbow | Wooden Bow |
| `stone_sword` | Stone Sword | Stone Sword |
| `stone_bow` | Flintstring Bow | Stone Bow |
| `iron_sword` | Iron Sword | Iron Sword |
| `iron_bow` | Iron Recurve | Iron Bow |
| `iron_staff` | Spark Wand | Iron Staff |
| `iron_totem` | Thornling Totem | Iron Totem |
| `lumenite_sword` | Lumenite Saber | Hīrak Sword |
| `lumenite_bow` | Glimmerbow | Hīrak Bow |
| `lumenite_staff` | Lumen Staff | Hīrak Staff |
| `lumenite_totem` | Wisp Lantern | Hīrak Totem |
| `cinder_sword` | Cindersteel Cleaver | Jalit Sword |
| `cinder_bow` | Emberstring | Jalit Bow |
| `cinder_staff` | Cinder Rod | Jalit Staff |
| `cinder_totem` | Brazier Totem | Jalit Totem |
| `umbrite_sword` | Umbrite Glaive | Antar Sword |
| `umbrite_bow` | Duskbow | Antar Bow |
| `umbrite_staff` | Umbral Scepter | Antar Staff |
| `umbrite_totem` | Shade Effigy | Antar Totem |
| `noctrium_sword` | Noctrium Edge | Tala Sword |
| `noctrium_bow` | Nightreach | Tala Bow |
| `noctrium_staff` | Spore Staff | Tala Staff |
| `noctrium_totem` | Mycelid Idol | Tala Totem |
| `aether_sword` | Aether Blade | Ākās Sword |
| `aether_bow` | Galebow | Ākās Bow |
| `aether_staff` | Stormcaller | Ākās Staff |
| `aether_totem` | Zephyr Chime | Ākās Totem |
| `prism_sword` | Prismite Brand | Patik Sword |
| `prism_bow` | Spectrum Bow | Patik Bow |
| `prism_staff` | Prism Wand | Patik Staff |
| `prism_totem` | Shardling Core | Patik Totem |
| `eclipse_sword` | Eclipse Reaver | Gahan Sword |
| `eclipse_bow` | Umbra Longbow | Gahan Bow |
| `eclipse_staff` | Eclipse Staff | Gahan Staff |
| `eclipse_totem` | Moonbound Icon | Gahan Totem |

**Tool and armour words** (items.ts:178 for tools, items.ts:43-46 for armour and the set words).

| Key | Old | New |
| --- | --- | --- |
| `axe` | Axe | Axe |
| `magic_0` | Circlet | Circlet |
| `magic_1` | Robe | Robe |
| `magic_2` | Skirt | Skirt |
| `melee_0` | Helm | Helm |
| `melee_1` | Cuirass | Cuirass |
| `melee_2` | Greaves | Greaves |
| `pickaxe` | Pickaxe | Pick |
| `ranged_0` | Hood | Hood |
| `ranged_1` | Jerkin | Jerkin |
| `ranged_2` | Leggings | Leggings |
| `set:magic` | Mage | Cloth (never shown) |
| `set:melee` | Plate | Plate (never shown) |
| `set:ranged` | Scout | Leather (never shown) |
| `set:summon` | Binder | Harness (never shown) |
| `shovel` | Shovel | Shovel |
| `summon_0` | Mask | Mask |
| `summon_1` | Mantle | Mantle |
| `summon_2` | Wraps | Wraps |

**The four labels for a way of fighting** (`label` in items.ts:43-46): Melee, Ranged, Crystal-work, Totem. They were Melee, Ranged, Magic and Summoner.

**Rarities** (items.ts:49-50).

| Grade | Old | New |
| --- | --- | --- |
| 0 | Common | Surface |
| 1 | Uncommon | Upper |
| 2 | Rare | Deep |
| 3 | Epic | Hollow |
| 4 | Legendary | Island |
| 5 | Mythic | Floor |
| 6 | Relic | Old |

**Modifiers** (items.ts:255-269).

| Key | Old | New |
| --- | --- | --- |
| `arcane` | Arcane | True |
| `blessed` | Blessed | Favoured |
| `brittle` | Brittle | Brittle |
| `dull` | Dull | Dull |
| `fleet` | Fleet | Fleet |
| `heavy` | Heavy | Heavy |
| `keen` | Keen | Keen |
| `lucky` | Lucky | Lucky |
| `menacing` | Menacing | Flecked |
| `radiant` | Radiant | Glowing |
| `savage` | Savage | Quenched |
| `stalwart` | Stalwart | Dense |
| `swift` | Swift | Lean |
| `vital` | Vital | Vital |
| `warding` | Warding | Thick |

### src/data/items.ts: the hand-written items

81 names change and 30 stay. The three hide pieces are composed as "Hide " and a word, and stay.

| Key | Line | Old name | New name |
| --- | --- | --- | --- |
| `lumenite` | items.ts:32 | Lumenite | Hīrak |
| `mana_crystal` | items.ts:69 | Mana Crystal | Crystal |
| `cinder_bar` | items.ts:70 | Cindersteel Bar | Jalit Bar |
| `umbrite_bar` | items.ts:71 | Umbrite Bar | Antar Bar |
| `noctrium_bar` | items.ts:72 | Noctrium Bar | Tala Bar |
| `aether_bar` | items.ts:73 | Aetherium Bar | Ākās Bar |
| `prism_bar` | items.ts:74 | Prismite Bar | Patik Bar |
| `eclipse_bar` | items.ts:75 | Eclipsium Bar | Gahan Bar |
| `weave` | items.ts:76 | Spellweave | Crystal Fiber |
| `effigy` | items.ts:77 | Bone Effigy | Carved Bone |
| `gel` | items.ts:79 | Capgel | Jelly |
| `thorn` | items.ts:80 | Bramble Thorn | Thorn |
| `shade_essence` | items.ts:81 | Shade Essence | Shade Flesh |
| `chitin` | items.ts:83 | Chitin Plate | Stone Scale |
| `frost_fang` | items.ts:84 | Frost Fang | Vaka Tooth |
| `bog_pearl` | items.ts:85 | Bog Pearl | Lees Lump |
| `rust_core` | items.ts:86 | Rusted Core | Rust Lump |
| `rift_scale` | items.ts:89 | Rift Scale | Vihanga Scale |
| `shard` | items.ts:90 | Living Shard | Shard |
| `ash_token` | items.ts:91 | Ashen Token | Mūda |
| `heartroot` | items.ts:94 | Heartroot | Vanahar Remains |
| `scorched_core` | items.ts:95 | Scorched Core | Maruhar Remains |
| `warden_sigil` | items.ts:96 | Warden Sigil | Kankāl Remains |
| `queen_spore` | items.ts:97 | Queen Spore | Guhamāt Remains |
| `storm_plume` | items.ts:98 | Storm Plume | Jīmūt Remains |
| `prism_heart` | items.ts:99 | Prism Heart | Ratan Remains |
| `eclipse_ember` | items.ts:100 | Eclipse Ember | Kuranga Remains |
| `cairn_heart` | items.ts:101 | Cairnheart | Nihān Remains |
| `raw_fish` | items.ts:108 | Glimmerfin | Raw Fish |
| `cooked_fish` | items.ts:109 | Seared Glimmerfin | Roast Fish |
| `stew` | items.ts:110 | Duskcap Stew | Mushroom Stew |
| `glow_broth` | items.ts:111 | Glowcap Broth | Fungus Broth |
| `skyfruit` | items.ts:112 | Skyfruit | Island Fruit |
| `tonic` | items.ts:115 | Mana Tonic | Tonic |
| `ironbark` | items.ts:117 | Ironbark Draught | Bark Draught |
| `swiftroot` | items.ts:118 | Swiftroot Tea | Flower Tea |
| `ember_arrow` | items.ts:123 | Ember Arrow | Jalit Arrow |
| `void_arrow` | items.ts:124 | Umbral Arrow | Antar Arrow |
| `prism_arrow` | items.ts:125 | Prism Arrow | Patik Arrow |
| `rift_gate_kit` | items.ts:129 | Rift Gate | Island Gate |
| `verdant_idol` | items.ts:132 | Verdant Idol | Vanahar Likeness |
| `sunken_lure` | items.ts:133 | Sunken Lure | Maruhar Lure |
| `warden_bell` | items.ts:134 | Warden Bell | Kankāl Bell |
| `spore_censer` | items.ts:135 | Spore Censer | Guhamāt Smoker |
| `storm_kite` | items.ts:136 | Storm Kite | Jīmūt Kite |
| `prism_lens` | items.ts:137 | Prism Lens | Ratan Lens |
| `eclipse_mask` | items.ts:138 | Eclipse Mask | Kuranga Mask |
| `strider_boots` | items.ts:144 | Strider Boots | Walking Boots |
| `spring_anklet` | items.ts:145 | Spring Anklet | Anklet |
| `cloud_bottle` | items.ts:146 | Bottled Gust | Cloud Bottle |
| `bounding_boots` | items.ts:148 | Bounding Boots | Spring Boots |
| `gale_emblem` | items.ts:149 | Gale Emblem | Cloud Emblem |
| `skyrunner_treads` | items.ts:150 | Skyrunner Treads | Cloud Treads |
| `iron_bracer` | items.ts:151 | Iron Bracer | Arm Guard |
| `briar_bracer` | items.ts:152 | Briar Bracer | Thorned Guard |
| `warriors_band` | items.ts:153 | Warrior's Band | Arm Ring |
| `marksman_lens` | items.ts:154 | Marksman's Lens | Eyeglass |
| `sages_ring` | items.ts:155 | Sage's Ring | Crystal Ring |
| `binders_whistle` | items.ts:156 | Binder's Whistle | Whistle |
| `duelists_sigil` | items.ts:157 | Duelist's Sigil | Knuckle Band |
| `heart_locket` | items.ts:158 | Heart Locket | Locket |
| `mana_charm` | items.ts:159 | Mana Charm | Crystal Charm |
| `soul_reliquary` | items.ts:160 | Soul Reliquary | Crystal Pendant |
| `delvers_charm` | items.ts:161 | Delver's Charm | Wrist Scale |
| `magnet_shell` | items.ts:162 | Lodeshell | Shell |
| `tide_fins` | items.ts:163 | Tide Fins | Fins |
| `lucky_coin` | items.ts:164 | Lucky Coin | Worn Coin |
| `shadow_cloak` | items.ts:165 | Gloam Cloak | Dark Cloak |
| `reach_gauntlet` | items.ts:166 | Longarm Gauntlet | Long Glove |
| `mossheart_sprig` | items.ts:168 | Mossheart Sprig | Vanahar Sprig |
| `maw_fang` | items.ts:169 | Maw Fang | Maruhar Tooth |
| `wardens_aegis` | items.ts:170 | Warden's Aegis | Kankāl Plate |
| `mycelial_crown` | items.ts:171 | Mycelial Crown | Guhamāt Cap |
| `tempest_feather` | items.ts:172 | Tempest Feather | Jīmūt Feather |
| `prism_core` | items.ts:173 | Prism Core | Ratan Crystal |
| `eclipse_shard` | items.ts:174 | Eclipse Shard | Kuranga Tine |
| `sovereign_light` | items.ts:175 | Sovereign's Light | Cairn Gem |
| `cairn_edge` | items.ts:204 | Dawnbreaker | Cairn Sword |
| `cairn_bow` | items.ts:205 | Firstlight Bow | Cairn Bow |
| `cairn_staff` | items.ts:206 | Sovereign Rod | Cairn Staff |
| `cairn_totem` | items.ts:207 | Cairn Lantern | Cairn Lamp |

### src/data/mobs.ts: creatures, minions, townsfolk bodies and the eight

54 names change and 0 stay.

| Key | Line | Old name | New name |
| --- | --- | --- | --- |
| `woolback` | mobs.ts:184 | Woolback | Sheep |
| `gobblet` | mobs.ts:187 | Gobblet | Grouse |
| `burrowhog` | mobs.ts:192 | Burrowhog | Boar |
| `dune_skipper` | mobs.ts:195 | Dune Skipper | Hare |
| `glimmerfin` | mobs.ts:198 | Glimmerfin | Fish |
| `gloomshade` | mobs.ts:202 | Gloomshade | Tama |
| `thornling` | mobs.ts:205 | Thornling | Kantak |
| `gelcap` | mobs.ts:208 | Gelcap | Kinva |
| `bog_lurker` | mobs.ts:211 | Bog Lurker | Kaddam |
| `frost_stalker` | mobs.ts:214 | Frost Stalker | Vaka |
| `cinder_wisp` | mobs.ts:217 | Cinder Wisp | Angār |
| `stonegnawer` | mobs.ts:220 | Stonegnawer | Silahādak |
| `cave_skitter` | mobs.ts:223 | Cave Skitter | Lūta |
| `crag_bat` | mobs.ts:226 | Crag Bat | Jatu |
| `rustbound` | mobs.ts:229 | Rustbound Sentinel | Nihirakka |
| `sporeling` | mobs.ts:234 | Sporeling | Kavak |
| `mycelid_knight` | mobs.ts:237 | Mycelid Knight | Asikavak |
| `umbral_moth` | mobs.ts:240 | Umbral Moth | Salaha |
| `glowmaw` | mobs.ts:242 | Glowmaw | Sagāl |
| `rift_ray` | mobs.ts:247 | Rift Ray | Vihanga |
| `shardling` | mobs.ts:250 | Shardling | Sakal |
| `aether_wisp` | mobs.ts:253 | Aether Wisp | Kajjot |
| `ashen_raider` | mobs.ts:257 | Ashen Raider | Shūra |
| `ashen_hexer` | mobs.ts:259 | Ashen Hexer | Dāhaga |
| `siege_brute` | mobs.ts:261 | Siege Brute | Bedaga |
| `moonspawn` | mobs.ts:263 | Moonspawn | Chandasāvak |
| `lunar_howler` | mobs.ts:266 | Lunar Howler | Ulūk |
| `sproutling` | mobs.ts:270 | Sproutling | Paroha |
| `dune_mite` | mobs.ts:272 | Dune Mite | Kīta |
| `m_thornling` | mobs.ts:280 | Thornling | Sūlak |
| `m_wisp` | mobs.ts:281 | Lumen Wisp | Kanik |
| `m_brazier` | mobs.ts:282 | Brazier Spirit | Jālak |
| `m_shade` | mobs.ts:283 | Bound Shade | Jatuk |
| `m_mycelid` | mobs.ts:284 | Mycelid Sprite | Chattak |
| `m_zephyr` | mobs.ts:285 | Zephyr | Setasalaha |
| `m_shardling` | mobs.ts:286 | Shard Mote | Sakalak |
| `m_moon` | mobs.ts:287 | Moonbound Fawn | Harinak |
| `m_cairn` | mobs.ts:288 | Cairnlight | Dīpik |
| `n_wayfinder` | mobs.ts:295 | Wayfinder | Desik |
| `n_provisioner` | mobs.ts:295 | Provisioner | Vāhak |
| `n_smith` | mobs.ts:295 | Smith | Kammār |
| `n_apothecary` | mobs.ts:296 | Apothecary | Vejja |
| `n_tinker` | mobs.ts:296 | Tinker | Kāru |
| `n_runescribe` | mobs.ts:296 | Runescribe | Rehakār |
| `n_beastcaller` | mobs.ts:297 | Beastcaller | Posak |
| `n_deserter` | mobs.ts:297 | Ashen Deserter | Deserter |
| `b_colossus` | mobs.ts:636 | Mossback Colossus | Vanahar |
| `b_maw` | mobs.ts:642 | Dune Maw | Maruhar |
| `b_warden` | mobs.ts:648 | The Pale Warden | Kankāl |
| `b_sporemother` | mobs.ts:655 | Sporemother | Guhamāt |
| `b_regent` | mobs.ts:661 | Tempest Regent | Jīmūt |
| `b_luminarch` | mobs.ts:667 | The Luminarch | Ratan |
| `b_hart` | mobs.ts:674 | Moonbound Hart | Kuranga |
| `b_sovereign` | mobs.ts:681 | Cairn Sovereign | Nihān |

### src/data/mobs.ts:636-685: the eight, their titles and their lines

The title under each boss bar is dropped. Set each `title` to an empty string, and make the HUD (src/ui/hud.ts:110 and 291-300) draw no title row when the title is empty, so that the bar does not show a blank line. Each intro and phase line is replaced whole.

| # | Key | Old name | New name | Title | Intro | Phase lines |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `b_colossus` | Mossback Colossus | **Vanahar** | (none; was "Warden of the Greenwood") | "Roots come up through the paving." | "Its roots tear up out of the paving." |
| 2 | `b_maw` | Dune Maw | **Maruhar** | (none; was "Hunger Beneath the Sand") | "The sand in the bowl begins to move." | "It stays up and thrashes, shedding grit." |
| 3 | `b_warden` | The Pale Warden | **Kankāl** | (none; was "Keeper of the Sealed Way") | "The bell is rung, and something pale comes up." | "It turns, throwing pale matter in spirals." / "It is coming apart, and the smaller ones come for it." |
| 4 | `b_sporemother` | Sporemother | **Guhamāt** | (none; was "Mother of the Under-Bloom") | "The smoke reaches the roof, and the roof moves." | "Its cap splits, and the inside glows." / "Its growth tears from the roof, and it swings." |
| 5 | `b_regent` | Tempest Regent | **Jīmūt** | (none; was "Sovereign of the High Wind") | "Something large circles over the kite." | "Pieces of it begin to fall on the floor." / "It screams and stoops lower." |
| 6 | `b_luminarch` | The Luminarch | **Ratan** | (none; was "First Light, Refracted") | "Crystal gathers over the stone and turns." | "The crystals round it begin to turn." / "It stops holding its shape, and pieces come away." |
| 7 | `b_hart` | Moonbound Hart | **Kuranga** | (none; was "Herald of the Long Night") | "Hoofbeats come up out of the dark." | "Its tines light up violet." / "It charges, and is somewhere else." |
| 8 | `b_sovereign` | Cairn Sovereign | **Nihān** | (none; was "The First Stone Laid") | "Stone moves inside the cairn." | "Stone grinds on stone. The stack parts, and its lit middle shows." / "It is coming apart, and everything in it shows." |

### src/data/npcs.ts and src/data/mobs.ts:295-297: the townsfolk

Each townsperson's name is stored twice: in the townsperson's record (npcs.ts:9, 12, 15, 18, 21, 24, 27, 30) and as the name of the body (mobs.ts:295-297). The name tag over the head, the "trade with" prompt and "Slain by" read the body. Banners, toasts and the shop title read the record. Change both copies together.

| Keys (record / body) | Old name | New name | A personal name, not shown |
| --- | --- | --- | --- |
| `wayfinder` / `n_wayfinder` | Wayfinder | **Desik** | Kumud |
| `provisioner` / `n_provisioner` | Provisioner | **Vāhak** | Uppal |
| `smith` / `n_smith` | Smith | **Kammār** | Lata |
| `apothecary` / `n_apothecary` | Apothecary | **Vejja** | Manjar |
| `tinker` / `n_tinker` | Tinker | **Kāru** | Kesar |
| `runescribe` / `n_runescribe` | Runescribe | **Rehakār** | Saral |
| `beastcaller` / `n_beastcaller` | Beastcaller | **Posak** | Harit |
| `deserter` / `n_deserter` | Ashen Deserter | **Deserter** | Kāzūra |

The personal names are for sentences that need to call a townsperson by a name. They go on no name tag.

### src/data/recipes.ts:138: station labels

Runeloom becomes Line Frame. Tinker's Bench becomes Joining Bench. Hand, Workbench and Anvil stay. The forge window takes its title from the block name, so the four forges of remains follow blocks.ts: Maruhar Furnace, Guhamāt Furnace, Ratan Furnace, Kuranga Furnace.

### src/systems/events.ts:14-16: the three attacks

| Key | Old label | New label |
| --- | --- | --- |
| `raid` | Night raid | Night raid |
| `ashen` | The Ashen Host | Sand March |
| `moon` | The Hollow Moon | Amāvassa |

The HUD line for `moon` reads "The Hollow Moon is risen" (events.ts:16). It becomes "Amāvassa".

### src/systems/stats.ts: attributes and states

Arcana (stats.ts:5) becomes Arm. Strength, Agility and Vitality stay. The state Ironbark (stats.ts:14) becomes Toughened, Swiftroot (stats.ts:15) becomes Quickened, and Well Fed and Rested stay.

### src/data/quests.ts:4 and :50: the chapters of the Guide

The numerals and the dot in front of each chapter stay. First Light becomes Empty Hands. The Long Night becomes The Dark Night. Epilogue becomes After the Last. Iron and Root, The Deep Stone, Under the World and Above the World stay.

## 2. Sentences outside the tables that carry an old name

Each of these is a literal in the source that names a thing by its old name. The right-hand column is the same sentence with the new names in it, and with the claims the chapters ask to be removed taken out (4.13 and 8.11). The text pass may reword any of them further. What matters here is that no old name is left.

### Tooltips (src/data/blocks.ts and src/data/items.ts)

| Line | Now | With the new names |
| --- | --- | --- |
| blocks.ts:73 | Nightglass: "Volcanic glass. Only a Lumenite pick bites into it." | "Glass from the deepest rock. Only a Hīrak pick bites into it." |
| blocks.ts:138 | Guest Bed: "Place inside a closed, lit room with a door and someone may move in." | Keep the sentence. The block is now Holder's Bed. |
| items.ts:68 | Lumenite: "A cold-burning gem from the deep stone." | "A clear gem from the deep rock. It gives a cold light." |
| items.ts:69 | Mana Crystal: "Hums faintly. The core of every spell focus." | "Old lees, set hard. The head of every staff." |
| items.ts:76 | Spellweave: "Fiber spun around a mana crystal." | "Fiber laid round a crystal." |
| items.ts:91 | Ashen Token: "Carried by the Ashen Host. Traders will take them." | "Glass from under a sand-country fire. A night inside the light at any of their fires." |
| items.ts:94 | Heartroot: "Still beating. Lets a bench bind trinkets together." | "It still moves. On a bench it loosens two worked pieces far enough to join them." |
| items.ts:95 | Scorched Core: "Hot enough to smelt cindrite." | "Bedded in a ring of deep rock, it loosens Jalit ore." |
| items.ts:96 | Warden Sigil: "The key the Pale Warden was set to guard." | "A piece of Kankāl." |
| items.ts:128 | Hollow Gate: "Raises a gate to the Gloomroot Hollows where you place it." | "Raises a gate to the hollow where you place it." |
| items.ts:129 | Rift Gate: "Raises a gate to the Skyrift where you place it." | "Raises a gate to the islands where you place it." |
| items.ts:132 | "Offer at a Rootbound Altar to wake the Mossback Colossus." | "Lay it on a Vanahar Altar. Vanahar comes up to it." |
| items.ts:133 | "Offer at a Sunken Altar to call up the Dune Maw." | "Lay it on a Maruhar Altar. Maruhar comes up to it." |
| items.ts:134 | "Ring at a Warden Altar. Something will answer." | "Lay it on a Kankāl Altar. Kankāl comes up to it." |
| items.ts:135 | "Burn at a Mycelial Altar to draw out the Sporemother." | "Lay it on a Guhamāt Altar. Guhamāt comes to the smoke." |
| items.ts:136 | "Fly from a Tempest Altar to challenge the Tempest Regent." | "Fly it from a Jīmūt Altar. Jīmūt comes to it." |
| items.ts:137 | "Set on a Prism Altar to focus the Luminarch." | "Lay it on a Ratan Altar. Ratan comes to it." |
| items.ts:138 | "Wear before an Eclipse Altar at night. The Moonbound Hart will see you." | "Lay it on a Kuranga Altar at night. Kuranga comes up to it." |
| items.ts:139 | "Opens the First Cairn. There is no closing it again." | "Lay it on the Cairn. Nihān comes up through the base to take it." |
| items.ts:175 | Sovereign's Light: "The cairn remembers you. Everything, a little better." | "A piece of the housing with its gem in it. Everything, a little better." |

The baits' old verbs (wake, call up, ring, burn, focus, wear, open) are what the born say a crew is doing, and belong only in a born mouth (4.2). Every bait is laid on its stone.

### Townsfolk (src/data/npcs.ts and src/systems/npcs.ts)

| Line | Now | With the new names |
| --- | --- | --- |
| npcs.ts:10 | "The cairns were lit once. All of them. You can see where, if you look for the altars." | "They said every stone on this road was lit once." |
| npcs.ts:10 | "When you are lost, open the Guide. I keep it current." | "When you are lost, open the Guide." |
| npcs.ts:16 | "Iron forgives. Lumenite does not. Mind your pick." | "Iron lifts with a stone pick, and Hīrak does not." |
| npcs.ts:18 | "Interested in whoever felled the Colossus." | "Comes for the fresh remains of Vanahar." |
| npcs.ts:19 | "Heartroot. Still warm? Remarkable. Do not eat it." | "Put it on the table, away from the pot." |
| npcs.ts:21 | "Cannot resist a bench that binds trinkets." | "Comes to see a Joining Bench." |
| npcs.ts:22 | "I had a bottle with a gust in it. Sold it. Regret it." | "I had a Cloud Bottle once, and sold it." |
| npcs.ts:24 | "Drawn to a working Runeloom." | "Comes to a working Line Frame." |
| npcs.ts:25 | "Mana is only light that has not decided what to be yet." | "A staff is the same work as a hearthstone, pointed away from you." |
| npcs.ts:27 | "Wants to meet whoever quieted the Warden." | "Comes to a crew that has killed Kankāl." |
| npcs.ts:28 | "An effigy is a promise. Keep it." | "It stays for what is on the bone." |
| npcs.ts:30 | "Stays behind after an Ashen Host is broken." | "Stays behind after a Sand March is beaten off." |
| npcs.ts:31 | "They pay in tokens. I take tokens. Nobody else will." | "Mūda is a night inside the light at any fire of ours." |
| systems/npcs.ts:89 | "The Hollow Moon turns tonight. Moonspawn carry the slivers." | "Amāvassa is tonight. The Chandasāvak carry the slivers." |
| systems/npcs.ts:89 | "The Hollow Moon turns in N night(s)." | "Amāvassa is in N night(s)." |
| systems/npcs.ts:100, game.ts:612 | "Townsfolk only settle in the Overworld." | "Townsfolk settle only on the living ground." |

The replacement lines for the townsfolk are the ones the peoples chapter gives as guides to manner (5.5).

### Lines of the eight outside their table (src/data/mobs.ts, src/game.ts)

The phase lines that named an animal ("The Maw thrashes", "The Warden raises both hands", "The seal cracks. So does the Warden.", "Sporemother tears loose from her roots!", "The Regent screams", "The Hart will not be led back") are all replaced in the table of section 1. One more string names one of the eight:

| Line | Now | With the new names |
| --- | --- | --- |
| game.ts:591 | "The Hart only answers at night." | "Kuranga comes up only at night." |
| game.ts:328 | "<Boss> has fallen" / "The first light is yours" | Keep the first. For the eighth, drop the second: the kill lights no stone (4.10). |

### The Guide (src/data/quests.ts)

Quest titles and hints name bosses, altars, stations, metals, creatures and places. Every one of them is listed here with the old words that have to go.

| Line | Key | Old words in it | New words |
| --- | --- | --- | --- |
| quests.ts:8, 9, 12, 14, 19, 20, 27, 29, 33, 38, 42, 47 | several | pickaxe | pick |
| quests.ts:11 | `furnace` | cobblestone | rubble |
| quests.ts:14 | `ironpick` | mana geodes, lumenite | geodes, Hīrak |
| quests.ts:15 | `house` | Guest Bed | Holder's Bed |
| quests.ts:16 | `idol` | Verdant Idol, capgel, Gelcaps, Emberpetal | Vanahar Likeness, jelly, Kinva, red flower |
| quests.ts:17 | `boss1` | Wake the Mossback Colossus; Rootbound Altar; idol | Bait Vanahar; Vanahar Altar; likeness |
| quests.ts:18 | `tinker` | Tinker's Bench, Heartroot, "fuses trinkets" | Joining Bench, Vanahar Remains, "joins two trinkets into one" |
| quests.ts:19 | `lumenite` | Find Lumenite; deepstone | Find Hīrak; deep rock |
| quests.ts:20 | `lumpick` | Lumenite pickaxe; cindrite, nightglass | Hīrak Pick; Jalit ore, black glass |
| quests.ts:21 | `lure` | Sunken Lure; Cinder Wisps | Maruhar Lure; Angār |
| quests.ts:22 | `boss2` | Call up the Dune Maw; Sunken Altar | Bait Maruhar; Maruhar Altar |
| quests.ts:23 | `emberforge` | Emberforge; Scorched Core; deepstone; "smelts cindrite" | Maruhar Furnace; Maruhar Remains; deep rock; "loosens Jalit ore" |
| quests.ts:24 | `cinder` | Forge Cindersteel; cindrite ore; Emberforge | Forge Jalit; Jalit ore; Maruhar Furnace |
| quests.ts:25 | `bell` | Warden Bell; lumenite; shade essence; Dungeon chests | Kankāl Bell; Hīrak; shade flesh; chests in a sealed store |
| quests.ts:26 | `boss3` | Face the Pale Warden; Warden Altar | Bait Kankāl; Kankāl Altar |
| quests.ts:27 | `gate1` | Nightglass; Lumenite pickaxe; Warden Sigil | Black Glass; Hīrak Pick; Kankāl Remains |
| quests.ts:28 | `dim1` | Enter the Gloomroot Hollows | Cross to the hollow |
| quests.ts:29 | `umbrite` | Smelt Umbrite; gloomstone; Cindersteel pickaxe; Emberforge | Work Antar; hollow rock; Jalit Pick; Maruhar Furnace |
| quests.ts:30 | `censer` | Spore Censer; umbrite bars; glowshroom | Guhamāt Smoker; Antar bars; glowing mushroom |
| quests.ts:31 | `boss4` | Draw out the Sporemother; Mycelial Altar; the Hollows; "her sporelings" | Bait Guhamāt; Guhamāt Altar; the hollow; "the Kavak" |
| quests.ts:32 | `voidkiln` | Voidkiln; Queen Spore; gloomstone; noctrium; the Hollows | Guhamāt Furnace; Guhamāt Remains; hollow rock; Tala; the hollow |
| quests.ts:33 | `noctrium` | Forge Noctrium; umbrite pickaxe; Voidkiln | Forge Tala; Antar Pick; Guhamāt Furnace |
| quests.ts:34 | `kite` | Storm Kite; spellweave; noctrium bar | Jīmūt Kite; crystal fiber; Tala bar |
| quests.ts:35 | `boss5` | Challenge the Tempest Regent; Tempest Altar; the Overworld | Bait Jīmūt; Jīmūt Altar; the living ground |
| quests.ts:36 | `gate2` | Rift Gate; noctrium bars; Storm Plume | Island Gate; Tala bars; Jīmūt Remains |
| quests.ts:37 | `dim2` | Enter the Skyrift | Cross to the islands |
| quests.ts:38 | `aether` | Forge Aetherium; riftstone; Noctrium pickaxe; Voidkiln | Forge Ākās; island rock; Tala Pick; Guhamāt Furnace |
| quests.ts:39 | `lens` | Prism Lens; aetherium bars; living shards; Shardlings | Ratan Lens; Ākās bars; shards; Sakal |
| quests.ts:40 | `boss6` | Focus the Luminarch; Prism Altar; the Skyrift | Bait Ratan; Ratan Altar; the islands |
| quests.ts:41 | `crucible` | Prism Crucible; Prism Heart; riftstone; prismite | Ratan Furnace; Ratan Remains; island rock; Patik |
| quests.ts:42 | `prism` | Forge Prismite; the Skyrift; Aetherium pickaxe; Prism Crucible | Forge Patik; the islands; Ākās Pick; Ratan Furnace |
| quests.ts:43 | `slivers` | Hunt under the Hollow Moon; Moonspawn and Howlers | Hunt on Amāvassa; Chandasāvak and Ulūk |
| quests.ts:44 | `mask` | Eclipse Mask; prismite bars; the Runeloom | Kuranga Mask; Patik bars; the Line Frame |
| quests.ts:45 | `boss7` | Stand before the Moonbound Hart; Eclipse Altar | Bait Kuranga; Kuranga Altar |
| quests.ts:46 | `eclforge` | Eclipse Forge; Eclipse Ember; nightglass; eclipsium; the Overworld | Kuranga Furnace; Kuranga Remains; black glass; Gahan; the living ground |
| quests.ts:47 | `eclipse` | Forge Eclipsium; Prismite pickaxe | Forge Gahan; Patik Pick |
| quests.ts:48 | `key` | eclipsium bars; lumenite block; living shards | Gahan bars; Hīrak Block; shards |
| quests.ts:49 | `boss8` | Open the First Cairn | Bait Nihān at the Cairn |
| quests.ts:50 | `end` | "The light is yours" / "The cairns are lit. ... hunt the Hollow Moon." | Both go: the kill lights no stone (4.10, 8.11). The title is After the Last. |

### Attacks (src/systems/events.ts)

| Line | Now | With the new names |
| --- | --- | --- |
| events.ts:30 | "The Ashen Host marches" / "Defeat them to break the invasion" | "A march from the sand country" / "Beat them off before dusk" |
| events.ts:31 | "The Hollow Moon rises" / "Strange things walk tonight" | "Amāvassa" / "The moon is dark tonight" |
| events.ts:41 | "The Ashen Host is broken" | "The march is beaten off" |
| events.ts:45 | "The Host withdraws" | "The march turns for home" |

### The game loop, the windows and the HUD

| Line | Now | What to do |
| --- | --- | --- |
| game.ts:838 | "Needs a <Tier> pickaxe or better" | "Needs a <tier word> pick or better", with "an" before Iron, Antar and Ākās. Count Ā as a vowel. |
| windows.ts:541 | "Needs a <forge block name>" | No change to the code. All five names begin with a consonant. |
| game.ts:50, 590 | "Needs a/an <Offering name>", "The altar waits for a <Item>." | The first already picks the article. Make the second pick it too. |
| game.ts:565 | "A bedroll only holds your spawn in the Overworld." | "A bedroll marks your place only on the living ground." |
| game.ts:677 | "Returning to the Overworld" | "Returning to the living ground" |
| game.ts:708 | banner "<Realm>" with "No sky here. Bring light." or "Mind the edges" | The subtitles stay. The realm names come from dims.ts. |
| game.ts:805 | "The Rift throws you back." | "You are back on the last footing." |
| game.ts:746 | console reply "<Tier> kit" | Follows the tier word. |
| windows.ts:763 | "<Style label> weapon" | Follows the four labels: "Melee weapon", "Ranged weapon", "Crystal-work weapon", "Totem weapon". |
| windows.ts:767 | "N <style key> damage" | It prints the raw key, so it would still say "magic" and "summon". Print the label in lower case. |
| items.ts:237-250 | set bonus text "+p% magic damage, +N mana", "+p% summon damage" | Goes with the two labels and with the word for the blue bar. |
| stats.ts:11 | Arcana: "+2% magic and summon damage, +6 mana per point" | The attribute is Arm. The sentence follows the labels. |
| hud.ts:110, 291-300 | the title row of the boss bar | Draw nothing when the title is empty. |
| quests.ts:68 | "Nearest altar: N m <direction>" | Stays. Altar is the word everyone on the ground uses. |

The word mana is on the blue bar and in other strings (game.ts:442, hud.ts:31 and 270, windows.ts:20-23, 769 and 782, and the tooltips of the crystal trinkets). It is no name and has no key, so it is outside this pass. The ground chapter says what the bar is: the strain an arm will take (1.6). The text pass should choose the word, and `Arm` is the one this pass used for the attribute.

## 3. What has no key yet

These entries of `names.json` are marked `shown: false`. They are for writers, and a loader should not look for their keys.

- The three peoples (`people:*`). Game text says householders, sand-country people and peopls in English.
- The eight kinds of host (`host:1` to `host:8`). The game shows no name for a kind.
- The eight old things to find (`find:*`), which the materials chapter proposes and the game does not have yet.
- The personal name of each townsperson.

The thirteen structures have keys and no display name in play. Their names are for the compass and for later text, and the compass goes on saying "Nearest altar".
