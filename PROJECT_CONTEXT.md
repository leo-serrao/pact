# PROJECT_CONTEXT.md — Pact

> Leia este arquivo antes de qualquer coisa. Ele contém todo o contexto do projeto, o que foi feito e o que falta fazer. Mantenha-o sempre atualizado ao final de cada sessão de trabalho.

---

## O que é o Pact

**Pact** é um SaaS de finanças pessoais e compartilhadas com foco em **casais**. A proposta é "finanças a dois" — um app onde dois parceiros organizam sua vida financeira juntos, com contas individuais e uma parceria compartilhada entre os dois.

O nome Pact vem de "pacto" — compromisso financeiro compartilhado.

- **Demo original (Firebase):** https://finance-management-jet.vercel.app
- **Repositório:** https://github.com/leo-serrao/finance_management
- **Stack frontend:** React + TypeScript + Vite + TailwindCSS
- **Deploy:** Vercel

---

## Contexto da migração

O projeto original usava **Firebase (Firestore + Auth)**. Decidimos migrar para **Supabase (PostgreSQL + Auth)** para ter:
- Banco relacional com SQL real
- Row Level Security (RLS) nativo
- Multi-tenancy mais limpo
- Base melhor para billing e SaaS

O projeto **Pact** é um fork do original. O original continua intacto para uso pessoal.

---

## Design System

O app usa um design system próprio definido em `src/styles.css`:

- **Fonte:** Satoshi / Inter
- **Cor primária:** `#608879` (verde-musgo)
- **CSS Variables:** `--primary`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border`, `--surface`, `--surface-secondary`, `--bg`, `--danger`, `--success`, `--warning`
- **Radius:** `--radius-sm` (8px) → `--radius-xl` (20px)
- **Componentes base:** `.card`, `.button-primary`, `.button-secondary`
- **Dark mode:** suportado via classe `.dark`
- **Regra importante:** comentários no código sempre em **inglês**
- **Logos disponíveis em `/public`:** `no_text_logo.png`, `text_logo.png` (claro), `dark_text_logo.png` (escuro)

---

## Plano de migração para SaaS — 4 Fases

### ✅ Fase 1 — Fundação (CONCLUÍDA)
- [x] Projeto Supabase criado (região: São Paulo)
- [x] Schema SQL completo criado e rodado no Supabase
- [x] RLS habilitado em todas as tabelas
- [x] Trigger `handle_new_user` criado (cria profile + subscription automaticamente)
- [x] Autenticação configurada: Email/senha + Google OAuth
- [x] `@supabase/supabase-js` instalado, Firebase removido
- [x] Todos os services migrados para Supabase
- [x] Todas as pages migradas para Supabase
- [x] `user.uid` → `user.id` em todo o projeto
- [x] Canais realtime com `crypto.randomUUID()` para evitar conflitos
- [x] Grants e policies RLS configurados para todas as tabelas

### ✅ Fase 2 — Produto (CONCLUÍDA)

#### Onboarding ✅
- [x] Onboarding reformulado com 3 steps: Boas-vindas → Perfil financeiro → Convite do parceiro
- [x] Detecção automática de primeira vez via `profile.netSalary === 0`
- [x] `OnboardingGuard` no `App.tsx` redireciona novos usuários automaticamente
- [x] Suporte a token de convite pendente: usuário que aceita convite sem conta passa pelo onboarding e entra na parceria automaticamente
- [x] Step 3 gera link de convite real com botão de copiar

#### Parcerias por link ✅
- [x] `createPartnership` gera `invite_token` automaticamente
- [x] `generateInviteLink` cria/reutiliza token
- [x] `InvitePage.tsx` — página pública `/invite/:token`
- [x] Fluxo para usuário não cadastrado e cadastrado
- [x] Google OAuth + convite funcionando
- [x] Botão de convidar oculto após aceite
- [x] Renomear e deletar parceria
- [x] `SharedGroups.tsx` reformulado sem busca por email

#### SharedGroupDetails ✅
- [x] Dropdown "Pago por" mostra ambos os membros
- [x] Despesas agrupadas por data com total do dia
- [x] Datas corrigidas com `formatBRDate`
- [x] Saldo líquido correto com pagamentos aplicados
- [x] Pagamentos orphaned ignorados no cálculo
- [x] Modal de confirmação ao apagar despesa informa sobre pagamentos
- [x] Data exibida no histórico de pagamentos

#### Notificações in-app ✅
- [x] Tabela `notifications` criada no Supabase com RLS
- [x] Triggers automáticos para 3 eventos:
  - `new_shared_expense` — parceiro adicionou despesa compartilhada
  - `debt_settled` — parceiro quitou uma dívida
  - `partner_joined` — parceiro aceitou convite
- [x] `src/services/notifications.ts` — CRUD completo + realtime
- [x] `src/hooks/useNotifications.ts` — hook com estado otimista
- [x] `src/components/NotificationPanel.tsx` — painel via React Portal (position fixed, sem problemas de overflow)
- [x] Sino com badge de não lidas no header (desktop sidebar + mobile header)
- [x] Marcar notificação individual como lida ao clicar
- [x] Marcar todas como lidas
- [x] Apagar notificação individual (X em cada item)
- [x] Limpar todas as lidas de uma vez
- [x] Posicionamento inteligente: desktop abre à direita da sidebar ancorado ao bottom do trigger; mobile centralizado com limites de viewport
- [x] Para adicionar novo tipo: inserir row com novo `type` na tabela + adicionar emoji no `notificationIcon()` do `NotificationPanel.tsx`

#### Register ✅
- [x] Botão "Cadastrar com Google" adicionado

#### Dashboard redesenhada ✅
- [x] Layout redesenhado com hierarquia visual clara
- [x] Hero row (3 cards grandes): "Disponível hoje" (destacado com borda `--primary`), "Total restante no mês", "Parceria"
- [x] Mid row (4 mini cards): Gastos fixos, Gastos variáveis, Gasto hoje, Reserva recomendada
- [x] Bottom row: gráfico de linha (2/3) + resumo financeiro (1/3)
- [x] Gráfico migrado de Recharts para Chart.js com gradiente de área, curva suave e tooltip customizado
- [x] Seletor de período no gráfico: 7d / 14d / 30d / 90d
- [x] Barras de progresso nos cards "Disponível hoje" e "Total restante"
- [x] Header mostra mês atual por extenso em vez de subtítulo genérico
- [x] Resumo financeiro exibe linha de Reserva explicitamente e renomeado para "Disponível para gastar" com subtexto "reserva já descontada"
- [x] Bug corrigido: "Gastos variáveis" agora usa mês calendário (dia 1 até hoje) via `monthVariableSpent`, não o ciclo de pagamento

#### Relatórios redesenhados ✅
- [x] Gráficos migrados de Recharts para Chart.js (`npm install chart.js`)
- [x] Gráfico de barras diário: barras com borderRadius, destaque em `--primary` nas barras maiores, grid minimalista
- [x] Pie charts substituídos por Donut charts: `cutout: 68%`, total no centro, legenda com percentual acima do gráfico
- [x] Paleta de cores alinhada ao design system: começa em `--primary` `#608879`
- [x] Cores lidas via `getComputedStyle` em runtime para dark mode funcionar corretamente no canvas
- [x] Seletor de período migrado de `<select>` para botões segmentados (mesmo padrão do Home)
- [x] Dados dos donuts ordenados do maior para o menor valor
- [x] Estado vazio no donut: exibe "Nenhum dado no período" em vez de quebrar
- [x] Bug corrigido: legenda com `inline-flex` + `whitespace-nowrap` evita dot separar do label no wrap

