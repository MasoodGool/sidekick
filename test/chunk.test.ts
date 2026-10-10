import { describe, expect, it } from "vitest";
import { chunkText } from "../src/chunk.js";

const para = (ch: string, len: number) => ch.repeat(len);

describe("chunkText", () => {
  it("returns no chunks for empty or whitespace-only text", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("  \n\n \n ")).toEqual([]);
  });

  it("keeps short text as one chunk, normalising paragraph breaks", () => {
    expect(chunkText("  Hello.  \n\n\n  World.\n")).toEqual(["Hello.\n\nWorld."]);
  });

  it("splits on paragraph boundaries and carries nothing when overlap is 0", () => {
    // maxTokens 10 => 40 chars; overlap 0 so boundaries are exact.
    const text = [para("a", 30), para("b", 30), para("c", 30)].join("\n\n");
    expect(chunkText(text, 10, 0)).toEqual([para("a", 30), para("b", 30), para("c", 30)]);
  });

  it("starts each chunk with the tail of the previous one (overlap)", () => {
    const text = [para("a", 30), para("b", 30)].join("\n\n");
    const [first, second] = chunkText(text, 10, 2); // overlap 2 tokens => 8 chars
    expect(first).toBe(para("a", 30));
    expect(second).toBe(para("a", 8) + "\n\n" + para("b", 30));
  });

  it("hard-splits a single oversized paragraph with overlap and loses nothing", () => {
    const text = Array.from({ length: 500 }, (_, i) => String(i % 10)).join("");
    const chunks = chunkText(text, 10, 2); // 40-char chunks, 8-char overlap
    expect(chunks.length).toBeGreaterThan(1);
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].startsWith(chunks[i - 1].slice(-8))).toBe(true);
    }
    const rebuilt = chunks[0] + chunks.slice(1).map((c) => c.slice(8)).join("");
    expect(rebuilt).toBe(text);
  });

  it("never emits a chunk longer than 1.5x the char budget", () => {
    const paras = Array.from({ length: 40 }, (_, i) => para(String.fromCharCode(97 + (i % 26)), 10 + ((i * 37) % 90)));
    for (const c of chunkText(paras.join("\n\n"), 25, 5)) {
      expect(c.length).toBeLessThanOrEqual(25 * 4 * 1.5);
    }
  });

  it("includes every paragraph in at least one chunk", () => {
    const paras = Array.from({ length: 30 }, (_, i) => `Paragraph ${i}: ${"x".repeat(20 + i)}`);
    const chunks = chunkText(paras.join("\n\n"), 30, 5);
    for (const p of paras) expect(chunks.some((c) => c.includes(p))).toBe(true);
  });
});
