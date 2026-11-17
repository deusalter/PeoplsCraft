import { bookSheet } from './book';
import { booksSheet } from './books';
import type { Sheet } from './common';
import { controlsSheet } from './controls';
import { gaugesSheet } from './gauges';
import { hudSheet } from './hud';
import { iconsSheet } from './icons';
import { platesSheet } from './plates';
import { slotsSheet } from './slots';

/** The sheets of parts, in the order the kit page lists them; uishot's `--screen parts` takes every one. */
export const SHEETS: Record<string, Sheet> = {
  parts: slotsSheet,
  'parts-controls': controlsSheet,
  'parts-gauges': gaugesSheet,
  'parts-hud': hudSheet,
  'parts-plates': platesSheet,
  'parts-book': bookSheet,
  'parts-icons': iconsSheet,
  'parts-books': booksSheet,
};
