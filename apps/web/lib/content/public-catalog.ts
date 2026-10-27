import { createClient } from '@/lib/supabase/server';

export type PublicCatalogAccess = 'free' | 'premium';

export interface PublicCatalogItem {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  accessLevel: PublicCatalogAccess;
  module: string;
  discipline: string;
  cycle: string;
  cycleSlug: string;
}

export interface PublicFreeSample extends PublicCatalogItem {
  blocks: { id: string; type: 'heading' | 'rich_text' | 'callout'; text: string }[];
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (Array.isArray(value)) return asRecord(value[0]);
  if (!value || typeof value !== 'object') return null;
  return value as UnknownRecord;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * The lessons query returns rows in whatever order Postgres/Supabase fetched
 * them in (paginated by id for stability), which has no relation to the
 * curriculum's actual structure. Cycles, disciplines, modules and lessons
 * each carry their own `position` column (see
 * supabase/migrations/20260922222512_content.sql) that encodes the intended
 * reading order. This sorts the raw nested rows by that real hierarchy
 * (cycle, then discipline, then module, then lesson) before they are mapped
 * into public catalog items, so any downstream grouping that merely
 * preserves input order (e.g. groupLessons) ends up presenting the
 * curriculum in its real sequence instead of first-appearance order.
 */
export function sortCatalogRowsByPosition(rows: unknown[]): unknown[] {
  function positionKey(value: unknown) {
    const row = asRecord(value);
    const moduleRelation = asRecord(row?.modules);
    const discipline = asRecord(moduleRelation?.disciplines);
    const cycle = asRecord(discipline?.cycles);
    return {
      cyclePosition: asNumber(cycle?.position),
      disciplinePosition: asNumber(discipline?.position),
      modulePosition: asNumber(moduleRelation?.position),
      lessonPosition: asNumber(row?.position),
    };
  }

  return [...rows].sort((a, b) => {
    const left = positionKey(a);
    const right = positionKey(b);
    return (
      left.cyclePosition - right.cyclePosition ||
      left.disciplinePosition - right.disciplinePosition ||
      left.modulePosition - right.modulePosition ||
      left.lessonPosition - right.lessonPosition
    );
  });
}

export function mapPublicCatalogRows(rows: unknown[]): PublicCatalogItem[] {
  return rows.flatMap((value) => {
    const row = asRecord(value);
    const moduleRelation = asRecord(row?.modules);
    const discipline = asRecord(moduleRelation?.disciplines);
    const cycle = asRecord(discipline?.cycles);

    const id = asString(row?.id);
    const title = asString(row?.title);
    const slug = asString(row?.slug);
    const accessLevel = row?.access_level;
    const moduleTitle = asString(moduleRelation?.title);
    const disciplineTitle = asString(discipline?.title);
    const cycleTitle = asString(cycle?.title);
    const cycleSlug = asString(cycle?.slug);

    if (
      !row ||
      !id ||
      !title ||
      !slug ||
      (accessLevel !== 'free' && accessLevel !== 'premium') ||
      !moduleTitle ||
      !disciplineTitle ||
      !cycleTitle ||
      !cycleSlug
    ) {
      return [];
    }

    return [
      {
        id,
        title,
        slug,
        summary: typeof row.summary === 'string' ? row.summary : null,
        accessLevel,
        module: moduleTitle,
        discipline: disciplineTitle,
        cycle: cycleTitle,
        cycleSlug,
      },
    ];
  });
}

export async function listPublicCatalog(): Promise<PublicCatalogItem[]> {
  const supabase = await createClient();
  const publishedBefore = new Date().toISOString();
  const pageSize = 1000;
  const rows: unknown[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
    .from('lessons')
    .select(
      'id, title, slug, summary, access_level, position, modules!inner(title, position, disciplines!inner(title, position, cycles!inner(title, slug, position)))',
    )
    .eq('status', 'published')
    .lte('published_at', publishedBefore)
    .is('deleted_at', null)
    .order('id', { ascending: true })
    .range(offset, offset + pageSize - 1);

    if (error) throw new Error('Não foi possível carregar o catálogo público.');
    rows.push(...((data ?? []) as unknown[]));
    if (!data || data.length < pageSize) break;
  }
  // Fetch order above is only for stable pagination; the curriculum's real
  // reading order (cycle -> discipline -> module -> lesson) comes from the
  // position columns, applied here before mapping to public items.
  return mapPublicCatalogRows(sortCatalogRowsByPosition(rows));
}

export async function getPublicFreeSample(id: string): Promise<PublicFreeSample | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lessons')
    .select('id, title, slug, summary, access_level, modules!inner(title, disciplines!inner(title, cycles!inner(title, slug))), lesson_blocks(id, block_type, content, position, deleted_at)')
    .eq('id', id)
    .eq('access_level', 'free')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw new Error('Não foi possível carregar a amostra.');
  const item = mapPublicCatalogRows(data ? [data] : [])[0];
  if (!item) return null;
  const row = data as UnknownRecord;
  const rawBlocks = Array.isArray(row.lesson_blocks) ? row.lesson_blocks : [];
  const blocks: { id: string; type: PublicFreeSample['blocks'][number]['type']; text: string; position: number }[] = rawBlocks.flatMap((raw) => {
    const block = asRecord(raw);
    const type = block?.block_type;
    const content = asRecord(block?.content);
    const blockText = asString(content?.text);
    const blockId = asString(block?.id);
    if (!blockId || !blockText || block?.deleted_at || (type !== 'heading' && type !== 'rich_text' && type !== 'callout')) return [];
    return [{ id: blockId, type, text: blockText, position: typeof block?.position === 'number' ? block.position : 0 }];
  });
  blocks.sort((a, b) => a.position - b.position);
  return { ...item, blocks: blocks.map(({ id: blockId, type, text: blockText }) => ({ id: blockId, type, text: blockText })) };
}
