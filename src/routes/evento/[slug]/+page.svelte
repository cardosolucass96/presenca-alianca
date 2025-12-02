<script lang="ts">
	import { enhance } from '$app/forms';
	import { Calendar, Clock, Users, CheckCircle, AlertTriangle, Video, LogIn, UserPlus, Loader2 } from 'lucide-svelte';
	import { Alert } from '$lib';

	let { data, form } = $props();

	let countdown = $state(3);
	let redirecting = $state(false);

	// Redirect to meet after confirmation
	$effect(() => {
		if (form?.success && form?.meetLink && !redirecting) {
			redirecting = true;
			const interval = setInterval(() => {
				countdown--;
				if (countdown <= 0) {
					clearInterval(interval);
					window.location.href = form.meetLink;
				}
			}, 1000);
		}
	});

	function formatFullDate(date: Date) {
		return new Intl.DateTimeFormat('pt-BR', {
			dateStyle: 'full',
			timeStyle: 'short'
		}).format(new Date(date));
	}

	function formatTime(date: Date) {
		return new Intl.DateTimeFormat('pt-BR', {
			timeStyle: 'short'
		}).format(new Date(date));
	}

	function isEventPast() {
		return new Date() > new Date(data.event.endTime);
	}

	function isEventOpen() {
		const now = new Date();
		return now >= new Date(data.event.dateTime) && now <= new Date(data.event.endTime);
	}

	function hasEventStarted() {
		return new Date() >= new Date(data.event.dateTime);
	}
</script>

<svelte:head>
	<title>{data.event.name}</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-4">
	<div class="card bg-surface-100-900 p-8 w-full max-w-lg border border-surface-200-800">
		<div class="text-center mb-4">
			<div class="inline-flex p-4 rounded-full bg-primary-500/10 mb-4">
				<Calendar class="w-8 h-8 text-primary-400" />
			</div>
			<h1 class="h2 text-primary-400">{data.event.name}</h1>
		</div>

		{#if data.categories && data.categories.length > 0}
			<div class="flex flex-wrap justify-center gap-1 mb-4">
				{#each data.categories as category}
					<span
						class="badge text-white text-xs"
						style="background-color: {category.color}"
					>
						{category.name}
					</span>
				{/each}
			</div>
		{/if}

		{#if data.event.description}
			<p class="text-surface-600-400 text-center mb-6">{data.event.description}</p>
		{/if}

		<div class="bg-surface-200-800 rounded-xl p-4 mb-6">
			<div class="flex items-center justify-center gap-2 text-lg">
				<Clock class="w-5 h-5 text-primary-400" />
				<span>{formatFullDate(data.event.dateTime)} - {formatTime(data.event.endTime)}</span>
			</div>
			{#if isEventOpen()}
				<div class="flex items-center justify-center gap-2 text-success-500 mt-2 font-bold">
					<div class="w-2 h-2 rounded-full bg-success-500 animate-pulse"></div>
					Evento em andamento!
				</div>
			{:else if hasEventStarted()}
				<div class="flex items-center justify-center gap-2 text-warning-500 mt-2">
					<AlertTriangle class="w-4 h-4" />
					Horário de confirmação encerrado
				</div>
			{/if}
		</div>

		<div class="flex justify-center gap-8 mb-6">
			<div class="text-center">
				<div class="flex items-center justify-center gap-2 text-2xl font-bold text-primary-400">
					<Users class="w-6 h-6" />
					{data.attendeesCount}
				</div>
				<p class="text-sm text-surface-600-400">Confirmados</p>
			</div>
			<div class="text-center">
				<p class="text-2xl font-bold">{data.event.expectedAttendees}</p>
				<p class="text-sm text-surface-600-400">Esperados</p>
			</div>
		</div>

		{#if isEventPast()}
			<Alert variant="warning" message="Este evento já aconteceu." />
		{:else if !data.user}
			<div class="space-y-4">
				<p class="text-center text-surface-600-400">
					Faça login ou crie uma conta para confirmar sua presença e receber o link do meet.
				</p>
				<div class="flex gap-4">
					<a
						href="/login?redirect=/evento/{data.event.slug}"
						class="btn preset-filled-primary-500 flex-1 flex items-center justify-center gap-2"
					>
						<LogIn class="w-4 h-4" />
						Fazer Login
					</a>
					<a
						href="/register?redirect=/evento/{data.event.slug}"
						class="btn preset-outlined-primary-500 flex-1 flex items-center justify-center gap-2"
					>
						<UserPlus class="w-4 h-4" />
						Criar Conta
					</a>
				</div>
			</div>
		{:else if data.isAttending || form?.success}
			<div class="space-y-4">
				<Alert variant="success">
					<div class="flex flex-col items-center gap-2">
						<div class="flex items-center gap-2">
							<CheckCircle class="w-5 h-5" />
							<p class="font-bold">Presença confirmada!</p>
						</div>
						{#if redirecting}
							<div class="flex items-center gap-2 text-sm">
								<Loader2 class="w-4 h-4 animate-spin" />
								Redirecionando para o Meet em {countdown}s...
							</div>
						{/if}
					</div>
				</Alert>

				<div class="bg-surface-200-800 rounded-xl p-4">
					<p class="text-sm text-surface-500 mb-3 text-center">Link do Meet:</p>
					<a
						href={form?.meetLink || data.event.meetLink}
						target="_blank"
						class="btn preset-filled-primary-500 w-full flex items-center justify-center gap-2"
					>
						<Video class="w-5 h-5" />
						Entrar na Reunião
					</a>
				</div>

				<p class="text-center text-sm text-surface-600-400">
					Olá, {data.user.username}! Nos vemos no evento.
				</p>
			</div>
		{:else}
			<div class="space-y-4">
				<p class="text-center text-surface-600-400">
					Olá, <strong class="text-primary-400">{data.user.username}</strong>! Confirme sua presença para receber o
					link do meet.
				</p>

				<form method="POST" action="?/confirm" use:enhance>
					<button type="submit" class="btn preset-filled-primary-500 w-full flex items-center justify-center gap-2">
						<CheckCircle class="w-4 h-4" />
						Confirmar Presença
					</button>
				</form>
			</div>
		{/if}
	</div>
</div>
