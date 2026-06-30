# Web Push Notifications Tasks

**Design**: `.specs/features/web-push-notifications/design.md`
**Status**: Draft

---

## Test Policy (no TESTING.md exists)

Acordado com o usuário: convenção atual do repo é vitest unit test apenas para lógica pura (único exemplo hoje: `src/utils/finance.test.ts`). Não há testing-library para componentes/hooks, nem e2e. Para esta feature:

- **unit**: funções puras sem I/O direto (resolução de deep-link, parsing/validação de payload) — vitest.
- **none**: componentes React, hooks com efeitos colaterais (Notification API, Service Worker), Service Worker, Edge Function — verificados manualmente (build/typecheck como gate + `/verify` no final, Android Chrome + iOS Safari PWA instalada).
- **Gate commands**: `npm run lint`, `npm run build` (inclui typecheck via `tsc` no build do Vite), `npm test` (vitest).

---

## Execution Plan

### Phase 1: Backend Foundation (Sequential)

```
T1 → T2 → T3
```

### Phase 2: Frontend Core (Parallel OK, depende de T1)

```
        ┌→ T4 ─┐
T1 ─────┼→ T5 ─┼──→ T7
        └→ T6 ─┘
```

### Phase 3: Integration (Sequential, depende de T2/T3 e T4/T5/T6)

```
T2, T3, T4, T5, T6 ──→ T7 ──→ T8 ──→ T9
```

### Phase 4: Verification (Sequential)

```
T9 ──→ T10
```

---

## Task Breakdown

### T1: Criar tabela `push_subscriptions` no Supabase

**What**: Aplicar a migration SQL da tabela `push_subscriptions` (com RLS) no projeto Supabase via MCP, e salvar o SQL em `supabase/migrations/` no repo.
**Where**: `supabase/migrations/<timestamp>_create_push_subscriptions.sql` (novo arquivo, repo ainda não tem pasta `supabase/`)
**Depends on**: None
**Reuses**: Padrão de RLS já usado nas demais tabelas do projeto (`auth.uid() = user_id`)
**Requirement**: PUSH-01, PUSH-10, PUSH-12

**Tools**:
- MCP: `mcp__claude_ai_Supabase__apply_migration`, `mcp__claude_ai_Supabase__list_tables` (conferir antes), `mcp__claude_ai_Supabase__get_advisors` (conferir RLS depois)
- Skill: NONE

**Done when**:
- [ ] Tabela `push_subscriptions` existe no Supabase com colunas conforme design (`id`, `user_id`, `endpoint` único, `p256dh`, `auth`, `user_agent`, `created_at`, `last_seen_at`)
- [ ] RLS habilitado e policy `auth.uid() = user_id` aplicada
- [ ] `get_advisors` não reporta novo warning de segurança para a tabela
- [ ] SQL versionado em `supabase/migrations/`

**Tests**: none
**Gate**: build (não há código TS nesta task)

**Verify**: `list_tables` mostra `push_subscriptions` com RLS habilitado.

**Commit**: `feat(push-notifications): add push_subscriptions table with RLS`

---

### T2: Confirmar formato de `notifications.data` e checar VAPID em Deno (spike, sem código)

**What**: Investigar (via `execute_sql` numa amostra real de `notifications`) se `data` contém `groupId` para `new_shared_expense`/`debt_settled`, e validar rapidamente (script local Node ou doc oficial) se `npm:web-push` roda no Supabase Edge Runtime sem polyfill. Documentar achados em `.specs/features/web-push-notifications/design.md` (seção Open Questions), resolvendo as duas pendências marcadas como "a confirmar".
**Where**: Atualiza `.specs/features/web-push-notifications/design.md` (seção "Open Questions / Riscos")
**Depends on**: None
**Reuses**: N/A (spike de pesquisa)
**Requirement**: PUSH-04 (deep-link), risco técnico da Edge Function

**Tools**:
- MCP: `mcp__claude_ai_Supabase__execute_sql` (somente leitura, amostra de `notifications`), WebSearch/Context7 se necessário para `web-push` em Deno
- Skill: NONE

