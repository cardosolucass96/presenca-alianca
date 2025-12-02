<script lang="ts">
	import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	type AlertVariant = 'error' | 'success' | 'warning' | 'info';

	interface Props {
		variant?: AlertVariant;
		message?: string;
		icon?: typeof AlertCircle;
		class?: string;
		children?: Snippet;
	}

	const { variant = 'info', message, icon, class: className = '', children }: Props = $props();

	const styles: Record<AlertVariant, string> = {
		error: 'bg-error-500/15 text-error-400 border-error-500/30',
		success: 'bg-success-500/15 text-success-400 border-success-500/30',
		warning: 'bg-warning-500/15 text-warning-500 border-warning-500/30',
		info: 'bg-surface-500/15 text-surface-400 border-surface-500/30'
	};

	const defaultIcons = {
		error: AlertCircle,
		success: CheckCircle,
		warning: AlertTriangle,
		info: Info
	};

	const IconComponent = $derived(icon ?? defaultIcons[variant]);
</script>

<div class="flex items-center gap-3 p-4 rounded-xl border {styles[variant]} {className}" role="alert">
	<IconComponent class="w-5 h-5 shrink-0" />
	{#if children}
		{@render children()}
	{:else if message}
		<p class="text-sm font-medium">{message}</p>
	{/if}
</div>
