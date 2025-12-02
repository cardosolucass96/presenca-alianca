<script lang="ts">
	import { enhance } from '$app/forms';
	import { Phone, Send, ArrowLeft, Loader2 } from 'lucide-svelte';
	import { Alert, AuthLayout } from '$lib';

	let { form } = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Esqueci a Senha</title>
</svelte:head>

<AuthLayout 
	icon={Phone} 
	title="Esqueci a Senha" 
	subtitle="Digite seu telefone para receber um link de recuperação via WhatsApp"
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
					<Phone class="w-4 h-4 text-surface-500" />
					Telefone (WhatsApp)
				</span>
				<input
					type="tel"
					name="phone"
					placeholder="(11) 99999-9999"
					value={form?.phone ?? ''}
					class="input"
					required
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
					Enviando...
				{:else}
					<Send class="w-4 h-4" />
					Enviar Link via WhatsApp
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
