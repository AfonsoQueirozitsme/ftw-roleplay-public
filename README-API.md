# API de Reports e Mensagens

Este projeto inclui um servidor Express para gerir reports e mensagens via API REST.

## Configuração

### Variáveis de Ambiente

Cria um ficheiro `.env` na raiz do projeto com:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# API Server
PORT=3001
VITE_API_URL=http://localhost:3001
```

### Instalação

```bash
npm install
```

## Executar

### Apenas o servidor API

```bash
npm run dev:api
```

### Frontend e API juntos

```bash
npm run dev:all
```

### Apenas o frontend (fallback para Supabase direto)

```bash
npm run dev
```

## Endpoints da API

### Reports

- `GET /api/reports` - Listar reports do utilizador autenticado
  - Query params: `status`, `category`, `limit`, `offset`
- `GET /api/reports/:id` - Obter report específico
- `POST /api/reports` - Criar novo report
  - Body: `{ title, description, category?, severity?, priority? }`
- `PATCH /api/reports/:id` - Atualizar report
  - Body: `{ title?, description?, status?, category?, severity?, priority? }`

### Mensagens

- `GET /api/reports/:reportId/messages` - Listar mensagens de um report
- `POST /api/reports/:reportId/messages` - Criar nova mensagem
  - Body: `{ content, author_type? }`

### Estatísticas

- `GET /api/reports/stats` - Estatísticas dos reports do utilizador

### Health Check

- `GET /api/health` - Verificar se a API está operacional

## Autenticação

Todos os endpoints (exceto `/api/health`) requerem autenticação via Bearer token:

```
Authorization: Bearer <supabase_access_token>
```

O token é obtido automaticamente pelo cliente quando o utilizador está autenticado.

## Cliente API

O frontend usa o módulo `src/lib/api/reports.ts` que:
- Tenta usar a API primeiro
- Faz fallback automático para Supabase direto se a API não estiver disponível
- Gerencia autenticação automaticamente

## Estrutura

```
server/
  index.ts          # Servidor Express
  tsconfig.json     # Configuração TypeScript do servidor

src/lib/api/
  reports.ts        # Cliente API para o frontend
```

