// Townsfolk: who they are, what brings them, and what they sell. Goods may be gated by a flag.
export interface NpcDef {
  key: string; mob: string; name: string;
  need: { flag?: string; coins?: number; npcs?: number }; why: string;
  lines: string[];
  goods: [item: string, price: number, currency?: string, flag?: string][];
}
export const NPCS: NpcDef[] = [
  { key: 'wayfinder', mob: 'n_wayfinder', name: 'Desik', need: {}, why: 'Arrives as soon as there is a room to stay in.',
    lines: ['The cairns were lit once. All of them. You can see where, if you look for the altars.', 'A door, a light, a bed, four walls. That is all anyone asks.', 'When you are lost, open the Guide. I keep it current.'],
    goods: [['torch', 2], ['bedroll', 20], ['recall_stone', 180], ['arrow', 1], ['oak_planks', 1], ['salve', 14]] },
  { key: 'provisioner', mob: 'n_provisioner', name: 'Vāhak', need: { coins: 40 }, why: 'Follows the smell of coin: carry 40 or more.',
    lines: ['Eat before you go under. The dark is hungry enough for both of you.', 'I buy anything. I sell most things.'],
    goods: [['cooked_meat', 8], ['apple', 3], ['stew', 12], ['arrow', 1], ['fiber', 2], ['hide', 6], ['feather', 4], ['coal', 4], ['skyfruit', 60, 'coins', 'dim:2']] },
  { key: 'smith', mob: 'n_smith', name: 'Kammār', need: { flag: 'craft:anvil' }, why: 'Comes when she hears an anvil ring.',
    lines: ['Iron forgives. Lumenite does not. Mind your pick.', 'Bring me something worth hammering and I will stay.'],
    goods: [['iron_bar', 14], ['coal', 4], ['barbed_arrow', 3], ['iron_bracer', 90], ['gold_bar', 40], ['lantern', 12], ['cinder_bar', 70, 'coins', 'boss:2'], ['umbrite_bar', 140, 'coins', 'boss:4'], ['ember_arrow', 6, 'coins', 'boss:2']] },
  { key: 'apothecary', mob: 'n_apothecary', name: 'Vejja', need: { flag: 'boss:1' }, why: 'Interested in whoever felled the Colossus.',
    lines: ['Heartroot. Still warm? Remarkable. Do not eat it.', 'A salve now is worth ten after.'],
    goods: [['salve', 12], ['tonic', 14], ['ironbark', 30], ['swiftroot', 30], ['greater_salve', 60, 'coins', 'boss:3'], ['greater_tonic', 60, 'coins', 'boss:3'], ['glow_broth', 45, 'coins', 'dim:1']] },
  { key: 'tinker', mob: 'n_tinker', name: 'Kāru', need: { flag: 'craft:tinker_bench' }, why: 'Cannot resist a bench that binds trinkets.',
    lines: ['Two good things, one better thing. That is the whole trade.', 'I had a bottle with a gust in it. Sold it. Regret it.'],
    goods: [['magnet_shell', 160], ['spring_anklet', 140], ['strider_boots', 120], ['cloud_bottle', 320], ['delvers_charm', 220], ['lucky_coin', 400], ['reach_gauntlet', 500, 'coins', 'boss:2']] },
  { key: 'runescribe', mob: 'n_runescribe', name: 'Rehakār', need: { flag: 'craft:runeloom' }, why: 'Drawn to a working Runeloom.',
    lines: ['Mana is only light that has not decided what to be yet.', 'The geodes sing if you hold them to your ear. Do not answer.'],
    goods: [['mana_crystal', 18], ['weave', 22], ['tonic', 14], ['sages_ring', 150], ['mana_charm', 150], ['iron_staff', 120], ['recall_stone', 160]] },
  { key: 'beastcaller', mob: 'n_beastcaller', name: 'Posak', need: { flag: 'boss:3' }, why: 'Wants to meet whoever quieted the Warden.',
    lines: ['Things follow you if you ask correctly.', 'An effigy is a promise. Keep it.'],
    goods: [['effigy', 26], ['bone', 4], ['binders_whistle', 260], ['iron_totem', 130], ['shade_essence', 20], ['spore_sac', 40, 'coins', 'dim:1']] },
  { key: 'deserter', mob: 'n_deserter', name: 'Deserter', need: { flag: 'event:ashen' }, why: 'Stays behind after an Ashen Host is broken.',
    lines: ['I marched with them. I will not again.', 'They pay in tokens. I take tokens. Nobody else will.'],
    goods: [['shadow_cloak', 30, 'ash_token'], ['duelists_sigil', 45, 'ash_token'], ['greater_salve', 3, 'ash_token'], ['ember_arrow', 1, 'ash_token'], ['heart_locket', 12, 'ash_token'], ['gale_emblem', 50, 'ash_token']] },
];
