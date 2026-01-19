<script lang="ts">
	import { enhance } from '$app/forms';
	import { Mail, Send, ArrowLeft, Loader2, KeyRound } from 'lucide-svelte';
	import { Alert, AuthLayout } from '$lib';

	let { form } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Esqueci a Senha</title>
</svelte:head>

<AuthLayout 
	icon={KeyRound} 
	title="Recuperar Senha" 
	subtitle="Digite seu email ou telefone para receber um link de recuperação"
>
	{#if form?.success}
		<Alert variant="success" message={form.message} class="mb-4" />
	{/if}

	{#if form?.error}
		<Alert variant="error" message={form.error} class="mb-4" />
	{/if}

	{#if !form?.success}
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
					<Mail class="w-4 h-4 text-surface-500" />
					Email ou Telefone
				</span>
				<input
					type="text"
					name="identifier"
					placeholder="seu@email.com ou +55 (85) 99999-9999"
					value={form?.identifier ?? ''}
					class="input"
					required
					disabled={loading}
				/>
			</label>
			<p class="text-sm text-surface-500 mb-4">
				Você receberá um link de recuperação por email e WhatsApp (se disponíveis).
			</p>

			<button
				type="submit"
				class="btn preset-filled-primary-500 w-full flex items-center justify-center gap-2"
				disabled={loading}
			>
				{#if loading}
					<Loader2 class="w-4 h-4 animate-spin" />
					Enviando...
				{:else}
					<Send class="w-4 h-4" />
					Enviar Link de Recuperação
				{/if}
			</button>
		</form>
	{/if}

	{#snippet footer()}
		<a href="/login" class="text-primary-500 hover:underline inline-flex items-center gap-2">
			<ArrowLeft class="w-4 h-4" />
			Voltar para o login
		</a>
	{/snippet}
</AuthLayout>
