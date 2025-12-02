<script lang="ts">
	import { enhance } from '$app/forms';
	import { Calendar, Clock, Users, Link, Plus, X, Eye, Trash2, Video, FileText } from 'lucide-svelte';
	import { Alert, AdminPage, EmptyState } from '$lib';
	import { formatDate } from '$lib/utils/formatters';

	let { data, form } = $props();

	let showCreateForm = $state(false);

	function formatTime(date: Date) {
		return new Intl.DateTimeFormat('pt-BR', {
			timeStyle: 'short'
		}).format(new Date(date));
	}

	function getEventUrl(slug: string) {
		return `/evento/${slug}`;
	}
</script>

<svelte:head>
	<title>Gerenciar Eventos</title>
</svelte:head>

<AdminPage icon={Calendar} title="Eventos">
	{#snippet actions()}
		<button
			class="btn preset-filled-primary-500 flex items-center gap-2"
			onclick={() => (showCreateForm = !showCreateForm)}
		>
			{#if showCreateForm}
				<X class="w-4 h-4" />
				Cancelar
			{:else}
				<Plus class="w-4 h-4" />
				Novo Evento
			{/if}
		</button>
	{/snippet}

	{#if form?.error}
		<Alert variant="error" message={form.error} class="mb-6" />
	{/if}

	{#if form?.success && form?.slug}
		<Alert variant="success" class="mb-6">
			<p>
				Evento criado com sucesso! Link público:
				<a href={getEventUrl(form.slug)} class="underline font-bold">
					{window.location.origin}{getEventUrl(form.slug)}
				</a>
			</p>
		</Alert>
	{/if}

	{#if showCreateForm}
		<div class="card bg-surface-100-900 p-6 mb-8 border border-surface-200-800">
			<h2 class="h3 mb-4 flex items-center gap-2">
				<Plus class="w-5 h-5 text-primary-400" />
				Criar Novo Evento
			</h2>
			<form method="POST" action="?/create" use:enhance class="space-y-4">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<label class="label">
						<span class="flex items-center gap-2 mb-1">
							<FileText class="w-4 h-4 text-surface-500" />
							Nome do Evento *
						</span>
						<input
							type="text"
							name="name"
							class="input"
							placeholder="Ex: Workshop de SvelteKit"
							required
						/>
					</label>

					<label class="label">
						<span class="flex items-center gap-2 mb-1">
							<Calendar class="w-4 h-4 text-surface-500" />
							Data *
						</span>
						<input type="date" name="date" class="input" required />
					</label>

					<label class="label">
						<span class="flex items-center gap-2 mb-1">
							<Clock class="w-4 h-4 text-surface-500" />
							Hora Início *
						</span>
						<input type="time" name="time" class="input" required />
					</label>

					<label class="label">
						<span class="flex items-center gap-2 mb-1">
							<Clock class="w-4 h-4 text-surface-500" />
							Hora Fim *
						</span>
						<input type="time" name="endTime" class="input" required />
					</label>

					<label class="label">
						<span class="flex items-center gap-2 mb-1">
							<Video class="w-4 h-4 text-surface-500" />
							Link do Meet *
						</span>
						<input
							type="url"
							name="meetLink"
							class="input"
							placeholder="https://meet.google.com/..."
							required
						/>
					</label>

					<label class="label">
						<span class="flex items-center gap-2 mb-1">
							<Users class="w-4 h-4 text-surface-500" />
							Pessoas Esperadas
						</span>
						<input
							type="number"
							name="expectedAttendees"
							class="input"
							placeholder="100"
							min="0"
						/>
					</label>
				</div>

				{#if data.categories.length > 0}
					<div class="label">
						<span>Categorias</span>
						<div class="flex flex-wrap gap-2 mt-2">
							{#each data.categories as category}
								<label class="flex items-center gap-2 cursor-pointer">
									<input
										type="checkbox"
										name="categoryIds"
										value={category.id}
										class="checkbox"
									/>
									<span
										class="badge text-white text-xs"
										style="background-color: {category.color}"
									>
										{category.name}
									</span>
								</label>
							{/each}
						</div>
					</div>
				{/if}

				<label class="label">
					<span>Descrição</span>
					<textarea
						name="description"
						class="textarea"
						rows="3"
						placeholder="Descrição do evento..."
					></textarea>
				</label>

				<button type="submit" class="btn preset-filled-primary-500 flex items-center gap-2">
					<Plus class="w-4 h-4" />
					Criar Evento
				</button>
			</form>
		</div>
	{/if}

	<div class="space-y-4">
		{#if data.events.length === 0}
			<div class="card bg-surface-100-900 border border-surface-200-800">
				<EmptyState icon={Calendar} message="Nenhum evento criado ainda." />
			</div>
		{:else}
			{#each data.events as event}
				<div class="card bg-surface-100-900 p-6 border border-surface-200-800 hover:border-primary-500/30 transition-colors">
					<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
						<div class="flex-1">
							<div class="flex items-center gap-2 mb-2">
								<h3 class="h4">{event.name}</h3>
								{#if !event.isActive}
									<span class="badge preset-filled-warning-500 text-xs">Inativo</span>
								{/if}
							</div>
							{#if event.categories && event.categories.length > 0}
								<div class="flex flex-wrap gap-1 mb-2">
									{#each event.categories as category}
										<span
											class="badge text-white text-xs"
											style="background-color: {category.color}"
										>
											{category.name}
										</span>
									{/each}
								</div>
							{/if}
							<div class="flex items-center gap-2 text-sm text-surface-600-400 mb-2">
								<Calendar class="w-4 h-4" />
								{formatDate(event.dateTime, { includeTime: true })} - {formatTime(event.endTime)}
							</div>
							<div class="flex items-center gap-4 text-sm">
								<span class="text-primary-400 flex items-center gap-1">
									<Users class="w-4 h-4" />
									{event.attendeesCount} / {event.expectedAttendees} confirmados
								</span>
								<a
									href={getEventUrl(event.slug)}
									class="text-primary-400 hover:underline flex items-center gap-1"
									target="_blank"
								>
									<Link class="w-4 h-4" />
									Link público
								</a>
							</div>
						</div>

						<div class="flex items-center gap-2">
							<a
								href="/admin/events/{event.id}"
								class="btn btn-sm preset-outlined-surface-500 flex items-center gap-2"
							>
								<Eye class="w-4 h-4" />
								Detalhes
							</a>
							<form
								method="POST"
								action="?/delete"
								use:enhance
								onsubmit={(e) => {
									if (!confirm('Tem certeza que deseja excluir este evento?')) {
										e.preventDefault();
									}
								}}
							>
								<input type="hidden" name="eventId" value={event.id} />
								<button type="submit" class="btn btn-sm preset-filled-error-500 flex items-center gap-2">
									<Trash2 class="w-4 h-4" />
									Excluir
								</button>
							</form>
						</div>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</AdminPage>
