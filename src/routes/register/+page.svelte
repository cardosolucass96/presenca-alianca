<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolveRoute } from '$app/paths';
	import { User, Building2, Mail, Lock, Package, UserPlus, LogIn } from 'lucide-svelte';
	import { Alert, AuthLayout } from '$lib';

	let { form, data } = $props();

	const loginHref = resolveRoute('/login');
</script>

<svelte:head>
	<title>Criar Conta</title>
</svelte:head>

<AuthLayout icon={UserPlus} title="Criar Conta">
	{#if form?.error}
		<Alert variant="error" message={form.error} class="mb-6" />
	{/if}

	<form method="POST" use:enhance class="space-y-4">
		<input type="hidden" name="redirectTo" value={data.redirectTo} />
		
		<label class="label">
			<span class="flex items-center gap-2 mb-1">
				<User class="w-4 h-4 text-surface-500" />
				Nome
			</span>
			<input
				type="text"
				name="username"
				class="input"
				placeholder="Seu nome"
				required
			/>
		</label>

		<label class="label">
			<span class="flex items-center gap-2 mb-1">
				<Building2 class="w-4 h-4 text-surface-500" />
				Empresa
			</span>
			<input
				type="text"
				name="companyName"
				class="input"
				placeholder="Nome da empresa"
				required
			/>
		</label>

		{#if data.products.length > 0}
			<label class="label">
				<span class="flex items-center gap-2 mb-1">
					<Package class="w-4 h-4 text-surface-500" />
					Cargo
				</span>
				<select name="productId" class="select">
					<option value="">Selecione seu cargo (opcional)</option>
					{#each data.products as product}
						<option value={product.id}>{product.name}</option>
					{/each}
				</select>
			</label>
		{/if}

		<label class="label">
			<span class="flex items-center gap-2 mb-1">
				<Mail class="w-4 h-4 text-surface-500" />
				Email
			</span>
			<input
				type="email"
				name="email"
				class="input"
				placeholder="seu@email.com"
				required
			/>
		</label>

		<label class="label">
			<span class="flex items-center gap-2 mb-1">
				<Lock class="w-4 h-4 text-surface-500" />
				Senha
			</span>
			<input
				type="password"
				name="password"
				class="input"
				placeholder="Mínimo 8 caracteres"
				minlength="8"
				required
			/>
		</label>

		<label class="label">
			<span class="flex items-center gap-2 mb-1">
				<Lock class="w-4 h-4 text-surface-500" />
				Confirmar Senha
			</span>
			<input
				type="password"
				name="confirmPassword"
				class="input"
				placeholder="••••••••"
				required
			/>
		</label>

		<button type="submit" class="btn preset-filled-primary-500 w-full flex items-center justify-center gap-2">
			<UserPlus class="w-4 h-4" />
			Criar Conta
		</button>
	</form>

	{#snippet footer()}
		Já tem conta?
		<a href="{loginHref}?redirect={data.redirectTo}" class="anchor inline-flex items-center gap-1 ml-1">
			<LogIn class="w-4 h-4" />
			Fazer login
		</a>
	{/snippet}
</AuthLayout>
