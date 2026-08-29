import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is required to run migrations.');
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
const migrationPath = resolve(import.meta.dirname, '..', 'db', 'migrations', '001_content.sql');

await client.connect();
try {
	await client.query(await readFile(migrationPath, 'utf8'));
	console.log('Dashboard schema is ready.');
} finally {
	await client.end();
}