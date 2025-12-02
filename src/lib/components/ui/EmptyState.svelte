<script lang="ts">
	import { Inbox } from 'lucide-svelte';

	interface Props {
		icon?: typeof Inbox;
		title?: string;
		message: string;
		class?: string;
	}

	const { icon: Icon = Inbox, title, message, class: className = '' }: Props = $props();
</script>

<div class="p-8 text-center {className}">
	<Icon class="w-12 h-12 text-surface-500 mx-auto mb-4" />
	{#if title}
		<h3 class="h4 mb-2">{title}</h3>
	{/if}
	<p class="text-surface-600-400">{message}</p>
</div>
