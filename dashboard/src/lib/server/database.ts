import { Pool, type QueryResultRow } from 'pg';

let pool: Pool | undefined;

export class DatabaseUnavailableError extends Error {
	public constructor() {
		super('DATABASE_URL is not configured.');
	}
}

function getPool(): Pool {
	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) throw new DatabaseUnavailableError();
	pool ??= new Pool({ connectionString });
	return pool;
}

export async function query<Row extends QueryResultRow>(text: string, values: readonly unknown[] = []): Promise<Row[]> {
	const result = await getPool().query<Row>(text, [...values]);
	return result.rows;
}