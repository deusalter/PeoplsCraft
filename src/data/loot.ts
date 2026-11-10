// Loot tables for chests and crates. Entries: [item, weight, min, max]; `mod` is the chance a
// rolled piece of gear carries a random modifier.
export interface LootTable { rolls: [number, number]; mod: number; coins: [number, number]; entries: [string, number, number, number][] }
export const LOOT: Record<string, LootTable> = {
  crate: { rolls: [2, 3], mod: 0, coins: [0, 6], entries: [['apple', 6, 1, 3], ['arrow', 5, 4, 10], ['torch', 6, 2, 6], ['fiber', 5, 2, 5], ['coal', 4, 1, 4], ['oak_planks', 4, 4, 10], ['cooked_meat', 3, 1, 2]] },
  village: { rolls: [3, 5], mod: 0.2, coins: [4, 18], entries: [['cooked_meat', 6, 1, 4], ['apple', 6, 2, 5], ['iron_bar', 5, 1, 4], ['torch', 6, 4, 10], ['arrow', 5, 6, 16], ['salve', 4, 1, 3], ['hide', 4, 1, 4],
    ['stone_pickaxe', 2, 1, 1], ['stone_sword', 2, 1, 1], ['wood_bow', 2, 1, 1], ['gold_bar', 2, 1, 2], ['strider_boots', 0.6, 1, 1], ['bedroll', 1.5, 1, 1]] },
  ruin: { rolls: [3, 5], mod: 0.35, coins: [6, 26], entries: [['iron_bar', 6, 1, 5], ['gold_bar', 3, 1, 3], ['coal', 5, 2, 8], ['arrow', 5, 6, 18], ['salve', 4, 1, 3], ['tonic', 3, 1, 2], ['mana_crystal', 3, 1, 3], ['bone', 4, 1, 4],
    ['iron_sword', 1.2, 1, 1], ['iron_bow', 1.2, 1, 1], ['iron_pickaxe', 1.2, 1, 1], ['cloud_bottle', 0.7, 1, 1], ['feather_charm', 0.7, 1, 1], ['heart_locket', 0.6, 1, 1], ['lucky_coin', 0.3, 1, 1], ['verdant_idol', 1, 1, 1]] },
  dungeon: { rolls: [4, 6], mod: 0.5, coins: [15, 50], entries: [['iron_bar', 6, 2, 6], ['gold_bar', 5, 1, 4], ['lumenite', 2.5, 1, 2], ['mana_crystal', 4, 1, 4], ['barbed_arrow', 4, 8, 20], ['salve', 5, 2, 4], ['tonic', 4, 1, 3],
    ['shade_essence', 4, 1, 3], ['iron_staff', 1.4, 1, 1], ['iron_totem', 1.2, 1, 1], ['iron_melee_1', 1, 1, 1], ['iron_ranged_1', 1, 1, 1], ['iron_magic_1', 1, 1, 1], ['iron_summon_1', 1, 1, 1],
    ['cloud_bottle', 1, 1, 1], ['magnet_shell', 0.8, 1, 1], ['mana_charm', 0.8, 1, 1], ['iron_bracer', 0.8, 1, 1], ['shadow_cloak', 0.25, 1, 1], ['recall_stone', 0.6, 1, 1], ['warden_bell', 0.8, 1, 1]] },
  hollow: { rolls: [4, 6], mod: 0.6, coins: [30, 90], entries: [['umbrite_bar', 5, 1, 4], ['cinder_bar', 5, 2, 5], ['spore_sac', 5, 1, 4], ['moth_dust', 4, 1, 3], ['greater_salve', 4, 1, 3], ['greater_tonic', 3, 1, 3], ['void_arrow', 4, 10, 24],
    ['glow_broth', 3, 1, 2], ['umbrite_sword', 1, 1, 1], ['umbrite_staff', 1, 1, 1], ['umbrite_bow', 1, 1, 1], ['umbrite_totem', 1, 1, 1], ['binders_whistle', 0.8, 1, 1], ['shadow_cloak', 0.6, 1, 1], ['spore_censer', 0.8, 1, 1]] },
  rift: { rolls: [4, 6], mod: 0.7, coins: [60, 160], entries: [['aether_bar', 5, 1, 4], ['noctrium_bar', 5, 2, 5], ['shard', 5, 1, 4], ['rift_scale', 5, 1, 4], ['skyfruit', 5, 1, 4], ['greater_salve', 4, 2, 4], ['prism_arrow', 3, 10, 24],
    ['aether_sword', 1, 1, 1], ['aether_staff', 1, 1, 1], ['aether_bow', 1, 1, 1], ['aether_totem', 1, 1, 1], ['gale_emblem', 0.6, 1, 1], ['duelists_sigil', 0.5, 1, 1], ['prism_lens', 0.8, 1, 1]] },
};
