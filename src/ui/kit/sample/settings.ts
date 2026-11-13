// Sample settings: the four tabs of section 6, Settings, with plausible values. Each tab fills the ten rows the slab
// shows; Sound and Interface carry rows the game has yet to wire (the mixer's channels, the HUD's parts).

/** A switch is on or off; a measure has whole steps between two ends; a choice steps through its values. */
export type Setting =
  | { kind: 'switch'; key: string; label: string; on: boolean }
  | { kind: 'measure'; key: string; label: string; min: number; max: number; step: number; value: number; unit?: string }
  | { kind: 'choice'; key: string; label: string; values: string[]; at: number };

export interface SettingsTab { key: string; name: string; icon: string; rows: Setting[] }

export const SETTINGS: SettingsTab[] = [
  {
    key: 'picture', name: 'Picture', icon: 'picture', rows: [
      { kind: 'choice', key: 'preset', label: 'Preset', values: ['Low', 'Middle', 'High', 'Highest', 'Own'], at: 2 },
      { kind: 'measure', key: 'distance', label: 'Render distance', min: 2, max: 16, step: 1, value: 8 },
      { kind: 'measure', key: 'fov', label: 'Field of view', min: 50, max: 110, step: 1, value: 70 },
      { kind: 'choice', key: 'resolution', label: 'Resolution', values: ['Full', 'Three quarters', 'Half'], at: 0 },
      { kind: 'choice', key: 'filtering', label: 'Texture filtering', values: ['Nearest', 'Mipmapped'], at: 1 },
      { kind: 'switch', key: 'adaptive', label: 'Adaptive resolution', on: true },
      { kind: 'switch', key: 'bloom', label: 'Bloom', on: true },
      { kind: 'choice', key: 'shadows', label: 'Sun shadows', values: ['Off', 'Near', 'Far'], at: 1 },
      { kind: 'switch', key: 'tonemap', label: 'Tone mapping', on: true },
      { kind: 'switch', key: 'vignette', label: 'Vignette', on: false },
      { kind: 'switch', key: 'fxaa', label: 'Smooth edges', on: true },
      { kind: 'switch', key: 'taa', label: 'Smooth edges over time', on: false },
      { kind: 'switch', key: 'clouds', label: 'Clouds', on: true },
      { kind: 'switch', key: 'sway', label: 'Leaves and grass sway', on: true },
      { kind: 'switch', key: 'adapt', label: 'Eyes adjust to the dark', on: true },
    ],
  },
  {
    key: 'play', name: 'Play', icon: 'play', rows: [
      { kind: 'measure', key: 'sensitivity', label: 'Mouse sensitivity', min: 10, max: 200, step: 5, value: 100 },
      { kind: 'switch', key: 'bob', label: 'View bobbing', on: true },
      { kind: 'measure', key: 'shake', label: 'Screen shake', min: 0, max: 10, step: 1, value: 5 },
      { kind: 'switch', key: 'autojump', label: 'Auto-jump', on: false },
      { kind: 'switch', key: 'toolswitch', label: 'Take up the right tool', on: true },
      { kind: 'switch', key: 'fly', label: 'Double-tap jump to fly', on: false },
      { kind: 'switch', key: 'raw', label: 'Raw mouse input', on: true },
      { kind: 'switch', key: 'invert', label: 'Invert looking up and down', on: false },
      { kind: 'switch', key: 'crouchhold', label: 'Crouch while the key is held', on: true },
      { kind: 'switch', key: 'sprinthold', label: 'Run while the key is held', on: false },
    ],
  },
  {
    key: 'sound', name: 'Sound', icon: 'sound', rows: [
      { kind: 'measure', key: 'master', label: 'All sound', min: 0, max: 10, step: 1, value: 9 },
      { kind: 'measure', key: 'effects', label: 'Effects', min: 0, max: 10, step: 1, value: 8 },
      { kind: 'measure', key: 'music', label: 'Music', min: 0, max: 10, step: 1, value: 4 },
      { kind: 'measure', key: 'ambience', label: 'Wind, water, birds', min: 0, max: 10, step: 1, value: 7 },
      { kind: 'measure', key: 'weather', label: 'Rain and thunder', min: 0, max: 10, step: 1, value: 6 },
      { kind: 'measure', key: 'steps', label: 'Footsteps', min: 0, max: 10, step: 1, value: 5 },
      { kind: 'measure', key: 'crew', label: 'Crew voices', min: 0, max: 10, step: 1, value: 8 },
      { kind: 'measure', key: 'clicks', label: 'Interface clicks', min: 0, max: 10, step: 1, value: 3 },
      { kind: 'switch', key: 'away', label: 'Sound when the window is away', on: false },
      { kind: 'switch', key: 'captions', label: 'Write what is heard', on: false },
    ],
  },
  {
    key: 'interface', name: 'Interface', icon: 'interface', rows: [
      { kind: 'choice', key: 'scale', label: 'Interface scale', values: ['Auto', '1', '2', '3', '4'], at: 0 },
      { kind: 'measure', key: 'chat', label: 'Chat lines shown', min: 0, max: 12, step: 1, value: 8 },
      { kind: 'choice', key: 'chatw', label: 'Chat width', values: ['Narrow', 'Middle', 'Wide'], at: 1 },
      { kind: 'measure', key: 'chatfade', label: 'Chat fades after', min: 5, max: 30, step: 5, value: 10, unit: ' s' },
      { kind: 'switch', key: 'crewlist', label: 'Crew list', on: true },
      { kind: 'switch', key: 'toasts', label: 'Toasts', on: true },
      { kind: 'switch', key: 'pickups', label: 'Pickup log', on: true },
      { kind: 'switch', key: 'inhand', label: 'Name of the thing in hand', on: true },
      { kind: 'switch', key: 'coords', label: 'Coordinates', on: false },
      { kind: 'switch', key: 'compass', label: 'Compass', on: true },
    ],
  },
];
