import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name} (see .env.example)`);
  return v;
}
const num = (name: string): number | null =>
  process.env[name] ? Number(process.env[name]) : null;

export const config = {
  anthropicKey: () => required("ANTHROPIC_API_KEY"),
  generationModel: process.env.GENERATION_MODEL ?? "claude-haiku-5-5",
  judgeModel: process.env.JUDGE_MODEL ?? "claude-sonnet-5-5",
  voyageKey: () => required("VOYAGE_API_KEY"),
  embeddingModel: process.env.EMBEDDING_MODEL ?? "voyage-3.5",
  embeddingDim: Number(process.env.EMBEDDING_DIM ?? 1024),
  databaseUrl: process.env.DATABASE_URL ?? "postgres://sidekick:sidekick@localhost:5433/sidekick",
  businessId: process.env.BUSINESS_ID ?? "sample-bakery",
  dataDir: process.env.DATA_DIR ?? "data/sample-bakery",
  port: Number(process.env.PORT ?? 3000),
  pricing: {
    input: num("PRICE_INPUT_PER_MTOK"),
    output: num("PRICE_OUTPUT_PER_MTOK"),
    cacheRead: num("PRICE_CACHE_READ_PER_MTOK"),
    cacheWrite: num("PRICE_CACHE_WRITE_PER_MTOK"),
  },
  retrieval: {
    topK: 5,          // chunks passed to the model
    candidateK: 20,   // candidates fetched from each search before fusion
    rrfK: 60,         // reciprocal rank fusion constant
  },
};
