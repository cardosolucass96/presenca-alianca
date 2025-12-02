<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ArrowLeft, Inbox } from 'lucide-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';

	interface Props {
		icon?: typeof Inbox;
		title: string;
		subtitle?: string;
		backHref?: string;
		backLabel?: string;
		actions?: Snippet;
		children: Snippet;
	}

	const {
		icon,
		title,
		subtitle,
		backHref,
		backLabel = 'Voltar',
		actions,
		children
	}: Props = $props();
</script>

<div class="container mx-auto px-4 py-8">
	{#if backHref}
		<a href={backHref} class="inline-flex items-center gap-2 text-surface-600-400 hover:text-surface-900-50 mb-6 transition-colors">
			<ArrowLeft class="w-4 h-4" />
			<span>{backLabel}</span>
		</a>
	{/if}

	<PageHeader {icon} {title} {subtitle} {actions} />

	{@render children()}
</div>
