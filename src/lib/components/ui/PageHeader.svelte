<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Inbox } from 'lucide-svelte';

	interface Props {
		icon?: typeof Inbox;
		title: string;
		subtitle?: string;
		class?: string;
		actions?: Snippet;
	}

	const { icon: Icon, title, subtitle, class: className = '', actions }: Props = $props();
</script>

<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 {className}">
	<div class="flex items-center gap-3">
		{#if Icon}
			<div class="p-3 rounded-xl bg-primary-500/10">
				<Icon class="w-6 h-6 text-primary-500" />
			</div>
		{/if}
		<div>
			<h1 class="h2">{title}</h1>
			{#if subtitle}
				<p class="text-surface-600-400">{subtitle}</p>
			{/if}
		</div>
	</div>
	{#if actions}
		<div class="flex items-center gap-2">
			{@render actions()}
		</div>
	{/if}
</div>
