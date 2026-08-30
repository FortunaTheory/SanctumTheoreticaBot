<script lang="ts">
	import { ArrowLeft, ArrowUpRight, MessageSquare, UserRound } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Die Kuratorin | Sanctum Theoretica</title>
</svelte:head>

<main class="sanctum-page antialiased">
	<header class="sanctum-header">
		<a href="/" aria-label="Zur Übersicht" title="Zur Übersicht"><ArrowLeft size={18} /></a>
		<div class="brand"><span>ST</span><strong>Kuratorium / Die Kuratorin</strong></div>
	</header>

	<section class="shell sanctum-shell">
		<div class="heading">
			<div>
				<p class="eyebrow">Einzelakte · Owner-Only</p>
				<h1>Die Kuratorin</h1>
			</div>
			<span>Werkzeuge und Rituale</span>
		</div>

		<div class="tools">
			<a class="tool" href="/curator-chat">
				<div class="tool-icon"><MessageSquare size={26} /></div>
				<div class="tool-content">
					<p class="eyebrow">Schattenfunk</p>
					<h2>Nachrichten senden</h2>
					<p>Verfasse Discord-Nachrichten im Namen der Kuratorin oder einer gespeicherten Identität.</p>
				</div>
				<div class="tool-meta"><strong>{data.personas.length}</strong><span>Personas</span></div>
				<ArrowUpRight class="tool-arrow" size={20} />
			</a>

			<a class="tool" href="/curator-card">
				<div class="tool-icon"><UserRound size={26} /></div>
				<div class="tool-content">
					<p class="eyebrow">Profilkarte & Ritual</p>
					<h2>Die Kuratorin-Karte</h2>
					<p>Pflege die unabhängige Profilkarte und hinterlasse sie im festgelegten Discord-Kanal.</p>
				</div>
				<div class="tool-meta status"><strong>{data.card?.status ?? 'Nicht geladen'}</strong><span>Archivstatus</span></div>
				<ArrowUpRight class="tool-arrow" size={20} />
			</a>
		</div>
	</section>
</main>

<style>
	main {
		min-height: 100vh;
		background: linear-gradient(118deg, rgba(101, 48, 139, 0.2), transparent 42%),
			repeating-linear-gradient(0deg, rgba(160, 97, 208, 0.07) 0 1px, transparent 1px 5px);
	}
	header {
		height: 66px;
		display: flex;
		gap: 1rem;
		align-items: center;
		padding: 0 5vw;
		border-bottom: 1px solid var(--line);
	}
	header > a {
		display: grid;
		place-items: center;
		color: var(--ink);
	}
	.brand {
		display: flex;
		gap: 0.6rem;
		align-items: center;
		font: 0.78rem var(--font-ui);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.brand span {
		display: grid;
		width: 30px;
		aspect-ratio: 1;
		place-items: center;
		color: #fff;
		background: var(--surface-deep);
		font-family: var(--font-display);
		letter-spacing: 0;
	}
	.shell {
		width: min(1180px, 90vw);
		margin: 4rem auto 7rem;
	}
	.heading {
		display: flex;
		align-items: end;
		justify-content: space-between;
		border-bottom: 1px solid var(--line);
		padding-bottom: 1.5rem;
	}
	.eyebrow,
	.heading > span {
		margin: 0;
		color: var(--ink-soft);
		font: 0.72rem var(--font-ui);
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	h1 {
		margin: 0.5rem 0 0;
		font-size: clamp(3rem, 6vw, 5rem);
		font-weight: 400;
		line-height: 0.9;
	}
	.tools {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1px;
		margin-top: 3rem;
		border: 1px solid var(--line);
		background: var(--line);
	}
	.tool {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		column-gap: 1rem;
		align-items: start;
		min-height: 280px;
		padding: 1.5rem;
		background: var(--surface-raised);
		color: var(--ink);
		text-decoration: none;
		transition: background 0.16s ease;
	}
	.tool:hover {
		background: var(--surface-sunken);
	}
	.tool-icon {
		display: grid;
		width: 52px;
		aspect-ratio: 1;
		place-items: center;
		color: #b36ce8;
		border: 1px solid var(--line);
		background: var(--surface-deep);
	}
	.tool-content {
		display: grid;
		gap: 0.75rem;
	}
	.tool-content h2 {
		margin: 0;
		font-size: 1.8rem;
		font-weight: 400;
		line-height: 1;
	}
	.tool-content > p:not(.eyebrow) {
		margin: 0;
		max-width: 28rem;
		color: var(--ink-muted);
		line-height: 1.5;
	}
	.tool-meta {
		display: grid;
		gap: 0.2rem;
		justify-items: end;
		text-align: right;
	}
	.tool-meta strong {
		font-size: 1.7rem;
		font-weight: 400;
		line-height: 1;
	}
	.tool-meta span {
		color: var(--ink-muted);
		font: 0.68rem var(--font-ui);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.tool-meta.status strong {
		max-width: 9rem;
		font-size: 1rem;
		line-height: 1.25;
	}
	:global(.tool-arrow) {
		grid-column: 3;
		align-self: end;
		justify-self: end;
		color: var(--ink-soft);
	}
	.tool:hover :global(.tool-arrow) {
		color: var(--ink);
	}
	@media (max-width: 760px) {
		.shell {
			margin-top: 2.5rem;
		}
		.heading > span {
			display: none;
		}
		.tools {
			grid-template-columns: 1fr;
		}
		.tool {
			min-height: 220px;
		}
	}
	@media (max-width: 480px) {
		.tool {
			grid-template-columns: auto minmax(0, 1fr);
		}
		.tool-meta {
			grid-column: 2;
			justify-items: start;
			text-align: left;
		}
		:global(.tool-arrow) {
			grid-column: 2;
		}
	}
</style>
