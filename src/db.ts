import pg from "pg";
import { config } from "./config.js";

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

/** pgvector accepts the literal "[0.1,0.2,...]" cast to ::vector. */
export const toVector = (v: number[]): string => `[${v.join(",")}]`;
