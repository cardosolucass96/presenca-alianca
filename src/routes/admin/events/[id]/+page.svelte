<script lang="ts">
	import { enhance } from '$app/forms';
	import { Calendar, Pencil } from 'lucide-svelte';
	import { Alert, AdminPage, EmptyState } from '$lib';
	import { formatDate } from '$lib/utils/formatters';

	let { data, form } = $props();

	let isEditing = $state(false);
	
	// Form state
	let editName = $state(data.event.name);
	let editDescription = $state(data.event.description || '');
	let editDate = $state(formatInputDate(data.event.dateTime));
	let editTime = $state(formatInputTime(data.event.dateTime));
	let editEndTime = $state(formatInputTime(data.event.endTime));
	let editMeetLink = $state(data.event.meetLink);
	let editExpectedAttendees = $state(data.event.expectedAttendees);
	let editCategoryIds = $state<string[]>(data.categories.map(c => c.id));

	function formatInputDate(date: Date) {
		const d = new Date(date);
		return d.toISOString().split('T')[0];
	}

	function formatInputTime(date: Date) {
		const d = new Date(date);
		return d.toTimeString().slice(0, 5);
	}

	function formatFullDate(date: Date) {
		return new Intl.DateTimeFormat('pt-BR', {
			dateStyle: 'full',
			timeStyle: 'short'
		}).format(new Date(date));
	}

	function formatTime(date: Date) {
		return new Intl.DateTimeFormat('pt-BR', {
			timeStyle: 'short'
		}).format(new Date(date));
	}

	function getPublicUrl() {
		return `${window.location.origin}/evento/${data.event.slug}`;
	}

	function copyLink() {
		navigator.clipboard.writeText(getPublicUrl());
		alert('Link copiado!');
	}

	function startEdit() {
		editName = data.event.name;
		editDescription = data.event.description || '';
		editDate = formatInputDate(data.event.dateTime);
		editTime = formatInputTime(data.event.dateTime);
		editEndTime = formatInputTime(data.event.endTime);
		editMeetLink = data.event.meetLink;
		editExpectedAttendees = data.event.expectedAttendees;
		editCategoryIds = data.categories.map(c => c.id);
		isEditing = true;
	}

	function cancelEdit() {
		isEditing = false;
	}

	function toggleCategory(categoryId: string) {
		if (editCategoryIds.includes(categoryId)) {
			editCategoryIds = editCategoryIds.filter(id => id !== categoryId);
		} else {
			editCategoryIds = [...editCategoryIds, categoryId];
		}
	}
</script>

<svelte:head>
	<title>{data.event.name} - Admin</title>
</svelte:head>

