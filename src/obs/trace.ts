import { pool } from "../db.js";
import { config } from "../config.js";
import type { GenerationResult } from "../generate.js";

/** Cost in USD from token usage. Returns null until PRICE_* env vars are set. */
export function costUsd(
  usage: GenerationResult["usage"],
  p: typeof config.pricing = config.pricing,
): number | null {
  if (p.input == null || p.output == null) return null;
  const perTok = (rate: number | null) => (rate ?? 0) / 1_000_000;
  return (
    usage.input_tokens * perTok(p.input) +
    usage.output_tokens * perTok(p.output) +
    usage.cache_read_input_tokens * perTok(p.cacheRead) +
    usage.cache_creation_input_tokens * perTok(p.cacheWrite)
  );
}

export interface TraceRecord {
  question: string;
  retrievedIds: number[];
  gen: GenerationResult;
  retrievalMs: number;
  generationMs: number;
  totalMs: number;
}

/**
 * Persist one request's trace. This table is the source of truth for the
 * latency/cost numbers on the README.
 * SUNDAY TODO: also send the trace to Langfuse (follow its current TypeScript
 * SDK docs): one trace per request, a "retrieval" span with the chunk ids and a
 * "generation" observation with model, usage and cost.
 */
export async function recordTrace(t: TraceRecord): Promise<number | null> {
  const cost = costUsd(t.gen.usage);
  await pool.query(
    `INSERT INTO traces (business_id, question, retrieved_ids, answer, refused, model,
       input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd,
       retrieval_ms, generation_ms, total_ms)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      config.businessId, t.question, t.retrievedIds, t.gen.answer, t.gen.refused, t.gen.model,
      t.gen.usage.input_tokens, t.gen.usage.output_tokens,
      t.gen.usage.cache_read_input_tokens, t.gen.usage.cache_creation_input_tokens,
      cost, t.retrievalMs, t.generationMs, t.totalMs,
    ],
  );
  return cost;
}