#### Bugs corrigidos ✅
- [x] Cards aparecem/somem imediatamente sem refresh em todas as páginas
- [x] Store atualiza só após banco confirmar
- [x] Canais realtime únicos por chamada em todos os services
- [x] Datas nunca usam `new Date('YYYY-MM-DD')` — sempre `formatBRDate()`

#### Itens adiados para pós-lançamento
- Visão anual nos Relatórios (barras por mês, comparativo histórico)
- Revisão mobile first completa

### 💳 Fase 3 — Billing (PRÓXIMA)
- [ ] Definir planos Free vs Pro
- [ ] Integrar Stripe
- [ ] Webhooks de assinatura
- [ ] Gate de features por plano
- [ ] Página de pricing

### 🚀 Fase 4 — Lançamento (PENDENTE)
- [ ] Landing page
- [ ] SEO básico
- [ ] Analytics (Posthog ou Plausible)
- [ ] Email transacional (Resend ou SendGrid)

---

## Schema do Supabase

### Tabelas criadas
| Tabela | Descrição |
|---|---|
| `profiles` | Extensão do auth.users (display_name, net_salary, pay_day, savings_percent) |
| `partnerships` | id, created_by, name, invite_token, invite_accepted_at, invited_email, created_at |
| `partnership_members` | Membros de cada parceria (sempre 2, roles: owner/member) |
| `fixed_expenses` | Gastos fixos pessoais |
| `variable_expenses` | Gastos variáveis pessoais |
| `saving_boxes` | Caixinhas de poupança pessoais |
| `shared_expenses` | Despesas dentro de uma parceria |
| `debt_settlements` | Pagamentos para quitar dívidas entre parceiros |
| `notifications` | id, user_id, type, title, body, data (jsonb), read_at, created_at |
| `subscriptions` | Plano do usuário (free/pro) + dados Stripe |

### Policies RLS ativas (resumo)
- `profiles`: SELECT próprio + membros da mesma parceria; UPDATE próprio
- `partnerships`: SELECT/UPDATE por membros; INSERT por `created_by`; DELETE por owner
- `partnership_members`: SELECT via `is_in_same_partnership()`; INSERT por owner; DELETE por owner
- `fixed_expenses`, `variable_expenses`, `saving_boxes`: SELECT/INSERT/UPDATE/DELETE próprio
- `shared_expenses`, `debt_settlements`: SELECT/INSERT/UPDATE/DELETE por membros da parceria
- `notifications`: SELECT/UPDATE/DELETE próprio

