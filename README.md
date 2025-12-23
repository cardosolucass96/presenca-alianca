# Presença Aliança

Sistema para confirmação de presença em eventos online — gera links públicos para que participantes confirmem presença, integra-se com Google Meet e oferece um painel administrativo com gerenciamento de eventos, categorias, usuários e relatórios (exportação XLSX e opções de impressão).

Funcionalidades principais: confirmação por link público, painel administrativo, relatórios e integração com Google Meet.

## Stack

- **Framework:** SvelteKit 2 / Svelte 5
- **Estilo:** TailwindCSS 4 + Skeleton UI
- **Banco de Dados:** SQLite (libSQL) com Drizzle ORM
- **Autenticação:** Sessões com cookies HTTP-only + Argon2
- **WhatsApp:** Evolution API para recuperação de senha

## Desenvolvimento

```sh
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Rodar migrações (se necessário)
npx tsx scripts/migrate-phone-reset.ts
```

## API REST

Todos os endpoints requerem autenticação via Bearer token (API Key).

```
Authorization: Bearer <sua_api_key>
Content-Type: application/json
```

### Usuários

#### `GET /api/users` - Listar usuários

**Query Parameters:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `q` | string | Busca em nome, email, empresa e telefone |
| `email` | string | Filtro por email |
| `phone` | string | Filtro por telefone |
| `companyName` | string | Filtro por empresa |
| `productId` | string | Filtro por produto |
| `role` | string | `user` ou `admin` |
| `limit` | number | Máximo de resultados (padrão: 50, max: 100) |
| `offset` | number | Paginação |

**Exemplo:**
```
GET /api/users?q=joao&companyName=Vorp&limit=10
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "abc123",
      "email": "joao@vorp.com",
      "phone": "5585999999999",
      "username": "João Silva",
      "companyName": "Vorp",
      "productId": "prod123",
      "productName": "Produto X",
      "role": "user",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

#### `POST /api/users` - Criar usuário

**Body:**
```json
{
  "email": "usuario@empresa.com",
  "phone": "85999999999",
  "username": "Nome do Usuário",
  "companyName": "Empresa X",
  "password": "senha123",
  "productId": "opcional"
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `email` | string | ✅ | Email único |
| `phone` | string | ❌ | Telefone único (10-13 dígitos) |
| `username` | string | ✅ | Nome (mín. 2 caracteres) |
| `companyName` | string | ✅ | Nome da empresa |
| `password` | string | ✅ | Senha (mín. 6 caracteres) |
| `productId` | string | ❌ | ID do produto |

**Resposta (201):**
```json
{
  "success": true,
  "message": "Usuário criado com sucesso",
  "userId": "abc123"
}
```

---

### Eventos

#### `GET /api/events` - Listar eventos

**Query Parameters:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `q` | string | Busca em nome, descrição e slug |
| `name` | string | Filtro por nome |
| `slug` | string | Filtro por slug |
| `categoryId` | string | Filtro por categoria |
| `isActive` | boolean | `true` ou `false` |
| `fromDate` | string | Data mínima (ISO 8601) |
| `toDate` | string | Data máxima (ISO 8601) |
| `limit` | number | Máximo de resultados (padrão: 50, max: 100) |
| `offset` | number | Paginação |

**Exemplo:**
```
GET /api/events?q=reuniao&isActive=true&fromDate=2025-01-01
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "evt123",
      "slug": "reuniao-mensal-abc123",
      "name": "Reunião Mensal",
      "description": "Descrição do evento",
      "dateTime": "2025-12-01T14:00:00.000Z",
      "endTime": "2025-12-01T16:00:00.000Z",
      "meetLink": "https://meet.google.com/xxx-xxxx-xxx",
      "expectedAttendees": 50,
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "categories": [
        { "id": "cat1", "name": "Treinamento", "color": "#6366f1" }
      ],
      "attendeesCount": 25
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

#### `POST /api/events` - Criar evento

**Body:**
```json
{
  "name": "Nome do Evento",
  "description": "Descrição opcional",
  "dateTime": "2025-12-01T14:00:00",
  "endTime": "2025-12-01T16:00:00",
  "meetLink": "https://meet.google.com/xxx-xxxx-xxx",
  "expectedAttendees": 50,
  "categoryIds": ["cat1", "cat2"]
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | string | ✅ | Nome do evento (mín. 3 caracteres) |
| `description` | string | ❌ | Descrição do evento |
| `dateTime` | string | ✅ | Data/hora de início (ISO 8601) |
| `endTime` | string | ✅ | Data/hora de término (ISO 8601) |
| `meetLink` | string | ✅ | Link do Google Meet |
| `expectedAttendees` | number | ❌ | Participantes esperados (padrão: 0) |
| `categoryIds` | string[] | ❌ | IDs das categorias |

**Resposta (201):**
```json
{
  "success": true,
  "message": "Evento criado com sucesso",
  "eventId": "evt123",
  "slug": "nome-do-evento-abc123"
}
```

---

### Erros

Todos os endpoints retornam erros no formato:

```json
{
  "error": "Mensagem de erro",
  "details": ["Detalhe 1", "Detalhe 2"]
}
```

| Código | Descrição |
|--------|-----------|
| 400 | Dados inválidos |
| 401 | Token não fornecido ou inválido |
| 409 | Conflito (email/telefone duplicado) |
| 500 | Erro interno |

---

## Gerenciamento de API Keys

Acesse [http://localhost:5173/admin/api-keys](http://localhost:5173/admin/api-keys) para:
- Criar novas API Keys
- Ativar/desativar chaves existentes
- Copiar chave para área de transferência
- Excluir chaves

## Recuperação de Senha

O sistema envia links de recuperação via WhatsApp (Evolution API).

1. Usuário acessa `/forgot-password`
2. Digita o telefone cadastrado
3. Recebe mensagem no WhatsApp com link
4. Clica no link e cria nova senha

## Build

```sh
npm run build
```

## Deploy (Cloudflare Pages)

O deploy é feito automaticamente via GitHub Actions quando há push na branch `main`.

### Configuração

Para configurar o deploy, adicione os seguintes secrets no repositório GitHub:

1. **CLOUDFLARE_API_TOKEN**: Token de API da Cloudflare com permissões para Cloudflare Pages
   - Acesse: Cloudflare Dashboard → My Profile → API Tokens → Create Token
   - Use o template "Edit Cloudflare Workers" ou crie um token customizado com permissões para Pages

2. **CLOUDFLARE_ACCOUNT_ID**: ID da sua conta Cloudflare
   - Encontre em: Cloudflare Dashboard → Workers & Pages → Overview (no canto direito da página)

### Deploy Manual

Para fazer deploy manualmente, execute:

```sh
npm run build
npx wrangler pages deploy .svelte-kit/cloudflare --project-name=presenca-alianca
```
