// The mock screens of section 6, gathered from their own files so that no shared list has to be edited to add one.
// A file here exports `SCREENS`, a list of named screens; a file under sample/ may export `ICONS`, pictures its
// sample data needs that the mock items lack.
import type { Sheet } from '../sheets/common';
import type { Icon } from '../surface';

export interface NamedScreen extends Sheet {
  /** What `?screen=` and `uishot --screen` call it. */
  name: string;
}

const screenMods = import.meta.glob<{ SCREENS?: NamedScreen[] }>(['./*.ts', '!./index.ts'], { eager: true });
const sampleMods = import.meta.glob<{ ICONS?: Record<string, Icon> }>('../sample/*.ts', { eager: true });

export const SCREEN_FILES: Record<string, Sheet> = {};
for (const path of Object.keys(screenMods).sort()) {
  for (const s of screenMods[path].SCREENS ?? []) {
    if (SCREEN_FILES[s.name]) throw new Error(`screens: two screens are called ${s.name}`);
    SCREEN_FILES[s.name] = s;
  }
}

export const SAMPLE_ICONS: Record<string, Icon> = {};
for (const path of Object.keys(sampleMods).sort()) Object.assign(SAMPLE_ICONS, sampleMods[path].ICONS ?? {});
