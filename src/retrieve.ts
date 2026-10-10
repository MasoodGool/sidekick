import { pool, toVector } from "./db.js";
import { config } from "./config.js";
import { embedQuery } from "./embed.js";

export interface RetrievedChunk {
  id: number;
  source: string;
  content: string;
  score: number;      // fused RRF score
  vectorRank?: number;
  keywordRank?: number;
}

export type RetrievalMode = "hybrid" | "vector" | "keyword";

type Row = { id: number; source: string; content: string };

async function vectorSearch(businessId: string, queryVec: number[], k: number) {
  const { rows } = await pool.query(
    `SELECT c.id, d.source, c.content
       FROM chunks c JOIN documents d ON d.id = c.document_id
      WHERE c.business_id = $1
      ORDER BY c.embedding <=> $2::vector
      LIMIT $3`,
    [businessId, toVector(queryVec), k],
  );
  return rows as Row[];
}

async function keywordSearch(businessId: string, question: string, k: number) {
  const { rows } = await pool.query(
    `SELECT c.id, d.source, c.content
       FROM chunks c JOIN documents d ON d.id = c.document_id
      WHERE c.business_id = $1 AND c.tsv @@ websearch_to_tsquery('english', $2)
      ORDER BY ts_rank_cd(c.tsv, websearch_to_tsquery('english', $2)) DESC
      LIMIT $3`,
    [businessId, question, k],
  );
  return rows as Row[];
}

/**
 * Reciprocal Rank Fusion:
 * score(chunk) = sum over result lists of 1 / (rrfK + rank).
 * Robust because it uses ranks, not the incomparable raw scores.
 */
export function fuseRrf(
  lists: { vector?: Row[]; keyword?: Row[] },
  rrfK: number,
  topK: number,
): RetrievedChunk[] {
  const byId = new Map<number, RetrievedChunk>();

  const add = (rows: Row[], kind: "vector" | "keyword") =>
    rows.forEach((r, i) => {
      const rank = i + 1;
      const existing = byId.get(r.id) ?? { ...r, score: 0 };
      existing.score += 1 / (rrfK + rank);
      if (kind === "vector") existing.vectorRank = rank;
      else existing.keywordRank = rank;
      byId.set(r.id, existing);
    });

  if (lists.vector) add(lists.vector, "vector");
  if (lists.keyword) add(lists.keyword, "keyword");

  return [...byId.values()].sort((a, b) => b.score - a.score).slice(0, topK);
}

/** Hybrid retrieval: vector + keyword candidates, fused with RRF. */
export async function retrieve(
  question: string,
  mode: RetrievalMode = "hybrid",
  businessId = config.businessId,
): Promise<RetrievedChunk[]> {
  const { candidateK, topK, rrfK } = config.retrieval;
  const vector = mode !== "keyword"
    ? await vectorSearch(businessId, await embedQuery(question), candidateK)
    : undefined;
  const keyword = mode !== "vector" ? await keywordSearch(businessId, question, candidateK) : undefined;
  return fuseRrf({ vector, keyword }, rrfK, topK);
}
