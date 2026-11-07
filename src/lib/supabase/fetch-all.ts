/**
 * Supabase returns at most 1000 rows per request and does not report that it cut the result.
 * `fetchAll` reads a query page by page so that lists, totals and reports stay complete.
 *
 * Pass a function that builds the query for the given row range. The query MUST have a stable order
 * (add the primary key as the last `.order`), otherwise rows can be skipped or repeated between pages.
 *
 *   const rows = await fetchAll((from, to) =>
 *     supabase.from("students").select("*").eq("organization_id", id).order("id").range(from, to)
 *   );
 */
export const PAGE_SIZE = 1000;
const MAX_PAGES = 200; // hard stop: 200 000 rows

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

export async function fetchAll<T>(
  buildPage: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<{ data: T[]; error: { message: string } | null }> {
  const all: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await buildPage(from, from + PAGE_SIZE - 1);
    if (error) return { data: all, error };
    const rows = data || [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return { data: all, error: null };
}
