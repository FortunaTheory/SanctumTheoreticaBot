import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is required to run migrations.');
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
const migrationDirectory = resolve(import.meta.dirname, '..', 'db', 'migrations');

await client.connect();
try {
	await client.query(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			file_name TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`);
	const applied = new Set((await client.query('SELECT file_name FROM schema_migrations')).rows.map((row) => row.file_name));
	const migrationFiles = (await readdir(migrationDirectory)).filter((file) => file.endsWith('.sql')).sort();
	for (const fileName of migrationFiles) {
		if (applied.has(fileName)) continue;
		await client.query('BEGIN');
		try {
			await client.query(await readFile(resolve(migrationDirectory, fileName), 'utf8'));
			await client.query('INSERT INTO schema_migrations (file_name) VALUES ($1)', [fileName]);
			await client.query('COMMIT');
			console.log(`Applied migration ${fileName}.`);
		} catch (error) {
			await client.query('ROLLBACK');
			throw error;
		}
	}
	console.log('Dashboard schema is ready.');
} finally {
	await client.end();
}