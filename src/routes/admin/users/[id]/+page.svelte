<script lang="ts">
	import { enhance } from '$app/forms';
	import { User } from 'lucide-svelte';
	import { Alert, AdminPage, EmptyState } from '$lib';
	import { formatDate } from '$lib/utils/formatters';

	let { data, form } = $props();

	function formatTime(date: Date) {
		return new Intl.DateTimeFormat('pt-BR', {
			timeStyle: 'short'
		}).format(new Date(date));
	}
</script>

<svelte:head>
	<title>Editar {data.user.username} - Admin</title>
</svelte:head>

<AdminPage icon={User} title="Editar Usuário" backHref="/admin/users" backLabel="Voltar para usuários">

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- User Info -->
		<div class="lg:col-span-2 space-y-6">
			<div class="card bg-surface-100-900 p-6 border border-surface-200-800">
				<h2 class="h3 mb-6">Dados do Usuário</h2>

				{#if form?.error && !form?.passwordError}
					<Alert variant="error" message={form.error} class="mb-6" />
				{/if}

				{#if form?.success}
					<Alert variant="success" message="Usuário atualizado com sucesso!" class="mb-6" />
				{/if}

				<form method="POST" action="?/update" use:enhance class="space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<label class="label">
							<span>Nome *</span>
							<input
								type="text"
								name="username"
								class="input"
								value={data.user.username}
								required
							/>
						</label>

						<label class="label">
							<span>Email *</span>
							<input
								type="email"
								name="email"
								class="input"
								value={data.user.email}
								required
							/>
						</label>

						<label class="label">
							<span>Telefone (WhatsApp)</span>
							<input
								type="tel"
								name="phone"
								class="input"
								value={data.user.phone || ''}
								placeholder="(11) 99999-9999"
							/>
						</label>

						<label class="label">
							<span>Empresa *</span>
							<input
								type="text"
								name="companyName"
								class="input"
								value={data.user.companyName}
								required
							/>
						</label>

<label class="label">
									<span>Cargo</span>
									<select name="positionId" class="select">
										<option value="">Sem cargo</option>
										{#each data.products as product}
											{#if product.isActive || product.id === data.user.positionId}
												<option value={product.id} selected={product.id === data.user.positionId}>
													{product.name}
												</option>
											{/if}
										{/each}
									</select>
								</label>						<label class="label">
							<span>Tipo</span>
							<select name="role" class="select">
								<option value="user" selected={data.user.role === 'user'}>Usuário</option>
								<option value="admin" selected={data.user.role === 'admin'}>Administrador</option>
							</select>
						</label>
					</div>

					<button type="submit" class="btn preset-filled-primary-500">
						Salvar Alterações
					</button>
				</form>
			</div>

			<div class="card bg-surface-100-900 p-6 border border-surface-200-800">
				<h2 class="h3 mb-4">Alterar Senha</h2>

				{#if form?.passwordError}
					<Alert variant="error" message={form.error} class="mb-6" />
				{/if}

				{#if form?.passwordSuccess}
					<Alert variant="success" message="Senha atualizada com sucesso!" class="mb-6" />
				{/if}

				<form method="POST" action="?/updatePassword" use:enhance class="space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<label class="label">
							<span>Nova Senha *</span>
							<input
								type="password"
								name="newPassword"
								class="input"
								placeholder="Mínimo 6 caracteres"
								required
								minlength="6"
							/>
						</label>

						<label class="label">
							<span>Confirmar Senha *</span>
							<input
								type="password"
								name="confirmPassword"
								class="input"
								placeholder="Digite novamente"
								required
								minlength="6"
							/>
						</label>
					</div>

					<button type="submit" class="btn preset-outlined-warning-500">
						🔐 Alterar Senha
					</button>
				</form>
			</div>

			<!-- Events Attended -->
			<div class="card bg-surface-100-900 p-6 border border-surface-200-800">
				<h2 class="h3 mb-4">Eventos Confirmados ({data.attendances.length})</h2>

				{#if data.attendances.length === 0}
					<p class="text-surface-600-400 text-center py-4">
						Este usuário ainda não confirmou presença em nenhum evento.
					</p>
				{:else}
					<div class="overflow-x-auto">
						<table class="table w-full">
							<thead>
								<tr class="bg-surface-200-800">
									<th class="p-3 text-left">Evento</th>
									<th class="p-3 text-left">Data do Evento</th>
									<th class="p-3 text-left">Confirmado em</th>
									<th class="p-3 text-right">Ação</th>
								</tr>
							</thead>
							<tbody>
							{#each data.attendances as { event, attendance }}
								<tr class="border-t border-surface-300-700">
									<td class="p-3 font-medium">{event.name}</td>
									<td class="p-3 text-sm">
										{formatDate(event.dateTime, { includeTime: true })} - {formatTime(event.endTime)}
									</td>
									<td class="p-3 text-sm text-surface-600-400">
										{formatDate(attendance.confirmedAt, { includeTime: true })}
									</td>
									<td class="p-3 text-right">
										<a
											href="/admin/events/{event.id}"
											class="btn btn-sm preset-outlined-primary-500"
										>
											Ver Evento
										</a>
									</td>
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
			<div class="card bg-surface-100-900 p-6 border border-surface-200-800">
				<h3 class="h4 mb-4">Informações</h3>
				<div class="space-y-3 text-sm">
					<div>
						<span class="text-surface-500">ID:</span>
						<p class="font-mono text-xs break-all">{data.user.id}</p>
					</div>
					<div>
						<span class="text-surface-500">Tipo:</span>
						<p>
							{#if data.user.role === 'admin'}
								<span class="badge preset-filled-primary-500">Administrador</span>
							{:else}
								<span class="badge preset-filled-surface-500">Usuário</span>
							{/if}
						</p>
					</div>
					<div>
						<span class="text-surface-500">Cargo:</span>
						<p class="font-medium">{data.productName || 'Nenhuma'}</p>
					</div>
					<div>
						<span class="text-surface-500">Cadastrado em:</span>
						<p>{formatDate(data.user.createdAt)}</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</AdminPage>
