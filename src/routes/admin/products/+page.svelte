<script lang="ts">
	import { enhance } from '$app/forms';
	import { Package } from 'lucide-svelte';
	import { Alert, AdminPage, EmptyState } from '$lib';
	import { formatDate } from '$lib/utils/formatters';

	let { data, form } = $props();

	let showCreateForm = $state(false);
	let editingId = $state<string | null>(null);
	let editingName = $state('');

	function startEdit(id: string, name: string) {
		editingId = id;
		editingName = name;
	}

	function cancelEdit() {
		editingId = null;
		editingName = '';
	}
</script>

<svelte:head>
	<title>Gerenciar Cargos</title>
</svelte:head>

<AdminPage icon={Package} title="Cargos" subtitle="Gerencie os cargos dos usuários">
	{#snippet actions()}
		<button
			class="btn preset-filled-primary-500"
			onclick={() => (showCreateForm = !showCreateForm)}
		>
			{showCreateForm ? 'Cancelar' : 'Novo Cargo'}
		</button>
	{/snippet}

	{#if form?.error}
		<Alert variant="error" message={form.error} class="mb-6" />
	{/if}

	{#if form?.success && !form?.updated && !form?.deleted}
		<Alert variant="success" message="Cargo criado com sucesso!" class="mb-6" />
	{/if}

	{#if form?.updated}
		<Alert variant="success" message="Cargo atualizado com sucesso!" class="mb-6" />
	{/if}

	{#if showCreateForm}
		<div class="card bg-surface-100-900 p-6 mb-8 border border-surface-200-800">
			<h2 class="h3 mb-4">Novo Cargo</h2>
			<form
				method="POST"
				action="?/create"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						showCreateForm = false;
					};
				}}
				class="flex gap-4"
			>
				<label class="label flex-1">
					<span class="sr-only">Nome do Cargo</span>
					<input
						type="text"
						name="name"
						class="input"
						placeholder="Nome do cargo"
						required
						minlength="2"
					/>
				</label>
				<button type="submit" class="btn preset-filled-primary-500">
					Criar
				</button>
			</form>
		</div>
	{/if}

	<div class="card bg-surface-100-900 overflow-hidden border border-surface-200-800">
		{#if data.products.length === 0}
			<EmptyState icon={Package} message="Nenhum cargo cadastrado ainda." />
		{:else}
			<table class="table w-full">
				<thead>
					<tr class="bg-surface-200-800">
						<th class="p-4 text-left">Nome</th>
						<th class="p-4 text-left w-32">Status</th>
						<th class="p-4 text-left w-32">Criado em</th>
						<th class="p-4 text-right w-48">Ações</th>
					</tr>
				</thead>
				<tbody>
					{#each data.products as product}
						<tr class="border-t border-surface-300-700">
							<td class="p-4">
								{#if editingId === product.id}
									<form
										method="POST"
										action="?/update"
										use:enhance={() => {
											return async ({ update }) => {
												await update();
												cancelEdit();
											};
										}}
										class="flex gap-2"
									>
										<input type="hidden" name="id" value={product.id} />
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
									<span class="font-medium">{product.name}</span>
									<span class="text-xs text-surface-500 ml-2 font-mono">
										ID: {product.id}
									</span>
								{/if}
							</td>
							<td class="p-4">
								{#if product.isActive}
									<span class="badge preset-filled-success-500 text-xs">Ativo</span>
								{:else}
									<span class="badge preset-filled-warning-500 text-xs">Inativo</span>
								{/if}
							</td>
							<td class="p-4 text-sm text-surface-600-400">
								{formatDate(product.createdAt)}
							</td>
							<td class="p-4">
								{#if editingId !== product.id}
									<div class="flex justify-end gap-2">
										<button
											class="btn btn-sm preset-outlined-primary-500"
											onclick={() => startEdit(product.id, product.name)}
										>
											Editar
										</button>
										<form method="POST" action="?/toggle" use:enhance>
											<input type="hidden" name="id" value={product.id} />
											<button
												type="submit"
												class="btn btn-sm {product.isActive
													? 'preset-outlined-warning-500'
													: 'preset-outlined-success-500'}"
											>
												{product.isActive ? 'Desativar' : 'Ativar'}
											</button>
										</form>
										<form
											method="POST"
											action="?/delete"
											use:enhance
											onsubmit={(e) => {
												if (!confirm('Tem certeza que deseja excluir este cargo?')) {
													e.preventDefault();
												}
											}}
										>
											<input type="hidden" name="id" value={product.id} />
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
