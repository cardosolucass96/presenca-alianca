<script lang="ts">
	import { Calendar, Tag, Package, Users, Key, BarChart3, Settings } from 'lucide-svelte';
	import { AdminPage } from '$lib';

	const menuItems = [
		{ href: '/admin/events', icon: Calendar, title: 'Eventos', description: 'Criar e gerenciar eventos' },
		{ href: '/admin/categories', icon: Tag, title: 'Categorias', description: 'Tags para classificar eventos' },
		{ href: '/admin/products', icon: Package, title: 'Cargos', description: 'Cadastrar e editar cargos' },
		{ href: '/admin/users', icon: Users, title: 'Usuários', description: 'Gerenciar usuários do sistema' },
		{ href: '/admin/api-keys', icon: Key, title: 'API Keys', description: 'Gerenciar chaves de API' },
		{ href: '/admin/reports', icon: BarChart3, title: 'Relatórios', description: 'Visualizar estatísticas' }
	];
</script>

<svelte:head>
	<title>Painel Admin</title>
</svelte:head>

<AdminPage icon={Settings} title="Painel Administrativo">
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
		{#each menuItems as item}
			<a href={item.href} class="card bg-surface-100-900 p-6 border border-surface-200-800 hover:border-primary-500/50 transition-all hover:scale-[1.02] group">
				<div class="flex items-center gap-3 mb-3">
					<div class="p-3 rounded-xl bg-primary-500/10 text-primary-400 group-hover:bg-primary-500/20 transition-colors">
						<item.icon class="w-6 h-6" />
					</div>
					<h3 class="h3">{item.title}</h3>
				</div>
				<p class="text-surface-600-400">{item.description}</p>
			</a>
		{/each}
	</div>
</AdminPage>
