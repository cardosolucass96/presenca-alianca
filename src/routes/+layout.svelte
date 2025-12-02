<script lang="ts">
	import './layout.css';
	import { enhance } from '$app/forms';
	import { resolveRoute } from '$app/paths';
	import { LogOut, Settings, User, Shield } from 'lucide-svelte';

	let { children, data } = $props();

	const homeHref = resolveRoute('/');
	const adminHref = resolveRoute('/admin');
	const loginHref = resolveRoute('/login');
</script>

<div class="min-h-screen bg-surface-50-950 text-surface-950-50">
	<header class="bg-surface-100-900 border-b border-surface-200-800">
		<nav class="container mx-auto px-4 py-3 flex items-center justify-between">
			<a href={homeHref} class="font-bold text-xl text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-2">
				<img src="/favicon.avif" alt="Logo" class="w-8 h-8" />
				Presença Aliança
			</a>
			
			<div class="flex items-center gap-3">
				{#if data.user}
					<div class="flex items-center gap-2 text-sm text-surface-600-400">
						<User class="w-4 h-4" />
						<span>{data.user.username}</span>
						{#if data.user.role === 'admin'}
							<span class="badge preset-filled-primary-500 text-xs flex items-center gap-1">
								<Shield class="w-3 h-3" />
								Admin
							</span>
						{/if}
					</div>
					{#if data.user.role === 'admin'}
						<a href={adminHref} class="btn btn-sm preset-outlined-surface-500 flex items-center gap-2">
							<Settings class="w-4 h-4" />
							Painel
						</a>
					{/if}
					<form action="/logout" method="POST" use:enhance>
						<button type="submit" class="btn btn-sm preset-outlined-error-500 flex items-center gap-2">
							<LogOut class="w-4 h-4" />
							Sair
						</button>
					</form>
				{:else}
					<a href={loginHref} class="btn btn-sm preset-filled-primary-500 flex items-center gap-2">
						<User class="w-4 h-4" />
						Entrar
					</a>
				{/if}
			</div>
		</nav>
	</header>

	<main>
		{@render children()}
	</main>
</div>
