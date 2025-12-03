<script lang="ts">
	import type { Event } from '$lib/server/db/schema';

	interface Attendee {
		user: {
			id: string;
			username: string;
			email: string;
			companyName: string;
		};
		attendance: {
			confirmedAt: Date;
		};
		productName: string | null;
		product?: { name: string } | null;
	}

	interface CategoryData {
		id: string;
		name: string;
		color: string;
	}

	interface Props {
		event: Event;
		categories: CategoryData[];
		attendees: Attendee[];
		onClose: () => void;
	}

	let { event, categories, attendees, onClose }: Props = $props();

	// Helper para obter o nome do cargo
	function getProductName(attendee: Attendee): string | null {
		return attendee.productName ?? attendee.product?.name ?? null;
	}

	// Métricas calculadas
	const totalAttendees = attendees.length;
	const attendanceRate = event.expectedAttendees > 0 
		? Math.round((totalAttendees / event.expectedAttendees) * 100) 
		: 0;

	// Agrupamento por empresa
	const companiesMap = new Map<string, Attendee[]>();
	attendees.forEach(a => {
		const company = a.user.companyName || 'Não informado';
		if (!companiesMap.has(company)) {
			companiesMap.set(company, []);
		}
		companiesMap.get(company)!.push(a);
	});
	const companiesData = Array.from(companiesMap.entries())
		.map(([name, members]) => ({ name, count: members.length, members }))
		.sort((a, b) => b.count - a.count);

	// Agrupamento por cargo (produto)
	const rolesMap = new Map<string, Attendee[]>();
	attendees.forEach(a => {
		const role = getProductName(a) || 'Não informado';
		if (!rolesMap.has(role)) {
			rolesMap.set(role, []);
		}
		rolesMap.get(role)!.push(a);
	});
	const rolesData = Array.from(rolesMap.entries())
		.map(([name, members]) => ({ name, count: members.length, members }))
		.sort((a, b) => b.count - a.count);

	// Top empresas (máximo 10)
	const topCompanies = companiesData.slice(0, 10);

	// Confirmações por hora (para análise de engajamento)
	const confirmationsByHour = new Map<string, number>();
	attendees.forEach(a => {
		const date = new Date(a.attendance.confirmedAt);
		const hour = date.toLocaleDateString('pt-BR') + ' ' + date.getHours().toString().padStart(2, '0') + ':00';
		confirmationsByHour.set(hour, (confirmationsByHour.get(hour) || 0) + 1);
	});

	function formatDate(date: Date) {
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

	function formatShortDate(date: Date) {
		return new Intl.DateTimeFormat('pt-BR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		}).format(new Date(date));
	}

	// Abre automaticamente o diálogo de impressão
	$effect(() => {
		// Pequeno delay para garantir que o conteúdo foi renderizado
		const timer = setTimeout(() => {
			window.print();
			// Fecha o modal após o diálogo de impressão
			// (tanto se imprimir quanto se cancelar)
			setTimeout(() => {
				onClose();
			}, 500);
		}, 100);
		
		return () => clearTimeout(timer);
	});
</script>

<!-- Conteúdo do relatório (sem overlay) -->
<div class="report-container">
	<div class="report-page">
		<!-- Cabeçalho -->
		<header class="report-header">
			<h1 class="report-title">RELATÓRIO DE PRESENÇA</h1>
			<h2 class="event-name">{event.name}</h2>
			<p class="event-date">{formatDate(event.dateTime)} - {formatTime(event.endTime)}</p>
			{#if categories.length > 0}
				<div class="categories-row">
					{#each categories as category}
						<span class="category-badge" style="background-color: {category.color}">
							{category.name}
						</span>
					{/each}
				</div>
			{/if}
		</header>

			<!-- Resumo Geral -->
			<section class="section">
				<h3 class="section-title">📊 Resumo Geral</h3>
				<div class="stats-grid">
					<div class="stat-card">
						<div class="stat-value">{totalAttendees}</div>
						<div class="stat-label">Confirmados</div>
					</div>
					<div class="stat-card">
						<div class="stat-value">{event.expectedAttendees}</div>
						<div class="stat-label">Esperados</div>
					</div>
					<div class="stat-card">
						<div class="stat-value">{attendanceRate}%</div>
						<div class="stat-label">Taxa de Presença</div>
					</div>
					<div class="stat-card">
						<div class="stat-value">{companiesData.length}</div>
						<div class="stat-label">Empresas</div>
					</div>
				</div>
			</section>

			<!-- Presença por Empresa -->
			<section class="section">
				<h3 class="section-title">🏢 Presença por Empresa</h3>
				{#if topCompanies.length === 0}
					<p class="empty-message">Nenhum participante confirmado.</p>
				{:else}
					<table class="data-table">
						<thead>
							<tr>
								<th>Empresa</th>
								<th class="text-center">Participantes</th>
								<th class="text-center">% do Total</th>
							</tr>
						</thead>
						<tbody>
							{#each topCompanies as company}
								<tr>
									<td>{company.name}</td>
									<td class="text-center">{company.count}</td>
									<td class="text-center">{Math.round((company.count / totalAttendees) * 100)}%</td>
								</tr>
							{/each}
						</tbody>
					</table>
					{#if companiesData.length > 10}
						<p class="table-note">Exibindo as 10 empresas com maior representatividade. Total: {companiesData.length} empresas.</p>
					{/if}
				{/if}
			</section>

			<!-- Presença por Cargo -->
			<section class="section">
				<h3 class="section-title">👔 Presença por Cargo</h3>
				{#if rolesData.length === 0}
					<p class="empty-message">Nenhum participante confirmado.</p>
				{:else}
					<table class="data-table">
						<thead>
							<tr>
								<th>Cargo</th>
								<th class="text-center">Participantes</th>
								<th class="text-center">% do Total</th>
							</tr>
						</thead>
						<tbody>
							{#each rolesData as role}
								<tr>
									<td>{role.name}</td>
									<td class="text-center">{role.count}</td>
									<td class="text-center">{totalAttendees > 0 ? Math.round((role.count / totalAttendees) * 100) : 0}%</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</section>

			<!-- Lista Completa de Participantes -->
			<section class="section page-break-before">
				<h3 class="section-title">📋 Lista de Participantes</h3>
				{#if attendees.length === 0}
					<p class="empty-message">Nenhum participante confirmado.</p>
				{:else}
					<table class="data-table data-table-compact">
						<thead>
							<tr>
								<th>#</th>
								<th>Nome</th>
								<th>Empresa</th>
								<th>Cargo</th>
								<th>Confirmado em</th>
							</tr>
						</thead>
						<tbody>
							{#each attendees as attendee, i}
								<tr>
									<td class="text-center">{i + 1}</td>
									<td>{attendee.user.username}</td>
									<td>{attendee.user.companyName}</td>
									<td>{getProductName(attendee) || '-'}</td>
									<td>{formatShortDate(attendee.attendance.confirmedAt)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</section>

		<!-- Rodapé -->
		<footer class="report-footer">
			<p>Aliança - Sistema de Gestão de Presença</p>
		</footer>
	</div>
</div>

<style>
	/* Container do relatório */
	.report-container {
		background: white;
		width: 100%;
		min-height: 100vh;
	}

	.report-page {
		padding: 15mm 20mm;
		color: #1f2937;
		font-family: 'Segoe UI', system-ui, sans-serif;
		font-size: 11pt;
		line-height: 1.4;
	}

	/* Cabeçalho */
	.report-header {
		border-bottom: 2px solid #6366f1;
		padding-bottom: 15px;
		margin-bottom: 20px;
		text-align: center;
	}

	.report-title {
		font-size: 14pt;
		color: #6366f1;
		margin: 0 0 10px 0;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	.event-name {
		font-size: 20pt;
		color: #111827;
		margin: 0 0 8px 0;
		font-weight: 700;
	}

	.event-date {
		font-size: 11pt;
		color: #6b7280;
		margin: 0 0 8px 0;
	}

	.categories-row {
		display: flex;
		gap: 6px;
		justify-content: center;
		flex-wrap: wrap;
	}

	.category-badge {
		padding: 2px 8px;
		border-radius: 4px;
		color: white;
		font-size: 9pt;
		font-weight: 500;
	}

	/* Seções */
	.section {
		margin-bottom: 20px;
	}

	.section-title {
		font-size: 13pt;
		color: #374151;
		border-bottom: 1px solid #e5e7eb;
		padding-bottom: 8px;
		margin: 0 0 12px 0;
		font-weight: 600;
	}

	/* Cards de estatísticas */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 12px;
	}

	.stat-card {
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 12px;
		text-align: center;
	}

	.stat-value {
		font-size: 22pt;
		font-weight: 700;
		color: #6366f1;
		line-height: 1;
	}

	.stat-label {
		font-size: 9pt;
		color: #6b7280;
		margin-top: 4px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	/* Tabelas */
	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 10pt;
	}

	.data-table th {
		background: #f3f4f6;
		padding: 8px 10px;
		text-align: left;
		font-weight: 600;
		color: #374151;
		border-bottom: 2px solid #e5e7eb;
	}

	.data-table td {
		padding: 6px 10px;
		border-bottom: 1px solid #e5e7eb;
		color: #4b5563;
	}

	.data-table tbody tr:nth-child(even) {
		background: #fafafa;
	}

	.data-table-compact th,
	.data-table-compact td {
		padding: 4px 8px;
		font-size: 9pt;
	}

	.text-center {
		text-align: center;
	}

	.table-note {
		font-size: 9pt;
		color: #9ca3af;
		margin-top: 8px;
		font-style: italic;
	}

	.empty-message {
		color: #9ca3af;
		text-align: center;
		padding: 20px;
		font-style: italic;
	}

	/* Rodapé */
	.report-footer {
		margin-top: 30px;
		padding-top: 15px;
		border-top: 1px solid #e5e7eb;
		text-align: center;
		font-size: 9pt;
		color: #9ca3af;
	}

	/* Quebra de página */
	.page-break-before {
		page-break-before: auto;
	}

	/* Estilos de impressão */
	@media print {
		.report-container {
			width: 100%;
		}

		.report-page {
			padding: 10mm 15mm;
		}

		@page {
			size: A4 portrait;
			margin: 10mm;
		}

		.page-break-before {
			page-break-before: auto;
		}

		.section {
			page-break-inside: avoid;
		}

		.data-table {
			page-break-inside: auto;
		}

		.data-table tr {
			page-break-inside: avoid;
			page-break-after: auto;
		}
	}
</style>
