# Simple Balance

Controle financeiro pessoal e simples, feito para usar no iPhone como app da Tela de Início (PWA).
Uma tela principal com o mês (Previsão, Real e quanto falta cair/pagar), duas listas (Fixo e Variável)
e uma folha para lançar.

- **Front:** Vite + React + TypeScript, PWA via `vite-plugin-pwa`
- **Banco:** Supabase (Postgres), migrações em `supabase/migrations`, RLS por usuário
- **Login:** e-mail e senha (link mágico abriria o Safari, não o app instalado)

## Regras

- Lançamento: `tipo` fixo/variável, `valor` em centavos, `descricao`, `data` (vencimento no fixo),
  `categoria`, `pagamento` crédito/débito e `resolvido`.
- Status: crédito = "caiu" / "a cair"; débito = "pago" / "a pagar".
- **Previsão** = tudo lançado no mês. **Real** = só os resolvidos. **Falta** = Previsão − Real.
- Lista Fixo vazia oferece "Copiar fixos do mês anterior" (entram como pendentes).

## Rodar localmente

Precisa de Node e do Docker Desktop aberto.

```powershell
npm install
npm run db:start        # sobe o Supabase local e aplica as migrações
copy .env.example .env  # preencha VITE_SUPABASE_ANON_KEY com a "Publishable key" mostrada
npm run dev             # http://localhost:5173
```

No primeiro acesso, use "Criar conta". O usuário novo já ganha as categorias padrão.

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | checa tipos e gera `dist/` |
| `npm test` | testes das regras (dinheiro, datas, cálculos) |
| `npm run db:reset` | apaga o banco local e reaplica as migrações |
| `npm run db:types` | regenera `src/lib/database.types.ts` a partir do Postgres local |
| `npm run db:push` | aplica as migrações novas no projeto da nuvem |
| `npm run db:types:remote` | regenera os tipos a partir do banco da nuvem |
| `npm run db:stop` | desliga o Supabase local |

## Mudar o banco

Crie uma migração nova (`npx supabase migration new nome`), escreva o SQL, rode `npm run db:reset`
e depois `npm run db:types`.

## Supabase na nuvem

1. Crie um projeto em supabase.com.
2. `npx supabase login` e `npx supabase link --project-ref <ref>`.
3. `npx supabase db push` para aplicar as migrações.
4. Use a URL e a publishable/anon key do projeto no `.env` (ou nas variáveis do host do front).

## Estrutura

```
supabase/migrations/   schema, RLS e categorias padrão
src/lib/               api (Supabase), cálculos, dinheiro, datas, tipos
src/screens/           Início, Lista (Fixo/Variável), Ajustes, Login
src/components/        folha de lançamento, folha base, controles, aviso
```