### Funções SQL criadas
- `handle_new_user` — trigger que cria profile + subscription ao registrar
- `accept_partnership_invite(p_token)` — aceita convite (SECURITY DEFINER)
- `get_invite_preview(p_token)` — info do convite para anon (SECURITY DEFINER)
- `is_partnership_member(p_partnership_id)` — helper anti-recursão
- `is_in_same_partnership(other_user_id)` — helper anti-recursão
- `create_notification(user_id, type, title, body, data)` — helper para triggers
- `notify_new_shared_expense()` — trigger em `shared_expenses`
- `notify_debt_settled()` — trigger em `debt_settlements`
- `notify_partner_joined()` — trigger em `partnerships` (UPDATE)

### Grants especiais
- `anon`: SELECT em `partnerships` e `profiles`; EXECUTE em `get_invite_preview` e `accept_partnership_invite`
- `authenticated`: SELECT/UPDATE/DELETE em `notifications`

---

## Arquitetura dos Services e Hooks

```
src/services/
├── supabase.ts
├── auth.ts
├── profile.ts
├── expenses.ts
├── savingBoxes.ts
├── sharedGroups.ts              # partnerships CRUD + invite
├── sharedExpenses.ts            # canal único por chamada
├── debtSettlements.ts           # canal único por chamada
├── sharedBalance.ts             # cálculo de saldos líquidos
├── notifications.ts             # CRUD + realtime de notificações
├── sharedUserAdjustments.ts
└── userDebtSettlements.ts

src/hooks/
└── useNotifications.ts          # estado otimista + markAsRead + delete

src/utils/
├── invite.ts                    # savePendingInvite, getPendingInvite, clearPendingInvite
└── date.ts                      # getLocalISODate, formatBRDate

src/components/
└── NotificationPanel.tsx        # portal com position fixed, posicionamento inteligente
```

---

## Lógica de cálculo de saldos (sharedBalance.ts)

- `calculateBalances` — saldo bruto por usuário (split 50/50)
- `calculateSettlements` — converte em lista de quem deve quanto
- `applyPaymentsToSettlements` — aplica pagamentos ao saldo líquido:
  - Overpayments geram crédito na direção inversa
  - Pagamentos orphaned (sem dívida correspondente) são **ignorados**
  - Saldo global entre os dois — não vinculado a despesas específicas

---

## Dependências de gráficos

- **Chart.js** (`chart.js`) — usado em `Home.tsx` e `Reports.tsx`
- **Recharts** — ainda instalado no projeto mas não usado nessas páginas; pode ser removido com `npm uninstall recharts` se não houver outros usos
- **Importante:** Chart.js não consegue ler CSS variables diretamente no canvas. Sempre usar `getComputedStyle(document.documentElement).getPropertyValue('--var')` para resolver cores em runtime, garantindo suporte a dark mode

---

## Variáveis de ambiente necessárias

```env
VITE_SUPABASE_URL=https://knzuhjzfcuxsdlbkijnw.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

---

## Observações e armadilhas conhecidas

1. **Canais realtime sempre com `crypto.randomUUID()`** — nunca usar nome fixo.
2. **`user.id` no Supabase** (não `user.uid`).
3. **Profiles criados automaticamente** pelo trigger — não chamar `setUserProfile` no Register.
4. **`setUserProfile` usa snake_case** — `display_name`, `net_salary`, `pay_day`, `savings_percent`.
5. **`calculate50_30_20`** recebe `fixedExpenses` como segundo argumento.
6. **Toast variant** — sempre `'success' | 'error' | 'warning' | 'info'`.
7. **`getPartnershipMembers` usa duas queries separadas** — PostgREST não resolve o join automaticamente.
8. **Policies recursivas** — usar sempre funções `SECURITY DEFINER` em `partnership_members`.
9. **Banco primeiro, store depois** — nunca atualizar store antes de confirmar banco.
10. **Datas** — nunca usar `new Date('YYYY-MM-DD').toLocaleDateString()`. Sempre `formatBRDate()`.
11. **Saldo de pagamentos** — pagamentos orphaned são ignorados intencionalmente. Pagamentos persistem mesmo se despesa for apagada.
12. **NotificationPanel usa React Portal** — renderizado no `document.body` para escapar de `overflow:hidden` do sidebar. Posicionamento via `getBoundingClientRect()` do trigger. Desktop usa `bottom` CSS para ancorar ao trigger e crescer para cima.
13. **`computeSmartDailyProjection` usa ciclo de pagamento**, não mês calendário. Para exibir gastos do mês corrente (dia 1 até hoje) na dashboard, usar `monthVariableSpent` calculado separadamente via `useMemo` filtrando por `monthKey` (`YYYY-MM`). Não usar `proj.totalVariableSpent` para esse fim.
14. **Chart.js cores em dark mode** — sempre resolver CSS variables via `getComputedStyle` dentro do `useEffect` que cria o chart, nunca em tempo de render. O chart precisa ser destruído e recriado quando o tema muda.
15. **Legenda de donut charts** — usar `inline-flex` + `whitespace-nowrap` em cada item para evitar que o dot color se separe do label ao quebrar linha.
