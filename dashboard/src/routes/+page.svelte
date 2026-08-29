<script lang="ts">
	import { BookOpen, Eye, FileStack, KeyRound, ScrollText, ShieldCheck, UserRound } from '@lucide/svelte';
	import { page } from '$app/state';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const authMessages: Record<string, string> = {
		state: 'Die Anmeldung konnte nicht verifiziert werden. Bitte erneut versuchen.',
		code: 'Discord hat keinen Anmeldecode übergeben.',
		denied: 'Dieser Discord-Account besitzt keinen Zugang zum Archiv.'
	};
</script>

<svelte:head>
	<title>Sanctum Theoretica | Kuratorium</title>
	<meta name="description" content="Interne Redaktion für das Sanctum-Theoretica-Archiv." />
</svelte:head>

<main>
	<header>
		<div class="brand"><span>ST</span><strong>Sanctum Theoretica</strong></div>
		{#if data.user}
			<div class="identity">
				<UserRound size={16} />
				<span>{data.user.username}</span>
				<form method="POST" action="/auth/logout"><button type="submit" aria-label="Abmelden" title="Abmelden"><KeyRound size={16} /></button></form>
			</div>
		{/if}
	</header>

	{#if !data.user}
		<section class="gate">
			<p class="eyebrow">Internes Kuratorium</p>
			<h1>Das Archiv<br />wartet auf eine Hand.</h1>
			<p>Orakel, Fragmente und Akten werden hier bewahrt. Der Zugang wird durch Discord und die Archivrollen geprüft.</p>
			{#if page.url.searchParams.get('auth')}
				<p class="notice">{authMessages[page.url.searchParams.get('auth') ?? ''] ?? 'Die Anmeldung ist fehlgeschlagen.'}</p>
			{/if}
			<a class="login" href="/auth/login"><ShieldCheck size={18} /> Mit Discord eintreten</a>
		</section>
	{:else if !data.databaseReady}
		<section class="gate">
			<p class="eyebrow">Einrichtung erforderlich</p>
			<h1>Die Chronik<br />hat noch kein Fundament.</h1>
			<p>Setze <code>DATABASE_URL</code> und führe anschließend <code>npm run migrate</code> im Dashboard-Service aus.</p>
		</section>
	{:else}
		<section class="workspace">
			<div class="intro">
				<p class="eyebrow">Redaktionsübersicht</p>
				<h1>Das Kuratorium</h1>
				<p>Die Datenbank ist verbunden. Die ersten Inhalte warten auf ihre Überführung aus dem bestehenden Archiv.</p>
			</div>
			<div class="cards">
				<article><ScrollText size={22} /><strong>{data.catalog?.oracles.length ?? 0}</strong><span>Orakel</span></article>
				<article><FileStack size={22} /><strong>{data.catalog?.fragments.length ?? 0}</strong><span>Fragmente</span></article>
				<article><BookOpen size={22} /><strong>{data.catalog?.profiles.length ?? 0}</strong><span>Profilkarten</span></article>
			</div>
			<section class="next"><Eye size={18} /><div><strong>Redaktion bereit</strong><span>Orakel, Fragmente, Profilkarten und Whisper können direkt gepflegt werden.</span><nav><a href="/oracles">Orakel</a><a href="/fragments">Fragmente</a><a href="/profiles">Profilkarten</a><a href="/whispers">Whisper</a><a href="/chronicle">Chronik</a></nav></div></section>
		</section>
	{/if}
</main>

<style>
	:global(*) { box-sizing: border-box; }
	:global(body) { margin: 0; color: var(--ink); background: var(--surface); font-family: var(--font-display); }
	main { min-height: 100vh; background: linear-gradient(118deg, rgba(79, 50, 83, .13), transparent 42%), repeating-linear-gradient(0deg, rgba(58, 37, 61, .045) 0 1px, transparent 1px 5px); }
	header { height: 66px; display: flex; align-items: center; justify-content: space-between; padding: 0 5vw; border-bottom: 1px solid rgba(52, 34, 58, .2); }
	.brand, .identity { display: flex; gap: .6rem; align-items: center; font-family: var(--font-ui); font-size: .78rem; letter-spacing: .08em; text-transform: uppercase; }
	.brand span { display: grid; width: 30px; aspect-ratio: 1; place-items: center; color: #fff; background: var(--surface-deep); font-family: var(--font-display); letter-spacing: 0; }
	.identity form { display: inline; }
	.identity button { display: grid; place-items: center; border: 0; padding: .35rem; color: #35213f; background: none; cursor: pointer; }
	.gate, .workspace { width: min(920px, 90vw); margin: clamp(6rem, 15vh, 11rem) auto; }
	.gate { max-width: 630px; margin-left: max(8vw, calc((100vw - 920px) / 2)); }
	.eyebrow { margin: 0 0 .8rem; color: var(--ink-soft); font: .72rem var(--font-ui); letter-spacing: .12em; text-transform: uppercase; }
	h1 { margin: 0; font-size: clamp(3rem, 7vw, 6.2rem); font-weight: 400; line-height: .9; letter-spacing: 0; }
	.gate > p:not(.eyebrow):not(.notice), .intro > p:not(.eyebrow) { max-width: 540px; margin: 2rem 0; font-size: 1.12rem; line-height: 1.6; }
	.login { display: inline-flex; gap: .7rem; align-items: center; padding: .85rem 1rem; color: #fff; background: var(--surface-deep); text-decoration: none; font: .82rem var(--font-ui); letter-spacing: .05em; }
	.notice { padding: .8rem; border-left: 3px solid var(--danger); background: rgba(154, 48, 73, .08); }
	.workspace { margin-top: clamp(3rem, 10vh, 7rem); }
	.intro h1 { font-size: clamp(2.8rem, 5vw, 4.4rem); }
	.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; margin-top: 3rem; border: 1px solid rgba(52, 34, 58, .23); background: rgba(52, 34, 58, .23); }
	article { display: grid; gap: .7rem; min-height: 150px; padding: 1.3rem; background: #eee9ed; }
	article :global(svg) { color: #76517a; }
	article strong { align-self: end; font-size: 2.4rem; font-weight: 400; }
	article span { font: .75rem ui-monospace, monospace; letter-spacing: .09em; text-transform: uppercase; }
	.next { display: flex; gap: .8rem; align-items: flex-start; max-width: 570px; margin-top: 2rem; padding: 1rem 0; border-top: 1px solid rgba(52, 34, 58, .25); font-size: .94rem; line-height: 1.5; }
	.next :global(svg) { color: #76517a; }
	.next div { display: grid; gap: .1rem; }
	.next span { color: var(--ink-muted); }
	.next nav { display: flex; flex-wrap: wrap; gap: .8rem; margin-top: .6rem; }.next a { width: max-content; color: var(--ink); font: .75rem var(--font-ui); }
	code { font: .85em ui-monospace, monospace; }
	@media (max-width: 600px) { header { padding: 0 5vw; } .identity span { display: none; } .cards { grid-template-columns: 1fr; } }
</style>
