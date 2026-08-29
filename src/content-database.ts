import { Pool, type QueryResultRow } from "pg";
import { config } from "./config.js";

let pool: Pool | undefined;

function getPool(): Pool {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL ist nicht konfiguriert.");
  }
  pool ??= new Pool({
    connectionString: config.databaseUrl,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000
  });
  return pool;
}

export function usesContentDatabase(): boolean {
  return Boolean(config.databaseUrl);
}

export async function queryContent<Row extends QueryResultRow>(sql: string, values: readonly unknown[] = []): Promise<Row[]> {
  const result = await getPool().query<Row>(sql, [...values]);
  return result.rows;
}

export async function closeContentDatabase(): Promise<void> {
  const activePool = pool;
  pool = undefined;
  if (activePool) await activePool.end();
}