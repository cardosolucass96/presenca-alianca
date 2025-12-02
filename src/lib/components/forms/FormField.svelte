<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Inbox } from 'lucide-svelte';

	type InputType = 'text' | 'email' | 'password' | 'tel' | 'number' | 'date' | 'datetime-local' | 'url';
	type AutoComplete = 'on' | 'off' | 'name' | 'email' | 'username' | 'new-password' | 'current-password' | 'tel' | 'organization';

	interface BaseProps {
		name: string;
		label: string;
		icon?: typeof Inbox;
		error?: string;
		required?: boolean;
		class?: string;
	}

	interface InputProps extends BaseProps {
		type?: InputType;
		value?: string | number;
		placeholder?: string;
		disabled?: boolean;
		readonly?: boolean;
		autocomplete?: AutoComplete;
	}

	interface TextareaProps extends BaseProps {
		type: 'textarea';
		value?: string;
		placeholder?: string;
		rows?: number;
		disabled?: boolean;
	}

	interface SelectProps extends BaseProps {
		type: 'select';
		value?: string | number;
		options: Snippet;
		disabled?: boolean;
	}

	type Props = InputProps | TextareaProps | SelectProps;

	const {
		name,
		label,
		icon: Icon,
		error,
		required = false,
		class: className = '',
		...rest
	}: Props = $props();

	const inputType = $derived('type' in rest ? rest.type : 'text');
	const isTextarea = $derived(inputType === 'textarea');
	const isSelect = $derived(inputType === 'select');
</script>

<div class="space-y-1 {className}">
	<label for={name} class="label flex items-center gap-2">
		{#if Icon}
			<Icon class="w-4 h-4 text-surface-600-400" />
		{/if}
		<span>{label}</span>
		{#if required}
			<span class="text-error-500">*</span>
		{/if}
	</label>

	{#if isTextarea}
		{@const props = rest as TextareaProps}
		<textarea
			id={name}
			{name}
			class="input"
			class:input-error={error}
			value={props.value ?? ''}
			placeholder={props.placeholder}
			rows={props.rows ?? 3}
			disabled={props.disabled}
			{required}
		></textarea>
	{:else if isSelect}
		{@const props = rest as SelectProps}
		<select
			id={name}
			{name}
			class="select"
			class:input-error={error}
			value={props.value ?? ''}
			disabled={props.disabled}
			{required}
		>
			{@render props.options()}
		</select>
	{:else}
		{@const props = rest as InputProps}
		<input
			id={name}
			{name}
			type={props.type ?? 'text'}
			class="input"
			class:input-error={error}
			value={props.value ?? ''}
			placeholder={props.placeholder}
			disabled={props.disabled}
			readonly={props.readonly}
			{required}
		/>
	{/if}

	{#if error}
		<p class="text-sm text-error-500">{error}</p>
	{/if}
</div>
