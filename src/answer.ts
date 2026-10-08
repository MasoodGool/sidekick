import { retrieve, type RetrievalMode, type RetrievedChunk } from "./retrieve.js";
import { generate, type GenerationResult } from "./generate.js";
import { recordTrace } from "./obs/trace.js";

export interface AnswerResult {
  answer: string;
  refused: boolean;
  sources: { n: number; source: string; chunkId: number }[];
  chunks: RetrievedChunk[];
  gen: GenerationResult;
  costUsd: number | null;
  timings: { retrievalMs: number; generationMs: number; totalMs: number };
}

/** The whole RAG pipeline: retrieve -> generate -> trace. */
export async function answer(
  question: string,
  opts: { mode?: RetrievalMode; model?: string; trace?: boolean } = {},
): Promise<AnswerResult> {
  const t0 = performance.now();
  const chunks = await retrieve(question, opts.mode ?? "hybrid");
  const t1 = performance.now();
  const gen = await generate(question, chunks, opts.model);
  const t2 = performance.now();

  const timings = {
    retrievalMs: Math.round(t1 - t0),
    generationMs: Math.round(t2 - t1),
    totalMs: Math.round(t2 - t0),
  };
  const costUsd =
    opts.trace === false
      ? null
      : await recordTrace({ question, retrievedIds: chunks.map((c) => c.id), gen, ...timings });

  return {
    answer: gen.answer,
    refused: gen.refused,
    sources: chunks.map((c, i) => ({ n: i + 1, source: c.source, chunkId: c.id })),
    chunks,
    gen,
    costUsd,
    timings,
  };
}
