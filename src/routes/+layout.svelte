<script lang="ts">
	import './layout.css';
	import { enhance } from '$app/forms';
	import { resolveRoute } from '$app/paths';
	import { LogOut, Settings, User, Shield } from 'lucide-svelte';
    import { onMount } from 'svelte';
    import { browser, dev } from '$app/environment';
    import { PUBLIC_CLARITY_ID } from '$env/static/public';

	let { children, data } = $props();

	// Clarity opt-out state (persisted in localStorage)
	let clarityOptedOut = false;
	let clarityLoaded = false;

	// Use the provided PUBLIC_CLARITY_ID or fallback to the id the user gave.
	// Best practice: set PUBLIC_CLARITY_ID in environment/Cloudflare Pages settings; fallback ensures immediate enablement if you provided the ID.
	const CLARITY_ID = PUBLIC_CLARITY_ID ?? 'ufs6xma0e5';

	const homeHref = resolveRoute('/');
	const adminHref = resolveRoute('/admin');
	const loginHref = resolveRoute('/login');

	// Load Microsoft Clarity respecting best practices:
	// - don't load in dev
	// - respect navigator.doNotTrack
	// - skip loading if user opted out via localStorage
	// - skip loading for admin users (avoid tracking internal users)
	function loadClarity(id: string) {
		if (clarityLoaded) return;
		try {
			(window as any).clarity = (window as any).clarity || function () { ((window as any).clarity.q = (window as any).clarity.q || []).push(arguments); };
			const t = document.createElement('script');
			t.async = true;
			t.src = `https://www.clarity.ms/tag/${id}`;
			const y = document.getElementsByTagName('script')[0];
			y.parentNode?.insertBefore(t, y);
			clarityLoaded = true;
		} catch (e) {
			// Fail silently — tracking should never break the app
			console.warn('Clarity load failed', e);
		}
	}

	function shouldLoadClarity() {
		if (!browser) return false;
		if (dev) return false; // don't load during local development
		if (!CLARITY_ID) return false;
		const dnt = navigator.doNotTrack || (window as any).doNotTrack || (navigator as any).msDoNotTrack;
		if (dnt === '1' || dnt === 'yes') return false;
		if (localStorage?.getItem('clarity_opt_out') === 'true') return false;
		if (data?.user?.role === 'admin') return false; // avoid tracking admin users
		return true;
	}

	onMount(() => {
		try {
			clarityOptedOut = localStorage?.getItem('clarity_opt_out') === 'true';
		} catch (e) {
			clarityOptedOut = false;
		}

		if (shouldLoadClarity()) {
			loadClarity(CLARITY_ID);
		}
	});

	function toggleClarityOptOut() {
		clarityOptedOut = !clarityOptedOut;
		try {
			localStorage.setItem('clarity_opt_out', clarityOptedOut ? 'true' : 'false');
		} catch (e) {
			// ignore
		}

		if (!clarityOptedOut && shouldLoadClarity()) {
			loadClarity(CLARITY_ID);
			// We can't reliably remove clarity if already loaded — reload page for a clean state
			location.reload();
		} else {
			// If opted out, reload to ensure we don't send events
			location.reload();
		}
	}
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
					<!-- Privacy / Clarity opt-out control -->
					{#if data.user.role !== 'admin'}
						<button
							class="btn btn-sm preset-outlined-surface-500"
							onclick={toggleClarityOptOut}
							title="Alternar rastreamento (opt-out)"
						>
							{#if clarityOptedOut}
								Ativar rastreamento
							{:else}
								Desativar rastreamento
							{/if}
						</button>
					{/if}
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
