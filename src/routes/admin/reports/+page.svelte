<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import {
		BarChart3,
		Users,
		Calendar,
		TrendingUp,
		Percent,
		Target,
		Filter,
		Download,
		ChevronUp,
		ChevronDown,
		RefreshCw,
		ArrowUpDown,
		X,
		Printer
	} from 'lucide-svelte';
	import { AdminPage, StatCard } from '$lib';

	const { data } = $props();

	// Filter state
	let fromDate = $state(data.filters.fromDate || '');
	let toDate = $state(data.filters.toDate || '');
	let categoryId = $state(data.filters.categoryId || '');
	let productId = $state(data.filters.productId || '');

	// Check if any filter is active
	const hasActiveFilters = $derived(fromDate || toDate || categoryId || productId);

	// Sorting for users table
	type UserSortColumn = 'username' | 'companyName' | 'productName' | 'attendedEvents' | 'attendanceRate' | 'lastAttendance';
	let userSortColumn = $state<UserSortColumn>('attendanceRate');
	let userSortDirection = $state<'asc' | 'desc'>('desc');

	// Sorting for categories table
	type CategorySortColumn = 'categoryName' | 'totalEvents' | 'totalAttendees' | 'averageAttendanceRate';
	let categorySortColumn = $state<CategorySortColumn>('totalEvents');
	let categorySortDirection = $state<'asc' | 'desc'>('desc');

	// Sorting for events table
	type EventSortColumn = 'eventName' | 'eventDate' | 'expectedAttendees' | 'actualAttendees' | 'attendanceRate';
	let eventSortColumn = $state<EventSortColumn>('eventDate');
	let eventSortDirection = $state<'asc' | 'desc'>('desc');

	// Sorting for products table
	type ProductSortColumn = 'productName' | 'totalUsers' | 'totalAttendances';
	let productSortColumn = $state<ProductSortColumn>('totalUsers');
	let productSortDirection = $state<'asc' | 'desc'>('desc');

	// Search filter for users
	let userSearch = $state('');

	// Chart instances (using $state for bind:this)
	let attendanceChartCanvas = $state<HTMLCanvasElement | null>(null);
	let categoryChartCanvas = $state<HTMLCanvasElement | null>(null);
	let monthlyChartCanvas = $state<HTMLCanvasElement | null>(null);
	let attendanceChartInstance: any = null;
	let categoryChartInstance: any = null;
	let monthlyChartInstance: any = null;
	// Whether charts have been initialized (avoid loading chart.js on initial page load)
	let chartsInitialized = $state(false);

	// Generic sort function
	function sortData<T>(items: T[], column: keyof T, direction: 'asc' | 'desc'): T[] {
		return [...items].sort((a, b) => {
			let aVal = a[column];
			let bVal = b[column];

			// Handle null/undefined
			if (aVal == null) aVal = '' as any;
			if (bVal == null) bVal = '' as any;

			// Handle strings
			if (typeof aVal === 'string') aVal = aVal.toLowerCase() as any;
			if (typeof bVal === 'string') bVal = bVal.toLowerCase() as any;

			// Handle dates
			if (aVal instanceof Date) aVal = aVal.getTime() as any;
			if (bVal instanceof Date) bVal = bVal.getTime() as any;

			if (aVal < bVal) return direction === 'asc' ? -1 : 1;
			if (aVal > bVal) return direction === 'asc' ? 1 : -1;
			return 0;
		});
	}

	// Sorted data
	const sortedUsers = $derived(() => {
		let users = [...data.usersAttendance];

		// Apply search filter
		if (userSearch) {
			const search = userSearch.toLowerCase();
			users = users.filter(
				(u) =>
					u.username.toLowerCase().includes(search) ||
					u.email.toLowerCase().includes(search) ||
					u.companyName.toLowerCase().includes(search) ||
					(u.productName && u.productName.toLowerCase().includes(search))
			);
		}

		return sortData(users, userSortColumn, userSortDirection);
	});

	const sortedCategories = $derived(() => {
		return sortData(data.categoryStats, categorySortColumn, categorySortDirection);
	});

	const sortedEvents = $derived(() => {
		return sortData(data.eventsAttendance, eventSortColumn, eventSortDirection);
	});

	const sortedProducts = $derived(() => {
		return sortData(data.productStats.filter(p => p.totalUsers > 0), productSortColumn, productSortDirection);
	});

	// Toggle sort functions
	function toggleUserSort(column: UserSortColumn) {
		if (userSortColumn === column) {
			userSortDirection = userSortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			userSortColumn = column;
			userSortDirection = 'desc';
		}
	}

	function toggleCategorySort(column: CategorySortColumn) {
		if (categorySortColumn === column) {
			categorySortDirection = categorySortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			categorySortColumn = column;
			categorySortDirection = 'desc';
		}
	}

	function toggleEventSort(column: EventSortColumn) {
		if (eventSortColumn === column) {
			eventSortDirection = eventSortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			eventSortColumn = column;
			eventSortDirection = 'desc';
		}
	}

	function toggleProductSort(column: ProductSortColumn) {
		if (productSortColumn === column) {
			productSortDirection = productSortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			productSortColumn = column;
			productSortDirection = 'desc';
		}
	}

	function applyFilters() {
		const params = new URLSearchParams();
		if (fromDate) params.set('fromDate', fromDate);
		if (toDate) params.set('toDate', toDate);
		if (categoryId) params.set('categoryId', categoryId);
		if (productId) params.set('productId', productId);
		goto(`/admin/reports?${params.toString()}`);
	}

	function clearFilters() {
		fromDate = '';
		toDate = '';
		categoryId = '';
		productId = '';
		goto('/admin/reports');
	}

	function formatDate(date: Date | string | null) {
		if (!date) return '-';
		const d = typeof date === 'string' ? new Date(date) : date;
		return d.toLocaleDateString('pt-BR');
	}

	function formatMonth(monthStr: string) {
		const [year, month] = monthStr.split('-');
		const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
		return `${monthNames[parseInt(month) - 1]}/${year.slice(2)}`;
	}

	function getAttendanceColor(rate: number) {
		if (rate >= 80) return 'text-green-500';
		if (rate >= 60) return 'text-yellow-500';
		if (rate >= 40) return 'text-orange-500';
		return 'text-red-500';
	}

	function getAttendanceBg(rate: number) {
		if (rate >= 80) return 'bg-green-500/20';
		if (rate >= 60) return 'bg-yellow-500/20';
		if (rate >= 40) return 'bg-orange-500/20';
		return 'bg-red-500/20';
	}

	async function initCharts() {
		const Chart = (await import('chart.js/auto')).default;

		// Destroy existing charts
		if (attendanceChartInstance) attendanceChartInstance.destroy();
		if (categoryChartInstance) categoryChartInstance.destroy();
		if (monthlyChartInstance) monthlyChartInstance.destroy();

		// Attendance Trend Chart (Bar)
		if (attendanceChartCanvas && data.attendanceTrends.length > 0) {
			const ctx = attendanceChartCanvas.getContext('2d');
			if (ctx) {
				attendanceChartInstance = new Chart(ctx, {
					type: 'bar',
					data: {
						labels: data.attendanceTrends.map((t) => t.eventName.slice(0, 15) + (t.eventName.length > 15 ? '...' : '')),
						datasets: [
							{
								label: 'Esperados',
								data: data.attendanceTrends.map((t) => t.expected),
								backgroundColor: 'rgba(99, 102, 241, 0.3)',
								borderColor: 'rgb(99, 102, 241)',
								borderWidth: 1
							},
							{
								label: 'Presentes',
								data: data.attendanceTrends.map((t) => t.attendees),
								backgroundColor: 'rgba(34, 197, 94, 0.7)',
								borderColor: 'rgb(34, 197, 94)',
								borderWidth: 1
							}
						]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						plugins: {
							legend: {
								position: 'top',
								labels: { color: '#94a3b8' }
							},
							tooltip: {
								callbacks: {
									afterBody: function(context: any) {
										const idx = context[0].dataIndex;
										const trend = data.attendanceTrends[idx];
										return `Taxa: ${trend.attendanceRate}%`;
									}
								}
							}
						},
						scales: {
							x: {
								ticks: { color: '#94a3b8' },
								grid: { color: 'rgba(148, 163, 184, 0.1)' }
							},
							y: {
								ticks: { color: '#94a3b8' },
								grid: { color: 'rgba(148, 163, 184, 0.1)' },
								beginAtZero: true
							}
						}
					}
				});
			}
		}

		// Category Stats Chart (Doughnut)
		if (categoryChartCanvas && data.categoryStats.length > 0) {
			const ctx = categoryChartCanvas.getContext('2d');
			if (ctx) {
				categoryChartInstance = new Chart(ctx, {
					type: 'doughnut',
					data: {
						labels: data.categoryStats.map((c) => c.categoryName),
						datasets: [
							{
								data: data.categoryStats.map((c) => c.totalEvents),
								backgroundColor: data.categoryStats.map((c) => c.categoryColor),
								borderColor: data.categoryStats.map((c) => c.categoryColor),
								borderWidth: 2
							}
						]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						plugins: {
							legend: {
								position: 'right',
								labels: { color: '#94a3b8' }
							},
							tooltip: {
								callbacks: {
									afterLabel: function(context: any) {
										const idx = context.dataIndex;
										const cat = data.categoryStats[idx];
										return `Taxa média: ${cat.averageAttendanceRate}%`;
									}
								}
							}
						}
					}
				});
			}
		}

		// Monthly Trends Chart (Line)
		if (monthlyChartCanvas && data.monthlyTrends.length > 0) {
			const ctx = monthlyChartCanvas.getContext('2d');
			if (ctx) {
				monthlyChartInstance = new Chart(ctx, {
					type: 'line',
					data: {
						labels: data.monthlyTrends.map((t) => formatMonth(t.month)),
						datasets: [
							{
								label: 'Eventos',
								data: data.monthlyTrends.map((t) => t.events),
								borderColor: 'rgb(99, 102, 241)',
								backgroundColor: 'rgba(99, 102, 241, 0.1)',
								tension: 0.3,
								fill: true,
								yAxisID: 'y'
							},
							{
								label: 'Taxa de Presença (%)',
								data: data.monthlyTrends.map((t) => t.rate),
								borderColor: 'rgb(34, 197, 94)',
								backgroundColor: 'rgba(34, 197, 94, 0.1)',
								tension: 0.3,
								fill: false,
								yAxisID: 'y1'
							}
						]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						interaction: {
							mode: 'index',
							intersect: false
						},
						plugins: {
							legend: {
								position: 'top',
								labels: { color: '#94a3b8' }
							}
						},
						scales: {
							x: {
								ticks: { color: '#94a3b8' },
								grid: { color: 'rgba(148, 163, 184, 0.1)' }
							},
							y: {
								type: 'linear',
								display: true,
								position: 'left',
								ticks: { color: '#94a3b8' },
								grid: { color: 'rgba(148, 163, 184, 0.1)' },
								beginAtZero: true,
								title: {
									display: true,
									text: 'Eventos',
									color: '#94a3b8'
								}
							},
							y1: {
								type: 'linear',
								display: true,
								position: 'right',
								ticks: { color: '#94a3b8' },
								grid: { drawOnChartArea: false },
								beginAtZero: true,
								max: 100,
								title: {
									display: true,
									text: 'Taxa (%)',
									color: '#94a3b8'
								}
							}
						}
					}
				});
			}
		}
	}

	onMount(() => {
		// Lazy-initialize charts during idle time so the page isn't blocked by the chart.js import
		const initIfNeeded = () => {
			if (!chartsInitialized) {
				chartsInitialized = true;
				initCharts();
			}
		};

		if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
			(window as any).requestIdleCallback(initIfNeeded, { timeout: 2000 });
		} else {
			// Fallback after a short delay
			setTimeout(initIfNeeded, 800);
		}
	});

	// Re-init charts when data changes only if charts were initialized
	$effect(() => {
	 	if (data && chartsInitialized) {
	 		initCharts();
	 	}
	});

	// Ensure charts are initialized (lazy) — call this before printing or when needed
	async function ensureChartsInitialized() {
	 	if (chartsInitialized) return;
	 	chartsInitialized = true;
	 	await initCharts();
	}

	async function exportToXLSX() {
		const XLSX = await import('xlsx');
		
		// Prepare detailed attendance data (1 row per attendance)
		const rows = data.detailedAttendances.map(a => ({
			'Nome': a.userName,
			'Email': a.userEmail,
			'Telefone': a.userPhone || '-',
			'Empresa': a.userCompany,
			'Cargo': a.userFunction || '-',
			'Evento': a.eventName,
			'Data do Evento': formatDateFull(a.eventDate),
			'Horário Início': formatTime(a.eventDate),
			'Horário Fim': formatTime(a.eventEndTime),
			'Categorias': a.eventCategories || '-',
			'Confirmado em': formatDateFull(a.confirmedAt),
			'Hora Confirmação': formatTime(a.confirmedAt)
		}));

		// Create workbook and worksheet
		const wb = XLSX.utils.book_new();
		const ws = XLSX.utils.json_to_sheet(rows);

		// Set column widths
		ws['!cols'] = [
			{ wch: 25 }, // Nome
			{ wch: 30 }, // Email
			{ wch: 15 }, // Telefone
			{ wch: 20 }, // Empresa
			{ wch: 15 }, // Cargo
			{ wch: 30 }, // Evento
			{ wch: 12 }, // Data do Evento
			{ wch: 10 }, // Horário Início
			{ wch: 10 }, // Horário Fim
			{ wch: 25 }, // Categorias
			{ wch: 12 }, // Confirmado em
			{ wch: 10 }, // Hora Confirmação
		];

		XLSX.utils.book_append_sheet(wb, ws, 'Presenças');

		// Generate filename with date
		const filename = `presencas-${new Date().toISOString().split('T')[0]}.xlsx`;
		
		// Download
		XLSX.writeFile(wb, filename);
	}

	function formatDateFull(date: Date | string) {
		const d = typeof date === 'string' ? new Date(date) : date;
		return d.toLocaleDateString('pt-BR');
	}

	function formatTime(date: Date | string) {
		const d = typeof date === 'string' ? new Date(date) : date;
		return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
	}

	async function handlePrint() {
	 	// Make sure charts are ready (imports + render) before opening print dialog
	 	await ensureChartsInitialized();
		// Wait a microtask to ensure canvas reflow/render
		await Promise.resolve();
		window.print();
	}
