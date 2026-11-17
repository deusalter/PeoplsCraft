// The skill tree (section 6, Skill tree): a stone slab with a tab for each job along its top and a tab for each of the
// crew down its left, a field of nodes on the ground tile that pans, and "Take".
import { measure, rightX } from '../font/measure';
import { cut } from '../font/wrap';
import type { KeyEv, Node, Screen, Tip } from '../node';
import type { NodeState } from '../art/tree';
import type { Colour } from '../palette';
import { button } from '../parts/button';
import { tabbedSlab } from '../parts/tabs';
import { panTo, tree } from '../parts/tree';
import { CREW, type CrewMember } from '../sample/crew';
import { JOBS, type Job, type SkillNode, TAKEN, TO_SPEND } from '../sample/skills';
import { firstFocus, go, placeWindow } from './books-common';
import type { NamedScreen } from './index';

export interface SkillsView {
  jobs: Job[];
  job: number;
  /** The crew, away or not; the first is oneself. */
  crew: CrewMember[];
  /** Whose tree is open: an index into `crew`. Another's tree is read, not changed. */
  whose: number;
  taken(seat: number): Record<string, number>;
  toSpend: number;
  chosen: string;
  onJob(i: number): void;
  onWhose(i: number): void;
  onChoose(id: string): void;
  onTake(id: string): void;
  onClose(): void;
}

// Wide, the field shows a job's seven columns whole; narrow, it keeps the old width and pans across as well.
const WIDE_W = 320, NARROW_W = 260, H = 212;
const FIELD_Y = 17, FIELD_H = 156;
const SHAPE_SAYS: Record<string, string> = { square: 'a step anyone may take', cut: 'its own skill', spiked: 'a mark it ends in' };
/** The kind a frame's shape stands for, written before the rank under the field, so the three shapes are learnt as they are read. */
const SHAPE_KIND: Record<string, string> = { square: 'Step', cut: 'Own skill', spiked: 'End mark' };

function stateOf(job: Job, n: SkillNode, taken: Record<string, number>): NodeState {
  if ((taken[n.id] ?? 0) > 0) return 'earned';
  const first = n.col === 0;
  const near = job.links.some(([a, b]) => (a === n.id && (taken[b] ?? 0) > 0) || (b === n.id && (taken[a] ?? 0) > 0));
  return first || near ? 'open' : 'locked';
}

