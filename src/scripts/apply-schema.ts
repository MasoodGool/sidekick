import { readFileSync } from "node:fs";
import { pool } from "../db.js";
import { config } from "../config.js";

const sql = readFileSync("db/schema.sql", "utf8").replaceAll(
  "__EMBEDDING_DIM__",
  String(config.embeddingDim),
);
await pool.query(sql);
console.log(`Schema applied (embedding dim ${config.embeddingDim}).`);
await pool.end();
