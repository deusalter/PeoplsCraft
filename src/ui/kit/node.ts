import type { Colour } from './palette';
import type { Surface } from './surface';
import type { Layout } from './scale';

/** What a part knows when it paints: the state the root keeps for it across rebuilds. */
export interface Live {
  hover: boolean;
  down: boolean;
  /** True only while the focus is on this node and was moved there by a key. */
  focus: boolean;
  /** Seconds since the root started. */
  t: number;
}

export interface PointerEv {
  /** The unit under the pointer, from the node's top left. */
  x: number; y: number;
  /** The same unit on the virtual screen. */
  gx: number; gy: number;
  /** 0 left, 1 middle, 2 right. */
  button: number;
  shift: boolean; ctrl: boolean; alt: boolean;
  /** A second press of the same button on the same node within 0.3 s. */
  double: boolean;
}

export interface DragEv extends PointerEv {
  phase: 'start' | 'move' | 'end';
  /** Units moved since the press. */
  dx: number; dy: number;
  /** The node under the pointer now, and the node the press began on. */
  over: Node | null;
  from: Node;
}

export interface WheelEv extends PointerEv { /** Notches, positive toward the user (down a list). */ notches: number }

export interface KeyEv {
  key: string; code: string;
  shift: boolean; ctrl: boolean; alt: boolean; repeat: boolean;
}

/** The text and selection of a drawn field, which the root keeps against the field's id. */
export interface FieldState {
  value: string;
  start: number; end: number;
  /** The run an input method is composing, drawn with a rule under it. */
  compose: [number, number] | null;
  /** When the last refused key was, for the 0.3 s frame of blood. */
  refusedAt: number;
}

export interface FieldSpec {
  value: string;
  limit?: number;
  /** One allowed character. */
  allow?: RegExp;
  password?: boolean;
  /** Where the text's cell starts, from the node's left, so that a press can place the caret. */
  textX: number;
  /** How far the text is scrolled left, in units. */
  scroll?: number;
}

/** Return true from a handler to say the event was used and should go no further up the tree. */
export interface Handlers {
  down(e: PointerEv): void;
  up(e: PointerEv): void;
  click(e: PointerEv): void;
  wheel(e: WheelEv): boolean | void;
  key(e: KeyEv): boolean | void;
  drag(e: DragEv): void;
  enter(): void;
  leave(): void;
  text(s: FieldState): void;
  /** The pointer came onto this node with a button held that was pressed elsewhere (spreading with the right button). */
  pass(e: PointerEv): void;
  /** A press that began on another node was let go over this one. */
  drop(e: DragEv): void;
  /** The pointer moved to another unit over this node, the topmost under it (a chart's readout of the place). */
  move(e: PointerEv): void;
}

export interface TipLine { text: string; c: Colour }

export interface Tip {
  lines: TipLine[];
  /** The frame's colour; `root.4` when not given. */
  frame?: Colour;
  /** A named old thing: a second frame of salt inside the first. */
  named?: boolean;
  /** Seconds of rest before it shows: 0 for a slot, 0.4 for a button, a tab or a label. */
  delay?: number;
}

export interface Node {
  /** Stable across rebuilds; hover, press, focus, scroll and a field's caret are kept against it. */
  id?: string;
  /** Units, from the parent's top left. */
  x: number; y: number; w: number; h: number;
  paint?(s: Surface, live: Live): void;
  kids?: Node[];
  /** Children are clipped to this node and are not hit outside it: wells. */
  clip?: boolean;
  /** Takes the pointer; a node with handlers does unless this says false. */
  takes?: boolean;
  /** A stop for Tab. */
  focus?: boolean;
  /** A drawn text field: the hidden input serves it while it has focus. */
  field?: FieldSpec;
  /** Something on it moves, so the root paints every frame while it is shown. */
  anim?: boolean;
  tip?(live: Live): Tip | null;
  on?: Partial<Handlers>;
}

/** Something that follows the pointer, drawn on the pointer's own canvas with the pointer's hot spot at x, y. */
export interface Held { paint(s: Surface, x: number, y: number): void }

export type Layer = 'hud' | 'window' | 'menu' | 'over';
export const LAYERS: readonly Layer[] = ['hud', 'window', 'menu', 'over'];

/** What sounds the game may play for what the interface did. */
export type Cue = 'press' | 'refuse' | 'tab' | 'page' | 'take' | 'put';

/** What a screen may ask of the root while it builds or handles an event. */
export interface Ui {
  readonly layout: Layout;
  /** The virtual screen in units. */
  readonly w: number;
  readonly h: number;
  /** Seconds since the root started. */
  readonly t: number;
  held: Held | null;
  scroll(id: string): number;
  setScroll(id: string, v: number): void;
  field(id: string): FieldState | undefined;
  focused(): string | null;
  focusOn(id: string | null, byKey?: boolean): void;
  refuse(id: string): void;
  cue(c: Cue): void;
  /** Asks for the layers to be built again. */
  invalidate(layer?: Layer): void;
  /** Asks for a repaint without a rebuild. */
  wake(): void;
}

export type Screen<V> = (view: V, ui: Ui) => Node;