<AdminPage icon={Calendar} title={data.event.name} backHref="/admin/events" backLabel="Voltar para eventos">
	{#if form?.error}
		<Alert variant="error" message={form.error} class="mb-6" />
	{/if}

	{#if form?.success && !form?.toggled}
		<Alert variant="success" message="Evento atualizado com sucesso!" class="mb-6" />
	{/if}

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Event Details -->
		<div class="lg:col-span-2">
			<div class="card bg-surface-100-900 p-6 mb-6 border border-surface-200-800">
				{#if isEditing}
					<!-- Edit Form -->
					<form
						method="POST"
						action="?/update"
						use:enhance={() => {
							return async ({ update }) => {
								await update();
								isEditing = false;
							};
						}}
						class="space-y-4"
					>
						<div class="flex items-center justify-between mb-4">
							<h2 class="h3">Editar Evento</h2>
							<button
								type="button"
								class="btn btn-sm preset-outlined-surface-500"
								onclick={cancelEdit}
							>
								Cancelar
							</button>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<label class="label md:col-span-2">
								<span>Nome do Evento *</span>
								<input
									type="text"
									name="name"
									class="input"
									bind:value={editName}
									required
								/>
							</label>

							<label class="label">
								<span>Data *</span>
								<input
									type="date"
									name="date"
									class="input"
									bind:value={editDate}
									required
								/>
							</label>

							<div class="grid grid-cols-2 gap-2">
								<label class="label">
									<span>Início *</span>
									<input
										type="time"
										name="time"
										class="input"
										bind:value={editTime}
										required
									/>
								</label>
								<label class="label">
									<span>Fim *</span>
									<input
										type="time"
										name="endTime"
										class="input"
										bind:value={editEndTime}
										required
									/>
								</label>
							</div>

							<label class="label">
								<span>Link do Meet *</span>
								<input
									type="url"
									name="meetLink"
									class="input"
									bind:value={editMeetLink}
									required
								/>
							</label>

							<label class="label">
								<span>Pessoas Esperadas</span>
								<input
									type="number"
									name="expectedAttendees"
									class="input"
									bind:value={editExpectedAttendees}
									min="0"
								/>
							</label>

							<label class="label md:col-span-2">
								<span>Descrição</span>
								<textarea
									name="description"
									class="textarea"
									rows="2"
									bind:value={editDescription}
								></textarea>
							</label>
						</div>

						{#if data.allCategories.length > 0}
							<div class="label">
								<span>Categorias</span>
								<div class="flex flex-wrap gap-2 mt-2">
									{#each data.allCategories as category}
										<label class="flex items-center gap-2 cursor-pointer">
											<input
												type="checkbox"
												name="categoryIds"
												value={category.id}
												checked={editCategoryIds.includes(category.id)}
												onchange={() => toggleCategory(category.id)}
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

						<div class="flex gap-2 pt-4">
							<button type="submit" class="btn preset-filled-primary-500">
								Salvar Alterações
							</button>
							<button
								type="button"
								class="btn preset-outlined-surface-500"
								onclick={cancelEdit}
							>
								Cancelar
							</button>
						</div>
					</form>
				{:else}
					<!-- View Mode -->
					<div class="flex items-center justify-between mb-4">
						<h1 class="h2">{data.event.name}</h1>
						<div class="flex items-center gap-2">
							{#if !data.event.isActive}
								<span class="badge preset-filled-warning-500">Inativo</span>
							{/if}
							<button
								class="btn btn-sm preset-filled-primary-500"
								onclick={startEdit}
							>
								<Pencil class="w-4 h-4" />
								Editar
							</button>
						</div>
					</div>

					{#if data.event.description}
						<p class="text-surface-600-400 mb-4">{data.event.description}</p>
					{/if}

					<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
						<div>
							<span class="text-surface-500">Data e Horário:</span>
							<p class="font-medium">{formatFullDate(data.event.dateTime)} - {formatTime(data.event.endTime)}</p>
						</div>
						{#if data.categories && data.categories.length > 0}
							<div>
								<span class="text-surface-500">Categorias:</span>
								<div class="flex flex-wrap gap-1 mt-1">
									{#each data.categories as category}
										<span
											class="badge text-white text-xs"
											style="background-color: {category.color}"
										>
											{category.name}
										</span>
									{/each}
								</div>
							</div>
						{/if}
						<div>
							<span class="text-surface-500">Link do Meet:</span>
							<p>
								<a
									href={data.event.meetLink}
									target="_blank"
									class="text-primary-500 hover:underline break-all"
								>
									{data.event.meetLink}
								</a>
							</p>
						</div>
						<div>
							<span class="text-surface-500">Pessoas Esperadas:</span>
							<p class="font-medium">{data.event.expectedAttendees}</p>
						</div>
					</div>
				{/if}
			</div>

			<!-- Attendees List -->
			<div class="card bg-surface-100-900 p-6 border border-surface-200-800">
				<h2 class="h3 mb-4">
					Participantes ({data.attendeesCount} / {data.event.expectedAttendees})
				</h2>

				{#if data.attendees.length === 0}
					<p class="text-surface-600-400 text-center py-8">
						Nenhum participante confirmado ainda.
					</p>
				{:else}
					<div class="overflow-x-auto">
						<table class="table">
							<thead>
								<tr>
									<th>Nome</th>
									<th>Empresa</th>
									<th>Produto</th>
									<th>Email</th>
									<th>Confirmado em</th>
								</tr>
							</thead>
							<tbody>
								{#each data.attendees as { user, attendance, productName }}
									<tr>
										<td>{user.username}</td>
										<td>{user.companyName}</td>
										<td>{productName || '-'}</td>
										<td>{user.email}</td>
										<td>{formatDate(attendance.confirmedAt, { includeTime: true })}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</div>

		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Stats -->
			<div class="card bg-surface-100-900 p-6 border border-surface-200-800">
				<h3 class="h4 mb-4">Estatísticas</h3>
				<div class="space-y-4">
					<div class="flex justify-between">
						<span class="text-surface-500">Confirmados:</span>
						<span class="font-bold text-primary-500">{data.attendeesCount}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-surface-500">Esperados:</span>
						<span class="font-medium">{data.event.expectedAttendees}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-surface-500">Taxa:</span>
						<span class="font-medium">
							{data.event.expectedAttendees > 0
								? Math.round((data.attendeesCount / data.event.expectedAttendees) * 100)
								: 0}%
						</span>
					</div>
				</div>

				<!-- Progress bar -->
				<div class="mt-4">
					<div class="w-full bg-surface-300-700 rounded-full h-2">
						<div
							class="bg-primary-500 h-2 rounded-full transition-all"
							style="width: {Math.min(
								100,
								data.event.expectedAttendees > 0
									? (data.attendeesCount / data.event.expectedAttendees) * 100
									: 0
							)}%"
						></div>
					</div>
				</div>
			</div>

			<!-- Public Link -->
			<div class="card bg-surface-100-900 p-6 border border-surface-200-800">
				<h3 class="h4 mb-4">Link Público</h3>
				<p class="text-sm text-surface-600-400 mb-4">
					Compartilhe este link para os participantes confirmarem presença:
				</p>
				<div class="flex gap-2">
					<input
						type="text"
						readonly
						value={`/evento/${data.event.slug}`}
						class="input flex-1 text-sm"
					/>
					<button class="btn preset-filled-primary-500" onclick={copyLink}>
						Copiar
					</button>
				</div>
			</div>

		</div>
	</div>
</AdminPage>
