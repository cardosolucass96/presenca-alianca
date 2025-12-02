<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Inbox } from 'lucide-svelte';

	interface Props {
		icon?: typeof Inbox;
		title: string;
		subtitle?: string;
		children: Snippet;
		footer?: Snippet;
		maxWidth?: 'sm' | 'md' | 'lg';
	}

	const {
		icon: Icon,
		title,
		subtitle,
		children,
		footer,
		maxWidth = 'md'
	}: Props = $props();

	const widthClasses: Record<string, string> = {
		sm: 'max-w-sm',
		md: 'max-w-md',
		lg: 'max-w-lg'
	};
</script>

<div class="min-h-screen flex items-center justify-center p-4">
	<div class="card bg-surface-100-900 p-8 w-full {widthClasses[maxWidth]} border border-surface-200-800">
		<!-- Header -->
		<div class="text-center mb-8">
			{#if Icon}
				<div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/10 mb-4">
					<Icon class="w-8 h-8 text-primary-500" />
				</div>
			{/if}
			<h1 class="h2 mb-2">{title}</h1>
			{#if subtitle}
				<p class="text-surface-600-400">{subtitle}</p>
			{/if}
		</div>

		<!-- Content -->
		{@render children()}

		<!-- Footer -->
		{#if footer}
			<div class="mt-6 text-center text-sm text-surface-600-400">
				{@render footer()}
			</div>
		{/if}
	</div>
</div>
