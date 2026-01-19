<script lang="ts">
	import { enhance } from '$app/forms';
	import { Mail, Send, ArrowLeft, Loader2, KeyRound } from 'lucide-svelte';
	import { Alert, AuthLayout } from '$lib';

	let { form } = $props();
	let loading = $state(false);
	let identifierValue = $state(form?.identifier ?? '');
	let isPhone = $state(false);

	function formatPhone(value: string) {
		// Remove tudo exceto números
		let numbers = value.replace(/\D/g, '');
		
		// Se começar com 55, remove para não duplicar
		if (numbers.startsWith('55')) {
			numbers = numbers.slice(2);
		}
		
		// Limita a 11 dígitos (DDD + número)
		numbers = numbers.slice(0, 11);
		
		// Formata: +55 (DD) NNNNN-NNNN ou +55 (DD) NNNN-NNNN
		let formatted = '+55 ';
		
		if (numbers.length > 0) {
			formatted += '(' + numbers.slice(0, 2);
			if (numbers.length >= 2) {
				formatted += ') ';
				if (numbers.length > 2) {
					const hasNineDigit = numbers.length === 11;
					const firstPart = hasNineDigit ? numbers.slice(2, 7) : numbers.slice(2, 6);
					const secondPart = hasNineDigit ? numbers.slice(7, 11) : numbers.slice(6, 10);
					
					formatted += firstPart;
					if (secondPart) {
						formatted += '-' + secondPart;
					}
				}
			}
		}
		
		return formatted;
	}

	function handleInput(event: Event) {
		const input = event.target as HTMLInputElement;
		const value = input.value;
		
		// Detecta se é telefone (começa com + ou contém apenas números e símbolos de telefone)
		const phonePattern = /^[\d\s\(\)\-\+]*$/;
		const hasAtSymbol = value.includes('@');
		
		// Se contém @ é email, senão é telefone
		if (hasAtSymbol) {
			isPhone = false;
			identifierValue = value;
		} else if (phonePattern.test(value) || value.length === 0) {
			isPhone = true;
			const cursorPosition = input.selectionStart || 0;
			const oldLength = identifierValue.length;
			
			identifierValue = formatPhone(value);
			
			// Ajusta a posição do cursor após formatação
			const newLength = identifierValue.length;
			const diff = newLength - oldLength;
			
			requestAnimationFrame(() => {
				input.setSelectionRange(cursorPosition + diff, cursorPosition + diff);
			});
		} else {
			isPhone = false;
			identifierValue = value;
		}
	}
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
					bind:value={identifierValue}
					oninput={handleInput}
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
