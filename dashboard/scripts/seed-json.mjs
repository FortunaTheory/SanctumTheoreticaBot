import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is required to seed content.');
}

const projectRoot = resolve(import.meta.dirname, '..', '..');
const readJson = async (fileName) => JSON.parse(await readFile(resolve(projectRoot, 'data', fileName), 'utf8'));
const [oracles, fragments, profileData] = await Promise.all([
	readJson('oracle.json'),
	readJson('fragments.json'),
	readJson('profiles.json')
]);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
	await client.query('BEGIN');
	const existing = await client.query(`
		SELECT
			(SELECT count(*)::int FROM oracle_entries) AS oracles,
			(SELECT count(*)::int FROM fragment_entries) AS fragments,
			(SELECT count(*)::int FROM profile_cards) AS profiles
	`);
	const counts = existing.rows[0];
	if (counts.oracles || counts.fragments || counts.profiles) {
		throw new Error('The catalog already contains content. Seeding is intentionally skipped to prevent duplicates.');
	}

	for (const oracle of oracles) {
		await client.query(
			'INSERT INTO oracle_entries (aspect, text, image_key, updated_by) VALUES ($1, $2, $3, $4)',
			[oracle.aspect, oracle.text, oracle.image ?? null, 'json-migration']
		);
	}
	for (const fragment of fragments) {
		await client.query(
			'INSERT INTO fragment_entries (title, text, image_key, updated_by) VALUES ($1, $2, $3, $4)',
			[fragment.title, fragment.text, fragment.image ?? null, 'json-migration']
		);
	}
	const cards = [{ ...profileData.default, isDefault: true }, ...profileData.roles.map((card) => ({ ...card, isDefault: false }))];
	for (const card of cards) {
		await client.query(
			`INSERT INTO profile_cards (role_id, priority, author, title, status, note, footer, color, image_key, is_default, updated_by)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
			[card.roleId ?? null, card.priority ?? 0, card.author, card.title, card.status, card.note, card.footer, card.color, card.image ?? null, card.isDefault, 'json-migration']
		);
	}
	await client.query('COMMIT');
	console.log(`Seeded ${oracles.length} oracles, ${fragments.length} fragments, and ${cards.length} profile cards.`);
} catch (error) {
	await client.query('ROLLBACK');
	throw error;
} finally {
	await client.end();
}