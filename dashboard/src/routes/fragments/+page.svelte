<script lang="ts">
	import { ArrowLeft, Eye, FileStack, Pencil, Plus, Save, Trash2 } from '@lucide/svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let title = $state('');
	let text = $state('');
</script>

<svelte:head><title>Fragmente | Sanctum Theoretica</title></svelte:head>

<main class="sanctum-page antialiased">
	<header class="sanctum-header"><a href="/" aria-label="Zur Übersicht" title="Zur Übersicht"><ArrowLeft size={18} /></a><div class="brand"><span>ST</span><strong>Kuratorium / Fragmente</strong></div></header>
	<section class="shell sanctum-shell">
		<div class="heading"><div><p class="eyebrow">Katalogpflege</p><h1>Fragmente</h1></div><span>{data.fragments.length} Einträge</span></div>
		<div class="grid">
			<form method="POST" action="?/create" enctype="multipart/form-data" class="editor">
				<div class="section-label"><Plus size={16} /> Neues Fragment</div>
				<label>Titel<input name="title" bind:value={title} maxlength="100" placeholder="Das ungeöffnete Register" /></label>
				<label>Archivtext<textarea name="text" bind:value={text} maxlength="800" placeholder="Ein Register ohne Seitenzahl ..."></textarea><span class="count">{text.length} / 800</span></label>
				<label>Visual <input name="image" type="file" accept="image/jpeg,image/png,image/webp" /><span class="hint">Optional · JPG, PNG oder WebP · max. 5 MB</span></label>
				{#if form?.error}<p class="error">{form.error}</p>{/if}
				{#if form?.success}<p class="success">Das Fragment wurde in die Chronik eingetragen.</p>{/if}
				<button type="submit"><FileStack size={16} /> Ins Archiv aufnehmen</button>
			</form>
			<aside class="preview"><div class="section-label"><Eye size={16} /> Discord-Vorschau</div><div class="embed"><div class="embed-title">&#9672; ARCHIV-FRAGMENT · {title || 'Unbenannter Eintrag'}</div><div class="embed-body"><blockquote>{text || 'Die Vorschau wartet auf einen Archivtext.'}</blockquote></div><div class="embed-footer">Archiv der verlorenen Dinge · gerade eben</div></div></aside>
		</div>
		<section class="entries"><div class="section-label"><FileStack size={16} /> Vorhandene Fragmente</div>{#if data.fragments.length === 0}<p class="empty">Noch keine Datenbankeinträge.</p>{:else}<div class="entry-list">{#each data.fragments as fragment}<article><strong>{fragment.title}</strong><p>{fragment.text}</p><details><summary><Pencil size={14} /> Bearbeiten</summary><form method="POST" action="?/update" enctype="multipart/form-data" class="edit-form"><input name="id" type="hidden" value={fragment.id} /><label>Titel<input name="title" value={fragment.title} maxlength="100" /></label><label>Archivtext<textarea name="text" maxlength="800">{fragment.text}</textarea></label><label>Neues Visual<input name="image" type="file" accept="image/jpeg,image/png,image/webp" /></label><button type="submit"><Save size={14} /> Aktualisieren</button></form></details><form method="POST" action="?/delete" class="delete-form"><input name="id" type="hidden" value={fragment.id} /><button type="submit" aria-label="Fragment löschen" title="Fragment löschen"><Trash2 size={15} /></button></form></article>{/each}</div>{/if}</section>
	</section>
</main>

<style>
	main { min-height: 100vh; background: linear-gradient(118deg, rgba(79, 50, 83, .13), transparent 42%), repeating-linear-gradient(0deg, rgba(58, 37, 61, .045) 0 1px, transparent 1px 5px); }
	header { height: 66px; display: flex; gap: 1rem; align-items: center; padding: 0 5vw; border-bottom: 1px solid var(--line); } header a { display: grid; place-items: center; color: var(--ink); }.brand { display: flex; gap: .6rem; align-items: center; font: .78rem var(--font-ui); letter-spacing: .08em; text-transform: uppercase; }.brand span { display: grid; width: 30px; aspect-ratio: 1; place-items: center; color: #fff; background: var(--surface-deep); font-family: var(--font-display); letter-spacing: 0; }
	.shell { width: min(1180px, 90vw); margin: 4rem auto 7rem; }.heading { display: flex; align-items: end; justify-content: space-between; border-bottom: 1px solid var(--line); padding-bottom: 1.5rem; }.eyebrow, .section-label, .heading > span { margin: 0; color: var(--ink-soft); font: .72rem var(--font-ui); letter-spacing: .1em; text-transform: uppercase; } h1 { margin: .5rem 0 0; font-size: clamp(3rem, 6vw, 5rem); font-weight: 400; line-height: .9; }
	.grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, .8fr); gap: 3rem; margin-top: 3rem; }.editor, .preview, .entries { background: var(--surface-raised); border: 1px solid var(--line); }.editor { display: grid; gap: 1.25rem; padding: 1.5rem; }.section-label { display: flex; gap: .5rem; align-items: center; color: var(--ink); } label { display: grid; gap: .5rem; font-size: .95rem; } input, textarea { width: 100%; border: 1px solid var(--line); border-radius: 0; padding: .75rem; color: var(--ink); background: #f8f5f7; font: inherit; } textarea { min-height: 180px; resize: vertical; line-height: 1.5; }.count, .hint { justify-self: end; color: var(--ink-muted); font: .7rem var(--font-ui); }button { display: inline-flex; justify-content: center; gap: .55rem; align-items: center; width: max-content; border: 0; padding: .8rem 1rem; color: white; background: var(--surface-deep); cursor: pointer; font: .75rem var(--font-ui); letter-spacing: .04em; text-transform: uppercase; }.error { margin: 0; color: var(--danger); }.success { margin: 0; color: #326049; }
	.preview { padding: 1.5rem; }.embed { margin-top: 1.25rem; border-left: 4px solid #705477; padding: 1rem; color: #dbdee1; background: #2b2d31; font-family: Arial, sans-serif; }.embed-title { font-weight: 700; font-size: .95rem; }.embed-body { margin-top: .8rem; font-size: .86rem; line-height: 1.5; }.embed-body blockquote { margin: .8rem 0; padding-left: .7rem; border-left: 2px solid #4e5058; font-style: italic; }.embed-footer { color: #949ba4; font-size: .72rem; }
	.entries { margin-top: 3rem; padding: 1.5rem; }.entry-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1px; margin-top: 1.2rem; background: var(--line); border: 1px solid var(--line); }.entry-list article { position: relative; min-height: 130px; padding: 1rem; background: #f8f5f7; }.entry-list p { margin: .75rem 0 0; line-height: 1.5; }.empty { color: var(--ink-muted); }details { margin-top: 1rem; } summary { display: inline-flex; gap: .35rem; align-items: center; cursor: pointer; font: .72rem var(--font-ui); }.edit-form { display: grid; gap: .7rem; margin-top: .8rem; }.edit-form label { font-size: .78rem; }.edit-form input, .edit-form textarea { width: 100%; padding: .5rem; border: 1px solid var(--line); background: #fff; font: inherit; }.edit-form textarea { min-height: 100px; }.edit-form button { padding: .55rem .7rem; }.delete-form { position: absolute; top: .8rem; right: .8rem; }.delete-form button { padding: .35rem; color: var(--danger); background: transparent; }@media (max-width: 760px) { .grid { grid-template-columns: 1fr; gap: 1rem; }.shell { margin-top: 2.5rem; } }
</style>