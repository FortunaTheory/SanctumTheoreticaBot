import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required to seed whispers.');

const seedDirectory = resolve(import.meta.dirname, '..', 'db', 'seed');
const readJson = async (fileName) => JSON.parse(await readFile(resolve(seedDirectory, fileName), 'utf8'));
const [entries, targets] = await Promise.all([readJson('whispers.json'), readJson('whisper-targets.json')]);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

await client.connect();
try {
	await client.query('BEGIN');
	const counts = (await client.query('SELECT (SELECT count(*)::int FROM whisper_entries) AS entries, (SELECT count(*)::int FROM whisper_targets) AS targets')).rows[0];
	if (counts.entries || counts.targets) {
		throw new Error('Whisper data already exists. Seeding is skipped to prevent duplicates.');
	}
	for (const entry of entries) {
		const values = typeof entry === 'string' ? { text: entry } : entry;
		await client.query('INSERT INTO whisper_entries (text, image_key, updated_by) VALUES ($1, $2, $3)', [values.text ?? null, values.image ?? null, 'json-migration']);
	}
	for (const userId of targets) {
		await client.query('INSERT INTO whisper_targets (user_id, updated_by) VALUES ($1, $2)', [userId, 'json-migration']);
	}
	await client.query('COMMIT');
	console.log(`Seeded ${entries.length} whispers and ${targets.length} whisper targets.`);
} catch (error) {
	await client.query('ROLLBACK');
	throw error;
} finally {
	await client.end();
}