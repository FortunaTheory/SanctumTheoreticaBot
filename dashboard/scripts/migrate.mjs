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
	const migrationFiles = (await readdir(migrationDirectory)).filter((file) => file.endsWith('.sql')).sort();
	for (const fileName of migrationFiles) {
		await client.query(await readFile(resolve(migrationDirectory, fileName), 'utf8'));
	}
	console.log('Dashboard schema is ready.');
} finally {
	await client.end();
}