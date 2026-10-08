import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pool, toVector } from "./db.js";
import { config } from "./config.js";
import { chunkText } from "./chunk.js";
import { embed } from "./embed.js";

/** Ingest every .md/.txt file in DATA_DIR: chunk -> embed -> store. Re-runnable. */
async function main() {
  const files = readdirSync(config.dataDir).filter((f) => /\.(md|txt)$/.test(f));
  if (!files.length) throw new Error(`No .md/.txt files in ${config.dataDir}`);

  for (const file of files) {
    const text = readFileSync(join(config.dataDir, file), "utf8");
    const title = text.match(/^#\s+(.+)$/m)?.[1] ?? file;
    const chunks = chunkText(text);
    const vectors = await embed(chunks, "document");

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `INSERT INTO documents (business_id, source, title) VALUES ($1, $2, $3)
         ON CONFLICT (business_id, source) DO UPDATE SET title = EXCLUDED.title
         RETURNING id`,
        [config.businessId, file, title],
      );
      const docId = rows[0].id;
      await client.query("DELETE FROM chunks WHERE document_id = $1", [docId]);
      for (let i = 0; i < chunks.length; i++) {
        await client.query(
          `INSERT INTO chunks (document_id, business_id, chunk_index, content, embedding)
           VALUES ($1, $2, $3, $4, $5::vector)`,
          [docId, config.businessId, i, chunks[i], toVector(vectors[i])],
        );
      }
      await client.query("COMMIT");
      console.log(`${file}: ${chunks.length} chunks`);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
