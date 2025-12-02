<script lang="ts">
	import { enhance } from '$app/forms';
	import { Tag } from 'lucide-svelte';
	import { Alert, AdminPage, EmptyState } from '$lib';
	import { formatDate } from '$lib/utils/formatters';

	let { data, form } = $props();

	let showCreateForm = $state(false);
	let editingId = $state<string | null>(null);
	let editingName = $state('');
	let editingColor = $state('#6366f1');
	let newColor = $state('#6366f1');

	function startEdit(id: string, name: string, color: string) {
		editingId = id;
		editingName = name;
		editingColor = color;
	}

	function cancelEdit() {
		editingId = null;
		editingName = '';
		editingColor = '#6366f1';
	}

	const presetColors = [
		'#ef4444', // red
		'#f97316', // orange
		'#eab308', // yellow
		'#22c55e', // green
		'#14b8a6', // teal
		'#3b82f6', // blue
		'#6366f1', // indigo
		'#8b5cf6', // violet
		'#ec4899', // pink
		'#6b7280', // gray
	];
</script>

<svelte:head>
	<title>Gerenciar Categorias</title>
</svelte:head>

<AdminPage icon={Tag} title="Categorias" subtitle="Tags para organizar os eventos">
	{#snippet actions()}
		<button
			class="btn preset-filled-primary-500"
			onclick={() => (showCreateForm = !showCreateForm)}
		>
			{showCreateForm ? 'Cancelar' : 'Nova Categoria'}
		</button>
	{/snippet}

	{#if form?.error}
		<Alert variant="error" message={form.error} class="mb-6" />
	{/if}

	{#if form?.success && !form?.updated && !form?.deleted}
		<Alert variant="success" message="Categoria criada com sucesso!" class="mb-6" />
	{/if}

	{#if form?.updated}
		<Alert variant="success" message="Categoria atualizada com sucesso!" class="mb-6" />
	{/if}

	{#if showCreateForm}
		<div class="card bg-surface-100-900 p-6 mb-8 border border-surface-200-800">
			<h2 class="h3 mb-4">Nova Categoria</h2>
			<form
				method="POST"
				action="?/create"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						showCreateForm = false;
						newColor = '#6366f1';
					};
				}}
				class="space-y-4"
			>
				<div class="flex gap-4 items-end">
					<label class="label flex-1">
						<span>Nome da Categoria</span>
						<input
							type="text"
							name="name"
							class="input"
							placeholder="Ex: Workshop, Treinamento, Webinar..."
							required
							minlength="2"
						/>
					</label>
					<label class="label">
						<span>Cor</span>
						<div class="flex gap-2 items-center">
							<input
								type="color"
								name="color"
								bind:value={newColor}
								class="w-12 h-10 rounded cursor-pointer"
							/>
							<div class="flex gap-1">
								{#each presetColors as color}
									<button
										type="button"
										class="w-6 h-6 rounded-full border-2 {newColor === color ? 'border-white' : 'border-transparent'}"
										style="background-color: {color}"
										onclick={() => newColor = color}
										aria-label="Selecionar cor {color}"
									></button>
								{/each}
							</div>
						</div>
					</label>
					<button type="submit" class="btn preset-filled-primary-500">
						Criar
					</button>
				</div>
			</form>
		</div>
	{/if}

	<div class="card bg-surface-100-900 overflow-hidden border border-surface-200-800">
		{#if data.categories.length === 0}
			<EmptyState icon={Tag} message="Nenhuma categoria cadastrada ainda." />
		{:else}
			<table class="table w-full">
				<thead>
					<tr class="bg-surface-200-800">
						<th class="p-4 text-left">Categoria</th>
						<th class="p-4 text-left w-32">Status</th>
						<th class="p-4 text-left w-32">Criada em</th>
						<th class="p-4 text-right w-56">Ações</th>
					</tr>
				</thead>
				<tbody>
					{#each data.categories as cat}
						<tr class="border-t border-surface-300-700">
							<td class="p-4">
								{#if editingId === cat.id}
									<form
										method="POST"
										action="?/update"
										use:enhance={() => {
											return async ({ update }) => {
												await update();
												cancelEdit();
											};
										}}
										class="flex gap-2 items-center"
									>
										<input type="hidden" name="id" value={cat.id} />
										<input
											type="color"
											name="color"
											bind:value={editingColor}
											class="w-10 h-8 rounded cursor-pointer"
										/>
										<input
											type="text"
											name="name"
											class="input flex-1"
											bind:value={editingName}
											required
											minlength="2"
										/>
										<button type="submit" class="btn btn-sm preset-filled-success-500">
											Salvar
										</button>
										<button
											type="button"
											class="btn btn-sm preset-outlined-surface-500"
											onclick={cancelEdit}
										>
											Cancelar
										</button>
									</form>
								{:else}
									<div class="flex items-center gap-3">
										<span
											class="w-4 h-4 rounded-full"
											style="background-color: {cat.color}"
										></span>
										<span class="font-medium">{cat.name}</span>
									</div>
								{/if}
							</td>
							<td class="p-4">
								{#if cat.isActive}
									<span class="badge preset-filled-success-500 text-xs">Ativa</span>
								{:else}
									<span class="badge preset-filled-warning-500 text-xs">Inativa</span>
								{/if}
							</td>
							<td class="p-4 text-sm text-surface-600-400">
								{formatDate(cat.createdAt)}
							</td>
							<td class="p-4">
								{#if editingId !== cat.id}
									<div class="flex justify-end gap-2">
										<button
											class="btn btn-sm preset-outlined-primary-500"
											onclick={() => startEdit(cat.id, cat.name, cat.color)}
										>
											Editar
										</button>
										<form method="POST" action="?/toggle" use:enhance>
											<input type="hidden" name="id" value={cat.id} />
											<button
												type="submit"
												class="btn btn-sm {cat.isActive
													? 'preset-outlined-warning-500'
													: 'preset-outlined-success-500'}"
											>
												{cat.isActive ? 'Desativar' : 'Ativar'}
											</button>
										</form>
										<form
											method="POST"
											action="?/delete"
											use:enhance
											onsubmit={(e) => {
												if (!confirm('Tem certeza que deseja excluir esta categoria?')) {
													e.preventDefault();
												}
											}}
										>
											<input type="hidden" name="id" value={cat.id} />
											<button type="submit" class="btn btn-sm preset-filled-error-500">
												Excluir
											</button>
										</form>
									</div>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</AdminPage>