</script>

{#snippet sortIcon(isActive: boolean, direction: 'asc' | 'desc')}
	{#if isActive}
		{#if direction === 'asc'}
			<ChevronUp class="w-4 h-4" />
		{:else}
			<ChevronDown class="w-4 h-4" />
		{/if}
	{:else}
		<ArrowUpDown class="w-3 h-3 opacity-40" />
	{/if}
{/snippet}

{#snippet sortableHeader(label: string, isActive: boolean, direction: 'asc' | 'desc', onclick: () => void, center?: boolean)}
	<button 
		{onclick} 
		class="flex items-center gap-1 hover:text-primary-500 transition-colors w-full {center ? 'justify-center' : ''}"
	>
		{label}
		{@render sortIcon(isActive, direction)}
	</button>
{/snippet}

<svelte:head>
	<title>Relatórios | Admin</title>
	<style>
		@media print {
			/* Reset background colors */
			* {
				background: white !important;
				color: black !important;
				-webkit-print-color-adjust: exact !important;
				print-color-adjust: exact !important;
			}

			/* Hide elements not needed for print */
			.no-print,
			nav,
			.sticky,
			button:not(.print-show),
			input,
			select {
				display: none !important;
			}

			/* Page setup */
			@page {
				size: A4 landscape;
				margin: 1cm;
			}

			body {
				font-size: 10pt !important;
			}

			/* Cards styling for print */
			.card {
				box-shadow: none !important;
				border: 1px solid #ddd !important;
				page-break-inside: avoid;
				margin-bottom: 0.5cm !important;
			}

			/* Grid adjustments for print */
			.grid {
				display: grid !important;
			}

			.lg\:grid-cols-2 {
				grid-template-columns: 1fr 1fr !important;
			}

			.lg\:grid-cols-3 {
				grid-template-columns: 1fr 1fr 1fr !important;
			}

			.lg\:grid-cols-5 {
				grid-template-columns: repeat(5, 1fr) !important;
			}

			/* Charts */
			canvas {
				max-height: 200px !important;
			}

			.h-80 {
				height: 200px !important;
			}

			.h-64 {
				height: 180px !important;
			}

			/* Tables */
			table {
				width: 100% !important;
				font-size: 9pt !important;
			}

			th, td {
				padding: 4px 8px !important;
				border: 1px solid #ddd !important;
			}

			thead tr {
				background-color: #f5f5f5 !important;
			}

			/* Badges with colors preserved */
			.badge, span[class*="rounded-full"] {
				border: 1px solid #999 !important;
			}

			/* StatCards */
			.h3 {
				font-size: 14pt !important;
			}

			/* Page breaks */
			.mb-8 {
				page-break-after: auto;
			}

			/* Print header */
			.print-header {
				display: block !important;
				text-align: center;
				margin-bottom: 1cm;
				border-bottom: 2px solid #333;
				padding-bottom: 0.5cm;
			}

			.print-header h1 {
				font-size: 18pt !important;
				font-weight: bold;
				margin: 0;
			}

			.print-header p {
				font-size: 10pt !important;
				color: #666 !important;
				margin: 0.2cm 0 0 0;
			}
		}

		/* Hide print header on screen */
		.print-header {
			display: none;
		}
	</style>
</svelte:head>

<!-- Print Header (only visible when printing) -->
<div class="print-header">
	<h1>Relatório de Presenças - Aliança</h1>
	<p>Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
	{#if hasActiveFilters}
		<p>Filtros: {fromDate ? `De ${fromDate}` : ''} {toDate ? `Até ${toDate}` : ''} {categoryId ? `| Categoria selecionada` : ''} {productId ? `| Cargo selecionado` : ''}</p>
	{/if}
</div>

<AdminPage icon={BarChart3} title="Relatórios e Analytics" subtitle="Análise de presença e engajamento">

	<!-- Sticky Filter Bar -->
	<div class="sticky top-0 z-50 bg-surface-100-900 border border-surface-200-800 rounded-xl shadow-lg mb-6">
		<div class="px-4 py-3">
			<div class="flex flex-wrap items-center gap-3">
				<div class="flex items-center gap-2 text-primary-500">
					<Filter class="w-5 h-5" />
					<span class="font-semibold hidden sm:inline">Filtros:</span>
				</div>
				
				<div class="flex flex-wrap items-center gap-2 flex-1">
					<input 
						type="date" 
						bind:value={fromDate} 
						class="input !py-1.5 !px-2 text-sm w-32"
						placeholder="Data inicial"
						title="Data inicial"
					/>
					<span class="text-surface-500 hidden sm:inline">até</span>
					<input 
						type="date" 
						bind:value={toDate} 
						class="input !py-1.5 !px-2 text-sm w-32"
						placeholder="Data final"
						title="Data final"
					/>
					
					<select bind:value={categoryId} class="select !py-1.5 !px-2 text-sm w-40">
						<option value="">Todas categorias</option>
						{#each data.categories as category}
							<option value={category.id}>{category.name}</option>
						{/each}
					</select>
					
					<select bind:value={productId} class="select !py-1.5 !px-2 text-sm w-36">
						<option value="">Todos cargos</option>
						{#each data.products as product}
							<option value={product.id}>{product.name}</option>
						{/each}
					</select>
				</div>
				
				<div class="flex items-center gap-2">
					<button onclick={applyFilters} class="btn btn-sm preset-filled-primary-500 gap-1">
						<Filter class="w-4 h-4" />
						Aplicar
					</button>
					{#if hasActiveFilters}
						<button onclick={clearFilters} class="btn btn-sm preset-outlined-warning-500 gap-1" title="Limpar filtros">
							<X class="w-4 h-4" />
							<span class="hidden sm:inline">Limpar</span>
						</button>
					{/if}
					<button onclick={exportToXLSX} class="btn btn-sm preset-filled-success-500 gap-1" title="Exportar Excel">
						<Download class="w-4 h-4" />
						<span class="hidden md:inline">Excel</span>
					</button>
					<button onclick={handlePrint} class="btn btn-sm preset-outlined-surface-500 gap-1" title="Imprimir relatório">
						<Printer class="w-4 h-4" />
						<span class="hidden md:inline">Imprimir</span>
					</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Overview Stats -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
		<StatCard icon={Calendar} label="Total de Eventos" value={data.overviewStats.totalEvents} />
		<StatCard icon={Users} label="Total de Usuários" value={data.overviewStats.totalUsers} />
		<StatCard icon={Target} label="Presenças Confirmadas" value={data.overviewStats.totalAttendances} />
		<StatCard icon={Target} label="Esperados" value={data.overviewStats.totalExpectedAttendees} />
		<div class="card bg-surface-100-900 p-6 border border-surface-200-800">
			<div class="flex items-center gap-4">
				<div class="p-3 rounded-xl {getAttendanceBg(data.overviewStats.averageAttendanceRate)}">
					<Percent class="w-6 h-6 {getAttendanceColor(data.overviewStats.averageAttendanceRate)}" />
				</div>
				<div>
					<p class="text-surface-600-400 text-sm">Taxa Média</p>
					<p class="h3 {getAttendanceColor(data.overviewStats.averageAttendanceRate)}">{data.overviewStats.averageAttendanceRate}%</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Charts Row -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
		<!-- Attendance by Event -->
		<div class="card bg-surface-100-900 p-6 border border-surface-200-800">
			<h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
				<BarChart3 class="w-5 h-5 text-primary-500" />
				Presença por Evento
			</h3>
			<div class="h-80">
				{#if data.attendanceTrends.length > 0}
					<canvas bind:this={attendanceChartCanvas}></canvas>
				{:else}
					<div class="h-full flex items-center justify-center text-surface-500">
						Nenhum dado disponível
					</div>
				{/if}
			</div>
		</div>

		<!-- Monthly Trends -->
		<div class="card bg-surface-100-900 p-6 border border-surface-200-800">
			<h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
				<TrendingUp class="w-5 h-5 text-primary-500" />
				Tendência Mensal
			</h3>
			<div class="h-80">
				{#if data.monthlyTrends.length > 0}
					<canvas bind:this={monthlyChartCanvas}></canvas>
				{:else}
					<div class="h-full flex items-center justify-center text-surface-500">
						Nenhum dado disponível
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Category Stats and Distribution -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
		<!-- Category Chart -->
		<div class="card bg-surface-100-900 p-6 border border-surface-200-800">
			<h3 class="text-lg font-semibold mb-4">Distribuição por Categoria</h3>
			<div class="h-64">
				{#if data.categoryStats.length > 0}
					<canvas bind:this={categoryChartCanvas}></canvas>
				{:else}
					<div class="h-full flex items-center justify-center text-surface-500">
						Nenhuma categoria cadastrada
					</div>
				{/if}
			</div>
		</div>

		<!-- Category Stats Table -->
		<div class="card bg-surface-100-900 p-6 border border-surface-200-800 lg:col-span-2">
			<h3 class="text-lg font-semibold mb-4">Estatísticas por Categoria</h3>
			{#if data.categoryStats.length > 0}
				<div class="overflow-x-auto">
					<table class="table">
						<thead>
							<tr>
								<th>
									{@render sortableHeader('Categoria', categorySortColumn === 'categoryName', categorySortDirection, () => toggleCategorySort('categoryName'))}
								</th>
								<th class="text-center">
									{@render sortableHeader('Eventos', categorySortColumn === 'totalEvents', categorySortDirection, () => toggleCategorySort('totalEvents'), true)}
								</th>
								<th class="text-center">
									{@render sortableHeader('Presenças', categorySortColumn === 'totalAttendees', categorySortDirection, () => toggleCategorySort('totalAttendees'), true)}
								</th>
								<th class="text-center">
									{@render sortableHeader('Taxa Média', categorySortColumn === 'averageAttendanceRate', categorySortDirection, () => toggleCategorySort('averageAttendanceRate'), true)}
								</th>
							</tr>
						</thead>
						<tbody>
							{#each sortedCategories() as cat}
								<tr>
									<td>
										<span class="inline-flex items-center gap-2">
											<span class="w-3 h-3 rounded-full" style="background-color: {cat.categoryColor}"></span>
											{cat.categoryName}
										</span>
									</td>
									<td class="text-center">{cat.totalEvents}</td>
									<td class="text-center">{cat.totalAttendees}</td>
									<td class="text-center">
										<span class="px-2 py-1 rounded-full text-sm {getAttendanceBg(cat.averageAttendanceRate)} {getAttendanceColor(cat.averageAttendanceRate)}">
											{cat.averageAttendanceRate}%
										</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="text-surface-500 text-center py-8">Nenhuma categoria cadastrada</p>
			{/if}
		</div>
	</div>

	<!-- Product Stats -->
	<div class="card bg-surface-100-900 p-6 border border-surface-200-800 mb-8">
		<h3 class="text-lg font-semibold mb-4">Estatísticas por Cargo</h3>
		{#if data.productStats.filter(p => p.totalUsers > 0).length > 0}
			<div class="overflow-x-auto">
				<table class="table">
					<thead>
						<tr>
							<th>
								{@render sortableHeader('Cargo', productSortColumn === 'productName', productSortDirection, () => toggleProductSort('productName'))}
							</th>
							<th class="text-center">
								{@render sortableHeader('Usuários', productSortColumn === 'totalUsers', productSortDirection, () => toggleProductSort('totalUsers'), true)}
							</th>
							<th class="text-center">
								{@render sortableHeader('Presenças', productSortColumn === 'totalAttendances', productSortDirection, () => toggleProductSort('totalAttendances'), true)}
							</th>
						</tr>
					</thead>
					<tbody>
						{#each sortedProducts() as product}
							<tr>
								<td class="font-medium">{product.productName}</td>
								<td class="text-center">{product.totalUsers}</td>
								<td class="text-center">{product.totalAttendances}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="text-surface-500 text-center py-8">Nenhum cargo cadastrado</p>
		{/if}
	</div>

	<!-- Events Table -->
	<div class="card bg-surface-100-900 p-6 border border-surface-200-800 mb-8">
		<h3 class="text-lg font-semibold mb-4">Eventos</h3>
		{#if data.eventsAttendance.length > 0}
			<div class="overflow-x-auto">
				<table class="table">
					<thead>
						<tr>
							<th>
								{@render sortableHeader('Evento', eventSortColumn === 'eventName', eventSortDirection, () => toggleEventSort('eventName'))}
							</th>
							<th>
								{@render sortableHeader('Data', eventSortColumn === 'eventDate', eventSortDirection, () => toggleEventSort('eventDate'))}
							</th>
							<th>Categorias</th>
							<th class="text-center">
								{@render sortableHeader('Esperados', eventSortColumn === 'expectedAttendees', eventSortDirection, () => toggleEventSort('expectedAttendees'), true)}
							</th>
							<th class="text-center">
								{@render sortableHeader('Presentes', eventSortColumn === 'actualAttendees', eventSortDirection, () => toggleEventSort('actualAttendees'), true)}
							</th>
							<th class="text-center">
								{@render sortableHeader('Taxa', eventSortColumn === 'attendanceRate', eventSortDirection, () => toggleEventSort('attendanceRate'), true)}
							</th>
						</tr>
					</thead>
					<tbody>
						{#each sortedEvents() as event}
							<tr>
								<td class="font-medium">{event.eventName}</td>
								<td class="text-surface-600-400">{formatDate(event.eventDate)}</td>
								<td>
									<div class="flex gap-1 flex-wrap">
										{#each event.categories as cat}
											<span class="px-2 py-0.5 rounded-full text-xs text-white" style="background-color: {cat.color}">
												{cat.name}
											</span>
										{/each}
									</div>
								</td>
								<td class="text-center">{event.expectedAttendees}</td>
								<td class="text-center">{event.actualAttendees}</td>
								<td class="text-center">
									<span class="px-2 py-1 rounded-full text-sm {getAttendanceBg(event.attendanceRate)} {getAttendanceColor(event.attendanceRate)}">
										{event.attendanceRate}%
									</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="text-surface-500 text-center py-8">Nenhum evento encontrado</p>
		{/if}
	</div>

	<!-- Users Ranking Table -->
	<div class="card bg-surface-100-900 p-6 border border-surface-200-800">
		<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
			<h3 class="text-lg font-semibold flex items-center gap-2">
				<Users class="w-5 h-5 text-primary-500" />
				Ranking de Presença por Usuário
			</h3>
			<input
				type="search"
				placeholder="Buscar usuário..."
				bind:value={userSearch}
				class="input w-full md:w-64"
			/>
		</div>
		{#if data.usersAttendance.length > 0}
			<div class="overflow-x-auto">
				<table class="table">
					<thead>
						<tr>
							<th class="w-12">#</th>
							<th>
								{@render sortableHeader('Usuário', userSortColumn === 'username', userSortDirection, () => toggleUserSort('username'))}
							</th>
							<th>
								{@render sortableHeader('Empresa', userSortColumn === 'companyName', userSortDirection, () => toggleUserSort('companyName'))}
							</th>
							<th>
								{@render sortableHeader('Cargo', userSortColumn === 'productName', userSortDirection, () => toggleUserSort('productName'))}
							</th>
							<th class="text-center">
								{@render sortableHeader('Presenças', userSortColumn === 'attendedEvents', userSortDirection, () => toggleUserSort('attendedEvents'), true)}
							</th>
							<th class="text-center">
								{@render sortableHeader('Taxa', userSortColumn === 'attendanceRate', userSortDirection, () => toggleUserSort('attendanceRate'), true)}
							</th>
							<th class="text-center">
								{@render sortableHeader('Última Presença', userSortColumn === 'lastAttendance', userSortDirection, () => toggleUserSort('lastAttendance'), true)}
							</th>
						</tr>
					</thead>
					<tbody>
						{#each sortedUsers() as user, i}
							<tr>
								<td class="font-medium text-surface-500">{i + 1}</td>
								<td>
									<div>
										<p class="font-medium">{user.username}</p>
										<p class="text-sm text-surface-500">{user.email}</p>
									</div>
								</td>
								<td class="text-surface-600-400">{user.companyName}</td>
								<td class="text-surface-600-400">{user.productName || '-'}</td>
								<td class="text-center">
									<span class="font-medium">{user.attendedEvents}</span>
									<span class="text-surface-500">/ {user.totalEvents}</span>
								</td>
								<td class="text-center">
									<span class="px-2 py-1 rounded-full text-sm {getAttendanceBg(user.attendanceRate)} {getAttendanceColor(user.attendanceRate)}">
										{user.attendanceRate}%
									</span>
								</td>
								<td class="text-center text-surface-600-400">{formatDate(user.lastAttendance)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if sortedUsers().length === 0 && userSearch}
				<p class="text-surface-500 text-center py-8">Nenhum usuário encontrado para "{userSearch}"</p>
			{/if}
		{:else}
			<p class="text-surface-500 text-center py-8">Nenhum usuário cadastrado</p>
		{/if}
	</div>
</AdminPage>
