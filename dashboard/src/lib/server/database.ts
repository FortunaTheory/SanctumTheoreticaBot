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

type TransactionQuery = <Row extends QueryResultRow>(text: string, values?: readonly unknown[]) => Promise<Row[]>;

export async function transaction<Result>(operation: (execute: TransactionQuery) => Promise<Result>): Promise<Result> {
	const client = await getPool().connect();
	const execute: TransactionQuery = async <Row extends QueryResultRow>(text: string, values: readonly unknown[] = []) => {
		const result = await client.query<Row>(text, [...values]);
		return result.rows;
	};
	try {
		await client.query('BEGIN');
		const result = await operation(execute);
		await client.query('COMMIT');
		return result;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}