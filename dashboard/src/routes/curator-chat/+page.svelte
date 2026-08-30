<script lang="ts">
	import {
		ArrowLeft,
		Bot,
		Eye,
		Image,
		MessageSquare,
		Pencil,
		Plus,
		Radio,
		Save,
		Send,
		Trash2,
		UserCheck,
		UserRound
	} from '@lucide/svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Chat form state
	let targetMode = $state<'channel' | 'webhook'>('channel');
	let channelId = $state('');
	let webhookUrl = $state('');
	let selectedPersonaId = $state('');
	let content = $state('');
	let customName = $state('');

	// Active Persona derived
	let activePersona = $derived(
		data.personas.length > 0
			? data.personas.find((p: typeof data.personas[number]) => p.id === selectedPersonaId) ??
			  data.personas.find((p: typeof data.personas[number]) => p.isDefault) ??
			  data.personas[0]
			: undefined
	);

	let previewName = $derived(customName.trim() || activePersona?.name || 'Die Kuratorin');
	let previewAvatarSrc = $derived(
		activePersona?.imageKey ? `/media/avatar/${activePersona.imageKey}` : '/favicon-192.png'
	);

	// New preset form toggler
	let showNewPresetModal = $state(false);

	// Quick Markdown helpers
	function insertFormatting(prefix: string, suffix: string = '') {
		content = `${content}${prefix}Text${suffix}`;
	}
</script>

<svelte:head>
	<title>Schattenfunk | Sanctum Theoretica</title>
</svelte:head>

