// The skill tree (section 6, Skill tree): a stone slab with a tab for each job along its top and a tab for each of the
// crew online down its left, a field of nodes on the ground tile that pans, and "Take".
import { rightX } from '../font/measure';
import { cut } from '../font/wrap';
import type { KeyEv, Node, Screen, Tip } from '../node';
import type { NodeState } from '../art/tree';
import { button } from '../parts/button';
import { tabbedSlab } from '../parts/tabs';
import { LATTICE, NODE, tree } from '../parts/tree';
import { CREW, type CrewMember } from '../sample/crew';
import { JOBS, type Job, type SkillNode, TAKEN, TO_SPEND } from '../sample/skills';
import { firstFocus, go, placeWindow } from './books-common';
import type { NamedScreen } from './index';

export interface SkillsView {
  jobs: Job[];
  job: number;
  /** The crew online; the first is oneself. */
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

const W = 260, H = 206;
const SHAPE_SAYS: Record<string, string> = { square: 'a step anyone may take', cut: 'its own skill', spiked: 'a mark it ends in' };

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
  const node = job.nodes.find((n) => n.id === v.chosen) ?? job.nodes[0];
  const nodeState = stateOf(job, node, taken);
  const rank = taken[node.id] ?? 0;
  const canTake = me && v.toSpend > 0 && nodeState !== 'locked' && rank < node.ranks;
  firstFocus(ui, 'skills', null);

  // The field is centred on the last node earned in this job the first time it is shown.
  const fieldW = 242, fieldH = 158;
  const panId = `sk.field.${job.key}.${owner.seat}.pan`;
  const earned = job.nodes.filter((n) => (taken[n.id] ?? 0) > 0);
  const focusNode = earned[earned.length - 1] ?? job.nodes[0];
  if (!panned.has(panId)) {
    panned.add(panId);
    const cx = 8 + focusNode.col * LATTICE + NODE / 2, cy = 8 + focusNode.row * LATTICE + NODE / 2;
    const maxX = Math.max(0, Math.max(...job.nodes.map((n) => n.col * LATTICE + NODE + 16)) - fieldW);
    const maxY = Math.max(0, Math.max(...job.nodes.map((n) => n.row * LATTICE + NODE + 8 + 16)) - fieldH);
    const clamp = (x: number, m: number) => Math.min(m, Math.max(0, Math.round(x)));
    ui.setScroll(panId, clamp(cx - fieldW / 2, maxX) + clamp(cy - fieldH / 2, maxY) * 100000);
  }

  const tip = (n: SkillNode, st: NodeState) => (): Tip => ({
    lines: [
      { text: n.name, c: st === 'locked' ? 'root.4' : 'salt' },
      { text: `${job.name}, ${SHAPE_SAYS[n.shape]}`, c: 'root.4' },
      { text: n.does, c: 'salt' },
      { text: `Rank ${taken[n.id] ?? 0} of ${n.ranks}`, c: 'root.4' },
      ...(st === 'locked' ? [{ text: 'Take a step joined to it first', c: 'blood.lt' as const }] : []),
    ],
  });
  const field = tree({
    id: `sk.field.${job.key}.${owner.seat}`, x: 8, y: 18, w: 244, h: 160, host: 'stone', ui, chosen: node.id,
    nodes: job.nodes.map((n) => {
      const st = stateOf(job, n, taken);
      return { id: n.id, col: n.col, row: n.row, shape: n.shape, state: st, icon: n.icon, ranks: n.ranks > 1 ? [taken[n.id] ?? 0, n.ranks] as [number, number] : undefined, tip: tip(n, st) };
    }),
    links: job.links,
    onChoose: (id) => { if (id === v.chosen && me) v.onTake(id); else v.onChoose(id); },
  });

  const spend = me ? `${v.toSpend} to spend` : `${owner.name}'s, to read`;
  const kids: Node[] = [
    field,
    { x: 110, y: 6, w: 143, h: 10, paint: (s) => { const t = cut(spend, 142); s.text(t, rightX(t, 252 - 110), 0, me ? 'growth.dk' : 'ink.faded'); } },
    { x: 8, y: 184, w: 196, h: 10, paint: (s) => { s.text(cut(`${node.name}, ${rank} of ${node.ranks}`, 196), 0, 0, nodeState === 'locked' ? 'ink.faded' : 'ink'); } },
    button({ id: 'sk.take', x: 208, y: 182, w: 44, h: 16, label: 'Take', disabled: !canTake, onPress: () => v.onTake(node.id) }),
  ];
  const at = placeWindow(ui, W, H, 21, 21);
  const top = tabbedSlab({
    id: 'sk.slab', x: at.x, y: at.y, w: W, h: H, ramp: 'stone', title: job.name, titleRoom: 150, edge: 'top',
    tabs: v.jobs.map((j) => ({ id: `sk.job.${j.key}`, icon: j.icon, name: j.name })), chosen: v.job,
    onTab: (i) => { ui.cue('tab'); v.onJob(i); }, kids,
  });
  const side = tabbedSlab({
    id: 'sk.crew', x: at.x, y: at.y, w: W, h: H, ramp: 'stone', edge: 'left',
    tabs: v.crew.map((m) => ({ id: `sk.who.${m.seat}`, icon: `head:${m.seat}`, name: m.seat === v.crew[0].seat ? `${m.name} (you)` : m.name })),
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
        if (e.key === 'Enter' && canTake) { v.onTake(node.id); return true; }
      },
    },
  };
};
const panned = new Set<string>();

// The sample: oneself is Rook in seat 1; points spent here stay spent while the page is open.
const online = CREW.filter((m) => m.online);
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
  sample('skills-friend', 'Skill tree: another of the crew, read only', 4, 6, 'cutter.11'),
];
