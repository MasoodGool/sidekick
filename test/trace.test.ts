import { describe, expect, it } from "vitest";
import { costUsd } from "../src/obs/trace.js";

const usage = (u: Partial<Record<"input_tokens" | "output_tokens" | "cache_read_input_tokens" | "cache_creation_input_tokens", number>>) => ({
  input_tokens: 0,
  output_tokens: 0,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
  ...u,
});

// Fixture rates in USD per million tokens; not tied to any real model's pricing.
const pricing = { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 };

describe("costUsd", () => {
  it("returns null until input and output prices are configured", () => {
    const u = usage({ input_tokens: 1000 });
    expect(costUsd(u, { ...pricing, input: null })).toBeNull();
    expect(costUsd(u, { ...pricing, output: null })).toBeNull();
  });

  it("prices each token type per million tokens", () => {
    expect(costUsd(usage({ input_tokens: 1_000_000 }), pricing)).toBeCloseTo(1, 12);
    expect(costUsd(usage({ output_tokens: 1_000_000 }), pricing)).toBeCloseTo(5, 12);
    expect(costUsd(usage({ cache_read_input_tokens: 1_000_000 }), pricing)).toBeCloseTo(0.1, 12);
    expect(costUsd(usage({ cache_creation_input_tokens: 1_000_000 }), pricing)).toBeCloseTo(1.25, 12);
  });

  it("sums all four token types", () => {
    const u = usage({ input_tokens: 2000, output_tokens: 300, cache_read_input_tokens: 10_000, cache_creation_input_tokens: 4000 });
    // 2000*1 + 300*5 + 10000*0.1 + 4000*1.25 = 2000 + 1500 + 1000 + 5000 = 9500 per 1M
    expect(costUsd(u, pricing)).toBeCloseTo(0.0095, 12);
  });

  it("treats unset cache prices as free rather than failing", () => {
    const u = usage({ input_tokens: 1_000_000, cache_read_input_tokens: 1_000_000, cache_creation_input_tokens: 1_000_000 });
    expect(costUsd(u, { ...pricing, cacheRead: null, cacheWrite: null })).toBeCloseTo(1, 12);
  });

  it("is zero for zero usage", () => {
    expect(costUsd(usage({}), pricing)).toBe(0);
  });
});
