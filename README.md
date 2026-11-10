# Cairnlight

A first-person voxel sandbox RPG for the browser. Mine, build and survive in a procedurally
generated world, then keep going: ten material tiers, eight summoned bosses, two extra
dimensions, townsfolk, world events and a guide that always names the next step.

Everything is generated at runtime. There are no image, model or audio files in this repo.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production bundle in dist/
```

Needs a WebGL2 browser. Worlds are saved to IndexedDB in that browser.

## Controls

| Key | Action |
| --- | --- |
| W A S D, Space, Shift | Move, jump / swim up, sneak |
| Ctrl or double-tap W | Sprint |
| Left mouse | Mine, attack, fire |
| Right mouse | Use, place, eat, talk |
| E / G | Inventory and crafting / Guide |
| R | Use the best salve in your pack |
| 1-9, wheel, Q | Hotbar, drop item |
| F3 / F1 | Debug overlay / hide HUD |
| T | Command line (`give`, `time`, `tp`, `gear`, `boss`, `locate`, `dim`, `creative`, `god` ...) |
| Esc | Pause, settings |

## How it is put together

```
src/
  core/        constants, seeded noise
  data/        every table: blocks, items, recipes, mobs + bosses, loot, npcs, quests, biomes, dims
  world/       chunk storage and scheduling (world.ts), worker entry, lighting, greedy mesher
    gen/       climate, overworld, the two dimensions, structures
  render/      atlas + texture painters, shaders, renderer/sky/post (gfx.ts), instanced batches, icons, item models
  player/      input, swept-AABB physics, controller, block interaction
  entities/    creatures + AI, boss brain, projectiles, dropped items
  systems/     inventory + crafting, stats, save, quests, events, townsfolk, fluids
  ui/          HUD, windows (inventory / crafting / chest / forge / shop / guide), menus, debug overlay
  audio/       synthesized effects and generative music
  game.ts      owns the systems, fixed-step simulation, render loop
```

Design notes worth knowing before changing things:

- **Chunks** are 16x256x16 `Uint8Array`s, column-major. Generation and lighting+meshing run in a
  worker pool; the main thread only schedules (nearest first) and uploads inside a time budget.
- **Lighting** is recomputed per mesh job over the 3x3 chunk neighbourhood. Light travels at most
  15 blocks and a chunk is 16 wide, so the centre chunk is exact with no cross-chunk light state.
  Block light is RGB (three flood fills), sky light is a fourth channel.
- **Meshing** is greedy per slice. Faces merge only when their four corners share lighting and tint,
  so smooth lighting and AO stay correct. Water tops are deliberately left unmerged so the vertex
  wave has no T-junction cracks. One mesh per chunk per material (opaque, cutout, translucent).
- **Rendering** is linear HDR into a float target, then bloom, ACES tone mapping and vignette.
  Fog samples the same sky function the sky dome uses, so distant terrain fades into the real sky colour.
- **Creatures** are box sculptures drawn through a single instanced mesh; particles are a second one.
- **Saves** store only modified chunks (run-length encoded) plus one world record. Each chunk
  remembers which block-id table it was written with, so the block list can change between builds.

## Adding content

All content is data. Nothing below needs engine changes.

- **Block**: add a line to `INIT` in `data/blocks.ts`, and a painter for each new texture name in
  `render/textures.ts`. It gets an inventory item and an isometric icon automatically.
- **Item**: add to `data/items.ts`. A new **material tier** is one entry in `TIERS`: tools, four
  weapons and four three-piece armour sets (with set bonuses) and their recipes are generated from it.
- **Recipe**: `data/recipes.ts`, shaped (`shape` + `key`) or shapeless (`in`).
- **Creature**: `data/mobs.ts`: stats, an AI archetype, a parts list (or a builder such as
  `quad`/`biped`/`flyer`), drops and spawn rules.
- **Boss**: same file. Phases are lists of attack primitives (`charge`, `slam`, `volley`,
  `spiral`, `rain`, `ring`, `summon`, `teleport`, `beam`, `burrow`) with their own numbers.
- **Structure**: `world/gen/structures.ts`: a grid cell size, a chance and a `build` function.

`data/validate.ts` cross-checks every reference at startup in development and logs problems.

## Testing hooks

- `?quick=<seed>` skips the menu into a throwaway world; add `&fresh` to wipe it first.
- `window.T` drives the game without real input or `requestAnimationFrame`
  (`T.run(ms)`, `T.loaded()`, `T.key`, `T.click`, `T.grab`, `T.cmd('give iron_sword')`).
  Background tabs throttle `requestAnimationFrame`, so automated checks must use these.

## Not in the game

Stated plainly so nobody goes looking: no flowing-water levels (water only seeps into gaps,
lava is static), no buckets, no farming or saplings, no drowning, torches stand on floors only,
furnace and chest fronts do not rotate to face you, dungeons have no surface entrance.