**Done when**:
- [ ] Confirmado (ou não) que `notifications.data` traz `groupId` para os tipos relevantes; se não trouxer, documentado como bloqueio externo (fora do escopo de código deste plano, pois quem popula `notifications` é server-side fora do repo)
- [ ] Confirmado se `npm:web-push` funciona em Deno/Edge Functions ou se a alternativa (Web Crypto manual) será necessária
- [ ] `design.md` atualizado removendo as ⚠️ pendências da seção Open Questions

**Tests**: none
**Gate**: none (é pesquisa, não código)

**Verify**: Seção "Open Questions" do design.md não tem mais itens em aberto sobre esses dois pontos.

**Commit**: `docs(push-notifications): resolve VAPID/Deno and deep-link data spikes`

---

### T3: Criar e implantar Edge Function `send-push` + Database Webhook

**What**: Implementar a Edge Function `send-push` (recebe payload do Database Webhook, busca subscriptions, resolve deep-link, envia push via VAPID, remove subscriptions com 404/410), implantar via MCP, configurar secrets VAPID e criar o Database Webhook escutando INSERT em `notifications`.
**Where**: `supabase/functions/send-push/index.ts` (novo); `supabase/functions/send-push/resolveDeepLink.ts` (função pura extraída para teste unit)
**Depends on**: T1, T2
**Reuses**: Mapeamento tipo→rota definido no design.md (tabela de deep-link)
**Requirement**: PUSH-01, PUSH-02, PUSH-04, PUSH-10, PUSH-11

**Tools**:
- MCP: `mcp__claude_ai_Supabase__deploy_edge_function`, `mcp__claude_ai_Supabase__get_logs` (validar depois do deploy), Bash (para gerar par de chaves VAPID localmente, ex: `npx web-push generate-vapid-keys`)
- Skill: NONE

