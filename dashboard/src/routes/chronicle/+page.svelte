<script lang="ts">
	import { ArrowLeft, History, RotateCcw } from '@lucide/svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const labels = { oracle: 'Orakel', fragment: 'Fragment', profile: 'Profilkarte' } as const;
	const actions = { create: 'angelegt', update: 'bearbeitet', delete: 'gelöscht', restore: 'wiederhergestellt' } as const;
</script>

<svelte:head><title>Chronik | Sanctum Theoretica</title></svelte:head>

<main>
	<header><a href="/" aria-label="Zur Übersicht" title="Zur Übersicht"><ArrowLeft size={18} /></a><div class="brand"><span>ST</span><strong>Kuratorium / Chronik</strong></div></header>
	<section class="shell"><div class="heading"><div><p class="eyebrow">Archivprotokoll</p><h1>Chronik</h1></div><span>{data.revisions.length} Revisionen</span></div>
		{#if form?.error}<p class="error">{form.error}</p>{/if}{#if form?.success}<p class="success">Der frühere Zustand wurde wiederhergestellt.</p>{/if}
		<div class="timeline">{#if data.revisions.length === 0}<p>Die Chronik ist noch leer.</p>{:else}{#each data.revisions as revision}<article><div class="mark"></div><div><p><strong>{labels[revision.resourceType]}</strong> {actions[revision.action]} von <b>{revision.authorName}</b></p><small>{new Date(revision.createdAt).toLocaleString('de-DE')}</small></div>{#if revision.action !== 'create' && revision.previousValue}<form method="POST" action="?/restore"><input type="hidden" name="revisionId" value={revision.id} /><button type="submit" title="Früheren Zustand wiederherstellen"><RotateCcw size={15} /> Wiederherstellen</button></form>{/if}</article>{/each}{/if}</div>
	</section>
</main>

<style>
	main { min-height: 100vh; background: linear-gradient(118deg, rgba(79, 50, 83, .13), transparent 42%), repeating-linear-gradient(0deg, rgba(58, 37, 61, .045) 0 1px, transparent 1px 5px); } header { height: 66px; display: flex; gap: 1rem; align-items: center; padding: 0 5vw; border-bottom: 1px solid var(--line); } header a { display: grid; place-items: center; color: var(--ink); }.brand { display: flex; gap: .6rem; align-items: center; font: .78rem var(--font-ui); letter-spacing: .08em; text-transform: uppercase; }.brand span { display: grid; width: 30px; aspect-ratio: 1; place-items: center; color: #fff; background: var(--surface-deep); font-family: var(--font-display); letter-spacing: 0; }.shell { width: min(900px, 90vw); margin: 4rem auto 7rem; }.heading { display: flex; align-items: end; justify-content: space-between; border-bottom: 1px solid var(--line); padding-bottom: 1.5rem; }.eyebrow, .heading > span { margin: 0; color: var(--ink-soft); font: .72rem var(--font-ui); letter-spacing: .1em; text-transform: uppercase; }h1 { margin: .5rem 0 0; font-size: clamp(3rem, 6vw, 5rem); font-weight: 400; line-height: .9; }.timeline { display: grid; gap: 1px; margin-top: 2rem; border: 1px solid var(--line); background: var(--line); }.timeline article { display: grid; grid-template-columns: 12px 1fr auto; gap: 1rem; align-items: center; padding: 1rem; background: var(--surface-raised); }.mark { width: 8px; height: 8px; border-radius: 50%; background: var(--ink-soft); }.timeline p { margin: 0; }.timeline small { color: var(--ink-muted); font: .72rem var(--font-ui); }.timeline button { display: inline-flex; gap: .4rem; align-items: center; border: 1px solid var(--line); padding: .5rem .65rem; color: var(--ink); background: transparent; cursor: pointer; font: .7rem var(--font-ui); }.error, .success { margin-top: 1.5rem; padding: .8rem; }.error { color: var(--danger); border-left: 3px solid var(--danger); }.success { color: #326049; border-left: 3px solid #326049; }@media (max-width: 600px) { .timeline article { grid-template-columns: 10px 1fr; }.timeline form { grid-column: 2; } }
</style>