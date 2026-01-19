<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolveRoute } from '$app/paths';
	import { User, Building2, Mail, Lock, Package, UserPlus, LogIn, Phone } from 'lucide-svelte';
	import { Alert, AuthLayout } from '$lib';

	let { form, data } = $props();

	const loginHref = resolveRoute('/login');
	
	let phoneValue = $state('+55 ');

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
					// Se tem 11 dígitos (celular com 9), formato: NNNNN-NNNN
					// Se tem 10 dígitos (fixo), formato: NNNN-NNNN
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

	function handlePhoneInput(event: Event) {
		const input = event.target as HTMLInputElement;
		const cursorPosition = input.selectionStart || 0;
		const oldLength = phoneValue.length;
		
		phoneValue = formatPhone(input.value);
		
		// Ajusta a posição do cursor após formatação
		const newLength = phoneValue.length;
		const diff = newLength - oldLength;
		
		requestAnimationFrame(() => {
			input.setSelectionRange(cursorPosition + diff, cursorPosition + diff);
		});
	}
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

		<label class="label">
			<span class="flex items-center gap-2 mb-1">
				<Phone class="w-4 h-4 text-surface-500" />
				Telefone
			</span>
			<input
				type="tel"
				name="phone"
				class="input"
				placeholder="+55 (85) 99655-6359"
				bind:value={phoneValue}
				oninput={handlePhoneInput}
				required
			/>
		</label>

		{#if data.products.length > 0}
			<label class="label">
				<span class="flex items-center gap-2 mb-1">
					<Package class="w-4 h-4 text-surface-500" />
					Cargo
				</span>
				<select name="positionId" class="select">
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