**Done when**:
- [ ] `resolveDeepLink(type, data)` é uma função pura testável, com teste unit cobrindo os 3 tipos + fallback `/`
- [ ] Edge Function lê subscriptions do `user_id` do payload, envia push para cada uma via VAPID
- [ ] Em resposta 404/410 do push service, a subscription correspondente é deletada de `push_subscriptions`
- [ ] Secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` configurados no projeto Supabase
- [ ] Database Webhook criado: INSERT em `notifications` → POST para `send-push`
- [ ] `npm test` roda o teste unit de `resolveDeepLink` com sucesso
- [ ] Teste manual: insert direto via SQL numa notificação de teste dispara o webhook (visível em `get_logs`)

**Tests**: unit (somente `resolveDeepLink`)
**Gate**: quick (`npm test -- resolveDeepLink`)

**Verify**: `npm test` mostra o novo arquivo de teste passando; `get_logs` da function mostra invocação após insert manual de teste em `notifications`.

**Commit**: `feat(push-notifications): add send-push edge function and database webhook`

---

### T4: Trocar Service Worker para `injectManifest` com push/notificationclick [P]

**What**: Mudar `vite.config.ts` para `strategies: 'injectManifest'` e criar `src/sw.ts` com `precacheAndRoute(self.__WB_MANIFEST)` + listeners `push` (mostra notificação) e `notificationclick` (foca/abre janela navegando para `event.notification.data.url`).
**Where**: `vite.config.ts` (modificado), `src/sw.ts` (novo)
**Depends on**: None (paralelo a T5/T6; não depende do backend para existir o código)
**Reuses**: Config `VitePWA` existente em `vite.config.ts` (mesmo manifest, ícones, etc. — só muda a estratégia)
**Requirement**: PUSH-01, PUSH-03, PUSH-04

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `vite.config.ts` usa `strategies: 'injectManifest', srcDir: 'src', filename: 'sw.ts'`
- [ ] `src/sw.ts` importa e chama `precacheAndRoute(self.__WB_MANIFEST)`
- [ ] Listener `push` parseia `event.data.json()` e chama `self.registration.showNotification(title, { body, icon, data })` dentro de `event.waitUntil`
- [ ] Listener `notificationclick` fecha a notificação, usa `clients.matchAll({type: 'window'})` para focar janela existente navegando para `data.url`, ou `clients.openWindow(data.url)` se não houver janela aberta
- [ ] `npm run build` continua gerando o SW sem erros (build é o gate, já que SW não é testável em unit test isolado)

**Tests**: none
**Gate**: build (`npm run build`)

**Verify**: `npm run build` conclui sem erro; `dist/sw.js` (ou nome configurado) contém os listeners `push`/`notificationclick` no bundle.

**Commit**: `feat(push-notifications): switch service worker to injectManifest with push support`

---

### T5: Criar `services/pushSubscriptions.ts` [P]

**What**: Implementar `upsertSubscription` e `deleteSubscriptionByEndpoint`, espelhando o padrão de `services/notifications.ts`.
**Where**: `src/services/pushSubscriptions.ts` (novo)
**Depends on**: None (paralelo; não depende da tabela existir fisicamente para escrever o código, mas T1 deve terminar antes do T7 de integração)
**Reuses**: `src/services/supabase.ts`, padrão de funções de `src/services/notifications.ts`
**Requirement**: PUSH-01, PUSH-12

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `upsertSubscription(userId, sub)` insere/atualiza por `endpoint` (upsert on conflict)
- [ ] `deleteSubscriptionByEndpoint(endpoint)` remove a linha
- [ ] Tipos `PushSubscriptionRow` exportados conforme design.md
- [ ] `npm run build` sem erros de tipo

**Tests**: none (camada de I/O direto ao Supabase, sem lógica pura a isolar — segue o mesmo padrão de `notifications.ts`, que também não tem teste)
**Gate**: build

**Verify**: `npm run build` passa; revisão manual do arquivo confere com a assinatura do design.md.

**Commit**: `feat(push-notifications): add pushSubscriptions service`

---

### T6: Criar `usePushSubscription` hook [P]

**What**: Implementar o hook com `permissionState`, `isIosNonInstalled`, `requestPermission()`, `ensureSubscribed()`, conforme interfaces do design.md.
**Where**: `src/hooks/usePushSubscription.ts` (novo)
**Depends on**: None (paralelo; usa `services/pushSubscriptions.ts` por import mas pode ser escrito contra a interface definida no design sem esperar T5 terminar fisicamente — ajustado para depender de T5 para evitar import quebrado)
**Reuses**: Padrão de `src/hooks/useNotifications.ts`, `AuthContext` para `user.id`
**Requirement**: PUSH-06, PUSH-07, PUSH-08, PUSH-09

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Detecta suporte (`'serviceWorker' in navigator && 'PushManager' in window`) → `unsupported` se ausente
- [ ] Detecta iOS fora de PWA instalada (`display-mode: standalone` + `'standalone' in navigator`) → `isIosNonInstalled`
- [ ] `requestPermission()` chama `Notification.requestPermission()`, e em caso de `granted`, obtém `PushSubscription` via `registration.pushManager.subscribe` (VAPID public key) e chama `upsertSubscription`
- [ ] `ensureSubscribed()` é idempotente: se já `granted` e já existe subscription no browser, não re-subscreve nem re-insere desnecessariamente
- [ ] Permissão `denied` é refletida em `permissionState` sem nova tentativa automática
- [ ] `npm run build` sem erros de tipo

**Tests**: none (hook com efeitos colaterais de browser API — sem testing-library no projeto; verificação manual no `/verify`)
**Gate**: build

**Verify**: `npm run build` passa; revisão manual do arquivo confere com a assinatura do design.md.

**Commit**: `feat(push-notifications): add usePushSubscription hook`

---

### T7: Integrar UI em `Settings.tsx`

**What**: Adicionar seção "Notificações push" em `Settings.tsx` usando `usePushSubscription`: mostra estado atual e botão de ativar (ou instrução de instalar PWA no iOS).
**Where**: `src/pages/Settings.tsx` (modificado)
**Depends on**: T4, T5, T6 (precisa do hook, service e SW prontos)
**Reuses**: Design system existente (`.card`, `--primary`, etc.), mesmo padrão visual das outras seções de `Settings.tsx`
**Requirement**: PUSH-06, PUSH-07, PUSH-08, PUSH-09

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Seção exibe corretamente os 4 estados: não suportado, negado, iOS sem instalar, pronto para ativar/já ativo
- [ ] Botão "Ativar notificações" chama `requestPermission()`
- [ ] `npm run build` e `npm run lint` sem erros

**Tests**: none
**Gate**: build

**Verify**: `npm run build` passa; inspeção visual via dev server.

**Commit**: `feat(push-notifications): add push notification settings UI`

---

### T8: Disparar `ensureSubscribed()` no boot autenticado

**What**: Chamar `ensureSubscribed()` uma vez por sessão autenticada (ex: dentro de `AuthContext` ou `AppLayout`, após login confirmado) para manter a subscription viva em dispositivos que já concederam permissão antes.
**Where**: `src/contexts/AuthContext.tsx` ou `src/layouts/AppLayout.tsx` (escolher o local com menor acoplamento — `AppLayout` é preferível para não acoplar lógica de push ao contexto de auth)
**Depends on**: T6, T7
**Reuses**: `AuthContext` (`user`)
**Requirement**: PUSH-09

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `ensureSubscribed()` é chamado uma vez quando `user` muda de `null` para autenticado
- [ ] Não dispara prompt de permissão automaticamente (só garante subscription se já `granted`)
- [ ] `npm run build` sem erros

**Tests**: none
**Gate**: build

**Verify**: `npm run build` passa; revisão manual do ponto de chamada.

**Commit**: `feat(push-notifications): ensure subscription on authenticated boot`

---

### T9: Atualizar `.notebook/notification-flow.md` com o novo fluxo de push

**What**: Adicionar uma seção ao documento existente descrevendo o fluxo de push real (subscription, webhook, edge function, deep-link), mantendo o documento como fonte única de verdade do fluxo de notificações.
**Where**: `.notebook/notification-flow.md` (modificado)
**Depends on**: T3, T7, T8
**Reuses**: Estrutura e estilo do documento existente
**Requirement**: N/A (documentação)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Nova seção "9) Push notifications (PWA)" documenta os componentes novos e o diagrama de fluxo
- [ ] Referências do final do arquivo atualizadas com os novos arquivos

**Tests**: none
**Gate**: none

**Verify**: Leitura do arquivo confirma a seção nova coerente com o resto do documento.

**Commit**: `docs(push-notifications): document push notification flow`

---

### T10: Verificação manual end-to-end (Android Chrome + iOS Safari PWA)

**What**: Validar o fluxo completo em dispositivo real: instalar PWA, conceder permissão, gerar uma notificação real (ex: criar despesa compartilhada em outra conta), fechar o app, confirmar push do SO chega, clicar e confirmar deep-link correto. Repetir em iOS Safari (16.4+, instalado via "Adicionar à Tela de Início").
**Where**: N/A (verificação, não código)
**Depends on**: T9
**Reuses**: Skill `/verify`
**Requirement**: Success Criteria do spec.md (todos)

**Tools**:
- MCP: NONE
- Skill: `verify`

**Done when**:
- [ ] Android: push chega com app fechado; clique navega para a rota correta
- [ ] iOS (PWA instalada, 16.4+): mesmo comportamento
- [ ] Subscription inválida (simulada) é removida após uma tentativa de envio
- [ ] Nenhuma regressão no fluxo in-app existente (sino, painel, marcar como lida)

**Tests**: none
**Gate**: full (verificação manual real, sem comando automatizado)

**Verify**: Checklist acima, 1:1 com os Success Criteria do `spec.md`.

**Commit**: Nenhum (task de verificação; eventuais fixes encontrados viram tasks/commits à parte)

---

## Parallel Execution Map

```
Phase 1 (Sequential):
  T1 ──→ T2 ──→ T3

