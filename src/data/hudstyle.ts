// Per-boss health bar colours (top and bottom of the gradient), keyed by boss mob key.
// Chosen for contrast against the dark track and the white label, not taken from the model.
export const BOSS_BARS: Record<string, [string, string]> = {
  b_colossus: ['#b4e67a', '#4f8a2a'],
  b_maw: ['#ffd27a', '#c0701c'],
  b_warden: ['#b8c6ff', '#4e5eb0'],
  b_sporemother: ['#d890ff', '#7a36b8'],
  b_regent: ['#86dcff', '#2a74c0'],
  b_luminarch: ['#ffa2ea', '#b04aa4'],
  b_hart: ['#8ef0dc', '#22857e'],
  b_sovereign: ['#ffe08a', '#d0661c'],
};
