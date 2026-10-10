import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the network edges: Postgres and Voyage. retrieve() decides which
// searches run per mode; fusion itself is covered in retrieve.test.ts.
const query = vi.fn();
const embedQuery = vi.fn();
vi.mock("../src/db.js", () => ({ pool: { query }, toVector: (v: number[]) => `[${v.join(",")}]` }));
vi.mock("../src/embed.js", () => ({ embedQuery }));

const { retrieve } = await import("../src/retrieve.js");

const row = (id: number) => ({ id, source: `doc-${id}.md`, content: `chunk ${id}` });
const isVectorSql = (sql: string) => sql.includes("<=>");

beforeEach(() => {
  query.mockReset();
  embedQuery.mockReset();
  embedQuery.mockResolvedValue([0.1, 0.2]);
  query.mockImplementation(async (sql: string) => ({
    rows: isVectorSql(sql) ? [row(1), row(2)] : [row(2), row(3)],
  }));
});

describe("retrieve modes", () => {
  it("hybrid runs both searches and fuses them", async () => {
    const out = await retrieve("do you deliver?", "hybrid", "biz");
    expect(embedQuery).toHaveBeenCalledWith("do you deliver?");
    expect(query).toHaveBeenCalledTimes(2);
    expect(out.map((c) => c.id)).toEqual([2, 1, 3]);
    expect(out[0]).toMatchObject({ vectorRank: 2, keywordRank: 1 });
  });

  it("vector mode skips keyword search", async () => {
    const out = await retrieve("q", "vector", "biz");
    expect(query).toHaveBeenCalledTimes(1);
    expect(isVectorSql(query.mock.calls[0][0])).toBe(true);
    expect(out.every((c) => c.keywordRank === undefined)).toBe(true);
  });

  it("keyword mode skips embedding and vector search", async () => {
    const out = await retrieve("q", "keyword", "biz");
    expect(embedQuery).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledTimes(1);
    expect(isVectorSql(query.mock.calls[0][0])).toBe(false);
    expect(out.every((c) => c.vectorRank === undefined)).toBe(true);
  });

  it("scopes every search to the business id", async () => {
    await retrieve("q", "hybrid", "biz-42");
    for (const [, params] of query.mock.calls) expect(params[0]).toBe("biz-42");
  });
});
