import { describe, expect, it } from "vitest";
import { fetchAll, PAGE_SIZE } from "@/lib/supabase/fetch-all";

function source(total: number) {
  const rows = Array.from({ length: total }, (_, i) => ({ id: i }));
  const calls: Array<[number, number]> = [];
  const build = async (from: number, to: number) => {
    calls.push([from, to]);
    return { data: rows.slice(from, to + 1), error: null };
  };
  return { build, calls };
}

describe("fetchAll", () => {
  it("returns everything beyond the 1000 row limit of one request", async () => {
    const { build, calls } = source(2500);
    const { data, error } = await fetchAll(build);
    expect(error).toBeNull();
    expect(data).toHaveLength(2500);
    expect(data[2499]).toEqual({ id: 2499 });
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("needs one request when the result is smaller than a page", async () => {
    const { build, calls } = source(3);
    const { data } = await fetchAll(build);
    expect(data).toHaveLength(3);
    expect(calls).toHaveLength(1);
  });

  it("asks once more when the result is exactly a full page, then stops on the empty page", async () => {
    const { build, calls } = source(PAGE_SIZE);
    const { data } = await fetchAll(build);
    expect(data).toHaveLength(PAGE_SIZE);
    expect(calls).toHaveLength(2);
  });

  it("returns the error together with the rows read so far", async () => {
    let n = 0;
    const { data, error } = await fetchAll(async () => {
      n++;
      if (n === 1) return { data: Array.from({ length: PAGE_SIZE }, (_, i) => ({ id: i })), error: null };
      return { data: null, error: { message: "boom" } };
    });
    expect(error?.message).toBe("boom");
    expect(data).toHaveLength(PAGE_SIZE);
  });
});
