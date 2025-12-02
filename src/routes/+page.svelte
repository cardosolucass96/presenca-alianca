<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolveRoute } from '$app/paths';
	import { Mail, Lock, LogIn, UserPlus, KeyRound } from 'lucide-svelte';
	import { Alert, AuthLayout } from '$lib';

	let { form, data } = $props();

	const registerHref = resolveRoute('/register');
	const forgotPasswordHref = resolveRoute('/forgot-password');
</script>

<svelte:head>
	<title>Presença Aliança</title>
</svelte:head>

{#if data.user}
	<!-- Usuário logado -->
	<div class="min-h-[60vh] flex items-center justify-center">
		<div class="container mx-auto px-4 py-8">
			<div class="text-center mb-8">
				<h1 class="h1 mb-4 text-primary-400">Bem-vindo ao Presença Aliança</h1>
				<p class="text-lg text-surface-600-400">
					Olá, <strong class="text-primary-400">{data.user.username}</strong>!
				</p>
			</div>
		</div>
	</div>
{:else}
	<!-- Formulário de Login -->
	<AuthLayout icon={LogIn} title="Login">
		{#if data.resetSuccess}
			<Alert variant="success" message="Senha alterada com sucesso! Faça login com sua nova senha." class="mb-6" />
		{/if}

		{#if form?.error}
			<Alert variant="error" message={form.error} class="mb-6" />
		{/if}

		<form method="POST" use:enhance class="space-y-4">
			<input type="hidden" name="redirectTo" value={data.redirectTo} />
			
			<label class="label">
				<span class="flex items-center gap-2 mb-1">
					<Mail class="w-4 h-4 text-surface-500" />
					Email ou Telefone
				</span>
				<input
					type="text"
					name="login"
					class="input"
					placeholder="seu@email.com ou (11) 99999-9999"
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
					placeholder="••••••••"
					required
				/>
			</label>

			<button type="submit" class="btn preset-filled-primary-500 w-full flex items-center justify-center gap-2">
				<LogIn class="w-4 h-4" />
				Entrar
			</button>
		</form>

		<div class="text-center mt-4">
			<a href={forgotPasswordHref} class="text-primary-500 hover:underline text-sm inline-flex items-center gap-1">
				<KeyRound class="w-4 h-4" />
				Esqueci minha senha
			</a>
		</div>

		{#snippet footer()}
			Não tem conta?
			<a href="{registerHref}?redirect={data.redirectTo}" class="anchor inline-flex items-center gap-1 ml-1">
				<UserPlus class="w-4 h-4" />
				Criar conta
			</a>
		{/snippet}
	</AuthLayout>
{/if}
