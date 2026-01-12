<script lang="ts">
	import { enhance } from '$app/forms';
	import { Key } from 'lucide-svelte';
	import { Alert, AdminPage, EmptyState } from '$lib';
	import { formatDate } from '$lib/utils/formatters';

	let { data, form } = $props();

	let showCreateForm = $state(false);

	function maskKey(key: string) {
		return key.slice(0, 10) + '...' + key.slice(-4);
	}

	function copyKey(key: string) {
		navigator.clipboard.writeText(key);
		alert('Chave copiada!');
	}
</script>

<svelte:head>
	<title>Chaves de API</title>
</svelte:head>

<AdminPage icon={Key} title="Chaves de API" subtitle="Gerencie as chaves para integração externa">
	{#snippet actions()}
		<button
			class="btn preset-filled-primary-500"
			onclick={() => (showCreateForm = !showCreateForm)}
		>
			{showCreateForm ? 'Cancelar' : 'Nova Chave'}
		</button>
	{/snippet}

	{#if form?.error}
		<Alert variant="error" message={form.error} class="mb-6" />
	{/if}

	{#if form?.success && form?.newKey}
		<div class="bg-success-500/15 border border-success-500/30 rounded-xl p-6 mb-6">
			<p class="font-bold mb-2 text-success-400 flex items-center gap-2">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
				</svg>
				Chave criada com sucesso!
			</p>
			<p class="text-sm mb-3 text-surface-400">Copie a chave abaixo. Ela não será exibida novamente:</p>
			<div class="flex gap-2 items-center flex-wrap">
				<code class="bg-surface-900 text-success-400 px-4 py-3 rounded-lg font-mono text-sm break-all flex-1 min-w-0">
					{form.newKey}
				</code>
				<button
					type="button"
					class="btn preset-filled-success-500 shrink-0"
					onclick={() => copyKey(form?.newKey || '')}
				>
					Copiar
				</button>
			</div>
		</div>
	{/if}

	{#if showCreateForm}
		<div class="card bg-surface-100-900 p-6 mb-8 border border-surface-200-800">
			<h2 class="h3 mb-4">Nova Chave de API</h2>
			<form
				method="POST"
				action="?/create"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						showCreateForm = false;
					};
				}}
				class="space-y-4"
			>
				<div class="flex gap-4 items-end">
					<label class="label flex-1">
						<span>Nome da Chave</span>
						<input
							type="text"
							name="name"
							class="input"
							placeholder="Ex: Integração CRM, Webhook Vendas..."
							required
						/>
					</label>
					<button type="submit" class="btn preset-filled-primary-500">
						Gerar Chave
					</button>
				</div>
			</form>
		</div>
	{/if}

	<div class="card bg-surface-100-900 p-6 mb-6 border border-surface-200-800">
		<h2 class="h4 mb-4 text-primary-400">📖 Documentação da API</h2>
		
		<div class="space-y-6 text-sm">
			<!-- Autenticação -->
			<div class="border-b border-surface-300-700 pb-4">
				<h3 class="font-bold text-base mb-2">🔐 Autenticação</h3>
				<p class="mb-2 text-surface-600-400">Todos os endpoints requerem autenticação via Bearer token:</p>
				<code class="bg-surface-200-800 px-3 py-2 rounded block">
					Authorization: Bearer sua_chave_api<br/>
					Content-Type: application/json
				</code>
			</div>

			<!-- GET /api/users -->
			<div class="border-b border-surface-300-700 pb-4">
				<h3 class="font-bold text-base mb-2">👥 GET /api/users</h3>
				<p class="mb-2 text-surface-600-400">Lista usuários com filtros opcionais:</p>
				<div class="overflow-x-auto">
					<table class="table table-compact w-full text-xs">
						<thead>
							<tr class="bg-surface-200-800">
								<th class="p-2">Parâmetro</th>
								<th class="p-2">Tipo</th>
								<th class="p-2">Descrição</th>
							</tr>
						</thead>
						<tbody>
							<tr><td class="p-2"><code>q</code></td><td class="p-2">string</td><td class="p-2">Busca em nome, email, empresa, telefone</td></tr>
							<tr><td class="p-2"><code>email</code></td><td class="p-2">string</td><td class="p-2">Filtro por email</td></tr>
							<tr><td class="p-2"><code>phone</code></td><td class="p-2">string</td><td class="p-2">Filtro por telefone</td></tr>
							<tr><td class="p-2"><code>companyName</code></td><td class="p-2">string</td><td class="p-2">Filtro por empresa</td></tr>
							<tr><td class="p-2"><code>productId</code></td><td class="p-2">string</td><td class="p-2">Filtro por produto</td></tr>
							<tr><td class="p-2"><code>role</code></td><td class="p-2">string</td><td class="p-2">user ou admin</td></tr>
							<tr><td class="p-2"><code>limit</code></td><td class="p-2">number</td><td class="p-2">Máx. resultados (padrão: 50)</td></tr>
							<tr><td class="p-2"><code>offset</code></td><td class="p-2">number</td><td class="p-2">Paginação</td></tr>
						</tbody>
					</table>
				</div>
				<p class="mt-2 text-surface-600-400">Exemplo:</p>
				<code class="bg-surface-200-800 px-3 py-2 rounded block mt-1">
					GET /api/users?q=joao&companyName=Vorp&limit=10
				</code>
			</div>

			<!-- POST /api/users -->
			<div class="border-b border-surface-300-700 pb-4">
				<h3 class="font-bold text-base mb-2">👤 POST /api/users</h3>
				<p class="mb-2 text-surface-600-400">Cria um novo usuário:</p>
				<pre class="bg-surface-200-800 px-3 py-2 rounded overflow-x-auto">{`{
  "email": "usuario@email.com",      // obrigatório, único
  "phone": "85999999999",            // opcional, único (10-13 dígitos)
  "username": "Nome do Usuário",     // obrigatório (mín. 2 chars)
  "companyName": "Empresa",          // obrigatório
  "password": "senha123",            // obrigatório (mín. 6 chars)
  "productId": "id_do_produto"       // opcional
}`}</pre>
				<p class="mt-2 text-surface-600-400">Resposta (201):</p>
				<pre class="bg-surface-200-800 px-3 py-2 rounded overflow-x-auto mt-1">{`{
  "success": true,
  "message": "Usuário criado com sucesso",
  "userId": "abc123"
}`}</pre>
			</div>

			<!-- GET /api/users/:id/events -->
			<div class="border-b border-surface-300-700 pb-4">
				<h3 class="font-bold text-base mb-2">📆 GET /api/users/:id/events</h3>
				<p class="mb-2 text-surface-600-400">Retorna todos os eventos que um usuário participou:</p>
				<code class="bg-surface-200-800 px-3 py-2 rounded block mt-1">
					GET /api/users/user123abc/events
				</code>
				<p class="mt-2 text-surface-600-400">Resposta (200):</p>
				<pre class="bg-surface-200-800 px-3 py-2 rounded overflow-x-auto mt-1">{`{
  "success": true,
  "data": {
    "user": {
      "id": "user123abc",
      "username": "João Silva",
      "email": "joao@email.com",
      "companyName": "Empresa XYZ"
    },
    "events": [
      {
        "id": "evt123",
        "name": "Reunião Mensal",
        "slug": "reuniao-mensal-xyz",
        "dateTime": "2025-12-01T14:00:00.000Z",
        "endTime": "2025-12-01T16:00:00.000Z",
        "meetLink": "https://meet.google.com/xxx",
        "confirmedAt": "2025-11-15T08:00:00.000Z",
        "attended": true,
        "categories": [
          { "id": "cat1", "name": "Vendas", "color": "#6366f1" }
        ]
      }
    ],
    "total": 5
  }
}`}</pre>
			</div>

			<!-- GET /api/events -->
			<div class="border-b border-surface-300-700 pb-4">
				<h3 class="font-bold text-base mb-2">📅 GET /api/events</h3>
				<p class="mb-2 text-surface-600-400">Lista eventos com filtros opcionais:</p>
				<div class="overflow-x-auto">
					<table class="table table-compact w-full text-xs">
						<thead>
							<tr class="bg-surface-200-800">
								<th class="p-2">Parâmetro</th>
								<th class="p-2">Tipo</th>
								<th class="p-2">Descrição</th>
							</tr>
						</thead>
						<tbody>
							<tr><td class="p-2"><code>q</code></td><td class="p-2">string</td><td class="p-2">Busca em nome, descrição, slug</td></tr>
							<tr><td class="p-2"><code>name</code></td><td class="p-2">string</td><td class="p-2">Filtro por nome</td></tr>
							<tr><td class="p-2"><code>slug</code></td><td class="p-2">string</td><td class="p-2">Filtro por slug</td></tr>
							<tr><td class="p-2"><code>categoryId</code></td><td class="p-2">string</td><td class="p-2">Filtro por categoria</td></tr>
							<tr><td class="p-2"><code>isActive</code></td><td class="p-2">boolean</td><td class="p-2">true ou false</td></tr>
							<tr><td class="p-2"><code>fromDate</code></td><td class="p-2">string</td><td class="p-2">Data mínima (ISO 8601)</td></tr>
							<tr><td class="p-2"><code>toDate</code></td><td class="p-2">string</td><td class="p-2">Data máxima (ISO 8601)</td></tr>
							<tr><td class="p-2"><code>limit</code></td><td class="p-2">number</td><td class="p-2">Máx. resultados (padrão: 50)</td></tr>
							<tr><td class="p-2"><code>offset</code></td><td class="p-2">number</td><td class="p-2">Paginação</td></tr>
						</tbody>
					</table>
				</div>
				<p class="mt-2 text-surface-600-400">Exemplo:</p>
				<code class="bg-surface-200-800 px-3 py-2 rounded block mt-1">
					GET /api/events?q=reuniao&isActive=true&fromDate=2025-01-01
				</code>
			</div>

			<!-- GET /api/events/:id -->
			<div class="border-b border-surface-300-700 pb-4">
				<h3 class="font-bold text-base mb-2">📋 GET /api/events/:id</h3>
				<p class="mb-2 text-surface-600-400">Retorna detalhes completos de um evento com lista de participantes:</p>
				<code class="bg-surface-200-800 px-3 py-2 rounded block mt-1">
					GET /api/events/evt123abc
				</code>
				<p class="mt-2 text-surface-600-400">Resposta (200):</p>
				<pre class="bg-surface-200-800 px-3 py-2 rounded overflow-x-auto mt-1">{`{
  "success": true,
  "data": {
    "id": "evt123abc",
    "slug": "reuniao-mensal-xyz",
    "name": "Reunião Mensal",
    "description": "Descrição do evento",
    "dateTime": "2025-12-01T14:00:00.000Z",
    "endTime": "2025-12-01T16:00:00.000Z",
    "meetLink": "https://meet.google.com/xxx",
    "expectedAttendees": 50,
    "isActive": true,
    "createdAt": "2025-11-01T10:00:00.000Z",
    "categories": [
      { "id": "cat1", "name": "Vendas", "color": "#6366f1" }
    ],
    "attendeesCount": 25,
    "attendees": [
      {
        "id": "user123",
        "username": "João Silva",
        "email": "joao@email.com",
        "companyName": "Empresa XYZ",
        "productName": "Produto A",
        "confirmedAt": "2025-11-15T08:00:00.000Z",
        "attended": true
      }
    ]
  }
}`}</pre>
			</div>

			<!-- POST /api/events -->
			<div class="border-b border-surface-300-700 pb-4">
				<h3 class="font-bold text-base mb-2">📝 POST /api/events</h3>
				<p class="mb-2 text-surface-600-400">Cria um novo evento:</p>
				<pre class="bg-surface-200-800 px-3 py-2 rounded overflow-x-auto">{`{
  "name": "Nome do Evento",                      // obrigatório (mín. 3 chars)
  "description": "Descrição do evento",          // opcional
  "dateTime": "2025-12-01T14:00:00",             // obrigatório (ISO 8601)
  "endTime": "2025-12-01T16:00:00",              // obrigatório (ISO 8601)
  "meetLink": "https://meet.google.com/xxx",     // obrigatório
  "expectedAttendees": 50,                       // opcional (padrão: 0)
  "categoryIds": ["cat1", "cat2"]                // opcional
}`}</pre>
				<p class="mt-2 text-surface-600-400">Resposta (201):</p>
				<pre class="bg-surface-200-800 px-3 py-2 rounded overflow-x-auto mt-1">{`{
  "success": true,
  "message": "Evento criado com sucesso",
  "eventId": "evt123",
  "slug": "nome-do-evento-abc123"
}`}</pre>
			</div>

			<!-- Erros -->
			<div>
				<h3 class="font-bold text-base mb-2">⚠️ Códigos de Erro</h3>
				<div class="overflow-x-auto">
					<table class="table table-compact w-full text-xs">
						<thead>
							<tr class="bg-surface-200-800">
								<th class="p-2">Código</th>
								<th class="p-2">Descrição</th>
							</tr>
						</thead>
						<tbody>
							<tr><td class="p-2"><code>400</code></td><td class="p-2">Dados inválidos</td></tr>
							<tr><td class="p-2"><code>401</code></td><td class="p-2">Token não fornecido ou inválido</td></tr>
							<tr><td class="p-2"><code>404</code></td><td class="p-2">Recurso não encontrado (evento/usuário)</td></tr>
							<tr><td class="p-2"><code>409</code></td><td class="p-2">Conflito (email/telefone duplicado)</td></tr>
							<tr><td class="p-2"><code>500</code></td><td class="p-2">Erro interno</td></tr>
						</tbody>
					</table>
				</div>
				<p class="mt-2 text-surface-600-400">Formato de erro:</p>
				<pre class="bg-surface-200-800 px-3 py-2 rounded overflow-x-auto mt-1">{`{
  "error": "Mensagem de erro",
  "details": ["Detalhe 1", "Detalhe 2"]
}`}</pre>
			</div>
		</div>
	</div>

	<div class="card bg-surface-100-900 overflow-hidden border border-surface-200-800">
		{#if data.apiKeys.length === 0}
			<EmptyState icon={Key} message="Nenhuma chave de API criada ainda." />
		{:else}
			<table class="table w-full">
				<thead>
					<tr class="bg-surface-200-800">
						<th class="p-4 text-left">Nome</th>
						<th class="p-4 text-left">Chave</th>
						<th class="p-4 text-left">Status</th>
						<th class="p-4 text-left">Criada em</th>
						<th class="p-4 text-left">Último uso</th>
						<th class="p-4 text-right">Ações</th>
					</tr>
				</thead>
				<tbody>
					{#each data.apiKeys as apiKey}
						<tr class="border-t border-surface-300-700">
							<td class="p-4 font-medium">{apiKey.name}</td>
							<td class="p-4">
								<code class="text-xs bg-surface-200-800 px-2 py-1 rounded">
									{maskKey(apiKey.key)}
								</code>
							</td>
							<td class="p-4">
								{#if apiKey.isActive}
									<span class="badge preset-filled-success-500 text-xs">Ativa</span>
								{:else}
									<span class="badge preset-filled-warning-500 text-xs">Inativa</span>
								{/if}
							</td>
							<td class="p-4 text-sm text-surface-600-400">
								{formatDate(apiKey.createdAt)}
							</td>
							<td class="p-4 text-sm text-surface-600-400">
								{formatDate(apiKey.lastUsedAt)}
							</td>
							<td class="p-4">
								<div class="flex justify-end gap-2">
									<form method="POST" action="?/toggle" use:enhance>
										<input type="hidden" name="id" value={apiKey.id} />
										<button
											type="submit"
											class="btn btn-sm {apiKey.isActive
												? 'preset-outlined-warning-500'
												: 'preset-outlined-success-500'}"
										>
											{apiKey.isActive ? 'Desativar' : 'Ativar'}
										</button>
									</form>
									<form
										method="POST"
										action="?/delete"
										use:enhance
										onsubmit={(e) => {
											if (!confirm('Tem certeza que deseja excluir esta chave?')) {
												e.preventDefault();
											}
										}}
									>
										<input type="hidden" name="id" value={apiKey.id} />
										<button type="submit" class="btn btn-sm preset-filled-error-500">
											Excluir
										</button>
									</form>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</AdminPage>
