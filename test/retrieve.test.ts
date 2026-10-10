import { describe, expect, it } from "vitest";
import { fuseRrf } from "../src/retrieve.js";

const row = (id: number) => ({ id, source: `doc-${id}.md`, content: `chunk ${id}` });
const rows = (...ids: number[]) => ids.map(row);

describe("fuseRrf", () => {
  it("scores a single list as 1 / (k + rank) and keeps its order", () => {
    const out = fuseRrf({ vector: rows(10, 20, 30) }, 60, 5);
    expect(out.map((c) => c.id)).toEqual([10, 20, 30]);
    expect(out.map((c) => c.score)).toEqual([1 / 61, 1 / 62, 1 / 63]);
    expect(out.map((c) => c.vectorRank)).toEqual([1, 2, 3]);
    expect(out.every((c) => c.keywordRank === undefined)).toBe(true);
  });

  it("sums scores for a chunk found by both searches and records both ranks", () => {
    const out = fuseRrf({ vector: rows(1, 2), keyword: rows(3, 2) }, 60, 5);
    const two = out.find((c) => c.id === 2)!;
    expect(two.score).toBeCloseTo(1 / 62 + 1 / 62, 12);
    expect(two.vectorRank).toBe(2);
    expect(two.keywordRank).toBe(2);
    expect(out[0].id).toBe(2); // agreement beats a single first place
  });

  it("ranks by rank, not by which list a chunk came from", () => {
    const out = fuseRrf({ vector: rows(1, 2, 3), keyword: rows(4, 5, 6) }, 60, 6);
    // Equal ranks tie; the sort is stable, so vector results come first.
    expect(out.map((c) => c.id)).toEqual([1, 4, 2, 5, 3, 6]);
  });

  it("truncates to topK", () => {
    expect(fuseRrf({ vector: rows(1, 2, 3, 4), keyword: rows(5, 6, 7) }, 60, 3)).toHaveLength(3);
  });

  it("applies the rrfK constant to every rank", () => {
    const lists = { vector: rows(1, 2), keyword: rows(2) };
    const k = 10;
    const out = fuseRrf(lists, k, 2);
    expect(out.map((c) => c.id)).toEqual([2, 1]);
    expect(out[0].score).toBeCloseTo(1 / (k + 2) + 1 / (k + 1), 12);
    expect(out[1].score).toBeCloseTo(1 / (k + 1), 12);
  });

  it("returns nothing when both lists are empty or absent", () => {
    expect(fuseRrf({}, 60, 5)).toEqual([]);
    expect(fuseRrf({ vector: [], keyword: [] }, 60, 5)).toEqual([]);
  });

  it("does not mutate the input rows", () => {
    const vector = rows(1);
    fuseRrf({ vector, keyword: rows(1) }, 60, 5);
    expect(vector[0]).toEqual(row(1));
  });
});
