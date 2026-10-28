export type ParentPointer = { id: string; parentId: string | null };

/**
 * Detects cycles in a parent-pointer graph (e.g. "a structure should not be its own ancestor").
 * Returns one array of node ids per distinct cycle found; an empty array means the graph is a
 * valid forest. A parentId that does not appear in the given node set is treated as a root
 * (there is nothing wrong with a node whose parent lives outside the set being checked).
 */
export function detectCycles(nodes: ParentPointer[]): string[][] {
  const parentOf = new Map<string, string | null>();
  for (const node of nodes) {
    parentOf.set(node.id, node.parentId);
  }

  const state = new Map<string, 'visiting' | 'done'>();
  const cycles: string[][] = [];
  const reportedCycleKeys = new Set<string>();

  for (const node of nodes) {
    if (state.get(node.id) === 'done') continue;

    const path: string[] = [];
    let current: string | null = node.id;

    while (current !== null && parentOf.has(current)) {
      const status = state.get(current);

      if (status === 'visiting') {
        const cycleStart = path.indexOf(current);
        const cycle = cycleStart === -1 ? [current] : path.slice(cycleStart);
        const key = [...cycle].sort().join('|');
        if (!reportedCycleKeys.has(key)) {
          reportedCycleKeys.add(key);
          cycles.push(cycle);
        }
        break;
      }

      if (status === 'done') break;

      state.set(current, 'visiting');
      path.push(current);
      current = parentOf.get(current) ?? null;
    }

    for (const id of path) {
      state.set(id, 'done');
    }
  }

  return cycles;
}
