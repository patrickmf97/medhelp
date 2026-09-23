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
  const items: PublicCatalogItem[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
    .from('lessons')
    .select(
      'id, title, slug, summary, access_level, modules!inner(title, disciplines!inner(title, cycles!inner(title, slug)))',
    )
    .eq('status', 'published')
    .lte('published_at', publishedBefore)
    .is('deleted_at', null)
    .order('published_at', { ascending: false })
    .order('id', { ascending: true })
    .range(offset, offset + pageSize - 1);

    if (error) throw new Error('Não foi possível carregar o catálogo público.');
    items.push(...mapPublicCatalogRows((data ?? []) as unknown[]));
    if (!data || data.length < pageSize) break;
  }
  return items;
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
