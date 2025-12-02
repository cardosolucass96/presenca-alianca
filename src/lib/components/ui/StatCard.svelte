<script lang="ts">
	import { Inbox } from 'lucide-svelte';

	interface Props {
		icon?: typeof Inbox;
		label: string;
		value: string | number;
		class?: string;
	}

	const { icon: Icon, label, value, class: className = '' }: Props = $props();
</script>

<div class="card bg-surface-100-900 p-6 border border-surface-200-800 {className}">
	<div class="flex items-center gap-4">
		{#if Icon}
			<div class="p-3 rounded-xl bg-primary-500/10">
				<Icon class="w-6 h-6 text-primary-500" />
			</div>
		{/if}
		<div>
			<p class="text-surface-600-400 text-sm">{label}</p>
			<p class="h3">{value}</p>
		</div>
	</div>
</div>
