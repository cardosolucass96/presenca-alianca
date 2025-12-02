<script lang="ts">
	import { enhance } from '$app/forms';
	import { Users } from 'lucide-svelte';
	import { Alert, AdminPage, EmptyState } from '$lib';
	import { formatDate } from '$lib/utils/formatters';

	let { data, form } = $props();

	let showCreateForm = $state(false);
</script>

<svelte:head>
	<title>Gerenciar Usuários</title>
</svelte:head>

<AdminPage icon={Users} title="Usuários" subtitle="{data.users.length} usuário{data.users.length !== 1 ? 's' : ''} cadastrado{data.users.length !== 1 ? 's' : ''}">
	{#snippet actions()}
		<button
			class="btn preset-filled-primary-500"
			onclick={() => (showCreateForm = !showCreateForm)}
		>
			{showCreateForm ? 'Cancelar' : 'Novo Usuário'}
		</button>
	{/snippet}

	{#if form?.error}
		<Alert variant="error" message={form.error} class="mb-6" />
	{/if}

	{#if form?.success && !form?.deleted}
		<Alert variant="success" message="Usuário criado com sucesso!" class="mb-6" />
	{/if}

	{#if showCreateForm}
		<div class="card bg-surface-100-900 p-6 mb-8 border border-surface-200-800">
			<h2 class="h3 mb-4">Novo Usuário</h2>
			<form
				method="POST"
				action="?/create"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						showCreateForm = false;
					};
				}}
				class="space-y-4"
			>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<label class="label">
						<span>Nome *</span>
						<input
							type="text"
							name="username"
							class="input"
							placeholder="Nome completo"
							required
						/>
					</label>

					<label class="label">
						<span>Email *</span>
						<input
							type="email"
							name="email"
							class="input"
							placeholder="email@exemplo.com"
							required
						/>
					</label>

					<label class="label">
						<span>Telefone (WhatsApp)</span>
						<input
							type="tel"
							name="phone"
							class="input"
							placeholder="(11) 99999-9999"
						/>
					</label>

					<label class="label">
						<span>Empresa *</span>
						<input
							type="text"
							name="companyName"
							class="input"
							placeholder="Nome da empresa"
							required
						/>
					</label>

					<label class="label">
						<span>Cargo</span>
						<select name="productId" class="select">
							<option value="">Sem cargo</option>
							{#each data.products as product}
								{#if product.isActive}
									<option value={product.id}>{product.name}</option>
								{/if}
							{/each}
						</select>
					</label>

					<label class="label">
						<span>Senha *</span>
						<input
							type="password"
							name="password"
							class="input"
							placeholder="Mínimo 6 caracteres"
							required
							minlength="6"
						/>
					</label>

					<label class="label">
						<span>Tipo</span>
						<select name="role" class="select">
							<option value="user">Usuário</option>
							<option value="admin">Administrador</option>
						</select>
					</label>
				</div>

				<button type="submit" class="btn preset-filled-primary-500">
					Criar Usuário
				</button>
			</form>
		</div>
	{/if}

	<div class="card bg-surface-100-900 overflow-hidden border border-surface-200-800">
		{#if data.users.length === 0}
			<EmptyState icon={Users} message="Nenhum usuário cadastrado ainda." />
		{:else}
			<div class="overflow-x-auto">
				<table class="table w-full">
					<thead>
						<tr class="bg-surface-200-800">
							<th class="p-4 text-left">Nome</th>
							<th class="p-4 text-left">Email</th>
							<th class="p-4 text-left">Telefone</th>
							<th class="p-4 text-left">Empresa</th>
							<th class="p-4 text-left">Cargo</th>
							<th class="p-4 text-left">Tipo</th>
							<th class="p-4 text-left">Cadastro</th>
							<th class="p-4 text-right">Ações</th>
						</tr>
					</thead>
					<tbody>
						{#each data.users as user}
							<tr class="border-t border-surface-300-700">
								<td class="p-4 font-medium">{user.username}</td>
								<td class="p-4">{user.email}</td>
								<td class="p-4">{user.phone || '-'}</td>
								<td class="p-4">{user.companyName}</td>
								<td class="p-4">{user.productName || '-'}</td>
								<td class="p-4">
									{#if user.role === 'admin'}
										<span class="badge preset-filled-primary-500 text-xs">Admin</span>
									{:else}
										<span class="badge preset-filled-surface-500 text-xs">Usuário</span>
									{/if}
								</td>
								<td class="p-4 text-sm text-surface-600-400">
									{formatDate(user.createdAt)}
								</td>
								<td class="p-4">
									<div class="flex justify-end gap-2">
										<a
											href="/admin/users/{user.id}"
											class="btn btn-sm preset-outlined-primary-500"
										>
											Editar
										</a>
										<form
											method="POST"
											action="?/delete"
											use:enhance
											onsubmit={(e) => {
												if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
													e.preventDefault();
												}
											}}
										>
											<input type="hidden" name="userId" value={user.id} />
											<button type="submit" class="btn btn-sm preset-filled-error-500">
												Excluir
											</button>
										</form>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</AdminPage>