export const skillsScreen: Screen<SkillsView> = (v, ui) => {
  const job = v.jobs[v.job];
  const me = v.whose === 0;
  const owner = v.crew[v.whose];
  const taken = v.taken(owner.seat);
  const chosenNode = job.nodes.find((n) => n.id === v.chosen) ?? job.nodes[0];
  // The readout under the field describes the node under the pointer, and the chosen one when the pointer is on none.
  const node = job.nodes.find((n) => n.id === hovered.id) ?? chosenNode;
  const nodeState = stateOf(job, node, taken);
  const rank = taken[node.id] ?? 0;
  const chosenState = stateOf(job, chosenNode, taken);
  const canTake = me && v.toSpend > 0 && chosenState !== 'locked' && (taken[chosenNode.id] ?? 0) < chosenNode.ranks;
  firstFocus(ui, 'skills', null);

  const tip = (n: SkillNode, st: NodeState) => (): Tip => ({
    lines: [
      { text: n.name, c: st === 'locked' ? 'root.4' : 'salt' },
      { text: `${job.name}, ${SHAPE_SAYS[n.shape]}`, c: 'root.4' },
      { text: n.does, c: 'salt' },
      { text: `Rank ${taken[n.id] ?? 0} of ${n.ranks}`, c: 'root.4' },
      ...(st === 'locked' ? [{ text: 'Take a step joined to it first', c: 'blood.lt' as const }] : []),
    ],
  });
  const W = ui.w >= 400 ? WIDE_W : NARROW_W;
  const fieldW = W - 16;
  const specs = job.nodes.map((n) => {
    const st = stateOf(job, n, taken);
    return { id: n.id, col: n.col, row: n.row, shape: n.shape, state: st, icon: n.icon, ranks: n.ranks > 1 ? [taken[n.id] ?? 0, n.ranks] as [number, number] : undefined, tip: tip(n, st) };
  });

  // The field rests on the last node earned in this job the first time it is shown.
  const panId = `sk.field.${job.key}.${owner.seat}.pan`;
  const earned = job.nodes.filter((n) => (taken[n.id] ?? 0) > 0);
  if (!panned.has(panId)) {
    panned.add(panId);
    ui.setScroll(panId, panTo(specs, fieldW, FIELD_H, (earned[earned.length - 1] ?? job.nodes[0]).id));
  }

  const field = tree({
    id: `sk.field.${job.key}.${owner.seat}`, x: 8, y: FIELD_Y, w: fieldW, h: FIELD_H, host: 'stone', ui, chosen: chosenNode.id, described: node.id,
    onHover: (id) => { if (hovered.id !== id) { hovered.id = id; ui.invalidate(); } },
    nodes: specs,
    links: job.links,
    onChoose: (id) => { if (id === v.chosen && me) v.onTake(id); else v.onChoose(id); },
  });

  // On one's own tree the points to spend; on another's whose it is, read only, its name cut so it never meets the title.
  const right = W - 8;
  const head = me ? `${v.toSpend} to spend` : `${cut(owner.name, 90)} (read only)`;
  // What the chosen node is, what a rank of it does and what it needs, on three lines under the field.
  const needs = job.links.filter(([, b]) => b === node.id).map(([a]) => job.nodes.find((n) => n.id === a)!.name);
  // The third line says why Take is not there before it says what is needed: a full node is done, not locked.
  const full = rank >= node.ranks;
  const needLine: { text: string; c: Colour } = full ? { text: 'Full', c: 'growth.dk' }
    : nodeState === 'locked' ? { text: `{cross} Needs ${needs.join(' or ')}`, c: 'blood.dk' }
    : me && v.toSpend <= 0 ? { text: '{cross} No points to spend', c: 'blood.dk' }
    : { text: needs.length ? `Needs: ${needs.join(' or ')}` : 'Needs nothing: a first step', c: 'ink.faded' };
  const rankText = `${SHAPE_KIND[node.shape]}, ${rank} of ${node.ranks}`;
  const textW = W - 16, room = canTake ? textW - 48 : textW;
  const by = FIELD_Y + FIELD_H + 2;
  const kids: Node[] = [
    field,
    { x: right - 150, y: 6, w: 150, h: 10, paint: (s) => { s.text(head, rightX(head, 150), 0, me ? 'growth.dk' : 'ink.faded'); } },
    {
      x: 8, y: by, w: textW, h: 32,
      paint: (s) => {
        s.text(rankText, rightX(rankText, textW), 0, 'ink.faded');
        s.text(cut(node.name, textW - measure(rankText) - 6), 0, 0, nodeState === 'locked' ? 'ink.faded' : 'ink');
        s.text(cut(node.does, room), 0, 11, 'ink');
        s.text(cut(needLine.text, room), 0, 22, needLine.c);
      },
    },
    // Take stands only where it can be pressed: on another's tree, on a full node or a locked one, it is not drawn.
    ...(canTake ? [button({ id: 'sk.take', x: right - 44, y: H - 20, w: 44, h: 16, ramp: 'stone', label: 'Take', onPress: () => v.onTake(chosenNode.id) })] : []),
  ];
  const at = placeWindow(ui, W, H, 21, 21);
  const top = tabbedSlab({
    id: 'sk.slab', x: at.x, y: at.y, w: W, h: H, ramp: 'stone', title: job.name, titleRoom: W - 166, edge: 'top',
    tabs: v.jobs.map((j) => ({ id: `sk.job.${j.key}`, icon: j.icon, name: j.name })), chosen: v.job,
    onTab: (i) => { ui.cue('tab'); v.onJob(i); }, kids,
  });
  const side = tabbedSlab({
    id: 'sk.crew', x: at.x, y: at.y, w: W, h: H, ramp: 'stone', edge: 'left',
    tabs: v.crew.map((m) => ({ id: `sk.who.${m.seat}`, icon: `head:${m.seat}`, name: `${m.name}${m.seat === v.crew[0].seat ? ' (you)' : ''}, level ${m.level}${m.online ? '' : ', away'}` })),
    chosen: v.whose, onTab: (i) => { ui.cue('tab'); v.onWhose(i); },
  });
  // The slab is drawn once: the side tabs stand 14 down so as to clear the first top tab, the chosen ones over the slab.
  const sideTabs = (side.kids ?? []).filter((k) => k.w !== W).map((k) => ({ ...k, y: k.y + 14 }));
  const sideChosen = sideTabs.pop()!;
  const topKids = top.kids ?? [];
  const body = topKids.findIndex((k) => k.w === W);
  const slab: Node = { ...top, kids: [...sideTabs, ...topKids.slice(0, body + 1), sideChosen, ...topKids.slice(body + 1)] };
  return {
    id: 'skills', x: 0, y: 0, w: ui.w, h: ui.h,
    paint: (s) => s.wash(0, 0, ui.w, ui.h, 'root.0', 2),
    kids: [slab],
    on: {
      key: (e: KeyEv) => {
        if (e.key === 'Escape') { v.onClose(); return true; }
        if (e.key === 'q' || e.key === 'Q') { v.onJob((v.job + v.jobs.length - 1) % v.jobs.length); return true; }
        if (e.key === 'e' || e.key === 'E') { v.onJob((v.job + 1) % v.jobs.length); return true; }
        if (e.key === 'Enter' && canTake) { v.onTake(chosenNode.id); return true; }
      },
    },
  };
};
const panned = new Set<string>();
const hovered: { id: string | null } = { id: null };

// The sample: oneself is Rook in seat 1; points spent here stay spent while the page is open.
const online = CREW;
const taken: Record<number, Record<string, number>> = Object.fromEntries(Object.entries(TAKEN).map(([k, v]) => [k, { ...v }]));
const st = { toSpend: TO_SPEND };

function sample(name: string, title: string, job: number, whose: number, chosen: string): NamedScreen {
  const s = { job, whose, chosen };
  return {
    name, title, world: true,
    build: (ui) => skillsScreen({
      jobs: JOBS, job: s.job, crew: online, whose: s.whose, taken: (seat) => taken[seat] ?? {}, toSpend: st.toSpend, chosen: s.chosen,
      onJob: (i) => { s.job = i; s.chosen = JOBS[i].nodes[0].id; ui.invalidate(); },
      onWhose: (i) => { s.whose = i; ui.invalidate(); },
      onChoose: (id) => { s.chosen = id; ui.invalidate(); },
      onTake: (id) => {
        const mine = (taken[online[0].seat] ??= {});
        const n = JOBS[s.job].nodes.find((x) => x.id === id)!;
        if (st.toSpend <= 0 || (mine[id] ?? 0) >= n.ranks || s.whose !== 0) { ui.cue('refuse'); return; }
        mine[id] = (mine[id] ?? 0) + 1;
        st.toSpend--;
        ui.cue('press');
        ui.invalidate();
      },
      onClose: () => go('hud'),
    }, ui),
  };
}

export const SCREENS: NamedScreen[] = [
  sample('skills', 'Skill tree: melee, your own', 0, 0, 'melee.3'),
  sample('skills-friend', 'Skill tree: another of the crew, read only', 4, 7, 'cutter.11'),
];