<main class="sanctum-page antialiased">
	<header class="sanctum-header">
		<a href="/" aria-label="Zur Übersicht" title="Zur Übersicht"><ArrowLeft size={18} /></a>
		<div class="brand"><span>ST</span><strong>Kuratorium / Schattenfunk</strong></div>
		<nav class="curator-tabs">
			<a href="/curator-chat" class="active"><MessageSquare size={14} /> Schattenfunk</a>
			<a href="/curator-card"><UserRound size={14} /> Profilkarte & Ritual</a>
		</nav>
	</header>

	<section class="shell sanctum-shell">
		<div class="heading">
			<div>
				<p class="eyebrow">Kuratorin Messenger · Roleplay</p>
				<h1>Schattenfunk</h1>
			</div>
			<span>Direktes Verfassen im Namen der Kuratorin</span>
		</div>

		{#if form?.error}
			<p class="feedback error">{form.error}</p>
		{/if}
		{#if form?.personaError}
			<p class="feedback error">{form.personaError}</p>
		{/if}
		{#if form?.sent}
			<p class="feedback success">Nachricht wurde erfolgreich im Zielkanal manifestiert.</p>
		{/if}
		{#if form?.personaCreated}
			<p class="feedback success">Neues Charakter-Preset wurde gespeichert.</p>
		{/if}
		{#if form?.personaUpdated}
			<p class="feedback success">Charakter-Preset wurde aktualisiert.</p>
		{/if}
		{#if form?.personaDeleted}
			<p class="feedback success">Charakter-Preset wurde entfernt.</p>
		{/if}

		{#if data.personas.length === 0}
			<p class="feedback warning">Keine Charakter-Presets geladen. Die Datenbank ist möglicherweise nicht erreichbar oder die Tabelle existiert noch nicht.</p>
		{/if}

		<div class="grid">
			<!-- Linke Spalte: Senden-Formular -->
			<div class="left-col">
				<form method="POST" action="?/sendMessage" enctype="multipart/form-data" class="editor">
					<div class="section-label"><MessageSquare size={16} /> Nachricht verfassen</div>

					<!-- Zielort-Auswahl -->
					<div class="mode-toggle">
						<label class="radio-label">
							<input type="radio" name="targetMode" value="channel" bind:group={targetMode} />
							<span>Discord-Channel-ID (Auto-Webhook)</span>
						</label>
						<label class="radio-label">
							<input type="radio" name="targetMode" value="webhook" bind:group={targetMode} />
							<span>Direkte Webhook-URL</span>
						</label>
					</div>

					{#if targetMode === 'channel'}
						<label>
							Discord-Channel-ID
							<input
								name="channelId"
								bind:value={channelId}
								inputmode="numeric"
								placeholder="z. B. 1344300455589046342"
								required
							/>
							<small>Der Bot erstellt bzw. nutzt automatisch einen Webhook in diesem Kanal.</small>
						</label>
					{:else}
						<label>
							Webhook-URL
							<input
								name="webhookUrl"
								bind:value={webhookUrl}
								type="url"
								placeholder="https://discord.com/api/webhooks/..."
								required
							/>
							<small>Direktes Senden an einen bestehenden Discord-Webhook.</small>
						</label>
					{/if}

					<!-- Persona / Charakter wählen -->
					<div class="persona-selector">
						<label>
							Absender-Identität (Preset)
							<select name="personaId" bind:value={selectedPersonaId}>
								<option value="">Standard: Die Kuratorin</option>
								{#each data.personas as p}
									<option value={p.id}>{p.name}{p.isDefault ? ' (Standard)' : ''}</option>
								{/each}
							</select>
						</label>
					</div>

					<label>
						Benutzerdefinierter Name (optionaler Override)
						<input name="customName" bind:value={customName} placeholder={previewName} maxlength="80" />
					</label>

					<!-- Nachrichtentext -->
					<label>
						Nachrichtentext
						<div class="formatting-bar">
							<button type="button" onclick={() => insertFormatting('*', '*')}><em>I</em></button>
							<button type="button" onclick={() => insertFormatting('**', '**')}><strong>B</strong></button>
							<button type="button" onclick={() => insertFormatting('> ')}>Zitat</button>
							<button type="button" onclick={() => insertFormatting('`', '`')}>Code</button>
						</div>
						<textarea
							name="content"
							bind:value={content}
							maxlength="2000"
							placeholder="Das Archiv flüstert durch die Schatten..."
							rows="5"
							required
						></textarea>
						<span class="char-count">{content.length} / 2000 Zeichen</span>
					</label>

					<!-- Bildanhang -->
					<label>
						Optionaler Bildanhang
						<input name="attachment" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
						<small>Wird direkt als Dateianhang mit der Nachricht gesendet.</small>
					</label>

					<button class="sanctum-button send-btn" type="submit" disabled={!content.trim()}>
						<Send size={16} /> Nachricht übermitteln
					</button>
				</form>

				<!-- Charakter-Presets Verwaltung -->
				<section class="presets-section">
					<div class="section-header">
						<div class="section-label"><UserCheck size={16} /> Gespeicherte Charakter-Presets</div>
						<button
							type="button"
							class="sanctum-button small-btn"
							onclick={() => (showNewPresetModal = !showNewPresetModal)}
						>
							<Plus size={14} /> Neues Preset
						</button>
					</div>

					{#if showNewPresetModal}
						<form method="POST" action="?/createPersona" enctype="multipart/form-data" class="new-preset-form">
							<label>
								Name der Figur
								<input name="name" placeholder="z. B. Archivarin Null" required maxlength="80" />
							</label>
							<label>
								Beschreibung / Notiz
								<input name="description" placeholder="Optionale interne Notiz" maxlength="300" />
							</label>
							<label>
								Avatar-Bild (Upload in Railway Bucket)
								<input name="image" type="file" accept="image/jpeg,image/png,image/webp" />
								<small>JPG, PNG oder WebP · max. 5 MB</small>
							</label>
							<label class="toggle">
								<input name="isDefault" type="checkbox" />
								<span>Als Standard-Persona festlegen</span>
							</label>
							<button type="submit" class="sanctum-button small-btn"><Save size={14} /> Preset anlegen</button>
						</form>
					{/if}

					<div class="preset-list">
						{#each data.personas as persona}
							<article class="preset-card">
								<div class="avatar-preview">
									{#if persona.imageKey}
										<img src="/media/avatar/{persona.imageKey}" alt={persona.name} />
									{:else}
										<div class="avatar-fallback"><Bot size={18} /></div>
									{/if}
								</div>
								<div class="preset-info">
									<strong>{persona.name} {#if persona.isDefault}<span class="default-badge">Standard</span>{/if}</strong>
									{#if persona.description}<small>{persona.description}</small>{/if}
								</div>
								<details class="edit-details">
									<summary><Pencil size={13} /></summary>
									<form method="POST" action="?/updatePersona" enctype="multipart/form-data" class="mini-form">
										<input type="hidden" name="id" value={persona.id} />
										<label>Name<input name="name" value={persona.name} required /></label>
										<label>Beschreibung<input name="description" value={persona.description ?? ''} /></label>
										<label>Neuer Avatar<input name="image" type="file" accept="image/jpeg,image/png,image/webp" /></label>
										<label class="toggle"><input name="isDefault" type="checkbox" checked={persona.isDefault} /> Standard</label>
										<button type="submit" class="sanctum-button small-btn"><Save size={13} /> Speichern</button>
									</form>
								</details>
								{#if !persona.isDefault}
									<form method="POST" action="?/deletePersona" class="delete-form">
										<input type="hidden" name="id" value={persona.id} />
										<button type="submit" title="Preset löschen"><Trash2 size={14} /></button>
									</form>
								{/if}
							</article>
						{/each}
					</div>
				</section>
			</div>

			<!-- Rechte Spalte: Live Discord Chat Message Vorschau -->
			<aside class="right-col">
				<div class="section-label"><Eye size={16} /> Discord Live-Vorschau</div>
				<div class="discord-chat-container">
					<div class="discord-message">
						<div class="discord-avatar">
							<img src={previewAvatarSrc} alt={previewName} />
						</div>
						<div class="discord-content">
							<div class="discord-header">
								<span class="discord-username">{previewName}</span>
								<span class="discord-badge">APP</span>
								<span class="discord-timestamp">heute um {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
							</div>
							<div class="discord-text">
								{#if content.trim()}
									{content}
								{:else}
									<span class="placeholder-text">Deine geschriebene Nachricht wird hier in Echtzeit als Discord-Nachricht simuliert...</span>
								{/if}
							</div>
						</div>
					</div>
				</div>

				<div class="info-box">
					<Radio size={16} />
					<div>
						<strong>Wie funktioniert der Schattenfunk?</strong>
						<p>
							Über Webhooks postet der Bot mit individuellem Namen und Avatar, ohne dass eine neue Discord-Anwendung benötigt wird. Der Avatar wird direkt aus eurem Railway S3-Bucket für Discord bereitgestellt.
						</p>
					</div>
				</div>
			</aside>
		</div>
	</section>
</main>

<style>
	.curator-tabs {
		display: flex;
		gap: 0.5rem;
		margin-left: auto;
	}
	.curator-tabs a {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.45rem 0.8rem;
		font: 0.72rem var(--font-ui);
		letter-spacing: 0.05em;
		text-transform: uppercase;
		text-decoration: none;
		color: var(--ink-muted);
		border: 1px solid transparent;
		border-radius: 0.25rem;
		transition: all 0.16s ease;
	}
	.curator-tabs a:hover {
		color: var(--ink);
		border-color: var(--line);
	}
	.curator-tabs a.active {
		color: #fff;
		background: var(--surface-deep);
		border-color: var(--line);
	}

	.grid {
		display: grid;
		grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.95fr);
		gap: 2.5rem;
		margin-top: 2rem;
	}

	.left-col,
	.right-col {
		display: grid;
		gap: 1.5rem;
		align-content: start;
	}

	.editor,
	.presets-section {
		display: grid;
		gap: 1rem;
		padding: 1.35rem;
		border: 1px solid var(--line);
		background: var(--surface-raised);
		border-radius: 0.35rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.mode-toggle {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		padding: 0.5rem;
		background: var(--surface-sunken);
		border: 1px solid var(--line);
		border-radius: 0.25rem;
	}
	.radio-label {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		cursor: pointer;
	}
	.radio-label input {
		width: auto;
		cursor: pointer;
	}

	.formatting-bar {
		display: flex;
		gap: 0.35rem;
		margin-bottom: 0.25rem;
	}
	.formatting-bar button {
		padding: 0.25rem 0.5rem;
		background: var(--surface-sunken);
		color: var(--ink);
		border: 1px solid var(--line);
		border-radius: 0.2rem;
		cursor: pointer;
		font-size: 0.75rem;
	}
	.formatting-bar button:hover {
		background: var(--surface-deep);
		color: #fff;
	}

	.char-count {
		justify-self: end;
		font: 0.7rem var(--font-ui);
		color: var(--ink-muted);
	}

	.small-btn {
		padding: 0.4rem 0.65rem;
		font-size: 0.68rem;
	}

	.new-preset-form {
		display: grid;
		gap: 0.8rem;
		padding: 1rem;
		background: var(--surface-sunken);
		border: 1px dashed var(--line);
		border-radius: 0.25rem;
		margin-top: 0.5rem;
	}

	.preset-list {
		display: grid;
		gap: 0.65rem;
		margin-top: 0.5rem;
	}
	.preset-card {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		padding: 0.65rem 0.85rem;
		background: var(--surface-sunken);
		border: 1px solid var(--line);
		border-radius: 0.25rem;
		position: relative;
	}
	.avatar-preview img {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		object-fit: cover;
		border: 1px solid var(--line);
	}
	.avatar-fallback {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--surface-deep);
		display: grid;
		place-items: center;
		color: var(--ink-soft);
	}
	.preset-info {
		display: grid;
		gap: 0.15rem;
		flex: 1;
	}
	.preset-info strong {
		font-size: 0.88rem;
	}
	.default-badge {
		font-size: 0.65rem;
		padding: 0.1rem 0.35rem;
		background: var(--surface-deep);
		color: var(--ink-soft);
		border-radius: 0.2rem;
		margin-left: 0.4rem;
	}
	.edit-details summary {
		cursor: pointer;
		padding: 0.3rem;
		color: var(--ink-muted);
	}
	.mini-form {
		position: absolute;
		top: 100%;
		right: 0;
		z-index: 20;
		width: 280px;
		background: var(--surface-raised);
		border: 1px solid var(--line);
		padding: 1rem;
		border-radius: 0.35rem;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
		display: grid;
		gap: 0.65rem;
	}
	.delete-form button {
		background: none;
		border: none;
		color: var(--danger);
		cursor: pointer;
		padding: 0.3rem;
	}

	/* Discord Chat Message Preview Box */
	.discord-chat-container {
		background: #313338;
		border-radius: 0.35rem;
		padding: 1rem;
		border-left: 4px solid var(--ink-soft);
		font-family: 'gg sans', 'Noto Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
	}
	.discord-message {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
	}
	.discord-avatar img {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		object-fit: cover;
		background: #1e1f22;
	}
	.discord-content {
		display: grid;
		gap: 0.25rem;
		flex: 1;
	}
	.discord-header {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}
	.discord-username {
		font-weight: 600;
		font-size: 0.95rem;
		color: #f2f3f5;
	}
	.discord-badge {
		background: #5865f2;
		color: #ffffff;
		font-size: 0.625rem;
		font-weight: 700;
		padding: 0.05rem 0.275rem;
		border-radius: 0.1875rem;
		line-height: 1;
		display: inline-flex;
		align-items: center;
	}
	.discord-timestamp {
		font-size: 0.72rem;
		color: #949ba4;
	}
	.discord-text {
		color: #dbdee1;
		font-size: 0.93rem;
		line-height: 1.375;
		white-space: pre-wrap;
		word-break: break-word;
	}
	.placeholder-text {
		color: #6d6f78;
		font-style: italic;
	}

	.info-box {
		display: flex;
		gap: 0.75rem;
		padding: 1rem;
		border: 1px solid var(--line);
		background: var(--surface-raised);
		border-radius: 0.35rem;
		font-size: 0.85rem;
		color: var(--ink-muted);
		line-height: 1.45;
	}
	.info-box strong {
		color: var(--ink);
	}
	.info-box p {
		margin: 0.25rem 0 0;
	}

	.feedback {
		padding: 0.75rem;
		border-radius: 0.25rem;
		margin-top: 1rem;
		font-size: 0.88rem;
	}
	.error {
		color: #ffc0d2;
		border-left: 3px solid var(--danger);
		background: rgba(255, 107, 158, 0.08);
	}
	.success {
		color: var(--success);
		border-left: 3px solid var(--success);
		background: rgba(143, 224, 173, 0.08);
	}
	.warning {
		color: #ffb84d;
		border-left: 3px solid #ffb84d;
		background: rgba(255, 184, 77, 0.08);
	}

	@media (max-width: 860px) {
		.grid {
			grid-template-columns: 1fr;
		}
		.mode-toggle {
			grid-template-columns: 1fr;
		}
	}
</style>
