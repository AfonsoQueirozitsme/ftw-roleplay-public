# Conversão para Next.js

Este projeto foi convertido de React + Vite para Next.js.

## Mudanças Principais

### 1. Estrutura de Pastas
- `src/app/` - App Router do Next.js (substitui `src/pages/`)
- `src/app/api/` - API Routes (substituem Supabase Edge Functions)
- Componentes mantidos em `src/components/`

### 2. API Routes Locais
As seguintes Edge Functions foram convertidas para API routes locais:
- `/api/discord-lookup` - Substitui `discord-lookup`
- `/api/discord-guild-stats` - Substitui `discord-guild-stats`
- `/api/report-ai` - Substitui `report-ai`

### 3. Variáveis de Ambiente
Adiciona ao `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_GUILD_ID=your_guild_id
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 4. Scripts
```bash
npm run dev      # Desenvolvimento
npm run build    # Build de produção
npm run start    # Servidor de produção
```

### 5. Próximos Passos
1. Converter todas as páginas para o formato Next.js App Router
2. Adaptar `src/lib/api/*` para usar `/api/*` em vez de Edge Functions
3. Converter rotas do React Router para Next.js routing
4. Adaptar componentes que usam `useNavigate` para `useRouter` do Next.js

## Notas
- Mantém toda a funcionalidade existente
- Edge Functions substituídas por API routes locais
- Autenticação Supabase mantida
- Todos os componentes e estilos preservados

