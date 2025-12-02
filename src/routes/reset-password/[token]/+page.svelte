<script lang="ts">
	import { enhance } from '$app/forms';
	import { Lock, Save, Loader2 } from 'lucide-svelte';
	import { Alert, AuthLayout } from '$lib';

	let { data, form } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Criar Nova Senha</title>
</svelte:head>

<AuthLayout 
	icon={Lock} 
	title="Nova Senha" 
	subtitle="Olá {data.username}, crie sua nova senha"
>
	{#if form?.error}
		<Alert variant="error" message={form.error} class="mb-4" />
	{/if}

	<form
		method="POST"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				await update();
				loading = false;
			};
		}}
	>
		<label class="label mb-4">
			<span class="mb-1 flex items-center gap-2">
				<Lock class="w-4 h-4 text-surface-500" />
				Nova Senha
			</span>
			<input
				type="password"
				name="password"
				placeholder="Mínimo 6 caracteres"
				class="input"
				required
				minlength="6"
				disabled={loading}
			/>
		</label>

		<label class="label mb-6">
			<span class="mb-1 flex items-center gap-2">
				<Lock class="w-4 h-4 text-surface-500" />
				Confirmar Senha
			</span>
			<input
				type="password"
				name="confirmPassword"
				placeholder="Digite novamente"
				class="input"
				required
				minlength="6"
				disabled={loading}
			/>
		</label>

		<button
			type="submit"
			class="btn preset-filled-primary-500 w-full flex items-center justify-center gap-2"
			disabled={loading}
		>
			{#if loading}
				<Loader2 class="w-4 h-4 animate-spin" />
				Salvando...
			{:else}
				<Save class="w-4 h-4" />
				Salvar Nova Senha
			{/if}
		</button>
	</form>
</AuthLayout>