Phase 2 (Parallel, não depende de T1-T3 para começar a escrever código):
    ├── T4 [P]  (Service Worker)
    ├── T5 [P]  (push subscriptions service)
    └── T6 [P]  (hook) — depende de T5 estar mergeado (import), roda logo após T5

Phase 3 (Sequential, precisa de T2/T3 resolvidos + T4/T5/T6 prontos):
  T7 ──→ T8 ──→ T9

Phase 4 (Sequential):
  T10
```

**Nota sobre paralelismo real**: T4, T5 podem rodar em paralelo de fato (sub-agents independentes, sem dependência de import entre si). T6 importa de T5, então só é disparado depois que T5 termina — na prática isso vira T5 → T6 dentro da Phase 2, com T4 paralelo aos dois.

---

## Task Granularity Check

| Task | Scope | Status |
|---|---|---|
| T1: Criar tabela `push_subscriptions` | 1 migration | ✅ Granular |
| T2: Spike de pesquisa (data format + VAPID/Deno) | 1 investigação, sem código de produção | ✅ Granular |
| T3: Edge Function `send-push` + webhook | 1 function + 1 webhook (cohesivos, mesmo deploy) | ✅ Granular |
| T4: Service Worker injectManifest | 1 arquivo + 1 config | ✅ Granular |
| T5: `pushSubscriptions.ts` | 1 service, 2 funções | ✅ Granular |
| T6: `usePushSubscription` hook | 1 hook | ✅ Granular |
| T7: UI em `Settings.tsx` | 1 seção em 1 arquivo | ✅ Granular |
| T8: `ensureSubscribed()` no boot | 1 chamada em 1 arquivo | ✅ Granular |
| T9: Doc do fluxo | 1 arquivo | ✅ Granular |
| T10: Verificação manual | N/A (não é código) | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
|---|---|---|---|
| T1 | None | None (início) | ✅ Match |
| T2 | None | None (paralelo lógico a T1, mas listado sequencial por simplicidade de leitura) | ✅ Match (T2 não depende de T1 de fato, mas não há custo em rodar após) |
| T3 | T1, T2 | T1 → T2 → T3 | ✅ Match |
| T4 | None | Phase 2, paralelo | ✅ Match |
| T5 | None | Phase 2, paralelo | ✅ Match |
| T6 | (implícito) T5 | T5 → T6 dentro da Phase 2 | ✅ Match |
| T7 | T4, T5, T6 | Phase 3 início, após T4/T5/T6 | ✅ Match |
| T8 | T6, T7 | T7 → T8 | ✅ Match |
| T9 | T3, T7, T8 | T8 → T9 (T3 já resolvido na Phase 1) | ✅ Match |
| T10 | T9 | T9 → T10 (Phase 4) | ✅ Match |

---

## Test Co-location Validation

| Task | Code Layer Created/Modified | Matrix Requires (Test Policy acima) | Task Says | Status |
|---|---|---|---|---|
| T1 | SQL migration | none | none | ✅ OK |
| T2 | N/A (pesquisa) | none | none | ✅ OK |
| T3 | Edge Function + função pura `resolveDeepLink` | unit (função pura) | unit | ✅ OK |
| T4 | Service Worker | none (não testável em unit, sem infra e2e) | none | ✅ OK |
| T5 | Service de I/O Supabase | none (mesmo padrão de `notifications.ts`, sem teste) | none | ✅ OK |
| T6 | Hook com efeito colateral de browser API | none (sem testing-library no projeto) | none | ✅ OK |
| T7 | Componente React (UI) | none | none | ✅ OK |
| T8 | Integração em contexto/layout | none | none | ✅ OK |
| T9 | Documentação | none | none | ✅ OK |
| T10 | N/A (verificação manual) | none | none | ✅ OK |

---

## Tools per Task — Resumo

| Task | MCP | Skill |
|---|---|---|
| T1 | Supabase (`apply_migration`, `list_tables`, `get_advisors`) | NONE |
| T2 | Supabase (`execute_sql`), WebSearch | NONE |
| T3 | Supabase (`deploy_edge_function`, `get_logs`), Bash | NONE |
| T4 | NONE | NONE |
| T5 | NONE | NONE |
| T6 | NONE | NONE |
| T7 | NONE | NONE |
| T8 | NONE | NONE |
| T9 | NONE | NONE |
| T10 | NONE | `verify` |
